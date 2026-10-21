"""
Component 4: Integrity Regression & Audit Test Suite.
Verifies end-to-end data integrity across 14 rigorous cases specified in the Component 4 Audit:
1. Low debt, no overdue repayments, adequate verified liquidity.
2. High outstanding debt and high monthly repayment.
3. Same profile as case 2, but with 30+ day overdue repayments (monotonicity test).
4. Missing revenue and missing cash reserves (no silent zeros).
5. Unknown values preserved as unknown without converting to 0 or low risk.
6. Zero debt enterprise (lowest credit risk, no delinquency drivers).
7. Conflicting business-plan financial values.
8. No relationships available for GNN (isolated node, no edge fabrication).
9. User-declared relationships only (unverified counterparty topology).
10. Verified relationships where data genuinely supports verification.
11. Fresh assessment computation (no stale cache contamination across distinct profiles).
12. Entity isolation (saved businesses do not leak financial values into new ones).
13. Growth readiness constraints (repayment delinquency & liquidity depletion force DELAY).
14. End-to-end API serialization accuracy matching live calculation.
"""

import os
import sys
import unittest
import tempfile
import json
import sqlite3
import numpy as np

SRC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src"))
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from component4.business_plan_ingestion import ExtractedBusinessPlan, BusinessPlanIngestionService
from component4.intake_schema import DynamicIntakeSchemaService, PROVENANCE_USER_DECLARED, PROVENANCE_USER_CONFIRMED
from component4.pipeline import Component4Pipeline, Component4AnalysisPipelineResult
from component4.entity_resolution import BusinessEntityResolver, ResolvedBusinessEntity, BusinessRelationshipEvidence
from component4.risk_assessment import RiskAssessmentEngine
from component4.gnn_model import GNNInferenceEngine
from component4.growth_readiness import GrowthReadinessEvaluator
from backend.main import app
from fastapi.testclient import TestClient


class TestComponent4IntegritySuite(unittest.TestCase):
    """Rigorous audit test suite covering all 14 regression test requirements."""

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.pipeline = Component4Pipeline()
        cls.risk_engine = RiskAssessmentEngine()
        cls.gnn_engine = GNNInferenceEngine(model_dir="models/component4", device="cpu")
        cls.readiness_evaluator = GrowthReadinessEvaluator()

    # -------------------------------------------------------------------------
    # Case 1: Low debt, no overdue repayments, adequate verified liquidity
    # -------------------------------------------------------------------------
    def test_case_01_low_debt_adequate_liquidity_proceeds(self):
        """Case 1: Healthy balance sheet with low debt and adequate liquidity yields low risk and PROCEED."""
        payload = {
            "business_name": "Healthy Colombo Cafe",
            "district": "Colombo",
            "available_starting_capital_lkr": 500000.0,
            "current_cash_reserve_lkr": 500000.0,
            "monthly_revenue_lkr": 350000.0,
            "fixed_monthly_costs_lkr": 80000.0,
            "variable_monthly_costs_lkr": 50000.0,
            "outstanding_loan_balance_lkr": 50000.0,
            "monthly_loan_repayment_lkr": 5000.0,
            "repayment_overdue_status": "Current",
            "repayment_delay_days": 0.0
        }
        res = self.pipeline.run(plan_source=payload, intake_submission=payload, save_artifacts=False)
        sub_scores = res.stage6_risk_assessment.sub_scores

        self.assertLess(sub_scores["credit_risk"], 0.35, "Low debt should have low credit risk")
        self.assertLess(sub_scores["liquidity_risk"], 0.40, "Adequate reserves should have low liquidity risk")
        self.assertGreater(res.stage6_risk_assessment.capital_runway_months, 3.0)
        self.assertEqual(res.growth_readiness.decision, "PROCEED")
        self.assertFalse(res.stage6_risk_assessment.has_critical_red_flag)

    # -------------------------------------------------------------------------
    # Case 2: High outstanding debt and high monthly repayment
    # -------------------------------------------------------------------------
    def test_case_02_high_debt_high_repayment(self):
        """Case 2: Heavy debt load relative to capital elevates credit risk and triggers financial caution."""
        payload = {
            "business_name": "Leveraged Retailer",
            "district": "Colombo",
            "available_starting_capital_lkr": 100000.0,
            "current_cash_reserve_lkr": 100000.0,
            "monthly_revenue_lkr": 200000.0,
            "fixed_monthly_costs_lkr": 100000.0,
            "outstanding_loan_balance_lkr": 1000000.0,
            "monthly_loan_repayment_lkr": 75000.0,
            "repayment_overdue_status": "Current",
            "repayment_delay_days": 0.0
        }
        res = self.pipeline.run(plan_source=payload, intake_submission=payload, save_artifacts=False)
        sub_scores = res.stage6_risk_assessment.sub_scores

        self.assertGreaterEqual(sub_scores["credit_risk"], 0.70, "10x debt-to-capital must produce high credit risk")
        self.assertIn(res.growth_readiness.decision, ["DELAY", "MODIFY"])

    # -------------------------------------------------------------------------
    # Case 3: Same profile as case 2, but with 30+ day overdue repayments
    # -------------------------------------------------------------------------
    def test_case_03_monotonicity_overdue_worsens_risk_and_defers(self):
        """Case 3: Holding all other inputs constant, worsening overdue status must monotonically worsen credit risk and force DELAY."""
        # Case 2 baseline (Current)
        payload_current = {
            "business_name": "Monotonicity Test SME",
            "district": "Colombo",
            "available_starting_capital_lkr": 37500.0,
            "current_cash_reserve_lkr": 37500.0,
            "outstanding_loan_balance_lkr": 1000000.0,
            "monthly_loan_repayment_lkr": 75000.0,
            "repayment_overdue_status": "Current",
            "repayment_delay_days": 0.0
        }
        res_current = self.pipeline.run(plan_source=payload_current, intake_submission=payload_current, save_artifacts=False)

        # Case 3 (30+ days overdue)
        payload_overdue = dict(payload_current)
        payload_overdue["repayment_overdue_status"] = "30+ Days Overdue"
        payload_overdue["repayment_delay_days"] = 30.0
        payload_overdue["overdue_repayments"] = "30+ Days"
        res_overdue = self.pipeline.run(plan_source=payload_overdue, intake_submission=payload_overdue, save_artifacts=False)

        # Monotonicity check
        credit_current = res_current.stage6_risk_assessment.sub_scores["credit_risk"]
        credit_overdue = res_overdue.stage6_risk_assessment.sub_scores["credit_risk"]
        self.assertGreaterEqual(credit_overdue, credit_current, "30+ days overdue must not lower credit risk score")
        self.assertGreaterEqual(credit_overdue, 0.85, "30+ days overdue must yield severe credit risk >= 0.85")

        # Decision check: Overdue repayment must trigger DELAY
        self.assertEqual(res_overdue.growth_readiness.decision, "DELAY")
        self.assertEqual(res_overdue.growth_readiness.decision_label, "Defer expansion")
        self.assertTrue(any("delinquency" in r.lower() or "overdue" in r.lower() for r in res_overdue.growth_readiness.decision_rationales))

    # -------------------------------------------------------------------------
    # Case 4: Missing revenue and missing cash reserves
    # -------------------------------------------------------------------------
    def test_case_04_missing_revenue_reserves_no_silent_zeros(self):
        """Case 4: Missing revenue and reserves are not silently converted to positive revenue or infinite runway."""
        payload = {
            "business_name": "Unspecified Baseline SME",
            "district": "Colombo",
            "available_starting_capital_lkr": 50000.0,
            "monthly_revenue_lkr": None,
            "current_cash_reserve_lkr": None,
            "fixed_monthly_costs_lkr": 40000.0
        }
        res = self.pipeline.run(plan_source=payload, intake_submission=payload, save_artifacts=False)
        facts = res.stage6_risk_assessment.financial_ratios

        # Revenue is not fabricated to 780,000 LKR
        self.assertIsNone(facts.get("monthly_revenue_lkr"))
        # Liquidity runway is accurately computed from starting capital / burn without dividing by zero
        self.assertLessEqual(res.stage6_risk_assessment.capital_runway_months, 1.5)

    # -------------------------------------------------------------------------
    # Case 5: Unknown values preserved as unknown
    # -------------------------------------------------------------------------
    def test_case_05_unknown_values_preserved_with_provenance(self):
        """Case 5: Explicit Unknown inputs maintain UNKNOWN / DECLARED_UNKNOWN status and do not convert to zero debt."""
        submission = {
            "outstanding_loan_balance_lkr": "Unknown",
            "monthly_loan_repayment_lkr": "Unknown",
            "monthly_revenue_lkr": "Unknown",
            "current_cash_reserve_lkr": "Unknown"
        }
        is_val, cleaned, errs = DynamicIntakeSchemaService.validate_intake_payload(submission)
        self.assertTrue(is_val)
        self.assertIsNone(cleaned["outstanding_loan_balance_lkr"]["value"])
        self.assertEqual(cleaned["outstanding_loan_balance_lkr"]["status"], "DECLARED_UNKNOWN")
        self.assertEqual(cleaned["outstanding_loan_balance_lkr"]["provenance"], PROVENANCE_USER_DECLARED)

    # -------------------------------------------------------------------------
    # Case 6: No debt and no loan repayment
    # -------------------------------------------------------------------------
    def test_case_06_zero_debt_enterprise(self):
        """Case 6: Businesses with no debt have minimal credit risk and zero debt-service burden."""
        payload = {
            "business_name": "Debt Free Enterprise",
            "district": "Gampaha",
            "available_starting_capital_lkr": 300000.0,
            "current_cash_reserve_lkr": 300000.0,
            "outstanding_loan_balance_lkr": 0.0,
            "monthly_loan_repayment_lkr": 0.0,
            "repayment_overdue_status": "No",
            "repayment_delay_days": 0.0,
            "fixed_monthly_costs_lkr": 30000.0,
            "monthly_revenue_lkr": 100000.0
        }
        res = self.pipeline.run(plan_source=payload, intake_submission=payload, save_artifacts=False)
        credit_score = res.stage6_risk_assessment.sub_scores["credit_risk"]

        self.assertLessEqual(credit_score, 0.15, "Zero debt should result in baseline minimal credit risk")
        drivers = [d.get("factor_code") for d in res.stage6_risk_assessment.primary_risk_drivers]
        self.assertNotIn("REPAYMENT_DELINQUENCY_30_PLUS_DAYS", drivers)
        self.assertNotIn("EXTREME_DEBT_TO_CAPITAL_EXPOSURE", drivers)

    # -------------------------------------------------------------------------
    # Case 7: Conflicting business-plan financial values
    # -------------------------------------------------------------------------
    def test_case_07_conflicting_financial_values_tracked(self):
        """Case 7: When user overrides extracted plan values with conflicting numbers, provenance is tracked."""
        plan_dict = {
            "business_name": "Conflict Testing SME",
            "district": "Kalutara",
            "available_capital_lkr": 200000.0,
            "requested_loan_lkr": 50000.0
        }
        user_intake = {
            "available_starting_capital_lkr": 75000.0,  # Conflicts with extracted 200k
            "outstanding_loan_balance_lkr": 800000.0    # Conflicts with requested 50k
        }
        res = self.pipeline.run(plan_source=plan_dict, intake_submission=user_intake, save_artifacts=False)

        # Confirm user override was applied with provenance
        self.assertEqual(res.business_plan.available_capital_lkr, 75000.0)
        self.assertEqual(res.business_plan.outstanding_loan_balance_lkr, 800000.0)
        self.assertIn("available_starting_capital_lkr", res.business_plan.field_provenance)

    # -------------------------------------------------------------------------
    # Case 8: No relationships available for the GNN (Isolated node)
    # -------------------------------------------------------------------------
    def test_case_08_gnn_isolated_node_no_edge_fabrication(self):
        """Case 8: SME without counterparty relationships gracefully returns ISOLATED_NODE without fabricating edges."""
        entity = ResolvedBusinessEntity(
            business_name="Isolated Startup",
            registration_number=None,
            matched_business_id=None,
            entity_id="test_isolated_001",
            match_confidence=0.0,
            resolution_method="NEW_PERSISTENT_ENTITY",
            is_verified=False,
            is_within_geographic_scope=True,
            district="Colombo",
            province="Western",
            geographic_scope_status="IN_SCOPE_WESTERN_PROVINCE",
            data_origin="USER_DECLARED",
            has_relationship_network=False,
            verified_relationships=[],
            unverified_relationships_count=0,
            supplier_count=0,
            customer_count=0,
            lender_count=0,
            provenance_notes=[]
        )
        res = self.gnn_engine.infer(entity)

        self.assertFalse(res.gnn_applicable)
        self.assertEqual(res.gnn_status, "ISOLATED_NODE")
        self.assertEqual(res.edge_count, 0)
        self.assertIsNone(res.predicted_risk_category)
        self.assertIn("zero artificial edges were fabricated", res.explanation)

    # -------------------------------------------------------------------------
    # Case 9: User-declared relationships only
    # -------------------------------------------------------------------------
    def test_case_09_user_declared_relationships_only(self):
        """Case 9: User declared relationships are represented with Verified=False and processed inductively."""
        entity = ResolvedBusinessEntity(
            business_name="Connected SME",
            registration_number=None,
            matched_business_id=None,
            entity_id="test_declared_001",
            match_confidence=0.0,
            resolution_method="NEW_PERSISTENT_ENTITY",
            is_verified=False,
            is_within_geographic_scope=True,
            district="Colombo",
            province="Western",
            geographic_scope_status="IN_SCOPE_WESTERN_PROVINCE",
            data_origin="USER_DECLARED",
            has_relationship_network=True,
            verified_relationships=[],
            unverified_relationships_count=1,
            supplier_count=1,
            customer_count=0,
            lender_count=0,
            provenance_notes=[]
        )
        declared_rels = [{
            "partner_name": "Supplier A",
            "relationship_type": "SUPPLIER",
            "relationship_strength_1_5": 4.0
        }]
        facts = {
            "available_starting_capital_lkr": 250000.0,
            "outstanding_loan_balance_lkr": 0.0,
            "business_sector": "Retail"
        }
        res = self.gnn_engine.infer(entity, user_declared_relationships=declared_rels, business_facts=facts)

        self.assertTrue(res.gnn_applicable)
        self.assertEqual(res.gnn_status, "SUCCESS")
        self.assertIsNotNone(res.predicted_risk_category)
        self.assertEqual(res.graph_topology_summary["declared_counterparties"], 1)
        self.assertEqual(res.graph_topology_summary["verified_counterparties"], 0)

    # -------------------------------------------------------------------------
    # Case 10: Verified relationships genuinely supported by registry
    # -------------------------------------------------------------------------
    def test_case_10_verified_relationships_tracked_separately(self):
        """Case 10: Entities matching pre-existing registry entries keep verified relationship flag."""
        resolver = BusinessEntityResolver()
        test_biz_id = "test_verified_sme_c4"
        
        # Seed a verified business and relationship into SQLite registry
        if os.path.exists(resolver.db_path):
            conn = sqlite3.connect(resolver.db_path)
            cur = conn.cursor()
            cur.execute("DELETE FROM component4_relationships WHERE business_id = ?", (test_biz_id,))
            cur.execute("DELETE FROM component4_businesses WHERE id = ?", (test_biz_id,))
            cur.execute("""
                INSERT INTO component4_businesses (id, business_name, district, province, business_category, business_stage, is_verified, source_origin)
                VALUES (?, ?, ?, ?, ?, ?, 1, 'REGISTERED')
            """, (test_biz_id, "Verified Lanka Enterprise", "Colombo", "Western", "Manufacturing", "Operating"))
            cur.execute("""
                INSERT INTO component4_relationships (id, business_id, partner_name, partner_type, relationship_type, provenance_category, transaction_value_lkr, dependency_percentage, is_verified)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            """, ("rel_test_v_01", test_biz_id, "Ceylon Logistics Hub", "CUSTOMER", "SELLS_TO", "DOCUMENT_VERIFIED", 750000.0, 40.0))
            conn.commit()
            conn.close()

        plan = ExtractedBusinessPlan(
            business_name="Verified Lanka Enterprise",
            district="Colombo",
            available_capital_lkr=500000.0
        )
        resolved = resolver.resolve(plan, confirmed_business_id=test_biz_id)

        self.assertTrue(resolved.is_verified)
        self.assertTrue(resolved.has_relationship_network)
        self.assertGreater(len(resolved.verified_relationships), 0)
        self.assertTrue(resolved.verified_relationships[0].is_verified)

    # -------------------------------------------------------------------------
    # Case 11: Different input profiles produce freshly computed assessments
    # -------------------------------------------------------------------------
    def test_case_11_fresh_computation_no_stale_cache(self):
        """Case 11: Consecutive assessments of distinct profiles compute fresh distinct scores."""
        profile_a = {
            "business_name": "Enterprise Alpha",
            "district": "Colombo",
            "available_starting_capital_lkr": 600000.0,
            "outstanding_loan_balance_lkr": 0.0,
            "repayment_overdue_status": "No",
            "fixed_monthly_costs_lkr": 40000.0
        }
        profile_b = {
            "business_name": "Enterprise Beta",
            "district": "Colombo",
            "available_starting_capital_lkr": 30000.0,
            "outstanding_loan_balance_lkr": 1500000.0,
            "repayment_overdue_status": "30+ Days",
            "monthly_loan_repayment_lkr": 80000.0,
            "fixed_monthly_costs_lkr": 50000.0
        }

        res_a = self.pipeline.run(plan_source=profile_a, intake_submission=profile_a, save_artifacts=False)
        res_b = self.pipeline.run(plan_source=profile_b, intake_submission=profile_b, save_artifacts=False)

        self.assertNotEqual(res_a.stage6_risk_assessment.composite_risk_score, res_b.stage6_risk_assessment.composite_risk_score)
        self.assertEqual(res_a.growth_readiness.decision, "PROCEED")
        self.assertEqual(res_b.growth_readiness.decision, "DELAY")

    # -------------------------------------------------------------------------
    # Case 12: Existing saved businesses do not leak values into new ones
    # -------------------------------------------------------------------------
    def test_case_12_no_leakage_between_saved_and_new_businesses(self):
        """Case 12: Resolving a new business does not inherit debt or financials from another entity."""
        new_plan = ExtractedBusinessPlan(
            business_name="Unique Fresh Unregistered Startup",
            district="Kalutara",
            available_capital_lkr=150000.0
        )
        resolver = BusinessEntityResolver()
        resolved = resolver.resolve(new_plan)

        self.assertFalse(resolved.is_verified)
        self.assertEqual(len(resolved.verified_relationships), 0)
        self.assertIsNone(resolved.matched_business_id)

    # -------------------------------------------------------------------------
    # Case 13: Growth readiness defers when critical constraints unresolved
    # -------------------------------------------------------------------------
    def test_case_13_growth_readiness_defers_on_critical_constraints(self):
        """Case 13: Delinquent repayment or runway < 1.0 month defers expansion with explainable reasons."""
        plan = ExtractedBusinessPlan(
            business_name="Distressed SME",
            district="Colombo",
            available_capital_lkr=37500.0,
            outstanding_loan_balance_lkr=1000000.0,
            monthly_loan_repayment_lkr=75000.0,
            repayment_delay_days=35.0,
            repayment_overdue_status="30+ Days Overdue",
            capital_runway_months=0.5
        )
        resolver = BusinessEntityResolver()
        resolved = resolver.resolve(plan)
        risk_input = self.pipeline._build_risk_engine_input(plan, resolved)
        risk_result = self.risk_engine.assess_record(risk_input)
        gnn_result = self.gnn_engine.infer(resolved)

        readiness = self.readiness_evaluator.evaluate(plan, resolved, risk_result, gnn_result)

        self.assertEqual(readiness.decision, "DELAY")
        self.assertEqual(readiness.decision_label, "Defer expansion")
        self.assertGreater(len(readiness.reasons), 0)
        self.assertGreater(len(readiness.conditions_that_must_be_met), 0)
        self.assertGreater(len(readiness.evidence_needed_to_reconsider), 0)

    # -------------------------------------------------------------------------
    # Case 14: API results accurately reflect calculated values and evidence
    # -------------------------------------------------------------------------
    def test_case_14_api_results_reflect_exact_production_workflow_inputs(self):
        """Case 14: Verifies the exact user observed values submitted via API produce truthful scores and DELAY."""
        # The user's exact production inputs:
        # Available starting capital: LKR 37,500
        # Initial financing/loan incurred: LKR 100,000
        # Outstanding loan balance: LKR 1,000,000
        # Monthly loan repayment: LKR 75,000
        # Overdue repayments: 30+ days
        # Existing debt guarantees/obligations: None
        intake_payload = {
            "available_starting_capital_lkr": 37500.0,
            "initial_financing_amount_lkr": 100000.0,
            "outstanding_loan_balance": 1000000.0,
            "outstanding_loan_balance_lkr": 1000000.0,
            "monthly_loan_repayment": 75000.0,
            "monthly_loan_repayment_lkr": 75000.0,
            "overdue_repayments": "30+ Days",
            "repayment_overdue_status": "30+ Days",
            "debt_guarantees": "None",
            "debt_guarantees_or_obligations": "None",
            "district": "Colombo",
            "business_name": "Observed Production Audit SME"
        }

        response = self.client.post("/api/component4/assess", json={
            "plan_source": intake_payload,
            "intake_submission": intake_payload
        })

        self.assertEqual(response.status_code, 200)
        data = response.json()

        # Check sub-scores
        stage6 = data.get("stage6_risk_assessment", {})
        sub_scores = stage6.get("sub_scores", {})
        credit_risk = sub_scores.get("credit_risk", sub_scores.get("debt_burden_risk"))
        self.assertGreaterEqual(credit_risk, 0.85, "Credit risk must reflect 30+ day delinquency with score >= 0.85")

        # Check runway calculation is provided truthfully
        runway = stage6.get("capital_runway_months") or data.get("business_plan", {}).get("capital_runway_months")
        self.assertIsNotNone(runway, "Liquidity runway must be provided")
        self.assertLessEqual(runway, 1.0, "Runway with LKR 37.5k capital and LKR 75k monthly repayment is under 1 month")

        # Check growth readiness decision
        readiness = data.get("growth_readiness", {})
        self.assertEqual(readiness.get("decision"), "DELAY", "System must DEFER expansion under critical default and negative capital coverage")
        self.assertEqual(readiness.get("decision_label"), "Defer expansion")

        # Overall risk must NOT be low (was 0.24 previously)
        overall_cat = stage6.get("overall_risk_category")
        self.assertEqual(overall_cat, "HIGH")
        self.assertTrue(stage6.get("has_critical_red_flag"))

    # -------------------------------------------------------------------------
    # Case 15: Distinct Incident Profiles (Helloo Glow vs Daily Bake House)
    # -------------------------------------------------------------------------
    def test_case_15_helloo_glow_vs_daily_bake_house_differentiation(self):
        """Case 15: Proves Helloo Glow and Daily Bake House produce differentiated, truthful scores through intake/submit-and-run."""
        helloo_payload = {
            "business_name": "Helloo Glow Beauty Studio",
            "district": "Kalutara",
            "business_category": "Personal Care / Salon",
            "completed_fields": {
                "outstanding_loan_balance": 50000.0,
                "monthly_loan_repayment": 10000.0,
                "overdue_repayments": "No",
                "customer_demand_evidence": "estimate_only",
                "available_starting_capital_lkr": 150000.0,
                "monthly_sales_revenue": 120000.0,
                "monthly_fixed_costs": 40000.0,
                "monthly_variable_costs": 20000.0,
                "cash_available_operations": 150000.0,
            },
            "declared_relationships": []
        }

        daily_payload = {
            "business_name": "Daily Bake House",
            "district": "Colombo",
            "business_category": "Bakery",
            "completed_fields": {
                "outstanding_loan_balance": 500000.0,
                "monthly_loan_repayment": 75000.0,
                "overdue_repayments": "30+ Days",
                "customer_demand_evidence": "estimate_only",
                "available_starting_capital_lkr": 50000.0,
                "monthly_sales_revenue": 150000.0,
                "monthly_fixed_costs": 95000.0,
                "monthly_variable_costs": 50000.0,
                "cash_available_operations": 30000.0,
            },
            "declared_relationships": []
        }

        r_helloo = self.client.post("/api/component4/intake/submit-and-run", json=helloo_payload)
        self.assertEqual(r_helloo.status_code, 200)
        d_helloo = r_helloo.json()

        r_daily = self.client.post("/api/component4/intake/submit-and-run", json=daily_payload)
        self.assertEqual(r_daily.status_code, 200)
        d_daily = r_daily.json()

        # Check response contract compatibility
        self.assertIn("business_plan", d_helloo)
        self.assertIn("plan_extraction", d_helloo)
        self.assertIn("business_plan", d_daily)
        self.assertIn("plan_extraction", d_daily)

        # Check score differentiation
        s6_helloo = d_helloo["stage6_risk_assessment"]
        s6_daily = d_daily["stage6_risk_assessment"]

        self.assertNotEqual(s6_helloo["composite_risk_score"], s6_daily["composite_risk_score"])
        self.assertLess(s6_helloo["composite_risk_score"], 0.40)
        self.assertGreaterEqual(s6_daily["composite_risk_score"], 0.60)

        # Credit risk differentiation
        credit_helloo = s6_helloo["sub_scores"]["credit_risk"]
        credit_daily = s6_daily["sub_scores"]["credit_risk"]
        self.assertLess(credit_helloo, 0.25, "Helloo Glow (low debt, current) must have low credit risk")
        self.assertEqual(credit_daily, 1.0, "Daily Bake House (30+ days overdue) must have max credit risk 1.0")

        # Growth decision differentiation
        self.assertIn(d_helloo["growth_readiness"]["decision"], ["PROCEED", "MODIFY"])
        self.assertEqual(d_daily["growth_readiness"]["decision"], "DELAY")

    # -------------------------------------------------------------------------
    # Case 16: Scientific Data Leakage Prevention (Preceding Temporal Window)
    # -------------------------------------------------------------------------
    def test_case_16_temporal_feature_target_separation(self):
        """Case 16: Verifies feature aggregations strictly precede the target period without contemporaneous leakage."""
        import pandas as pd
        from component4.preprocessing import Component4RiskDataPipeline

        # Construct synthetic multi-month series (24 months)
        bids = ["SME_TEST_01", "SME_TEST_02"]
        months = [f"2024-{m:02d}" for m in range(1, 13)] + [f"2025-{m:02d}" for m in range(1, 13)]

        records = []
        for bid in bids:
            for i, m in enumerate(months, start=1):
                records.append({
                    "Business_ID": bid,
                    "Month": m,
                    "Revenue_LKR": 10000.0 * i,
                    "Operating_Expenses_LKR": 5000.0 * i,
                    "Operating_Profit_LKR": 5000.0 * i,
                    "Profit_Margin_Pct": 50.0,
                    "Loan_Balance_LKR": 1000.0 * i,
                    "Payment_Delay_Days": float(i),
                    "Missed_Payment_Flag": 0,
                    "Debt_to_Revenue_Ratio": 0.1,
                    "Sales_Growth_Pct": 5.0,
                    "Competitor_Pressure_Score_1_5": 2.0,
                    "Customer_Concentration_Pct": 25.0,
                    "Cash_and_Cash_Equivalents_LKR": 5000.0 * i,
                    "Quick_Ratio": 1.5,
                    "Cash_Runway_Months": 3.0,
                    "Supplier_Delay_Days": 2.0,
                    "Operational_Disruption_Flag": 0,
                    "Single_Supplier_Dependency_Pct": 30.0,
                    "Estimated_Input_Cost_Inflation_Pct": 4.0,
                    "Imported_Input_Dependency_Pct": 15.0,
                    "Overall_Risk_Label": "Low" if i < 20 else "High"
                })

        df_monthly = pd.DataFrame(records)
        df_bp = pd.DataFrame({
            "Business_ID": bids,
            "District": ["Colombo", "Kalutara"],
            "Business_Sector": ["Bakery", "Retail"],
            "Business_Stage": ["Growing", "Established"],
            "Business_Age_Years": [3, 5],
            "Available_Capital_LKR": [200000.0, 300000.0],
            "Employee_Count": [4, 6],
            "Monthly_Budget_LKR": [80000.0, 90000.0],
            "Initial_Investment_LKR": [150000.0, 200000.0],
            "Loan_Required": [0, 1],
            "Supplier_Count": [3, 4],
            "Customer_Concentration_Pct": [25.0, 30.0],
            "Imported_Input_Dependency_Pct": [10.0, 15.0]
        })

        tables = {
            "profile": df_bp,
            "monthly_financials": df_monthly[["Business_ID", "Month", "Revenue_LKR", "Operating_Expenses_LKR", "Operating_Profit_LKR", "Profit_Margin_Pct"]],
            "credit": df_monthly[["Business_ID", "Month", "Loan_Balance_LKR", "Payment_Delay_Days", "Missed_Payment_Flag", "Debt_to_Revenue_Ratio"]],
            "market": df_monthly[["Business_ID", "Month", "Sales_Growth_Pct", "Competitor_Pressure_Score_1_5", "Customer_Concentration_Pct"]],
            "liquidity": df_monthly[["Business_ID", "Month", "Cash_and_Cash_Equivalents_LKR", "Quick_Ratio", "Cash_Runway_Months"]],
            "operational": df_monthly[["Business_ID", "Month", "Supplier_Delay_Days", "Operational_Disruption_Flag", "Single_Supplier_Dependency_Pct"]],
            "inflation": df_monthly[["Business_ID", "Month", "Estimated_Input_Cost_Inflation_Pct", "Imported_Input_Dependency_Pct"]],
            "risk_assessment": df_monthly[["Business_ID", "Month", "Overall_Risk_Label"]]
        }

        prep = Component4RiskDataPipeline()
        node_df, target_series, _ = prep.extract_node_features(tables)

        # In strictly preceding window (Months 18 to 23), the last month is Month 23!
        # Month 23 Loan_Balance_LKR is 23,000. Month 24 was 24,000.
        # If Month 24 leaked, the feature value / fitted scaler mean would be 24,000.
        # With strict temporal separation, the unscaled value before standardization MUST be 23,000.0!
        loan_idx = prep.scaler.feature_names_in_.tolist().index("Recent_Loan_Balance_LKR")
        fitted_mean_loan = float(prep.scaler.mean_[loan_idx])
        self.assertEqual(fitted_mean_loan, 23000.0, f"Expected 23,000.0 (Month 23), got {fitted_mean_loan}. Month 24 leaked!")

        # Target label comes from Month 24
        self.assertEqual(target_series.loc["SME_TEST_01"], "High")

    # -------------------------------------------------------------------------
    # Case 17: Retrieval and Persistence Contract Accuracy
    # -------------------------------------------------------------------------
    def test_case_17_analysis_retrieval_contract_integrity(self):
        """Case 17: Verifies get_analysis_by_id endpoint returns consistent business_plan and plan_extraction."""
        # Run a test assessment
        payload = {
            "business_name": "Contract Integrity Test SME",
            "district": "Colombo",
            "completed_fields": {
                "outstanding_loan_balance": 150000.0,
                "monthly_loan_repayment": 15000.0,
                "overdue_repayments": "No",
                "monthly_sales_revenue": 300000.0,
                "monthly_fixed_costs": 75000.0,
            }
        }
        r_run = self.client.post("/api/component4/intake/submit-and-run", json=payload)
        self.assertEqual(r_run.status_code, 200)
        run_data = r_run.json()
        analysis_id = run_data["analysis_id"]

        # Fetch via GET /api/component4/analysis/{analysis_id}
        r_get = self.client.get(f"/api/component4/analysis/{analysis_id}")
        self.assertEqual(r_get.status_code, 200)
        retrieved = r_get.json()
        self.assertTrue(retrieved.get("success"))
        data = retrieved.get("data", {})

        self.assertIn("business_plan", data)
        self.assertIn("plan_extraction", data)
        self.assertIn("stage6_risk_assessment", data)
        self.assertIn("growth_readiness", data)
        self.assertEqual(data["business_plan"]["business_name"], "Contract Integrity Test SME")


if __name__ == "__main__":
    unittest.main()
