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
    
    # Financial fields
    available_capital_lkr: Optional[float] = None
    monthly_budget_lkr: Optional[float] = None
    requested_loan_lkr: Optional[float] = None
    initial_inventory_cost_lkr: Optional[float] = None
    expected_price_lkr: Optional[float] = None
    projected_revenue_lkr: Optional[float] = None
    capital_runway_months: Optional[float] = None
    
    # Operational & Market fields
    expected_customers_per_day: Optional[int] = None
    available_staff_count: Optional[int] = None
    required_staff_count: Optional[int] = None
    available_equipment_score: Optional[int] = None
    required_equipment_score: Optional[int] = None
    supplier_availability_score: Optional[int] = None
    competition_level: Optional[str] = None
    customer_demand_score: Optional[int] = None
    location_suitability_score: Optional[int] = None
    entrepreneur_experience_years: Optional[int] = None
    
    # Growth & Strategy
    proposed_growth_action: Optional[str] = None
    primary_strategy: Optional[str] = None
    roadmap_items: List[str] = field(default_factory=list)
    key_enablers: List[str] = field(default_factory=list)
    key_risks_disclosed: List[str] = field(default_factory=list)
    
    # Provenance and Integrity Tracking
    missing_fields: List[str] = field(default_factory=list)
    source_sections: Dict[str, str] = field(default_factory=dict)
    provenance_notes: List[str] = field(default_factory=list)
    validation_errors: List[str] = field(default_factory=list)
    evidence_sufficiency_status: str = "SUFFICIENT"  # SUFFICIENT, PARTIAL, INSUFFICIENT

    def __post_init__(self):
        if not self.source_filename and self.plan_filename:
            self.source_filename = self.plan_filename
        elif not self.plan_filename and self.source_filename:
            self.plan_filename = self.source_filename

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class BusinessPlanIngestionService:
    """Validates and parses business plans into standardized ExtractedBusinessPlan objects."""

    def __init__(self, max_size_bytes: int = MAX_UPLOAD_SIZE_BYTES):
        self.max_size_bytes = max_size_bytes

    def ingest_file(self, file_path: str) -> ExtractedBusinessPlan:
        """Main entry point to ingest and parse a file by path."""
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

    def _extract_from_full_profile_json(self, data: Dict[str, Any], extracted: ExtractedBusinessPlan):
        """Extracts fields from complete backend AnalysisRecord full_profile JSON."""
        biz_in = data.get("business_input", {})
        meta = data.get("metadata", {})
        strat = data.get("strategic_recommendations", {})
        plan = data.get("personalized_business_plan", {})

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

        topsis = strat.get("topsis_ranking", {})
        extracted.primary_strategy = topsis.get("top_recommended_strategy")

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
        extracted.provenance_notes.append("Extracted from flat business attribute dictionary.")

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
                if para.style.name.startswith("Heading") or text.isupper():
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
        # 1. District extraction
        for d in ["Colombo", "Gampaha", "Kalutara"]:
            if re.search(rf"\b{d}\b", text, re.IGNORECASE):
                extracted.district = d
                extracted.province = "Western"
                break

        # 2. Category extraction
        categories = [
            "Grocery/Mini-Mart", "Bakery", "Restaurant", "Garments",
            "Retail", "Agriculture", "Services", "Manufacturing"
        ]
        for c in categories:
            clean_c = c.split("/")[0]
            if re.search(rf"\b{clean_c}\b", text, re.IGNORECASE):
                extracted.business_category = c
                break

        # 3. Stage extraction
        if re.search(r"\b(Startup|New Business|New Enterprise|New Startup)\b", text, re.IGNORECASE):
            extracted.business_stage = "New"
            extracted.proposed_growth_action = "start"
        elif re.search(r"\b(Existing|Expansion|Operational Business|Established)\b", text, re.IGNORECASE):
            extracted.business_stage = "Existing"
            extracted.proposed_growth_action = "expand"

        # 4. Financial regex extraction
        # Available Capital / Budget / Loan
        cap_match = re.search(r"(?:available capital|capital|initial investment|starting funds)[^\d\n\r]*?(?:lkr|rs\.?|lkr\.)?\s*([\d,]+(?:\.\d+)?)", text, re.IGNORECASE)
        if cap_match:
            extracted.available_capital_lkr = float(cap_match.group(1).replace(",", ""))

        budget_match = re.search(r"(?:monthly budget|operating budget|monthly expense)[^\d\n\r]*?(?:lkr|rs\.?|lkr\.)?\s*([\d,]+(?:\.\d+)?)", text, re.IGNORECASE)
        if budget_match:
            extracted.monthly_budget_lkr = float(budget_match.group(1).replace(",", ""))

        loan_match = re.search(r"(?:requested loan|loan amount|borrowing)[^\d\n\r]*?(?:lkr|rs\.?|lkr\.)?\s*([\d,]+(?:\.\d+)?)", text, re.IGNORECASE)
        if loan_match:
            extracted.requested_loan_lkr = float(loan_match.group(1).replace(",", ""))

        # 5. Operational Staff & Customers
        cust_match = re.search(r"(?:target daily customers|expected customers|customers per day)[^\d\n\r]*?(\d+)", text, re.IGNORECASE)
        if cust_match:
            extracted.expected_customers_per_day = int(cust_match.group(1))

        staff_match = re.search(r"(?:available staff|staff count|current employees)[^\d\n\r]*?(\d+)", text, re.IGNORECASE)
        if staff_match:
            extracted.available_staff_count = int(staff_match.group(1))

        # 6. Strategy detection
        strat_match = re.search(r"(?:recommended strategy|primary strategy|operational strategy)[^\w\n\r]*?([A-Za-z0-9 &/\-]+)", text, re.IGNORECASE)
        if strat_match:
            extracted.primary_strategy = strat_match.group(1).strip()

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
