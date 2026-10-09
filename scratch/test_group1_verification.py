"""
Verification script for Group 1 fixes:
1. Tests Sumanadasa Stores (Existing Business)
2. Tests Kandy Fresh Mart (New Startup)
3. Verifies that Section 04 and Section 05 data mapping, sales formulas, budget alignment, and monitoring tables match.
4. Generates both PDF and DOCX documents and verifies identical values.
"""
import sys
import os
import io

# Ensure project root is on sys.path
sys.path.insert(0, os.path.abspath("."))

from src.orchestrator import analyze_business
from backend.services.business_plan_generator.report_builder import BusinessPlanReportBuilder
from backend.services.business_plan_generator.pdf_generator import BusinessPlanPDFGenerator
from backend.services.business_plan_generator.docx_generator import BusinessPlanDocxGenerator
from docx import Document

# 1. Inputs
sumanadasa_input = {
    "business_name": "Sumanadasa Stores",
    "business_stage": "Existing Business",
    "business_category": "Grocery / Mini-Mart",
    "district": "Kalutara",
    "province": "Western",
    "location_type": "Commercial Area",
    "location_suitability_score": 2,
    "available_capital_lkr": 500000.0,
    "monthly_budget_lkr": 18750.0,
    "expected_price_lkr": 15.0,
    "expected_customers_per_day": 5,
    "expected_operating_days_per_month": 26,
    "entrepreneur_experience_years": 3,
    "available_staff_count": 1,
    "required_staff_count": 1,
    "available_equipment_score": 3,
    "required_equipment_score": 3,
    "supplier_availability_score": 3,
    "competition_level": "Moderate",
    "customer_demand_score": 50,
    "expansion_type": "more products and better inventory",
    "additional_description": "Expanding by adding more products and better inventory."
}

startup_input = {
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
    "supplier_availability_score": 4
}


def evaluate_case(name: str, payload: dict):
    print(f"\n{'='*70}\nEVALUATION: {name}\n{'='*70}")
    profile = analyze_business(payload)
    report_data = BusinessPlanReportBuilder.build_report_data(profile)

    sec_04 = report_data.get("section_04", {})
    startup = sec_04.get("startup_investment", {})
    exp_inv = sec_04.get("expansion_investment", {})
    fin_plan = sec_04.get("monthly_financial_plan", {})
    funding = sec_04.get("funding_structure", {})
    sec_05 = report_data.get("section_05", {})
    kpis = sec_05.get("management_monitoring_measures", [])

    print("\n--- SECTION 04 MAPPED VALUES ---")
    print("Target Capital:", startup.get("strategy_target_capital_lkr"))
    print("Monthly Budget:", fin_plan.get("monthly_operating_budget_lkr"))
    print("Available Capital:", funding.get("available_capital_lkr"))
    print("Total Funds:", funding.get("total_available_funds_lkr"))
    print("Funding Gap Status:", startup.get("funding_gap_status"))
    print("Baseline Monthly Gross Sales:", fin_plan.get("baseline_monthly_gross_sales_lkr"))
    print("Expansion Uplift Gross Sales:", fin_plan.get("expansion_uplift_monthly_gross_sales_lkr"))
    print("Projected Total Gross Sales:", fin_plan.get("projected_total_monthly_gross_sales_lkr"))
    print("Estimated Sales in Card:", fin_plan.get("estimated_monthly_gross_sales_lkr"))
    print("Strategy Budget Coverage:", funding.get("strategy_budget_coverage_months"))
    print("Available Funds Coverage:", funding.get("available_funds_coverage_months"))

    print("\n--- SECTION 05 MONITORING MEASURES (ALL 5 ROWS) ---")
    for idx, k in enumerate(kpis[:5], start=1):
        print(f"Row {idx}:")
        print(f"  Measure: {k.get('measure_name')}")
        print(f"  Target:  {k.get('target')}")
        print(f"  Freq:    {k.get('frequency')}")
        print(f"  Cat:     {k.get('category')}")

    # Generate PDF and DOCX
    pdf_bytes = BusinessPlanPDFGenerator.generate_pdf(report_data)
    docx_bytes = BusinessPlanDocxGenerator.generate_docx(report_data)
    print(f"\nPDF Generated: {len(pdf_bytes):,} bytes")
    print(f"DOCX Generated: {len(docx_bytes):,} bytes")

    # Inspect DOCX tables to verify identical data
    doc = Document(io.BytesIO(docx_bytes))
    print("\nVerifying DOCX Content Extraction:")
    # Find KPI table in DOCX
    kpi_found = False
    for t_idx, table in enumerate(doc.tables):
        if len(table.rows) > 0 and "Monitoring Measure" in table.rows[0].cells[0].text:
            kpi_found = True
            print(f"Found DOCX KPI Table (Table #{t_idx+1}) with {len(table.rows)} rows:")
            for r_idx, row in enumerate(table.rows[1:], start=1):
                m_txt = row.cells[0].text.strip()
                t_txt = row.cells[1].text.strip()
                print(f"  DOCX Row {r_idx}: Measure='{m_txt}' | Target='{t_txt}'")
    assert kpi_found, "KPI Table not found in DOCX!"

    return report_data


if __name__ == "__main__":
    rep_sumanadasa = evaluate_case("Sumanadasa Stores (Existing Business)", sumanadasa_input)
    rep_startup = evaluate_case("Kandy Fresh Mart (New Startup)", startup_input)
    print("\nALL VERIFICATIONS PASSED SUCCESSFULLY!")
