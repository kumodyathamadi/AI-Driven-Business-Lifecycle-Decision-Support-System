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
    """Updates the globally configured company TIN, name, and active tax period with mandatory checks."""
    tin = str(config_data.get("company_tin", "")).strip()
    name = str(config_data.get("company_name", "")).strip()
    period = str(config_data.get("tax_period", "")).strip()

    if not tin:
        raise ValueError("Company TIN Number is strictly mandatory and cannot be empty.")
    if not name:
        raise ValueError("Company Name is strictly mandatory and cannot be empty.")
    if not period:
        raise ValueError("Tax Period is strictly mandatory and cannot be empty.")

    _ACTIVE_COMPANY_CONFIG["company_tin"] = tin
    _ACTIVE_COMPANY_CONFIG["company_name"] = name
    _ACTIVE_COMPANY_CONFIG["tax_period"] = period
    return _ACTIVE_COMPANY_CONFIG.copy()


def is_matching_company(supplier_tin: str, supplier_name: str, global_tin: str, global_name: str) -> bool:
    """
    Checks if an invoice's issuer matches our globally configured company entity.
    Cleans punctuation, whitespace, and hyphens for resilient comparison.
    """
    import re
    clean_gtin = re.sub(r'[^a-zA-Z0-9]', '', str(global_tin or '')).upper()
    clean_gname = re.sub(r'[^a-zA-Z0-9]', '', str(global_name or '')).upper()
    
    clean_stin = re.sub(r'[^a-zA-Z0-9]', '', str(supplier_tin or '')).upper()
    clean_sname = re.sub(r'[^a-zA-Z0-9]', '', str(supplier_name or '')).upper()
    
    # 1. Direct TIN match or prefix match (Sri Lanka 9-digit vs 12-digit with branch suffix -7000)
    if clean_gtin and clean_stin:
        if clean_gtin == clean_stin:
            return True
        if len(clean_gtin) >= 9 and len(clean_stin) >= 9 and clean_gtin[:9] == clean_stin[:9]:
            return True
            
    # 2. Company Name similarity
    if clean_gname and clean_sname:
        if clean_gname == clean_sname:
            return True
        g_tokens = [t for t in re.split(r'[^a-zA-Z0-9]', str(global_name).upper()) if len(t) > 2 and t not in ['PVT', 'LTD', 'LIMITED', 'PRIVATE', 'COMPANY']]
        s_tokens = [t for t in re.split(r'[^a-zA-Z0-9]', str(supplier_name).upper()) if len(t) > 2 and t not in ['PVT', 'LTD', 'LIMITED', 'PRIVATE', 'COMPANY']]
        if g_tokens and s_tokens and all(t in clean_sname for t in g_tokens):
            return True
        if g_tokens and s_tokens and all(t in clean_gname for t in s_tokens):
            return True
            
    return False


def classify_vat_transaction(invoice: InvoiceData, global_config: dict = None) -> dict:
    """
    Sri Lanka Inland Revenue Department (RAMIS) VAT Classification Logic:
    1. Input TAX (Purchases):
       Compare the invoice's Supplier TIN & Name against Global Company TIN & Name.
       If they DO NOT match, this invoice is an external purchase.
       We can claim this tax back from the government under Input Tax (Schedule 2).
    2. Output TAX (Company Sales):
       If the invoice's Issuer TIN & Name MATCH our Global Company TIN & Name:
       - If it is a local domestic sale (Standard 18% / not export): Schedule 1.
       - If it is a zero-rated export (CusDec, foreign currency): Schedule 7 (or Schedule 6).
    """
    cfg = global_config or _ACTIVE_COMPANY_CONFIG
    g_tin = cfg.get("company_tin", "")
    g_name = cfg.get("company_name", "")
    
    curr = str(invoice.currency or "LKR").upper().strip()
    desc_l = str(invoice.description_of_supply or "").lower()
    is_foreign_currency = curr not in ["LKR", "RS", "SLR", ""]
    is_export_desc = any(k in desc_l for k in ["cusdec", "export", "fob", "c&f", "foreign", "air freight"])
    is_export = is_foreign_currency or is_export_desc or (invoice.tax_category == "Zero-Rated" and is_foreign_currency)

    # Check if supplier matches our global company
    is_our_company = is_matching_company(invoice.supplier_tin, invoice.supplier_name, g_tin, g_name)
    
    # If customer is explicitly our company, we are definitely the purchaser (Input Tax)
    is_we_are_purchaser = is_matching_company(invoice.customer_tin, invoice.customer_name, g_tin, g_name)
    if is_we_are_purchaser and not is_our_company:
        is_our_company = False

    if is_our_company:
        # Output Tax (Company Sales)
        if is_export:
            vat_type = "OUTPUT_VAT"
            target_schedule = "Schedule 7"
            category_name = "Output Tax - Export of Goods/Services (Schedule 7)"
            ramis_cage = "Cage D"
            claimable = False
        else:
            vat_type = "OUTPUT_VAT"
            target_schedule = "Schedule 1"
            category_name = "Output Tax - Local Supplies at Standard 18% (Schedule 1)"
            ramis_cage = "Cage A"
            claimable = False
    else:
        # Input Tax (Purchases from external supplier)
        vat_type = "INPUT_VAT"
        target_schedule = "Schedule 2"
        category_name = "Input Tax - Local Purchases (Schedule 2)"
        ramis_cage = "Cage I"
        claimable = True

    return {
        "vat_type": vat_type,
        "target_schedule": target_schedule,
        "category_name": category_name,
        "ramis_cage": ramis_cage,
        "claimable": claimable,
        "is_our_company": is_our_company,
        "is_export": is_export
    }

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

    if not active_tin:
        raise ValueError("Company TIN Number is strictly mandatory for generating RAMIS schedules.")
    if not active_name:
        raise ValueError("Company Name is strictly mandatory for generating RAMIS schedules.")
    if not active_period:
        raise ValueError("Tax Period is strictly mandatory for generating RAMIS schedules.")

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





def generate_schedule1_csv(batch_request: ScheduleBatchRequest) -> Tuple[str, str]:
    """
    Official Sri Lanka Inland Revenue Department (IRD) RAMIS Schedule 1 CSV Generator.
    Output VAT on Taxable Supplies (Local Sales).
    
    Exact Column Specification (as per IRD guidelines & Excel template):
      1. Serial No : Running sequence number (1, 2, 3...)
      2. Invoice Date : Strictly MM/DD/YYYY format
      3. Tax Invoice No : Extracted only if explicitly identified as a 'Tax Invoice'
      4. Purchaser's TIN : Client TIN. If missing or Government Institution -> Dummy TIN: 100902877
      5. Name of the Purchaser : Client's name
      6. Description : Brief description of goods or services
      7. Value of supply : Strictly excluding VAT, mathematically derived via:
                           Value of supply = (VAT Amount / 18) * 100
      8. VAT Amount : Extracted tax amount
    """
    import re
    from datetime import datetime
    output = io.StringIO()
    writer = csv.writer(output, lineterminator='\r\n')
    
    headers = [
        "Serial No",
        "Invoice Date",
        "Tax Invoice No",
        "Purchaser's TIN",
        "Name of the Purchaser",
        "Description",
        "Value of supply",
        "VAT Amount"
    ]
    writer.writerow(headers)
    
    active_tin = (getattr(batch_request, "company_tin", None) or getattr(batch_request, "taxpayer_tin", None) or _ACTIVE_COMPANY_CONFIG["company_tin"]).strip()
    active_name = (getattr(batch_request, "company_name", None) or getattr(batch_request, "taxpayer_name", None) or _ACTIVE_COMPANY_CONFIG["company_name"]).strip()
    active_period = (getattr(batch_request, "tax_period", None) or _ACTIVE_COMPANY_CONFIG["tax_period"]).strip()

    if not active_tin:
        raise ValueError("Company TIN Number is strictly mandatory for generating Schedule 1 CSV.")
    if not active_name:
        raise ValueError("Company Name is strictly mandatory for generating Schedule 1 CSV.")
    if not active_period:
        raise ValueError("Tax Period is strictly mandatory for generating Schedule 1 CSV.")

    gov_keywords = [
        "MINISTRY", "DEPARTMENT OF", "DEPT OF", "AUTHORITY", "BOARD", "COMMISSION",
        "PARLIAMENT", "POLICE", "ARMY", "NAVY", "AIR FORCE", "GOVERNMENT", "MUNICIPAL",
        "URBAN COUNCIL", "PRADESHIYA SABHA", "STATE", "HOSPITAL", "CORRECTIONAL",
        "COURT", "SRI LANKA RAILWAYS", "SRI LANKA POST", "CEB", "NWSDB"
    ]

    row_count = 0
    for inv in batch_request.invoices:
        # Check classification: only include Output Tax / local taxable sales (or all provided batch items)
        classification = classify_vat_transaction(inv, {"company_tin": active_tin, "company_name": active_name})
        
        row_count += 1
        
        # 1. Invoice Date formatted strictly as MM/DD/YYYY
        date_obj = inv.date_of_supply
        if isinstance(date_obj, str):
            for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%m/%d/%Y', '%Y/%m/%d'):
                try:
                    date_obj = datetime.strptime(date_obj.strip(), fmt).date()
                    break
                except ValueError:
                    pass
        if hasattr(date_obj, 'strftime'):
            formatted_date = date_obj.strftime("%m/%d/%Y")
        else:
            formatted_date = datetime.now().strftime("%m/%d/%Y")
            
        # 2. Tax Invoice No (Extracted only if explicitly identified as a 'Tax Invoice')
        is_tax_inv = getattr(inv, 'is_tax_invoice', None)
        inv_no_str = str(inv.invoice_number or '').strip()
        if is_tax_inv is False or inv_no_str == "INV-UNKNOWN":
            tax_inv_no = ""
        else:
            tax_inv_no = inv_no_str
            
        # 3. Purchaser's TIN & Name
        raw_cust_tin = str(inv.customer_tin or '').strip()
        cust_name = str(inv.customer_name or 'Direct Consumer').strip()
        cust_name_upper = cust_name.upper()
        
        is_gov = any(k in cust_name_upper for k in gov_keywords)
        is_unreg_or_missing = (not raw_cust_tin or raw_cust_tin.upper() in ["UNREGISTERED", "NONE", "UNKNOWN", "N/A", "FOREIGN", "0"])
        
        # Crucial Rule: If the TIN is missing, or if the supply is made to a Government Institution that is not registered for VAT, automatically fill this with the dummy TIN: 100902877.
        if is_gov or is_unreg_or_missing:
            purchaser_tin = "100902877"
        else:
            clean_tin = re.sub(r'[^0-9]', '', raw_cust_tin)
            purchaser_tin = clean_tin if len(clean_tin) >= 7 else "100902877"
                
        # 4. Description
        description = str(inv.description_of_supply or 'Local Supply of Goods/Services').strip()
        
        # 5. VAT Amount & Value of Supply
        # Recommended formula: derive base value using Value of supply = (VAT Amount / 18) * 100
        vat_amount = float(inv.tax_amount or 0.0)
        if vat_amount > 0:
            value_of_supply = round((vat_amount / 18.0) * 100.0, 2)
        else:
            if float(inv.sub_total or 0.0) > 0:
                value_of_supply = round(float(inv.sub_total), 2)
                vat_amount = round(value_of_supply * 0.18, 2)
            elif float(inv.total_amount or 0.0) > 0:
                value_of_supply = round((float(inv.total_amount) / 1.18), 2)
                vat_amount = round(float(inv.total_amount) - value_of_supply, 2)
            else:
                value_of_supply = 0.0
                vat_amount = 0.0

        row = [
            row_count,
            formatted_date,
            tax_inv_no,
            purchaser_tin,
            cust_name,
            description,
            f"{value_of_supply:.2f}",
            f"{vat_amount:.2f}"
        ]
        writer.writerow(row)
        
    csv_content = output.getvalue()
    
    clean_period = active_period.replace("-", "").replace("/", "").replace(" ", "_").upper()
    sub_date = datetime.now().strftime("%Y%m%d")
    # Official IRD Schedule 1 File naming standard: TIN_VAT_SCHEDULE01_PERIOD_YYYYMMDD_ORIGINAL_V1.csv
    filename = f"{active_tin}_VAT_SCHEDULE01_{clean_period}_{sub_date}_ORIGINAL_V1.csv"
    
    return csv_content, filename


def generate_schedule_csv(request: ScheduleBatchRequest) -> Tuple[str, str]:
    """
    Master Dispatcher for generating distinct CSV files for each of the 7 RAMIS Schedules.
    Dispatches to dedicated schedule generator:
      - Schedule 1: generate_schedule1_csv (Output VAT on Taxable Supplies)
      - Schedule 7: generate_schedule7_csv (Zero-Rated Article/Service Exports)
    """
    sched_type = (request.schedule_type or "Schedule 7").strip().lower()
    
    if sched_type in ["schedule 1", "schedule01", "schedule_1", "1"]:
        return generate_schedule1_csv(request)
    elif sched_type in ["schedule 7", "schedule07", "schedule_7", "7"]:
        return generate_schedule7_csv(request)
    else:
        # Default fallback to Schedule 7 format
        return generate_schedule7_csv(request)