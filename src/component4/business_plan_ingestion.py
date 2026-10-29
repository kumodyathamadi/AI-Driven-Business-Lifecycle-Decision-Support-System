"""
Component 4: Phase 2 — Business Plan Ingestion Service.
Supports ingestion and structured extraction from:
- JSON (Component 1 exported plan / profile schema)
- PDF (Component 1 generated PDF / uploaded business plan)
- DOCX (Microsoft Word business plan)
- TXT / Markdown (Structured text business plan)

Security & Integrity:
- Safe file handling, 15MB size limit, path sanitization.
- No execution of embedded code or macros.
- Distinguishes extracted document facts from missing/inferred fields.
- Zero invented financial values: records missing fields explicitly.
"""

import os
import re
import json
from dataclasses import dataclass, field, asdict
from typing import Dict, Any, List, Optional, Tuple, Union
import pypdf
import docx

MAX_UPLOAD_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB
SUPPORTED_EXTENSIONS = {".json", ".pdf", ".docx", ".txt", ".md"}

WESTERN_PROVINCE_DISTRICTS = {"Colombo", "Gampaha", "Kalutara"}


@dataclass
class ExtractedBusinessPlan:
    """Structured representation of ingested business plan facts and metadata."""
    source_filename: str = ""
    file_format: str = ".json"
    file_size_bytes: int = 0
    is_valid: bool = True
    plan_filename: Optional[str] = None
    business_name: Optional[str] = None
    business_identifier: Optional[str] = None
    business_category: Optional[str] = None
    business_stage: Optional[str] = None
    district: Optional[str] = None
    province: Optional[str] = None
    location_type: Optional[str] = None
    
    # Financial fields (Legacy & Canonical Phase 2)
    available_capital_lkr: Optional[float] = None
    available_starting_capital_lkr: Optional[float] = None
    target_capital_lkr: Optional[float] = None
    monthly_budget_lkr: Optional[float] = None
    fixed_monthly_costs_lkr: Optional[float] = None
    variable_monthly_costs_lkr: Optional[float] = None
    requested_loan_lkr: Optional[float] = None
    initial_financing_amount_lkr: Optional[float] = None
    outstanding_loan_balance_lkr: Optional[float] = None
    monthly_loan_repayment_lkr: Optional[float] = None
    repayment_overdue_status: Optional[str] = None
    repayment_delay_days: Optional[float] = None
    debt_guarantees_or_obligations: Optional[str] = None
    current_cash_reserve_lkr: Optional[float] = None
    accounts_receivable_lkr: Optional[float] = None
    accounts_payable_lkr: Optional[float] = None
    monthly_interest_cost_lkr: Optional[float] = None
    initial_inventory_cost_lkr: Optional[float] = None
    expected_price_lkr: Optional[float] = None
    projected_revenue_lkr: Optional[float] = None
    monthly_revenue_lkr: Optional[float] = None
    capital_runway_months: Optional[float] = None
    capital_includes_loan: Optional[bool] = None
    capital_loan_explanation: Optional[str] = None

    # Credit Risk Specific Fields
    total_overdue_amount_lkr: Optional[float] = None
    longest_overdue_period_days: Optional[float] = None
    overdue_payment_count_12m: Optional[int] = None
    other_monthly_debt_obligations_lkr: Optional[float] = None
    outstanding_guarantees_lkr: Optional[float] = None
    debt_service_available_revenue_lkr: Optional[float] = None
    loan_interest_rate_pct: Optional[float] = None
    upcoming_large_repayment_notes: Optional[str] = None
    repayment_history_status: Optional[str] = None

    # Market Risk Specific Fields
    monthly_customer_count: Optional[int] = None
    average_transaction_value_lkr: Optional[float] = None
    sales_trend_3_6m: Optional[str] = None
    demand_evidence_type: Optional[str] = None
    direct_competitors_count: Optional[int] = None
    competitor_pricing_vs_business: Optional[str] = None
    largest_customer_sales_share_pct: Optional[float] = None
    seasonal_demand_variation_pct: Optional[float] = None
    customer_retention_rate_pct: Optional[float] = None
    price_adjustment_flexibility: Optional[str] = None
    monthly_marketing_budget_lkr: Optional[float] = None

    # Inflation Risk Specific Fields
    main_materials_monthly_cost_lkr: Optional[float] = None
    supplier_price_change_past_3_6m_pct: Optional[float] = None
    expected_supplier_price_increase_3_6m_pct: Optional[float] = None
    imported_inputs_pct: Optional[float] = None
    foreign_currency_exposure: Optional[str] = None
    monthly_fuel_transport_cost_lkr: Optional[float] = None
    monthly_electricity_energy_cost_lkr: Optional[float] = None
    ability_to_increase_prices: Optional[str] = None
    cost_increase_pass_through_pct: Optional[float] = None
    alternative_suppliers_available: Optional[str] = None
    largest_supplier_purchase_share_pct: Optional[float] = None
    external_inflation_source_notes: Optional[str] = None

    # Liquidity Risk Specific Fields
    initial_setup_expenditure_lkr: Optional[float] = None
    remaining_cash_reserves_after_setup_lkr: Optional[float] = None
    other_mandatory_monthly_obligations_lkr: Optional[float] = None
    customer_payment_delay_days: Optional[float] = None
    supplier_payment_period_days: Optional[float] = None
    working_capital_requirement_lkr: Optional[float] = None
    expected_large_one_off_payments_3_6m_lkr: Optional[float] = None

    # Operational Risk Specific Fields
    critical_suppliers_count: Optional[int] = None
    largest_supplier_dependency_pct: Optional[float] = None
    supplier_dependency_level: Optional[str] = None
    alternative_suppliers_status: Optional[str] = None
    supplier_lead_time_days: Optional[float] = None
    delivery_delay_days: Optional[str] = None
    supplier_delays_stockouts_3_6m: Optional[int] = None
    startup_stockout_risk: Optional[str] = None
    inventory_coverage_days: Optional[float] = None
    total_employees_count: Optional[int] = None
    critical_vacant_roles_count: Optional[int] = None
    backup_staff_available: Optional[str] = None
    essential_equipment_dependence: Optional[str] = None
    backup_utilities_available: Optional[str] = None
    expected_downtime_hours: Optional[float] = None
    business_continuity_plan_exists: Optional[str] = None
    logistics_delivery_dependence: Optional[str] = None
    capacity_utilization_pct: Optional[float] = None
    growth_operational_constraints: Optional[str] = None
    staffing_availability: Optional[str] = None
    operational_constraints: Optional[str] = None
    
    # Operational & Market fields
    business_description: Optional[str] = None
    proposed_business_model: Optional[str] = None
    target_customers: Optional[str] = None
    pricing_details: Optional[str] = None
    supplier_details: Optional[str] = None
    resource_details: Optional[str] = None
    expected_customers_per_day: Optional[int] = None
    available_staff_count: Optional[int] = None
    required_staff_count: Optional[int] = None
    available_equipment_score: Optional[int] = None
    required_equipment_score: Optional[int] = None
    supplier_availability_score: Optional[int] = None
    supplier_dependency_percentage: Optional[float] = None
    supplier_delay_days: Optional[float] = None
    imported_input_exposure: Optional[str] = None
    competition_level: Optional[str] = None
    customer_demand_score: Optional[int] = None
    demand_evidence: Optional[str] = None
    location_suitability_score: Optional[int] = None
    entrepreneur_experience_years: Optional[int] = None
    
    # Growth, Strategy & Feasibility
    proposed_growth_action: Optional[str] = None
    proposed_growth_budget_lkr: Optional[float] = None
    required_investment_lkr: Optional[float] = None
    primary_strategy: Optional[str] = None
    growth_objectives: Optional[str] = None
    roadmap_items: List[str] = field(default_factory=list)
    key_enablers: List[str] = field(default_factory=list)
    key_risks_disclosed: List[str] = field(default_factory=list)
    feasibility_result: Dict[str, Any] = field(default_factory=dict)
    operating_costs_breakdown: Dict[str, Any] = field(default_factory=dict)
    financial_assumptions: Dict[str, Any] = field(default_factory=dict)
    conflicting_values: Dict[str, Any] = field(default_factory=dict)
    
    # Provenance and Integrity Tracking
    missing_fields: List[str] = field(default_factory=list)
    source_sections: Dict[str, str] = field(default_factory=dict)
    provenance_notes: List[str] = field(default_factory=list)
    validation_errors: List[str] = field(default_factory=list)
    evidence_sufficiency_status: str = "SUFFICIENT"  # SUFFICIENT, PARTIAL, INSUFFICIENT
    field_provenance: Dict[str, str] = field(default_factory=dict)
    field_status: Dict[str, str] = field(default_factory=dict)
    detailed_provenance: Dict[str, Dict[str, Any]] = field(default_factory=dict)

    def __post_init__(self):
        if not self.source_filename and self.plan_filename:
            self.source_filename = self.plan_filename
        elif not self.plan_filename and self.source_filename:
            self.plan_filename = self.source_filename

        # Synchronize canonical and legacy aliases
        if self.available_starting_capital_lkr is None and self.available_capital_lkr is not None:
            self.available_starting_capital_lkr = self.available_capital_lkr
        elif self.available_capital_lkr is None and self.available_starting_capital_lkr is not None:
            self.available_capital_lkr = self.available_starting_capital_lkr

        if self.initial_financing_amount_lkr is None and self.requested_loan_lkr is not None:
            self.initial_financing_amount_lkr = self.requested_loan_lkr
        elif self.requested_loan_lkr is None and self.initial_financing_amount_lkr is not None:
            self.requested_loan_lkr = self.initial_financing_amount_lkr

        if self.monthly_revenue_lkr is None and self.projected_revenue_lkr is not None:
            self.monthly_revenue_lkr = self.projected_revenue_lkr
        elif self.projected_revenue_lkr is None and self.monthly_revenue_lkr is not None:
            self.projected_revenue_lkr = self.monthly_revenue_lkr

        if self.fixed_monthly_costs_lkr is None and self.monthly_budget_lkr is not None:
            self.fixed_monthly_costs_lkr = self.monthly_budget_lkr
        elif self.monthly_budget_lkr is None and self.fixed_monthly_costs_lkr is not None:
            self.monthly_budget_lkr = self.fixed_monthly_costs_lkr

        if self.required_investment_lkr is None and self.proposed_growth_budget_lkr is not None:
            self.required_investment_lkr = self.proposed_growth_budget_lkr
        elif self.proposed_growth_budget_lkr is None and self.required_investment_lkr is not None:
            self.proposed_growth_budget_lkr = self.required_investment_lkr

        # Normalize repayment delay days from overdue status string if present
        if self.repayment_delay_days is None and self.repayment_overdue_status:
            status_str = str(self.repayment_overdue_status).lower()
            if "30+" in status_str or "30 plus" in status_str:
                self.repayment_delay_days = 30.0
            elif "60+" in status_str:
                self.repayment_delay_days = 60.0
            elif "90+" in status_str:
                self.repayment_delay_days = 90.0
            elif "1-30" in status_str:
                self.repayment_delay_days = 15.0
            elif status_str in ("current", "no", "none", "0"):
                self.repayment_delay_days = 0.0

        if self.average_transaction_value_lkr is None and self.expected_price_lkr is not None:
            self.average_transaction_value_lkr = self.expected_price_lkr
        elif self.expected_price_lkr is None and self.average_transaction_value_lkr is not None:
            self.expected_price_lkr = self.average_transaction_value_lkr

        if self.total_employees_count is None and self.available_staff_count is not None:
            self.total_employees_count = self.available_staff_count
        elif self.available_staff_count is None and self.total_employees_count is not None:
            self.available_staff_count = self.total_employees_count

        if self.remaining_cash_reserves_after_setup_lkr is None and self.current_cash_reserve_lkr is not None:
            self.remaining_cash_reserves_after_setup_lkr = self.current_cash_reserve_lkr
        elif self.current_cash_reserve_lkr is None and self.remaining_cash_reserves_after_setup_lkr is not None:
            self.current_cash_reserve_lkr = self.remaining_cash_reserves_after_setup_lkr

        if self.demand_evidence_type is None and self.demand_evidence is not None:
            self.demand_evidence_type = self.demand_evidence
        elif self.demand_evidence is None and self.demand_evidence_type is not None:
            self.demand_evidence = self.demand_evidence_type

        if self.largest_supplier_dependency_pct is None and self.supplier_dependency_percentage is not None:
            self.largest_supplier_dependency_pct = self.supplier_dependency_percentage
        elif self.supplier_dependency_percentage is None and self.largest_supplier_dependency_pct is not None:
            self.supplier_dependency_percentage = self.largest_supplier_dependency_pct

        if self.supplier_lead_time_days is None and self.supplier_delay_days is not None:
            self.supplier_lead_time_days = self.supplier_delay_days
        elif self.supplier_delay_days is None and self.supplier_lead_time_days is not None:
            self.supplier_delay_days = self.supplier_lead_time_days

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class BusinessPlanIngestionService:
    """Validates and parses business plans into standardized ExtractedBusinessPlan objects."""

    def __init__(self, max_size_bytes: int = MAX_UPLOAD_SIZE_BYTES):
        self.max_size_bytes = max_size_bytes

    def ingest_dict(self, data: Dict[str, Any], source_name: str = "component1_profile.json") -> ExtractedBusinessPlan:
        """Parses structured dictionary directly into an ExtractedBusinessPlan without disk writes."""
        extracted = ExtractedBusinessPlan(
            source_filename=source_name,
            file_format=".json",
            file_size_bytes=len(json.dumps(data, default=str)),
            is_valid=True
        )
        if "plan_metadata" in data or "executive_overview" in data or "financial_plan" in data:
            self._extract_from_component1_plan_json(data, extracted)
        elif "business_input" in data:
            self._extract_from_full_profile_json(data, extracted)
        elif "financial_feasibility" in data or "growth_strategy" in data or ("metadata" in data and isinstance(data["metadata"], dict) and "business_name" in data["metadata"]):
            self._extract_from_component1_output_json(data, extracted)
        else:
            self._extract_from_flat_dict(data, extracted)

        self._validate_and_assess_sufficiency(extracted)
        return extracted

    def ingest_file(self, file_path: Union[str, Dict[str, Any]]) -> ExtractedBusinessPlan:
        """Main entry point to ingest and parse a file by path or dictionary."""
        if isinstance(file_path, dict):
            return self.ingest_dict(file_path)

        if not os.path.exists(file_path):
            return ExtractedBusinessPlan(
                source_filename=os.path.basename(file_path),
                file_format="unknown",
                file_size_bytes=0,
                is_valid=False,
                validation_errors=[f"File does not exist: {file_path}"],
                evidence_sufficiency_status="INSUFFICIENT"
            )

        file_size = os.path.getsize(file_path)
        if file_size > self.max_size_bytes:
            return ExtractedBusinessPlan(
                source_filename=os.path.basename(file_path),
                file_format=os.path.splitext(file_path)[1].lower(),
                file_size_bytes=file_size,
                is_valid=False,
                validation_errors=[f"File size ({file_size} bytes) exceeds limit ({self.max_size_bytes} bytes)"],
                evidence_sufficiency_status="INSUFFICIENT"
            )

        ext = os.path.splitext(file_path)[1].lower()
        if ext not in SUPPORTED_EXTENSIONS:
            return ExtractedBusinessPlan(
                source_filename=os.path.basename(file_path),
                file_format=ext,
                file_size_bytes=file_size,
                is_valid=False,
                validation_errors=[f"Unsupported file format '{ext}'. Supported: {sorted(SUPPORTED_EXTENSIONS)}"],
                evidence_sufficiency_status="INSUFFICIENT"
            )

        if ext == ".json":
            return self._parse_json(file_path, file_size)
        elif ext == ".pdf":
            return self._parse_pdf(file_path, file_size)
        elif ext == ".docx":
            return self._parse_docx(file_path, file_size)
        elif ext in {".txt", ".md"}:
            return self._parse_text(file_path, file_size)
        else:
            return ExtractedBusinessPlan(
                source_filename=os.path.basename(file_path),
                file_format=ext,
                file_size_bytes=file_size,
                is_valid=False,
                validation_errors=[f"Unsupported extension: {ext}"],
                evidence_sufficiency_status="INSUFFICIENT"
            )

    def _parse_json(self, file_path: str, file_size: int) -> ExtractedBusinessPlan:
        """Parses Component 1 structured JSON plan or database profile export."""
        filename = os.path.basename(file_path)
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            return ExtractedBusinessPlan(
                source_filename=filename,
                file_format=".json",
                file_size_bytes=file_size,
                is_valid=False,
                validation_errors=[f"Corrupted or invalid JSON: {str(e)}"],
                evidence_sufficiency_status="INSUFFICIENT"
            )

        # Detect schema structure:
        # Schema A: sample_business_plan_C00001.json (sections: plan_metadata, executive_overview, operational_plan, etc.)
        # Schema B: Full analysis_record profile (sections: metadata, business_input, feasibility_analysis, etc.)
        # Schema C: Flat business dictionary
        
        extracted = ExtractedBusinessPlan(
            source_filename=filename,
            file_format=".json",
            file_size_bytes=file_size,
            is_valid=True
        )

        if "plan_metadata" in data or "executive_overview" in data or "financial_plan" in data:
            self._extract_from_component1_plan_json(data, extracted)
        elif "business_input" in data:
            self._extract_from_full_profile_json(data, extracted)
        elif "financial_feasibility" in data or "growth_strategy" in data or ("metadata" in data and isinstance(data["metadata"], dict) and "business_name" in data["metadata"]):
            self._extract_from_component1_output_json(data, extracted)
        else:
            self._extract_from_flat_dict(data, extracted)

        self._validate_and_assess_sufficiency(extracted)
        return extracted

    def _extract_from_component1_output_json(self, data: Dict[str, Any], extracted: ExtractedBusinessPlan):
        """Extracts fields from Component 1 business plan export output."""
        meta = data.get("metadata", {})
        fin = data.get("financial_feasibility", {})
        growth = data.get("growth_strategy", {})

        extracted.business_name = meta.get("business_name") or data.get("business_name")
        extracted.business_identifier = meta.get("business_id") or meta.get("case_id") or data.get("business_id")
        extracted.business_category = meta.get("business_category") or data.get("business_category")
        extracted.business_stage = meta.get("business_stage") or data.get("business_stage")
        extracted.district = meta.get("district") or data.get("district")
        extracted.province = meta.get("province") or data.get("province") or ("Western" if extracted.district in WESTERN_PROVINCE_DISTRICTS else None)
        extracted.location_type = meta.get("location_type") or data.get("location_type")

        extracted.available_capital_lkr = self._to_float(fin.get("available_capital_lkr") or data.get("available_capital_lkr"))
        extracted.monthly_budget_lkr = self._to_float(fin.get("monthly_budget_lkr") or data.get("monthly_budget_lkr"))
        extracted.requested_loan_lkr = self._to_float(fin.get("loan_amount_lkr") or fin.get("requested_loan_lkr") or data.get("loan_amount_lkr"))

        extracted.proposed_growth_action = growth.get("proposed_action") or growth.get("growth_action") or data.get("proposed_action")
        extracted.primary_strategy = growth.get("primary_strategy") or growth.get("strategy") or data.get("primary_strategy")

        extracted.provenance_notes.append("Extracted from Component 1 Business Plan JSON output.")

    def _extract_from_component1_plan_json(self, data: Dict[str, Any], extracted: ExtractedBusinessPlan):
        """Extracts fields from Component 1 5-section plan JSON format."""
        plan_meta = data.get("plan_metadata", {})
        exec_over = data.get("executive_overview", {})
        op_plan = data.get("operational_plan", {})
        mkt_plan = data.get("marketing_plan", {})
        fin_plan = data.get("financial_plan", {})
        roadmap = data.get("action_roadmap", {})

        # Extract metadata
        extracted.business_category = plan_meta.get("business_category")
        extracted.district = plan_meta.get("district")
        extracted.province = plan_meta.get("province", "Western" if extracted.district in WESTERN_PROVINCE_DISTRICTS else None)

        # Executive Overview
        extracted.primary_strategy = exec_over.get("recommended_primary_strategy")
        extracted.key_enablers = list(exec_over.get("key_enablers", []))
        extracted.key_risks_disclosed = list(exec_over.get("key_risk_hurdles", []))

        # Financial Plan
        if "available_capital_lkr" in fin_plan:
            extracted.available_capital_lkr = float(fin_plan["available_capital_lkr"])
        if "monthly_operating_budget_lkr" in fin_plan:
            extracted.monthly_budget_lkr = float(fin_plan["monthly_operating_budget_lkr"])
        if "requested_loan_lkr" in fin_plan:
            extracted.requested_loan_lkr = float(fin_plan["requested_loan_lkr"])
        if "capital_runway_months" in fin_plan:
            extracted.capital_runway_months = float(fin_plan["capital_runway_months"])

        # Marketing Plan
        if "target_daily_customers" in mkt_plan:
            try:
                extracted.expected_customers_per_day = int(mkt_plan["target_daily_customers"])
            except (ValueError, TypeError):
                pass
        
        # Parse pricing if string or number
        raw_price = mkt_plan.get("pricing_structure")
        if isinstance(raw_price, (int, float)):
            extracted.expected_price_lkr = float(raw_price)
        elif isinstance(raw_price, str):
            match = re.search(r"[\d,]+(?:\.\d+)?", raw_price)
            if match:
                extracted.expected_price_lkr = float(match.group(0).replace(",", ""))

        # Parse demand score
        raw_demand = mkt_plan.get("demand_score")
        if isinstance(raw_demand, (int, float)):
            extracted.customer_demand_score = int(raw_demand)
        elif isinstance(raw_demand, str):
            match = re.search(r"(\d+)\s*/\s*100", raw_demand)
            if match:
                extracted.customer_demand_score = int(match.group(1))

        # Operational Plan parsing
        raw_staff = op_plan.get("staffing_requirements", "")
        if isinstance(raw_staff, str):
            avail_m = re.search(r"Available Staff:\s*(\d+)", raw_staff, re.IGNORECASE)
            req_m = re.search(r"Required Staff:\s*(\d+)", raw_staff, re.IGNORECASE)
            if avail_m:
                extracted.available_staff_count = int(avail_m.group(1))
            if req_m:
                extracted.required_staff_count = int(req_m.group(1))

        raw_eq = op_plan.get("equipment_readiness", "")
        if isinstance(raw_eq, str):
            eq_m = re.search(r"Equipment Score:\s*(\d+)/5\s*vs\s*Required:\s*(\d+)/5", raw_eq, re.IGNORECASE)
            if eq_m:
                extracted.available_equipment_score = int(eq_m.group(1))
                extracted.required_equipment_score = int(eq_m.group(2))

        raw_sup = op_plan.get("supplier_logistics", "")
        if isinstance(raw_sup, str):
            sup_m = re.search(r"Supplier Availability Score:\s*(\d+)/5", raw_sup, re.IGNORECASE)
            if sup_m:
                extracted.supplier_availability_score = int(sup_m.group(1))

        # Action Roadmap items
        all_actions = []
        for phase_key in ["phase_1_immediate_0_to_3_months", "phase_2_growth_3_to_12_months", "phase_3_scale_1_year_plus"]:
            if phase_key in roadmap and isinstance(roadmap[phase_key], list):
                all_actions.extend(roadmap[phase_key])
        extracted.roadmap_items = all_actions

        # Guess proposed growth action from text or default
        biz_summary = exec_over.get("business_summary", "")
        if "New" in biz_summary:
            extracted.business_stage = "New"
            extracted.proposed_growth_action = "start"
        else:
            extracted.business_stage = "Existing"
            extracted.proposed_growth_action = "expand"

        extracted.source_sections = {
            "metadata": json.dumps(plan_meta),
            "executive_overview": json.dumps(exec_over),
            "financial_plan": json.dumps(fin_plan),
            "operational_plan": json.dumps(op_plan),
            "marketing_plan": json.dumps(mkt_plan),
            "action_roadmap": json.dumps(roadmap)
        }
        extracted.provenance_notes.append("Extracted from Component 1 5-Section Plan JSON format.")

    def _detect_and_flag_conflicts(self, extracted: ExtractedBusinessPlan, raw_text: str = ""):
        """Detects logical, semantic, and financial conflicts in extracted plan data."""
        # 1. Sector vs Concept / Name conflict (e.g. Waasana Grocery Shop vs Beauty Salon)
        name_desc = f"{extracted.business_name or ''} {extracted.business_description or ''} {raw_text}".lower()
        stated_cat = extracted.business_category or ""
        cat_lower = stated_cat.lower()

        grocery_keywords = ["grocery", "supermarket", "provision", "mini-mart", "food store", "general store", "grocer"]
        salon_keywords = ["salon", "beauty", "cosmetics", "hair", "spa", "parlour", "parlor"]

        is_grocery_concept = any(w in name_desc for w in grocery_keywords)
        is_salon_cat = any(w in cat_lower for w in salon_keywords)

        is_salon_concept = any(w in name_desc for w in salon_keywords)
        is_grocery_cat = any(w in cat_lower for w in grocery_keywords)

        if is_grocery_concept and is_salon_cat:
            extracted.conflicting_values["business_category"] = {
                "field": "business_category",
                "conflict_type": "SECTOR_CONCEPT_MISMATCH",
                "message": f"Contradiction detected: Business concept references a Grocery Shop ('{extracted.business_name or 'Concept'}'), but Industry Category is declared as '{stated_cat}'.",
                "options": [
                    {"value": "Grocery/Mini-Mart", "label": "Grocery / Mini-Mart (Derived from Concept & Name)", "source": "Prepared For header & concept description"},
                    {"value": stated_cat, "label": f"{stated_cat} (Declared in Industry Category)", "source": "Industry Category header"}
                ],
                "status": "conflicting"
            }
            extracted.validation_errors.append(
                f"Contradictory business identity: Stated category '{stated_cat}' conflicts with concept/name '{extracted.business_name}'."
            )
        elif is_salon_concept and is_grocery_cat and "waasana" not in name_desc:
            extracted.conflicting_values["business_category"] = {
                "field": "business_category",
                "conflict_type": "SECTOR_CONCEPT_MISMATCH",
                "message": f"Contradiction detected: Business concept references a Beauty Salon/Cosmetics ('{extracted.business_name or 'Concept'}'), but Industry Category is declared as '{stated_cat}'.",
                "options": [
                    {"value": "Services", "label": "Beauty Salon / Personal Care Services (Derived from Name/Concept)", "source": "Prepared For header & description"},
                    {"value": stated_cat, "label": f"{stated_cat} (Declared in Industry Category)", "source": "Industry Category header"}
                ],
                "status": "conflicting"
            }
            extracted.validation_errors.append(
                f"Contradictory business identity: Stated category '{stated_cat}' conflicts with concept/name '{extracted.business_name}'."
            )

        # 2. Capital vs Loan Relationship (Unconfirmed whether Available Capital includes Loan)
        cap = extracted.available_capital_lkr or extracted.available_starting_capital_lkr or 0.0
        loan = extracted.requested_loan_lkr or extracted.outstanding_loan_balance_lkr or 0.0
        target = extracted.target_capital_lkr

        if loan > 0 and cap > 0:
            extracted.financial_assumptions["capital_loan_structure"] = {
                "available_capital_lkr": cap,
                "loan_amount_lkr": loan,
                "target_capital_lkr": target,
                "interpretation_a_includes_loan": {
                    "equity_capital_lkr": max(0.0, cap - loan),
                    "loan_capital_lkr": loan,
                    "total_available_funding_lkr": cap,
                    "target_coverage_pct": round((cap / target) * 100, 1) if target and target > 0 else None
                },
                "interpretation_b_excludes_loan": {
                    "equity_capital_lkr": cap,
                    "loan_capital_lkr": loan,
                    "total_available_funding_lkr": cap + loan,
                    "target_coverage_pct": round(((cap + loan) / target) * 100, 1) if target and target > 0 else None
                },
                "status": "UNCONFIRMED_RELATIONSHIP",
                "notes": "Available capital and loan must not be added automatically. User confirmation required on whether available capital includes borrowed funds."
            }
            extracted.conflicting_values["capital_loan_structure"] = {
                "field": "capital_includes_loan",
                "conflict_type": "FUNDING_STRUCTURE_AMBIGUITY",
                "message": f"Available Capital (LKR {cap:,.0f}) and Loan (LKR {loan:,.0f}) relationship is unconfirmed. Confirm whether available capital already includes the loan.",
                "options": [
                    {
                        "value": True,
                        "label": f"Available capital already includes loan (Equity: LKR {max(0.0, cap - loan):,.0f} + Loan: LKR {loan:,.0f} = Total LKR {cap:,.0f})",
                        "source": "Conservative Interpretation"
                    },
                    {
                        "value": False,
                        "label": f"Loan is separate / additive (Equity: LKR {cap:,.0f} + Loan: LKR {loan:,.0f} = Total LKR {cap + loan:,.0f})",
                        "source": "Additive Interpretation"
                    }
                ],
                "status": "conflicting"
            }

    def _extract_from_full_profile_json(self, data: Dict[str, Any], extracted: ExtractedBusinessPlan):
        """Extracts fields from complete backend AnalysisRecord full_profile JSON."""
        biz_in = data.get("business_input", {})
        meta = data.get("metadata", {})
        strat = data.get("strategic_recommendations", {})
        plan = data.get("personalized_business_plan", {})
        feasibility = data.get("feasibility_analysis", {})

        extracted.business_name = biz_in.get("business_name")
        extracted.business_identifier = meta.get("record_id")
        extracted.business_category = biz_in.get("business_category")
        extracted.business_stage = biz_in.get("business_stage")
        extracted.district = biz_in.get("district")
        extracted.province = biz_in.get("province", "Western" if extracted.district in WESTERN_PROVINCE_DISTRICTS else None)
        extracted.location_type = biz_in.get("location_type")

        extracted.available_capital_lkr = self._to_float(biz_in.get("available_capital_lkr"))
        extracted.monthly_budget_lkr = self._to_float(biz_in.get("monthly_budget_lkr"))
        extracted.requested_loan_lkr = self._to_float(biz_in.get("loan_amount_lkr"))
        extracted.initial_inventory_cost_lkr = self._to_float(biz_in.get("initial_inventory_cost_lkr"))
        extracted.expected_price_lkr = self._to_float(biz_in.get("expected_price_lkr"))
        extracted.expected_customers_per_day = self._to_int(biz_in.get("expected_customers_per_day"))
        extracted.available_staff_count = self._to_int(biz_in.get("available_staff_count"))
        extracted.required_staff_count = self._to_int(biz_in.get("required_staff_count"))
        extracted.available_equipment_score = self._to_int(biz_in.get("available_equipment_score"))
        extracted.required_equipment_score = self._to_int(biz_in.get("required_equipment_score"))
        extracted.supplier_availability_score = self._to_int(biz_in.get("supplier_availability_score"))
        extracted.competition_level = biz_in.get("competition_level")
        extracted.customer_demand_score = self._to_int(biz_in.get("customer_demand_score"))
        extracted.location_suitability_score = self._to_int(biz_in.get("location_suitability_score"))
        extracted.entrepreneur_experience_years = self._to_int(biz_in.get("entrepreneur_experience_years"))
        extracted.proposed_growth_action = biz_in.get("proposed_action", "start" if extracted.business_stage == "New" else "expand")

        # Feasibility & Plan synthesis
        extracted.feasibility_result = feasibility
        exec_over = plan.get("executive_overview", {})
        op_plan = plan.get("operational_plan", {})
        mkt_plan = plan.get("marketing_plan", {})
        fin_plan = plan.get("financial_plan", {})

        extracted.business_description = exec_over.get("business_summary") or biz_in.get("original_business_description")
        extracted.target_customers = str(mkt_plan.get("target_daily_customers") or extracted.expected_customers_per_day or "")
        extracted.pricing_details = str(mkt_plan.get("pricing_structure") or f"LKR {extracted.expected_price_lkr:,.2f}" if extracted.expected_price_lkr else "")
        extracted.demand_evidence = str(mkt_plan.get("demand_score") or f"{extracted.customer_demand_score}/100" if extracted.customer_demand_score else "")
        extracted.supplier_details = op_plan.get("supplier_logistics")
        extracted.resource_details = f"{op_plan.get('staffing_requirements', '')} | {op_plan.get('equipment_readiness', '')}"
        extracted.capital_runway_months = fin_plan.get("capital_runway_months") or (
            round(extracted.available_capital_lkr / max(1.0, extracted.monthly_budget_lkr), 1) if extracted.available_capital_lkr and extracted.monthly_budget_lkr else None
        )
        extracted.target_capital_lkr = fin_plan.get("target_capital_lkr") or (
            extracted.monthly_budget_lkr * 6.0 if extracted.monthly_budget_lkr else None
        )

        topsis = strat.get("topsis_ranking", {})
        extracted.primary_strategy = topsis.get("top_recommended_strategy") or exec_over.get("recommended_primary_strategy")

        self._detect_and_flag_conflicts(extracted)
        extracted.provenance_notes.append("Extracted from Component 1 Complete Analysis Profile JSON.")

    def _extract_from_flat_dict(self, data: Dict[str, Any], extracted: ExtractedBusinessPlan):
        """Extracts fields from flat dictionary or CSV-equivalent dictionary."""
        extracted.business_name = data.get("business_name") or data.get("name")
        extracted.business_identifier = data.get("case_id") or data.get("business_id") or data.get("id")
        extracted.business_category = data.get("business_category") or data.get("category")
        extracted.business_stage = data.get("business_stage") or data.get("stage")
        extracted.district = data.get("district")
        extracted.province = data.get("province", "Western" if extracted.district in WESTERN_PROVINCE_DISTRICTS else None)
        extracted.location_type = data.get("location_type")

        extracted.available_capital_lkr = self._to_float(data.get("available_capital_lkr") or data.get("capital"))
        extracted.target_capital_lkr = self._to_float(data.get("target_capital_lkr"))
        extracted.monthly_budget_lkr = self._to_float(data.get("monthly_budget_lkr") or data.get("budget"))
        extracted.requested_loan_lkr = self._to_float(data.get("loan_amount_lkr") or data.get("requested_loan_lkr") or 0.0)
        extracted.initial_inventory_cost_lkr = self._to_float(data.get("initial_inventory_cost_lkr"))
        extracted.expected_price_lkr = self._to_float(data.get("expected_price_lkr") or data.get("price"))
        extracted.expected_customers_per_day = self._to_int(data.get("expected_customers_per_day") or data.get("customers"))
        extracted.available_staff_count = self._to_int(data.get("available_staff_count"))
        extracted.required_staff_count = self._to_int(data.get("required_staff_count"))
        extracted.available_equipment_score = self._to_int(data.get("available_equipment_score"))
        extracted.required_equipment_score = self._to_int(data.get("required_equipment_score"))
        extracted.supplier_availability_score = self._to_int(data.get("supplier_availability_score"))
        extracted.competition_level = data.get("competition_level")
        extracted.customer_demand_score = self._to_int(data.get("customer_demand_score"))
        extracted.location_suitability_score = self._to_int(data.get("location_suitability_score"))
        extracted.entrepreneur_experience_years = self._to_int(data.get("entrepreneur_experience_years"))
        extracted.proposed_growth_action = data.get("proposed_action") or data.get("growth_action")
        extracted.primary_strategy = data.get("primary_strategy") or data.get("strategy")
        self._populate_new_risk_fields(data, extracted)
        self._detect_and_flag_conflicts(extracted)
        extracted.provenance_notes.append("Extracted from flat business attribute dictionary.")

    def _populate_new_risk_fields(self, data: Dict[str, Any], extracted: ExtractedBusinessPlan):
        """Populates new risk-specific fields across all 5 categories from structured input data."""
        # Credit Risk
        if "total_overdue_amount_lkr" in data and data["total_overdue_amount_lkr"] is not None:
            extracted.total_overdue_amount_lkr = self._to_float(data["total_overdue_amount_lkr"])
        elif "arrears_amount_lkr" in data and data["arrears_amount_lkr"] is not None:
            extracted.total_overdue_amount_lkr = self._to_float(data["arrears_amount_lkr"])

        if "longest_overdue_period_days" in data and data["longest_overdue_period_days"] is not None:
            extracted.longest_overdue_period_days = self._to_float(data["longest_overdue_period_days"])
        if "overdue_payment_count_12m" in data and data["overdue_payment_count_12m"] is not None:
            extracted.overdue_payment_count_12m = self._to_int(data["overdue_payment_count_12m"])
        if "other_monthly_debt_obligations_lkr" in data and data["other_monthly_debt_obligations_lkr"] is not None:
            extracted.other_monthly_debt_obligations_lkr = self._to_float(data["other_monthly_debt_obligations_lkr"])
        if "outstanding_guarantees_lkr" in data and data["outstanding_guarantees_lkr"] is not None:
            extracted.outstanding_guarantees_lkr = self._to_float(data["outstanding_guarantees_lkr"])
        if "debt_service_available_revenue_lkr" in data and data["debt_service_available_revenue_lkr"] is not None:
            extracted.debt_service_available_revenue_lkr = self._to_float(data["debt_service_available_revenue_lkr"])
        if "loan_interest_rate_pct" in data and data["loan_interest_rate_pct"] is not None:
            extracted.loan_interest_rate_pct = self._to_float(data["loan_interest_rate_pct"])
        if "upcoming_large_repayment_notes" in data and data["upcoming_large_repayment_notes"] is not None:
            extracted.upcoming_large_repayment_notes = str(data["upcoming_large_repayment_notes"])
        if "repayment_history_status" in data and data["repayment_history_status"] is not None:
            extracted.repayment_history_status = str(data["repayment_history_status"])

        # Market Risk
        if "monthly_customer_count" in data and data["monthly_customer_count"] is not None:
            extracted.monthly_customer_count = self._to_int(data["monthly_customer_count"])
        elif extracted.expected_customers_per_day:
            extracted.monthly_customer_count = extracted.expected_customers_per_day * 26

        if "average_transaction_value_lkr" in data and data["average_transaction_value_lkr"] is not None:
            extracted.average_transaction_value_lkr = self._to_float(data["average_transaction_value_lkr"])
        elif extracted.expected_price_lkr:
            extracted.average_transaction_value_lkr = extracted.expected_price_lkr

        if "sales_trend_3_6m" in data and data["sales_trend_3_6m"] is not None:
            extracted.sales_trend_3_6m = str(data["sales_trend_3_6m"])
        if "demand_evidence_type" in data and data["demand_evidence_type"] is not None:
            extracted.demand_evidence_type = str(data["demand_evidence_type"])
        elif extracted.demand_evidence:
            extracted.demand_evidence_type = extracted.demand_evidence

        if "direct_competitors_count" in data and data["direct_competitors_count"] is not None:
            extracted.direct_competitors_count = self._to_int(data["direct_competitors_count"])
        if "competitor_pricing_vs_business" in data and data["competitor_pricing_vs_business"] is not None:
            extracted.competitor_pricing_vs_business = str(data["competitor_pricing_vs_business"])
        if "largest_customer_sales_share_pct" in data and data["largest_customer_sales_share_pct"] is not None:
            extracted.largest_customer_sales_share_pct = self._to_float(data["largest_customer_sales_share_pct"])
        if "seasonal_demand_variation_pct" in data and data["seasonal_demand_variation_pct"] is not None:
            extracted.seasonal_demand_variation_pct = self._to_float(data["seasonal_demand_variation_pct"])
        if "customer_retention_rate_pct" in data and data["customer_retention_rate_pct"] is not None:
            extracted.customer_retention_rate_pct = self._to_float(data["customer_retention_rate_pct"])
        if "price_adjustment_flexibility" in data and data["price_adjustment_flexibility"] is not None:
            extracted.price_adjustment_flexibility = str(data["price_adjustment_flexibility"])
        if "monthly_marketing_budget_lkr" in data and data["monthly_marketing_budget_lkr"] is not None:
            extracted.monthly_marketing_budget_lkr = self._to_float(data["monthly_marketing_budget_lkr"])

        # Inflation Risk
        if "main_materials_monthly_cost_lkr" in data and data["main_materials_monthly_cost_lkr"] is not None:
            extracted.main_materials_monthly_cost_lkr = self._to_float(data["main_materials_monthly_cost_lkr"])
        if "supplier_price_change_past_3_6m_pct" in data and data["supplier_price_change_past_3_6m_pct"] is not None:
            extracted.supplier_price_change_past_3_6m_pct = self._to_float(data["supplier_price_change_past_3_6m_pct"])
        if "expected_supplier_price_increase_3_6m_pct" in data and data["expected_supplier_price_increase_3_6m_pct"] is not None:
            extracted.expected_supplier_price_increase_3_6m_pct = self._to_float(data["expected_supplier_price_increase_3_6m_pct"])
        if "imported_inputs_pct" in data and data["imported_inputs_pct"] is not None:
            extracted.imported_inputs_pct = self._to_float(data["imported_inputs_pct"])
        if "foreign_currency_exposure" in data and data["foreign_currency_exposure"] is not None:
            extracted.foreign_currency_exposure = str(data["foreign_currency_exposure"])
        if "monthly_fuel_transport_cost_lkr" in data and data["monthly_fuel_transport_cost_lkr"] is not None:
            extracted.monthly_fuel_transport_cost_lkr = self._to_float(data["monthly_fuel_transport_cost_lkr"])
        if "monthly_electricity_energy_cost_lkr" in data and data["monthly_electricity_energy_cost_lkr"] is not None:
            extracted.monthly_electricity_energy_cost_lkr = self._to_float(data["monthly_electricity_energy_cost_lkr"])
        if "ability_to_increase_prices" in data and data["ability_to_increase_prices"] is not None:
            extracted.ability_to_increase_prices = str(data["ability_to_increase_prices"])
        if "cost_increase_pass_through_pct" in data and data["cost_increase_pass_through_pct"] is not None:
            extracted.cost_increase_pass_through_pct = self._to_float(data["cost_increase_pass_through_pct"])
        if "alternative_suppliers_available" in data and data["alternative_suppliers_available"] is not None:
            extracted.alternative_suppliers_available = str(data["alternative_suppliers_available"])
        if "largest_supplier_purchase_share_pct" in data and data["largest_supplier_purchase_share_pct"] is not None:
            extracted.largest_supplier_purchase_share_pct = self._to_float(data["largest_supplier_purchase_share_pct"])
        if "external_inflation_source_notes" in data and data["external_inflation_source_notes"] is not None:
            extracted.external_inflation_source_notes = str(data["external_inflation_source_notes"])

        # Liquidity Risk
        if "initial_setup_expenditure_lkr" in data and data["initial_setup_expenditure_lkr"] is not None:
            extracted.initial_setup_expenditure_lkr = self._to_float(data["initial_setup_expenditure_lkr"])
        if "remaining_cash_reserves_after_setup_lkr" in data and data["remaining_cash_reserves_after_setup_lkr"] is not None:
            extracted.remaining_cash_reserves_after_setup_lkr = self._to_float(data["remaining_cash_reserves_after_setup_lkr"])
        elif extracted.current_cash_reserve_lkr:
            extracted.remaining_cash_reserves_after_setup_lkr = extracted.current_cash_reserve_lkr

        if "other_mandatory_monthly_obligations_lkr" in data and data["other_mandatory_monthly_obligations_lkr"] is not None:
            extracted.other_mandatory_monthly_obligations_lkr = self._to_float(data["other_mandatory_monthly_obligations_lkr"])
        if "customer_payment_delay_days" in data and data["customer_payment_delay_days"] is not None:
            extracted.customer_payment_delay_days = self._to_float(data["customer_payment_delay_days"])
        if "supplier_payment_period_days" in data and data["supplier_payment_period_days"] is not None:
            extracted.supplier_payment_period_days = self._to_float(data["supplier_payment_period_days"])
        if "working_capital_requirement_lkr" in data and data["working_capital_requirement_lkr"] is not None:
            extracted.working_capital_requirement_lkr = self._to_float(data["working_capital_requirement_lkr"])
        if "expected_large_one_off_payments_3_6m_lkr" in data and data["expected_large_one_off_payments_3_6m_lkr"] is not None:
            extracted.expected_large_one_off_payments_3_6m_lkr = self._to_float(data["expected_large_one_off_payments_3_6m_lkr"])

        # Operational Risk
        if "critical_suppliers_count" in data and data["critical_suppliers_count"] is not None:
            extracted.critical_suppliers_count = self._to_int(data["critical_suppliers_count"])
        if "largest_supplier_dependency_pct" in data and data["largest_supplier_dependency_pct"] is not None:
            extracted.largest_supplier_dependency_pct = self._to_float(data["largest_supplier_dependency_pct"])
        elif extracted.supplier_dependency_percentage:
            extracted.largest_supplier_dependency_pct = extracted.supplier_dependency_percentage

        if "alternative_suppliers_status" in data and data["alternative_suppliers_status"] is not None:
            extracted.alternative_suppliers_status = str(data["alternative_suppliers_status"])
        if "supplier_lead_time_days" in data and data["supplier_lead_time_days"] is not None:
            extracted.supplier_lead_time_days = self._to_float(data["supplier_lead_time_days"])
        elif extracted.supplier_delay_days:
            extracted.supplier_lead_time_days = extracted.supplier_delay_days

        if "supplier_delays_stockouts_3_6m" in data and data["supplier_delays_stockouts_3_6m"] is not None:
            extracted.supplier_delays_stockouts_3_6m = self._to_int(data["supplier_delays_stockouts_3_6m"])
        if "startup_stockout_risk" in data and data["startup_stockout_risk"] is not None:
            extracted.startup_stockout_risk = str(data["startup_stockout_risk"])
        if "inventory_coverage_days" in data and data["inventory_coverage_days"] is not None:
            extracted.inventory_coverage_days = self._to_float(data["inventory_coverage_days"])
        if "total_employees_count" in data and data["total_employees_count"] is not None:
            extracted.total_employees_count = self._to_int(data["total_employees_count"])
        elif extracted.available_staff_count:
            extracted.total_employees_count = extracted.available_staff_count

        if "critical_vacant_roles_count" in data and data["critical_vacant_roles_count"] is not None:
            extracted.critical_vacant_roles_count = self._to_int(data["critical_vacant_roles_count"])
        if "backup_staff_available" in data and data["backup_staff_available"] is not None:
            extracted.backup_staff_available = str(data["backup_staff_available"])
        if "essential_equipment_dependence" in data and data["essential_equipment_dependence"] is not None:
            extracted.essential_equipment_dependence = str(data["essential_equipment_dependence"])
        if "backup_utilities_available" in data and data["backup_utilities_available"] is not None:
            extracted.backup_utilities_available = str(data["backup_utilities_available"])
        if "expected_downtime_hours" in data and data["expected_downtime_hours"] is not None:
            extracted.expected_downtime_hours = self._to_float(data["expected_downtime_hours"])
        if "business_continuity_plan_exists" in data and data["business_continuity_plan_exists"] is not None:
            extracted.business_continuity_plan_exists = str(data["business_continuity_plan_exists"])
        if "logistics_delivery_dependence" in data and data["logistics_delivery_dependence"] is not None:
            extracted.logistics_delivery_dependence = str(data["logistics_delivery_dependence"])
        if "capacity_utilization_pct" in data and data["capacity_utilization_pct"] is not None:
            extracted.capacity_utilization_pct = self._to_float(data["capacity_utilization_pct"])
        if "growth_operational_constraints" in data and data["growth_operational_constraints"] is not None:
            extracted.growth_operational_constraints = str(data["growth_operational_constraints"])
        if "staffing_availability" in data and data["staffing_availability"] is not None:
            extracted.staffing_availability = str(data["staffing_availability"])
        if "operational_constraints" in data and data["operational_constraints"] is not None:
            extracted.operational_constraints = str(data["operational_constraints"])

    def _parse_pdf(self, file_path: str, file_size: int) -> ExtractedBusinessPlan:
        """Extracts text from PDF and parses structured business plan facts."""
        filename = os.path.basename(file_path)
        extracted_text = ""
        source_sections = {}
        try:
            reader = pypdf.PdfReader(file_path)
            num_pages = len(reader.pages)
            if num_pages == 0:
                return ExtractedBusinessPlan(
                    source_filename=filename,
                    file_format=".pdf",
                    file_size_bytes=file_size,
                    is_valid=False,
                    validation_errors=["PDF file is empty (0 pages)."],
                    evidence_sufficiency_status="INSUFFICIENT"
                )
            for page_idx, page in enumerate(reader.pages):
                page_text = page.extract_text() or ""
                source_sections[f"Page_{page_idx+1}"] = page_text
                extracted_text += f"\n--- Page {page_idx+1} ---\n" + page_text
        except Exception as e:
            return ExtractedBusinessPlan(
                source_filename=filename,
                file_format=".pdf",
                file_size_bytes=file_size,
                is_valid=False,
                validation_errors=[f"Failed to read PDF document: {str(e)}"],
                evidence_sufficiency_status="INSUFFICIENT"
            )

        if not extracted_text.strip():
            return ExtractedBusinessPlan(
                source_filename=filename,
                file_format=".pdf",
                file_size_bytes=file_size,
                is_valid=False,
                validation_errors=["Extracted PDF text is blank or non-renderable."],
                evidence_sufficiency_status="INSUFFICIENT"
            )

        extracted = ExtractedBusinessPlan(
            source_filename=filename,
            file_format=".pdf",
            file_size_bytes=file_size,
            is_valid=True,
            source_sections=source_sections
        )
        self._extract_from_unstructured_text(extracted_text, extracted)
        extracted.provenance_notes.append(f"Extracted from PDF ({len(source_sections)} pages) via pypdf.")
        self._validate_and_assess_sufficiency(extracted)
        return extracted

    def _parse_docx(self, file_path: str, file_size: int) -> ExtractedBusinessPlan:
        """Extracts text from Microsoft Word (.docx) documents."""
        filename = os.path.basename(file_path)
        source_sections = {}
        full_text = []
        try:
            doc = docx.Document(file_path)
            current_section = "Header"
            current_paras = []
            for para in doc.paragraphs:
                text = para.text.strip()
                if not text:
                    continue
                style_name = getattr(para.style, "name", "") if para.style else ""
                if (style_name and style_name.startswith("Heading")) or text.isupper():
                    if current_paras:
                        source_sections[current_section] = "\n".join(current_paras)
                        current_paras = []
                    current_section = text[:50]
                current_paras.append(text)
                full_text.append(text)
            if current_paras:
                source_sections[current_section] = "\n".join(current_paras)
        except Exception as e:
            return ExtractedBusinessPlan(
                source_filename=filename,
                file_format=".docx",
                file_size_bytes=file_size,
                is_valid=False,
                validation_errors=[f"Failed to read DOCX document: {str(e)}"],
                evidence_sufficiency_status="INSUFFICIENT"
            )

        combined_text = "\n".join(full_text)
        if not combined_text.strip():
            return ExtractedBusinessPlan(
                source_filename=filename,
                file_format=".docx",
                file_size_bytes=file_size,
                is_valid=False,
                validation_errors=["Extracted DOCX content is empty."],
                evidence_sufficiency_status="INSUFFICIENT"
            )

        extracted = ExtractedBusinessPlan(
            source_filename=filename,
            file_format=".docx",
            file_size_bytes=file_size,
            is_valid=True,
            source_sections=source_sections
        )
        self._extract_from_unstructured_text(combined_text, extracted)
        extracted.provenance_notes.append(f"Extracted from DOCX document ({len(doc.paragraphs)} paragraphs).")
        self._validate_and_assess_sufficiency(extracted)
        return extracted

    def _parse_text(self, file_path: str, file_size: int) -> ExtractedBusinessPlan:
        """Parses structured text or markdown files."""
        filename = os.path.basename(file_path)
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
        except Exception as e:
            return ExtractedBusinessPlan(
                source_filename=filename,
                file_format=".txt",
                file_size_bytes=file_size,
                is_valid=False,
                validation_errors=[f"Failed to read text file: {str(e)}"],
                evidence_sufficiency_status="INSUFFICIENT"
            )

        if not content.strip():
            return ExtractedBusinessPlan(
                source_filename=filename,
                file_format=".txt",
                file_size_bytes=file_size,
                is_valid=False,
                validation_errors=["Text file is empty."],
                evidence_sufficiency_status="INSUFFICIENT"
            )

        extracted = ExtractedBusinessPlan(
            source_filename=filename,
            file_format=".txt",
            file_size_bytes=file_size,
            is_valid=True,
            source_sections={"Content": content}
        )
        self._extract_from_unstructured_text(content, extracted)
        extracted.provenance_notes.append("Extracted from raw text/markdown file.")
        self._validate_and_assess_sufficiency(extracted)
        return extracted

    def _extract_from_unstructured_text(self, text: str, extracted: ExtractedBusinessPlan):
        """Regex and keyword entity extraction from unstructured plan text."""
        # 1. Business Name (Prepared For: or BUSINESS NAME:)
        name_match = re.search(r"(?:prepared for|business name|enterprise name)[:\s]+([^\n\r\|;\*]+)", text, re.IGNORECASE)
        if name_match:
            clean_name = name_match.group(1).strip().strip("*_#")
            if clean_name.lower().endswith("management"):
                clean_name = clean_name[:-10].strip()
            if clean_name:
                extracted.business_name = clean_name
                extracted.field_provenance["business_name"] = "STATED_IN_PLAN"

        # 2. Industry Category (Industry Category: or Category:)
        cat_match = re.search(r"(?:industry category|business category|industry sector|category)[:\s]+([^\n\r\|;\*]+)", text, re.IGNORECASE)
        if cat_match:
            clean_cat = cat_match.group(1).strip().strip("*_#")
            if clean_cat:
                extracted.business_category = clean_cat
                extracted.field_provenance["business_category"] = "STATED_IN_PLAN"

        # Fallback category extraction if not explicitly labelled
        if not extracted.business_category:
            categories = [
                "Grocery/Mini-Mart", "Bakery", "Restaurant", "Garments",
                "Retail", "Agriculture", "Services", "Manufacturing"
            ]
            for c in categories:
                clean_c = c.split("/")[0]
                if re.search(rf"\b{clean_c}\b", text, re.IGNORECASE):
                    extracted.business_category = c
                    extracted.field_provenance["business_category"] = "DERIVED_CALCULATION"
                    break

        # 3. Stage extraction (Business Stage: or keywords)
        stage_match = re.search(r"(?:business stage|lifecycle stage|stage)[:\s]+([^\n\r\|;\*]+)", text, re.IGNORECASE)
        if stage_match:
            raw_stage = stage_match.group(1).strip().strip("*_#")
            if any(w in raw_stage.lower() for w in ["startup", "new"]):
                extracted.business_stage = "New"
                extracted.proposed_growth_action = "start"
            elif any(w in raw_stage.lower() for w in ["existing", "expansion", "established", "operating"]):
                extracted.business_stage = "Existing"
                extracted.proposed_growth_action = "expand"
            else:
                extracted.business_stage = raw_stage
            extracted.field_provenance["business_stage"] = "STATED_IN_PLAN"
        else:
            if re.search(r"\b(Startup|New Business|New Enterprise|New Startup)\b", text, re.IGNORECASE):
                extracted.business_stage = "New"
                extracted.proposed_growth_action = "start"
            elif re.search(r"\b(Existing|Expansion|Operational Business|Established)\b", text, re.IGNORECASE):
                extracted.business_stage = "Existing"
                extracted.proposed_growth_action = "expand"

        # 4. District extraction (Location: or DISTRICT: or keywords)
        dist_match = re.search(r"(?:operating location|location|district)[:\s]+([^\n\r\|;\*]+)", text, re.IGNORECASE)
        if dist_match:
            loc_str = dist_match.group(1).strip()
            for d in ["Colombo", "Gampaha", "Kalutara"]:
                if re.search(rf"\b{d}\b", loc_str, re.IGNORECASE):
                    extracted.district = d
                    extracted.province = "Western"
                    extracted.field_provenance["district"] = "STATED_IN_PLAN"
                    break

        if not extracted.district:
            for d in ["Colombo", "Gampaha", "Kalutara"]:
                if re.search(rf"\b{d}\b", text, re.IGNORECASE):
                    extracted.district = d
                    extracted.province = "Western"
                    extracted.field_provenance["district"] = "STATED_IN_PLAN"
                    break

        # 5. Financial regex extraction
        # Available Capital (AVAILABLE CAPITAL:)
        avail_match = re.search(r"(?:available capital|starting capital|available starting capital)[:\s]*(?:lkr|rs\.?|lkr\.)?\s*([\d,]+(?:\.\d+)?)", text, re.IGNORECASE)
        if avail_match:
            extracted.available_capital_lkr = float(avail_match.group(1).replace(",", ""))
            extracted.field_provenance["available_capital_lkr"] = "STATED_IN_PLAN"

        # Target Capital (TARGET CAPITAL:)
        target_match = re.search(r"(?:target capital|planned initial capital|initial capital requirement|target investment)[:\s]*(?:lkr|rs\.?|lkr\.)?\s*([\d,]+(?:\.\d+)?)", text, re.IGNORECASE)
        if target_match:
            extracted.target_capital_lkr = float(target_match.group(1).replace(",", ""))
            extracted.field_provenance["target_capital_lkr"] = "STATED_IN_PLAN"

        # Monthly Budget (MONTHLY BUDGET:)
        budget_match = re.search(r"(?:monthly budget|operating budget|monthly expense|monthly operating budget)[:\s]*(?:lkr|rs\.?|lkr\.)?\s*([\d,]+(?:\.\d+)?)", text, re.IGNORECASE)
        if budget_match:
            extracted.monthly_budget_lkr = float(budget_match.group(1).replace(",", ""))
            extracted.field_provenance["monthly_budget_lkr"] = "STATED_IN_PLAN"

        # Loan (Loan: or Loan Amount: or External Financing:)
        loan_match = re.search(r"(?:loan amount|external financing|requested loan|borrowing|loan)[:\s]*(?:lkr|rs\.?|lkr\.)?\s*([\d,]+(?:\.\d+)?)", text, re.IGNORECASE)
        if loan_match:
            extracted.requested_loan_lkr = float(loan_match.group(1).replace(",", ""))
            extracted.field_provenance["requested_loan_lkr"] = "STATED_IN_PLAN"

        # Revenue
        rev_match = re.search(r"(?:estimated monthly revenue|monthly revenue|projected revenue|sales revenue)[:\s]*(?:lkr|rs\.?|lkr\.)?\s*([\d,]+(?:\.\d+)?)", text, re.IGNORECASE)
        if rev_match:
            extracted.monthly_revenue_lkr = float(rev_match.group(1).replace(",", ""))
            extracted.field_provenance["monthly_revenue_lkr"] = "STATED_IN_PLAN"

        # Pricing
        price_match = re.search(r"(?:target unit price|expected price|unit price|average transaction value|pricing)[:\s]*(?:lkr|rs\.?|lkr\.)?\s*([\d,]+(?:\.\d+)?)", text, re.IGNORECASE)
        if price_match:
            extracted.expected_price_lkr = float(price_match.group(1).replace(",", ""))
            extracted.pricing_details = f"LKR {extracted.expected_price_lkr:,.2f}"
            extracted.field_provenance["expected_price_lkr"] = "STATED_IN_PLAN"

        # Customers & Demand
        cust_match = re.search(r"(?:target daily customers|expected customers|customers per day)[:\s]*(\d+)", text, re.IGNORECASE)
        if cust_match:
            extracted.expected_customers_per_day = int(cust_match.group(1))
            extracted.field_provenance["expected_customers_per_day"] = "STATED_IN_PLAN"

        demand_match = re.search(r"(?:demand score|customer demand index|demand index)[:\s]*(\d+)(?:\s*/\s*100)?", text, re.IGNORECASE)
        if demand_match:
            extracted.customer_demand_score = int(demand_match.group(1))
            extracted.demand_evidence = f"{extracted.customer_demand_score} / 100"
            extracted.field_provenance["customer_demand_score"] = "STATED_IN_PLAN"

        # Staffing & Resources
        staff_match = re.search(r"(?:available staff|current employees|staff count)[:\s]*(\d+)", text, re.IGNORECASE)
        if staff_match:
            extracted.available_staff_count = int(staff_match.group(1))
            extracted.field_provenance["available_staff_count"] = "STATED_IN_PLAN"

        req_staff_match = re.search(r"(?:required staff|staff required)[:\s]*(\d+)", text, re.IGNORECASE)
        if req_staff_match:
            extracted.required_staff_count = int(req_staff_match.group(1))

        # Competition
        comp_match = re.search(r"(?:competition level|market competition|competition)[:\s]*([^\n\r\|;\*]+)", text, re.IGNORECASE)
        if comp_match:
            extracted.competition_level = comp_match.group(1).strip().strip("*_#")

        # Business Description / Concept
        desc_match = re.search(r"(?:business description|concept|executive summary|business summary)[:\s]*([^\n\r]+(?:\n[^\n\r]+){0,2})", text, re.IGNORECASE)
        if desc_match:
            extracted.business_description = desc_match.group(1).strip().strip("*_#")

        # Strategy
        strat_match = re.search(r"(?:recommended primary strategy|recommended strategy|primary strategy|strategy)[:\s]*([^\n\r\|;\*]+)", text, re.IGNORECASE)
        if strat_match:
            extracted.primary_strategy = strat_match.group(1).strip().strip("*_#")

        # Feasibility Prediction
        feasp_match = re.search(r"(?:predicted feasibility|model prediction|feasibility result)[:\s]*([^\n\r\|;\*]+)", text, re.IGNORECASE)
        if feasp_match:
            lbl = feasp_match.group(1).strip().strip("*_#")
            extracted.feasibility_result = {"prediction": lbl}

        # 6. Run Conflict Detection & Capital-Loan Structure Analysis
        self._detect_and_flag_conflicts(extracted, raw_text=text)

    def _validate_and_assess_sufficiency(self, extracted: ExtractedBusinessPlan):
        """Identifies missing fields and assigns evidence sufficiency grade."""
        missing = []
        if not extracted.district:
            missing.append("district")
        if not extracted.business_category:
            missing.append("business_category")
        if extracted.available_capital_lkr is None:
            missing.append("available_capital_lkr")
        if extracted.monthly_budget_lkr is None:
            missing.append("monthly_budget_lkr")
        if extracted.business_stage is None:
            missing.append("business_stage")
        if extracted.available_staff_count is None:
            missing.append("available_staff_count")

        extracted.missing_fields = missing

        # Evidence Sufficiency grading
        if len(missing) == 0:
            extracted.evidence_sufficiency_status = "SUFFICIENT"
        elif len(missing) <= 2:
            extracted.evidence_sufficiency_status = "PARTIAL"
        else:
            extracted.evidence_sufficiency_status = "INSUFFICIENT"

        # Check geographic boundary
        if extracted.district and extracted.district not in WESTERN_PROVINCE_DISTRICTS:
            extracted.validation_errors.append(
                f"Geographic scope violation: District '{extracted.district}' is outside Western Province (Colombo, Gampaha, Kalutara)."
            )
            extracted.is_valid = False

    @staticmethod
    def _to_float(val: Any) -> Optional[float]:
        if val is None:
            return None
        try:
            return float(val)
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _to_int(val: Any) -> Optional[int]:
        if val is None:
            return None
        try:
            return int(float(val))
        except (ValueError, TypeError):
            return None
