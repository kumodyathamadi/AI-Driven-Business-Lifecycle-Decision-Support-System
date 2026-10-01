import pandas as pd
import numpy as np
from typing import Dict, Any, Tuple

# Schema definition for raw business inputs
REQUIRED_CATEGORICAL_FIELDS = [
    "business_stage",
    "business_category",
    "district",
    "province",
    "location_type",
    "proposed_action",
    "competition_level"
]

REQUIRED_NUMERICAL_FIELDS = [
    "available_capital_lkr",
    "loan_amount_lkr",
    "monthly_budget_lkr",
    "initial_inventory_cost_lkr",
    "expected_price_lkr",
    "expected_customers_per_day",
    "customer_demand_score",
    "expected_operating_days_per_month",
    "entrepreneur_experience_years",
    "location_suitability_score",
    "available_staff_count",
    "required_staff_count",
    "available_equipment_score",
    "required_equipment_score",
    "supplier_availability_score"
]

DEFAULT_VALUES = {
    "business_stage": "New",
    "business_category": "Grocery / Mini-Mart",
    "district": "Colombo",
    "province": "Western",
    "location_type": "Commercial",
    "proposed_action": "start",
    "competition_level": "Moderate",
    "available_capital_lkr": 500000.0,
    "loan_amount_lkr": 0.0,
    "monthly_budget_lkr": 100000.0,
    "initial_inventory_cost_lkr": 150000.0,
    "expected_price_lkr": 500.0,
    "expected_customers_per_day": 30,
    "customer_demand_score": 60,
    "expected_operating_days_per_month": 26,
    "entrepreneur_experience_years": 2,
    "location_suitability_score": 4,
    "available_staff_count": 2,
    "required_staff_count": 2,
    "available_equipment_score": 3,
    "required_equipment_score": 3,
    "supplier_availability_score": 4
}

# The 4 strictly supported SME business categories
SUPPORTED_CATEGORIES = [
    "Grocery / Mini-Mart",
    "Clothing / Garment",
    "Beauty Salon",
    "Bakery / Food / Grocery"
]


def normalize_business_category(cat_val: Any) -> Tuple[str, str]:
    """
    Normalizes any business category string to:
    (display_category, ml_model_category)
    Restricted strictly to the four SME business categories:
    1. Grocery / Mini-Mart (model: 'Grocery/Mini-Mart')
    2. Clothing / Garment (model: 'Clothing/ Garment')
    3. Beauty Salon (model: 'Beauty Saloon')
    4. Bakery / Food / Grocery (model: 'Bakery/Food/Grocery')
    """
    cat_str = str(cat_val or "").strip().lower()

    if any(k in cat_str for k in ["salon", "saloon", "beauty", "hair", "parlour"]):
        return "Beauty Salon", "Beauty Saloon"
    elif any(k in cat_str for k in ["clothing", "garment", "apparel", "textile", "fashion"]):
        return "Clothing / Garment", "Clothing/ Garment"
    elif any(k in cat_str for k in ["bakery", "food", "confectionery", "pastry", "cake", "bread"]):
        return "Bakery / Food / Grocery", "Bakery/Food/Grocery"
    else:
        # Default category: Grocery / Mini-Mart
        return "Grocery / Mini-Mart", "Grocery/Mini-Mart"


def normalize_proposed_action(action_val: Any, stage: str) -> str:
    """
    Maps user action string to model categorical token: 'start', 'expand', 'improve', or 'maintain'.
    """
    act_str = str(action_val or "").strip().lower()
    if any(k in act_str for k in ["start", "establish", "launch", "new"]):
        return "start"
    elif any(k in act_str for k in ["expand", "branch", "product", "grow"]):
        return "expand"
    elif any(k in act_str for k in ["improve", "upgrade", "efficiency"]):
        return "improve"
    elif any(k in act_str for k in ["maintain", "stabilize"]):
        return "maintain"
    return "start" if "new" in stage.lower() else "expand"


STAGE_DISPLAY_MAP = {
    "new_startup": "New Startup",
    "existing": "Existing Business"
}


def normalize_business_stage(stage_val: Any) -> Tuple[str, str, str]:
    """
    Normalizes any stage string to:
    (canonical_db_stage, display_label, ml_model_stage)
    """
    s = str(stage_val or "").strip().lower()
    if "new" in s or "start" in s:
        return "new_startup", "New Startup", "New"
    return "existing", "Existing Business", "Existing"


def parse_clean_number(val: Any, default: float = 0.0) -> float:
    """
    Safely parses numeric values, handling strings like 'Rs. 500,000', '500k', '1.5 million', commas, and NaN.
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
        import re
        if s.endswith("k") or s.endswith("thousand"):
            return float(re.sub(r"[^\d.]", "", s)) * 1000.0
        if s.endswith("m") or s.endswith("million") or s.endswith("mn"):
            return float(re.sub(r"[^\d.]", "", s)) * 1000000.0
        if "lakh" in s or "lac" in s or "lakhs" in s:
            return float(re.sub(r"[^\d.]", "", s)) * 100000.0
        return float(s)
    except Exception:
        return default


def validate_and_format_input(raw_input: Dict[str, Any]) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Validates a raw SME business input dictionary, enforces defaults for missing fields,
    casts numeric types, normalizes categories and proposed actions,
    and returns both a 1-row Pandas DataFrame ready for the preprocessing pipeline
    and a cleaned input dictionary.
    """
    cleaned_input = {}

    # Validate Categorical Fields
    for field in REQUIRED_CATEGORICAL_FIELDS:
        val = raw_input.get(field)
        if val is None or str(val).strip() == "":
            cleaned_input[field] = DEFAULT_VALUES[field]
        else:
            cleaned_input[field] = str(val).strip()

    # Validate Numerical Fields with robust cleaning
    for field in REQUIRED_NUMERICAL_FIELDS:
        val = raw_input.get(field)
        default_val = DEFAULT_VALUES[field]
        cleaned_input[field] = parse_clean_number(val, default_val)
        if cleaned_input[field] < 0:
            cleaned_input[field] = 0.0

    # Convert integer fields cleanly
    int_fields = [
        "expected_customers_per_day", "customer_demand_score",
        "expected_operating_days_per_month", "entrepreneur_experience_years",
        "location_suitability_score", "available_staff_count",
        "required_staff_count", "available_equipment_score",
        "required_equipment_score", "supplier_availability_score"
    ]
    for field in int_fields:
        cleaned_input[field] = int(round(cleaned_input[field]))

    # Normalize business stage
    canonical_stage, display_stage, model_stage = normalize_business_stage(cleaned_input["business_stage"])
    cleaned_input["business_stage"] = canonical_stage
    cleaned_input["stage_label"] = display_stage

    # Normalize business category to standard 4 categories
    display_category, model_category = normalize_business_category(cleaned_input["business_category"])
    cleaned_input["business_category"] = display_category

    # Normalize proposed action for ML model OneHotEncoder
    model_action = normalize_proposed_action(cleaned_input.get("proposed_action", ""), model_stage)

    # Prepare DataFrame row with exact categorical tokens expected by preprocessor.joblib OneHotEncoder
    model_input = cleaned_input.copy()
    model_input["business_stage"] = model_stage
    model_input["business_category"] = model_category
    model_input["proposed_action"] = model_action
    # Drop stage_label from model input DataFrame as model was not trained on it
    if "stage_label" in model_input:
        del model_input["stage_label"]

    df = pd.DataFrame([model_input])

    # Ensure correct column ordering matching raw dataset feature set
    ordered_columns = REQUIRED_NUMERICAL_FIELDS + REQUIRED_CATEGORICAL_FIELDS
    df = df[ordered_columns]

    return df, cleaned_input
