import sys
import os
import json

PROJECT_ROOT = r"d:\SLIIT\Y4 S1\AI Driven Business  Lifecycle digital support system\AI-Driven-Business-Lifecycle-Decision-Support-System"
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from fastapi.testclient import TestClient
from backend.main import app
from backend.database import SessionLocal
from backend.models import AnalysisRecord, AnalysisAuditLog

client = TestClient(app)

def test_whatif_db_safety():
    db = SessionLocal()
    try:
        initial_records = db.query(AnalysisRecord).count()
        initial_audits = db.query(AnalysisAuditLog).count()
        print(f"Initial DB state: {initial_records} records, {initial_audits} audit logs.")

        sample_input = {
            "business_name": "What-If Safety Test SME",
            "business_category": "Bakery / Food / Grocery",
            "district": "Colombo",
            "business_stage": "New",
            "location_type": "Commercial",
            "available_capital_lkr": 1200000.0,
            "monthly_budget_lkr": 200000.0,
            "loan_amount_lkr": 0.0,
            "expected_customers_per_day": 25,
            "expected_price_lkr": 450.0,
            "available_staff_count": 3,
            "required_staff_count": 3,
            "available_equipment_score": 4,
            "required_equipment_score": 4,
            "customer_demand_score": 75,
            "supplier_availability_score": 4,
            "competition_level": "Medium",
            "entrepreneur_experience_years": 4,
            "location_suitability_score": 4,
            "proposed_action_timeline": "Immediate"
        }

        # 1. Call POST /api/business/simulate
        response = client.post("/api/business/simulate", json=sample_input)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()

        assert "prediction" in data
        assert "probabilities" in data
        assert "is_simulation" in data and data["is_simulation"] is True
        assert "probability_deltas" in data
        assert "viability_delta" in data
        assert "impact_summary" in data

        print("Simulation returned successfully:")
        print(f"  Prediction: {data['prediction']}")
        print(f"  Probabilities: {data['probabilities']}")
        print(f"  New Viability Score: {data.get('new_viability_score')}")
        print(f"  Viability Delta: {data.get('viability_delta')}")
        print(f"  Impact Summary: {data.get('impact_summary')}")

        # 2. Verify DB state is strictly unchanged
        after_records = db.query(AnalysisRecord).count()
        after_audits = db.query(AnalysisAuditLog).count()
        print(f"\nAfter simulation: {after_records} records, {after_audits} audit logs.")

        assert after_records == initial_records, f"Record count changed from {initial_records} to {after_records}!"
        assert after_audits == initial_audits, f"Audit log count changed from {initial_audits} to {after_audits}!"

        # 3. Test with baseline_record_id
        first_rec = db.query(AnalysisRecord).first()
        if first_rec:
            res_with_base = client.post(f"/api/business/simulate?baseline_record_id={first_rec.id}", json=sample_input)
            assert res_with_base.status_code == 200
            data_base = res_with_base.json()
            print("\nSimulation with baseline record:")
            print(f"  Baseline Record ID: {first_rec.id}")
            print(f"  Base Viability: {data_base.get('base_viability_score')}")
            print(f"  New Viability: {data_base.get('new_viability_score')}")
            print(f"  Viability Delta: {data_base.get('viability_delta')}")
            print(f"  Deltas: {data_base.get('probability_deltas')}")
            print(f"  Impact Summary: {data_base.get('impact_summary')}")

            # Verify DB still unchanged
            final_records = db.query(AnalysisRecord).count()
            final_audits = db.query(AnalysisAuditLog).count()
            assert final_records == initial_records
            assert final_audits == initial_audits

        print("\nPASS: ZERO database records or audit logs created by /api/business/simulate across all calls.")

    finally:
        db.close()

if __name__ == "__main__":
    test_whatif_db_safety()
