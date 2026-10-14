"""
Conversational Business Intake Engine for SME360 AI.
Supports multi-turn natural language dialogue (English, Singlish, Sinhala-English),
incremental context-aware information extraction with field-level provenance tracking,
and intelligent non-rigid follow-up guidance for SME business feasibility profiling.
"""

import re
from typing import Dict, Any, List, Optional, Tuple
from src.intake.extractor import parse_numeric_amount, extract_business_info
from src.intake.dynamic_config import (
    get_dynamic_field_config,
    ALL_FIELD_DEFINITIONS,
    SUPPORTED_CATEGORIES,
    BUSINESS_STAGES,
    BUSINESS_GOALS
)

# Canonical Stage Normalization
def normalize_stage_canonical(stage_str: Optional[str]) -> str:
    """Normalizes any business stage string to canonical 'New' or 'Existing'."""
    if not stage_str:
        return "New"
    s = str(stage_str).strip().lower()
    if "exist" in s or "growth" in s or "operating" in s or "current" in s:
        return "Existing"
    return "New"


def normalize_goal_canonical(stage: str, goal_str: Optional[str]) -> str:
    """Returns canonical goal for the selected stage."""
    canonical_stage = normalize_stage_canonical(stage)
    if not goal_str or not str(goal_str).strip():
        return "Establish New Business" if canonical_stage == "New" else "Open New Branch"

    g = str(goal_str).strip()
    if canonical_stage == "New":
        if "home" in g.lower():
            return "Start Home-Based Enterprise"
        if "digital" in g.lower() or "online" in g.lower() or "e-commerce" in g.lower():
            return "Launch Digital Store"
        return "Establish New Business"
    else:
        if "product" in g.lower() or "service" in g.lower() or "item" in g.lower() or "line" in g.lower():
            return "Introduce New Product"
        return "Open New Branch"


def extract_turn_facts(text: str, stage: str, goal: str) -> Dict[str, Dict[str, Any]]:
    """
    Extracts business facts strictly from a single user message turn.
    Returns a dictionary of extracted fields with provenance and confidence.
    """
    if not text or not text.strip():
        return {}

    lower = text.lower().strip()
    extracted: Dict[str, Dict[str, Any]] = {}

    # Category Detection
    category_match = None
    if any(w in lower for w in ["salon", "saloon", "beauty", "hair", "parlour", "facial", "spa", "makeup", "cosmetics"]):
        category_match = "Beauty Salon"
    elif any(w in lower for w in ["garment", "garments", "clothing", "apparel", "textile", "sewing", "tailor", "tailoring", "fashion", "dress", "andum"]):
        category_match = "Clothing / Garment"
    elif any(w in lower for w in ["bakery", "confectionery", "pastry", "cake", "bread", "buns", "baking", "bake", "patisserie"]):
        category_match = "Bakery / Food / Grocery"
    elif any(w in lower for w in ["grocery", "mini-mart", "minimart", "mart", "supermarket", "retail", "store", "provisions", "kade", "kadayak", "shop"]):
        category_match = "Grocery / Mini-Mart"

    if category_match:
        extracted["business_category"] = {
            "value": category_match,
            "provenance": "explicit",
            "confidence": 0.95,
            "label": "Business Category",
            "type": "select",
            "note": f"Identified category: {category_match}"
        }

    # District & Province Detection
    colombo_locs = ["homagama", "maharagama", "nugegoda", "kattuwa", "dehiwala", "ratmalana", "moratuwa", "kesbewa", "piliyandala", "avissawella", "hanwella", "battaramulla", "kottawa", "kotte", "kollupitiya", "bambalapitiya", "pettah", "borella", "colombo"]
    gampaha_locs = ["gampaha", "negombo", "kelaniya", "ja-ela", "wattala", "kiribathgoda", "kadawatha", "minuwangoda"]
    kalutara_locs = ["kalutara", "panadura", "horana", "beruwala", "matugama"]

    found_loc = None
    if any(loc in lower for loc in colombo_locs):
        extracted["district"] = {
            "value": "Colombo",
            "provenance": "explicit",
            "confidence": 0.98,
            "label": "District",
            "type": "select",
            "note": "Colombo District detected"
        }
        extracted["province"] = {
            "value": "Western",
            "provenance": "derived",
            "confidence": 0.99,
            "label": "Province",
            "type": "text",
            "note": "Deterministically derived from Western Province"
        }
        for loc in colombo_locs:
            if loc in lower:
                found_loc = loc.capitalize()
                break
    elif any(loc in lower for loc in gampaha_locs):
        extracted["district"] = {
            "value": "Gampaha",
            "provenance": "explicit",
            "confidence": 0.98,
            "label": "District",
            "type": "select",
            "note": "Gampaha District detected"
        }
        extracted["province"] = {
            "value": "Western",
            "provenance": "derived",
            "confidence": 0.99,
            "label": "Province",
            "type": "text",
            "note": "Deterministically derived from Western Province"
        }
    elif any(loc in lower for loc in kalutara_locs):
        extracted["district"] = {
            "value": "Kalutara",
            "provenance": "explicit",
            "confidence": 0.98,
            "label": "District",
            "type": "select",
            "note": "Kalutara District detected"
        }
        extracted["province"] = {
            "value": "Western",
            "provenance": "derived",
            "confidence": 0.99,
            "label": "Province",
            "type": "text",
            "note": "Deterministically derived from Western Province"
        }

    # Location Type
    if any(w in lower for w in ["home based", "home-based", "gedara", "at home", "from home", "house"]):
        extracted["location_type"] = {
            "value": "Home Based",
            "provenance": "explicit",
            "confidence": 0.95,
            "label": "Location Type",
            "type": "select",
            "note": "Home-based operation detected"
        }
    elif any(w in lower for w in ["industrial", "zone", "factory", "park"]):
        extracted["location_type"] = {
            "value": "Industrial Zone",
            "provenance": "explicit",
            "confidence": 0.92,
            "label": "Location Type",
            "type": "select",
            "note": "Industrial zone detected"
        }
    elif any(w in lower for w in ["main street", "main road", "urban", "town center", "city center", "high street"]):
        extracted["location_type"] = {
            "value": "Urban Main Street",
            "provenance": "explicit",
            "confidence": 0.92,
            "label": "Location Type",
            "type": "select",
            "note": "Urban Main Street detected"
        }
    elif found_loc in ["Homagama", "Maharagama", "Kottawa", "Piliyandala", "Kadawatha", "Horana", "Panadura"] or "suburban" in lower or "commercial hub" in lower:
        extracted["location_type"] = {
            "value": "Suburban Commercial Hub",
            "provenance": "explicit",
            "confidence": 0.90,
            "label": "Location Type",
            "type": "select",
            "note": f"Suburban Commercial Hub detected ({found_loc or 'Hub'})"
        }

    # Prompt injection defense: ignore malicious instruction overrides
    is_injection_attempt = any(p in lower for p in [
        "ignore previous", "ignore all", "override", "bypass", "system prompt", "jailbreak", "set feasibility"
    ])

    # Available Capital / Investment Amount
    cap_patterns = [
        r'(?:capital|investment|funds|seed money|salli)[\s\w:=around|approx|about]*?(?:rs\.?|lkr|\$)?\s*([\d,]+(?:\.\d+)?\s*(?:k|lakh|lakhs|laks|million|mn)?)',
        r'(?:have|with|available|investing|starting with)[\s\w:=around|approx|about]*?(?:capital|investment|salli)?[\s\w:=around|approx|about]*?(?:rs\.?|lkr|\$)?\s*([\d,]+(?:\.\d+)?\s*(?:k|lakh|lakhs|laks|million|mn)?)',
        r'([\d,\.]+\s*(?:k|lakh|lakhs|laks|million|mn)?)\s*(?:in capital|capital|available capital|seed money|investment|salli thiyenawa)',
    ]
    if not is_injection_attempt:
        for pat in cap_patterns:
            m = re.search(pat, lower)
            if m:
                val, note = parse_numeric_amount(m.group(0))
                # Enforce realistic SME capital boundaries (up to 100M LKR)
                if val is not None and 1000 <= val <= 100000000:
                    is_approx = any(w in lower for w in ["approx", "around", "about", "maybe", "rough"])
                    extracted["available_capital_lkr"] = {
                        "value": val,
                        "provenance": "ambiguous" if is_approx else "explicit",
                        "confidence": 0.80 if is_approx else 0.95,
                        "label": "Available Capital (LKR)",
                        "type": "number",
                        "note": note or f"Extracted LKR {val:,.0f}"
                    }
                    break

    # Requested Loan Amount
    loan_match = re.search(r'(?:loan|bank loan|naya|credit)\s*(?:of|is|=|:)?\s*(?:rs\.?|lkr)?\s*([\d,\.]+\s*(?:k|lakh|lakhs|million)?)', lower)
    if loan_match:
        val, note = parse_numeric_amount(loan_match.group(0))
        if val is not None and val > 0:
            extracted["loan_amount_lkr"] = {
                "value": val,
                "provenance": "explicit",
                "confidence": 0.92,
                "label": "Requested Loan Amount (LKR)",
                "type": "number",
                "note": note or f"Extracted loan amount LKR {val:,.0f}"
            }

    # Monthly Operating Budget
    budget_match = re.search(r'(?:monthly budget|operating budget|monthly cost|monthly expense|operating cost|viyadama)\s*(?:of|is|=|:|around|approx|about|\s+)*\s*(?:rs\.?|lkr)?\s*([\d,\.]+\s*(?:k|lakh|lakhs|million)?)', lower) or \
                   re.search(r'([\d,\.]+\s*(?:k|lakh|lakhs|million)?)\s*(?:rs\.?|lkr|\$)?\s*(?:per month|monthly|a month|monthly budget|operating cost)', lower)
    if budget_match:
        val, note = parse_numeric_amount(budget_match.group(0))
        if val is not None and val > 0:
            extracted["monthly_budget_lkr"] = {
                "value": val,
                "provenance": "explicit",
                "confidence": 0.90,
                "label": "Monthly Operating Budget (LKR)",
                "type": "number",
                "note": note or f"Extracted monthly budget LKR {val:,.0f}"
            }

    # Initial Inventory Cost
    inv_match = re.search(r'(?:initial inventory|inventory cost|stock|starting inventory|badu ganna)\s*(?:of|is|=|:)?\s*(?:rs\.?|lkr)?\s*([\d,\.]+\s*(?:k|lakh|lakhs|million)?)', lower)
    if inv_match:
        val, note = parse_numeric_amount(inv_match.group(0))
        if val is not None and val > 0:
            extracted["initial_inventory_cost_lkr"] = {
                "value": val,
                "provenance": "explicit",
                "confidence": 0.90,
                "label": "Initial Inventory Cost (LKR)",
                "type": "number",
                "note": note or f"Extracted inventory cost LKR {val:,.0f}"
            }

    # Expected Unit Selling Price / Average Spend
    price_match = re.search(r'(?:average price|price per|spend per|unit price|ticket size|gana)\s*(?:of|is|=|:)?\s*(?:rs\.?|lkr)?\s*(\d+(?:,\d+)?)', lower) or \
                  re.search(r'(\d+(?:,\d+)?)\s*(?:rs\.?|lkr)?\s*(?:average price|price per unit|unit price|average spend|ticket size)', lower)
    if price_match:
        try:
            raw_p = float(price_match.group(1).replace(",", ""))
            if 5 <= raw_p <= 100000:
                extracted["expected_price_lkr"] = {
                    "value": raw_p,
                    "provenance": "explicit",
                    "confidence": 0.90,
                    "label": "Expected Unit Price / Average Spend (LKR)",
                    "type": "number",
                    "note": f"Extracted expected price LKR {raw_p:,.0f}"
                }
        except ValueError:
            pass

    # Expected Customers Per Day
    cust_match = re.search(r'(\d+)\s*(?:customers|clients|buyers|footfall|visitors|dennek)\s*(?:per day|daily|a day|each day)?', lower) or \
                 re.search(r'(?:target|expect|serve|handle)\s*(?:around|about)?\s*(\d+)\s*(?:customers|clients|buyers)?', lower)
    if cust_match:
        try:
            val = int(cust_match.group(1))
            if 1 <= val <= 2000:
                extracted["expected_customers_per_day"] = {
                    "value": val,
                    "provenance": "explicit",
                    "confidence": 0.95,
                    "label": "Expected Customers / Day",
                    "type": "number",
                    "note": f"Extracted {val} daily customers"
                }
        except ValueError:
            pass

    # Entrepreneur Experience (Years)
    exp_match = re.search(r'(\d+)\s*(?:years|year|yr|yrs|awurudu|awrudu)\s*(?:of)?\s*(?:experience|running|managing|working|in business|exp)', lower) or \
                re.search(r'(?:experience|running for)\s*(?:of)?\s*(\d+)\s*(?:years|year|yr|yrs|awurudu)?', lower)
    if exp_match:
        try:
            val = int(exp_match.group(1))
            if 0 <= val <= 60:
                extracted["entrepreneur_experience_years"] = {
                    "value": val,
                    "provenance": "explicit",
                    "confidence": 0.95,
                    "label": "Entrepreneur Experience (Years)",
                    "type": "number",
                    "note": f"Extracted {val} years of experience"
                }
        except ValueError:
            pass

    # Available Staff Count
    staff_match = re.search(r'(\d+)\s*(?:staff|employees|workers|assistants|crew|team members|sewakayan)', lower) or \
                  re.search(r'(?:have|employ|hire)\s*(\d+)\s*(?:staff|employees|workers)', lower) or \
                  re.search(r'(?:staff|employees|workers|team)\s*(?:is|count is|of|=|:|\s+)*\s*(\d+)', lower)
    if staff_match:
        try:
            val = int(staff_match.group(1))
            if 0 <= val <= 100:
                extracted["available_staff_count"] = {
                    "value": val,
                    "provenance": "explicit",
                    "confidence": 0.92,
                    "label": "Available Staff Count",
                    "type": "number",
                    "note": f"Extracted staff count: {val}"
                }
                extracted["required_staff_count"] = {
                    "value": val,
                    "provenance": "derived",
                    "confidence": 0.88,
                    "label": "Required Staff Count",
                    "type": "number",
                    "note": f"Inferred required staff count: {val}"
                }
        except ValueError:
            pass

    # Market Competition Level
    if any(w in lower for w in ["high competition", "many competitors", "lots of shops", "heavy competition", "saturated", "godak kade"]):
        extracted["competition_level"] = {
            "value": "High",
            "provenance": "explicit",
            "confidence": 0.92,
            "label": "Market Competition Level",
            "type": "select",
            "note": "High competition detected"
        }
    elif any(w in lower for w in ["moderate competition", "some competitors", "medium competition", "normal competition", "samanya"]):
        extracted["competition_level"] = {
            "value": "Moderate",
            "provenance": "explicit",
            "confidence": 0.92,
            "label": "Market Competition Level",
            "type": "select",
            "note": "Moderate competition detected"
        }
    elif any(w in lower for w in ["low competition", "no competitors", "few shops", "little competition", "no other", "unique in the area"]):
        extracted["competition_level"] = {
            "value": "Low",
            "provenance": "explicit",
            "confidence": 0.92,
            "label": "Market Competition Level",
            "type": "select",
            "note": "Low competition detected"
        }

    # Customer Demand Score (1-100)
    if any(w in lower for w in ["very high demand", "huge demand", "massive demand", "strong demand", "great demand"]):
        extracted["customer_demand_score"] = {
            "value": 85,
            "provenance": "derived",
            "confidence": 0.85,
            "label": "Customer Demand Score (1-100)",
            "type": "number",
            "note": "High demand qualitative rating mapped to 85/100"
        }
    elif any(w in lower for w in ["moderate demand", "steady demand", "good demand", "average demand"]):
        extracted["customer_demand_score"] = {
            "value": 60,
            "provenance": "derived",
            "confidence": 0.85,
            "label": "Customer Demand Score (1-100)",
            "type": "number",
            "note": "Moderate demand qualitative rating mapped to 60/100"
        }

    # Supplier Availability Rating (1-5)
    if any(w in lower for w in ["abundant suppliers", "reliable suppliers", "suppliers are nearby", "easy to get supplies", "good supplier"]):
        extracted["supplier_availability_score"] = {
            "value": 4,
            "provenance": "derived",
            "confidence": 0.85,
            "label": "Supplier Availability Rating (1-5)",
            "type": "number",
            "note": "Strong supplier accessibility mapped to 4/5"
        }

    # Location Suitability Score (1-5)
    if any(w in lower for w in ["prime location", "prime commercial", "busy junction", "high footfall area", "city center"]):
        extracted["location_suitability_score"] = {
            "value": 5,
            "provenance": "derived",
            "confidence": 0.85,
            "label": "Location Suitability Score (1-5)",
            "type": "number",
            "note": "Prime high-traffic location mapped to 5/5"
        }

    # Existing Business Supplementary Growth Metrics
    if stage == "Existing":
        # Current Monthly Revenue
        rev_match = re.search(r'(?:current revenue|monthly revenue|current turnover|monthly turnover|current sales|monthly sales|masika adayama)\s*(?:of|is|=|:)?\s*(?:rs\.?|lkr)?\s*([\d,\.]+\s*(?:k|lakh|lakhs|million)?)', lower)
        if rev_match:
            val, note = parse_numeric_amount(rev_match.group(0))
            if val is not None and val > 0:
                extracted["current_monthly_revenue_lkr"] = {
                    "value": val,
                    "provenance": "explicit",
                    "confidence": 0.92,
                    "label": "Current Monthly Revenue (LKR)",
                    "type": "number",
                    "note": note or f"Extracted monthly revenue LKR {val:,.0f}"
                }

        # Current Monthly Net Profit
        prof_match = re.search(r'(?:current profit|monthly profit|net profit|labaya)\s*(?:of|is|=|:)?\s*(?:rs\.?|lkr)?\s*([\d,\.]+\s*(?:k|lakh|lakhs|million)?)', lower)
        if prof_match:
            val, note = parse_numeric_amount(prof_match.group(0))
            if val is not None and val > 0:
                extracted["current_monthly_net_profit_lkr"] = {
                    "value": val,
                    "provenance": "explicit",
                    "confidence": 0.92,
                    "label": "Current Monthly Net Profit (LKR)",
                    "type": "number",
                    "note": note or f"Extracted net profit LKR {val:,.0f}"
                }

        # Expansion Capex / Project Cost
        capex_match = re.search(r'(?:expansion cost|expansion budget|project cost|capex|branch cost)\s*(?:of|is|=|:)?\s*(?:rs\.?|lkr)?\s*([\d,\.]+\s*(?:k|lakh|lakhs|million)?)', lower)
        if capex_match:
            val, note = parse_numeric_amount(capex_match.group(0))
            if val is not None and val > 0:
                extracted["expansion_capex_lkr"] = {
                    "value": val,
                    "provenance": "explicit",
                    "confidence": 0.90,
                    "label": "Expansion Capex (LKR)",
                    "type": "number",
                    "note": note or f"Extracted expansion capex LKR {val:,.0f}"
                }

    # Business Name Extraction
    name_patterns = [
        r'(?:named|called|business name is|shop name is|brand name is|run|running|own|operate|operating)\s+["\']?([A-Za-z0-9\s&\'\.\-]+?(?:Shop|Store|Mart|Bakery|Salon|Saloon|Garments|Enterprise|Enterprises|Creations|Foods|Boutique))["\']?(?:\s+(?:in|at|with|,|\.|$))',
        r'["\']([A-Za-z0-9\s&\'\.\-]{3,35}\b(?:Shop|Store|Mart|Bakery|Salon|Saloon|Garments|Foods|Boutique))["\']'
    ]
    for pat in name_patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            c = m.group(1).strip()
            if 3 <= len(c) <= 45 and c.lower() not in ["a new business", "an existing business", "the shop"]:
                extracted["business_name"] = {
                    "value": c,
                    "provenance": "explicit",
                    "confidence": 0.92,
                    "label": "Business Name",
                    "type": "text",
                    "note": f"Extracted business name: '{c}'"
                }
                break

    return extracted


def build_assistant_response(
    stage: str,
    goal: str,
    newly_extracted: Dict[str, Any],
    cumulative_fields: Dict[str, Any],
    missing_required: List[str],
    user_message: str
) -> str:
    """
    Generates a natural, context-aware, non-rigid assistant message.
    1. Acknowledges understood facts or corrections.
    2. Suggests 1 or 2 missing fields politely without turning into a rigid wizard.
    3. Reminds the user they can continue to the form at any time.
    """
    lower_msg = user_message.lower()

    # User readiness / intent to move forward
    if any(w in lower_msg for w in ["continue", "proceed", "ready", "form", "done", "enough", "that's all", "that is all", "finish"]):
        return (
            "I've updated your business profile with everything you've shared so far. "
            "Click **Continue to Form** below to review the prefilled values, complete any remaining fields, and run your feasibility analysis!"
        )

    # Acknowledgment of newly extracted facts
    acks = []
    if "business_name" in newly_extracted:
        acks.append(f"business name **{newly_extracted['business_name']['value']}**")
    if "business_category" in newly_extracted:
        acks.append(f"**{newly_extracted['business_category']['value']}** sector")
    if "district" in newly_extracted:
        acks.append(f"located in **{newly_extracted['district']['value']} District**")
    if "available_capital_lkr" in newly_extracted:
        cap_val = newly_extracted['available_capital_lkr']['value']
        acks.append(f"available capital of **LKR {cap_val:,.0f}**")
    if "monthly_budget_lkr" in newly_extracted:
        bud_val = newly_extracted['monthly_budget_lkr']['value']
        acks.append(f"monthly budget of **LKR {bud_val:,.0f}**")
    if "expected_customers_per_day" in newly_extracted:
        cust_val = newly_extracted['expected_customers_per_day']['value']
        acks.append(f"target of **{cust_val} daily customers**")
    if "expected_price_lkr" in newly_extracted:
        p_val = newly_extracted['expected_price_lkr']['value']
        acks.append(f"average spend of **LKR {p_val:,.0f}**")
    if "entrepreneur_experience_years" in newly_extracted:
        exp_val = newly_extracted['entrepreneur_experience_years']['value']
        acks.append(f"**{exp_val} years** of experience")
    if "available_staff_count" in newly_extracted:
        s_val = newly_extracted['available_staff_count']['value']
        acks.append(f"**{s_val} staff members**")
    if "competition_level" in newly_extracted:
        acks.append(f"**{newly_extracted['competition_level']['value']}** competition level")

    ack_text = ""
    if acks:
        if len(acks) == 1:
            ack_text = f"Got it, I've noted your {acks[0]}."
        elif len(acks) == 2:
            ack_text = f"Understood! I've recorded your {acks[0]} and {acks[1]}."
        else:
            ack_text = f"Understood! I have captured your {', '.join(acks[:-1])}, and {acks[-1]}."
    else:
        ack_text = "I've reviewed your message and updated your business profile."

    # Next question / follow-up recommendation
    if not missing_required:
        follow_up = (
            "You've provided all the key requirements! "
            "You can now click **Continue to Form** to review the prefilled values, or tell me about your target customers and equipment readiness."
        )
    else:
        # Pick 1 or 2 prominent missing required fields to suggest
        field_labels = {
            "monthly_budget_lkr": "expected monthly operating budget",
            "expected_customers_per_day": "target customer footfall per day",
            "expected_price_lkr": "average customer spend or product price",
            "competition_level": "local competition level (Low, Moderate, High)",
            "location_type": "type of location (e.g. Urban Main Street, Commercial Hub, or Home-Based)",
            "entrepreneur_experience_years": "years of business experience",
            "available_capital_lkr": "available startup capital",
            "district": "district location in Western Province",
            "initial_inventory_cost_lkr": "initial inventory investment"
        }

        suggested = [field_labels[k] for k in missing_required if k in field_labels]
        if suggested:
            if len(suggested) == 1:
                prompt_q = f"Do you have an estimate for your **{suggested[0]}**, or would you prefer to complete that in the form?"
            else:
                prompt_q = f"Could you share your **{suggested[0]}** or **{suggested[1]}**? You can also leave them for now and continue directly to the form."
            follow_up = f"{prompt_q} Click **Continue to Form** whenever you are ready."
        else:
            follow_up = "You can add more details here, or click **Continue to Form** whenever you'd like to review and edit."

    return f"{ack_text} {follow_up}"


def process_conversational_intake(
    message: str,
    history: List[Dict[str, str]],
    business_stage: str = "New",
    business_goal: Optional[str] = None,
    current_extracted_fields: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Main conversational intake pipeline.
    Accumulates multi-turn extractions with provenance, detects corrections,
    evaluates missing required fields against dynamic configuration, and produces
    the assistant's reply.
    """
    canonical_stage = normalize_stage_canonical(business_stage)
    canonical_goal = normalize_goal_canonical(canonical_stage, business_goal)

    # 1. Base schema initialization
    extracted_state = {}
    if current_extracted_fields and isinstance(current_extracted_fields, dict):
        extracted_state = {k: dict(v) for k, v in current_extracted_fields.items()}

    # Initialize all 22+ schema fields if not already populated
    for k, meta in ALL_FIELD_DEFINITIONS.items():
        if k not in extracted_state:
            extracted_state[k] = {
                "value": None,
                "provenance": "missing",
                "status": "missing",
                "confidence": 0.0,
                "label": meta["label"],
                "type": meta["type"],
                "note": None
            }

    # Ensure Stage & Goal are explicitly tracked
    extracted_state["business_stage"] = {
        "value": canonical_stage,
        "provenance": "explicit",
        "status": "extracted",
        "confidence": 1.0,
        "label": "Business Stage",
        "type": "select",
        "note": f"Canonical stage: {canonical_stage}"
    }

    # Proposed Action
    proposed_act_text = f"{canonical_goal} (SME360 AI Context)"
    extracted_state["proposed_action"] = {
        "value": proposed_act_text,
        "provenance": "derived",
        "status": "extracted",
        "confidence": 0.95,
        "label": "Proposed Action",
        "type": "text",
        "note": f"Context Goal: {canonical_goal}"
    }

    # 2. Extract facts from the current turn
    newly_extracted = extract_turn_facts(message, canonical_stage, canonical_goal)

    # 3. Merge new facts into cumulative extracted state
    for k, field_data in newly_extracted.items():
        if field_data["value"] is not None:
            extracted_state[k] = {
                **field_data,
                "status": "extracted" if field_data["provenance"] != "ambiguous" else "needs_verification"
            }

    # 4. Contextual Field Config (Required, Optional, Hidden)
    category = extracted_state.get("business_category", {}).get("value") or "Grocery / Mini-Mart"
    dynamic_cfg = get_dynamic_field_config(canonical_stage, canonical_goal, category)
    field_config = dynamic_cfg.get("field_config", {})

    missing_required = []
    missing_optional = []
    hidden_keys = []

    for k, state in extracted_state.items():
        cfg = field_config.get(k, {"state": "optional"})
        state["requirement_state"] = cfg["state"]
        if cfg["state"] == "hidden":
            state["status"] = "hidden"
            hidden_keys.append(k)
        elif state["value"] is None or str(state["value"]).strip() == "":
            state["status"] = "missing"
            if cfg["state"] == "required":
                missing_required.append(k)
            else:
                missing_optional.append(k)

    # 5. Generate intelligent assistant reply
    reply = build_assistant_response(
        stage=canonical_stage,
        goal=canonical_goal,
        newly_extracted=newly_extracted,
        cumulative_fields=extracted_state,
        missing_required=missing_required,
        user_message=message
    )

    extracted_count = sum(1 for f in extracted_state.values() if f.get("value") is not None and f.get("status") != "hidden")

    return {
        "reply": reply,
        "context": {
            "business_stage": canonical_stage,
            "business_goal": canonical_goal,
            "business_category": category
        },
        "extracted_fields": extracted_state,
        "summary": {
            "total_fields": len(ALL_FIELD_DEFINITIONS),
            "extracted_count": extracted_count,
            "missing_required_count": len(missing_required),
            "missing_optional_count": len(missing_optional),
            "hidden_count": len(hidden_keys),
            "missing_required_field_keys": missing_required,
            "missing_optional_field_keys": missing_optional,
            "hidden_field_keys": hidden_keys
        },
        "missing_required_fields": missing_required,
        "missing_optional_fields": missing_optional,
        "ready_for_form": len(missing_required) <= 3
    }
