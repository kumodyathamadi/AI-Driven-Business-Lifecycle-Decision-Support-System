# component3_backend/tax_engine.py
import csv
import io
from typing import Tuple, List
from schemas import (
    InvoiceData,
    TaxCalculationResult,
    CageSummary,
    Form2540Summary,
    Schedule7BatchRequest,
    ScheduleBatchRequest,
    BatchTaxProcessResponse,
    GlobalTaxConfig
)

# Active Global RAMIS Entity & Period Configuration
_ACTIVE_COMPANY_CONFIG = {
    "company_tin": "102938475",
    "company_name": "STAR FLORA (PVT) LTD",
    "tax_period": "2026-Q1"
}

def get_company_config() -> dict:
    """Returns the current globally configured company TIN, name, and active period."""
    return _ACTIVE_COMPANY_CONFIG.copy()

def update_company_config(config_data: dict) -> dict:
    """Updates the globally configured company TIN, name, and active tax period."""
    if "company_tin" in config_data and config_data["company_tin"]:
        _ACTIVE_COMPANY_CONFIG["company_tin"] = str(config_data["company_tin"]).strip()
    if "company_name" in config_data and config_data["company_name"]:
        _ACTIVE_COMPANY_CONFIG["company_name"] = str(config_data["company_name"]).strip()
    if "tax_period" in config_data and config_data["tax_period"]:
        _ACTIVE_COMPANY_CONFIG["tax_period"] = str(config_data["tax_period"]).strip()
    return _ACTIVE_COMPANY_CONFIG.copy()

STANDARD_VAT_RATE = 18.0

def categorize_and_calculate_tax(invoice: InvoiceData) -> TaxCalculationResult:
    """
    Categorizes an invoice according to Sri Lankan Inland Revenue Department (IRD)
    RAMIS VAT Schedule 7 rules and computes LKR normalized values.
    
    Cages:
      - Cage A: Standard 18% VAT Supplies
      - Cage D: Zero-Rated Supplies / Direct & Indirect Exports (0% VAT)
      - Cage E: Exempt Supplies (0% VAT, No input tax credit)
    """
    # 1. Foreign currency conversion using exchange rate (defaults to 1.0)
    rate = float(invoice.exchange_rate) if (invoice.exchange_rate and invoice.exchange_rate > 0) else 1.0
    
    base_value_lkr = round(invoice.sub_total * rate, 2)
    tax_amount_lkr = round(invoice.tax_amount * rate, 2)
    total_value_lkr = round(invoice.total_amount * rate, 2)
    
    cat = (invoice.tax_category or "").strip().lower()
    currency = invoice.currency.strip().upper()
    
    # 2. RAMIS Schedule 7 Rule Engine Logic
    # Case D: Zero-Rated Exports (e.g. Overseas services, export shipments)
    if cat in ["0%", "0", "zero-rated", "zero rated", "zerorated", "export", "zero"] or (currency != "LKR" and invoice.tax_amount == 0 and cat != "exempt"):
        cage = "Cage D"
        cage_name = "Zero-Rated Supplies (Exports)"
        applied_rate = 0.0
        tax_amount_lkr = 0.0
        total_value_lkr = base_value_lkr
        
    # Case E: Exempt Supplies (e.g. Educational, healthcare, specific financial services)
    elif cat in ["exempt", "exempted", "non-taxable", "non taxable"] or (invoice.tax_amount == 0 and cat not in ["0%", "zero-rated"]):
        cage = "Cage E"
        cage_name = "Exempt Supplies"
        applied_rate = 0.0
        tax_amount_lkr = 0.0
        total_value_lkr = base_value_lkr
        
    # Case A: Standard Rated Supplies (18% VAT)
    else:
        cage = "Cage A"
        cage_name = "Standard Rated Supplies (18% VAT)"
        applied_rate = STANDARD_VAT_RATE
        
        # If tax_amount was missing or 0 but category is Standard, recalculate at 18%
        if tax_amount_lkr == 0 and base_value_lkr > 0:
            tax_amount_lkr = round(base_value_lkr * (STANDARD_VAT_RATE / 100.0), 2)
            total_value_lkr = round(base_value_lkr + tax_amount_lkr, 2)
            
    return TaxCalculationResult(
        invoice_number=invoice.invoice_number,
        date_of_supply=invoice.date_of_supply,
        customer_tin=invoice.customer_tin,
        customer_name=invoice.customer_name,
        original_currency=currency,
        exchange_rate=rate,
        schedule_7_cage=cage,
        cage_description=cage_name,
        applied_tax_rate=applied_rate,
        base_value_lkr=base_value_lkr,
        tax_amount_lkr=tax_amount_lkr,
        total_value_lkr=total_value_lkr,
        description_of_supply=invoice.description_of_supply or "General Supply"
    )


def process_batch_invoices(batch_request: Schedule7BatchRequest) -> BatchTaxProcessResponse:
    """
    Processes a collection of invoices for a specified taxable period,
    classifies each invoice, and generates a Form 2540 (VAT Return) summary.
    """
    analyzed_invoices: List[TaxCalculationResult] = []
    
    # Accumulators for Cage Summaries
    cage_a_items: List[TaxCalculationResult] = []
    cage_d_items: List[TaxCalculationResult] = []
    cage_e_items: List[TaxCalculationResult] = []
    
    for inv in batch_request.invoices:
        result = categorize_and_calculate_tax(inv)
        analyzed_invoices.append(result)
        
        if result.schedule_7_cage == "Cage A":
            cage_a_items.append(result)
        elif result.schedule_7_cage == "Cage D":
            cage_d_items.append(result)
        elif result.schedule_7_cage == "Cage E":
            cage_e_items.append(result)
            
    summary_cage_a = CageSummary(
        cage_code="Cage A",
        cage_name="Standard Rated Supplies (18%)",
        tax_rate=STANDARD_VAT_RATE,
        invoice_count=len(cage_a_items),
        total_base_value_lkr=round(sum(i.base_value_lkr for i in cage_a_items), 2),
        total_tax_amount_lkr=round(sum(i.tax_amount_lkr for i in cage_a_items), 2),
        total_value_lkr=round(sum(i.total_value_lkr for i in cage_a_items), 2)
    )
    
    summary_cage_d = CageSummary(
        cage_code="Cage D",
        cage_name="Zero-Rated Supplies (Exports)",
        tax_rate=0.0,
        invoice_count=len(cage_d_items),
        total_base_value_lkr=round(sum(i.base_value_lkr for i in cage_d_items), 2),
        total_tax_amount_lkr=0.0,
        total_value_lkr=round(sum(i.total_value_lkr for i in cage_d_items), 2)
    )
    
    summary_cage_e = CageSummary(
        cage_code="Cage E",
        cage_name="Exempt Supplies",
        tax_rate=0.0,
        invoice_count=len(cage_e_items),
        total_base_value_lkr=round(sum(i.base_value_lkr for i in cage_e_items), 2),
        total_tax_amount_lkr=0.0,
        total_value_lkr=round(sum(i.total_value_lkr for i in cage_e_items), 2)
    )
    
    grand_turnover = round(
        summary_cage_a.total_base_value_lkr +
        summary_cage_d.total_base_value_lkr +
        summary_cage_e.total_base_value_lkr, 2
    )
    
    grand_output_tax = summary_cage_a.total_tax_amount_lkr
    
    form_2540 = Form2540Summary(
        tax_period=batch_request.tax_period,
        taxpayer_tin=batch_request.taxpayer_tin,
        taxpayer_name=batch_request.taxpayer_name,
        cage_a_standard=summary_cage_a,
        cage_d_zero_rated=summary_cage_d,
        cage_e_exempt=summary_cage_e,
        total_invoices_count=len(analyzed_invoices),
        grand_total_turnover_lkr=grand_turnover,
        grand_total_output_tax_lkr=grand_output_tax
    )
    
    return BatchTaxProcessResponse(
        status="success",
        message=f"Processed {len(analyzed_invoices)} invoices successfully for Period {batch_request.tax_period}",
        tax_period=batch_request.tax_period,
        taxpayer_tin=batch_request.taxpayer_tin,
        summary=form_2540,
        tax_analysis=analyzed_invoices
    )


def generate_schedule7_csv(batch_request: Schedule7BatchRequest) -> Tuple[str, str]:
    """
    Maps categorized invoices directly to the column structure required by the
    Sri Lankan Inland Revenue Department (IRD) RAMIS VAT Schedule 7 CSV format.
    
    Returns:
      Tuple of (csv_content_string, ramis_standard_filename)
    """
    output = io.StringIO()
    writer = csv.writer(output, lineterminator="\n")
    
    # RAMIS Schedule 7 Standard Column Headers
    headers = [
        "Serial No",
        "Tax Period",
        "Taxpayer TIN",
        "Taxpayer Name",
        "Customer TIN",
        "Customer Name",
        "Invoice Number",
        "Invoice Date",
        "Description of Supply",
        "Schedule Cage",
        "Currency",
        "Exchange Rate",
        "Value of Supply (LKR)",
        "VAT Rate (%)",
        "VAT Amount (LKR)",
        "Total Amount (LKR)"
    ]
    writer.writerow(headers)
    
    active_tin = (getattr(batch_request, "company_tin", None) or getattr(batch_request, "taxpayer_tin", None) or _ACTIVE_COMPANY_CONFIG["company_tin"]).strip()
    active_name = (getattr(batch_request, "company_name", None) or getattr(batch_request, "taxpayer_name", None) or _ACTIVE_COMPANY_CONFIG["company_name"]).strip()
    active_period = (getattr(batch_request, "tax_period", None) or _ACTIVE_COMPANY_CONFIG["tax_period"]).strip()

    for idx, inv in enumerate(batch_request.invoices, start=1):
        analyzed = categorize_and_calculate_tax(inv)
        
        # Format Customer TIN for RAMIS
        if inv.customer_tin and inv.customer_tin.strip():
            cust_tin = inv.customer_tin.strip()
        elif analyzed.schedule_7_cage == "Cage D":
            cust_tin = "FOREIGN"
        else:
            cust_tin = "UNREGISTERED"
            
        cust_name = inv.customer_name.strip() if (inv.customer_name and inv.customer_name.strip()) else "Direct Consumer"
        
        row = [
            idx,
            active_period,
            active_tin,
            active_name,
            cust_tin,
            cust_name,
            analyzed.invoice_number,
            analyzed.date_of_supply.isoformat(),
            analyzed.description_of_supply,
            analyzed.schedule_7_cage,
            analyzed.original_currency,
            f"{analyzed.exchange_rate:.4f}",
            f"{analyzed.base_value_lkr:.2f}",
            f"{analyzed.applied_tax_rate:.1f}",
            f"{analyzed.tax_amount_lkr:.2f}",
            f"{analyzed.total_value_lkr:.2f}"
        ]
        writer.writerow(row)
        
    csv_content = output.getvalue()
    
    # Standard RAMIS upload filename format: [TIN]_VAT_SCHEDULE07_[PERIOD].csv
    clean_period = active_period.replace("-", "").replace("/", "").replace(" ", "_").upper()
    filename = f"{active_tin}_VAT_SCHEDULE07_{clean_period}.csv"
    
    return csv_content, filename


def generate_schedule_csv(request: ScheduleBatchRequest) -> Tuple[str, str]:
    """
    Master Dispatcher for generating distinct CSV files for each of the 7 RAMIS Schedules.
    Currently delegates to Schedule 7 format as baseline, ready for individual custom
    schedule format implementations (Schedule 1, Schedule 2, Schedule 3, Schedule 4,
    Schedule 5, Schedule 6, Schedule 7).
    """
    sched_type = (request.schedule_type or "Schedule 7").strip()
    
    # Ready for individual schedule generator branching:
    # if sched_type == "Schedule 1": return generate_schedule1_csv(request)
    # ...
    # Baseline fallback:
    return generate_schedule7_csv(request)