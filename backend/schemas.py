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
    
    # Financial Inputs (Required user input)
    available_capital_lkr: float = Field(..., ge=0, examples=[800000.0])
    monthly_budget_lkr: float = Field(..., ge=0, examples=[150000.0])
    expected_price_lkr: float = Field(..., gt=0, examples=[350.0])
    
    # Market & Operations Inputs (Required user input)
    expected_customers_per_day: int = Field(..., ge=0, examples=[45])
    competition_level: str = Field(..., examples=["Moderate"])
    customer_demand_score: int = Field(..., ge=1, le=100, examples=[75])
    entrepreneur_experience_years: int = Field(..., ge=0, examples=[4])
    available_staff_count: int = Field(..., ge=0, examples=[3])
    
    # Operational Readiness Scores 1-5 (Required user input)
    location_suitability_score: int = Field(..., ge=1, le=5, examples=[4])
    available_equipment_score: int = Field(..., ge=1, le=5, examples=[4])
    required_equipment_score: int = Field(..., ge=1, le=5, examples=[4])
    supplier_availability_score: int = Field(..., ge=1, le=5, examples=[5])

    # Conditional / Optional / System-Derived Fields
    loan_amount_lkr: Optional[float] = Field(default=0.0, ge=0, examples=[200000.0])
    initial_inventory_cost_lkr: Optional[float] = Field(default=0.0, ge=0, examples=[180000.0])
    required_staff_count: Optional[int] = Field(default=None, ge=0, examples=[3])
    expected_operating_days_per_month: Optional[int] = Field(default=26, ge=1, le=31, examples=[26])
    province: Optional[str] = Field(default=None, examples=["Western"])
    proposed_action: Optional[str] = Field(default=None, examples=["Establish New Commercial Enterprise"])

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
        mode="before"
    )
    def validate_floats(cls, v, info):
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
        if parsed < 0 and info.field_name == "expected_price_lkr":
            raise ValueError(f"Expected price must be a valid positive number.")
        return parsed

    @field_validator(
        "expected_customers_per_day", "customer_demand_score",
        "expected_operating_days_per_month", "entrepreneur_experience_years",
        "location_suitability_score", "available_staff_count",
        "required_staff_count", "available_equipment_score",
        "required_equipment_score", "supplier_availability_score",
        mode="before"
    )
    def validate_ints(cls, v, info):
        # System-derived or optional fields
        if info.field_name == "expected_operating_days_per_month":
            if v is None or (isinstance(v, str) and not v.strip()):
                return 26
            return int(round(parse_clean_numeric(v, 26.0)))
        if info.field_name == "required_staff_count":
            if v is None or (isinstance(v, str) and not v.strip()):
                return None
            return int(round(parse_clean_numeric(v, 0.0)))

        # Required fields must NOT be missing or empty string
        if v is None or (isinstance(v, str) and not v.strip()):
            label = info.field_name.replace("_", " ").title()
            raise ValueError(f"{label} is required.")

        return int(round(parse_clean_numeric(v, 0.0)))


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
