"""
ML-Driven Action Guidance Predictor Module
Predicts concrete institutional authority, required licences, procedural steps,
and required documents for an SME profile and for individual legal rules/policies.
"""

import os
import json
import logging
import re
from typing import Dict, Any, List, Optional
import joblib

logger = logging.getLogger("ActionPredictor")

MODEL_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "models", "action_guidance_model")
)
PIPELINE_PATH = os.path.join(MODEL_DIR, "action_guidance_pipeline.joblib")
KNOWLEDGE_PATH = os.path.join(MODEL_DIR, "action_knowledge_index.json")

_pipeline = None
_knowledge_index: Dict[str, Any] = {}

# Purpose explanations grounded in Sri Lankan statutory frameworks
RULE_PURPOSE_EXPLANATIONS = {
    "food_business": (
        "Regulates food premises hygiene, sanitation standards, and food-handler medical fitness "
        "before preparing, handling, or selling food items to the public."
    ),
    "environmental_waste": (
        "Regulates industrial emissions, waste disposal, effluent treatment, and environmental clearances "
        "to prevent environmental pollution under the Central Environmental Authority."
    ),
    "business_registration": (
        "Establishes legal identity and commercial entity registration for sole proprietors, partnerships, "
        "or companies, required before opening business bank accounts or issuing commercial invoices."
    ),
    "vehicle_repair_motor_trade": (
        "Regulates automotive garage operations, vehicle modifications, spare parts retail, and "
        "waste oil disposal under local council by-laws and motor traffic guidelines."
    ),
    "cosmetics_salon": (
        "Regulates cosmetic chemical application, skin/hair chemical safety, practitioner sanitation, "
        "and equipment sterilization standards under NMRA and Municipal Health by-laws."
    ),
    "data_protection_digital": (
        "Regulates lawful processing, storage, and confidentiality of customer personal data, "
        "online orders, and employee records under the Personal Data Protection Act No. 9 of 2022."
    ),
}


def _load_artifacts():
    global _pipeline, _knowledge_index
    if _pipeline is None and os.path.exists(PIPELINE_PATH):
        try:
            _pipeline = joblib.load(PIPELINE_PATH)
            logger.info("Action guidance pipeline loaded successfully.")
        except Exception as exc:
            logger.error("Failed to load action guidance pipeline: %s", exc)

    if not _knowledge_index and os.path.exists(KNOWLEDGE_PATH):
        try:
            with open(KNOWLEDGE_PATH, "r", encoding="utf-8") as f:
                _knowledge_index = json.load(f)
            logger.info("Action knowledge index loaded successfully.")
        except Exception as exc:
            logger.error("Failed to load action knowledge index: %s", exc)


def predict_action_for_rule(
    rule_title: str,
    source_id: str = "",
    excerpt: str = "",
    business_context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Predicts:
    1. 'මේ නීතියෙන් වෙන්නේ මොකක්ද?' (Rule Purpose)
    2. 'යන්න ඕනෙ ස්ථානය / කාර්යාලය කොහෙද?' (Where to Go / Target Authority & Office)
    3. 'ගත යුතු පියවර / බලපත්‍රය කුමක්ද?' (Required Action & Documents)
    4. 'පියවරෙන් පියවර උපදෙස්' (Procedural Steps)
    """
    _load_artifacts()
    business_context = business_context or {}

    b_type = str(business_context.get("business_type") or business_context.get("sector") or "")
    
    loc = business_context.get("location")
    if isinstance(loc, dict):
        district = str(loc.get("district") or "Colombo")
    elif isinstance(business_context.get("district"), str) and business_context.get("district"):
        district = str(business_context.get("district"))
    elif isinstance(loc, str) and loc:
        district = loc
    else:
        district = "Colombo"

    rule_text = f"{rule_title} {source_id} {excerpt}".lower()

    # Rule-specific query aligned with trained feature format
    query = (
        f"Rules & Legal Sources: {rule_title}. "
        f"Business Type: {b_type}. "
        f"Scale: micro. "
        f"District: {district}. "
        f"Physical Premises: True. "
        f"Context: {rule_title}. "
        f"Activity: {rule_title}. "
        f"Inquiry: What authority, office, documents, and steps are required for {rule_title}?"
    )

    predicted_action = None

    # First check explicit domain keywords from the rule title/act itself:
    if any(w in rule_text for w in ["environment", "epl", "waste", "pollution", "47 of 1980", "153316", "prescribed activities", "cea"]):
        predicted_action = "VERIFY_ENVIRONMENTAL_APPLICABILITY"
    elif any(w in rule_text for w in ["food", "hygiene", "food control", "lunch sheet", "polystyrene", "polythene", "restaurant", "bakery", "kitchen"]):
        predicted_action = "VERIFY_FOOD_PREMISES_REQUIREMENTS"
    elif any(w in rule_text for w in ["motor", "traffic", "vehicle", "garage", "garaj", "spare part", "dmt"]):
        predicted_action = "VERIFY_MOTOR_TRADE_PATHWAY"
    elif any(w in rule_text for w in ["salon", "cosmetic", "hair", "beauty", "nmra"]):
        predicted_action = "DISTINGUISH_SALON_VS_PRODUCT_APPROVAL"
    elif any(w in rule_text for w in ["data", "privacy", "protection", "digital", "dpa"]):
        predicted_action = "ASSESS_DATA_PROTECTION_DUTIES"
    elif any(w in rule_text for w in ["business name", "companies act", "eroc", "incorporation", "statute 1990"]):
        predicted_action = "CONFIRM_REGISTRATION_PATHWAY"

    # If not matched by statutory keywords, use champion ML pipeline
    if not predicted_action and _pipeline is not None:
        try:
            predicted_action = _pipeline.predict([query])[0]
        except Exception as exc:
            logger.warning("Pipeline prediction error for rule %s: %s", rule_title, exc)

    if not predicted_action:
        predicted_action = "CONFIRM_REGISTRATION_PATHWAY"

    action_data = _knowledge_index.get(predicted_action, {})
    category = action_data.get("category", "business_registration")
    purpose = RULE_PURPOSE_EXPLANATIONS.get(
        category,
        f"Statutory compliance requirement applicable to commercial activities under {rule_title}."
    )

    # Specific authority enhancements based on district & authority
    target_auth = action_data.get("target_authority", "Relevant Competent Local Authority")
    office_loc = action_data.get("office_location", f"District Secretariat / Local Council Office ({district})")
    if "environmental" in category:
        target_auth = "Central Environmental Authority (CEA) / Local Council Environment Unit"
        office_loc = f"CEA Provincial/District Office ({district}) or Local Council Environment Unit"
    elif "food" in category:
        target_auth = f"Public Health Department / PHI Office ({district} Municipal Council or MOH Office)"
        office_loc = f"Town Hall / Chief Medical Officer of Health (MOH) Office, {district}"
    elif "business_registration" in category:
        target_auth = "Department of Business Names (Provincial Council) / Registrar of Companies"
        office_loc = f"District Secretariat / Registrar of Companies (eROC), {district}"


    return {
        "rule_title": rule_title,
        "category": category,
        "predicted_action_type": predicted_action,
        "rule_purpose": purpose,
        "where_to_go": target_auth,
        "office_location": office_loc,
        "action_needed": action_data.get(
            "required_action_name",
            f"Registration / Clearance under {rule_title}"
        ),
        "action_urgency": action_data.get("action_urgency", "Prior to commercial operations"),
        "required_documents": action_data.get("required_documents", [
            "National Identity Card (NIC) / Business Registration Certificate",
            "Proof of premises (Lease Agreement or Title Deed)",
            "Official Application Form with prescribed processing fee"
        ]),
        "procedural_steps": action_data.get("procedural_steps", [
            "Step 1: Obtain official prescribed application form from the responsible office.",
            "Step 2: Compile necessary premises proofs, layout sketch, and identification.",
            "Step 3: Submit application for officer inspection / clearance.",
            "Step 4: Pay regulatory inspection fees and collect official licence / certificate."
        ]),
    }


def predict_action_roadmap(business_context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Takes business profile attributes, runs the trained ML action guidance model,
    and returns a structured procedural action roadmap for the overall business.
    """
    _load_artifacts()

    if _pipeline is None or not _knowledge_index:
        logger.warning("Action guidance model or knowledge index not loaded.")
        return None

    b_type = str(business_context.get("business_type") or business_context.get("sector") or "general_sme")
    b_scale = str(business_context.get("business_scale") or business_context.get("business_size") or "small")
    district = str(business_context.get("district") or business_context.get("location") or "Colombo")
    premises = str(bool(business_context.get("has_physical_premises", True)))
    stage = str(business_context.get("business_stage") or "new business")
    
    products = business_context.get("products_services") or []
    prod_str = ", ".join(products) if isinstance(products, list) else str(products)

    composite_text = (
        f"Business Type: {b_type}. "
        f"Scale: {b_scale}. "
        f"District: {district}. "
        f"Physical Premises: {premises}. "
        f"Context: {stage}. "
        f"Activity: {prod_str}. "
        f"Inquiry: I operate a {b_type} in {district} and need to know the required action, authority, and documents."
    )

    try:
        predicted_action = _pipeline.predict([composite_text])[0]
        action_data = _knowledge_index.get(predicted_action)

        if not action_data:
            for act_key, data in _knowledge_index.items():
                if b_type in act_key.lower():
                    action_data = data
                    predicted_action = act_key
                    break

        if not action_data:
            action_data = list(_knowledge_index.values())[0]

        return {
            "model_status": "active",
            "predicted_action_type": predicted_action,
            "category": action_data.get("category", ""),
            "target_authority": action_data.get("target_authority", "Relevant Competent Authority"),
            "office_location": action_data.get("office_location", "Local Authority / District Office"),
            "required_action_name": action_data.get("required_action_name", "Statutory Compliance Registration"),
            "action_urgency": action_data.get("action_urgency", "Before starting commercial operations"),
            "required_documents": action_data.get("required_documents", []),
            "procedural_steps": action_data.get("procedural_steps", []),
            "governing_laws": action_data.get("legal_sources", []),
            "estimated_cost_lkr": action_data.get("estimated_cost_lkr"),
            "estimated_timeline_days": action_data.get("estimated_timeline_days"),
        }
    except Exception as exc:
        logger.exception("Error predicting action roadmap: %s", exc)
        return None
