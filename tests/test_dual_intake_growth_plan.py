import sys
import os
import pandas as pd
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.preprocessing.preprocessor import validate_and_format_input, DISTRICT_TO_PROVINCE
from src.prediction.predictor import FeasibilityPredictor
from src.strategies.generator import SMEStrategyGenerator
from src.planning.planner import PersonalizedPlanGenerator
from src.orchestrator import analyze_business
from backend.schemas import BusinessAnalysisRequest
from backend.services.business_plan_generator.report_builder import BusinessPlanReportBuilder
from backend.services.business_plan_generator.pdf_generator import BusinessPlanPDFGenerator
from backend.services.business_plan_generator.docx_generator import BusinessPlanDocxGenerator


def get_base_startup_payload():
    return {
        "business_name": "Kandy Fresh Mart",
        "business_stage": "New Startup",
        "business_category": "Grocery / Retail",
        "district": "Kandy",
        "location_type": "Commercial City Center",
        "proposed_action": "Launch New Business Operations",
        "available_capital_lkr": 500000.0,
        "loan_amount_lkr": 100000.0,
        "monthly_budget_lkr": 35000.0,
        "initial_inventory_cost_lkr": 150000.0,
        "expected_price_lkr": 350.0,
        "expected_customers_per_day": 40,
        "expected_operating_days_per_month": 26,
        "competition_level": "Moderate",
        "customer_demand_score": 60,
        "entrepreneur_experience_years": 3,
        "location_suitability_score": 4,
        "available_staff_count": 2,
        "required_staff_count": 2,
        "available_equipment_score": 3,
        "required_equipment_score": 3,
        "supplier_availability_score": 4,
    }


def get_base_growth_payload():
    return {
        "business_name": "Silva Supermarket Expansion",
        "business_stage": "Existing Business",
        "business_category": "Grocery / Retail",
        "district": "Colombo",
        "location_type": "Suburban Commercial Hub",
        "proposed_action": "Expand Current Branch Capacity & Volume",
        "available_capital_lkr": 1500000.0,
        "loan_amount_lkr": 500000.0,
        "monthly_budget_lkr": 250000.0,
        "initial_inventory_cost_lkr": 300000.0,
        "expected_price_lkr": 550.0,
        "expected_customers_per_day": 80,
        "expected_operating_days_per_month": 26,
        "competition_level": "Moderate",
        "customer_demand_score": 75,
        "entrepreneur_experience_years": 6,
        "location_suitability_score": 4,
        "available_staff_count": 5,
        "required_staff_count": 5,
        "available_equipment_score": 4,
        "required_equipment_score": 4,
        "supplier_availability_score": 4,
        # Supplementary optional growth fields
        "current_monthly_revenue_lkr": 1200000.0,
        "current_monthly_net_profit_lkr": 180000.0,
        "existing_monthly_debt_obligations_lkr": 30000.0,
        "business_age_years": 4.5,
        "expansion_capex_lkr": 600000.0,
        "target_payback_months": 12,
        "current_capacity_utilization_pct": 85.0,
        "expansion_type": "Physical Branch Expansion"
    }


# =========================================================================
# TEST 1 & 2: Form Intake Preservation & Growth Information Collection
# =========================================================================
def test_dual_intake_data_collection():
    startup = get_base_startup_payload()
    growth = get_base_growth_payload()

    df_start, cleaned_start = validate_and_format_input(startup)
    df_growth, cleaned_growth = validate_and_format_input(growth)

    # 1. New Business preserves core startup fields
    assert cleaned_start["business_stage"] in ["new_startup", "New"]
    assert cleaned_start["stage_label"] == "New Startup"
    assert cleaned_start["available_capital_lkr"] == 500000.0
    assert cleaned_start["expected_price_lkr"] == 350.0

    # 2. Existing Business collects growth fields
    assert cleaned_growth["business_stage"] in ["existing", "Existing"]
    assert cleaned_growth["stage_label"] == "Existing Business"
    assert cleaned_growth["expansion_capex_lkr"] == 600000.0
    assert cleaned_growth["current_monthly_net_profit_lkr"] == 180000.0
    assert cleaned_growth["expansion_type"] == "Physical Branch Expansion"


# =========================================================================
# TEST 3: Business Stage Canonical Normalization
# =========================================================================
def test_canonical_business_stage_assignment():
    from src.preprocessing.preprocessor import normalize_business_stage
    test_cases = [
        ("New", "new_startup", "New"),
        ("New Startup", "new_startup", "New"),
        ("startup", "new_startup", "New"),
        ("Existing", "existing", "Existing"),
        ("Existing Business", "existing", "Existing"),
        ("growth", "existing", "Existing"),
        ("expansion", "existing", "Existing")
    ]
    for raw_stage, exp_canonical, exp_model in test_cases:
        c_stage, d_label, m_token = normalize_business_stage(raw_stage)
        assert c_stage == exp_canonical, f"Failed canonical mapping for {raw_stage}: got {c_stage}"
        assert m_token == exp_model, f"Failed model mapping for {raw_stage}: got {m_token}"


# =========================================================================
# TEST 4: Province Derivation from District
# =========================================================================
def test_province_derivation():
    # Supported districts
    for dist, prov in [("Colombo", "Western"), ("Kandy", "Central"), ("Galle", "Southern"), ("Jaffna", "Northern")]:
        payload = get_base_startup_payload()
        payload["district"] = dist
        payload.pop("province", None)
        _, cleaned = validate_and_format_input(payload)
        assert cleaned["province"] == prov

    # Fallback for unknown/unsupported district
    payload_unknown = get_base_startup_payload()
    payload_unknown["district"] = "Atlantis"
    payload_unknown.pop("province", None)
    _, cleaned_unknown = validate_and_format_input(payload_unknown)
    assert cleaned_unknown["province"] == "Western"  # Standard default fallback


# =========================================================================
# TEST 5 & 6: 22 Features Invariance and Isolation of Supplementary Data
# =========================================================================
def test_22_features_isolation_from_growth_fields():
    growth = get_base_growth_payload()
    df_growth, cleaned_growth = validate_and_format_input(growth)

    # df_growth MUST have exactly 22 columns in exact canonical order
    assert df_growth.shape[1] == 22, f"Expected 22 features, got {df_growth.shape[1]}"
    
    # Supplementary growth fields MUST NOT be present in model input DataFrame
    forbidden_features = [
        "current_monthly_revenue_lkr", "current_monthly_net_profit_lkr",
        "existing_monthly_debt_obligations_lkr", "business_age_years",
        "expansion_capex_lkr", "target_payback_months",
        "current_capacity_utilization_pct", "expansion_type"
    ]
    for feat in forbidden_features:
        assert feat not in df_growth.columns, f"Forbidden supplementary feature {feat} leaked into model DataFrame!"

    # But they MUST be safely preserved in cleaned_growth for downstream planning
    for feat in forbidden_features:
        assert feat in cleaned_growth, f"Supplementary feature {feat} lost from cleaned input dictionary!"


# =========================================================================
# TEST 7 & 8: Stage-Aware Report Titles and Consistency
# =========================================================================
def test_report_titles_and_stage_selection():
    startup = get_base_startup_payload()
    growth = get_base_growth_payload()

    res_start = analyze_business(startup)
    res_growth = analyze_business(growth)

    report_start = BusinessPlanReportBuilder.build_report_data(res_start)
    report_growth = BusinessPlanReportBuilder.build_report_data(res_growth)

    # 7. Existing Business Title & Subtitle
    assert report_growth["metadata"]["document_title"] == "STRATEGIC BUSINESS GROWTH & EXPANSION PLAN"
    assert report_growth["metadata"]["document_subtitle"] == "AI-Driven Business Growth, Expansion Feasibility & Investment Planning"
    assert "Enterprise Baseline" in report_growth["section_01"]["section_title"]
    assert "Expansion Financial" in report_growth["section_04"]["section_title"]

    # 8. New Business Title & Subtitle preserved
    assert report_start["metadata"]["document_title"] == "STRATEGIC BUSINESS PLAN"
    assert report_start["metadata"]["document_subtitle"] == "A Comprehensive Feasibility, Strategic Direction & Implementation Blueprint"
    assert "Business & Market Overview" in report_start["section_01"]["section_title"]
    assert "Financial & Operational Plan" in report_start["section_04"]["section_title"]


# =========================================================================
# TEST 9: Stage-Aware Strategy Generation
# =========================================================================
def test_stage_aware_strategy_generation():
    generator = SMEStrategyGenerator()

    _, cleaned_start = validate_and_format_input(get_base_startup_payload())
    _, cleaned_growth = validate_and_format_input(get_base_growth_payload())

    feasibility_dummy = {"prediction": "Feasible", "probability_score": 0.8}

    strategies_start = generator.generate_strategies(cleaned_start, feasibility_dummy, {})
    strategies_growth = generator.generate_strategies(cleaned_growth, feasibility_dummy, {})

    start_names = [s["strategy_name"] for s in strategies_start]
    growth_names = [s["strategy_name"] for s in strategies_growth]

    # Startup strategies
    assert any("Lean" in n or "Bootstrapped" in n for n in start_names)
    assert any("Market Acquisition" in n or "Customer Acquisition" in n for n in start_names)

    # Growth strategies
    assert any("Phased Modular Expansion" in n for n in growth_names)
    assert any("Capacity & Scale" in n for n in growth_names)
    assert any("Omnichannel" in n for n in growth_names)
    assert any("Product / Service-Line" in n for n in growth_names)


# =========================================================================
# TEST 10: TOPSIS Score and Rank Mapping (No N/A or Missing Ranks)
# =========================================================================
def test_topsis_score_and_rank_mapping():
    growth = get_base_growth_payload()
    res = analyze_business(growth)
    report_data = BusinessPlanReportBuilder.build_report_data(res)

    sec_03 = report_data["section_03"]
    ranked_strategies = sec_03["strategy_ranking"]

    assert len(ranked_strategies) >= 3
    for r in ranked_strategies:
        assert isinstance(r["rank"], int) and r["rank"] >= 1
        score_val = float(r["topsis_score"])
        assert score_val > 0.0
        assert str(r["topsis_score"]) != "N/A"


# =========================================================================
# TEST 11: Human-in-the-Loop Selected Strategy Propagation
# =========================================================================
def test_hitl_strategy_propagation():
    growth = get_base_growth_payload()
    growth["selected_strategy_id"] = "STRAT_02"  # User overrides rank #1

    res = analyze_business(growth)
    report_data = BusinessPlanReportBuilder.build_report_data(res)

    sec_03 = report_data["section_03"]
    hitl = sec_03["human_in_the_loop_selection"]
    assert hitl["is_user_selected"] is True
    assert hitl["selected_strategy_id"] == "STRAT_02"
    assert "Capacity & Scale" in hitl["selected_strategy_name"]

    # Propagates into Section 04 and Section 05
    sec_04 = report_data["section_04"]
    assert sec_04["active_strategy_alignment"]["strategy_name"] == hitl["selected_strategy_name"]


# =========================================================================
# TEST 12, 13 & 14: Financial Formulas & Payback Safeguards
# =========================================================================
def test_financial_calculations_and_payback_safeguards():
    # 1. With Valid CapEx & Profit -> Calculates Payback
    growth_with_data = get_base_growth_payload()
    growth_with_data["expansion_capex_lkr"] = 600000.0
    growth_with_data["current_monthly_net_profit_lkr"] = 100000.0

    res1 = analyze_business(growth_with_data)
    rep1 = BusinessPlanReportBuilder.build_report_data(res1)
    payback1 = rep1["section_04"]["payback_and_roi_analysis"]
    assert payback1["is_calculated"] is True
    assert payback1["estimated_payback_months"] == 6.0

    # Incremental Gross Sales Formula: customers * price * days
    # Expected daily customers for active strategy ~80, price 550, days 26
    monthly_plan = rep1["section_04"]["monthly_financial_plan"]
    assert monthly_plan["incremental_monthly_gross_sales_lkr"] > 0
    assert "Incremental Monthly Gross Sales = Expected Additional Customers/Day" in monthly_plan["sales_calculation_formula"]

    # 2. Missing CapEx & Profit -> Insufficient Data Safeguard
    growth_missing_data = get_base_growth_payload()
    growth_missing_data["expansion_capex_lkr"] = None
    growth_missing_data["current_monthly_net_profit_lkr"] = None

    res2 = analyze_business(growth_missing_data)
    rep2 = BusinessPlanReportBuilder.build_report_data(res2)
    payback2 = rep2["section_04"]["payback_and_roi_analysis"]
    assert payback2["is_calculated"] is False
    assert payback2["payback_status"] == "Insufficient data to calculate"
    assert len(payback2["missing_inputs"]) >= 1


# =========================================================================
# TEST 15: What-If 3-Class Probability Delta Checks
# =========================================================================
def test_what_if_3_class_probability_deltas():
    growth = get_base_growth_payload()
    res = analyze_business(growth)
    report_data = BusinessPlanReportBuilder.build_report_data(res)

    scenarios = report_data["section_05"]["what_if_analysis"]["scenarios"]
    assert len(scenarios) > 0

    for sc in scenarios:
        shifts = sc.get("probability_deltas_pp") or sc.get("class_shifts_percentage_points") or sc.get("probability_deltas", {})
        assert "Feasible" in shifts
        assert "Conditionally Feasible" in shifts
        assert "Infeasible" in shifts


# =========================================================================
# TEST 16: PDF and DOCX Document Generation Integrity
# =========================================================================
def test_pdf_and_docx_generation_integrity():
    growth = get_base_growth_payload()
    res = analyze_business(growth)
    report_data = BusinessPlanReportBuilder.build_report_data(res)

    pdf_bytes = BusinessPlanPDFGenerator.generate_pdf(report_data)
    docx_bytes = BusinessPlanDocxGenerator.generate_docx(report_data)

    assert isinstance(pdf_bytes, bytes) and len(pdf_bytes) > 50000
    assert isinstance(docx_bytes, bytes) and len(docx_bytes) > 20000


# =========================================================================
# TEST 17: Pydantic Schema Compatibility
# =========================================================================
def test_pydantic_schema_compatibility():
    # Schema should accept both minimal startup and enriched growth payload
    growth_dict = get_base_growth_payload()
    req = BusinessAnalysisRequest(**growth_dict)
    assert req.business_stage in ["existing", "Existing Business"]
    assert req.expansion_capex_lkr == 600000.0
    assert req.current_capacity_utilization_pct == 85.0


# =========================================================================
# TEST 18 & 19: Model Invariance (Predictions Unchanged by Supplementary Fields)
# =========================================================================
def test_model_prediction_invariance():
    predictor = FeasibilityPredictor()

    base_input = get_base_growth_payload()
    
    # 1. Without supplementary fields
    clean_base = {k: v for k, v in base_input.items() if k not in [
        "current_monthly_revenue_lkr", "current_monthly_net_profit_lkr",
        "existing_monthly_debt_obligations_lkr", "business_age_years",
        "expansion_capex_lkr", "target_payback_months",
        "current_capacity_utilization_pct", "expansion_type"
    ]}
    df_clean, _ = validate_and_format_input(clean_base)
    pred_clean = predictor.predict_feasibility(df_clean)

    # 2. With supplementary fields
    df_supp, _ = validate_and_format_input(base_input)
    pred_supp = predictor.predict_feasibility(df_supp)

    # Predictions MUST be identical to float precision
    assert pred_clean["prediction"] == pred_supp["prediction"]
    assert np.isclose(pred_clean["confidence_score"], pred_supp["confidence_score"], atol=1e-6)
    for cls_name in ["Feasible", "Conditionally Feasible", "Infeasible"]:
        assert np.isclose(pred_clean["probabilities"][cls_name], pred_supp["probabilities"][cls_name], atol=1e-6)


if __name__ == "__main__":
    tests = [
        ("Test 1 & 2: Dual Intake Data Collection", test_dual_intake_data_collection),
        ("Test 3: Canonical Business Stage Assignment", test_canonical_business_stage_assignment),
        ("Test 4: Province Derivation from District", test_province_derivation),
        ("Test 5 & 6: 22 Features Invariance & Supplementary Isolation", test_22_features_isolation_from_growth_fields),
        ("Test 7 & 8: Stage-Aware Report Titles & Consistency", test_report_titles_and_stage_selection),
        ("Test 9: Stage-Aware Strategy Generation", test_stage_aware_strategy_generation),
        ("Test 10: TOPSIS Score & Rank Mapping", test_topsis_score_and_rank_mapping),
        ("Test 11: Human-in-the-Loop Strategy Selection Propagation", test_hitl_strategy_propagation),
        ("Test 12-14: Financial Calculations & Payback Safeguards", test_financial_calculations_and_payback_safeguards),
        ("Test 15: What-If 3-Class Probability Deltas", test_what_if_3_class_probability_deltas),
        ("Test 16: PDF & DOCX Generation Integrity", test_pdf_and_docx_generation_integrity),
        ("Test 17: Pydantic Schema Compatibility", test_pydantic_schema_compatibility),
        ("Test 18 & 19: Model Prediction Invariance", test_model_prediction_invariance),
    ]

    print("=" * 70)
    print("RUNNING DUAL BUSINESS INTAKE & GROWTH PLAN TEST SUITE")
    print("=" * 70)
    passed = 0
    failed = 0

    for name, test_fn in tests:
        try:
            test_fn()
            print(f"[PASS] {name}")
            passed += 1
        except Exception as e:
            print(f"[FAIL] {name}: {e}")
            import traceback
            traceback.print_exc()
            failed += 1

    print("=" * 70)
    print(f"RESULTS: {passed} PASSED, {failed} FAILED out of {len(tests)} tests.")
    print("=" * 70)
    if failed > 0:
        sys.exit(1)
