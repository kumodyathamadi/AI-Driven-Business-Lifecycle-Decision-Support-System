"""
Component 2 — Business Plan PDF Extractor & Profile Identification Service
Extracts rich business profile information from Component 1 SME360 AI Business Plan PDFs
or external SME business plans (both digital text and scanned/OCR).
"""

from __future__ import annotations

import io
import re
import logging
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Try importing PyMuPDF
try:
    import pymupdf as fitz  # PyMuPDF 1.24+
except ImportError:
    try:
        import fitz
    except ImportError:
        fitz = None

# Sector mapping to Component 2 valid sectors: "food", "clothing", "salon", "vehicle_parts"
SECTOR_KEYWORDS = {
    "food": [
        "grocery", "mini-mart", "minimart", "supermarket", "food", "bakery", 
        "restaurant", "cafe", "beverage", "sweets", "catering", "dining", "snack"
    ],
    "clothing": [
        "clothing", "garment", "apparel", "textile", "fashion", "boutique", 
        "tailor", "dresses", "t-shirts", "wear"
    ],
    "salon": [
        "salon", "saloon", "beauty", "hair", "spa", "cosmetics", "parlour", 
        "barber", "grooming"
    ],
    "vehicle_parts": [
        "vehicle", "auto", "automobile", "spare parts", "parts", "garage", 
        "motor", "repair", "mechanic", "tyre", "battery", "lubricant"
    ],
}


def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> Tuple[str, List[str], bool, bool]:
    """
    Extracts text from PDF bytes using PyMuPDF.
    
    Returns:
        (full_text, pages_text, is_scanned, ocr_used)
    """
    if not fitz:
        raise RuntimeError("PyMuPDF (fitz) is not installed in the python environment.")

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages_text: List[str] = []
    total_chars = 0
    has_images = False

    for page_idx in range(len(doc)):
        page = doc[page_idx]
        text = page.get_text("text") or ""
        pages_text.append(text)
        total_chars += len(text.strip())
        if page.get_images():
            has_images = True

    is_scanned = total_chars < 50 and has_images
    ocr_used = False

    # Scanned PDF handling: if text is negligible but images exist, attempt OCR if supported
    if is_scanned:
        ocr_pages: List[str] = []
        try:
            for page_idx in range(len(doc)):
                page = doc[page_idx]
                # PyMuPDF built-in OCR if available
                textpage = page.get_textpage_ocr(flags=0, language="eng", dpi=150)
                ocr_text = page.get_text("text", textpage=textpage)
                ocr_pages.append(ocr_text)
            if sum(len(t.strip()) for t in ocr_pages) > 50:
                pages_text = ocr_pages
                total_chars = sum(len(t.strip()) for t in ocr_pages)
                ocr_used = True
        except Exception as ocr_err:
            logger.warning("PyMuPDF OCR not available or failed: %s", ocr_err)

    full_text = "\n\n--- Page Break ---\n\n".join(pages_text)
    doc.close()
    return full_text, pages_text, is_scanned, ocr_used


def _clean_str(val: Optional[str]) -> Optional[str]:
    if not val:
        return None
    val = re.sub(r"\s+", " ", val).strip()
    return val or None


def _clean_num(val_str: Optional[str]) -> Optional[float]:
    if not val_str:
        return None
    cleaned = re.sub(r"[^\d.]", "", val_str)
    try:
        return float(cleaned)
    except ValueError:
        return None


def extract_business_profile_from_text(
    full_text: str, filename: str = ""
) -> Dict[str, Any]:
    """
    Parses full text of a Business Plan PDF and identifies structured business attributes.
    Works robustly with SME360 AI standard reports and general business plans.
    """
    profile: Dict[str, Any] = {}
    metadata: Dict[str, Any] = {
        "filename": filename,
        "extraction_confidence": "high",
        "detected_sections": [],
    }

    # 1. Business Name
    biz_name = None
    m = re.search(r"Prepared\s+For:\s*([^\n\r\|]+)", full_text, re.IGNORECASE)
    if m:
        biz_name = _clean_str(m.group(1))
    if not biz_name:
        m = re.search(r"Prepared\s+For\s*([^\n\r\|]+)", full_text, re.IGNORECASE)
        if m:
            biz_name = _clean_str(m.group(1))
    if not biz_name:
        m = re.search(r"Business\s+Name:\s*([^\n\r\|]+)", full_text, re.IGNORECASE)
        if m:
            biz_name = _clean_str(m.group(1))
    if not biz_name:
        # Fallback from filename
        clean_fn = re.sub(r"[_\-]", " ", filename.replace(".pdf", ""))
        biz_name = clean_fn.title()

    profile["business_name"] = biz_name

    # 2. Industry Category & Sector
    raw_category = None
    m = re.search(r"Industry\s+Category:\s*([^|\n\r]+)", full_text, re.IGNORECASE)
    if m:
        raw_category = _clean_str(m.group(1))
    if not raw_category:
        m = re.search(r"Business\s+Category:\s*([^|\n\r]+)", full_text, re.IGNORECASE)
        if m:
            raw_category = _clean_str(m.group(1))

    search_corpus = f"{raw_category or ''} {biz_name or ''} {full_text[:3000]}".lower()

    # Map raw category directly first
    business_type = "food"  # default fallback
    cat_lower = (raw_category or "").lower()
    
    if any(k in cat_lower for k in ["grocery", "mini-mart", "minimart", "food", "bakery", "restaurant", "cafe", "sweets"]):
        business_type = "food"
    elif any(k in cat_lower for k in ["clothing", "garment", "apparel", "textile", "fashion"]):
        business_type = "clothing"
    elif any(k in cat_lower for k in ["salon", "saloon", "beauty", "hair", "spa", "cosmetics"]):
        business_type = "salon"
    elif any(k in cat_lower for k in ["vehicle", "auto", "spare parts", "garage", "motor"]):
        business_type = "vehicle_parts"
    else:
        # Fallback to word-boundary searching in title and text snippet
        if re.search(r"\b(grocery|mini-mart|minimart|food|bakery|restaurant|cafe|sweets|catering)\b", search_corpus):
            business_type = "food"
        elif re.search(r"\b(clothing|garment|apparel|textile|fashion|boutique|tailor|dresses|t-shirts)\b", search_corpus):
            business_type = "clothing"
        elif re.search(r"\b(salon|saloon|beauty|hair|spa|cosmetics|barber|parlour)\b", search_corpus):
            business_type = "salon"
        elif re.search(r"\b(vehicle|auto|automobile|spare\s+parts|garage|motor\s+repair|mechanic)\b", search_corpus):
            business_type = "vehicle_parts"

    profile["business_category"] = raw_category or business_type.replace("_", " ").title()
    profile["business_type"] = business_type
    profile["sector"] = business_type

    # 3. Business Stage
    stage = "New Startup"
    m = re.search(r"Business\s+Stage:\s*([^|\n\r\(\)]+)", full_text, re.IGNORECASE)
    if m:
        stage = _clean_str(m.group(1)) or "New Startup"
    elif "existing business" in search_corpus:
        stage = "Existing Business"
    elif "startup" in search_corpus or "new venture" in search_corpus:
        stage = "New Startup"

    profile["business_stage"] = stage

    # 4. Location: Province, District, Local Authority
    location_str = "Colombo, Western Province, Sri Lanka"
    m = re.search(r"Operating\s+Location:\s*([^\n\r]+)", full_text, re.IGNORECASE)
    if m:
        location_str = _clean_str(m.group(1)) or location_str

    province = "Western Province"
    district = "Colombo"
    local_authority = "Colombo Municipal Council"

    if "gampaha" in location_str.lower() or "gampaha" in full_text[:2000].lower():
        district = "Gampaha"
        local_authority = "Gampaha Municipal Council"
    elif "kalutara" in location_str.lower() or "kalutara" in full_text[:2000].lower():
        district = "Kalutara"
        local_authority = "Kalutara Urban Council"
    elif "colombo" in location_str.lower():
        district = "Colombo"
        if "kotte" in full_text[:2000].lower():
            local_authority = "Kotte Municipal Council"
        elif "dehiwala" in full_text[:2000].lower() or "mount lavinia" in full_text[:2000].lower():
            local_authority = "Dehiwala-Mount Lavinia Municipal Council"
        else:
            local_authority = "Colombo Municipal Council"

    profile["location"] = location_str
    profile["province"] = province
    profile["district"] = district
    profile["local_authority"] = local_authority

    # 5. Proposed Activity & Business Overview
    proposed_activity = ""
    # Look for Section 1.1 Business Overview or Section 1. Business Feasibility & Executive Summary
    patterns = [
        r"1\.1\s+Business\s+Overview\s*\n+([\s\S]*?)(?=(?:1\.2|SECTION\s+02|$))",
        r"(?:Business\s+Feasibility\s+&\s+Executive\s+Summary|Executive\s+Summary)[\s\S]*?\n\n([\s\S]{100,700}?)(?=(?:2\.|\n\n\n|Predicted\s+Viability))",
        r"(?:Business\s+Overview)[\s\S]*?\n+([\s\S]{100,600}?)(?=(?:2\.|SECTION|$))",
    ]
    for pat in patterns:
        m = re.search(pat, full_text, re.IGNORECASE)
        if m:
            candidate = _clean_str(m.group(1))
            if candidate and len(candidate) > 60:
                proposed_activity = candidate
                metadata["detected_sections"].append("Executive/Business Overview")
                break

    if not proposed_activity:
        # Fallback to general paragraph after title
        m2 = re.search(r"Based\s+on\s+the\s+operational\s+details\s+provided:?\s*([\s\S]{80,500}?\.)", full_text, re.IGNORECASE)
        if m2:
            proposed_activity = _clean_str(m2.group(1)) or ""

    profile["proposed_activity"] = proposed_activity

    # 6. Products / Services
    products_services: List[str] = []
    # Pattern 1: High-precision "will sell" or "shop will sell"
    sell_match = re.search(
        r"(?:(?:The\s+)?(?:shop|business|enterprise|store)\s+will\s+sell|will\s+sell|products\s+include|primary\s+products\s+include)\s+([^\.\n]+?)(?:\.|\n|My\s+target|Target)",
        full_text,
        re.IGNORECASE,
    )
    if not sell_match:
        sell_match = re.search(
            r"(?:selling|commercial\s+offerings\s+include|offering\s+a\s+wider\s+selection\s+of)\s+([^\.\n]+?)(?:\.|\n|My\s+target|Target)",
            full_text,
            re.IGNORECASE,
        )
    if sell_match:
        raw_items = sell_match.group(1)
        items = re.split(r",|\band\b|;", raw_items)
        for item in items:
            clean_item = _clean_str(item)
            if clean_item and len(clean_item) > 2 and len(clean_item) < 60:
                # filter out non-product junk words
                if not any(stop in clean_item.lower() for stop in ["wider selection", "offering", "commercial"]):
                    products_services.append(clean_item.title())

    # Pattern 2: Check for specific bullet points under offerings
    if not products_services:
        bullets = re.findall(r"[•\-\*]\s*(?:Primary\s+Commercial\s+Offerings:\s*)?([^\n\r]+)", full_text, re.IGNORECASE)
        for b in bullets:
            clean_b = _clean_str(b)
            if clean_b and len(clean_b) > 3 and len(clean_b) < 60:
                if not any(skip in clean_b.lower() for skip in ["target customer", "foundational", "strategic plan"]):
                    products_services.append(clean_b.title())

    # Fallback sector-specific defaults if none extracted
    if not products_services or len(products_services) < 2:
        if business_type == "food":
            products_services = ["Essential Groceries", "Packaged Food", "Fresh Produce", "WhatsApp Delivery Orders"]
        elif business_type == "clothing":
            products_services = ["T-Shirts", "Trousers", "Dresses", "Casual Wear", "Office Wear", "Seasonal Clothing"]
        elif business_type == "salon":
            products_services = ["Hair Styling", "Facials & Skin Care", "Hair Coloring", "Manicure & Pedicure"]
        elif business_type == "vehicle_parts":
            products_services = ["Automotive Spare Parts", "Engine Lubricants", "Batteries", "Vehicle Accessories"]

    profile["products_services"] = products_services[:12]

    # 7. Staff & Employees
    employees_count = 2
    staff_match = re.search(r"Available\s+Staff\s+Count\s*\((\d+)\s*Staff\)", full_text, re.IGNORECASE)
    if staff_match:
        employees_count = int(staff_match.group(1))
    else:
        staff_match2 = re.search(r"deploys\s+(\d+)\s+active\s+staff", full_text, re.IGNORECASE)
        if staff_match2:
            employees_count = int(staff_match2.group(1))
        else:
            staff_match3 = re.search(r"(\d+)\s+(?:employees|staff|workers)", full_text, re.IGNORECASE)
            if staff_match3:
                employees_count = int(staff_match3.group(1))

    profile["number_of_employees"] = employees_count
    profile["employees"] = employees_count

    # 8. Physical Premises
    # Almost all SME retail / service plans have a physical storefront / premise
    has_physical_premises = True
    if "online-only" in full_text.lower() or "no physical premises" in full_text.lower():
        has_physical_premises = False

    profile["has_physical_premises"] = has_physical_premises

    # 9. Capital & Financials
    capital_lkr = None
    m = re.search(r"Available\s+Capital\s*\(Lkr\)\s*\([^\d]*([\d,]+)\)", full_text, re.IGNORECASE)
    if m:
        capital_lkr = _clean_num(m.group(1))
    else:
        m2 = re.search(r"invest\s+approximately\s+LKR\s*([\d,]+)", full_text, re.IGNORECASE)
        if m2:
            capital_lkr = _clean_num(m2.group(1))

    loan_lkr = None
    m_loan = re.search(r"Requested\s+Loan\s+Amount\s*\(Lkr\)\s*\([^\d]*([\d,]+)\)", full_text, re.IGNORECASE)
    if m_loan:
        loan_lkr = _clean_num(m_loan.group(1))

    monthly_budget = None
    m_mb = re.search(r"Monthly\s+Budget:\s*LKR\s*([\d,]+)", full_text, re.IGNORECASE)
    if m_mb:
        monthly_budget = _clean_num(m_mb.group(1))

    profile["available_capital_lkr"] = capital_lkr
    profile["requested_loan_lkr"] = loan_lkr
    profile["monthly_budget_lkr"] = monthly_budget

    # 10. Active Operating Strategy
    strategy = None
    m_strat = re.search(r"ACTIVE\s+OPERATING\s+STRATEGY:\s*([^\n\r\(]+)", full_text, re.IGNORECASE)
    if m_strat:
        strategy = _clean_str(m_strat.group(1))
    elif "Online Ordering & Delivery Expansion" in full_text:
        strategy = "Online Ordering & Delivery Expansion"
    elif "Storefront + Home Delivery Model" in full_text:
        strategy = "Storefront + Home Delivery Model"

    profile["selected_strategy"] = strategy

    # 11. Decision System Reference UUID
    decision_ref = None
    m_ref = re.search(r"Decision\s+System\s+Reference:\s*([a-f0-9\-]+)", full_text, re.IGNORECASE)
    if m_ref:
        decision_ref = _clean_str(m_ref.group(1))

    profile["decision_system_reference"] = decision_ref

    # 12. Component 2 Operational Compliance Conditions
    profile["legal_form"] = "sole_proprietorship"
    profile["ownership"] = "sole_proprietorship"
    profile["handles_food"] = (business_type == "food")
    profile["serves_cooked_food"] = False  # default false for grocery retail unless restaurant
    if business_type == "food" and ("restaurant" in search_corpus or "cooked food" in search_corpus or "cafe" in search_corpus):
        profile["serves_cooked_food"] = True

    profile["sells_alcohol"] = False
    profile["uses_chemicals_or_cosmetics"] = (business_type == "salon")
    profile["handles_waste_oil_or_batteries"] = (business_type == "vehicle_parts")
    profile["is_manufacturing"] = False
    profile["is_importing"] = False

    # Turnover band estimate
    if capital_lkr and capital_lkr > 10_000_000:
        profile["turnover_band"] = "10m_50m"
    elif capital_lkr and capital_lkr >= 1_000_000:
        profile["turnover_band"] = "1m_10m"
    else:
        profile["turnover_band"] = "under_1m"

    metadata["summary"] = (
        f"Extracted profile for '{biz_name}' ({raw_category or business_type}), "
        f"Stage: {stage}, Location: {district} ({province}), Employees: {employees_count}, "
        f"Strategy: {strategy or 'N/A'}."
    )

    return {
        "profile": profile,
        "metadata": metadata,
    }
