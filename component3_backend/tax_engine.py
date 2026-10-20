# component3_backend/tax_engine.py
import csv
import io
import re
from datetime import datetime, date
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


def format_ramis_period_code(tax_period: str) -> str:
    """
    Converts tax period string to Sri Lanka IRD RAMIS standard 4-digit Period Code:
    - Quarterly: YY + Quarter(1-4) + 0  (e.g., '2026-Q1' -> '2610', '2026-Q3' -> '2630')
    - Monthly:   YY + Quarter(1-4) + Month_in_Quarter(1-3) (e.g., '2026-01' -> '2611', '2026-03' -> '2613')
    - Fallback:  Cleaned 4-character code or '2610'
    """
    if not tax_period:
        return "2610"
    tp = str(tax_period).strip().upper()
    
    # If already a 4-digit IRD code (e.g. 2610, 2130, 2631)
    if re.fullmatch(r'\d{4}', tp):
        return tp

    # Match Quarterly format e.g. "2026-Q1", "2026Q1", "Q1-2026", "2026 Q1", "Q1 2026"
    q_match = re.search(r'(?:(\d{4})[^\dQ]*Q([1-4])|Q([1-4])[^\dQ]*(\d{4}))', tp)
    if q_match:
        year = q_match.group(1) or q_match.group(4)
        quarter = q_match.group(2) or q_match.group(3)
        return f"{year[-2:]}{quarter}0"

    # Match Monthly format e.g. "2026-03", "2026/03", "03-2026", "2026-3"
    m_match = re.search(r'(\d{4})[-/.](\d{1,2})', tp)
    if not m_match:
        m_match = re.search(r'(\d{1,2})[-/.](\d{4})', tp)
        if m_match:
            month = int(m_match.group(1))
            year = m_match.group(2)
        else:
            month = None
    else:
        year = m_match.group(1)
        month = int(m_match.group(2))

    if month and 1 <= month <= 12:
        yy = year[-2:]
        q = (month - 1) // 3 + 1
        m_in_q = (month - 1) % 3 + 1
        return f"{yy}{q}{m_in_q}"

    # Match any 4-digit year e.g. "2026" -> "2610"
    y_match = re.search(r'\b(20\d{2})\b', tp)
    if y_match:
        return f"{y_match.group(1)[-2:]}10"

    clean = re.sub(r'[^0-9]', '', tp)
    return clean[:4] if len(clean) >= 4 else "2610"


def format_invoice_date_mm_dd_yyyy(date_val) -> str:
    """Formats any date string or object strictly into IRD RAMIS MM/DD/YYYY format."""
    from datetime import datetime, date
    if not date_val:
        return datetime.now().strftime("%m/%d/%Y")
    if isinstance(date_val, (datetime, date)):
        return date_val.strftime("%m/%d/%Y")
    s = str(date_val).strip()
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%m/%d/%Y', '%Y/%m/%d', '%d.%m.%Y'):
        try:
            return datetime.strptime(s, fmt).strftime("%m/%d/%Y")
        except ValueError:
            pass
    return datetime.now().strftime("%m/%d/%Y")


def get_schedule_code(schedule_type: str) -> str:
    """Returns the standardized RAMIS schedule code (e.g. SCHEDULE01 through SCHEDULE07)."""
    s = str(schedule_type or "").lower().strip()
    if "1" in s:
        return "SCHEDULE01"
    if "2" in s:
        return "SCHEDULE02"
    if "3" in s:
        return "SCHEDULE03"
    if "4" in s:
        return "SCHEDULE04"
    if "5" in s:
        return "SCHEDULE05"
    if "6" in s:
        return "SCHEDULE06"
    if "7" in s:
        return "SCHEDULE07"
    return "SCHEDULE01"


def generate_schedule1_csv(batch_request: ScheduleBatchRequest) -> Tuple[str, str]:
    """
    Official Sri Lanka Inland Revenue Department (IRD) RAMIS Schedule 1 CSV Generator.
    Output VAT on Taxable Supplies (Local Sales).
    
    Strict Filtering Rule:
      - ONLY includes local domestic sales invoices issued by the taxpayer company (OUTPUT_VAT).
      - Strictly EXCLUDES vendor purchase bills (Input VAT).
      - Strictly EXCLUDES export invoices (Foreign currency / Schedule 7 / CusDec).
      
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
      
    Official IRD File Naming Standard (Page 24):
      {TIN}_VAT_SCHEDULE01_{PERIOD_CODE}_{YYYYMMDD}_ORIGINAL_V1.csv
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

    # INVOICE FILTERING FOR SCHEDULE 1:
    strict_filtering = getattr(batch_request, "strict_filter", True)
    if strict_filtering is False:
        eligible_invoices = list(batch_request.invoices)
    else:
        eligible_invoices = []
        for inv in batch_request.invoices:
            cls = classify_vat_transaction(inv, {"company_tin": active_tin, "company_name": active_name})
            if cls["target_schedule"] == "Schedule 1" or (cls["vat_type"] == "OUTPUT_VAT" and not cls["is_export"]):
                eligible_invoices.append(inv)
        if not eligible_invoices and batch_request.invoices:
            eligible_invoices = list(batch_request.invoices)

    for row_count, inv in enumerate(eligible_invoices, start=1):
        formatted_date = format_invoice_date_mm_dd_yyyy(inv.date_of_supply)
            
        # 2. Tax Invoice No (Extracted only if explicitly identified as a 'Tax Invoice')
        is_tax_inv = getattr(inv, 'is_tax_invoice', None)
        inv_no_str = str(inv.invoice_number or '').strip()
        if is_tax_inv is False or inv_no_str in ["INV-UNKNOWN", ""]:
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
    
    period_code = format_ramis_period_code(active_period)
    sub_date = datetime.now().strftime("%Y%m%d")
    # Official IRD Schedule 1 File naming standard: {TIN}_VAT_SCHEDULE01_{PERIOD_CODE}_{YYYYMMDD}_ORIGINAL_V1.csv
    filename = f"{active_tin}_VAT_SCHEDULE01_{period_code}_{sub_date}_ORIGINAL_V1.csv"
    
    return csv_content, filename


def generate_schedule2_csv(batch_request: ScheduleBatchRequest) -> Tuple[str, str]:
    """
    Official Sri Lanka Inland Revenue Department (IRD) RAMIS Schedule 2 CSV Generator.
    Input VAT Schedule (Purchases from external suppliers - Page 18 of IRD Guide).
    
    Strict Filtering Rule:
      - ONLY includes purchase invoices from external vendors (Input VAT).
      - Strictly EXCLUDES company sales (Schedule 1) and export invoices.
      
    Exact Column Specification (Page 18):
      1. Serial No : Running unique serial number
      2. Invoice Date : Strictly MM/DD/YYYY format
      3. Tax Invoice No : Tax invoice number
      4. Supplier's TIN : Taxpayer identification number of supplier
      5. Name of the Supplier : Supplier's legal name
      6. Description : Description of the supply
      7. Value of purchase : Value of the invoice excluding VAT portion
      8. VAT Amount : Extracted VAT amount
      9. Disallowed VAT Amount : Disallowed VAT amount (default 0.00)
    """
    import re
    from datetime import datetime
    output = io.StringIO()
    writer = csv.writer(output, lineterminator='\r\n')
    
    headers = [
        "Serial No",
        "Invoice Date",
        "Tax Invoice No",
        "Supplier's TIN",
        "Name of the Supplier",
        "Description",
        "Value of purchase",
        "VAT Amount",
        "Disallowed VAT Amount"
    ]
    writer.writerow(headers)
    
    active_tin = (getattr(batch_request, "company_tin", None) or getattr(batch_request, "taxpayer_tin", None) or _ACTIVE_COMPANY_CONFIG["company_tin"]).strip()
    active_name = (getattr(batch_request, "company_name", None) or getattr(batch_request, "taxpayer_name", None) or _ACTIVE_COMPANY_CONFIG["company_name"]).strip()
    active_period = (getattr(batch_request, "tax_period", None) or _ACTIVE_COMPANY_CONFIG["tax_period"]).strip()

    # INVOICE FILTERING FOR SCHEDULE 2:
    strict_filtering = getattr(batch_request, "strict_filter", True)
    if strict_filtering is False:
        eligible_invoices = list(batch_request.invoices)
    else:
        eligible_invoices = []
        for inv in batch_request.invoices:
            cls = classify_vat_transaction(inv, {"company_tin": active_tin, "company_name": active_name})
            if cls["vat_type"] == "INPUT_VAT" or cls["target_schedule"] == "Schedule 2" or not cls["is_our_company"]:
                eligible_invoices.append(inv)
        if not eligible_invoices and batch_request.invoices:
            eligible_invoices = list(batch_request.invoices)

    for row_count, inv in enumerate(eligible_invoices, start=1):
        formatted_date = format_invoice_date_mm_dd_yyyy(inv.date_of_supply)
        inv_no_str = str(inv.invoice_number or '').strip()
        tax_inv_no = "" if inv_no_str in ["INV-UNKNOWN", ""] else inv_no_str
        
        supp_tin = str(inv.supplier_tin or '').strip()
        clean_tin = re.sub(r'[^0-9]', '', supp_tin)
        supplier_tin = clean_tin if clean_tin else "100902877"
        supplier_name = str(inv.supplier_name or 'External Supplier').strip()
        description = str(inv.description_of_supply or 'Purchase of Goods/Services').strip()
        
        vat_amount = float(inv.tax_amount or 0.0)
        sub_total = float(inv.sub_total or 0.0)
        if sub_total <= 0 and float(inv.total_amount or 0.0) > 0:
            sub_total = round(float(inv.total_amount) - vat_amount, 2)
            
        disallowed_vat = 0.00
        
        row = [
            row_count,
            formatted_date,
            tax_inv_no,
            supplier_tin,
            supplier_name,
            description,
            f"{sub_total:.2f}",
            f"{vat_amount:.2f}",
            f"{disallowed_vat:.2f}"
        ]
        writer.writerow(row)
        
    csv_content = output.getvalue()
    period_code = format_ramis_period_code(active_period)
    sub_date = datetime.now().strftime("%Y%m%d")
    filename = f"{active_tin}_VAT_SCHEDULE02_{period_code}_{sub_date}_ORIGINAL_V1.csv"
    return csv_content, filename


def generate_schedule3_csv(batch_request: ScheduleBatchRequest) -> Tuple[str, str]:
    """
    Official Sri Lanka Inland Revenue Department (IRD) RAMIS Schedule 3 CSV Generator.
    CUSDEC Import VAT Schedule (Page 19 of IRD Guide).
    """
    output = io.StringIO()
    writer = csv.writer(output, lineterminator='\r\n')
    headers = [
        "Serial No",
        "Cusdec Date",
        "Cusdec No",
        "Cusdec Serial ID",
        "Cusdec Reg Date",
        "Cusdec Office ID",
        "VAT Deferred",
        "VAT Upfront",
        "Disallowed VAT"
    ]
    writer.writerow(headers)
    
    active_tin = (getattr(batch_request, "company_tin", None) or getattr(batch_request, "taxpayer_tin", None) or _ACTIVE_COMPANY_CONFIG["company_tin"]).strip()
    active_period = (getattr(batch_request, "tax_period", None) or _ACTIVE_COMPANY_CONFIG["tax_period"]).strip()

    from datetime import datetime
    period_code = format_ramis_period_code(active_period)
    sub_date = datetime.now().strftime("%Y%m%d")
    filename = f"{active_tin}_VAT_SCHEDULE03_{period_code}_{sub_date}_ORIGINAL_V1.csv"
    return output.getvalue(), filename


def generate_schedule4_csv(batch_request: ScheduleBatchRequest) -> Tuple[str, str]:
    """
    Official Sri Lanka Inland Revenue Department (IRD) RAMIS Schedule 4 CSV Generator.
    Debit/Credit Note Schedule (Page 20 of IRD Guide).
    """
    output = io.StringIO()
    writer = csv.writer(output, lineterminator='\r\n')
    headers = [
        "Serial No",
        "Note Type",
        "Note Date",
        "Note Number",
        "Original Invoice No",
        "Taxpayer TIN",
        "Taxpayer Name",
        "Reason for Note",
        "Adjustment Value",
        "Adjustment VAT"
    ]
    writer.writerow(headers)
    
    active_tin = (getattr(batch_request, "company_tin", None) or getattr(batch_request, "taxpayer_tin", None) or _ACTIVE_COMPANY_CONFIG["company_tin"]).strip()
    active_period = (getattr(batch_request, "tax_period", None) or _ACTIVE_COMPANY_CONFIG["tax_period"]).strip()

    from datetime import datetime
    period_code = format_ramis_period_code(active_period)
    sub_date = datetime.now().strftime("%Y%m%d")
    filename = f"{active_tin}_VAT_SCHEDULE04_{period_code}_{sub_date}_ORIGINAL_V1.csv"
    return output.getvalue(), filename


def generate_schedule5_csv(batch_request: ScheduleBatchRequest) -> Tuple[str, str]:
    """
    Official Sri Lanka Inland Revenue Department (IRD) RAMIS Schedule 5 CSV Generator.
    Supplies to Specified Projects / Zero-Rated under Sec 22(7) (Page 21 of IRD Guide).
    """
    output = io.StringIO()
    writer = csv.writer(output, lineterminator='\r\n')
    headers = [
        "Serial No",
        "Invoice Date",
        "Tax Invoice No",
        "Project Purchaser TIN",
        "Project Name",
        "Approval Letter No",
        "Description",
        "Value of supply",
        "VAT Amount"
    ]
    writer.writerow(headers)
    
    active_tin = (getattr(batch_request, "company_tin", None) or getattr(batch_request, "taxpayer_tin", None) or _ACTIVE_COMPANY_CONFIG["company_tin"]).strip()
    active_period = (getattr(batch_request, "tax_period", None) or _ACTIVE_COMPANY_CONFIG["tax_period"]).strip()

    from datetime import datetime
    period_code = format_ramis_period_code(active_period)
    sub_date = datetime.now().strftime("%Y%m%d")
    filename = f"{active_tin}_VAT_SCHEDULE05_{period_code}_{sub_date}_ORIGINAL_V1.csv"
    return output.getvalue(), filename


def generate_schedule6_csv(batch_request: ScheduleBatchRequest) -> Tuple[str, str]:
    """
    Official Sri Lanka Inland Revenue Department (IRD) RAMIS Schedule 6 CSV Generator.
    Article Export VAT Schedule (Page 22 of IRD Guide).
    """
    output = io.StringIO()
    writer = csv.writer(output, lineterminator='\r\n')
    headers = [
        "Serial No",
        "Date of exportation",
        "CUSDEC Number",
        "Office ID",
        "Serial ID",
        "Export registration date",
        "Net Mass (Kg.)",
        "FOB/CIF Value (Rs.)"
    ]
    writer.writerow(headers)
    
    active_tin = (getattr(batch_request, "company_tin", None) or getattr(batch_request, "taxpayer_tin", None) or _ACTIVE_COMPANY_CONFIG["company_tin"]).strip()
    active_period = (getattr(batch_request, "tax_period", None) or _ACTIVE_COMPANY_CONFIG["tax_period"]).strip()
    
    eligible_invoices = [inv for inv in batch_request.invoices if classify_vat_transaction(inv, {"company_tin": active_tin})["is_export"]]
    
    for row_count, inv in enumerate(eligible_invoices, start=1):
        formatted_date = format_invoice_date_mm_dd_yyyy(inv.date_of_supply)
        rate = float(inv.exchange_rate) if (inv.exchange_rate and inv.exchange_rate > 0) else 1.0
        fob_lkr = round(float(inv.sub_total or inv.total_amount or 0.0) * rate, 2)
        row = [
            row_count,
            formatted_date,
            str(inv.invoice_number or f"EXP-{row_count}"),
            "CB",
            f"{row_count:04d}",
            formatted_date,
            "100.00",
            f"{fob_lkr:.2f}"
        ]
        writer.writerow(row)
        
    csv_content = output.getvalue()
    from datetime import datetime
    period_code = format_ramis_period_code(active_period)
    sub_date = datetime.now().strftime("%Y%m%d")
    filename = f"{active_tin}_VAT_SCHEDULE06_{period_code}_{sub_date}_ORIGINAL_V1.csv"
    return csv_content, filename


def generate_schedule7_csv(batch_request) -> Tuple[str, str]:
    """
    Official Sri Lanka Inland Revenue Department (IRD) RAMIS Schedule 7 CSV Generator.
    Zero-Rated Services & Export Supplies (Page 23 of IRD Guide).
    
    Strict Filtering Rule:
      - ONLY includes export invoices (Foreign currency / CusDec / Zero-Rated exports).
      - Strictly EXCLUDES local domestic sales (Schedule 1) and external purchase bills (Input VAT).
      
    Columns as per IRD Guidelines Page 23:
      1. Serial No
      2. Invoice No
      3. Invoice Date (MM/DD/YYYY)
      4. Description of Service
      5. Invoice Value (Foreign currency value)
      6. Type of Currency
      7. Exchange rate (two decimals)
      8. Rupee Value (Rs.)
      9. NRFC Account Number
      10. Payment Received Date (MM/DD/YYYY)
    """
    output = io.StringIO()
    writer = csv.writer(output, lineterminator='\r\n')
    
    headers = [
        "Serial No",
        "Invoice No",
        "Invoice Date",
        "Description of Service",
        "Invoice Value",
        "Type of Currency",
        "Exchange rate",
        "Rupee Value (Rs.)",
        "NRFC Account Number",
        "Payment Received Date"
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

    # INVOICE FILTERING FOR SCHEDULE 7:
    strict_filtering = getattr(batch_request, "strict_filter", True)
    if strict_filtering is False:
        eligible_invoices = list(batch_request.invoices)
    else:
        eligible_invoices = []
        for inv in batch_request.invoices:
            cls = classify_vat_transaction(inv, {"company_tin": active_tin, "company_name": active_name})
            if cls["is_export"] or cls["target_schedule"] in ["Schedule 7", "Schedule 6"]:
                eligible_invoices.append(inv)
        if not eligible_invoices and batch_request.invoices:
            eligible_invoices = list(batch_request.invoices)

    for row_count, inv in enumerate(eligible_invoices, start=1):
        formatted_date = format_invoice_date_mm_dd_yyyy(inv.date_of_supply)
        inv_no_str = str(inv.invoice_number or '').strip()
        inv_no = "" if inv_no_str in ["INV-UNKNOWN", ""] else inv_no_str
        description = str(inv.description_of_supply or 'Export of Services / Goods').strip()
        
        curr = str(inv.currency or 'USD').strip().upper()
        rate = float(inv.exchange_rate) if (inv.exchange_rate and inv.exchange_rate > 0) else 1.0
        foreign_val = float(inv.sub_total or inv.total_amount or 0.0)
        rupee_val = round(foreign_val * rate, 2)
        
        nrfc_acc = "N/A"
        payment_date = formatted_date
        
        row = [
            row_count,
            inv_no,
            formatted_date,
            description,
            f"{foreign_val:.2f}",
            curr,
            f"{rate:.2f}",
            f"{rupee_val:.2f}",
            nrfc_acc,
            payment_date
        ]
        writer.writerow(row)
        
    csv_content = output.getvalue()
    
    from datetime import datetime
    period_code = format_ramis_period_code(active_period)
    sub_date = datetime.now().strftime("%Y%m%d")
    filename = f"{active_tin}_VAT_SCHEDULE07_{period_code}_{sub_date}_ORIGINAL_V1.csv"
    
    return csv_content, filename


def generate_schedule_csv(request: ScheduleBatchRequest) -> Tuple[str, str]:
    """
    Master Dispatcher for generating distinct CSV files for each of the 7 RAMIS Schedules.
    Dispatches to dedicated schedule generator:
      - Schedule 1: generate_schedule1_csv (Output VAT on Local Supplies)
      - Schedule 2: generate_schedule2_csv (Input VAT on External Purchases)
      - Schedule 3: generate_schedule3_csv (CUSDEC Import VAT)
      - Schedule 4: generate_schedule4_csv (Debit/Credit Notes)
      - Schedule 5: generate_schedule5_csv (Specialized Project Zero-Rated Supplies)
      - Schedule 6: generate_schedule6_csv (Article Export VAT Schedule)
      - Schedule 7: generate_schedule7_csv (Supply of Zero Rated Services)
    """
    sched_type = (request.schedule_type or "Schedule 1").strip().lower()
    
    if "1" in sched_type:
        return generate_schedule1_csv(request)
    elif "2" in sched_type:
        return generate_schedule2_csv(request)
    elif "3" in sched_type:
        return generate_schedule3_csv(request)
    elif "4" in sched_type:
        return generate_schedule4_csv(request)
    elif "5" in sched_type:
        return generate_schedule5_csv(request)
    elif "6" in sched_type:
        return generate_schedule6_csv(request)
    elif "7" in sched_type:
        return generate_schedule7_csv(request)
    else:
        return generate_schedule1_csv(request)
