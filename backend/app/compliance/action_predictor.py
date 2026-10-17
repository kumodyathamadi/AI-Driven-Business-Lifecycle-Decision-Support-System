"""
ML-Driven Action Guidance Predictor Module
Predicts concrete institutional authority, required licences, procedural steps,
and required documents for an SME profile.
"""

import os
import json
import logging
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


def predict_action_roadmap(business_context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Takes business profile attributes, runs the trained ML action guidance model,
    and returns a structured procedural action roadmap.
    """
    _load_artifacts()

    if _pipeline is None or not _knowledge_index:
        logger.warning("Action guidance model or knowledge index not loaded.")
        return None

    # Extract relevant fields
    b_type = str(business_context.get("business_type") or business_context.get("sector") or "general_sme")
    b_scale = str(business_context.get("business_scale") or business_context.get("business_size") or "small")
    district = str(business_context.get("district") or business_context.get("location") or "Colombo")
    premises = str(bool(business_context.get("has_physical_premises", True)))
    stage = str(business_context.get("business_stage") or "new business")
    
    # Products & activities
    products = business_context.get("products_services") or []
    if isinstance(products, list):
        prod_str = ", ".join(products)
    else:
        prod_str = str(products)

    # Build input feature string matching the model's training representations
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
            # Fallback to first matching category if exact key missing
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
