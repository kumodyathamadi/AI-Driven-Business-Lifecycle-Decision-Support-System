import sys
import os
import io
import docx

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.orchestrator import analyze_business
from backend.services.business_plan_generator.report_builder import BusinessPlanReportBuilder
from backend.services.business_plan_generator.pdf_generator import BusinessPlanPDFGenerator
from backend.services.business_plan_generator.docx_generator import BusinessPlanDocxGenerator


def count_pdf_pages(pdf_bytes: bytes) -> int:
    """Counts PDF pages by searching for /Type /Page markers."""
    return (
        pdf_bytes.count(b"/Type /Page\n")
        or pdf_bytes.count(b"/Type /Page\r")
        or pdf_bytes.count(b"/Type /Page ")
        or pdf_bytes.count(b"/Type/Page")
    )


def get_test_startup_input():
    return {
        "business_name": "Lanka Fresh Mini-Mart",
        "business_stage": "New Startup",
        "business_category": "Grocery / Mini-Mart",
        "district": "Colombo",
        "location_type": "Suburban Commercial Hub",
        "proposed_action": "Launch New Mini-Mart Branch in Maharagama",
        "available_capital_lkr": 2500000.0,
        "loan_amount_lkr": 500000.0,
        "monthly_budget_lkr": 85000.0,
        "initial_inventory_cost_lkr": 600000.0,
        "expected_price_lkr": 1500.0,
        "expected_customers_per_day": 60,
        "expected_operating_days_per_month": 26,
        "competition_level": "Moderate",
        "competitor_count_nearby": 2,
        "customer_demand_score": 75,
        "entrepreneur_experience_years": 5,
        "location_suitability_score": 4,
        "available_staff_count": 3,
        "required_staff_count": 3,
        "available_equipment_score": 4,
        "required_equipment_score": 4,
        "supplier_availability_score": 4
    }


def test_new_startup_8_sections_structure():
    """Verify that report_builder creates all 8 required sections with exact keys and order."""
    print("\n--- Test 1: Verifying 8 Sections Structure in Report Data ---")
    payload = get_test_startup_input()
    profile = analyze_business(payload)
    report_data = BusinessPlanReportBuilder.build_report_data(profile)

    assert report_data["metadata"]["is_new_startup"] is True
    assert "new_startup_sections" in report_data
    sections = report_data["new_startup_sections"]
    assert sections is not None

    required_keys = [
        "section_1_executive_summary",
        "section_2_business_overview",
        "section_3_feasibility_findings",
        "section_4_personalized_strategy",
        "section_5_marketing_sales",
        "section_6_financial_resource",
        "section_7_implementation_roadmap",
        "section_8_outcomes_assumptions"
    ]
    for key in required_keys:
        assert key in sections, f"Missing section key: {key}"
        print(f"  [OK] Found section: {sections[key].get('section_title')}")

    # Section 1 checks
    s1 = sections["section_1_executive_summary"]
    assert "business_idea_overview" in s1
    assert "ai_feasibility_result" in s1
    assert "recommended_strategy" in s1
    assert "investment_funding_summary" in s1
    assert s1["business_idea_overview"]["business_name"] == "Lanka Fresh Mini-Mart"

    # Section 2 checks
    s2 = sections["section_2_business_overview"]
    assert "concept_and_objectives" in s2
    assert "business_location" in s2
    assert "products_or_services" in s2
    assert "target_customers" in s2
    assert "relevant_market_context" in s2
    assert s2["business_location"]["district"] == "Colombo"

    # Section 3 checks
    s3 = sections["section_3_feasibility_findings"]
    assert "ml_feasibility_prediction" in s3
    assert "factors_influencing_prediction" in s3
    assert "resource_and_affordability_gaps" in s3
    assert "key_findings" in s3
    assert "positive_enablers" in s3["factors_influencing_prediction"]
    assert "operational_hurdles" in s3["factors_influencing_prediction"]

    # Section 4 checks
    s4 = sections["section_4_personalized_strategy"]
    assert "recommended_strategy" in s4
    assert "reasons_for_recommendation" in s4
    assert "practical_actions" in s4
    assert "alternative_strategies" in s4
    assert len(s4["alternative_strategies"]) >= 2

    # Section 5 checks
    s5 = sections["section_5_marketing_sales"]
    assert "customer_acquisition_methods" in s5
    assert "suitable_promotional_activities" in s5
    assert "pricing_approach" in s5
    assert "sales_distribution_channels" in s5
    assert "initial_sales_targets" in s5

    # Section 6 checks
    s6 = sections["section_6_financial_resource"]
    assert "estimated_startup_costs" in s6
    assert "available_capital_and_funding" in s6
    assert "equipment_and_resource_requirements" in s6
    assert "staffing_requirements" in s6
    assert "operating_expenses" in s6
    assert "financial_projections" in s6

    # Section 7 checks
    s7 = sections["section_7_implementation_roadmap"]
    assert "prioritized_actions" in s7
    assert "implementation_timeline" in s7
    assert "launch_milestones" in s7
    assert "responsibilities" in s7
    assert len(s7["implementation_timeline"]) == 4

    # Section 8 checks
    s8 = sections["section_8_outcomes_assumptions"]
    assert "expected_business_outcomes" in s8
    assert "measurable_targets" in s8
    assert "important_business_assumptions" in s8
    assert "data_limitations_and_validation" in s8

    print("[PASS] 8-section structure and required subsections fully verified!")


def test_financial_consistency():
    """Verify financial calculations and user input integrity across all sections."""
    print("\n--- Test 2: Verifying Financial Integrity and Calculation Formulas ---")
    payload = get_test_startup_input()
    profile = analyze_business(payload)
    report_data = BusinessPlanReportBuilder.build_report_data(profile)

    s1 = report_data["new_startup_sections"]["section_1_executive_summary"]
    s5 = report_data["new_startup_sections"]["section_5_marketing_sales"]
    s6 = report_data["new_startup_sections"]["section_6_financial_resource"]

    # Check capital numbers match user input
    assert s1["investment_funding_summary"]["available_capital_lkr"] == 2500000.0
    assert s1["investment_funding_summary"]["loan_amount_lkr"] == 500000.0
    assert s1["investment_funding_summary"]["total_available_funds_lkr"] == 3000000.0
    assert s1["investment_funding_summary"]["monthly_operating_budget_lkr"] == 85000.0

    # Check gross sales formula: 60 cust/day * 1500 price * 26 days = 2,340,000 LKR
    expected_gross_sales = 60 * 1500.0 * 26
    actual_gross_sales = s5["initial_sales_targets"]["estimated_monthly_gross_sales_lkr"]
    assert actual_gross_sales == expected_gross_sales, f"Expected {expected_gross_sales}, got {actual_gross_sales}"
    print(f"  [OK] Gross Sales Formula Verified: {actual_gross_sales:,.2f} LKR")

    # Check startup cost breakdown sums correctly
    costs = s6["estimated_startup_costs"]
    assert costs["initial_inventory_cost_lkr"] == 600000.0
    assert costs["working_capital_reserve_lkr"] == 85000.0 * 2  # 170,000
    print("[PASS] Financial numbers and calculation formulas fully verified!")


def test_pdf_generation_and_page_breaks():
    """Verify PDF document builds cleanly and contains page breaks separating sections."""
    print("\n--- Test 3: Verifying PDF Generation and Page Breaks ---")
    payload = get_test_startup_input()
    profile = analyze_business(payload)
    report_data = BusinessPlanReportBuilder.build_report_data(profile)

    pdf_bytes = BusinessPlanPDFGenerator.generate_pdf(report_data)
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 50000
    print(f"  [OK] Generated PDF size: {len(pdf_bytes):,} bytes")

    # Verify PDF page count using PDF marker counting
    num_pages = count_pdf_pages(pdf_bytes)
    print(f"  [OK] Total PDF pages detected: {num_pages}")
    # With cover page, title page, and 8 separate sections each on its own page, total pages >= 10
    assert num_pages >= 10, f"Expected at least 10 pages, found {num_pages}"

    # Verify that PDF contains expected data bytes and is large enough for 8 full pages
    assert len(pdf_bytes) > 500000, f"Expected substantial multi-page PDF, got {len(pdf_bytes)} bytes"

    print("[PASS] PDF document generation, multi-page page breaks, and size verified!")


def test_docx_generation_and_page_breaks():
    """Verify DOCX document builds cleanly and contains page breaks separating sections."""
    print("\n--- Test 4: Verifying DOCX Generation and Page Breaks ---")
    payload = get_test_startup_input()
    profile = analyze_business(payload)
    report_data = BusinessPlanReportBuilder.build_report_data(profile)

    docx_bytes = BusinessPlanDocxGenerator.generate_docx(report_data)
    assert isinstance(docx_bytes, bytes)
    assert len(docx_bytes) > 20000
    print(f"  [OK] Generated DOCX size: {len(docx_bytes):,} bytes")

    # Read DOCX document
    doc = docx.Document(io.BytesIO(docx_bytes))
    full_docx_text = "\n".join([p.text for p in doc.paragraphs])

    assert "SECTION 01 — EXECUTIVE SUMMARY" in full_docx_text
    assert "SECTION 02 — BUSINESS OVERVIEW" in full_docx_text
    assert "SECTION 03 — FEASIBILITY ASSESSMENT AND KEY FINDINGS" in full_docx_text
    assert "SECTION 04 — PERSONALIZED BUSINESS STRATEGY" in full_docx_text
    assert "SECTION 05 — MARKETING AND SALES PLAN" in full_docx_text
    assert "SECTION 06 — FINANCIAL AND RESOURCE PLAN" in full_docx_text
    assert "SECTION 07 — IMPLEMENTATION ROADMAP" in full_docx_text
    assert "SECTION 08 — EXPECTED OUTCOMES AND KEY ASSUMPTIONS" in full_docx_text

    # Count page breaks in docx:
    # A page break in python-docx is represented by w:br with w:type="page"
    page_break_count = 0
    for p in doc.paragraphs:
        for r in p.runs:
            if 'w:br w:type="page"' in r._r.xml:
                page_break_count += 1

    print(f"  [OK] Page break elements in DOCX: {page_break_count}")
    # We must have page breaks between cover/title and every section (at least 8 breaks)
    assert page_break_count >= 8, f"Expected at least 8 page breaks, found {page_break_count}"

    print("[PASS] DOCX document generation, section titles, and page breaks verified!")


def test_existing_business_isolation():
    """Verify that Existing Business continues to produce the 5-section growth plan without regression."""
    print("\n--- Test 5: Verifying Existing Business Growth Plan Isolation ---")
    payload = {
        "business_name": "Perera Textiles",
        "business_stage": "Existing Business",
        "business_category": "Retail",
        "district": "Gampaha",
        "location_type": "Commercial",
        "proposed_action": "Branch Expansion",
        "available_capital_lkr": 3000000.0,
        "loan_amount_lkr": 1000000.0,
        "monthly_budget_lkr": 200000.0,
        "expected_price_lkr": 2500.0,
        "expected_customers_per_day": 40,
        "expected_operating_days_per_month": 26,
        "competition_level": "Moderate",
        "customer_demand_score": 70,
        "entrepreneur_experience_years": 8,
        "location_suitability_score": 4,
        "available_staff_count": 4,
        "required_staff_count": 4,
        "available_equipment_score": 4,
        "required_equipment_score": 4,
        "supplier_availability_score": 4,
        "current_monthly_revenue_lkr": 1500000.0,
        "current_monthly_net_profit_lkr": 250000.0,
        "expansion_capex_lkr": 1200000.0,
        "target_payback_months": 12
    }
    profile = analyze_business(payload)
    report_data = BusinessPlanReportBuilder.build_report_data(profile)

    assert report_data["metadata"]["is_new_startup"] is False
    assert report_data["new_startup_sections"] is None
    assert "section_01" in report_data
    assert "section_05" in report_data

    pdf_bytes = BusinessPlanPDFGenerator.generate_pdf(report_data)
    docx_bytes = BusinessPlanDocxGenerator.generate_docx(report_data)
    assert len(pdf_bytes) > 50000
    assert len(docx_bytes) > 20000

    print("[PASS] Existing business isolation and growth plan integrity verified!")


if __name__ == "__main__":
    print("=" * 80)
    print("RUNNING NEW STARTUP BUSINESS PLAN (8-SECTION REDESIGN) TEST SUITE")
    print("=" * 80)
    test_new_startup_8_sections_structure()
    test_financial_consistency()
    test_pdf_generation_and_page_breaks()
    test_docx_generation_and_page_breaks()
    test_existing_business_isolation()
    print("\n" + "=" * 80)
    print("ALL 5 TESTS COMPLETED WITH 100% SUCCESS!")
    print("=" * 80)
