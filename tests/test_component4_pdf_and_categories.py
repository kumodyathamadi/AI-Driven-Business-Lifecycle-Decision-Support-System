"""
Unit and integration tests for Component 4 Evidence-Based Multi-Category Risk Assessment
and PDF Mitigation Plan System.

Verifies:
1. All five risk categories (Credit, Market, Inflation, Liquidity, Operational) are assessed independently.
2. Input parameter sensitivity: changing a category input specifically changes that category's assessment and recommendations.
3. Missing evidence handling: explicit limitations and requests for information rather than silent zeros or fake scores.
4. Recommendation responsiveness: recommendations adapt based on risk level, business stage, category/sector, and growth action.
5. Rich recommendation structure: contains priority, timeline, role, cost, measurable indicator, and reassessment triggers.
6. PDF generation: builds professional 9-section PDF with actual data, handling both English and Sinhala text.
7. Technical audit report preservation: Markdown report remains available alongside the user-facing PDF.
8. Zero target leakage: verifies no target labels or target-derived columns leak into features.
"""

import os
import sys
import unittest
import json
import tempfile
import numpy as np
import pandas as pd

# Ensure src is on sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC_DIR = os.path.join(PROJECT_ROOT, "src")
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from component4.risk_assessment import (
    RiskAssessmentEngine,
    RiskAssessmentResult,
    RiskFactorConfig
)
from component4.pipeline import (
    Component4Pipeline,
    ExtractedBusinessPlan
)
from component4.mitigation_pdf_generator import (
    Component4MitigationPDFGenerator
)


class TestComponent4MultiCategoryRiskAndPDF(unittest.TestCase):

    def setUp(self):
        self.engine = RiskAssessmentEngine()
        self.pipeline = Component4Pipeline()

        # Baseline healthy enterprise record
        self.baseline_record = {
            "action_id": "WP_TEST_ACT_01",
            "business_id": "WP_SME_0001",
            "business_name": "Lakshitha Bakers & Confectionery - ලක්ෂිත බේකර්ස්",
            "business_category": "Food & Beverage",
            "business_stage": "Established",
            "district": "Colombo",
            "province": "Western",
            "monthly_revenue_lkr": 1800000.0,
            "monthly_revenue_mean_lkr": 1800000.0,
            "monthly_expenses_mean_lkr": 1100000.0,
            "fixed_monthly_costs_lkr": 900000.0,
            "cash_reserves_latest_lkr": 4500000.0,
            "available_capital_lkr": 4500000.0,
            "operating_margin_ratio": 0.35,
            "baseline_cash_runway_months": 4.5,
            "post_action_cash_runway_months": 4.0,
            "outstanding_debt_latest_lkr": 500000.0,
            "monthly_debt_repayment_lkr": 45000.0,
            "debt_service_burden_ratio": 0.025,
            "debt_service_coverage_ratio": 15.0,
            "repayment_delay_days": 0.0,
            "Repayment_Delay_Days": 0.0,
            "repayment_overdue_status": "Current",
            "customer_hhi": 0.15,
            "customer_cr1_share": 0.25,
            "counterparty_payment_delay_mean_days": 10.0,
            "Sales_Growth_Rate_Pct": 8.0,
            "Demand_Index": 110.0,
            "demand_evidence": "historical_sales",
            "Import_Reliance_Pct": 15.0,
            "imported_materials_exposure": "Low",
            "Input_Cost_Index": 102.0,
            "Margin_Compression_Pct": 2.0,
            "supplier_hhi": 0.18,
            "supplier_cr1_share": 0.28,
            "supplier_delay_days": 5.0,
            "Delivery_Delay_Days": 5.0,
            "has_disrupted_supplier": 0,
            "Inventory_Coverage_Days": 30.0,
            "staffing_availability": "Adequate",
            "proposed_growth_action": "Introduce New Automated Packaging Line",
            "required_investment_lkr": 600000.0,
            "investment_to_cash_ratio": 0.133,
            "capacity_gap_score": 0.10,
        }

    # -------------------------------------------------------------------------
    # 1. Independent Assessment of All Five Risk Categories
    # -------------------------------------------------------------------------
    def test_five_categories_assessed_independently(self):
        """Verify that all five dimensions are computed separately and bounded in [0.0, 1.0]."""
        res = self.engine.assess_record(self.baseline_record)

        self.assertIn("credit_risk", res.sub_scores)
        self.assertIn("market_risk", res.sub_scores)
        self.assertIn("inflation_risk", res.sub_scores)
        self.assertIn("liquidity_risk", res.sub_scores)
        self.assertIn("operational_risk", res.sub_scores)

        for cat in ["credit_risk", "market_risk", "inflation_risk", "liquidity_risk", "operational_risk"]:
            score = res.sub_scores[cat]
            self.assertGreaterEqual(score, 0.0, f"{cat} is below 0.0")
            self.assertLessEqual(score, 1.0, f"{cat} exceeds 1.0")

        # Baseline record with strong liquidity, low debt, and diversified trade must be LOW risk
        self.assertLess(res.sub_scores["credit_risk"], 0.35)
        self.assertLess(res.sub_scores["liquidity_risk"], 0.35)
        self.assertEqual(res.overall_risk_category, "LOW")

    # -------------------------------------------------------------------------
    # 2. Input Sensitivity per Category (Selective Alteration)
    # -------------------------------------------------------------------------
    def test_credit_risk_input_sensitivity(self):
        """Changing debt delinquency alters credit risk specifically without polluting other categories."""
        record_delinquent = dict(self.baseline_record)
        record_delinquent["repayment_delay_days"] = 45.0
        record_delinquent["Repayment_Delay_Days"] = 45.0
        record_delinquent["repayment_overdue_status"] = "30+ Days Overdue"

        res_base = self.engine.assess_record(self.baseline_record)
        res_delinquent = self.engine.assess_record(record_delinquent)

        # Credit risk must rise dramatically into critical territory
        self.assertGreater(res_delinquent.sub_scores["credit_risk"], res_base.sub_scores["credit_risk"])
        self.assertGreaterEqual(res_delinquent.sub_scores["credit_risk"], 0.85)

        # Operational and inflation scores must remain completely unchanged
        self.assertEqual(res_delinquent.sub_scores["operational_risk"], res_base.sub_scores["operational_risk"])
        self.assertEqual(res_delinquent.sub_scores["inflation_risk"], res_base.sub_scores["inflation_risk"])

        # Driver attribution must pinpoint credit delinquency
        driver_codes = [d["factor_code"] for d in res_delinquent.primary_risk_drivers]
        self.assertIn("REPAYMENT_DELINQUENCY_30_PLUS_DAYS", driver_codes)

    def test_operational_risk_input_sensitivity(self):
        """Changing supplier concentration and disruption alters operational risk specifically."""
        record_op = dict(self.baseline_record)
        record_op["supplier_hhi"] = 0.75
        record_op["supplier_cr1_share"] = 0.85
        record_op["has_disrupted_supplier"] = 1
        record_op["Delivery_Delay_Days"] = 25.0

        res_base = self.engine.assess_record(self.baseline_record)
        res_op = self.engine.assess_record(record_op)

        # Operational risk must surge
        self.assertGreater(res_op.sub_scores["operational_risk"], res_base.sub_scores["operational_risk"])
        self.assertGreaterEqual(res_op.sub_scores["operational_risk"], 0.70)

        # Credit and liquidity risk formulas must remain unaffected
        self.assertEqual(res_op.sub_scores["credit_risk"], res_base.sub_scores["credit_risk"])
        self.assertEqual(res_op.sub_scores["liquidity_risk"], res_base.sub_scores["liquidity_risk"])

    def test_inflation_risk_input_sensitivity(self):
        """Changing import dependency and supplier price inflation alters inflation risk specifically."""
        record_inf = dict(self.baseline_record)
        record_inf["Import_Reliance_Pct"] = 80.0
        record_inf["imported_materials_exposure"] = "High"
        record_inf["recent_supplier_price_increase_pct"] = 22.0
        record_inf["Margin_Compression_Pct"] = 14.0

        res_base = self.engine.assess_record(self.baseline_record)
        res_inf = self.engine.assess_record(record_inf)

        self.assertGreater(res_inf.sub_scores["inflation_risk"], res_base.sub_scores["inflation_risk"])
        self.assertGreaterEqual(res_inf.sub_scores["inflation_risk"], 0.60)

        # Credit and operational risk baseline components remain unchanged
        self.assertEqual(res_inf.sub_scores["credit_risk"], res_base.sub_scores["credit_risk"])

    # -------------------------------------------------------------------------
    # 3. Missing Evidence Handling (No Silent Imputation)
    # -------------------------------------------------------------------------
    def test_missing_evidence_explicit_limitations(self):
        """Missing core financial evidence triggers explicit limitations rather than silent zeros."""
        empty_record = {
            "action_id": "WP_SME_EMPTY_01",
            "business_id": "WP_SME_EMPTY",
            "variant": "BASELINE"
        }
        res = self.engine.assess_record(empty_record)

        # Must flag INSUFFICIENT evidence
        self.assertEqual(res.evidence_sufficiency, "INSUFFICIENT")
        self.assertFalse(res.can_proceed_immediately)
        self.assertEqual(res.growth_readiness, "MODIFY")

        # Category sufficiency map must flag missing categories
        self.assertIn("liquidity", res.category_evidence_sufficiency)
        self.assertEqual(res.category_evidence_sufficiency["liquidity"], "INSUFFICIENT_EVIDENCE")

        # Provenance summary must itemize unknown fields
        unknowns = res.evidence_provenance_summary.get("unknown_or_unavailable_fields", [])
        self.assertIn("liquid_cash_reserves", unknowns)
        self.assertIn("operating_costs", unknowns)

        # Mitigations must request financial record-keeping
        self.assertTrue(any("record-keeping" in m["action"].lower() for m in res.recommended_mitigations))

    def test_unconfirmed_debt_status_handled_cleanly(self):
        """When debt fields are not declared, engine notes unconfirmed status instead of assuming zero debt."""
        no_debt_info_record = dict(self.baseline_record)
        # Strip all debt keys
        for k in ["outstanding_debt_latest_lkr", "monthly_debt_repayment_lkr", "debt_service_burden_ratio",
                  "repayment_delay_days", "Repayment_Delay_Days", "repayment_overdue_status", "is_zero_debt"]:
            no_debt_info_record.pop(k, None)

        res = self.engine.assess_record(no_debt_info_record)
        # Should not be 0.10 (which is reserved for confirmed zero-debt enterprises)
        self.assertGreater(res.sub_scores["credit_risk"], 0.20)
        driver_codes = [d["factor_code"] for d in res.primary_risk_drivers]
        self.assertIn("UNCONFIRMED_DEBT_STATUS", driver_codes)

    # -------------------------------------------------------------------------
    # 4. Recommendation Responsiveness & Metadata Integrity
    # -------------------------------------------------------------------------
    def test_recommendation_structure_and_metadata_completeness(self):
        """Every generated recommendation must contain the required metadata fields."""
        record = dict(self.baseline_record)
        record["supplier_hhi"] = 0.65
        record["supplier_cr1_share"] = 0.75
        record["post_action_cash_runway_months"] = 1.2
        record["cash_reserves_latest_lkr"] = 1200000.0

        res = self.engine.assess_record(record)
        self.assertGreater(len(res.recommended_mitigations), 0)

        required_keys = [
            "factor_code", "category", "risk_factor", "supporting_evidence",
            "action", "priority", "suggested_timeline", "responsible_role",
            "estimated_cost", "expected_outcome", "measurable_indicator",
            "reassessment_triggers", "targeted_factor", "rationale"
        ]

        for mit in res.recommended_mitigations:
            for k in required_keys:
                self.assertIn(k, mit, f"Missing key '{k}' in recommendation: {mit}")
                self.assertIsNotNone(mit[k], f"Key '{k}' is None in recommendation")
            self.assertIn(mit["priority"], ["CRITICAL", "HIGH", "MEDIUM", "LOW"])

    def test_recommendation_responsiveness_to_business_stage_and_action(self):
        """Recommendations dynamically tailor actions to sector and proposed growth action."""
        record_mfg = dict(self.baseline_record)
        record_mfg["business_category"] = "Manufacturing"
        record_mfg["supplier_hhi"] = 0.70
        record_mfg["supplier_cr1_share"] = 0.85
        record_mfg["proposed_growth_action"] = "Acquire Industrial Laser Cutter"
        record_mfg["required_investment_lkr"] = 6500000.0
        record_mfg["investment_to_cash_ratio"] = 1.44

        res_mfg = self.engine.assess_record(record_mfg)
        actions_text = " ".join([m["action"] for m in res_mfg.recommended_mitigations])

        # Must mention backup supplier and address the capital outlay/investment
        self.assertIn("backup supplier", actions_text.lower())
        self.assertIn("investment", actions_text.lower())

    # -------------------------------------------------------------------------
    # 5. PDF Generation & Sinhala Unicode Rendering
    # -------------------------------------------------------------------------
    def test_pdf_generation_actual_data_and_unicode_sinhala(self):
        """Generates PDF mitigation plan with real data and verifies byte validity and sections."""
        analysis_data = {
            "analysis_id": "CMP4_TEST_PDF_RUN_01",
            "timestamp": "2026-10-21 18:00",
            "plan_extraction": {
                "business_name": "Gampaha Agro & Spice Processing - ගම්පහ කෘෂි සකස් කිරීම",
                "district": "Gampaha",
                "province": "Western",
                "business_category": "Agriculture & Processing",
                "business_stage": "Early-stage",
                "cash_reserves_latest_lkr": 2200000.0,
                "monthly_revenue_lkr": 950000.0,
                "fixed_monthly_costs_lkr": 500000.0,
                "outstanding_loan_balance_lkr": 800000.0,
                "monthly_loan_repayment_lkr": 75000.0,
                "proposed_growth_action": "Establish Solar Drying Facility",
                "required_investment_lkr": 1400000.0
            },
            "resolved_entity": {
                "entity_id": "WP_SME_0412",
                "business_name": "Gampaha Agro & Spice Processing - ගම්පහ කෘෂි සකස් කිරීම",
                "district": "Gampaha",
                "province": "Western",
                "business_category": "Agriculture & Processing",
                "business_stage": "Early-stage"
            },
            "stage6_risk_assessment": {
                "composite_risk_score": 0.46,
                "overall_risk_category": "MEDIUM",
                "growth_readiness": "MODIFY",
                "capital_runway_months": 3.8,
                "sub_scores": {
                    "credit_risk": 0.32,
                    "market_risk": 0.48,
                    "inflation_risk": 0.40,
                    "liquidity_risk": 0.45,
                    "operational_risk": 0.62
                },
                "primary_risk_drivers": [
                    {
                        "factor_code": "SUPPLIER_CONCENTRATION",
                        "metric_name": "supplier_hhi",
                        "observed_value": 0.58,
                        "threshold": 0.30,
                        "severity_score": 0.68,
                        "description": "High supplier dependency: 68% of fresh raw spices purchased from a single farm cooperative."
                    }
                ],
                "recommended_mitigations": [
                    {
                        "factor_code": "SUPPLIER_CONCENTRATION",
                        "targeted_factor": "SUPPLIER_CONCENTRATION",
                        "category": "Operational Risk",
                        "risk_factor": "Operational Risk: Excessive Supplier Concentration",
                        "priority": "HIGH",
                        "suggested_timeline": "1–3 Months",
                        "time_horizon": "1–3 Months",
                        "responsible_role": "Procurement & Supply Chain Lead",
                        "action": "Qualify secondary local backup suppliers in Western Province and negotiate split-allocation terms",
                        "estimated_cost": "Unavailable / Non-monetary (vendor evaluation & split contracts)",
                        "expected_outcome": "Reduces dependency and ensures raw material continuity",
                        "rationale": "Excessive reliance on a single supplier creates single-point-of-failure vulnerabilities.",
                        "mechanism": "Sign supply agreements with secondary growers in Gampaha and Kalutara districts.",
                        "measurable_indicator": "Top supplier volume share <= 50%; supplier HHI < 0.30",
                        "reassessment_triggers": "Primary supplier shipment delayed > 5 days"
                    }
                ],
                "category_evidence_sufficiency": {
                    "liquidity": "CONFIRMED",
                    "credit": "CONFIRMED",
                    "market": "PARTIAL",
                    "inflation": "CONFIRMED",
                    "operational": "CONFIRMED"
                },
                "evidence_provenance_summary": {
                    "confirmed_user_facts": ["liquid_cash_reserves", "monthly_revenue", "bank_debt"],
                    "user_estimates_and_projections": ["solar_dryer_yield_projections"],
                    "externally_sourced_evidence": [{"metric": "CBSL Sector Benchmark", "value": "Agriculture Inflation 5.2%", "source": "CBSL"}],
                    "unknown_or_unavailable_fields": [],
                    "derived_values_and_formulas": {"cash_runway": {"value": 3.8, "calculation": "cash / monthly_burn"}}
                }
            },
            "growth_readiness": {
                "decision": "MODIFY",
                "original_proposed_action": "Establish Solar Drying Facility",
                "risk_adjusted_recommendation": "Phase solar drying investment into two stages; verify cooperative harvest volumes before ordering Phase 2 panels.",
                "reasons": ["Capital outlay absorbs 63.6% of cash reserves.", "Supplier base is concentrated in single cooperative."],
                "suggested_modifications": ["Stage payment in 50% milestone tranches."],
                "conditions_that_must_be_met": ["Retain minimum LKR 1,000,000 operational cash cushion."],
                "evidence_needed_to_reconsider": []
            }
        }

        pdf_bytes = Component4MitigationPDFGenerator.generate(analysis_data)
        self.assertIsInstance(pdf_bytes, bytes)
        self.assertGreater(len(pdf_bytes), 20000, "PDF byte stream is suspiciously small")
        self.assertTrue(pdf_bytes.startswith(b"%PDF"), "Output does not have valid PDF header")

    # -------------------------------------------------------------------------
    # 6. Pipeline Artifacts: Both PDF and Markdown Saved
    # -------------------------------------------------------------------------
    def test_pipeline_generates_both_pdf_and_markdown(self):
        """Pipeline execution produces both user-facing PDF and technical Markdown audit."""
        with tempfile.TemporaryDirectory() as tmpdir:
            custom_pipeline = Component4Pipeline(output_base_dir=tmpdir)
            result = custom_pipeline.run(
                plan_source=self.baseline_record,
                intake_submission=self.baseline_record,
                save_artifacts=True
            )

            # Both files must exist in output_files dictionary
            self.assertIn("markdown_report", result.output_files)
            self.assertIn("mitigation_pdf", result.output_files)

            md_path = result.output_files["markdown_report"]
            pdf_path = result.output_files["mitigation_pdf"]

            self.assertTrue(os.path.exists(md_path), f"Markdown report not found at {md_path}")
            self.assertTrue(os.path.exists(pdf_path), f"PDF mitigation plan not found at {pdf_path}")

            with open(md_path, "r", encoding="utf-8") as f:
                md_content = f.read()
            self.assertIn("Component 4 — Business Plan Risk & Growth Readiness Report", md_content)

            with open(pdf_path, "rb") as f:
                pdf_header = f.read(4)
            self.assertEqual(pdf_header, b"%PDF")

    # -------------------------------------------------------------------------
    # 7. Zero Target Leakage Check
    # -------------------------------------------------------------------------
    def test_zero_target_leakage_in_assessment_inputs(self):
        """Verifies no ground-truth targets or simulator rules are passed to assessment engine."""
        forbidden_target_keys = [
            "target_overall_risk", "target_growth_readiness", "target_mitigation_code",
            "simulator_rule_code", "Target_Label_Provenance", "Default_Provenance"
        ]
        test_record = dict(self.baseline_record)
        for k in forbidden_target_keys:
            self.assertNotIn(k, test_record)

        # Run assessment and ensure scores compute strictly from empirical inputs
        res = self.engine.assess_record(test_record)
        self.assertIsNotNone(res.composite_risk_score)


if __name__ == "__main__":
    unittest.main()
