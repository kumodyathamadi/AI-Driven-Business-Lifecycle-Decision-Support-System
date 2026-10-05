import sys
import os
import json

PROJECT_ROOT = r"d:\SLIIT\Y4 S1\AI Driven Business  Lifecycle digital support system\AI-Driven-Business-Lifecycle-Decision-Support-System"
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.database import SessionLocal
from backend.models import AnalysisRecord
from backend.routes.analysis import adopt_strategic_recommendation
from backend.schemas import AdoptStrategyPayload
from backend.services.business_plan_generator.report_builder import BusinessPlanReportBuilder
from backend.services.business_plan_generator.pdf_generator import BusinessPlanPDFGenerator
from backend.services.business_plan_generator.docx_generator import BusinessPlanDocxGenerator

def test_adopted_export():
    db = SessionLocal()
    try:
        rec = db.query(AnalysisRecord).first()
        assert rec is not None
        print(f"Testing document export on record: {rec.id}")

        # 1. Adopt STRAT_01 (Lean Bootstrapped Launch)
        payload = AdoptStrategyPayload(strategy_id="STRAT_01")
        res = adopt_strategic_recommendation(record_id=rec.id, payload=payload, current_user=None, db=db)
        profile = res["structured_profile"]

        # 2. Build report data
        report_data = BusinessPlanReportBuilder.build_report_data(profile)
        prio = report_data["strategy_priorities"]
        print("Report Data Strategy Priorities:")
        print(f"  Top / Active Strategy: {prio.get('top_recommended_strategy')}")
        print(f"  AI Top Strategy:       {prio.get('ai_top_strategy')}")
        print(f"  Is User Selected:      {prio.get('is_user_selected')}")
        print(f"  Capital Runway:        {report_data['financial_overview']['capital_runway_months']} Months")
        print(f"  Roadmap Phase 1 Item:  {report_data['action_roadmap']['phase_1'][1]}")

        assert prio.get("is_user_selected") is True
        assert "Lean Bootstrapped" in prio.get("top_recommended_strategy")
        assert "Lean Bootstrapped" in report_data["action_roadmap"]["phase_1"][1]

        # 3. Generate PDF
        pdf_bytes = BusinessPlanPDFGenerator.generate_pdf(report_data)
        print(f"PASS: Generated PDF bytes length: {len(pdf_bytes)}")
        assert len(pdf_bytes) > 50000

        # 4. Generate DOCX
        docx_bytes = BusinessPlanDocxGenerator.generate_docx(report_data)
        print(f"PASS: Generated DOCX bytes length: {len(docx_bytes)}")
        assert len(docx_bytes) > 20000

        print("\nALL ADOPTED STRATEGY EXPORT TESTS PASSED PERFECTLY!")

    finally:
        db.close()

if __name__ == "__main__":
    test_adopted_export()
