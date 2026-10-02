import sys
import os
import json

PROJECT_ROOT = r"d:\SLIIT\Y4 S1\AI Driven Business  Lifecycle digital support system\AI-Driven-Business-Lifecycle-Decision-Support-System"
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.database import SessionLocal
from backend.models import AnalysisRecord, AnalysisAuditLog
from backend.routes.analysis import adopt_strategic_recommendation
from backend.schemas import AdoptStrategyPayload

def test_hitl_override():
    db = SessionLocal()
    try:
        # Find a test record
        record = db.query(AnalysisRecord).filter(AnalysisRecord.id == "09f9b2e6-b587-47be-a4e8-708a33a0c88b").first()
        if not record:
            record = db.query(AnalysisRecord).first()
        
        assert record is not None, "No analysis record found in database."
        rec_id = record.id
        print(f"Testing HITL Strategic Decision Override on record: {rec_id}")

        # 1. Adopt STRAT_02 (Market Expansion & Customer Acquisition)
        payload_02 = AdoptStrategyPayload(strategy_id="STRAT_02")
        res_02 = adopt_strategic_recommendation(record_id=rec_id, payload=payload_02, current_user=None, db=db)
        
        assert res_02["status"] == "success"
        assert res_02["selected_strategy_id"] == "STRAT_02"
        plan_02 = res_02["personalized_business_plan"]
        assert "Market Expansion" in plan_02["executive_overview"]["recommended_primary_strategy"]
        assert plan_02["executive_overview"]["is_user_selected"] is True
        print("PASS: Successfully adopted STRAT_02 (Market Expansion). Plan updated.")
        print(f"  Target Capital: LKR {plan_02['financial_plan']['available_capital_lkr']:,.2f}")
        print(f"  Monthly Budget: LKR {plan_02['financial_plan']['monthly_operating_budget_lkr']:,.2f}")
        print(f"  Phase 1 Milestone: {plan_02['action_roadmap']['phase_1_immediate_0_to_3_months'][1]}")

        # 2. Adopt STRAT_04 (Premium Quality & Niche Differentiation)
        payload_04 = AdoptStrategyPayload(strategy_id="STRAT_04")
        res_04 = adopt_strategic_recommendation(record_id=rec_id, payload=payload_04, current_user=None, db=db)
        
        assert res_04["status"] == "success"
        assert res_04["selected_strategy_id"] == "STRAT_04"
        plan_04 = res_04["personalized_business_plan"]
        assert "Premium Quality" in plan_04["executive_overview"]["recommended_primary_strategy"]
        assert plan_04["executive_overview"]["is_user_selected"] is True
        print("PASS: Successfully adopted STRAT_04 (Premium Quality). Plan updated.")
        print(f"  Target Capital: LKR {plan_04['financial_plan']['available_capital_lkr']:,.2f}")
        print(f"  Monthly Budget: LKR {plan_04['financial_plan']['monthly_operating_budget_lkr']:,.2f}")
        print(f"  Phase 1 Milestone: {plan_04['action_roadmap']['phase_1_immediate_0_to_3_months'][1]}")

        # 3. Check Audit Trail Log
        latest_audit = db.query(AnalysisAuditLog).filter(
            AnalysisAuditLog.record_id == rec_id,
            AnalysisAuditLog.action == "strategy_adopted"
        ).order_by(AnalysisAuditLog.created_at.desc()).first()
        
        assert latest_audit is not None
        assert "Premium Quality" in latest_audit.result_label
        print(f"PASS: Audit log recorded: action='{latest_audit.action}', strategy='{latest_audit.result_label}'")

        print("\nALL HITL DECISION OVERRIDE TESTS PASSED SUCCESSFULLY!")

    finally:
        db.close()

if __name__ == "__main__":
    test_hitl_override()
