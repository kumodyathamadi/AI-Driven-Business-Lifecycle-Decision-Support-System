import re
from pydantic import BaseModel, Field, field_validator
from typing import Dict, Any, List, Optional


def parse_clean_numeric(val: Any, default: float = 0.0) -> float:
    """
    Safely parses numeric inputs, stripping currency symbols (Rs., LKR), commas, and multiplier suffixes (k, m, lakh).
    """
    if val is None or val == "":
        return default
    if isinstance(val, (int, float)):
        import math
        if math.isnan(val) or math.isinf(val):
            return default
        return float(val)
    s = str(val).strip().lower().replace(",", "").replace("lkr", "").replace("rs.", "").replace("rs", "").strip()
    if not s or s in ("nan", "none", "null"):
        return default
    try:
        if s.endswith("k") or s.endswith("thousand"):
            return float(re.sub(r"[^\d.]", "", s)) * 1000.0
        if s.endswith("m") or s.endswith("million") or s.endswith("mn"):
            return float(re.sub(r"[^\d.]", "", s)) * 1000000.0
        if "lakh" in s or "lac" in s or "lakhs" in s:
            return float(re.sub(r"[^\d.]", "", s)) * 100000.0
        return float(s)
    except Exception:
        return default


class BusinessAnalysisRequest(BaseModel):
    """
    Pydantic Input Request Validation Schema matching Component 1 features.
    Enforces strict presence of mandatory business inputs without silent defaults.
    """
    business_name: Optional[str] = Field(default=None, examples=["Waasana Grocery Shop"])
    business_stage: str = Field(..., examples=["new_startup"])
    business_category: str = Field(..., examples=["Grocery / Mini-Mart"])
    district: str = Field(..., examples=["Colombo"])
    location_type: str = Field(..., examples=["Suburban Commercial Hub"])
    
    # Financial Inputs (Required user input) - Realistic Sri Lankan SME Boundaries
    available_capital_lkr: float = Field(..., ge=10000.0, le=100000000.0, examples=[800000.0], description="LKR 10,000 to 100M")
    monthly_budget_lkr: float = Field(..., ge=5000.0, le=50000000.0, examples=[150000.0], description="LKR 5,000 to 50M")
    expected_price_lkr: float = Field(..., ge=10.0, le=250000.0, examples=[350.0], description="LKR 10 to 250k")
    
    # Market & Operations Inputs (Required user input)
    expected_customers_per_day: int = Field(..., ge=1, le=2500, examples=[45], description="1 to 2,500 patrons/day")
    competition_level: str = Field(..., examples=["Moderate"])
    customer_demand_score: int = Field(..., ge=1, le=100, examples=[75])
    entrepreneur_experience_years: int = Field(..., ge=0, le=60, examples=[4], description="0 to 60 years")
    available_staff_count: int = Field(..., ge=0, le=100, examples=[3], description="0 to 100 employees")
    
    # Operational Readiness Scores 1-5 (Required user input)
    location_suitability_score: int = Field(..., ge=1, le=5, examples=[4])
    available_equipment_score: int = Field(..., ge=1, le=5, examples=[4])
    required_equipment_score: int = Field(..., ge=1, le=5, examples=[4])
    supplier_availability_score: int = Field(..., ge=1, le=5, examples=[5])

    # Conditional / Optional / System-Derived Fields
    loan_amount_lkr: Optional[float] = Field(default=0.0, ge=0.0, le=75000000.0, examples=[200000.0], description="Up to LKR 75M")
    initial_inventory_cost_lkr: Optional[float] = Field(default=0.0, ge=0.0, le=60000000.0, examples=[180000.0], description="Up to LKR 60M")
    required_staff_count: Optional[int] = Field(default=None, ge=0, le=100, examples=[3])
    expected_operating_days_per_month: Optional[int] = Field(default=26, ge=10, le=31, examples=[26])
    province: Optional[str] = Field(default=None, examples=["Western"])
    proposed_action: Optional[str] = Field(default=None, examples=["Establish New Commercial Enterprise"])

    # Optional Supplementary Growth Fields (for Existing Business Growth Plan)
    current_monthly_revenue_lkr: Optional[float] = Field(default=None, ge=0.0, le=100000000.0, examples=[450000.0])
    current_monthly_net_profit_lkr: Optional[float] = Field(default=None, ge=-20000000.0, le=40000000.0, examples=[75000.0])
    existing_monthly_debt_obligations_lkr: Optional[float] = Field(default=None, ge=0.0, le=20000000.0, examples=[25000.0])
    business_age_years: Optional[float] = Field(default=None, ge=0.0, le=80.0, examples=[3.5])
    expansion_capex_lkr: Optional[float] = Field(default=None, ge=0.0, le=100000000.0, examples=[350000.0])
    target_payback_months: Optional[int] = Field(default=None, ge=1, le=120, examples=[18])
    current_capacity_utilization_pct: Optional[float] = Field(default=None, ge=0.0, le=100.0, examples=[85.0])
    expansion_type: Optional[str] = Field(default=None, examples=["Physical Branch Expansion"])

    # Optional Narrative & Report Metadata Fields
    business_model: Optional[str] = Field(default=None, examples=["B2C (Business to Consumer)"])
    address: Optional[str] = Field(default=None, examples=["No. 45, High Level Road, Homagama"])
    additional_description: Optional[str] = Field(default=None, description="Detailed business concept or expansion description")
    marketing_details: Optional[str] = Field(default=None, description="Marketing and customer acquisition details")
    competitor_information: Optional[str] = Field(default=None, description="Local competition dynamics")
    financial_overview: Optional[str] = Field(default=None, description="Additional financial overview notes")

    # Research Traceability Extensions
    original_business_description: Optional[str] = Field(default=None, description="Original natural language text entered by user")
    extraction_metadata: Optional[Dict[str, Any]] = Field(default=None, description="Metadata from AI intake extraction & user verification")

    @field_validator("business_stage", mode="before")
    def validate_stage(cls, v):
        if v is None or not str(v).strip():
            raise ValueError("Business Stage is required.")
        s = str(v).strip().lower()
        if "new" in s or "start" in s:
            return "new_startup"
        return "existing"

    @field_validator("business_category", "district", "location_type", "competition_level", mode="before")
    def validate_required_strings(cls, v, info):
        if v is None or not str(v).strip():
            label = info.field_name.replace("_", " ").title()
            raise ValueError(f"{label} is required and cannot be empty.")
        return str(v).strip()

    @field_validator(
        "available_capital_lkr", "loan_amount_lkr", "monthly_budget_lkr",
        "initial_inventory_cost_lkr", "expected_price_lkr",
        "current_monthly_revenue_lkr", "current_monthly_net_profit_lkr",
        "existing_monthly_debt_obligations_lkr", "business_age_years",
        "expansion_capex_lkr", "current_capacity_utilization_pct",
        mode="before"
    )
    def validate_floats(cls, v, info):
        # Optional supplementary growth fields return None if empty
        if info.field_name in (
            "current_monthly_revenue_lkr", "current_monthly_net_profit_lkr",
            "existing_monthly_debt_obligations_lkr", "business_age_years",
            "expansion_capex_lkr", "current_capacity_utilization_pct"
        ):
            if v is None or (isinstance(v, str) and not v.strip()):
                return None
            return parse_clean_numeric(v, 0.0)

        # Conditional fields default to 0.0 if not provided
        if info.field_name in ("loan_amount_lkr", "initial_inventory_cost_lkr"):
            if v is None or (isinstance(v, str) and not v.strip()):
                return 0.0
            return parse_clean_numeric(v, 0.0)

        # Required fields must NOT be missing or empty string
        if v is None or (isinstance(v, str) and not v.strip()):
            label = info.field_name.replace("_", " ").title()
            raise ValueError(f"{label} is required.")
        
        parsed = parse_clean_numeric(v, -1.0)

        # Enforce realistic SME boundaries with descriptive messages
        if info.field_name == "available_capital_lkr":
            if parsed < 10000:
                raise ValueError("Available Capital must be at least LKR 10,000.")
            if parsed > 100000000:
                raise ValueError(f"Available Capital of LKR {parsed:,.0f} exceeds the realistic Sri Lankan SME ceiling of LKR 100,000,000 (100 Million).")

        elif info.field_name == "monthly_budget_lkr":
            if parsed < 5000:
                raise ValueError("Monthly Operating Budget must be at least LKR 5,000.")
            if parsed > 50000000:
                raise ValueError(f"Monthly Operating Budget of LKR {parsed:,.0f} exceeds the realistic SME ceiling of LKR 50,000,000.")

        elif info.field_name == "expected_price_lkr":
            if parsed < 10:
                raise ValueError("Average Customer Spend / Expected Price must be at least LKR 10.")
            if parsed > 250000:
                raise ValueError(f"Average Customer Spend of LKR {parsed:,.0f} exceeds typical retail SME transaction ceiling of LKR 250,000.")

        elif info.field_name == "loan_amount_lkr" and parsed > 75000000:
            raise ValueError(f"Requested Loan Amount of LKR {parsed:,.0f} exceeds maximum SME credit threshold (LKR 75,000,000).")

        elif info.field_name == "initial_inventory_cost_lkr" and parsed > 60000000:
            raise ValueError(f"Initial Inventory Cost of LKR {parsed:,.0f} exceeds maximum SME inventory threshold (LKR 60,000,000).")

        return parsed

    @field_validator(
        "expected_customers_per_day", "customer_demand_score",
        "expected_operating_days_per_month", "entrepreneur_experience_years",
        "location_suitability_score", "available_staff_count",
        "required_staff_count", "available_equipment_score",
        "required_equipment_score", "supplier_availability_score",
        "target_payback_months",
        mode="before"
    )
    def validate_ints(cls, v, info):
        if info.field_name == "target_payback_months":
            if v is None or (isinstance(v, str) and not v.strip()):
                return None
            val = int(round(parse_clean_numeric(v, 0.0)))
            if val < 1 or val > 120:
                raise ValueError("Target payback period must be between 1 and 120 months.")
            return val

        # System-derived or optional fields
        if info.field_name == "expected_operating_days_per_month":
            if v is None or (isinstance(v, str) and not v.strip()):
                return 26
            val = int(round(parse_clean_numeric(v, 26.0)))
            if val < 10 or val > 31:
                raise ValueError("Operating days per month must be between 10 and 31 days.")
            return val

        if info.field_name == "required_staff_count":
            if v is None or (isinstance(v, str) and not v.strip()):
                return None
            val = int(round(parse_clean_numeric(v, 0.0)))
            if val < 0 or val > 100:
                raise ValueError("Required staff count must be between 0 and 100.")
            return val

        # Required fields must NOT be missing or empty string
        if v is None or (isinstance(v, str) and not v.strip()):
            label = info.field_name.replace("_", " ").title()
            raise ValueError(f"{label} is required.")

        parsed = int(round(parse_clean_numeric(v, 0.0)))

        if info.field_name == "expected_customers_per_day":
            if parsed < 1:
                raise ValueError("Expected daily customers must be at least 1.")
            if parsed > 2500:
                raise ValueError(f"Expected daily customers ({parsed:,}) exceeds physical SME storefront capacity (2,500/day).")

        elif info.field_name == "entrepreneur_experience_years":
            if parsed < 0:
                raise ValueError("Entrepreneur Experience cannot be negative.")
            if parsed > 60:
                raise ValueError(f"Entrepreneur Experience ({parsed} years) cannot exceed 60 years.")

        elif info.field_name == "available_staff_count":
            if parsed < 0:
                raise ValueError("Available Staff Count cannot be negative.")
            if parsed > 100:
                raise ValueError(f"Available Staff Count ({parsed}) cannot exceed 100.")

        return parsed


class IntakeExtractRequest(BaseModel):
    """
    Request payload for AI Business Intake Assistant text parsing with optional context hints.
    """
    text: str = Field(..., min_length=5, examples=["I want to start a grocery store in Homagama with Rs. 500,000 capital."])
    business_stage: Optional[str] = Field(default="", examples=["new_startup"])
    business_goal: Optional[str] = Field(default="", examples=["Establish New Business"])


class IntakeConfigRequest(BaseModel):
    """
    Request payload for retrieving context-dependent field requirements.
    """
    business_stage: str = Field(..., examples=["existing"])
    business_goal: Optional[str] = Field(default="Open New Branch", examples=["Open New Branch"])
    business_category: Optional[str] = Field(default="Grocery / Mini-Mart", examples=["Grocery / Mini-Mart"])


class IntakeChatMessage(BaseModel):
    role: str = Field(..., examples=["user", "assistant"])
    content: str = Field(..., examples=["I want to start a grocery shop in Homagama."])


class IntakeChatRequest(BaseModel):
    message: str = Field(..., min_length=1, examples=["I want to start a grocery shop in Homagama with 800k capital."])
    history: Optional[List[IntakeChatMessage]] = Field(default=[], description="Previous conversation turns")
    business_stage: Optional[str] = Field(default="New", examples=["New", "Existing"])
    business_goal: Optional[str] = Field(default=None, examples=["Establish New Business", "Open New Branch"])
    current_extracted_fields: Optional[Dict[str, Any]] = Field(default=None, description="Previously accumulated extracted fields")


class IntakeChatResponse(BaseModel):
    reply: str
    context: Dict[str, Any]
    extracted_fields: Dict[str, Any]
    summary: Dict[str, Any]
    missing_required_fields: List[str]
    missing_optional_fields: List[str]
    ready_for_form: bool


class AnalysisRecordSummary(BaseModel):
    id: str
    business_name: Optional[str] = None
    business_stage: str
    stage_label: str
    business_category: str
    district: str
    feasibility_label: str
    predicted_label: str
    confidence_score: float
    confidence_percent: str
    available_capital_lkr: float
    expected_customers_per_day: int
    original_business_description: Optional[str] = None
    created_at: Optional[str] = None


class PaginatedRecordsResponse(BaseModel):
    total_count: int
    page: int
    page_size: int
    items: List[AnalysisRecordSummary]


class HealthCheckResponse(BaseModel):
    status: str
    component: str
    version: str
    model_loaded: bool


class AdoptStrategyPayload(BaseModel):
    strategy_id: str = Field(..., description="ID or name of strategy to adopt (e.g. STRAT_02)")
