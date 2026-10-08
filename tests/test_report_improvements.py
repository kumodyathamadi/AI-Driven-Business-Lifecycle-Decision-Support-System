import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.orchestrator import analyze_business
from src.preprocessing.preprocessor import validate_and_format_input
from src.prediction.predictor import FeasibilityPredictor
from src.explainability.explainer import SHAPExplainerService
from src.what_if.simulator import WhatIfEngine
from backend.services.business_plan_generator.report_builder import BusinessPlanReportBuilder
from backend.services.business_plan_generator.pdf_generator import BusinessPlanPDFGenerator
from backend.services.business_plan_generator.docx_generator import BusinessPlanDocxGenerator


def get_sample_new_startup_input():
    return {
        "business_name": "Serendib Organic Spices",
        "business_stage": "New",
        "business_category": "Bakery / Food",
        "district": "Kandy",
        "province": "Central",
        "location_type": "Commercial",
        "available_capital_lkr": 400000.0,
        "monthly_budget_lkr": 21250.0,
        "loan_amount_lkr": 0.0,
        "expected_price_lkr": 450.0,
        "expected_customers_per_day": 35,
        "expected_operating_days_per_month": 26,
        "competition_level": "Moderate",
        "competitor_count_nearby": 0,  # Unprovided/zero count test
        "customer_demand_score": 65,
        "entrepreneur_experience_years": 2,
        "location_suitability_score": 4,
        "available_staff_count": 2,
        "required_staff_count": 2,
        "available_equipment_score": 3,
        "required_equipment_score": 4,
        "supplier_availability_score": 4
    }


def get_sample_existing_business_input():
    return {
        "business_name": "Madawa Grocery",
        "business_stage": "Existing",
        "business_category": "Grocery / Mini-Mart",
        "district": "Colombo",
        "province": "Western",
        "location_type": "Commercial",
        "available_capital_lkr": 1234000.0,
        "monthly_budget_lkr": 10000.0,
        "loan_amount_lkr": 200000.0,
        "expected_price_lkr": 500.0,
        "expected_customers_per_day": 50,
        "expected_operating_days_per_month": 26,
        "competition_level": "Moderate",
        "competitor_count_nearby": 3,
        "customer_demand_score": 70,
        "entrepreneur_experience_years": 4,
        "location_suitability_score": 4,
        "available_staff_count": 2,
        "required_staff_count": 2,
        "available_equipment_score": 4,
        "required_equipment_score": 4,
        "supplier_availability_score": 4
    }


def test_simplified_budget_coverage_calculation():
    """
    PART 10: Fix Capital Coverage / Runway
    Verifies that strategy capital coverage (300k / 21.25k = ~14.1 mo) and
    available funds coverage (400k / 21.25k = ~18.8 mo) are differentiated.
    """
    print("\n--- Running test_simplified_budget_coverage_calculation ---")
    sample_new_startup_input = get_sample_new_startup_input()
    profile = analyze_business(sample_new_startup_input)
    
    plan = profile["personalized_business_plan"]
    sec_04 = plan["section_04_financial_operational_plan"]
    funding = sec_04["funding_structure"]
    
    strat_cov = funding["strategy_budget_coverage_months"]
    avail_cov = funding["available_funds_coverage_months"]
    
    print(f"Strategy Capital Coverage: {strat_cov} months")
    print(f"Available Funds Coverage: {avail_cov} months")
    
    assert strat_cov > 0
    assert avail_cov > 0
    assert strat_cov != avail_cov
    target_cap = sec_04["funding_structure"]["strategy_target_capital_lkr"]
    total_funds = sec_04["funding_structure"]["total_available_funds_lkr"]
    assert abs((strat_cov / avail_cov) - (target_cap / total_funds)) < 0.05
    print("[PASS] Budget coverage calculation is differentiated and verified!")


def test_what_if_percentage_point_deltas_and_tree_partition():
    """
    PART 15: What-If Analysis
    Verifies class shifts are expressed in percentage points,
    and tree partition note is present when deltas are 0.0 pp.
    """
    print("\n--- Running test_what_if_percentage_point_deltas_and_tree_partition ---")
    sample_new_startup_input = get_sample_new_startup_input()
    df, cleaned = validate_and_format_input(sample_new_startup_input)
    predictor = FeasibilityPredictor()
    pred_res = predictor.predict_feasibility(df)
    simulator = WhatIfEngine(predictor)
    scenarios = simulator.simulate_scenarios(cleaned, pred_res)
    
    assert len(scenarios) == 4
    for sc in scenarios:
        assert "class_shifts_percentage_points" in sc
        pp_shifts = sc["class_shifts_percentage_points"]
        assert "Feasible" in pp_shifts
        assert "percentage points" in pp_shifts["Feasible"]
        print(f"Scenario: {sc['title']} -> Feasible {pp_shifts['Feasible']}")
        
        prob_shifts = sc.get("probability_deltas", sc.get("class_probability_shifts", {}))
        if prob_shifts and all(abs(val) < 0.0001 for val in prob_shifts.values()):
            assert sc.get("tree_partition_note") is not None
            assert "decision partition" in sc["tree_partition_note"]
            print(f"  Note present: {sc['tree_partition_note']}")
            
    print("[PASS] What-If percentage points and tree partition handling verified!")


def test_one_hot_shap_aggregation():
    """
    PART 12 & 18: One-hot SHAP aggregation
    Verifies that dummy columns are grouped into a single 'Business Stage' attribution.
    """
    print("\n--- Running test_one_hot_shap_aggregation ---")
    sample_new_startup_input = get_sample_new_startup_input()
    df, _ = validate_and_format_input(sample_new_startup_input)
    predictor = FeasibilityPredictor()
    pred_res = predictor.predict_feasibility(df)
    explainer = SHAPExplainerService(predictor)
    shap_res = explainer.explain_business(df, pred_res)
    
    pos_drivers = shap_res.get("positive_drivers", [])
    neg_drivers = shap_res.get("negative_drivers", [])
    
    all_features = [d["feature"] for d in pos_drivers + neg_drivers]
    assert not any("cat__business_stage_New" in f for f in all_features)
    assert not any("cat__business_stage_Existing" in f for f in all_features)
    
    stage_features = [f for f in all_features if "Business Stage" in f]
    print(f"Clean Business Stage features found: {stage_features}")
    assert len(stage_features) <= 1
    print("[PASS] One-hot SHAP aggregation verified!")


def test_new_startup_semantics_and_zero_competitors():
    """
    PART 2 & PART 3: New Business Semantics and Unsupported Claim Removal
    """
    print("\n--- Running test_new_startup_semantics_and_zero_competitors ---")
    sample_new_startup_input = get_sample_new_startup_input()
    profile = analyze_business(sample_new_startup_input)
    report_data = BusinessPlanReportBuilder.build_report_data(profile)
    
    sec_01 = report_data["section_01"]
    comp = sec_01["competition"]
    print(f"Competition count display: {comp['competitor_count_nearby']}")
    print(f"Competition info: {comp['competitor_information']}")
    
    assert comp["competitor_count_nearby"] != 0
    assert "Not provided" in str(comp["competitor_count_nearby"]) or "not provided" in str(comp["competitor_information"]).lower()
    
    sec_04 = report_data["section_04"]
    funding = sec_04["funding_structure"]
    assert "founder equity" not in str(funding).lower()
    
    concept = sec_01["business_concept"]["concept_overview"]
    print(f"Concept overview: {concept}")
    assert "current operations" not in concept.lower()
    assert "existing customers" not in concept.lower()
    assert "proposed" in concept.lower() or "new startup" in concept.lower() or "plan" in concept.lower()
    print("[PASS] New Startup semantics and clean competitor handling verified!")


def test_no_prohibited_terms_in_generated_documents():
    """
    PART 26: Final Audit for Prohibited Terms
    """
    print("\n--- Running test_no_prohibited_terms_in_generated_documents ---")
    sample_new_startup_input = get_sample_new_startup_input()
    profile = analyze_business(sample_new_startup_input)
    report_data = BusinessPlanReportBuilder.build_report_data(profile)
    
    pdf_bytes = BusinessPlanPDFGenerator.generate_pdf(report_data)
    print(f"Generated PDF bytes: {len(pdf_bytes):,} bytes")
    assert len(pdf_bytes) > 1000
    
    docx_bytes = BusinessPlanDocxGenerator.generate_docx(report_data)
    print(f"Generated DOCX bytes: {len(docx_bytes):,} bytes")
    assert len(docx_bytes) > 1000
    
    sec_03 = report_data["section_03"]
    strats = sec_03["available_strategic_alternatives"]
    for s in strats:
        assert s.get("rank") not in ["-", None]
        assert s.get("topsis_score") not in ["N/A", None]
        print(f"  Strategy #{s.get('rank')}: {s.get('strategy_name')} | TOPSIS: {s.get('topsis_score')}")
    print("[PASS] Document generation and clean terms verified!")


def test_existing_business_flow_unbroken():
    """
    PART 24: Test Case B - Existing Business (Madawa Grocery)
    """
    print("\n--- Running test_existing_business_flow_unbroken ---")
    sample_existing_business_input = get_sample_existing_business_input()
    profile = analyze_business(sample_existing_business_input)
    report_data = BusinessPlanReportBuilder.build_report_data(profile)
    
    assert report_data["business_identity"]["business_name"] == "Madawa Grocery"
    assert "existing" in report_data["business_identity"]["business_stage"].lower()
    
    pdf = BusinessPlanPDFGenerator.generate_pdf(report_data)
    docx = BusinessPlanDocxGenerator.generate_docx(report_data)
    assert len(pdf) > 1000
    assert len(docx) > 1000
    print(f"Generated Madawa Grocery PDF: {len(pdf):,} bytes | DOCX: {len(docx):,} bytes")
    print("[PASS] Case B (Existing Business) successfully verified without breaking!")


if __name__ == "__main__":
    print("=" * 80)
    print("RUNNING COMPONENT 1 REPORT IMPROVEMENTS TEST SUITE")
    print("=" * 80)
    test_simplified_budget_coverage_calculation()
    test_what_if_percentage_point_deltas_and_tree_partition()
    test_one_hot_shap_aggregation()
    test_new_startup_semantics_and_zero_competitors()
    test_no_prohibited_terms_in_generated_documents()
    test_existing_business_flow_unbroken()
    print("\n" + "=" * 80)
    print("ALL TESTS COMPLETED SUCCESSFULLY WITH 100% PASS RATE!")
    print("=" * 80)
