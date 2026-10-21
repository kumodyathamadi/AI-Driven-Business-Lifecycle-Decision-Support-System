"""
Component 4: Integrated Business Plan Risk Analysis, GNN Integration & Growth Recommendation Pipeline.
Orchestrates:
1. Ingestion: PDF, DOCX, TXT, JSON business plan extraction (Phase 2).
2. Entity Resolution & Relationships: Identification, verification, and zero fabricated edges (Phase 3 & 4).
3. Risk Assessment: Stage 6 deterministic multi-factor solvency, debt, concentration, and capacity scoring (Phase 6).
4. GNN Inference: Stage 7 PyTorch Geometric B2BRiskGNN graph-relational risk context (Phase 5).
5. Growth Readiness: Objective PROCEED / MODIFY / DELAY evaluation and risk-adjusted modification (Phase 8).
6. Mitigation Recommendation: Grounded, prioritized, actionable mitigation mapping (Phase 7).
7. Report Generation: Comprehensive markdown and structured JSON outputs (Phase 9 & 10).
"""

import os
import sys
import json
import uuid
import tempfile
from datetime import datetime
from dataclasses import dataclass, field, asdict
from typing import Dict, Any, List, Optional, Tuple, Union

# Ensure src is on sys.path
SRC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from component4.business_plan_ingestion import (
    BusinessPlanIngestionService,
    ExtractedBusinessPlan,
    WESTERN_PROVINCE_DISTRICTS
)
from component4.entity_resolution import (
    BusinessEntityResolver,
    ResolvedBusinessEntity,
    BusinessRelationshipEvidence
)
from component4.gnn_model import (
    GNNInferenceEngine,
    GNNInferenceResult
)
from component4.risk_assessment import (
    RiskAssessmentEngine,
    RiskAssessmentResult
)
from component4.growth_readiness import (
    GrowthReadinessEvaluator,
    GrowthReadinessEvaluation
)

DEFAULT_OUTPUT_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "reports", "component4", "analysis_runs")
)


@dataclass
class Component4AnalysisPipelineResult:
    """Full execution output of the Component 4 decision support pipeline."""
    analysis_id: str
    timestamp: str
    business_plan_filename: str
    plan_extraction: ExtractedBusinessPlan
    resolved_entity: ResolvedBusinessEntity
    stage6_risk_assessment: RiskAssessmentResult
    stage7_gnn_inference: GNNInferenceResult
    growth_readiness: GrowthReadinessEvaluation
    overall_summary: Dict[str, Any]
    markdown_report: str
    output_files: Dict[str, str] = field(default_factory=dict)

    @property
    def business_plan(self) -> ExtractedBusinessPlan:
        return self.plan_extraction

    def to_dict(self) -> Dict[str, Any]:
        return {
            "analysis_id": self.analysis_id,
            "timestamp": self.timestamp,
            "business_plan_filename": self.business_plan_filename,
            "business_plan": self.plan_extraction.to_dict(),
            "plan_extraction": self.plan_extraction.to_dict(),
            "resolved_entity": self.resolved_entity.to_dict(),
            "stage6_risk_assessment": self.stage6_risk_assessment.to_dict(),
            "stage7_gnn_inference": self.stage7_gnn_inference.to_dict(),
            "growth_readiness": self.growth_readiness.to_dict(),
            "overall_summary": self.overall_summary,
            "output_files": self.output_files
        }


class Component4Pipeline:
    """High-level pipeline coordinator for Component 4."""

    def __init__(
        self,
        output_base_dir: str = DEFAULT_OUTPUT_DIR,
        device: Optional[str] = None
    ):
        self.output_base_dir = output_base_dir
        os.makedirs(self.output_base_dir, exist_ok=True)

        self.ingestion_service = BusinessPlanIngestionService()
        self.entity_resolver = BusinessEntityResolver()
        self.risk_engine = RiskAssessmentEngine()
        self.gnn_engine = GNNInferenceEngine(device=device)
        self.readiness_evaluator = GrowthReadinessEvaluator()

    def run(
        self,
        business_plan_path: Optional[Union[str, Dict[str, Any], ExtractedBusinessPlan]] = None,
        confirmed_business_id: Optional[str] = None,
        user_intake_overrides: Optional[Dict[str, Any]] = None,
        user_declared_relationships: Optional[List[Dict[str, Any]]] = None,
        save_artifacts: bool = True,
        plan_source: Optional[Any] = None,
        intake_submission: Optional[Dict[str, Any]] = None
    ) -> Component4AnalysisPipelineResult:
        """Runs the complete end-to-end Component 4 risk and readiness pipeline."""
        target_source = plan_source if plan_source is not None else business_plan_path
        target_overrides = user_intake_overrides if user_intake_overrides is not None else intake_submission

        run_uuid = str(uuid.uuid4())[:8]
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        analysis_id = f"CMP4_{timestamp_str}_{run_uuid}"

        # 1. Ingestion & Structured Extraction
        temp_file_to_clean = None
        if isinstance(target_source, ExtractedBusinessPlan):
            plan = target_source
        elif isinstance(target_source, dict):
            with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as tf:
                json.dump(target_source, tf, indent=2)
                temp_file_to_clean = tf.name
            plan = self.ingestion_service.ingest_file(temp_file_to_clean)
            plan.source_filename = str(target_source.get("business_name") or "submitted_plan.json")
        elif isinstance(target_source, str):
            plan = self.ingestion_service.ingest_file(target_source)
        else:
            plan = ExtractedBusinessPlan(
                source_filename="unspecified",
                file_format=".json",
                evidence_sufficiency_status="INSUFFICIENT"
            )

        if temp_file_to_clean and os.path.exists(temp_file_to_clean):
            try:
                os.remove(temp_file_to_clean)
            except Exception:
                pass

        user_intake_overrides = target_overrides

        # 1b. Apply User Dynamic Intake Overrides (with USER_DECLARED / USER_CONFIRMED provenance)
        if user_intake_overrides:
            for key, val in user_intake_overrides.items():
                extracted_val = val["value"] if isinstance(val, dict) and "value" in val else val
                prov = val.get("provenance", "USER_CONFIRMED") if isinstance(val, dict) else "USER_CONFIRMED"
                if extracted_val not in (None, "", "Unknown", "Not available"):
                    if hasattr(plan, key):
                        setattr(plan, key, extracted_val)
                        plan.field_provenance[key] = prov
                        plan.provenance_notes.append(f"Field '{key}' supplied via dynamic intake ({prov}).")
                        if key in plan.missing_fields:
                            plan.missing_fields.remove(key)
                elif extracted_val is None or str(extracted_val).lower() in ("unknown", "not available"):
                    plan.field_provenance[key] = "UNKNOWN"

            # Post-process canonical attributes and aliases
            if plan.available_starting_capital_lkr is not None:
                plan.available_capital_lkr = plan.available_starting_capital_lkr
            if plan.outstanding_loan_balance_lkr is not None:
                plan.requested_loan_lkr = plan.outstanding_loan_balance_lkr
            if plan.fixed_monthly_costs_lkr is not None:
                plan.monthly_budget_lkr = plan.fixed_monthly_costs_lkr
            if plan.monthly_revenue_lkr is not None:
                plan.projected_revenue_lkr = plan.monthly_revenue_lkr

            if plan.repayment_delay_days is None and plan.repayment_overdue_status:
                s = str(plan.repayment_overdue_status).lower()
                if "30+" in s or "30 plus" in s:
                    plan.repayment_delay_days = 30.0
                elif "60+" in s:
                    plan.repayment_delay_days = 60.0
                elif "90+" in s:
                    plan.repayment_delay_days = 90.0
                elif "1-30" in s:
                    plan.repayment_delay_days = 15.0
                elif s in ("no", "current", "none", "0"):
                    plan.repayment_delay_days = 0.0

            # Re-evaluate evidence sufficiency status after intake completion
            req_missing = [k for k in plan.missing_fields if k in {"district", "available_capital_lkr", "monthly_budget_lkr"}]
            if len(req_missing) == 0:
                plan.evidence_sufficiency_status = "SUFFICIENT"
            elif len(req_missing) <= 2:
                plan.evidence_sufficiency_status = "PARTIAL"
            else:
                plan.evidence_sufficiency_status = "INSUFFICIENT"

        # 2. Entity Resolution & Relationship Retrieval
        resolved = self.entity_resolver.resolve(plan, confirmed_business_id=confirmed_business_id)

        # 2b. Incorporate User-Declared Relationships (explicitly non-fabricated, unverified)
        if user_declared_relationships:
            for rel_item in user_declared_relationships:
                p_name = rel_item.get("partner_name") or rel_item.get("partner_id") or "Declared Partner"
                p_type = str(rel_item.get("partner_type", "SUPPLIER")).upper()
                r_type = str(rel_item.get("relationship_type", "SUPPLIES")).upper()
                role = "SUPPLIER" if "SUPPLI" in r_type or p_type == "SUPPLIER" else (
                    "CUSTOMER" if "SELL" in r_type or p_type == "CUSTOMER" else (
                        "LENDER" if "BORROW" in r_type or p_type == "LENDER" else "PARTNER"
                    )
                )
                src = p_name if role == "SUPPLIER" else resolved.entity_id
                tgt = resolved.entity_id if role == "SUPPLIER" else p_name

                declared_rel = BusinessRelationshipEvidence(
                    source_id=src,
                    target_id=tgt,
                    relationship_type=r_type,
                    role=role,
                    partner_id=p_name,
                    transaction_value_lkr=float(rel_item.get("transaction_value_lkr", 0.0)) if rel_item.get("transaction_value_lkr") is not None else None,
                    dependency_percentage=float(rel_item.get("dependency_percentage", 0.0)) if rel_item.get("dependency_percentage") is not None else None,
                    payment_delay_days=float(rel_item.get("payment_delay_days", 0.0)) if rel_item.get("payment_delay_days") is not None else None,
                    relationship_duration_months=int(rel_item.get("relationship_duration_months", 0)) if rel_item.get("relationship_duration_months") is not None else None,
                    is_verified=False,
                    evidence_source="USER_DECLARED"
                )
                resolved.verified_relationships.append(declared_rel)

            resolved.unverified_relationships_count = len([r for r in resolved.verified_relationships if not r.is_verified])
            resolved.supplier_count = len([r for r in resolved.verified_relationships if r.role == "SUPPLIER"])
            resolved.customer_count = len([r for r in resolved.verified_relationships if r.role == "CUSTOMER"])
            resolved.lender_count = len([r for r in resolved.verified_relationships if r.role == "LENDER"])
            resolved.has_relationship_network = len(resolved.verified_relationships) > 0
            resolved.provenance_notes.append(f"Incorporated {len(user_declared_relationships)} user-declared unverified relationship(s).")

        # 3. Stage 6 Multi-Factor Deterministic Risk Assessment
        risk_input = self._build_risk_engine_input(plan, resolved)
        risk_result = self.risk_engine.assess_record(risk_input)

        # 4. Stage 7 GNN Graph-Relational Inference
        gnn_result = self.gnn_engine.infer(
            resolved,
            user_declared_relationships=user_declared_relationships,
            business_facts=risk_input
        )

        # 5. Growth Readiness Assessment & Strategy Adaptation
        readiness_result = self.readiness_evaluator.evaluate(plan, resolved, risk_result, gnn_result)

        # 6. Overall Executive Summary
        overall_summary = {
            "analysis_id": analysis_id,
            "business_name": resolved.business_name,
            "district": resolved.district,
            "province": resolved.province,
            "geographic_scope_status": resolved.geographic_scope_status,
            "data_origin": resolved.data_origin,
            "overall_risk_category": risk_result.overall_risk_category,
            "composite_risk_score": risk_result.composite_risk_score,
            "growth_readiness_decision": readiness_result.decision,
            "can_proceed_immediately": risk_result.can_proceed_immediately,
            "evidence_sufficiency": plan.evidence_sufficiency_status,
            "gnn_status": gnn_result.gnn_status,
            "gnn_risk_category": gnn_result.predicted_risk_category,
            "has_relationship_network": resolved.has_relationship_network,
            "verified_relationships_count": len(resolved.verified_relationships),
            "original_strategy": readiness_result.original_strategy,
            "risk_adjusted_recommendation": readiness_result.risk_adjusted_recommendation
        }

        # 7. Generate Comprehensive Markdown Report
        markdown_report = self._generate_markdown_report(
            analysis_id=analysis_id,
            plan=plan,
            resolved=resolved,
            risk_result=risk_result,
            gnn_result=gnn_result,
            readiness=readiness_result,
            overall_summary=overall_summary
        )

        if isinstance(target_source, str):
            bp_filename = os.path.basename(target_source)
        elif isinstance(target_source, dict):
            bp_filename = target_source.get("business_name", "submitted_business_plan.json")
        elif isinstance(target_source, ExtractedBusinessPlan):
            bp_filename = getattr(target_source, "source_filename", "extracted_plan.json")
        elif business_plan_path and isinstance(business_plan_path, str):
            bp_filename = os.path.basename(business_plan_path)
        else:
            bp_filename = getattr(plan, "source_filename", "unspecified_plan.json")

        output_files = {}
        if save_artifacts:
            run_dir = os.path.join(self.output_base_dir, analysis_id)
            os.makedirs(run_dir, exist_ok=True)

            # Save Markdown report
            md_path = os.path.join(run_dir, "analysis_report.md")
            with open(md_path, "w", encoding="utf-8") as f:
                f.write(markdown_report)
            output_files["markdown_report"] = md_path

            # Save JSON results
            pipeline_result_dict = {
                "analysis_id": analysis_id,
                "timestamp": timestamp_str,
                "business_plan_filename": bp_filename,
                "plan_extraction": plan.to_dict(),
                "resolved_entity": resolved.to_dict(),
                "stage6_risk_assessment": risk_result.to_dict(),
                "stage7_gnn_inference": gnn_result.to_dict(),
                "growth_readiness": readiness_result.to_dict(),
                "overall_summary": overall_summary
            }
            json_path = os.path.join(run_dir, "analysis_results.json")
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(pipeline_result_dict, f, indent=2)
            output_files["json_results"] = json_path

        return Component4AnalysisPipelineResult(
            analysis_id=analysis_id,
            timestamp=timestamp_str,
            business_plan_filename=bp_filename,
            plan_extraction=plan,
            resolved_entity=resolved,
            stage6_risk_assessment=risk_result,
            stage7_gnn_inference=gnn_result,
            growth_readiness=readiness_result,
            overall_summary=overall_summary,
            markdown_report=markdown_report,
            output_files=output_files
        )

    def _build_risk_engine_input(
        self,
        plan: ExtractedBusinessPlan,
        resolved: ResolvedBusinessEntity
    ) -> Dict[str, Any]:
        """Maps extracted plan and resolved relationship evidence into Stage 6 input dictionary."""
        # 1. Available liquid capital & cash reserves (distinguish starting capital from cash reserve)
        cap = (
            plan.current_cash_reserve_lkr
            if plan.current_cash_reserve_lkr is not None
            else (plan.available_capital_lkr if plan.available_capital_lkr is not None else plan.available_starting_capital_lkr)
        )
        if cap is None:
            cap = 0.0

        # 2. Debt & Repayment Obligations
        loan = (
            plan.outstanding_loan_balance_lkr
            if plan.outstanding_loan_balance_lkr is not None
            else (plan.requested_loan_lkr or plan.initial_financing_amount_lkr or 0.0)
        )
        monthly_repay = (
            plan.monthly_loan_repayment_lkr
            if plan.monthly_loan_repayment_lkr is not None
            else ((loan / 24.0) if loan > 0 else 0.0)
        )

        # 3. Delinquency / Overdue status
        delay_days = plan.repayment_delay_days
        if delay_days is None and plan.repayment_overdue_status:
            s = str(plan.repayment_overdue_status).lower()
            if "30+" in s or "30 plus" in s:
                delay_days = 30.0
            elif "60+" in s:
                delay_days = 60.0
            elif "90+" in s:
                delay_days = 90.0
            elif "1-30" in s:
                delay_days = 15.0
            elif s in ("no", "current", "none", "0"):
                delay_days = 0.0
            else:
                delay_days = 0.0
        if delay_days is None:
            delay_days = 0.0

        # 4. Operating costs & budget
        fixed_cost = plan.fixed_monthly_costs_lkr if plan.fixed_monthly_costs_lkr is not None else plan.monthly_budget_lkr
        var_cost = plan.variable_monthly_costs_lkr or 0.0
        has_stated_budget = (fixed_cost is not None or var_cost > 0)
        budget = (fixed_cost or 0.0) + (var_cost or 0.0) if has_stated_budget else None

        # 5. Revenue
        revenue = plan.monthly_revenue_lkr or plan.projected_revenue_lkr
        has_unverified_revenue = (revenue is None or revenue <= 0.0)

        # 6. Cash Burn & Runway
        monthly_burn = (monthly_repay or 0.0) + (budget or 0.0)
        if monthly_burn > 0:
            runway = cap / monthly_burn
        elif cap > 0:
            runway = 60.0
        else:
            runway = 0.0

        inv = plan.initial_inventory_cost_lkr or plan.required_investment_lkr or plan.proposed_growth_budget_lkr or 0.0
        post_cash = max(0.0, cap - inv)
        post_runway = (post_cash / monthly_burn) if monthly_burn > 0 else (60.0 if post_cash > 0 else 0.0)

        # Sync computed runway to plan for UI and reporting
        plan.capital_runway_months = round(runway, 2)

        # 7. Debt ratios
        debt_to_cap = (loan / cap) if cap > 0 else (999.0 if loan > 0 else 0.0)
        debt_service_to_cap = (monthly_repay / cap) if cap > 0 else (999.0 if monthly_repay > 0 else 0.0)

        if not has_unverified_revenue and revenue is not None and revenue > 0:
            debt_burden = monthly_repay / revenue
            dscr = (revenue - (budget or 0.0)) / max(1.0, monthly_repay) if monthly_repay > 0 else 3.0
            op_margin = (revenue - (budget or 0.0)) / revenue
        else:
            debt_burden = 1.0 if monthly_repay > 0 else 0.0
            dscr = 0.1 if monthly_repay > 0 else 3.0
            op_margin = 0.0

        # 8. Supplier & Customer Concentration
        if resolved.has_relationship_network:
            suppliers = [r for r in resolved.verified_relationships if r.role == "SUPPLIER"]
            customers = [r for r in resolved.verified_relationships if r.role == "CUSTOMER"]

            sup_shares = [r.dependency_percentage or 0.0 for r in suppliers]
            cus_shares = [r.dependency_percentage or 0.0 for r in customers]

            sup_hhi = sum((s / 100.0) ** 2 for s in sup_shares) if sup_shares else 0.20
            sup_cr1 = max(sup_shares) / 100.0 if sup_shares else 0.30
            cus_hhi = sum((c / 100.0) ** 2 for c in cus_shares) if cus_shares else 0.20
            cus_cr1 = max(cus_shares) / 100.0 if cus_shares else 0.30
            delays = [r.payment_delay_days for r in resolved.verified_relationships if r.payment_delay_days is not None]
            avg_delay = float(sum(delays) / max(1, len(delays))) if delays else 15.0
        else:
            sup_score = plan.supplier_availability_score or 3
            sup_hhi = max(0.1, 0.6 - (sup_score * 0.1))
            sup_cr1 = max(0.2, 0.7 - (sup_score * 0.1))
            cus_hhi = 0.25
            cus_cr1 = 0.35
            avg_delay = plan.supplier_delay_days if plan.supplier_delay_days is not None else 15.0

        inv_to_cash = (inv / max(1.0, cap)) if cap > 0 else 1.0
        cost_to_rev = ((budget or 0.0) * 0.1) / max(1.0, revenue or 1.0)
        avail_staff = plan.available_staff_count if plan.available_staff_count is not None else 1
        req_staff = plan.required_staff_count if plan.required_staff_count is not None else 0
        cap_gap = max(0.0, float(req_staff - avail_staff) / max(1.0, float(req_staff))) if req_staff > 0 else 0.0

        return {
            "action_id": f"ACT_{resolved.entity_id}",
            "business_id": resolved.entity_id,
            "variant": "BASELINE",
            "baseline_cash_runway_months": runway,
            "post_action_cash_runway_months": post_runway,
            "operating_margin_ratio": op_margin,
            "cash_reserves_latest_lkr": cap,
            "debt_service_burden_ratio": debt_burden,
            "debt_service_coverage_ratio": dscr,
            "outstanding_debt_latest_lkr": loan,
            "monthly_debt_repayment_lkr": monthly_repay,
            "Repayment_Delay_Days": delay_days,
            "repayment_delay_days": delay_days,
            "repayment_overdue_status": plan.repayment_overdue_status or ("30+ Days Overdue" if delay_days >= 30 else "Current"),
            "debt_to_capital_ratio": debt_to_cap,
            "debt_service_to_capital_ratio": debt_service_to_cap,
            "has_unverified_revenue": has_unverified_revenue,
            "monthly_revenue_lkr": revenue,
            "supplier_hhi": sup_hhi,
            "supplier_cr1_share": sup_cr1,
            "has_disrupted_supplier": 0,
            "supplier_count": resolved.supplier_count or 1,
            "customer_hhi": cus_hhi,
            "customer_cr1_share": cus_cr1,
            "counterparty_payment_delay_mean_days": avg_delay,
            "investment_to_cash_ratio": inv_to_cash,
            "cost_to_revenue_ratio": cost_to_rev,
            "capacity_gap": cap_gap,
            "staffing_growth_ratio": (req_staff / max(1, avail_staff)) if avail_staff > 0 else 1.0,
            "evidence_sufficiency": plan.evidence_sufficiency_status,
            "demand_evidence": plan.demand_evidence,
            "imported_materials_exposure": plan.imported_input_exposure,
            "supplier_delay_days": plan.supplier_delay_days or avg_delay,
            "debt_guarantees": plan.debt_guarantees_or_obligations
        }

    def _generate_markdown_report(
        self,
        analysis_id: str,
        plan: ExtractedBusinessPlan,
        resolved: ResolvedBusinessEntity,
        risk_result: RiskAssessmentResult,
        gnn_result: GNNInferenceResult,
        readiness: GrowthReadinessEvaluation,
        overall_summary: Dict[str, Any]
    ) -> str:
        """Constructs an explainable, auditable Markdown report."""
        lines = []
        lines.append(f"# 🛡️ Component 4 — Business Plan Risk & Growth Readiness Report")
        lines.append(f"**Analysis Identifier:** `{analysis_id}`  ")
        lines.append(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  ")
        lines.append(f"**Source Document:** `{plan.source_filename}` ({plan.file_format.upper()}, {plan.file_size_bytes} bytes)  ")
        lines.append(f"**Decision Support Prototype:** Research Prototype — Not an automated lending or approval authority.  \n")
        lines.append("---")

        # Executive Summary Box
        lines.append("## 1. Executive Summary")
        lines.append(f"| Evaluation Metric | Decision / Value | Interpretation |")
        lines.append(f"| :--- | :--- | :--- |")
        lines.append(f"| **Entity Name** | **{resolved.business_name}** | ID: `{resolved.entity_id}` ({resolved.data_origin}) |")
        lines.append(f"| **Geographic Scope** | **{resolved.district} District** | Western Province ({resolved.geographic_scope_status}) |")
        lines.append(f"| **Growth Readiness** | **{readiness.decision}** | {readiness.risk_adjusted_recommendation[:60]}... |")
        lines.append(f"| **Overall Risk Category** | **{risk_result.overall_risk_category}** | Composite Score: `{risk_result.composite_risk_score:.2f}` / 1.00 |")
        lines.append(f"| **GNN Relational Risk** | **{gnn_result.predicted_risk_category or 'N/A'}** | Status: `{gnn_result.gnn_status}` |")
        lines.append(f"| **Immediate Proceed** | **{'YES' if risk_result.can_proceed_immediately else 'NO'}** | Critical Red Flag: `{'YES' if risk_result.has_critical_red_flag else 'NO'}` |")
        lines.append(f"| **Evidence Sufficiency** | **{plan.evidence_sufficiency_status}** | Missing Fields: `{len(plan.missing_fields)}` |  \n")

        # Section 2: Business Plan Facts
        lines.append("## 2. Document Fact Extraction & Provenance")
        lines.append(f"- **Business Category:** {plan.business_category or 'Unspecified'}")
        lines.append(f"- **Lifecycle Stage:** {plan.business_stage or 'New'}")
        lines.append(f"- **Available Capital:** {plan.available_capital_lkr:,.2f} LKR" if plan.available_capital_lkr else "- **Available Capital:** Missing")
        lines.append(f"- **Monthly Operating Budget:** {plan.monthly_budget_lkr:,.2f} LKR" if plan.monthly_budget_lkr else "- **Monthly Operating Budget:** Missing")
        lines.append(f"- **Capital Runway:** {plan.capital_runway_months:.1f} months" if plan.capital_runway_months else "- **Capital Runway:** Estimated from budget")
        lines.append(f"- **Proposed Action:** {plan.proposed_growth_action or 'Start Enterprise'}")
        lines.append(f"- **Original Proposed Strategy (Component 1):** `{readiness.original_strategy}`")
        if plan.missing_fields:
            lines.append(f"- ⚠️ **Missing Information Disclosed:** {', '.join(plan.missing_fields)}")
        lines.append("")

        # Section 3: Verified Business Relationships & Graph Topology
        lines.append("## 3. Verified Business Relationships & Graph Topology")
        if resolved.has_relationship_network:
            lines.append(f"Connected to **{len(resolved.verified_relationships)} verified trade relationships**:")
            lines.append(f"- **Suppliers:** {resolved.supplier_count} verified partner(s)")
            lines.append(f"- **Customers:** {resolved.customer_count} verified buyer(s)")
            lines.append(f"- **Lenders / Financiers:** {resolved.lender_count} credit line(s)")
            lines.append(f"\n| Partner ID | Role | Relationship Type | Transaction Value (LKR) | Duration (Mos) | Disruption Status |")
            lines.append(f"| :--- | :--- | :--- | :--- | :--- | :--- |")
            for r in resolved.verified_relationships[:8]:
                val = f"{r.transaction_value_lkr:,.2f}" if r.transaction_value_lkr else "N/A"
                dur = f"{r.relationship_duration_months}m" if r.relationship_duration_months else "N/A"
                lines.append(f"| `{r.partner_id}` | {r.role} | {r.relationship_type} | {val} | {dur} | {r.disruption_status} |")
        else:
            lines.append("> [!NOTE]")
            lines.append("> **Zero Fabricated Edges Disclosure:** This entity has no verified transaction edges in the historical B2B database. ")
            lines.append("> In adherence to scientific integrity constraints, no synthetic relationships were created. ")
            lines.append("> Analysis is grounded directly in document financial facts and verified sector baselines.\n")

        # Section 4: Stage 6 Multi-Factor Risk Assessment
        lines.append("## 4. Stage 6 Multi-Factor Risk Breakdown")
        sub = risk_result.sub_scores
        lines.append(f"| Risk Dimension | Score (0-1) | Weight | Contribution | Risk Severity |")
        lines.append(f"| :--- | :---: | :---: | :---: | :--- |")
        lines.append(f"| Liquidity & Cash Runway | {sub['liquidity_risk']:.2f} | 30% | {sub['liquidity_risk']*0.30:.2f} | {'CRITICAL' if sub['liquidity_risk'] > 0.65 else ('MODERATE' if sub['liquidity_risk'] > 0.35 else 'LOW')} |")
        lines.append(f"| Debt Service Burden | {sub['debt_burden_risk']:.2f} | 20% | {sub['debt_burden_risk']*0.20:.2f} | {'CRITICAL' if sub['debt_burden_risk'] > 0.65 else ('MODERATE' if sub['debt_burden_risk'] > 0.35 else 'LOW')} |")
        lines.append(f"| Growth Action Stress | {sub['growth_action_stress']:.2f} | 25% | {sub['growth_action_stress']*0.25:.2f} | {'CRITICAL' if sub['growth_action_stress'] > 0.65 else ('MODERATE' if sub['growth_action_stress'] > 0.35 else 'LOW')} |")
        lines.append(f"| Supplier Concentration | {sub['supplier_concentration_risk']:.2f} | 15% | {sub['supplier_concentration_risk']*0.15:.2f} | {'CRITICAL' if sub['supplier_concentration_risk'] > 0.65 else ('MODERATE' if sub['supplier_concentration_risk'] > 0.35 else 'LOW')} |")
        lines.append(f"| Customer Concentration | {sub['customer_concentration_risk']:.2f} | 10% | {sub['customer_concentration_risk']*0.10:.2f} | {'CRITICAL' if sub['customer_concentration_risk'] > 0.65 else ('MODERATE' if sub['customer_concentration_risk'] > 0.35 else 'LOW')} |")
        lines.append(f"| **Composite Risk Indicator** | **{risk_result.composite_risk_score:.2f}** | **100%** | **{risk_result.composite_risk_score:.2f}** | **{risk_result.overall_risk_category}** |  \n")

        lines.append("### Primary Identified Risk Drivers:")
        if risk_result.primary_risk_drivers:
            for idx, driver in enumerate(risk_result.primary_risk_drivers, start=1):
                lines.append(f"{idx}. **[{driver['factor_code']}]** {driver['description']} (Severity: {driver.get('severity_score', 'N/A')})")
        else:
            lines.append("- No major risk trigger breached advisory thresholds.")
        lines.append("")

        # Section 5: Stage 7 GNN Relational Inference
        lines.append("## 5. Stage 7 Graph Neural Network (GNN) Inference")
        lines.append(f"- **GNN Model Architecture:** `{gnn_result.model_version}`")
        lines.append(f"- **Applicability Status:** `{gnn_result.gnn_status}`")
        if gnn_result.gnn_applicable:
            lines.append(f"- **Predicted Contextual Risk:** **{gnn_result.predicted_risk_category}**")
            lines.append(f"- **Graph Contextual Index:** `{gnn_result.graph_contextual_risk_score:.2f}`")
            lines.append(f"- **Class Distribution Probabilities:** `Low: {gnn_result.risk_probabilities.get('Low', 0):.1%}`, `Medium: {gnn_result.risk_probabilities.get('Medium', 0):.1%}`, `High: {gnn_result.risk_probabilities.get('High', 0):.1%}`")
            lines.append(f"- **Evaluated Ego Topology:** {gnn_result.node_count} nodes, {gnn_result.edge_count} edges")
        lines.append(f"- **Methodological Explanation:** {gnn_result.explanation}")
        lines.append(f"> [!IMPORTANT]\n> **Scientific Integrity Disclosure:** {gnn_result.methodology_disclosure}\n")

        # Section 6: Growth Readiness & Strategy Adaptation
        lines.append("## 6. Growth Readiness & Risk-Adjusted Strategy Adaptation")
        lines.append(f"### Decision: **{readiness.decision}**")
        lines.append(f"**Risk-Adjusted Recommendation:** {readiness.risk_adjusted_recommendation}\n")
        lines.append("#### Decision Rationales:")
        for r in readiness.decision_rationales:
            lines.append(f"- {r}")
        lines.append("\n#### Suggested Risk-Reducing Modifications (Retaining Original Plan):")
        for m in readiness.suggested_modifications:
            lines.append(f"- 💡 {m}")
        if readiness.missing_evidence_improvements:
            lines.append("\n#### Information That Would Improve Decision Confidence:")
            for imp in readiness.missing_evidence_improvements:
                lines.append(f"- 📋 {imp}")
        lines.append("")

        # Section 7: Actionable Mitigation Recommendations
        lines.append("## 7. Actionable Mitigation Roadmap")
        if risk_result.recommended_mitigations:
            lines.append(f"| Priority | Risk Factor | Proposed Action | Expected Risk Reduction | Horizon |")
            lines.append(f"| :---: | :--- | :--- | :--- | :---: |")
            for m in risk_result.recommended_mitigations:
                lines.append(f"| **{m.get('priority', 'MEDIUM')}** | `{m.get('factor_code', 'GENERAL')}` | {m.get('action', '')} | {m.get('rationale', '')} | {m.get('suggested_timeline', '0-3 months')} |")
        else:
            lines.append("- Standard periodic operational monitoring recommended.")

        lines.append("\n---\n*Report generated by Component 4 Decision Support System — AI-Driven Business Lifecycle System.*")
        return "\n".join(lines)
