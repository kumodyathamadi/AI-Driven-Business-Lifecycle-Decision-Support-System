"""
Component 4: Phase 8 — Growth Readiness Assessment & Risk-Adjusted Strategy Adaptation.
Evaluates growth actions (start, expand, branch, new product, etc.) proposed in Component 1 business plans.
Integrates:
1. Stage 6 Deterministic Multi-Factor Risk Assessment
2. Stage 7 GNN Relational Risk Context
3. Financial Runway & Capital Stress Metrics
4. Operational & Staffing Constraints
5. Data Sufficiency & Evidence Limitations

Decisions:
- PROCEED: Low risk, healthy runway (>3m post-action), balanced capacity, manageable debt.
- MODIFY: Moderate risk, manageable bottleneck (e.g. phased capital deployment, staff hiring, supplier diversification).
- DELAY: Critical liquidity depletion (<1m runway), excessive debt service (>35%), or severe operational bottleneck.
- INSUFFICIENT_EVIDENCE: Crucial financial or geographic fields are missing.
"""

import os
import sys
from dataclasses import dataclass, field, asdict
from typing import Dict, Any, List, Optional, Tuple

SRC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from component4.business_plan_ingestion import ExtractedBusinessPlan
from component4.entity_resolution import ResolvedBusinessEntity
from component4.gnn_model import GNNInferenceResult
from component4.risk_assessment import RiskAssessmentResult


@dataclass
class GrowthReadinessEvaluation:
    """Comprehensive growth strategy evaluation and risk-adjusted adaptation."""
    decision: str                         # PROCEED, MODIFY, DELAY, INSUFFICIENT_EVIDENCE
    original_proposed_action: str
    original_strategy: str
    risk_adjusted_recommendation: str
    decision_rationales: List[str]
    identified_constraints: List[Dict[str, Any]]
    suggested_modifications: List[str]
    missing_evidence_improvements: List[str]
    capital_runway_impact: Dict[str, Any]
    operational_feasibility_summary: str
    gnn_context_contribution: str
    evidence_sufficiency: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class GrowthReadinessEvaluator:
    """Evaluates readiness and formulates risk-reducing modifications without duplicating Component 1."""

    def evaluate(
        self,
        plan: ExtractedBusinessPlan,
        resolved: ResolvedBusinessEntity,
        risk_result: RiskAssessmentResult,
        gnn_result: GNNInferenceResult
    ) -> GrowthReadinessEvaluation:
        rationales = []
        constraints = []
        modifications = []
        missing_improvements = []

        # 1. Check Data Sufficiency & Geographic Scope
        if not resolved.is_within_geographic_scope:
            return GrowthReadinessEvaluation(
                decision="DELAY",
                original_proposed_action=plan.proposed_growth_action or "Start Enterprise",
                original_strategy=plan.primary_strategy or "Standard Growth",
                risk_adjusted_recommendation="Suspend execution due to geographic scope violation.",
                decision_rationales=[
                    f"Business location '{resolved.district}' is outside Sri Lanka Western Province research scope.",
                    "Research and advisory models are calibrated exclusively for Colombo, Gampaha, and Kalutara."
                ],
                identified_constraints=[{"type": "GEOGRAPHIC_BOUNDARY", "detail": f"Out-of-scope district: {resolved.district}"}],
                suggested_modifications=["Confirm operations within Western Province (Colombo, Gampaha, Kalutara)."],
                missing_evidence_improvements=["Western Province municipal business registration evidence."],
                capital_runway_impact={},
                operational_feasibility_summary="Out-of-scope enterprise.",
                gnn_context_contribution="GNN inference withheld due to geographic restriction.",
                evidence_sufficiency="INSUFFICIENT"
            )

        if plan.evidence_sufficiency_status == "INSUFFICIENT":
            return GrowthReadinessEvaluation(
                decision="INSUFFICIENT_EVIDENCE",
                original_proposed_action=plan.proposed_growth_action or "Start Enterprise",
                original_strategy=plan.primary_strategy or "Standard Growth",
                risk_adjusted_recommendation="Defer commitment until critical financial figures are verified.",
                decision_rationales=[
                    "Missing core financial baseline metrics required for defensible solvency assessment.",
                    f"Unspecified fields: {', '.join(plan.missing_fields)}"
                ],
                identified_constraints=[{"type": "DATA_DEFICIT", "detail": f"Missing fields: {plan.missing_fields}"}],
                suggested_modifications=["Obtain accurate financial budget and available capital figures."],
                missing_evidence_improvements=[f"Provide {f}" for f in plan.missing_fields],
                capital_runway_impact={},
                operational_feasibility_summary="Evaluation indeterminate due to data gaps.",
                gnn_context_contribution="GNN inference bypassed due to insufficient baseline evidence.",
                evidence_sufficiency="INSUFFICIENT"
            )

        # 2. Financial Metrics Analysis
        cap = plan.available_capital_lkr or 0.0
        budget = plan.monthly_budget_lkr or 1.0
        runway = plan.capital_runway_months or (cap / max(1.0, budget))
        inv = plan.initial_inventory_cost_lkr or (cap * 0.3)
        inv_ratio = inv / max(1.0, cap)

        # Post-action runway approximation
        post_cash = max(0.0, cap - inv)
        post_runway = post_cash / max(1.0, budget)

        runway_impact = {
            "pre_action_cash_runway_months": round(runway, 1),
            "post_action_cash_runway_months": round(post_runway, 1),
            "available_capital_lkr": cap,
            "required_initial_investment_lkr": inv,
            "post_action_cash_buffer_lkr": post_cash
        }

        # 3. Constraint Identification from Risk Drivers
        for driver in risk_result.primary_risk_drivers:
            constraints.append({
                "factor": driver.get("factor_code"),
                "severity": driver.get("severity_score"),
                "description": driver.get("description"),
                "threshold": driver.get("threshold"),
                "observed": driver.get("observed_value")
            })

        # Operational Staffing Check
        avail_staff = plan.available_staff_count if plan.available_staff_count is not None else 1
        req_staff = plan.required_staff_count if plan.required_staff_count is not None else 0
        if req_staff > avail_staff:
            gap = req_staff - avail_staff
            constraints.append({
                "factor": "STAFFING_CAPACITY_DEFICIT",
                "severity": 0.65,
                "description": f"Staffing deficit: requires {req_staff} personnel but only {avail_staff} available (gap: {gap} staff).",
                "threshold": avail_staff,
                "observed": req_staff
            })
            modifications.append(f"Recruit or cross-train {gap} additional staff member(s) before launching the proposed action.")

        # Supplier Logistics Check
        sup_score = plan.supplier_availability_score if plan.supplier_availability_score is not None else 3
        if sup_score <= 2:
            constraints.append({
                "factor": "SUPPLIER_ACCESSIBILITY_LIMITATION",
                "severity": 0.60,
                "description": f"Low supplier availability score ({sup_score}/5) in {plan.district}.",
                "threshold": 3,
                "observed": sup_score
            })
            modifications.append("Establish credit agreements with at least two alternative regional suppliers.")

        # 4. Integrate GNN Context
        gnn_context_note = ""
        if gnn_result.gnn_applicable and gnn_result.predicted_risk_category:
            gnn_context_note = (
                f"GNN B2B network model assessed {gnn_result.node_count} nodes and {gnn_result.edge_count} edges, "
                f"evaluating relational contextual risk as '{gnn_result.predicted_risk_category}' "
                f"(relational risk index: {gnn_result.graph_contextual_risk_score:.2f})."
            )
            if gnn_result.predicted_risk_category == "High":
                constraints.append({
                    "factor": "GNN_RELATIONAL_CONTAGION_RISK",
                    "severity": 0.80,
                    "description": "Graph topology exhibits elevated trade counterparty credit or delivery delays.",
                    "threshold": 0.50,
                    "observed": gnn_result.graph_contextual_risk_score
                })
                modifications.append("Tighten counterparty credit limits and negotiate shorter payment terms (<= 15 days).")
        else:
            gnn_context_note = (
                "Standalone entity without verified B2B relationship edges. "
                "Analysis relies on Stage 6 deterministic financial & operational rules."
            )

        # 5. Determine Overall Growth Decision
        is_high_risk = risk_result.overall_risk_category == "HIGH" or risk_result.has_critical_red_flag
        is_med_risk = risk_result.overall_risk_category == "MEDIUM" or len(constraints) > 0
        has_gnn_high = gnn_result.gnn_applicable and gnn_result.predicted_risk_category == "High"

        orig_action = plan.proposed_growth_action or "Start Enterprise"
        orig_strat = plan.primary_strategy or "Controlled Operational Growth"

        if post_runway < 1.0 or (is_high_risk and has_gnn_high):
            decision = "DELAY"
            recommendation = (
                f"DELAY proposed action '{orig_action}'. Post-investment liquidity buffer ({post_runway:.1f} months) "
                f"poses critical insolvency risk. Prioritize capital accumulation before committing."
            )
            rationales.append(f"Post-action cash runway of {post_runway:.1f} months is under the 1.0-month critical solvency threshold.")
            rationales.append("High capital expenditure relative to liquid reserves.")
            modifications.append("Postpone large capital outlays for 3 to 6 months while building retained earnings.")
            modifications.append("Reduce initial inventory procurement batch by 40-50% to conserve cash.")
        elif is_high_risk or is_med_risk or has_gnn_high or len(modifications) > 0:
            decision = "MODIFY"
            recommendation = (
                f"PROCEED WITH MODIFICATION for '{orig_action}'. Adopt a phased deployment approach "
                f"to mitigate identified operational and liquidity constraints while pursuing '{orig_strat}'."
            )
            rationales.append(f"Overall composite risk is {risk_result.overall_risk_category} (score: {risk_result.composite_risk_score:.2f}).")
            if post_runway < 2.5:
                rationales.append(f"Post-action runway ({post_runway:.1f} months) leaves limited cushion for demand fluctuations.")
                modifications.append("Phase capital deployment across 2-3 milestone stages rather than upfront lump-sum.")
            if not modifications:
                modifications.append("Maintain strict weekly cash-flow reconciliation against budget targets.")
        else:
            decision = "PROCEED"
            recommendation = (
                f"PROCEED with proposed '{orig_action}' under strategy '{orig_strat}'. "
                f"Financial parameters and operational capacity satisfy advisory prudence thresholds."
            )
            rationales.append("Post-action cash runway is comfortable (> 3.0 months).")
            rationales.append("No critical debt service, supplier dependency, or staffing bottlenecks detected.")

        # Identify missing evidence that would improve the decision
        if not resolved.has_relationship_network:
            missing_improvements.append("Verified customer contracts or trade invoices to validate demand stability.")
            missing_improvements.append("Formal supplier price quotation agreements to hedge against cost inflation.")
        if plan.requested_loan_lkr and plan.requested_loan_lkr > 0:
            missing_improvements.append("Formal loan term sheet (interest rate, tenor, amortization schedule).")

        op_summary = (
            f"Business operating in {plan.district} ({plan.business_category}, {plan.business_stage or 'New'}). "
            f"Available staff: {avail_staff}, equipment score: {plan.available_equipment_score or 'N/A'}/5."
        )

        return GrowthReadinessEvaluation(
            decision=decision,
            original_proposed_action=orig_action,
            original_strategy=orig_strat,
            risk_adjusted_recommendation=recommendation,
            decision_rationales=rationales,
            identified_constraints=constraints,
            suggested_modifications=modifications,
            missing_evidence_improvements=missing_improvements,
            capital_runway_impact=runway_impact,
            operational_feasibility_summary=op_summary,
            gnn_context_contribution=gnn_context_note,
            evidence_sufficiency=plan.evidence_sufficiency_status
        )
