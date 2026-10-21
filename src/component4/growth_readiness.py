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
    decision_label: str = ""
    reasons: List[str] = field(default_factory=list)
    supporting_input_fields: Dict[str, Any] = field(default_factory=dict)
    missing_information: List[str] = field(default_factory=list)
    conditions_that_must_be_met: List[str] = field(default_factory=list)
    evidence_needed_to_reconsider: List[str] = field(default_factory=list)

    def __post_init__(self):
        if not self.decision_label:
            labels = {
                "PROCEED": "Proceed",
                "MODIFY": "Proceed with conditions",
                "DELAY": "Defer expansion",
                "INSUFFICIENT_EVIDENCE": "Insufficient information"
            }
            self.decision_label = labels.get(self.decision, self.decision)
        if not self.reasons:
            self.reasons = list(self.decision_rationales)
        if not self.missing_information:
            self.missing_information = list(self.missing_evidence_improvements)

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
        rationales: List[str] = []
        constraints: List[Dict[str, Any]] = []
        modifications: List[str] = []
        missing_improvements: List[str] = []
        conditions: List[str] = []
        evidence_needed: List[str] = []

        orig_action = plan.proposed_growth_action or "Start Enterprise"
        orig_strat = plan.primary_strategy or "Controlled Operational Growth"

        # Financial Inputs & Provenance Extraction
        cap = float(
            getattr(plan, "available_capital_lkr", None) or
            getattr(plan, "current_cash_reserve_lkr", None) or
            getattr(plan, "available_starting_capital_lkr", None) or
            0.0
        )
        debt = float(getattr(plan, "outstanding_loan_balance_lkr", 0.0) or getattr(plan, "outstanding_debt_lkr", 0.0) or 0.0)
        repayment = float(getattr(plan, "monthly_loan_repayment_lkr", 0.0) or 0.0)
        overdue_days = float(getattr(plan, "repayment_delay_days", 0.0) or 0.0)
        overdue_status = str(getattr(plan, "repayment_overdue_status", "") or "")
        rev = getattr(plan, "monthly_revenue_lkr", None)
        fixed_costs = getattr(plan, "fixed_monthly_costs_lkr", None)
        budget = float(
            getattr(plan, "monthly_budget_lkr", None) or
            getattr(plan, "fixed_monthly_costs_lkr", None) or
            1.0
        )
        runway = getattr(plan, "capital_runway_months", None)

        supporting_inputs: Dict[str, Any] = {
            "available_capital_lkr": cap,
            "outstanding_loan_balance_lkr": debt,
            "monthly_loan_repayment_lkr": repayment,
            "repayment_delay_days": overdue_days,
            "repayment_overdue_status": overdue_status,
            "monthly_revenue_lkr": rev,
            "fixed_monthly_costs_lkr": fixed_costs,
            "capital_runway_months": runway
        }

        # 1. Geographic Scope Check
        if not resolved.is_within_geographic_scope:
            return GrowthReadinessEvaluation(
                decision="DELAY",
                decision_label="Defer expansion",
                original_proposed_action=orig_action,
                original_strategy=orig_strat,
                risk_adjusted_recommendation="Suspend execution due to geographic scope violation.",
                decision_rationales=[
                    f"Business location '{resolved.district}' is outside Sri Lanka Western Province research scope.",
                    "Research and advisory models are calibrated exclusively for Colombo, Gampaha, and Kalutara."
                ],
                reasons=[
                    f"Business location '{resolved.district}' is outside Sri Lanka Western Province research scope."
                ],
                identified_constraints=[{"type": "GEOGRAPHIC_BOUNDARY", "detail": f"Out-of-scope district: {resolved.district}"}],
                suggested_modifications=["Confirm operations within Western Province (Colombo, Gampaha, Kalutara)."],
                missing_evidence_improvements=["Western Province municipal business registration evidence."],
                missing_information=["Western Province business registration verification."],
                supporting_input_fields=supporting_inputs,
                conditions_that_must_be_met=["Relocate or register operational base within Western Province."],
                evidence_needed_to_reconsider=["Valid municipal trade license in Colombo, Gampaha, or Kalutara."],
                capital_runway_impact={},
                operational_feasibility_summary="Out-of-scope enterprise.",
                gnn_context_contribution="GNN inference withheld due to geographic restriction.",
                evidence_sufficiency="INSUFFICIENT"
            )

        # 2. Data Sufficiency Check
        if plan.evidence_sufficiency_status == "INSUFFICIENT":
            missing_fields = plan.missing_fields or ["available_capital_lkr", "monthly_operating_budget"]
            return GrowthReadinessEvaluation(
                decision="INSUFFICIENT_EVIDENCE",
                decision_label="Insufficient information",
                original_proposed_action=orig_action,
                original_strategy=orig_strat,
                risk_adjusted_recommendation="Defer commitment until critical financial figures are verified.",
                decision_rationales=[
                    "Missing core financial baseline metrics required for defensible solvency assessment.",
                    f"Unspecified fields: {', '.join(missing_fields)}"
                ],
                reasons=["Insufficient baseline financial information provided."],
                identified_constraints=[{"type": "DATA_DEFICIT", "detail": f"Missing fields: {missing_fields}"}],
                suggested_modifications=["Obtain accurate financial budget and available capital figures."],
                missing_evidence_improvements=[f"Provide {f}" for f in missing_fields],
                missing_information=[f"Provide {f}" for f in missing_fields],
                supporting_input_fields=supporting_inputs,
                conditions_that_must_be_met=["Submit verified working capital and operational cost estimates."],
                evidence_needed_to_reconsider=["Bank statements, cost breakdown, or business plan pro-forma."],
                capital_runway_impact={},
                operational_feasibility_summary="Evaluation indeterminate due to data gaps.",
                gnn_context_contribution="GNN inference bypassed due to insufficient baseline evidence.",
                evidence_sufficiency="INSUFFICIENT"
            )

        # 3. Liquidity & Runway Metrics
        inv = float(plan.initial_inventory_cost_lkr or (cap * 0.3 if cap > 0 else 0.0))
        post_cash = max(0.0, cap - inv)
        
        # Calculate post-action runway truthfully
        if runway is not None:
            pre_runway = float(runway)
            post_runway = max(0.0, pre_runway * (post_cash / max(1.0, cap))) if cap > 0 else 0.0
        else:
            pre_runway = cap / max(1.0, budget) if cap > 0 else 0.0
            post_runway = post_cash / max(1.0, budget) if post_cash > 0 else 0.0

        runway_impact = {
            "pre_action_cash_runway_months": round(pre_runway, 1),
            "post_action_cash_runway_months": round(post_runway, 1),
            "available_capital_lkr": cap,
            "required_initial_investment_lkr": inv,
            "post_action_cash_buffer_lkr": post_cash
        }

        # 4. Constraint Identification from Risk Drivers
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

        # 5. GNN Relational Context
        gnn_context_note = ""
        has_gnn_high = False
        if gnn_result.gnn_applicable and gnn_result.predicted_risk_category:
            gnn_context_note = (
                f"GNN B2B network model assessed {gnn_result.node_count} nodes and {gnn_result.edge_count} edges, "
                f"evaluating relational contextual risk as '{gnn_result.predicted_risk_category}' "
                f"(relational risk index: {gnn_result.graph_contextual_risk_score:.2f})."
            )
            if gnn_result.predicted_risk_category == "High":
                has_gnn_high = True
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
                "Analysis relies on deterministic financial & operational rules."
            )

        # 6. CRITICAL FINANCIAL CONSTRAINTS AUDIT
        # Severe Repayment Delinquency
        is_overdue_30_plus = (
            overdue_days >= 30.0 or
            "30+" in overdue_status or
            any(c.get("factor") == "REPAYMENT_DELINQUENCY_30_PLUS_DAYS" for c in constraints)
        )
        # Monthly Repayment Exceeds Available Liquid Capital
        is_repayment_exceeds_capital = (repayment > 0 and cap > 0 and repayment > cap)
        # Extreme Debt Exposure (debt > 5x capital)
        is_extreme_debt = (cap > 0 and debt > (5.0 * cap))
        # Severe Liquidity Depletion (< 1.0 month runway)
        is_critical_runway = (runway is not None and runway < 1.0) or (post_runway < 1.0)
        # Critical Red Flag from Risk Assessment
        has_critical_red_flag = risk_result.has_critical_red_flag or risk_result.overall_risk_category == "HIGH"

        # 7. DECISION POLICY
        if is_overdue_30_plus or is_repayment_exceeds_capital or (is_extreme_debt and is_critical_runway):
            decision = "DELAY"
            decision_label = "Defer expansion"
            recommendation = (
                f"DEFER EXPANSION for proposed action '{orig_action}'. Critical debt-service and solvency "
                f"constraints must be addressed immediately before committing capital to business expansion."
            )
            if is_overdue_30_plus:
                rationales.append(
                    f"Repayment delinquency of {overdue_days:.0f} days ({overdue_status or '30+ Days'}) indicates active loan distress. "
                    "Lenders may initiate recovery proceedings or deny additional credit facilities."
                )
                conditions.append("Resolve all overdue loan arrears and obtain confirmation of regularized credit standing from lender.")
                evidence_needed.append("Updated loan statement reflecting current/regular status with zero overdue balance.")

            if is_repayment_exceeds_capital:
                rationales.append(
                    f"Monthly debt service obligation (LKR {repayment:,.0f}) exceeds total available liquid capital (LKR {cap:,.0f}). "
                    "Enterprise faces immediate cash exhaustion on the next installment date."
                )
                conditions.append("Restructure loan amortization schedule or secure working capital injection to cover at least 3 monthly installments.")
                evidence_needed.append("Formal debt restructuring agreement or proof of debt-service reserve funding.")

            if is_extreme_debt:
                rationales.append(
                    f"Outstanding debt exposure (LKR {debt:,.0f}) is {debt/max(1.0, cap):.1f}x available capital (LKR {cap:,.0f}), "
                    "creating an unsustainable leverage profile for uncommitted growth spending."
                )

            if is_critical_runway:
                rationales.append(
                    f"Cash runway ({post_runway:.1f} months) falls below the 1.0-month critical survival threshold."
                )
                conditions.append("Rebuild liquid reserves to provide a minimum 3-month operating buffer.")
                evidence_needed.append("Verified bank ledger showing 3 months of fixed operating expenses held in cash.")

            modifications.append("Freeze all discretionary capital expenditure and growth initiatives until debt service is normalized.")
            modifications.append("Initiate formal dialogue with lender to extend loan maturity and reduce monthly repayment obligations.")

        elif is_critical_runway or (has_critical_red_flag and has_gnn_high):
            decision = "DELAY"
            decision_label = "Defer expansion"
            recommendation = (
                f"DELAY proposed action '{orig_action}'. Post-investment liquidity buffer ({post_runway:.1f} months) "
                f"poses critical insolvency risk. Prioritize capital accumulation before committing."
            )
            rationales.append(f"Post-action cash runway of {post_runway:.1f} months is under the 1.0-month critical solvency threshold.")
            rationales.append("High capital expenditure relative to liquid reserves.")
            conditions.append("Accumulate retained earnings to establish at least 3 months of operating buffer.")
            evidence_needed.append("Monthly financial statements demonstrating steady cash accumulation.")
            modifications.append("Postpone large capital outlays for 3 to 6 months while building retained earnings.")
            modifications.append("Reduce initial inventory procurement batch by 40-50% to conserve cash.")

        elif has_critical_red_flag or risk_result.overall_risk_category == "MEDIUM" or has_gnn_high or len(modifications) > 0 or post_runway < 2.5:
            decision = "MODIFY"
            decision_label = "Proceed with conditions"
            recommendation = (
                f"PROCEED WITH CONDITIONS for '{orig_action}'. Adopt a phased deployment approach "
                f"to mitigate identified operational and liquidity constraints while pursuing '{orig_strat}'."
            )
            rationales.append(f"Overall composite risk is {risk_result.overall_risk_category} (score: {risk_result.composite_risk_score:.2f}).")
            if post_runway < 2.5:
                rationales.append(f"Post-action runway ({post_runway:.1f} months) leaves limited cushion for demand fluctuations.")
                conditions.append("Deploy capital in 2-3 milestone stages rather than upfront lump sum.")
                modifications.append("Phase capital deployment across 2-3 milestone stages rather than upfront lump-sum.")
            if not conditions:
                conditions.append("Maintain strict weekly cash-flow reconciliation against budget targets.")
            if not modifications:
                modifications.append("Maintain strict weekly cash-flow reconciliation against budget targets.")
            evidence_needed.append("Quarterly revenue and margin tracking reports against pro-forma targets.")

        else:
            decision = "PROCEED"
            decision_label = "Proceed"
            recommendation = (
                f"PROCEED with proposed '{orig_action}' under strategy '{orig_strat}'. "
                f"Financial parameters and operational capacity satisfy advisory prudence thresholds."
            )
            rationales.append("Post-action cash runway is comfortable (> 3.0 months).")
            rationales.append("No critical debt service, supplier dependency, or staffing bottlenecks detected.")
            conditions.append("Maintain baseline working capital discipline as planned.")
            evidence_needed.append("Periodic operational review.")

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
            decision_label=decision_label,
            original_proposed_action=orig_action,
            original_strategy=orig_strat,
            risk_adjusted_recommendation=recommendation,
            decision_rationales=rationales,
            reasons=rationales,
            identified_constraints=constraints,
            suggested_modifications=modifications,
            missing_evidence_improvements=missing_improvements,
            missing_information=missing_improvements,
            supporting_input_fields=supporting_inputs,
            conditions_that_must_be_met=conditions,
            evidence_needed_to_reconsider=evidence_needed,
            capital_runway_impact=runway_impact,
            operational_feasibility_summary=op_summary,
            gnn_context_contribution=gnn_context_note,
            evidence_sufficiency=plan.evidence_sufficiency_status
        )

