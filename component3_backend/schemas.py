# component3_backend/schemas.py
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date

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