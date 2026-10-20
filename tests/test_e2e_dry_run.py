import os
import sys
import json
import tempfile

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC_DIR = os.path.join(PROJECT_ROOT, "src")
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from component4.business_plan_ingestion import BusinessPlanIngestionService
from component4.entity_resolution import BusinessEntityResolver
from component4.risk_assessment import RiskAssessmentEngine
from component4.gnn_model import GNNInferenceEngine


def test_end_to_end_pipeline():
    # 1. Ingestion of Component 1 Business Plan
    ingest = BusinessPlanIngestionService()
    c1_data = {
        "metadata": {
            "business_name": "Colombo Green Packaging Ltd",
            "district": "Colombo",
            "province": "Western",
            "business_category": "Manufacturing"
        },
        "financial_feasibility": {
            "available_capital_lkr": 2500000.0,
            "monthly_budget_lkr": 400000.0,
            "loan_amount_lkr": 500000.0
        },
        "growth_strategy": {
            "proposed_action": "Open Suburban Facility",
            "primary_strategy": "Capacity Expansion"
        }
    }
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False, encoding="utf-8") as f:
        json.dump(c1_data, f)
        tmp_path = f.name

    try:
        plan = ingest.ingest_file(tmp_path)
        assert plan.business_name == "Colombo Green Packaging Ltd"
        assert plan.district == "Colombo"
        assert plan.available_capital_lkr == 2500000.0

        # 2. Entity Resolution (New persistent entity with isolated node)
        resolver = BusinessEntityResolver()
        resolved = resolver.resolve(plan)
        assert resolved.entity_id.startswith("c4_biz_")
        assert resolved.is_within_geographic_scope is True
        assert resolved.has_relationship_network is False

        # 3. GNN Inference with isolated-node fallback (zero fabricated edges)
        gnn_engine = GNNInferenceEngine()
        gnn_res = gnn_engine.infer(resolved)
        assert gnn_res.gnn_applicable is False
        assert gnn_res.gnn_status == "ISOLATED_NODE"
        assert len(gnn_res.inference_notes) > 0
        assert "isolated" in gnn_res.inference_notes[0].lower()

        # 4. Multi-factor Risk Assessment across the 5 dimensions & Scenarios
        risk_engine = RiskAssessmentEngine()
        inputs = {
            "business_id": resolved.entity_id,
            "business_name": resolved.business_name,
            "district": resolved.district,
            "province": resolved.province,
            "available_capital_lkr": plan.available_capital_lkr,
            "monthly_budget_lkr": plan.monthly_budget_lkr,
            "loan_amount_lkr": plan.requested_loan_lkr,
            "monthly_revenue_mean_lkr": 1200000.0,
            "monthly_expenses_mean_lkr": 900000.0,
            "cash_reserves_latest_lkr": plan.available_capital_lkr,
            "debt_service_burden_ratio": 0.12,
            "supplier_hhi": 0.28,
            "customer_hhi": 0.22,
            "proposed_action": plan.proposed_growth_action
        }
        assessment = risk_engine.assess_record(inputs)
        assert assessment.recommendation in ["PROCEED", "MODIFY", "DELAY", "INSUFFICIENT_EVIDENCE"]
        assert 0.0 <= assessment.composite_risk_score <= 1.0
        assert assessment.credit_risk.score is not None
        assert assessment.market_risk.score is not None
        assert assessment.inflation_risk.score is not None
        assert assessment.liquidity_risk.score is not None
        assert assessment.operational_risk.score is not None
        assert len(assessment.scenarios) == 4
        assert len(assessment.mitigation_roadmap) > 0

    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


if __name__ == "__main__":
    test_end_to_end_pipeline()
    print("E2E Test passed successfully!")
