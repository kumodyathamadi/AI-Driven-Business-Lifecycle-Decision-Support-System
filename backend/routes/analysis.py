import sys
import os
import uuid
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

# Ensure root path is accessible for src module imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.database import get_db
from backend.models import AnalysisRecord
from backend.schemas import BusinessAnalysisRequest
from src.orchestrator import analyze_business

router = APIRouter(prefix="/api/business", tags=["Business Analysis"])


@router.post("/analyze", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
def analyze_sme_business(
    payload: BusinessAnalysisRequest,
    db: Session = Depends(get_db)
):
    """
    Executes Component 1 End-to-End Business Analysis Pipeline:
    Preprocessing -> Prediction -> SHAP -> Strategy Generation -> TOPSIS -> What-If -> Plan -> Structured Profile.
    Persists original user description and extraction metadata for research traceability in PostgreSQL.
    """
    try:
        raw_input = payload.model_dump()
        structured_profile = analyze_business(raw_input)

        feasibility_data = structured_profile.get("feasibility_analysis", {})
        predicted_label = feasibility_data.get("predicted_label", "Conditionally Feasible")
        confidence_score = feasibility_data.get("confidence_score", 0.0)

        record_id = str(uuid.uuid4())
        structured_profile["metadata"]["record_id"] = record_id

        # Save record to Database with traceability attributes
        record = AnalysisRecord(
            id=record_id,
            business_stage=payload.business_stage,
            business_category=payload.business_category,
            district=payload.district,
            feasibility_label=predicted_label,
            confidence_score=confidence_score,
            input_profile=raw_input,
            structured_profile=structured_profile,
            original_business_description=payload.original_business_description,
            extraction_metadata=payload.extraction_metadata
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        return structured_profile

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Business analysis failed: {str(e)}"
        )


@router.get("/records", response_model=List[Dict[str, Any]])
def list_analysis_records(
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """
    Lists recent SME business analysis runs stored in the database.
    Safely extracts available_capital_lkr and business_name from stored input/profile JSON.
    Provides both predicted_label and feasibility_label for seamless UI compatibility.
    """
    records = db.query(AnalysisRecord).order_by(AnalysisRecord.created_at.desc()).limit(limit).all()
    out = []
    for rec in records:
        inp = rec.input_profile if isinstance(rec.input_profile, dict) else {}
        sp = rec.structured_profile if isinstance(rec.structured_profile, dict) else {}

        capital = inp.get("available_capital_lkr")
        if capital is None and "business_input" in sp and isinstance(sp["business_input"], dict):
            capital = sp["business_input"].get("available_capital_lkr")

        b_name = inp.get("business_name")
        if not b_name and "business_input" in sp and isinstance(sp["business_input"], dict):
            b_name = sp["business_input"].get("business_name")
        if not b_name and "business_plan" in sp and isinstance(sp["business_plan"], dict):
            b_name = sp["business_plan"].get("business_name")

        out.append({
            "id": rec.id,
            "business_name": b_name,
            "business_stage": rec.business_stage,
            "business_category": rec.business_category,
            "district": rec.district,
            "feasibility_label": rec.feasibility_label,
            "predicted_label": rec.feasibility_label,
            "confidence_score": rec.confidence_score,
            "available_capital_lkr": capital,
            "original_business_description": rec.original_business_description,
            "created_at": rec.created_at.isoformat() if rec.created_at else None
        })
    return out


@router.get("/record/{record_id}", response_model=Dict[str, Any])
def get_analysis_record(
    record_id: str,
    db: Session = Depends(get_db)
):
    """
    Retrieves a full structured profile JSON by Analysis Record ID.
    """
    rec = db.query(AnalysisRecord).filter(AnalysisRecord.id == record_id).first()
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis record with ID '{record_id}' not found."
        )
    return rec.structured_profile
