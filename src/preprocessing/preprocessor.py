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

class InputValidationError(ValueError):
    """
    Raised when required user business inputs are missing or invalid.
    Prevents silent fallback to invented default values.
    """
    def __init__(self, message: str, missing_fields: list = None):
        super().__init__(message)
        self.missing_fields = missing_fields or []


def is_missing_value(val: Any) -> bool:
    """
    Determines whether a business input field is missing (None, empty string, or NaN).
    NOTE: 0, 0.0, and False are explicitly VALID values and NOT considered missing.
    """
    if val is None:
        return True
    if isinstance(val, str):
        s = val.strip().lower()
        return s in ("", "nan", "none", "null")
    if isinstance(val, (int, float)):
        import math
        return math.isnan(val) or math.isinf(val)
    return False


# User-provided business fields where user input is strictly mandatory before ML feasibility analysis
USER_REQUIRED_FIELDS = {
    # Categorical Core
    "business_stage": "Business Stage",
    "business_category": "Business Category",
    "district": "District",
    "location_type": "Location Type",
    # Financial Core
    "available_capital_lkr": "Available Capital (LKR)",
    "monthly_budget_lkr": "Monthly Operating Budget (LKR)",
    "expected_price_lkr": "Expected Price / Unit (LKR)",
    # Market & Operational Core
    "expected_customers_per_day": "Expected Customers / Day",
    "competition_level": "Market Competition Level",
    "customer_demand_score": "Customer Demand Score",
    "entrepreneur_experience_years": "Entrepreneur Experience (Years)",
    "available_staff_count": "Available Staff Count",
    # Operational Readiness Scores (1-5)
    "location_suitability_score": "Location Suitability Score",
    "available_equipment_score": "Available Equipment Score",
    "required_equipment_score": "Required Equipment Score",
    "supplier_availability_score": "Supplier Availability Score",
}

# Standard Sri Lankan District to Province geographic mapping
DISTRICT_TO_PROVINCE = {
    "Colombo": "Western", "Gampaha": "Western", "Kalutara": "Western",
    "Kandy": "Central", "Matale": "Central", "Nuwara Eliya": "Central",
    "Galle": "Southern", "Matara": "Southern", "Hambantota": "Southern",
    "Jaffna": "Northern", "Kilinochchi": "Northern", "Mannar": "Northern",
    "Vavuniya": "Northern", "Mullaitivu": "Northern",
    "Batticaloa": "Eastern", "Ampara": "Eastern", "Trincomalee": "Eastern",
    "Kurunegala": "North Western", "Puttalam": "North Western",
    "Anuradhapura": "North Central", "Polonnaruwa": "North Central",
    "Badulla": "Uva", "Monaragala": "Uva",
    "Ratnapura": "Sabaragamuwa", "Kegalle": "Sabaragamuwa"
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
    Validates a raw SME business input dictionary against mandatory research requirements.
    Rejects incomplete inputs by raising InputValidationError when any required business input is missing.
    Prevents silent fallback to invented default values.
    
    Returns both a 1-row Pandas DataFrame ready for the preprocessing pipeline
    and a cleaned input dictionary.
    """
    # 1. Strict Validation: Check for presence of all required user-provided business fields
    missing_fields = []
    missing_labels = []
    for field_key, label in USER_REQUIRED_FIELDS.items():
        val = raw_input.get(field_key)
        if is_missing_value(val):
            missing_fields.append(field_key)
            missing_labels.append(label)

    if missing_fields:
        fields_str = ", ".join(missing_labels)
        raise InputValidationError(
            f"Please complete all required business fields before running feasibility analysis: {fields_str}.",
            missing_fields=missing_fields
        )

    cleaned_input = {}

    # 2. Extract & Format Categorical Fields
    cleaned_input["business_stage"] = str(raw_input.get("business_stage")).strip()
    cleaned_input["business_category"] = str(raw_input.get("business_category")).strip()
    cleaned_input["district"] = str(raw_input.get("district")).strip()
    cleaned_input["location_type"] = str(raw_input.get("location_type")).strip()
    cleaned_input["competition_level"] = str(raw_input.get("competition_level")).strip()

    # System-derived or provided province
    raw_province = raw_input.get("province")
    if not is_missing_value(raw_province):
        cleaned_input["province"] = str(raw_province).strip()
    else:
        cleaned_input["province"] = DISTRICT_TO_PROVINCE.get(cleaned_input["district"], "Western")

    # 3. Extract & Format Required Numerical Fields (with range enforcement)
    cleaned_input["available_capital_lkr"] = max(0.0, parse_clean_number(raw_input["available_capital_lkr"], 0.0))
    cleaned_input["monthly_budget_lkr"] = max(0.0, parse_clean_number(raw_input["monthly_budget_lkr"], 0.0))
    cleaned_input["expected_price_lkr"] = max(1.0, parse_clean_number(raw_input["expected_price_lkr"], 1.0))
    cleaned_input["expected_customers_per_day"] = max(0, int(round(parse_clean_number(raw_input["expected_customers_per_day"], 0.0))))
    cleaned_input["customer_demand_score"] = min(100, max(1, int(round(parse_clean_number(raw_input["customer_demand_score"], 50.0)))))
    cleaned_input["entrepreneur_experience_years"] = max(0, int(round(parse_clean_number(raw_input["entrepreneur_experience_years"], 0.0))))
    cleaned_input["available_staff_count"] = max(0, int(round(parse_clean_number(raw_input["available_staff_count"], 0.0))))

    cleaned_input["location_suitability_score"] = min(5, max(1, int(round(parse_clean_number(raw_input["location_suitability_score"], 3.0)))))
    cleaned_input["available_equipment_score"] = min(5, max(1, int(round(parse_clean_number(raw_input["available_equipment_score"], 3.0)))))
    cleaned_input["required_equipment_score"] = min(5, max(1, int(round(parse_clean_number(raw_input["required_equipment_score"], 3.0)))))
    cleaned_input["supplier_availability_score"] = min(5, max(1, int(round(parse_clean_number(raw_input["supplier_availability_score"], 3.0)))))

    # 4. Conditional Numerical Fields (0.0 if not requested / not applicable)
    raw_loan = raw_input.get("loan_amount_lkr")
    cleaned_input["loan_amount_lkr"] = 0.0 if is_missing_value(raw_loan) else max(0.0, parse_clean_number(raw_loan, 0.0))

    raw_inv = raw_input.get("initial_inventory_cost_lkr")
    cleaned_input["initial_inventory_cost_lkr"] = 0.0 if is_missing_value(raw_inv) else max(0.0, parse_clean_number(raw_inv, 0.0))

    # 5. System-Derived Operational Fields
    raw_op_days = raw_input.get("expected_operating_days_per_month")
    cleaned_input["expected_operating_days_per_month"] = 26 if is_missing_value(raw_op_days) else min(31, max(1, int(round(parse_clean_number(raw_op_days, 26.0)))))

    raw_req_staff = raw_input.get("required_staff_count")
    if is_missing_value(raw_req_staff):
        cleaned_input["required_staff_count"] = cleaned_input["available_staff_count"]
    else:
        cleaned_input["required_staff_count"] = max(0, int(round(parse_clean_number(raw_req_staff, float(cleaned_input["available_staff_count"])))))

    # 6. Normalize Business Stage & Category to canonical tokens
    canonical_stage, display_stage, model_stage = normalize_business_stage(cleaned_input["business_stage"])
    cleaned_input["business_stage"] = canonical_stage
    cleaned_input["stage_label"] = display_stage

    display_category, model_category = normalize_business_category(cleaned_input["business_category"])
    cleaned_input["business_category"] = display_category

    # Normalize proposed action for ML model OneHotEncoder
    model_action = normalize_proposed_action(raw_input.get("proposed_action", ""), model_stage)
    cleaned_input["proposed_action"] = raw_input.get("proposed_action") or f"{model_action.capitalize()} {display_category}"

    # 7. Preserve optional business name and narrative metadata in cleaned_input
    if "business_name" in raw_input and raw_input["business_name"]:
        cleaned_input["business_name"] = str(raw_input["business_name"]).strip()
    if "address" in raw_input and raw_input["address"]:
        cleaned_input["address"] = str(raw_input["address"]).strip()
    if "business_model" in raw_input and raw_input["business_model"]:
        cleaned_input["business_model"] = str(raw_input["business_model"]).strip()
    if "additional_description" in raw_input and raw_input["additional_description"]:
        cleaned_input["additional_description"] = str(raw_input["additional_description"]).strip()

    # 8. Prepare DataFrame row with exact categorical tokens expected by preprocessor.joblib OneHotEncoder
    model_input = cleaned_input.copy()
    model_input["business_stage"] = model_stage
    model_input["business_category"] = model_category
    model_input["proposed_action"] = model_action

    # Drop non-model features from model input DataFrame as model was not trained on them
    for extra_key in ["stage_label", "business_name", "address", "business_model", "additional_description"]:
        if extra_key in model_input:
            del model_input[extra_key]

    df = pd.DataFrame([model_input])

    # Ensure correct column ordering matching raw dataset feature set (15 numerical, 7 categorical)
    ordered_columns = REQUIRED_NUMERICAL_FIELDS + REQUIRED_CATEGORICAL_FIELDS
    df = df[ordered_columns]

    return df, cleaned_input
