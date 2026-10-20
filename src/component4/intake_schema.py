"""
Component 4: Phase 2 & 3 — Dynamic Schema-Driven Intake & Provenance Management.
Provides:
1. Complete Five-Dimension Risk Assessment Requirement Schema:
   - Credit Risk (loan balance, installment, interest rate, payment delay, arrears)
   - Market Risk (sales growth, demand index, competitor pressure, customer concentration)
   - Inflation Risk (expected cost increases, imported input dependency, price adjustment power)
   - Liquidity Risk (available liquid cash, monthly budget, receivables, payables, cash runway)
   - Operational Risk (critical suppliers, single supplier dependency, inventory coverage, delivery delay, staffing)
2. Missing Information Detection: Compares extracted business plan facts against required fields.
3. Provenance Tagging: EXTRACTED_FROM_PLAN, USER_DECLARED, INDEPENDENTLY_VERIFIED, SIMULATED.
4. Validation & Safeguards: Handles "Unknown" and "Not available", validates numeric & logical constraints,
   ensuring unknown values are never automatically treated as low risk or independently verified.
"""

import os
import sys
from datetime import datetime, timezone
from dataclasses import dataclass, field, asdict
from typing import Dict, Any, List, Optional, Tuple, Union

WESTERN_PROVINCE_DISTRICTS = {"Colombo", "Gampaha", "Kalutara"}

PROVENANCE_EXTRACTED = "EXTRACTED_FROM_PLAN"
PROVENANCE_USER_DECLARED = "USER_DECLARED"
PROVENANCE_INDEPENDENTLY_VERIFIED = "INDEPENDENTLY_VERIFIED"
PROVENANCE_SIMULATED = "SIMULATED_SCENARIO"


@dataclass
class IntakeFieldMeta:
    """Schema definition for an intake field required or recommended for risk assessment."""
    field_key: str
    label: str
    category: str        # identity, credit_risk, market_risk, inflation_risk, liquidity_risk, operational_risk, growth_action
    data_type: str       # number, text, select, boolean
    required_for_full_readiness: bool
    description: str
    unit: Optional[str] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    options: Optional[List[str]] = None
    default_if_unknown: Optional[Any] = None
    risk_implication_if_missing: str = "Increases uncertainty penalty in composite risk evaluation."


MASTER_INTAKE_SCHEMA: Dict[str, IntakeFieldMeta] = {
    # -----------------------------------------------------------------------
    # 1. Identity & Scope
    # -----------------------------------------------------------------------
    "business_name": IntakeFieldMeta(
        field_key="business_name",
        label="Business Name",
        category="identity",
        data_type="text",
        required_for_full_readiness=True,
        description="Official registered name or proposed trading name."
    ),
    "registration_number": IntakeFieldMeta(
        field_key="registration_number",
        label="Business Registration Number (BRN / TIN)",
        category="identity",
        data_type="text",
        required_for_full_readiness=False,
        description="Official municipal registration or tax identifier if available."
    ),
    "district": IntakeFieldMeta(
        field_key="district",
        label="District",
        category="identity",
        data_type="select",
        required_for_full_readiness=True,
        description="Must be located within Sri Lanka Western Province (Colombo, Gampaha, Kalutara).",
        options=["Colombo", "Gampaha", "Kalutara"],
        risk_implication_if_missing="Non-Western Province entities are quarantined as OUT_OF_SCOPE."
    ),
    "business_category": IntakeFieldMeta(
        field_key="business_category",
        label="Business Sector / Industry Category",
        category="identity",
        data_type="select",
        required_for_full_readiness=True,
        description="Primary commercial activity sector.",
        options=[
            "Grocery/Mini-Mart", "Bakery", "Restaurant", "Retail", "Wholesale",
            "Manufacturing", "Transport and Logistics", "Food and Beverage",
            "Information Technology", "Construction", "Professional Services",
            "Tourism and Hospitality"
        ]
    ),
    "business_stage": IntakeFieldMeta(
        field_key="business_stage",
        label="Lifecycle Stage",
        category="identity",
        data_type="select",
        required_for_full_readiness=True,
        description="Current organizational development stage.",
        options=["New", "Early-stage", "Growth-stage", "Established"]
    ),

    # -----------------------------------------------------------------------
    # 2. Credit Risk Dimension
    # -----------------------------------------------------------------------
    "outstanding_debt_lkr": IntakeFieldMeta(
        field_key="outstanding_debt_lkr",
        label="Outstanding Loan Balance",
        category="credit_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Current principal balance of commercial bank loans or institutional debt.",
        unit="LKR",
        min_value=0.0,
        default_if_unknown=0.0,
        risk_implication_if_missing="Assumed zero outstanding commercial debt if unstated."
    ),
    "monthly_debt_repayment_lkr": IntakeFieldMeta(
        field_key="monthly_debt_repayment_lkr",
        label="Monthly Debt Repayment Installment",
        category="credit_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Monthly principal and interest payment due to lenders.",
        unit="LKR",
        min_value=0.0,
        default_if_unknown=0.0
    ),
    "annual_interest_rate_pct": IntakeFieldMeta(
        field_key="annual_interest_rate_pct",
        label="Annual Interest Rate (%)",
        category="credit_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Annual borrowing interest rate percentage.",
        unit="%",
        min_value=0.0,
        max_value=60.0,
        default_if_unknown=14.0
    ),
    "payment_delay_days": IntakeFieldMeta(
        field_key="payment_delay_days",
        label="Recent Repayment Delays / Arrears (Days)",
        category="credit_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Days past due on recent loan payments or trade obligations.",
        unit="Days",
        min_value=0.0,
        max_value=180.0,
        default_if_unknown=0.0
    ),

    # -----------------------------------------------------------------------
    # 3. Market Risk Dimension
    # -----------------------------------------------------------------------
    "monthly_revenue_lkr": IntakeFieldMeta(
        field_key="monthly_revenue_lkr",
        label="Current / Projected Monthly Revenue",
        category="market_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Monthly gross revenue from sales or operations.",
        unit="LKR",
        min_value=0.0
    ),
    "sales_growth_pct": IntakeFieldMeta(
        field_key="sales_growth_pct",
        label="Recent Sales Growth Trend (%)",
        category="market_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Observed or recent quarter-on-quarter sales revenue growth.",
        unit="%",
        min_value=-100.0,
        max_value=200.0,
        default_if_unknown=0.0
    ),
    "customer_concentration_pct": IntakeFieldMeta(
        field_key="customer_concentration_pct",
        label="Top-3 Customer Revenue Share (%)",
        category="market_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Percentage of sales revenue derived from the top 3 customers.",
        unit="%",
        min_value=0.0,
        max_value=100.0,
        default_if_unknown=35.0
    ),
    "competition_level": IntakeFieldMeta(
        field_key="competition_level",
        label="Market Competition & Price Pressure",
        category="market_risk",
        data_type="select",
        required_for_full_readiness=False,
        description="Intensity of competitor pricing and local substitutes.",
        options=["Low", "Medium", "High", "Unknown"],
        default_if_unknown="Medium"
    ),

    # -----------------------------------------------------------------------
    # 4. Inflation Risk Dimension
    # -----------------------------------------------------------------------
    "expected_cost_increase_pct": IntakeFieldMeta(
        field_key="expected_cost_increase_pct",
        label="Expected Input Cost Inflation (%)",
        category="inflation_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Anticipated 12-month percentage increase in key raw material, energy, and labor costs.",
        unit="%",
        min_value=0.0,
        max_value=100.0,
        default_if_unknown=6.0
    ),
    "imported_input_dependency_pct": IntakeFieldMeta(
        field_key="imported_input_dependency_pct",
        label="Imported Input / Fuel Dependency (%)",
        category="inflation_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Share of raw materials, fuel, or merchandise that depends on foreign imports or exchange rates.",
        unit="%",
        min_value=0.0,
        max_value=100.0,
        default_if_unknown=40.0
    ),
    "price_adjustment_ability": IntakeFieldMeta(
        field_key="price_adjustment_ability",
        label="Ability to Pass Cost Increases to Customers",
        category="inflation_risk",
        data_type="select",
        required_for_full_readiness=False,
        description="Pricing power to adjust end-user prices when costs rise.",
        options=["Full Cost Passthrough", "Partial Passthrough (Moderate)", "Inelastic / Fixed Prices (Low)", "Unknown"],
        default_if_unknown="Partial Passthrough (Moderate)"
    ),

    # -----------------------------------------------------------------------
    # 5. Liquidity Risk Dimension
    # -----------------------------------------------------------------------
    "available_capital_lkr": IntakeFieldMeta(
        field_key="available_capital_lkr",
        label="Current Liquid Cash / Capital Reserves",
        category="liquidity_risk",
        data_type="number",
        required_for_full_readiness=True,
        description="Immediately accessible liquid funds in bank accounts or cash.",
        unit="LKR",
        min_value=0.0,
        risk_implication_if_missing="Crucial baseline: Cannot verify liquidity buffer or runway without liquid capital."
    ),
    "monthly_budget_lkr": IntakeFieldMeta(
        field_key="monthly_budget_lkr",
        label="Monthly Operating Overhead / Budget",
        category="liquidity_risk",
        data_type="number",
        required_for_full_readiness=True,
        description="Total recurring monthly operating expenses, salaries, rent, and utility costs.",
        unit="LKR",
        min_value=1000.0,
        risk_implication_if_missing="Cannot calculate burn rate without monthly operating overhead."
    ),
    "accounts_receivable_lkr": IntakeFieldMeta(
        field_key="accounts_receivable_lkr",
        label="Outstanding Accounts Receivable",
        category="liquidity_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Total uncollected customer invoices currently due.",
        unit="LKR",
        min_value=0.0,
        default_if_unknown=0.0
    ),
    "accounts_payable_lkr": IntakeFieldMeta(
        field_key="accounts_payable_lkr",
        label="Outstanding Accounts Payable",
        category="liquidity_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Total pending payments due to suppliers or vendors.",
        unit="LKR",
        min_value=0.0,
        default_if_unknown=0.0
    ),
    "capital_runway_months": IntakeFieldMeta(
        field_key="capital_runway_months",
        label="Estimated Cash Runway",
        category="liquidity_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Months enterprise can operate before exhausting available cash buffer.",
        unit="Months",
        min_value=0.0,
        max_value=60.0
    ),

    # -----------------------------------------------------------------------
    # 6. Operational Risk Dimension
    # -----------------------------------------------------------------------
    "available_staff_count": IntakeFieldMeta(
        field_key="available_staff_count",
        label="Current Staff Headcount",
        category="operational_risk",
        data_type="number",
        required_for_full_readiness=True,
        description="Number of current dedicated full-time and part-time workers.",
        unit="Personnel",
        min_value=0.0,
        max_value=500.0
    ),
    "supplier_count": IntakeFieldMeta(
        field_key="supplier_count",
        label="Active Suppliers Count",
        category="operational_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Number of regular external vendors and suppliers.",
        unit="Vendors",
        min_value=0.0,
        max_value=100.0,
        default_if_unknown=3.0
    ),
    "single_supplier_dependency_pct": IntakeFieldMeta(
        field_key="single_supplier_dependency_pct",
        label="Single Primary Supplier Dependency (%)",
        category="operational_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Percentage of total raw materials purchased from the single largest supplier.",
        unit="%",
        min_value=0.0,
        max_value=100.0,
        default_if_unknown=50.0
    ),
    "supplier_delay_days": IntakeFieldMeta(
        field_key="supplier_delay_days",
        label="Average Supplier Delivery Delay (Days)",
        category="operational_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Average delivery lag experienced on critical purchase orders.",
        unit="Days",
        min_value=0.0,
        max_value=90.0,
        default_if_unknown=5.0
    ),
    "inventory_days": IntakeFieldMeta(
        field_key="inventory_days",
        label="Inventory Holding Buffer (Days)",
        category="operational_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Average inventory stock buffer held to absorb supply interruptions.",
        unit="Days",
        min_value=0.0,
        max_value=180.0,
        default_if_unknown=15.0
    ),
    "operational_constraints": IntakeFieldMeta(
        field_key="operational_constraints",
        label="Primary Operational Bottleneck",
        category="operational_risk",
        data_type="select",
        required_for_full_readiness=False,
        description="Key capacity or operational constraint limiting current output.",
        options=["None", "Specialized Equipment Bottleneck", "Storage / Warehouse Space", "Staff Skill Shortage", "Transport & Delivery Delay", "Unknown"],
        default_if_unknown="None"
    ),

    # -----------------------------------------------------------------------
    # 7. Proposed Growth Action
    # -----------------------------------------------------------------------
    "proposed_growth_action": IntakeFieldMeta(
        field_key="proposed_growth_action",
        label="Proposed Growth Action",
        category="growth_action",
        data_type="select",
        required_for_full_readiness=True,
        description="Proposed business lifecycle action to be risk-assessed.",
        options=["start", "expand", "Open Branch", "Increase Inventory", "Add Alternative Supplier", "Procure Machinery", "Digital Platform Launch", "Unknown"]
    ),
    "required_investment_lkr": IntakeFieldMeta(
        field_key="required_investment_lkr",
        label="Estimated Growth Investment Outlay",
        category="growth_action",
        data_type="number",
        required_for_full_readiness=True,
        description="Upfront capital outlay required to implement the proposed action.",
        unit="LKR",
        min_value=0.0,
        risk_implication_if_missing="Post-action runway cannot be computed without upfront capital outlay."
    ),
    "additional_monthly_cost_lkr": IntakeFieldMeta(
        field_key="additional_monthly_cost_lkr",
        label="Additional Recurring Monthly Cost",
        category="growth_action",
        data_type="number",
        required_for_full_readiness=False,
        description="New recurring monthly expenses added after implementing the growth action.",
        unit="LKR",
        min_value=0.0,
        default_if_unknown=0.0
    ),
    "required_staff_count": IntakeFieldMeta(
        field_key="required_staff_count",
        label="Additional Staff Headcount Needed",
        category="growth_action",
        data_type="number",
        required_for_full_readiness=False,
        description="New workers needed to implement the proposed action.",
        unit="Personnel",
        min_value=0.0,
        max_value=100.0,
        default_if_unknown=0.0
    ),
}


@dataclass
class ProvenanceFact:
    """Represents a discrete verified or declared fact with explicit provenance tracking."""
    field_key: str
    value: Any
    provenance: str       # EXTRACTED_FROM_PLAN, USER_DECLARED, INDEPENDENTLY_VERIFIED, SIMULATED
    status: str           # VERIFIED, USER_PROVIDED, MISSING, UNKNOWN
    recorded_at: str      # ISO timestamp
    source_reference: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class DynamicIntakeSchemaService:
    """Compares extracted plan facts against the 5-dimension risk schema and builds a dynamic intake form."""

    @staticmethod
    def analyze_missing_fields(
        extracted_facts: Dict[str, Any],
        existing_profile: Optional[Dict[str, Any]] = None
    ) -> Tuple[Dict[str, ProvenanceFact], List[Dict[str, Any]], str]:
        now_iso = datetime.now(timezone.utc).isoformat()
        available_facts: Dict[str, ProvenanceFact] = {}
        missing_form_schema: List[Dict[str, Any]] = []

        combined_source = {}
        if existing_profile:
            combined_source.update(existing_profile)
        if extracted_facts:
            combined_source.update(extracted_facts)

        missing_required_count = 0

        for key, meta in MASTER_INTAKE_SCHEMA.items():
            raw_entry = combined_source.get(key)
            if isinstance(raw_entry, dict) and "value" in raw_entry:
                val = raw_entry["value"]
                entry_prov = raw_entry.get("provenance")
                entry_stat = raw_entry.get("status")
            else:
                val = raw_entry
                entry_prov = None
                entry_stat = None
            
            has_val = val is not None and val != "" and val != "Unknown" and val != "Not available" and val != "N/A"

            if has_val:
                provenance = entry_prov or (PROVENANCE_EXTRACTED if key in extracted_facts else PROVENANCE_USER_DECLARED)
                status = entry_stat or ("VERIFIED" if provenance == PROVENANCE_INDEPENDENTLY_VERIFIED else "USER_PROVIDED")
                available_facts[key] = ProvenanceFact(
                    field_key=key,
                    value=val,
                    provenance=provenance,
                    status=status,
                    recorded_at=now_iso,
                    source_reference="Business Plan Document" if provenance == PROVENANCE_EXTRACTED else "Database Profile"
                )
            else:
                if meta.required_for_full_readiness:
                    missing_required_count += 1

                missing_form_schema.append({
                    "field_key": meta.field_key,
                    "label": meta.label,
                    "category": meta.category,
                    "data_type": meta.data_type,
                    "required_for_full_readiness": meta.required_for_full_readiness,
                    "description": meta.description,
                    "unit": meta.unit,
                    "min_value": meta.min_value,
                    "max_value": meta.max_value,
                    "options": meta.options,
                    "default_if_unknown": meta.default_if_unknown,
                    "risk_implication_if_missing": meta.risk_implication_if_missing,
                    "current_status": "MISSING" if val is None or val == "" else "DECLARED_UNKNOWN"
                })

        if missing_required_count == 0:
            sufficiency = "SUFFICIENT"
        elif missing_required_count <= 2:
            sufficiency = "PARTIAL"
        else:
            sufficiency = "INSUFFICIENT"

        return available_facts, missing_form_schema, sufficiency

    @staticmethod
    def validate_intake_payload(
        intake_submission: Dict[str, Any]
    ) -> Tuple[bool, Dict[str, Any], List[str]]:
        cleaned_data = {}
        errors = []
        now_iso = datetime.now(timezone.utc).isoformat()

        for key, raw_val in intake_submission.items():
            if key not in MASTER_INTAKE_SCHEMA:
                continue

            meta = MASTER_INTAKE_SCHEMA[key]

            if raw_val in ["Unknown", "Not available", "N/A", "", None]:
                cleaned_data[key] = {
                    "value": meta.default_if_unknown if meta.default_if_unknown is not None else "Unknown",
                    "provenance": PROVENANCE_USER_DECLARED,
                    "status": "DECLARED_UNKNOWN",
                    "recorded_at": now_iso
                }
                continue

            if meta.data_type == "number":
                try:
                    num_val = float(raw_val)
                    if meta.min_value is not None and num_val < meta.min_value:
                        errors.append(f"{meta.label}: Value ({num_val}) cannot be less than {meta.min_value}.")
                    if meta.max_value is not None and num_val > meta.max_value:
                        errors.append(f"{meta.label}: Value ({num_val}) cannot exceed {meta.max_value}.")
                    cleaned_data[key] = {
                        "value": num_val,
                        "provenance": PROVENANCE_USER_DECLARED,
                        "status": "USER_PROVIDED",
                        "recorded_at": now_iso
                    }
                except (ValueError, TypeError):
                    errors.append(f"{meta.label}: Must be a valid numeric value or 'Unknown'.")

            elif meta.data_type == "select":
                str_val = str(raw_val).strip()
                if meta.options and str_val not in meta.options and str_val != "Unknown":
                    errors.append(f"{meta.label}: '{str_val}' is not one of allowed options {meta.options}.")
                cleaned_data[key] = {
                    "value": str_val,
                    "provenance": PROVENANCE_USER_DECLARED,
                    "status": "USER_PROVIDED",
                    "recorded_at": now_iso
                }

            else:
                str_val = str(raw_val).strip()
                cleaned_data[key] = {
                    "value": str_val,
                    "provenance": PROVENANCE_USER_DECLARED,
                    "status": "USER_PROVIDED",
                    "recorded_at": now_iso
                }

        is_valid = len(errors) == 0
        return is_valid, cleaned_data, errors

    @classmethod
    def build_dynamic_intake_request(cls, plan: Any) -> Dict[str, Any]:
        """Constructs dynamic intake form tailored to missing facts from the plan across all 5 risk dimensions."""
        if hasattr(plan, "to_dict"):
            plan_dict = plan.to_dict()
        elif isinstance(plan, dict):
            plan_dict = plan
        else:
            plan_dict = getattr(plan, "__dict__", {})

        available_facts, missing_form, sufficiency = cls.analyze_missing_fields(plan_dict)

        dimension_names = [
            "credit_risk",
            "market_risk",
            "inflation_risk",
            "liquidity_risk",
            "operational_risk"
        ]
        dimensions = {}
        for dim in dimension_names:
            dimensions[dim] = [f for f in missing_form if f.get("category") == dim]

        missing_count = len(missing_form)
        missing_prompt = f"Please provide {missing_count} missing risk fields or explicitly select 'Unknown' for fields without verified data."

        return {
            "business_name": plan_dict.get("business_name"),
            "district": plan_dict.get("district"),
            "evidence_sufficiency_status": sufficiency,
            "available_facts": {k: f.to_dict() if hasattr(f, "to_dict") else f for k, f in available_facts.items()},
            "dimensions": dimensions,
            "missing_fields": missing_form,
            "missing_fields_prompt": missing_prompt,
            "total_missing_fields": missing_count,
        }
