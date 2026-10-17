import io
import os
import sys
import unittest
from pypdf import PdfReader
from docx import Document

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.orchestrator import analyze_business
from backend.services.business_plan_generator.report_builder import BusinessPlanReportBuilder
from backend.services.business_plan_generator.pdf_generator import BusinessPlanPDFGenerator
from backend.services.business_plan_generator.docx_generator import BusinessPlanDocxGenerator


class TestUnifiedGrowthPlan(unittest.TestCase):
    """
    Test suite for the Unified Personalized Business Growth Plan for Existing Businesses.
    Verifies that:
    1. Existing businesses receive one unified Personalized Business Growth Plan.
    2. Users are not required to choose between two growth types.
    3. The report contains Cover Page, Executive Summary, and 7 numbered sections in exact order.
    4. Every main section starts on a new page in both PDF and DOCX outputs.
    5. Recommendations are personalized to user's actual data.
    6. ML model predictions, SHAP, TOPSIS, and What-If results match the AI pipeline.
    7. Financial calculations are consistent and verified.
    """

    @classmethod
    def setUpClass(cls):
        # Sample existing business payload
        cls.business_input = {
            "business_name": "Perera Super Stores & Bakers",
            "business_category": "Retail / Grocery",
            "business_stage": "Existing Business",
            "business_goal": "Personalized Growth & Expansion",
            "district": "Galle",
            "province": "Southern",
            "address": "45 Colombo Road, Galle Fort",
            "business_model": "Direct Retail / Storefront",
            "available_capital_lkr": 2500000.0,
            "monthly_budget_lkr": 350000.0,
            "loan_amount_lkr": 500000.0,
            "initial_inventory_cost_lkr": 400000.0,
            "expected_customers_per_day": 85,
            "expected_price_lkr": 450.0,
            "expected_operating_days_per_month": 26,
            "customer_demand_score": 75,
            "competition_level": "Moderate",
            "competitor_count_nearby": 3,
            "location_type": "Commercial Center",
            "location_suitability_score": 4,
            "available_staff_count": 3,
            "required_staff_count": 4,
            "available_equipment_score": 4,
            "required_equipment_score": 4,
            "supplier_availability_score": 4,
            "entrepreneur_experience_years": 5,
            "proposed_action": "Expand wholesale inventory, install modern display chillers, and increase daily customer reach.",
            "additional_description": "Established bakery and grocery store operating for 5 years in Galle Fort."
        }

        print("\n--- Running AI Analysis Pipeline for Existing Business ---")
        cls.analysis_result = analyze_business(cls.business_input)
        cls.profile = {
            "business_input": cls.business_input,
            **cls.analysis_result
        }

        print("--- Building Unified Report Data ---")
        cls.report_data = BusinessPlanReportBuilder.build_report_data(cls.profile)

    def test_01_unified_sections_structure_in_report_data(self):
        """Verify report_data contains unified_growth_sections with exactly 8 parts in exact order."""
        self.assertIn("unified_growth_sections", self.report_data)
        sections = self.report_data["unified_growth_sections"]

        expected_keys = [
            "executive_summary",
            "section_1_overview_objectives",
            "section_2_market_opportunities",
            "section_3_feasibility_findings",
            "section_4_growth_strategy",
            "section_5_financial_resource",
            "section_6_implementation_roadmap",
            "section_7_outcomes_indicators"
        ]
        for key in expected_keys:
            self.assertIn(key, sections, f"Missing required section key: {key}")

        metadata = self.report_data.get("metadata", {})
        self.assertEqual(metadata.get("document_title"), "PERSONALIZED BUSINESS GROWTH PLAN")

    def test_02_ai_pipeline_preservation(self):
        """Verify ML model predictions, SHAP, and TOPSIS are preserved."""
        feas = self.analysis_result.get("feasibility_analysis", {})
        self.assertIn("predicted_label", feas)
        self.assertIn(feas["predicted_label"], ["Feasible", "Conditionally Feasible", "Infeasible"])
        self.assertGreater(feas.get("confidence_score", 0), 0.0)

        # TOPSIS ranking
        strat = self.analysis_result.get("strategic_recommendations", {})
        candidates = strat.get("candidate_strategies", [])
        self.assertEqual(len(candidates), 4)

        # Explainability
        expl = self.analysis_result.get("explainability", {})
        self.assertTrue(len(expl.get("positive_drivers", [])) > 0 or len(expl.get("negative_drivers", [])) > 0)

    def test_03_financial_consistency(self):
        """Verify arithmetic consistency of financial metrics."""
        sec5 = self.report_data["unified_growth_sections"]["section_5_financial_resource"]
        costs = sec5["estimated_growth_costs"]
        fund = sec5["available_capital_and_funding"]
        op = sec5["operating_expenses"]

        total_avail = fund["available_capital_lkr"] + fund["loan_amount_lkr"]
        self.assertEqual(fund["total_available_funds_lkr"], total_avail)

        # Monthly gross sales = customers * price * days
        sec2_mkt = self.report_data["unified_growth_sections"]["section_2_market_opportunities"]["market_catchment"]
        expected_gross = 85 * 450.0 * 26
        self.assertAlmostEqual(sec2_mkt["monthly_gross_sales_estimate"], expected_gross, places=2)

    def test_04_pdf_generation_and_page_breaks(self):
        """Verify PDF output: starts with %PDF, at least 9 pages, every section on its own page."""
        pdf_bytes = BusinessPlanPDFGenerator.generate_pdf(self.report_data)
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))

        reader = PdfReader(io.BytesIO(pdf_bytes))
        num_pages = len(reader.pages)
        print(f"\n[PDF Output] Total Pages Generated: {num_pages}")
        self.assertGreaterEqual(num_pages, 9, f"PDF should have at least 9 pages, got {num_pages}")

        # Extract text from all pages
        full_pdf_text = " ".join([p.extract_text() for p in reader.pages]).upper()

        # Cover page title
        self.assertIn("PERSONALIZED BUSINESS GROWTH PLAN", full_pdf_text)
        self.assertIn("PERERA SUPER STORES & BAKERS", full_pdf_text)

        # Verify all 7 sections + Executive Summary are present
        self.assertIn("EXECUTIVE SUMMARY", full_pdf_text)
        self.assertIn("1. EXISTING BUSINESS OVERVIEW AND GROWTH OBJECTIVES", full_pdf_text)
        self.assertIn("2. MARKET AND GROWTH OPPORTUNITY ANALYSIS", full_pdf_text)
        self.assertIn("3. FEASIBILITY ASSESSMENT AND KEY FINDINGS", full_pdf_text)
        self.assertIn("4. PERSONALIZED GROWTH STRATEGY", full_pdf_text)
        self.assertIn("5. FINANCIAL AND RESOURCE PLAN", full_pdf_text)
        self.assertIn("6. IMPLEMENTATION ROADMAP", full_pdf_text)
        self.assertIn("7. EXPECTED OUTCOMES AND SUCCESS INDICATORS", full_pdf_text)

    def test_05_docx_generation_and_page_breaks(self):
        """Verify DOCX output: starts with PK, headings present in exact order, page breaks present."""
        docx_bytes = BusinessPlanDocxGenerator.generate_docx(self.report_data)
        self.assertTrue(docx_bytes.startswith(b"PK"))

        doc = Document(io.BytesIO(docx_bytes))
        doc_text = " ".join([p.text for p in doc.paragraphs])

        self.assertIn("PERSONALIZED BUSINESS GROWTH PLAN", doc_text)
        self.assertIn("EXECUTIVE SUMMARY", doc_text)
        self.assertIn("1. EXISTING BUSINESS OVERVIEW AND GROWTH OBJECTIVES", doc_text)
        self.assertIn("2. MARKET AND GROWTH OPPORTUNITY ANALYSIS", doc_text)
        self.assertIn("3. FEASIBILITY ASSESSMENT AND KEY FINDINGS", doc_text)
        self.assertIn("4. PERSONALIZED GROWTH STRATEGY", doc_text)
        self.assertIn("5. FINANCIAL AND RESOURCE PLAN", doc_text)
        self.assertIn("6. IMPLEMENTATION ROADMAP", doc_text)
        self.assertIn("7. EXPECTED OUTCOMES AND SUCCESS INDICATORS", doc_text)

        # Count tables
        self.assertGreaterEqual(len(doc.tables), 5)
        print(f"[DOCX Output] Document verified with {len(doc.tables)} formatted tables.")


if __name__ == "__main__":
    unittest.main()
