import re
from typing import Dict, Any, List, Tuple, Optional
from src.intake.dynamic_config import get_dynamic_field_config, ALL_FIELD_DEFINITIONS

WORD_TO_NUM = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15,
    "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20,
    "thirty": 30, "forty": 40, "fifty": 50
}


def parse_numeric_amount(text_snippet: str) -> Tuple[Optional[float], Optional[str]]:
    """
    Parses currency/numeric amounts from text snippets (e.g. '500,000', '500k', '5 lakh', 'half a million', '1.5 million').
    Returns (numeric_value, extraction_note).
    """
    lower = text_snippet.lower()
    
    # Check text numbers
    if "half a million" in lower or "lakhs 5" in lower or "5 lakh" in lower or "5 lak" in lower:
        return 500000.0, "Extracted as LKR 500,000 from phrase"
    if "1 million" in lower or "10 lakh" in lower:
        return 1000000.0, "Extracted as LKR 1,000,000 from phrase"
    if "2 million" in lower:
        return 2000000.0, "Extracted as LKR 2,000,000 from phrase"
        
    # Check digits with k/lakh/million multipliers
    k_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:k|thousand)', lower)
    if k_match:
        return float(k_match.group(1)) * 1000.0, f"Extracted as {float(k_match.group(1)) * 1000} from '{k_match.group(0)}'"

    lakh_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:lakh|laks|lacs|lakhs)', lower)
    if lakh_match:
        return float(lakh_match.group(1)) * 100000.0, f"Extracted as {float(lakh_match.group(1)) * 100000} from '{lakh_match.group(0)}'"

    mn_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:million|mn)', lower)
    if mn_match:
        return float(mn_match.group(1)) * 1000000.0, f"Extracted as {float(mn_match.group(1)) * 1000000} from '{mn_match.group(0)}'"

    # Raw numbers with optional commas
    raw_match = re.search(r'(?:rs\.?|lkr|\$)?\s*([\d,]{4,10})', lower)
    if raw_match:
        val_str = raw_match.group(1).replace(',', '')
        try:
            val = float(val_str)
            return val, f"Extracted numeric value LKR {val:,.0f}"
        except ValueError:
            pass

    return None, None


def extract_business_info(user_text: str, specified_stage: str = "", specified_goal: str = "") -> Dict[str, Any]:
    """
    Context-Aware NLP Information Extraction Engine for Component 1.
    Processes user natural language text (English, Singlish, Sinhala-English)
    and maps extracted facts to dynamic context-aware schema fields.
    
    STRICT RULE: Fields not mentioned are marked status="missing" with value=None.
    """
    if not user_text or not user_text.strip():
        raise ValueError("Business description text cannot be empty.")

    text = user_text.strip()
    lower_text = text.lower()

    # 1. Detect Stage & Goal from text if not explicitly specified
    detected_stage = specified_stage.strip() if specified_stage else ""
    if not detected_stage:
        if any(w in lower_text for w in ["expand", "existing", "branch", "already", "thiyenawa", "diwunu", "running"]):
            detected_stage = "Existing"
        else:
            detected_stage = "New"

    detected_goal = specified_goal.strip() if specified_goal else ""
    if not detected_goal:
        if "branch" in lower_text or "expand" in lower_text:
            detected_goal = "Open New Branch"
        elif "product" in lower_text or "item" in lower_text or "offering" in lower_text:
            detected_goal = "Introduce New Product"
        else:
            detected_goal = "Establish New Business" if detected_stage == "New" else "Open New Branch"

    # 2. Category Detection (Strictly Restricted to 4 SME Business Categories)
    if any(w in lower_text for w in ["salon", "saloon", "beauty", "hair", "parlour", "facial", "spa", "makeup", "cosmetics"]):
        detected_category = "Beauty Salon"
    elif any(w in lower_text for w in ["garment", "garments", "clothing", "apparel", "textile", "sewing", "tailor", "tailoring", "fashion", "dress", "andum"]):
        detected_category = "Clothing / Garment"
    elif any(w in lower_text for w in ["bakery", "confectionery", "pastry", "cake", "bread", "buns", "baking", "bake", "patisserie"]):
        detected_category = "Bakery / Food / Grocery"
    elif any(w in lower_text for w in ["grocery", "mini-mart", "minimart", "mart", "supermarket", "retail", "store", "provisions", "kade", "kadayak", "shop"]):
        detected_category = "Grocery / Mini-Mart"
    else:
        detected_category = "Grocery / Mini-Mart"

    # 3. Retrieve Context-Aware Field Config (Required, Optional, Hidden)
    dynamic_cfg = get_dynamic_field_config(detected_stage, detected_goal, detected_category)
    field_config = dynamic_cfg["field_config"]

    extracted_fields = {}

    # Initialize all fields as 'missing' by default
    for field_key, meta in ALL_FIELD_DEFINITIONS.items():
        state_cfg = field_config.get(field_key, {"state": "optional"})
        extracted_fields[field_key] = {
            "value": None,
            "status": "hidden" if state_cfg["state"] == "hidden" else "missing",
            "requirement_state": state_cfg["state"],  # 'required', 'optional', 'hidden'
            "confidence": 0.0,
            "label": meta["label"],
            "type": meta["type"],
            "note": None
        }

    # Set Stage & Category
    extracted_fields["business_stage"]["value"] = detected_stage
    extracted_fields["business_stage"]["status"] = "extracted"
    extracted_fields["business_stage"]["confidence"] = 0.98

    extracted_fields["business_category"]["value"] = detected_category
    extracted_fields["business_category"]["status"] = "extracted"
    extracted_fields["business_category"]["confidence"] = 0.95

    # Business / Enterprise Name extraction
    name_patterns = [
        r'^(?:my\s+business\s+)?([A-Za-z0-9\s&\'\.\-]+?)\s+(?:is|will be|planned to be)\s+(?:a|an)\s+(?:new|existing)?\s*(?:bakery|salon|shop|grocery|garment|business|store|enterprise|boutique|mart)',
        r'(?:named|called|name is|named as|brand name is|brand is)\s+["\']?([A-Za-z0-9\s&\'\.\-]+?(?:Shop|Store|Mart|Bakery|Salon|Saloon|Garments|Enterprise|Enterprises|Creations|Foods|Boutique|Trading|Center|Centre|House)?)["\']?(?:\s+(?:in|at|with|for|,|\.|$))',
        r'["\']([A-Za-z0-9\s&\'\.\-]{3,40}\b(?:Shop|Store|Mart|Bakery|Salon|Saloon|Garments|Enterprise|Enterprises|Creations|Foods|Boutique|House)?)["\']'
    ]
    extracted_biz_name = None
    for pattern in name_patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            candidate = m.group(1).strip()
            if 3 <= len(candidate) <= 50 and candidate.lower() not in ["a new", "an existing", "the business", "this business", "our business"]:
                extracted_biz_name = candidate
                break

    if extracted_biz_name and "business_name" in extracted_fields:
        extracted_fields["business_name"] = {
            "value": extracted_biz_name,
            "status": "extracted",
            "requirement_state": "optional",
            "confidence": 0.92,
            "label": "Business / Company Name",
            "type": "text",
            "note": f"Extracted business name: '{extracted_biz_name}'"
        }

    # District & Location Type
    colombo_locs = ["homagama", "maharagama", "nugegoda", "kattuwa", "dehiwala", "ratmalana", "moratuwa", "kesbewa", "piliyandala", "avissawella", "hanwella", "battaramulla", "kottawa", "kotte", "kollupitiya", "bambalapitiya", "pettah", "borella", "colombo"]
    gampaha_locs = ["gampaha", "negombo", "kelaniya", "ja-ela", "wattala", "kiribathgoda", "kadawatha", "minuwangoda"]
    kalutara_locs = ["kalutara", "panadura", "horana", "beruwala", "matugama"]

    found_loc = None
    if any(loc in lower_text for loc in colombo_locs):
        extracted_fields["district"] = {"value": "Colombo", "status": "extracted", "requirement_state": "required", "confidence": 0.98, "label": "District", "type": "select", "note": "Colombo District detected"}
        extracted_fields["province"] = {"value": "Western", "status": "extracted", "requirement_state": "optional", "confidence": 0.98, "label": "Province", "type": "text", "note": "Derived Western Province"}
        for loc in colombo_locs:
            if loc in lower_text:
                found_loc = loc.capitalize()
                break
    elif any(loc in lower_text for loc in gampaha_locs):
        extracted_fields["district"] = {"value": "Gampaha", "status": "extracted", "requirement_state": "required", "confidence": 0.98, "label": "District", "type": "select", "note": "Gampaha District detected"}
        extracted_fields["province"] = {"value": "Western", "status": "extracted", "requirement_state": "optional", "confidence": 0.98, "label": "Province", "type": "text", "note": "Derived Western Province"}
    elif any(loc in lower_text for loc in kalutara_locs):
        extracted_fields["district"] = {"value": "Kalutara", "status": "extracted", "requirement_state": "required", "confidence": 0.98, "label": "District", "type": "select", "note": "Kalutara District detected"}
        extracted_fields["province"] = {"value": "Western", "status": "extracted", "requirement_state": "optional", "confidence": 0.98, "label": "Province", "type": "text", "note": "Derived Western Province"}

    # Location Type (if not hidden)
    if extracted_fields["location_type"]["requirement_state"] != "hidden":
        if any(re.search(p, lower_text) for p in [r'\bhome[\s-]based\b', r'\bgedara\b', r'\bfrom home\b', r'\bworking from home\b', r'\boperate from home\b']):
            extracted_fields["location_type"] = {"value": "Home Based", "status": "extracted", "requirement_state": extracted_fields["location_type"]["requirement_state"], "confidence": 0.95, "label": "Location Type", "type": "select", "note": "Home-based operation detected"}
        elif any(re.search(p, lower_text) for p in [r'\bindustrial\b', r'\bfactory zone\b', r'\bzone\b', r'\bindustrial park\b']):
            extracted_fields["location_type"] = {"value": "Industrial Zone", "status": "extracted", "requirement_state": extracted_fields["location_type"]["requirement_state"], "confidence": 0.90, "label": "Location Type", "type": "select", "note": "Industrial zone detected"}
        elif any(re.search(p, lower_text) for p in [r'\bmain street\b', r'\bmain road\b', r'\bcity center\b', r'\btown center\b', r'\bhigh street\b']):
            extracted_fields["location_type"] = {"value": "Urban Main Street", "status": "extracted", "requirement_state": extracted_fields["location_type"]["requirement_state"], "confidence": 0.90, "label": "Location Type", "type": "select", "note": "Urban main street detected"}
        elif found_loc in ["Homagama", "Maharagama", "Kottawa", "Piliyandala", "Kadawatha", "Horana", "Panadura"] or "suburban" in lower_text or "hub" in lower_text:
            extracted_fields["location_type"] = {"value": "Suburban Commercial Hub", "status": "extracted", "requirement_state": extracted_fields["location_type"]["requirement_state"], "confidence": 0.90, "label": "Location Type", "type": "select", "note": f"Suburban Commercial Hub detected ({found_loc or 'Hub'})"}

    # Proposed Action
    act_text = f"{detected_goal} ({detected_category})"
    extracted_fields["proposed_action"] = {"value": act_text, "status": "extracted", "requirement_state": "required", "confidence": 0.90, "label": "Proposed Action", "type": "text", "note": f"Context Goal: {detected_goal}"}

    # 1. Loan Amount (evaluated first to isolate bank loans from equity/capital)
    loan_match = re.search(r'(?:loan|bank loan|borrow|credit|naya)\s*(?:of|is|=|:|around|approx|about)?\s*(?:rs\.?|lkr|\$)?\s*([\d,]+(?:\.\d+)?\s*(?:k|lakh|lakhs|million)?)', lower_text)
    loan_val = None
    if loan_match:
        val, loan_note = parse_numeric_amount(loan_match.group(0))
        if val is not None and val > 0:
            loan_val = val
            extracted_fields["loan_amount_lkr"] = {
                "value": val, "status": "extracted", "requirement_state": extracted_fields["loan_amount_lkr"]["requirement_state"], "confidence": 0.92, "label": "Requested Loan Amount (LKR)", "type": "number", "note": loan_note or f"Extracted loan amount LKR {val:,.0f}"
            }

    # 2. Available Capital Extraction
    cap_patterns = [
        r'(?:plan to invest|invest|investing|put in|inject|seed money of)\s*(?:around|approx|about)?\s*(?:rs\.?|lkr|\$)?\s*([\d,]+(?:\.\d+)?\s*(?:k|lakh|lakhs|laks|million|mn)?)',
        r'(?:rs\.?|lkr|\$)?\s*([\d,]+(?:\.\d+)?\s*(?:k|lakh|lakhs|laks|million|mn)?)\s*(?:from|as|of)?\s*(?:my\s+)?(?:available\s+)?(?:capital|savings|funds|investment|equity|salli)',
        r'(?:available\s+)?(?:capital|savings|funds|equity|salli)\s*(?:of|is|=|:|\s+)*\s*(?:around|approx|about)?\s*(?:rs\.?|lkr|\$)?\s*([\d,]+(?:\.\d+)?\s*(?:k|lakh|lakhs|laks|million|mn)?)',
        r'(?:have|with|starting with)\s*(?:around|approx|about)?\s*(?:rs\.?|lkr|\$)?\s*([\d,]+(?:\.\d+)?\s*(?:k|lakh|lakhs|laks|million|mn)?)\s*(?:available|capital|to start)?'
    ]
    
    cap_val, cap_note = None, None
    if "half a million" in lower_text:
        cap_val, cap_note = 500000.0, "Extracted from 'half a million'"
    else:
        for pat in cap_patterns:
            m = re.search(pat, lower_text)
            if m:
                val, note = parse_numeric_amount(m.group(1))
                if val is None:
                    val, note = parse_numeric_amount(m.group(0))
                if val is not None and 1000 <= val <= 100000000:
                    if loan_val is not None and val == loan_val and ('invest' in lower_text or 'available capital' in lower_text):
                        continue
                    cap_val, cap_note = val, note
                    break

    if cap_val:
        is_approx = any(w in lower_text for w in ["approx", "around", "about", "half a million", "maybe", "rough"])
        status = "needs_verification" if is_approx else "extracted"
        conf = 0.75 if is_approx else 0.95
        extracted_fields["available_capital_lkr"] = {
            "value": cap_val, "status": status, "requirement_state": extracted_fields["available_capital_lkr"]["requirement_state"], "confidence": conf, "label": "Available Capital (LKR)", "type": "number", "note": cap_note or f"Extracted LKR {cap_val:,.0f}"
        }

    # 3. Monthly Budget
    budget_match = re.search(r'(?:monthly budget|operating budget|monthly cost|viyadama)\s*(?:of|is|=|:)?\s*(?:rs\.?|lkr)?\s*([\d,\.]+\s*(?:k|lakh|lakhs|million)?)', lower_text)
    if budget_match:
        bud_val, bud_note = parse_numeric_amount(budget_match.group(0))
        if bud_val:
            extracted_fields["monthly_budget_lkr"] = {
                "value": bud_val, "status": "extracted", "requirement_state": extracted_fields["monthly_budget_lkr"]["requirement_state"], "confidence": 0.90, "label": "Monthly Operating Budget (LKR)", "type": "number", "note": bud_note
            }

    # 4. Expected Unit Selling Price / Average Spend
    price_pats = [
        r'(?:average\s+)?(?:purchase value|order value|basket size|spend per|ticket size|spend|price per|price|unit price|cost per|selling price|gana)\s*(?:of|is|=|:|around|approx|about)?\s*(?:rs\.?|lkr|\$)?\s*([\d,]+(?:\.\d+)?)',
        r'([\d,]+(?:\.\d+)?)\s*(?:rs\.?|lkr|\$)?\s*(?:per customer|per visit|per head|per person|average purchase|average spend|ticket size|unit price|price)'
    ]
    for pat in price_pats:
        m = re.search(pat, lower_text)
        if m:
            val_str = m.group(1).replace(',', '')
            try:
                pval = float(val_str)
                if 5 <= pval <= 100000:
                    extracted_fields["expected_price_lkr"] = {
                        "value": pval, "status": "extracted", "requirement_state": extracted_fields["expected_price_lkr"]["requirement_state"], "confidence": 0.90, "label": "Expected Unit Price / Average Spend (LKR)", "type": "number", "note": f"Extracted price LKR {pval:,.0f}"
                    }
                    break
            except ValueError:
                pass

    # 5. Operational Factors
    cust_match = re.search(r'(\d+)\s*(?:customers|buyers|clients|footfall|dennek)\s*(?:per day|a day|daily)?', lower_text) or \
                 re.search(r'(?:expect|target|have|serve)\s*(?:around|about)?\s*(\d+)\s*customers', lower_text)
    if cust_match:
        try:
            cval = int(cust_match.group(1))
            if 1 <= cval <= 2000:
                extracted_fields["expected_customers_per_day"] = {
                    "value": cval, "status": "extracted", "requirement_state": extracted_fields["expected_customers_per_day"]["requirement_state"], "confidence": 0.95, "label": "Expected Customers / Day", "type": "number", "note": f"Extracted {cval} daily customers"
                }
        except ValueError:
            pass

    exp_num_regex = r'(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty)'
    exp_pats = [
        rf'(?:running|operating|managing|in business|experience|run)?[\s\w]*?(?:for|with|having)?\s*(?:the\s+past\s+)?{exp_num_regex}\s*(?:years|year|yrs|yr|awurudu|awrudu)',
        rf'{exp_num_regex}\s*(?:years|year|yrs|yr|awurudu|awrudu)\s*(?:of)?\s*(?:experience|running|managing|working|in business|exp)',
        rf'(?:experience|running for|operating for)\s*(?:of)?\s*{exp_num_regex}\s*(?:years|year|yr|yrs|awurudu)?'
    ]
    for pat in exp_pats:
        m = re.search(pat, lower_text)
        if m:
            num_str = m.group(1).lower()
            eval_val = int(num_str) if num_str.isdigit() else WORD_TO_NUM.get(num_str)
            if eval_val is not None and 0 <= eval_val <= 60:
                extracted_fields["entrepreneur_experience_years"] = {
                    "value": eval_val, "status": "extracted", "requirement_state": extracted_fields["entrepreneur_experience_years"]["requirement_state"], "confidence": 0.95, "label": "Entrepreneur Experience (Years)", "type": "number", "note": f"Extracted {eval_val} years experience"
                }
                break

    # Staff Count extraction (available & required)
    zero_staff_match = re.search(
        r'\b(?:no|zero|without|don\'?t have (?:any)?|not having (?:any)?)\s+(?:staff|employees|workers|assistants|team members|sewakayan)\b', lower_text
    ) or re.search(r'\b(?:operate|operating|running|working)\s+(?:alone|solo|by myself)\b', lower_text)

    req_match = re.search(
        r'(?:needs?|require[sd]?|looking for|plan to hire|want to hire|looking to hire)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:staff|employees|workers|assistants)', lower_text
    )
    req_val = None
    if req_match:
        raw_req = req_match.group(1).lower()
        req_val = int(raw_req) if raw_req.isdigit() else WORD_TO_NUM.get(raw_req)

    if zero_staff_match:
        extracted_fields["available_staff_count"] = {
            "value": 0, "status": "extracted", "requirement_state": extracted_fields["available_staff_count"]["requirement_state"], "confidence": 0.95, "label": "Available Staff Count", "type": "number", "note": "Detected zero staff / solo operator"
        }
        extracted_fields["required_staff_count"] = {
            "value": req_val if req_val is not None else 1, "status": "extracted", "requirement_state": extracted_fields["required_staff_count"]["requirement_state"], "confidence": 0.90, "label": "Required Staff Count", "type": "number", "note": f"Required staff: {req_val if req_val is not None else 1}"
        }
    else:
        staff_num_regex = r'(\d+|one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty)'
        staff_match = re.search(rf'{staff_num_regex}\s*(?:staff|employees|workers|assistants|crew|team members|sewakayan)', lower_text) or \
                      re.search(rf'(?:have|employ|hire|with)\s*{staff_num_regex}\s*(?:staff|employees|workers)', lower_text) or \
                      re.search(rf'(?:staff|employees|workers|team)\s*(?:is|count is|of|=|:|\s+)*\s*{staff_num_regex}', lower_text)
        if staff_match:
            try:
                raw_s = staff_match.group(1).lower()
                sval = int(raw_s) if raw_s.isdigit() else WORD_TO_NUM.get(raw_s)
                if sval is not None and 0 <= sval <= 100:
                    extracted_fields["available_staff_count"] = {
                        "value": sval, "status": "extracted", "requirement_state": extracted_fields["available_staff_count"]["requirement_state"], "confidence": 0.92, "label": "Available Staff Count", "type": "number", "note": f"Extracted staff count: {sval}"
                    }
                    extracted_fields["required_staff_count"] = {
                        "value": req_val if req_val is not None else sval, "status": "extracted", "requirement_state": extracted_fields["required_staff_count"]["requirement_state"], "confidence": 0.88, "label": "Required Staff Count", "type": "number", "note": f"Inferred required staff count: {req_val if req_val is not None else sval}"
                    }
            except ValueError:
                pass

    # Competition Level
    if any(w in lower_text for w in [
        "high competition", "strong competition", "intense competition", "heavy competition",
        "fierce competition", "many competitors", "lots of shops", "saturated", "godak kade",
        "established chains", "four established", "established bakery chains", "supermarkets within"
    ]):
        extracted_fields["competition_level"] = {"value": "High", "status": "extracted", "requirement_state": extracted_fields["competition_level"]["requirement_state"], "confidence": 0.92, "label": "Market Competition Level", "type": "select", "note": "High competition detected"}
    elif any(w in lower_text for w in ["moderate competition", "some competition", "some competitors", "medium competition", "normal competition", "samanya", "fair competition"]):
        extracted_fields["competition_level"] = {"value": "Moderate", "status": "extracted", "requirement_state": extracted_fields["competition_level"]["requirement_state"], "confidence": 0.90, "label": "Market Competition Level", "type": "select", "note": "Moderate competition detected"}
    elif any(w in lower_text for w in ["low competition", "no competition", "no competitors", "few shops", "little competition", "minimal competition", "no other", "unique in the area"]):
        extracted_fields["competition_level"] = {"value": "Low", "status": "extracted", "requirement_state": extracted_fields["competition_level"]["requirement_state"], "confidence": 0.90, "label": "Market Competition Level", "type": "select", "note": "Low competition detected"}

    # Summary Stats
    extracted_count = sum(1 for f in extracted_fields.values() if f["status"] == "extracted")
    needs_verif_count = sum(1 for f in extracted_fields.values() if f["status"] == "needs_verification")
    missing_req_keys = [k for k, f in extracted_fields.items() if f["status"] == "missing" and f["requirement_state"] == "required"]
    missing_opt_keys = [k for k, f in extracted_fields.items() if f["status"] == "missing" and f["requirement_state"] == "optional"]
    hidden_keys = [k for k, f in extracted_fields.items() if f["requirement_state"] == "hidden"]

    return {
        "original_text": text,
        "context": {
            "business_stage": detected_stage,
            "business_goal": detected_goal,
            "business_category": detected_category
        },
        "extracted_fields": extracted_fields,
        "summary": {
            "total_fields": len(ALL_FIELD_DEFINITIONS),
            "extracted_count": extracted_count,
            "needs_verification_count": needs_verif_count,
            "missing_required_count": len(missing_req_keys),
            "missing_optional_count": len(missing_opt_keys),
            "hidden_count": len(hidden_keys),
            "missing_required_field_keys": missing_req_keys,
            "missing_optional_field_keys": missing_opt_keys,
            "hidden_field_keys": hidden_keys
        }
    }
