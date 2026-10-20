# component3_backend/schemas.py
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List, Dict, Any
from datetime import date, datetime

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
    is_tax_invoice: Optional[bool] = Field(True, description="Whether document is explicitly identified as a Tax Invoice")
    vat_type: Optional[str] = Field("OUTPUT_VAT", description="'OUTPUT_VAT' (Sales) or 'INPUT_VAT' (Purchases)")
    target_schedule: Optional[str] = Field("Schedule 1", description="Assigned RAMIS Schedule ('Schedule 1', 'Schedule 2', 'Schedule 7', etc.)")

    @field_validator('date_of_supply', mode='before')
    @classmethod
    def parse_flexible_date(cls, v: Any) -> Any:
        if isinstance(v, date):
            return v
        if isinstance(v, str):
            v_str = v.strip()
            # Try supported date formats (ISO, DD/MM/YYYY, DD-MM-YYYY, etc.)
            for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%d/%m/%y', '%d-%m-%y', '%Y/%m/%d', '%d %b %Y', '%d %B %Y'):
                try:
                    return datetime.strptime(v_str, fmt).date()
                except ValueError:
                    pass
        return v


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
    vat_type: str = "OUTPUT_VAT"
    target_schedule: str = "Schedule 1"
    is_tax_invoice: bool = True


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


class GlobalTaxConfig(BaseModel):
    company_tin: str = Field(..., min_length=1, description="Company Taxpayer Identification Number (TIN) - Strictly Mandatory")
    company_name: str = Field(..., min_length=1, description="Registered Legal Business / Company Name - Strictly Mandatory")
    tax_period: str = Field("2026-Q1", min_length=1, description="Tax assessment period (e.g. '2026-Q1', '2026-02')")

    @field_validator('company_tin')
    @classmethod
    def validate_tin(cls, v: str) -> str:
        s = str(v).strip()
        if not s:
            raise ValueError("Company TIN Number is strictly mandatory and cannot be empty.")
        return s

    @field_validator('company_name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        s = str(v).strip()
        if not s:
            raise ValueError("Company Name is strictly mandatory and cannot be empty.")
        return s


class ScheduleBatchRequest(BaseModel):
    schedule_type: str = Field("Schedule 7", description="RAMIS Schedule type ('Schedule 1' through 'Schedule 7')")
    company_tin: Optional[str] = Field(None, description="Company Taxpayer Identification Number (TIN) - Mandatory")
    company_name: Optional[str] = Field(None, description="Registered Legal Business / Company Name - Mandatory")
    tax_period: str = Field(..., description="Tax taxable period code (e.g. '2026-Q1', '2026-02')")
    taxpayer_tin: Optional[str] = Field(None, description="Taxpayer TIN (alias for company_tin)")
    taxpayer_name: Optional[str] = Field(None, description="Taxpayer Name (alias for company_name)")
    invoices: List[InvoiceData] = Field(default_factory=list, description="List of validated invoice items to process")

    @model_validator(mode='before')
    @classmethod
    def sync_company_identifiers(cls, data: Any) -> Any:
        if isinstance(data, dict):
            c_tin = str(data.get("company_tin") or data.get("taxpayer_tin") or "").strip()
            c_name = str(data.get("company_name") or data.get("taxpayer_name") or "").strip()
            if not c_tin:
                raise ValueError("Company TIN Number is strictly mandatory for generating RAMIS schedules.")
            if not c_name:
                raise ValueError("Company Name is strictly mandatory for generating RAMIS schedules.")
            data["company_tin"] = c_tin
            data["taxpayer_tin"] = c_tin
            data["company_name"] = c_name
            data["taxpayer_name"] = c_name
        return data


class Schedule7BatchRequest(BaseModel):
    taxpayer_tin: Optional[str] = Field(None, description="Taxpayer Identification Number (TIN) of the declaring entity - Mandatory")
    taxpayer_name: Optional[str] = Field(None, description="Registered legal name of the declaring taxpayer - Mandatory")
    company_tin: Optional[str] = Field(None, description="Company Taxpayer Identification Number (TIN)")
    company_name: Optional[str] = Field(None, description="Registered Legal Business / Company Name")
    tax_period: str = Field(..., description="Tax taxable period code (e.g. '2026-Q1', '2026-02')")
    invoices: List[InvoiceData] = Field(..., min_length=1, description="List of validated invoice items to process")

    @model_validator(mode='before')
    @classmethod
    def sync_company_identifiers(cls, data: Any) -> Any:
        if isinstance(data, dict):
            c_tin = str(data.get("company_tin") or data.get("taxpayer_tin") or "").strip()
            c_name = str(data.get("company_name") or data.get("taxpayer_name") or "").strip()
            if not c_tin:
                raise ValueError("Company TIN Number is strictly mandatory for generating RAMIS schedules.")
            if not c_name:
                raise ValueError("Company Name is strictly mandatory for generating RAMIS schedules.")
            data["company_tin"] = c_tin
            data["taxpayer_tin"] = c_tin
            data["company_name"] = c_name
            data["taxpayer_name"] = c_name
        return data


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


# =========================================================================
# Component 3: Context-Aware Document OCR Amount Extraction Schemas
# =========================================================================

class OCRExtractionRequest(BaseModel):
    document_text: str = Field(..., description="Raw text or OCR string output from scanned receipt/invoice")
    document_id: Optional[str] = Field("DOC-001", description="Document reference ID")
    file_type: Optional[str] = Field("text", description="File type: 'text', 'pdf', or 'image'")


class ExtractedAmountDetails(BaseModel):
    sub_total: float = Field(..., description="Extracted net base amount")
    tax_amount: float = Field(..., description="Extracted tax / VAT amount")
    total_amount: float = Field(..., description="Extracted final total payable amount")
    currency: str = Field("LKR", description="Currency symbol / code")
    tax_category: str = Field("Standard", description="Detected tax category (Standard 18%, Zero-Rated, Exempt)")
    invoice_number: str = Field(..., description="Extracted or detected invoice number")
    invoice_date: str = Field(..., description="Extracted invoice date")
    customer_name: Optional[str] = Field("Extracted Invoice Client", description="Extracted customer / consignee name")
    customer_tin: Optional[str] = Field("1146888607000", description="Extracted customer / consignee TIN")
    is_math_valid: bool = Field(..., description="Whether Subtotal + Tax == Total")
    math_difference: float = Field(..., description="Numerical difference in mathematical consistency")
    supplier_name: Optional[str] = Field(None, description="Extracted supplier / vendor name")
    supplier_tin: Optional[str] = Field(None, description="Extracted supplier TIN")
    description: Optional[str] = Field("General Supply", description="Description of goods or services")
    is_tax_invoice: bool = Field(True, description="Whether document is identified as a Tax Invoice")
    vat_type: str = Field("OUTPUT_VAT", description="'OUTPUT_VAT' (Sales) or 'INPUT_VAT' (Purchases)")
    target_schedule: str = Field("Schedule 1", description="Target RAMIS schedule (e.g. 'Schedule 1', 'Schedule 2', 'Schedule 7')")


class StepLog(BaseModel):
    step: str
    details: str


class OCRExtractionResponse(BaseModel):
    status: str = "success"
    confidence_score: float = Field(..., description="Extraction confidence score (0 to 100%)")
    decision: str = Field(..., description="'AUTO_PASS' or 'REVIEW_REQUIRED'")
    routing: str = Field(..., description="Target routing pipeline")
    review_reasons: List[str] = Field(default_factory=list, description="Specific reasons why review is required")
    extracted_amounts: ExtractedAmountDetails
    step_logs: List[StepLog]
    rejected_decoys_count: int
    sample_decoys: List[Dict[str, Any]]


class IntegratedPipelineRequest(BaseModel):
    document_text: Optional[str] = Field(None, description="Raw OCR invoice text if available")
    item_id: Optional[str] = Field("ITEM-GEN-01", description="Associated inventory product identifier")
    quantity_invoiced: Optional[float] = Field(1.0, gt=0.0)
    stock_depletion_log: Optional[StockDepletionLog] = Field(None, description="Physical inventory deduction entry")
    transaction_time: Optional[datetime] = Field(None, description="Timestamp of transaction")


class IntegratedPipelineResponse(BaseModel):
    status: str = "success"
    ocr_result: OCRExtractionResponse
    tax_result: Optional[TaxCalculationResult] = None
    fraud_assessment: Optional[FraudRiskAssessment] = None
    final_pipeline_decision: str  # "AUTO_APPROVED" or "HELD_FOR_REVIEW"