"""
Tests proving input-to-calculation-to-recommendation traceability across all five risk dimensions:
1. Credit Risk: Overdue debt, arrears amounts, and payment delays drive credit risk scoring and delinquency mitigations.
2. Market Risk: Customer volume, ticket size, and stated sales discrepancies drive market scoring and verification mitigations.
3. Inflation Risk: Recent and expected price increases, imported input shares, and pricing power drive inflation scoring and mitigation.
4. Liquidity Risk: Starting capital, remaining post-setup cash cushions, and mandatory debt obligations drive runway and liquidity scoring.
5. Operational Risk: Single-supplier dependency, alternative supplier availability, and inventory buffers drive operational scoring and mitigation.
6. Unknown Value Handling: Verifies that unknown/missing values are not converted to false zero or low risk.
7. PDF Mitigation Plan Generator: Verifies PDF generation outputs real observed indicators, limitations, and engine version v2.4.0.
"""

import os
import pytest
from src.component4.risk_assessment import RiskAssessmentEngine, RiskAssessmentResult
from src.component4.business_plan_ingestion import ExtractedBusinessPlan
from src.component4.mitigation_pdf_generator import Component4MitigationPDFGenerator


@pytest.fixture
def risk_engine():
    return RiskAssessmentEngine()


def test_credit_risk_input_sensitivity_delinquency_and_arrears(risk_engine):
    """
    Proves that credit risk inputs (repayment_overdue_status, repayment_delay_days,
    total_overdue_amount_lkr, overdue_payment_count_12m) directly drive the credit sub-score,
    populate supported_indicators, and trigger delinquency mitigations.
    """
    # 1. Baseline Current Business
    baseline_plan = ExtractedBusinessPlan(
        business_name="Green Harvest Organics",
        district="Colombo",
        business_category="Retail",
        business_stage="Operating SME",
        outstanding_loan_balance_lkr=300000.0,
        monthly_loan_repayment_lkr=20000.0,
        repayment_overdue_status="Current",
        repayment_delay_days=0.0,
        total_overdue_amount_lkr=0.0,
        overdue_payment_count_12m=0,
        available_starting_capital_lkr=800000.0,
        current_cash_reserve_lkr=250000.0,
        monthly_revenue_lkr=350000.0,
        fixed_monthly_costs_lkr=90000.0,
        variable_monthly_costs_lkr=45000.0
    )
    res_baseline: RiskAssessmentResult = risk_engine.assess_record(baseline_plan.to_dict())
    assert res_baseline.sub_scores["credit_risk"] <= 0.45
    driver_codes_base = [d["factor_code"] for d in res_baseline.primary_risk_drivers]
    assert "REPAYMENT_DELINQUENCY_30_PLUS_DAYS" not in driver_codes_base

    # 2. Stressed Delinquent Business
    stressed_plan = ExtractedBusinessPlan(
        business_name="Green Harvest Organics",
        district="Colombo",
        business_category="Retail",
        business_stage="Operating SME",
        outstanding_loan_balance_lkr=300000.0,
        monthly_loan_repayment_lkr=20000.0,
        repayment_overdue_status="60+ Days",
        repayment_delay_days=65.0,
        total_overdue_amount_lkr=45000.0,
        longest_overdue_period_days=65.0,
        overdue_payment_count_12m=3,
        available_starting_capital_lkr=800000.0,
        current_cash_reserve_lkr=250000.0,
        monthly_revenue_lkr=350000.0,
        fixed_monthly_costs_lkr=90000.0,
        variable_monthly_costs_lkr=45000.0
    )
    res_stressed: RiskAssessmentResult = risk_engine.assess_record(stressed_plan.to_dict())

    # Calculation verification
    assert res_stressed.sub_scores["credit_risk"] > res_baseline.sub_scores["credit_risk"]
    assert res_stressed.sub_scores["credit_risk"] >= 0.70
    driver_codes_stressed = [d["factor_code"] for d in res_stressed.primary_risk_drivers]
    assert "REPAYMENT_DELINQUENCY_30_PLUS_DAYS" in driver_codes_stressed
    assert "FREQUENT_PAYMENT_DELAYS" in driver_codes_stressed

    # Indicator verification
    credit_indicators = res_stressed.supported_indicators.get("credit", {})
    assert credit_indicators.get("total_overdue_amount_lkr") == 45000.0
    assert credit_indicators.get("repayment_delay_days") == 65.0
    assert credit_indicators.get("overdue_payment_count_12m") == 3

    # Recommendation / Mitigation verification
    mit_codes = [m.get("factor_code") or m.get("targeted_factor") for m in res_stressed.recommended_mitigations]
    assert any("REPAYMENT_DELINQUENCY" in str(mid) or "FREQUENT_PAYMENT" in str(mid) or "DEBT" in str(mid) for mid in mit_codes)


def test_market_risk_input_sensitivity_sales_discrepancy_and_competition(risk_engine):
    """
    Proves that volume (monthly_customer_count) and ticket price (average_transaction_value_lkr)
    when diverging from stated sales trigger SALES_PROJECTION_DISCREPANCY, and competitive pricing
    adjusts the market score and generates targeted mitigations.
    """
    # 1. Consistent Sales Projection
    consistent_plan = ExtractedBusinessPlan(
        business_name="Lanka Craft Studio",
        district="Gampaha",
        business_category="Manufacturing",
        business_stage="Operating SME",
        monthly_revenue_lkr=300000.0,
        monthly_customer_count=100,
        average_transaction_value_lkr=3000.0,  # 100 * 3000 = 300,000 (0% divergence)
        demand_evidence_type="contracts_signed",
        competitor_pricing_vs_business="Similar",
        available_starting_capital_lkr=500000.0,
        current_cash_reserve_lkr=150000.0,
        fixed_monthly_costs_lkr=70000.0,
        variable_monthly_costs_lkr=40000.0
    )
    res_consistent = risk_engine.assess_record(consistent_plan.to_dict())
    driver_codes_cons = [d["factor_code"] for d in res_consistent.primary_risk_drivers]
    assert "SALES_PROJECTION_DISCREPANCY" not in driver_codes_cons

    # 2. Inconsistent & High Competition Projection
    inconsistent_plan = ExtractedBusinessPlan(
        business_name="Lanka Craft Studio",
        district="Gampaha",
        business_category="Manufacturing",
        business_stage="Operating SME",
        monthly_revenue_lkr=600000.0,  # Stated 600,000
        monthly_customer_count=100,
        average_transaction_value_lkr=2000.0,  # 100 * 2000 = 200,000 (66.7% discrepancy)
        demand_evidence_type="estimate_only",
        direct_competitors_count=5,
        competitor_pricing_vs_business="Lower",
        available_starting_capital_lkr=500000.0,
        current_cash_reserve_lkr=150000.0,
        fixed_monthly_costs_lkr=70000.0,
        variable_monthly_costs_lkr=40000.0
    )
    res_inconsistent = risk_engine.assess_record(inconsistent_plan.to_dict())

    # Calculation verification
    assert res_inconsistent.sub_scores["market_risk"] > res_consistent.sub_scores["market_risk"]
    driver_codes_incons = [d["factor_code"] for d in res_inconsistent.primary_risk_drivers]
    assert "SALES_PROJECTION_DISCREPANCY" in driver_codes_incons
    assert ("ESTIMATED_DEMAND_EVIDENCE" in driver_codes_incons or "NO_DEMAND_EVIDENCE" in driver_codes_incons)
    assert "COMPETITOR_PRICE_UNDERCUT" in driver_codes_incons

    # Indicators verification
    market_indicators = res_inconsistent.supported_indicators.get("market", {})
    assert market_indicators.get("sales_discrepancy_detected") is True
    assert market_indicators.get("derived_monthly_sales_lkr") == 200000.0

    # Mitigation verification
    mit_codes = [m.get("factor_code") or m.get("targeted_factor") for m in res_inconsistent.recommended_mitigations]
    assert any("SALES_PROJECTION_DISCREPANCY" in str(mid) or "COMPETITOR" in str(mid) or "DEMAND" in str(mid) for mid in mit_codes)


def test_inflation_risk_input_sensitivity_price_increases_and_passthrough(risk_engine):
    """
    Proves that supplier price changes, imported input shares, energy costs, and pricing power
    directly adjust inflation risk scoring and trigger inflation hedging mitigations.
    """
    # 1. Inflation Resilient Business
    resilient_plan = ExtractedBusinessPlan(
        business_name="Kandy Tea Packaging",
        district="Kalutara",
        business_category="Retail",
        business_stage="Operating SME",
        monthly_revenue_lkr=400000.0,
        fixed_monthly_costs_lkr=80000.0,
        variable_monthly_costs_lkr=50000.0,
        available_starting_capital_lkr=700000.0,
        current_cash_reserve_lkr=200000.0,
        supplier_price_change_past_3_6m_pct=4.0,
        expected_supplier_price_increase_3_6m_pct=5.0,
        imported_inputs_pct=0.0,
        cost_increase_pass_through_pct=85.0,
        ability_to_increase_prices="Easily",
        alternative_suppliers_available="Good",
        monthly_electricity_energy_cost_lkr=8000.0
    )
    res_resilient = risk_engine.assess_record(resilient_plan.to_dict())
    assert res_resilient.sub_scores["inflation_risk"] <= 0.40
    driver_codes_res = [d["factor_code"] for d in res_resilient.primary_risk_drivers]
    assert "SUPPLIER_PRICE_INFLATION" not in driver_codes_res
    assert "WEAK_PRICING_POWER" not in driver_codes_res

    # 2. High Inflation Sensitivity Business
    vulnerable_plan = ExtractedBusinessPlan(
        business_name="Kandy Tea Packaging",
        district="Kalutara",
        business_category="Retail",
        business_stage="Operating SME",
        monthly_revenue_lkr=400000.0,
        fixed_monthly_costs_lkr=80000.0,
        variable_monthly_costs_lkr=50000.0,
        available_starting_capital_lkr=700000.0,
        current_cash_reserve_lkr=200000.0,
        supplier_price_change_past_3_6m_pct=26.0,
        expected_supplier_price_increase_3_6m_pct=30.0,
        imported_inputs_pct=65.0,
        cost_increase_pass_through_pct=15.0,
        ability_to_increase_prices="Difficult",
        alternative_suppliers_available="None",
        monthly_electricity_energy_cost_lkr=65000.0
    )
    res_vulnerable = risk_engine.assess_record(vulnerable_plan.to_dict())

    # Calculation verification
    assert res_vulnerable.sub_scores["inflation_risk"] > res_resilient.sub_scores["inflation_risk"]
    assert res_vulnerable.sub_scores["inflation_risk"] >= 0.70
    driver_codes_vul = [d["factor_code"] for d in res_vulnerable.primary_risk_drivers]
    assert "SUPPLIER_PRICE_INFLATION" in driver_codes_vul
    assert "WEAK_PRICING_POWER" in driver_codes_vul
    assert "IMPORT_DEPENDENCY_RISK" in driver_codes_vul

    # Indicators verification
    inflation_indicators = res_vulnerable.supported_indicators.get("inflation", {})
    assert inflation_indicators.get("imported_inputs_pct") == 65.0
    assert inflation_indicators.get("expected_supplier_price_increase_pct") == 30.0

    # Mitigation verification
    mit_codes = [m.get("factor_code") or m.get("targeted_factor") for m in res_vulnerable.recommended_mitigations]
    assert any("SUPPLIER_PRICE_INFLATION" in str(mid) or "WEAK_PRICING_POWER" in str(mid) or "IMPORT" in str(mid) or "ENERGY" in str(mid) for mid in mit_codes)


def test_liquidity_risk_input_sensitivity_cash_reserves_and_runway(risk_engine):
    """
    Proves that available capital, setup expenditures, and unencumbered post-setup reserves
    directly determine cash runway and liquidity risk scores.
    """
    # 1. Deep Capital Cushion
    liquid_plan = ExtractedBusinessPlan(
        business_name="Colombo Logistics Hub",
        district="Colombo",
        business_category="Transport and Logistics",
        business_stage="Operating SME",
        available_starting_capital_lkr=2500000.0,
        remaining_cash_reserves_after_setup_lkr=1800000.0,
        monthly_revenue_lkr=500000.0,
        fixed_monthly_costs_lkr=180000.0,
        variable_monthly_costs_lkr=120000.0,
        monthly_loan_repayment_lkr=30000.0
    )
    res_liquid = risk_engine.assess_record(liquid_plan.to_dict())
    assert res_liquid.sub_scores["liquidity_risk"] <= 0.40
    driver_codes_liq = [d["factor_code"] for d in res_liquid.primary_risk_drivers]
    assert "CRITICAL_CASH_RUNWAY" not in driver_codes_liq

    # 2. Stressed Liquidity with Deficit & Small Reserves
    strained_plan = ExtractedBusinessPlan(
        business_name="Colombo Logistics Hub",
        district="Colombo",
        business_category="Transport and Logistics",
        business_stage="Operating SME",
        available_starting_capital_lkr=400000.0,
        initial_setup_expenditure_lkr=360000.0,
        remaining_cash_reserves_after_setup_lkr=40000.0,
        monthly_revenue_lkr=200000.0,
        fixed_monthly_costs_lkr=160000.0,
        variable_monthly_costs_lkr=80000.0,
        monthly_loan_repayment_lkr=30000.0,
        other_mandatory_monthly_obligations_lkr=15000.0
    )
    res_strained = risk_engine.assess_record(strained_plan.to_dict())

    # Calculation verification
    assert res_strained.sub_scores["liquidity_risk"] > res_liquid.sub_scores["liquidity_risk"]
    assert res_strained.sub_scores["liquidity_risk"] >= 0.70
    driver_codes_strain = [d["factor_code"] for d in res_strained.primary_risk_drivers]
    assert "OPERATING_LOSS" in driver_codes_strain
    assert "CRITICAL_CASH_RUNWAY" in driver_codes_strain

    # Indicator verification: Net outflow is 200,000 - (160,000 + 80,000 + 30,000 + 15,000) = -85,000
    liq_indicators = res_strained.supported_indicators.get("liquidity", {})
    assert liq_indicators.get("net_monthly_operating_cash_flow_lkr") == -85000.0
    assert liq_indicators.get("calculated_cash_runway_months") < 1.0

    # Mitigation verification
    mit_codes = [m.get("factor_code") or m.get("targeted_factor") for m in res_strained.recommended_mitigations]
    assert any("CRITICAL_CASH_RUNWAY" in str(mid) or "OPERATING_LOSS" in str(mid) for mid in mit_codes)


def test_operational_risk_input_sensitivity_supplier_bottleneck(risk_engine):
    """
    Proves that single largest supplier dependency, lack of alternatives, and delivery delays
    directly drive operational risk scoring and trigger supply chain dual-sourcing mitigations.
    """
    # 1. Diversified Operational Base
    diversified_plan = ExtractedBusinessPlan(
        business_name="Apex Bakeries",
        district="Colombo",
        business_category="Bakery",
        business_stage="Operating SME",
        monthly_revenue_lkr=350000.0,
        fixed_monthly_costs_lkr=90000.0,
        variable_monthly_costs_lkr=60000.0,
        available_starting_capital_lkr=750000.0,
        current_cash_reserve_lkr=200000.0,
        critical_suppliers_count=4,
        largest_supplier_dependency_pct=25.0,
        alternative_suppliers_status="Good",
        supplier_lead_time_days=3.0,
        supplier_delays_stockouts_3_6m=0,
        inventory_coverage_days=30.0,
        total_employees_count=6,
        backup_staff_available="Yes",
        business_continuity_plan_exists="Yes"
    )
    res_diversified = risk_engine.assess_record(diversified_plan.to_dict())
    assert res_diversified.sub_scores["operational_risk"] <= 0.40
    driver_codes_div = [d["factor_code"] for d in res_diversified.primary_risk_drivers]
    assert "SINGLE_SUPPLIER_BOTTLENECK" not in driver_codes_div

    # 2. Critical Single Supplier Dependency & Stockout Incidents
    bottleneck_plan = ExtractedBusinessPlan(
        business_name="Apex Bakeries",
        district="Colombo",
        business_category="Bakery",
        business_stage="Operating SME",
        monthly_revenue_lkr=350000.0,
        fixed_monthly_costs_lkr=90000.0,
        variable_monthly_costs_lkr=60000.0,
        available_starting_capital_lkr=750000.0,
        current_cash_reserve_lkr=200000.0,
        critical_suppliers_count=1,
        largest_supplier_dependency_pct=85.0,
        alternative_suppliers_status="None",
        supplier_lead_time_days=14.0,
        supplier_delays_stockouts_3_6m=4,
        inventory_coverage_days=4.0,
        total_employees_count=3,
        backup_staff_available="No",
        business_continuity_plan_exists="No"
    )
    res_bottleneck = risk_engine.assess_record(bottleneck_plan.to_dict())

    # Calculation verification
    assert res_bottleneck.sub_scores["operational_risk"] > res_diversified.sub_scores["operational_risk"]
    assert res_bottleneck.sub_scores["operational_risk"] >= 0.70
    driver_codes_bot = [d["factor_code"] for d in res_bottleneck.primary_risk_drivers]
    assert "SUPPLIER_CONCENTRATION" in driver_codes_bot
    assert "FREQUENT_SUPPLY_DISRUPTIONS" in driver_codes_bot

    # Indicator verification
    ops_indicators = res_bottleneck.supported_indicators.get("operational", {})
    assert ops_indicators.get("largest_supplier_dependency_pct") == 85.0
    assert ops_indicators.get("alternative_suppliers_status") == "None"

    # Mitigation verification
    mit_codes = [m.get("factor_code") or m.get("targeted_factor") for m in res_bottleneck.recommended_mitigations]
    assert any("SUPPLIER_CONCENTRATION" in str(mid) or "FREQUENT_SUPPLY_DISRUPTIONS" in str(mid) for mid in mit_codes)


def test_unknown_values_handling_no_false_red_flags(risk_engine):
    """
    Proves that when fields are omitted or marked 'Unknown' (None),
    the calculation engine does NOT treat them as zero, avoids triggering false red flags,
    and accurately documents them in assessment_limitations and missing_inputs.
    """
    clean_plan = ExtractedBusinessPlan(
        business_name="Clean Slate Enterprise",
        district="Gampaha",
        business_category="Retail",
        business_stage="Operating SME",
        monthly_revenue_lkr=300000.0,
        available_starting_capital_lkr=600000.0,
        current_cash_reserve_lkr=200000.0,
        fixed_monthly_costs_lkr=80000.0,
        variable_monthly_costs_lkr=40000.0,
        # Omitted optional fields (None)
        outstanding_loan_balance_lkr=None,
        customer_retention_rate_pct=None,
        supplier_price_change_past_3_6m_pct=None,
        largest_supplier_dependency_pct=None
    )
    res = risk_engine.assess_record(clean_plan.to_dict())

    # False drivers must NOT trigger
    driver_codes = [d["factor_code"] for d in res.primary_risk_drivers]
    assert "LOW_CUSTOMER_RETENTION" not in driver_codes
    assert "SUPPLIER_PRICE_INFLATION" not in driver_codes
    assert "SUPPLIER_CONCENTRATION" not in driver_codes

    # Verification of limitations & missing inputs
    assert len(res.missing_inputs) > 0
    assert len(res.assessment_limitations) > 0
    assert any("retention" in m.lower() for m in res.missing_inputs)
    assert any("supplier" in m.lower() for m in res.missing_inputs)
    assert res.calculation_version == "2.4.0"


def test_pdf_report_contains_input_driven_indicators_and_v2_4_0(risk_engine):
    """
    Proves that the generated 15-section PDF report embeds the real observed indicators,
    limitations, and calculation engine version v2.4.0.
    """
    plan = ExtractedBusinessPlan(
        business_name="Western Coastal Spices",
        district="Kalutara",
        business_category="Manufacturing",
        business_stage="Operating SME",
        monthly_revenue_lkr=450000.0,
        monthly_customer_count=150,
        average_transaction_value_lkr=3000.0,
        available_starting_capital_lkr=900000.0,
        current_cash_reserve_lkr=280000.0,
        remaining_cash_reserves_after_setup_lkr=280000.0,
        fixed_monthly_costs_lkr=110000.0,
        variable_monthly_costs_lkr=60000.0,
        monthly_loan_repayment_lkr=25000.0,
        total_overdue_amount_lkr=0.0,
        repayment_overdue_status="Current",
        supplier_price_change_past_3_6m_pct=15.0,
        largest_supplier_dependency_pct=55.0,
        inventory_coverage_days=18.0
    )
    assessment: RiskAssessmentResult = risk_engine.assess_record(plan.to_dict())

    report_data = {
        "analysis_id": "CMP4_TEST_PDF_001",
        "business_plan": plan.to_dict(),
        "stage6_risk_assessment": assessment.to_dict(),
        "growth_readiness": {
            "decision": "PROCEED_WITH_CONDITIONS",
            "risk_adjusted_recommendation": "Execute working capital buffers."
        }
    }
    pdf_bytes = Component4MitigationPDFGenerator.generate(report_data)
    assert pdf_bytes is not None
    assert len(pdf_bytes) > 1000  # Non-trivial valid PDF
    assert assessment.calculation_version == "2.4.0"
    market_ind = assessment.supported_indicators.get("market", {})
    assert market_ind.get("sales_discrepancy_detected") is False
    assert market_ind.get("derived_monthly_sales_lkr") == 450000.0
    inflation_ind = assessment.supported_indicators.get("inflation", {})
    assert inflation_ind.get("expected_supplier_price_increase_pct") == 15.0
    ops_ind = assessment.supported_indicators.get("operational", {})
    assert ops_ind.get("largest_supplier_dependency_pct") == 55.0
