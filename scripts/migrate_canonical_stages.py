import sys
import os
import json
import sqlite3

# Add root directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.database import SQLITE_DB_PATH, engine, active_db_url

def canonicalize_stage(raw_stage: str) -> str:
    s = str(raw_stage or "").strip().lower()
    if "new" in s or "start" in s:
        return "new_startup"
    return "existing"

def migrate_database():
    print(f"Connecting to database: {active_db_url}")
    
    if active_db_url.startswith("sqlite"):
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cur = conn.cursor()
        
        # Check current distribution
        cur.execute("SELECT business_stage, count(*) FROM analysis_records GROUP BY business_stage")
        print("Before migration counts:", cur.fetchall())
        
        # Fetch all records to update canonical business_stage and check input_profile
        cur.execute("SELECT id, business_stage, input_profile, structured_profile FROM analysis_records")
        rows = cur.fetchall()
        
        updated_count = 0
        for rec_id, b_stage, in_prof, str_prof in rows:
            new_stage = canonicalize_stage(b_stage)
            
            # Also update input_profile JSON if present
            new_in_prof = in_prof
            if in_prof:
                try:
                    data = json.loads(in_prof) if isinstance(in_prof, str) else in_prof
                    if isinstance(data, dict):
                        data["business_stage"] = new_stage
                        new_in_prof = json.dumps(data)
                except Exception:
                    pass
            
            # Also update structured_profile JSON if present
            new_str_prof = str_prof
            if str_prof:
                try:
                    data = json.loads(str_prof) if isinstance(str_prof, str) else str_prof
                    if isinstance(data, dict):
                        if "business_input" in data and isinstance(data["business_input"], dict):
                            data["business_input"]["business_stage"] = new_stage
                        new_str_prof = json.dumps(data)
                except Exception:
                    pass
            
            cur.execute("""
                UPDATE analysis_records 
                SET business_stage = ?, input_profile = ?, structured_profile = ? 
                WHERE id = ?
            """, (new_stage, new_in_prof, new_str_prof, rec_id))
            updated_count += 1
            
        conn.commit()
        
        # Check after distribution
        cur.execute("SELECT business_stage, count(*) FROM analysis_records GROUP BY business_stage")
        print("After migration counts:", cur.fetchall())
        print(f"Successfully migrated {updated_count} records to canonical stages in SQLite!")
        conn.close()
    else:
        # PostgreSQL
        from sqlalchemy import text
        with engine.begin() as conn:
            conn.execute(text("""
                UPDATE analysis_records 
                SET business_stage = CASE 
                    WHEN LOWER(business_stage) LIKE '%new%' THEN 'new_startup'
                    ELSE 'existing'
                END;
            """))
            print("Successfully migrated PostgreSQL records to canonical stages!")

if __name__ == "__main__":
    migrate_database()
