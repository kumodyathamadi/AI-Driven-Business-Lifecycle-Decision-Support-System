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


if __name__ == "__main__":
    unittest.main()
