# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import date, datetime


class BusinessAnalysisRequest(BaseModel):

    """
    Pydantic Input Request Validation Schema matching Component 1 features.
    Includes optional traceability fields for natural language intake & verification.
    """
    business_stage: str = Field(default="New", example="New")
    business_category: str = Field(default="Retail", example="Bakery")
    district: str = Field(default="Colombo", example="Colombo")
    province: str = Field(default="Western", example="Western")
    location_type: str = Field(default="Commercial Hub", example="Suburban Commercial Hub")
    proposed_action: str = Field(default="Start New Business", example="Establish New Bakery Branch")

    available_capital_lkr: float = Field(default=500000.0, ge=0, example=800000.0)
    loan_amount_lkr: float = Field(default=0.0, ge=0, example=200000.0)
    monthly_budget_lkr: float = Field(default=100000.0, ge=0, example=150000.0)
    initial_inventory_cost_lkr: float = Field(default=150000.0, ge=0, example=180000.0)
    expected_price_lkr: float = Field(default=500.0, ge=0, example=350.0)

    expected_customers_per_day: int = Field(default=30, ge=1, example=45)
    competition_level: str = Field(default="Moderate", example="Moderate")
    customer_demand_score: int = Field(default=60, ge=1, le=100, example=75)
    expected_operating_days_per_month: int = Field(default=26, ge=1, le=31, example=26)

    entrepreneur_experience_years: int = Field(default=2, ge=0, example=4)
    location_suitability_score: int = Field(default=4, ge=1, le=5, example=4)
    available_staff_count: int = Field(default=2, ge=0, example=3)
    required_staff_count: int = Field(default=2, ge=1, example=3)
    available_equipment_score: int = Field(default=3, ge=1, le=5, example=4)
    required_equipment_score: int = Field(default=3, ge=1, le=5, example=4)
    supplier_availability_score: int = Field(default=4, ge=1, le=5, example=5)

    # Research Traceability Extensions
    original_business_description: Optional[str] = Field(default=None, description="Original natural language text entered by user")
    extraction_metadata: Optional[Dict[str, Any]] = Field(default=None, description="Metadata from AI intake extraction & user verification")


class IntakeExtractRequest(BaseModel):
    """
    Request payload for AI Business Intake Assistant text parsing with optional context hints.
    """
    text: str = Field(..., min_length=5, example="I want to start a small bakery in Homagama with Rs. 500,000 capital.")
    business_stage: Optional[str] = Field(default="", example="New")
    business_goal: Optional[str] = Field(default="", example="Establish New Business")


class IntakeConfigRequest(BaseModel):
    """
    Request payload for retrieving context-dependent field requirements.
    """
    business_stage: str = Field(..., example="Existing")
    business_goal: Optional[str] = Field(default="Open New Branch", example="Open New Branch")
    business_category: Optional[str] = Field(default="Bakery", example="Bakery")


class HealthCheckResponse(BaseModel):
    status: str
    component: str
    version: str
    model_loaded: bool


# =========================================================================
# Component 3: AI-Based Financial Monitoring & Tax Compliance Schemas
# =========================================================================

class InvoiceData(BaseModel):
    invoice_number: str = Field(..., description="Invoice number")
    date_of_supply: date = Field(..., description="Date of supply (YYYY-MM-DD)")
    sub_total: float = Field(..., ge=0.0, description="Amount before tax (Net amount)")
    tax_amount: float = Field(..., ge=0.0, description="Total tax amount")
    total_amount: float = Field(..., ge=0.0, description="Total payable amount (Subtotal + Tax)")
    currency: str = Field("LKR", description="Currency code (e.g. LKR, USD, GBP, AUD)")
    tax_category: Optional[str] = Field(None, description="Tax category (e.g. Standard, 18%, Zero-Rated, 0%, Exempt)")
    supplier_name: Optional[str] = Field(None, description="Supplier / Taxpayer name")
    supplier_tin: Optional[str] = Field(None, description="Supplier / Taxpayer TIN number (9 or 10 digits)")
    supplier_vat_number: Optional[str] = Field(None, description="Supplier VAT registration number")
    customer_name: Optional[str] = Field(None, description="Customer / Buyer name")
    customer_tin: Optional[str] = Field(None, description="Customer TIN number")
    exchange_rate: Optional[float] = Field(1.0, gt=0.0, description="Exchange rate to LKR for foreign currencies")
    description_of_supply: Optional[str] = Field("General Supply", description="Nature / Description of goods or services")


class TaxCalculationResult(BaseModel):
    invoice_number: str
    date_of_supply: date
    customer_tin: Optional[str]
    customer_name: Optional[str]
    original_currency: str
    exchange_rate: float
    schedule_7_cage: str  # "Cage A", "Cage D", "Cage E"
    cage_description: str
    applied_tax_rate: float  # 18.0, 0.0, 0.0
    base_value_lkr: float
    tax_amount_lkr: float
    total_value_lkr: float
    description_of_supply: str


class CageSummary(BaseModel):
    cage_code: str
    cage_name: str
    tax_rate: float
    invoice_count: int
    total_base_value_lkr: float
    total_tax_amount_lkr: float
    total_value_lkr: float


class Form2540Summary(BaseModel):
    tax_period: str
    taxpayer_tin: str
    taxpayer_name: Optional[str] = None
    cage_a_standard: CageSummary
    cage_d_zero_rated: CageSummary
    cage_e_exempt: CageSummary
    total_invoices_count: int
    grand_total_turnover_lkr: float
    grand_total_output_tax_lkr: float


class Schedule7BatchRequest(BaseModel):
    taxpayer_tin: str = Field(..., description="Taxpayer Identification Number (TIN) of the declaring entity")
    taxpayer_name: Optional[str] = Field(None, description="Registered legal name of the declaring taxpayer")
    tax_period: str = Field(..., description="Tax taxable period code (e.g. '2024-Q1', '202410', '2411')")
    invoices: List[InvoiceData] = Field(..., min_length=1, description="List of validated invoice items to process")


class BatchTaxProcessResponse(BaseModel):
    status: str = "success"
    message: str
    tax_period: str
    taxpayer_tin: str
    summary: Form2540Summary
    tax_analysis: List[TaxCalculationResult]


# =========================================================================
# Component 3: Operational Fraud & Anomaly Detection Schemas
# =========================================================================

class StockDepletionLog(BaseModel):
    item_id: str = Field(..., description="Unique SKU / inventory product identifier")
    quantity_depleted: float = Field(..., ge=0.0, description="Physical units deducted from inventory")
    unit_cost: float = Field(..., ge=0.0, description="Standard physical unit cost at depletion (LKR)")
    depletion_timestamp: datetime = Field(..., description="Timestamp of physical inventory deduction")
    warehouse_location: Optional[str] = Field("Main Warehouse", description="Storage depot / warehouse identifier")
    batch_number: Optional[str] = Field(None, description="Batch / lot tracking identifier")


class FraudCheckRequest(BaseModel):
    transaction_id: str = Field(..., description="Unique transaction ID (e.g. TXN-2025-0626-184)")
    invoice_data: InvoiceData = Field(..., description="Parsed financial invoice payload")
    item_id: Optional[str] = Field("ITEM-GEN-01", description="Associated inventory product identifier")
    quantity_invoiced: float = Field(1.0, gt=0.0, description="Units billed on financial invoice")
    stock_depletion_log: Optional[StockDepletionLog] = Field(None, description="Corresponding physical stock entry")
    vendor_category: Optional[str] = Field("General", description="Vendor / expense category")
    transaction_time: Optional[datetime] = Field(None, description="Exact timestamp of transaction occurrence")
    is_duplicate_candidate: Optional[bool] = Field(False, description="Flag indicating potential duplicate velocity")
    time_since_prior_transaction_mins: Optional[float] = Field(None, description="Minutes since similar transaction")


class FraudFlagReason(BaseModel):
    code: str = Field(..., description="Machine-readable violation code (e.g. STOCK_DISCREPANCY, OFF_HOURS)")
    message: str = Field(..., description="Human-readable explanation of why this was flagged")
    severity: str = Field(..., description="HIGH, MEDIUM, or LOW")


class FraudRiskAssessment(BaseModel):
    transaction_id: str
    decision: str  # "PASS" or "FAIL"
    risk_score: int  # 0 to 100 (e.g. 92)
    risk_level: str  # "LOW", "MEDIUM", "HIGH"
    is_anomaly: bool
    anomaly_score: float
    flagged_reasons: List[FraudFlagReason]
    suggested_action: str  # "Direct to Secure Storage" or "Route to Human Review Queue"
    review_options: List[str]  # ["Approve as valid", "Reject transaction", "Correct & resubmit"]
    analyzed_timestamp: datetime = Field(default_factory=datetime.utcnow)


class ReviewActionRequest(BaseModel):
    transaction_id: str = Field(..., description="Flagged transaction identifier")
    action: str = Field(..., description="Decision action: 'approve', 'reject', or 'resubmit'")
    reviewer_notes: Optional[str] = Field(None, description="Auditor justification or notes")
    reviewer_id: Optional[str] = Field("auditor_01", description="ID of the reviewing officer")


class ReviewActionResponse(BaseModel):
    status: str = "success"
    transaction_id: str
    action_taken: str
    reviewer_notes: Optional[str]
    resolved_at: datetime = Field(default_factory=datetime.utcnow)

