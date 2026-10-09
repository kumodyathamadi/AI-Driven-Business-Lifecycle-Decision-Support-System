"""
Scratch test script to inspect Sumanadasa Stores data extraction and report generation
before any code changes are made.
"""
import sys
import os

# Add project root to sys.path
sys.path.insert(0, os.path.abspath("."))

from src.orchestrator import analyze_business
from backend.services.business_plan_generator.report_builder import BusinessPlanReportBuilder

sample_input = {
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

profile = analyze_business(sample_input)
report_data = BusinessPlanReportBuilder.build_report_data(profile)

sec_04 = report_data.get("section_04", {})
fin_plan = sec_04.get("monthly_financial_plan", {})
startup = sec_04.get("startup_investment", {})
funding = sec_04.get("funding_structure", {})
sec_05 = report_data.get("section_05", {})
kpis = sec_05.get("management_monitoring_measures") or sec_05.get("measurable_kpis", [])

print("--- SECTION 04 RAW VALUES CURRENTLY SEEN BY GENERATORS ---")
print("startup_investment keys:", list(startup.keys()) if isinstance(startup, dict) else type(startup))
print("Target Capital (strategy_target_capital_lkr):", startup.get("strategy_target_capital_lkr", 0.0) if isinstance(startup, dict) else "N/A")
print("Monthly Operating Budget (monthly_operating_budget_lkr):", fin_plan.get("monthly_operating_budget_lkr", 0.0) if isinstance(fin_plan, dict) else "N/A")
print("Total Available Funds (total_available_funds_lkr):", funding.get("total_available_funds_lkr", 0.0) if isinstance(funding, dict) else "N/A")
print("Funding Gap Status:", startup.get("funding_gap_status", "N/A") if isinstance(startup, dict) else "N/A")
print("Strategy Budget Coverage:", funding.get("strategy_budget_coverage_months"))
print("Available Funds Coverage:", funding.get("available_funds_coverage_months"))
print("Estimated Monthly Gross Sales:", fin_plan.get("estimated_monthly_gross_sales_lkr"))

print("\n--- SECTION 05 MANAGEMENT MONITORING MEASURES ---")
print(f"Total measures: {len(kpis)}")
for idx, k in enumerate(kpis[:5]):
    m_name = k.get('measure_name') or k.get('kpi_name', '')
    target = k.get('target', '')
    print(f"Row {idx+1}: measure_name='{m_name}', target='{target}', full_dict={k}")
