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
    Coerces and parses all numeric fields safely to prevent NaN errors.
    """
    business_stage: str = Field(default="new_startup", example="new_startup")
    business_category: str = Field(default="Grocery / Mini-Mart", example="Grocery / Mini-Mart")
    district: str = Field(default="Colombo", example="Colombo")
    province: str = Field(default="Western", example="Western")
    location_type: str = Field(default="Commercial Hub", example="Suburban Commercial Hub")
    proposed_action: str = Field(default="Establish New Business", example="Establish New Commercial Enterprise")

    available_capital_lkr: float = Field(default=500000.0, ge=0, example=800000.0)
    loan_amount_lkr: float = Field(default=0.0, ge=0, example=200000.0)
    monthly_budget_lkr: float = Field(default=100000.0, ge=0, example=150000.0)
    initial_inventory_cost_lkr: float = Field(default=150000.0, ge=0, example=180000.0)
    expected_price_lkr: float = Field(default=500.0, ge=0, example=350.0)

    expected_customers_per_day: int = Field(default=30, ge=0, example=45)
    competition_level: str = Field(default="Moderate", example="Moderate")
    customer_demand_score: int = Field(default=60, ge=0, le=100, example=75)
    expected_operating_days_per_month: int = Field(default=26, ge=0, le=31, example=26)

    entrepreneur_experience_years: int = Field(default=2, ge=0, example=4)
    location_suitability_score: int = Field(default=4, ge=0, le=5, example=4)
    available_staff_count: int = Field(default=2, ge=0, example=3)
    required_staff_count: int = Field(default=2, ge=0, example=3)
    available_equipment_score: int = Field(default=3, ge=0, le=5, example=4)
    required_equipment_score: int = Field(default=3, ge=0, le=5, example=4)
    supplier_availability_score: int = Field(default=4, ge=0, le=5, example=5)

    # Research Traceability Extensions
    original_business_description: Optional[str] = Field(default=None, description="Original natural language text entered by user")
    extraction_metadata: Optional[Dict[str, Any]] = Field(default=None, description="Metadata from AI intake extraction & user verification")

    @field_validator("business_stage", mode="before")
    def validate_stage(cls, v):
        s = str(v or "").strip().lower()
        if "new" in s or "start" in s:
            return "new_startup"
        return "existing"

    @field_validator(
        "available_capital_lkr", "loan_amount_lkr", "monthly_budget_lkr",
        "initial_inventory_cost_lkr", "expected_price_lkr",
        mode="before"
    )
    def validate_floats(cls, v):
        return parse_clean_numeric(v, 0.0)

    @field_validator(
        "expected_customers_per_day", "customer_demand_score",
        "expected_operating_days_per_month", "entrepreneur_experience_years",
        "location_suitability_score", "available_staff_count",
        "required_staff_count", "available_equipment_score",
        "required_equipment_score", "supplier_availability_score",
        mode="before"
    )
    def validate_ints(cls, v):
        return int(round(parse_clean_numeric(v, 0.0)))


class IntakeExtractRequest(BaseModel):
    """
    Request payload for AI Business Intake Assistant text parsing with optional context hints.
    """
    text: str = Field(..., min_length=5, example="I want to start a grocery store in Homagama with Rs. 500,000 capital.")
    business_stage: Optional[str] = Field(default="", example="new_startup")
    business_goal: Optional[str] = Field(default="", example="Establish New Business")


class IntakeConfigRequest(BaseModel):
    """
    Request payload for retrieving context-dependent field requirements.
    """
    business_stage: str = Field(..., example="existing")
    business_goal: Optional[str] = Field(default="Open New Branch", example="Open New Branch")
    business_category: Optional[str] = Field(default="Grocery / Mini-Mart", example="Grocery / Mini-Mart")


class AnalysisRecordSummary(BaseModel):
    id: str
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
