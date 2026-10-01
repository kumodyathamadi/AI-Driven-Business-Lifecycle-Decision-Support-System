import sys
import os
import uuid
import json
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

# Ensure root path is accessible for src module imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.database import get_db
from backend.models import AnalysisRecord, User, AnalysisAuditLog
from backend.auth_utils import get_optional_user
from backend.schemas import BusinessAnalysisRequest, PaginatedRecordsResponse, AnalysisRecordSummary
from src.orchestrator import analyze_business

router = APIRouter(prefix="/api/business", tags=["Business Analysis"])


def serialize_analysis_record(rec: AnalysisRecord) -> Dict[str, Any]:
    """
    Serializes an AnalysisRecord database entity into a clean summary dict.
    Extracts capital and customer counts safely from input_profile to eliminate NaN values.
    """
    in_prof = rec.input_profile or {}
    if isinstance(in_prof, str):
        try:
            in_prof = json.loads(in_prof)
        except Exception:
            in_prof = {}

    capital = float(in_prof.get("available_capital_lkr", 0.0))
    customers = int(in_prof.get("expected_customers_per_day", 0))

    stage = rec.business_stage
    stage_label = "New Startup" if stage == "new_startup" or "new" in str(stage).lower() else "Existing Business"

    return {
        "id": rec.id,
        "business_stage": stage,
        "stage_label": stage_label,
        "business_category": rec.business_category,
        "district": rec.district,
        "feasibility_label": rec.feasibility_label,
        "predicted_label": rec.feasibility_label,
        "confidence_score": round(rec.confidence_score, 4),
        "confidence_percent": f"{(rec.confidence_score * 100):.1f}%",
        "available_capital_lkr": capital,
        "expected_customers_per_day": customers,
        "original_business_description": rec.original_business_description,
        "created_at": rec.created_at.isoformat() if rec.created_at else None
    }


@router.post("/analyze", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
def analyze_sme_business(
    payload: BusinessAnalysisRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Executes Component 1 End-to-End Business Analysis Pipeline:
    Preprocessing -> Prediction -> SHAP -> Strategy Generation -> TOPSIS -> What-If -> Plan -> Structured Profile.
    Persists original user description and extraction metadata for research traceability in database.
    """
    try:
        raw_input = payload.model_dump()
        structured_profile = analyze_business(raw_input)

        feasibility_data = structured_profile.get("feasibility_analysis", {})
        predicted_label = feasibility_data.get("predicted_label", "Conditionally Feasible")
        confidence_score = feasibility_data.get("confidence_score", 0.0)

        record_id = str(uuid.uuid4())
        structured_profile["metadata"]["record_id"] = record_id

        # Save record to Database with canonical business_stage
        canonical_stage = structured_profile.get("business_input", {}).get("business_stage", payload.business_stage)
        canonical_category = structured_profile.get("business_input", {}).get("business_category", payload.business_category)

        record = AnalysisRecord(
            id=record_id,
            user_id=current_user.id if current_user else None,
            business_stage=canonical_stage,
            business_category=canonical_category,
            district=payload.district,
            feasibility_label=predicted_label,
            confidence_score=confidence_score,
            input_profile=structured_profile.get("business_input", raw_input),
            structured_profile=structured_profile,
            original_business_description=payload.original_business_description,
            extraction_metadata=payload.extraction_metadata
        )
        db.add(record)

        # Log audit trail event for creation
        audit_entry = AnalysisAuditLog(
            user_id=current_user.id if current_user else None,
            user_email=current_user.email if current_user else "demo@sme360.ai",
            record_id=record_id,
            action="created",
            business_category=record.business_category,
            district=record.district,
            result_label=predicted_label,
            result_score=confidence_score,
            inputs_snapshot=raw_input
        )
        db.add(audit_entry)

        db.commit()
        db.refresh(record)

        return structured_profile

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Business analysis failed: {str(e)}"
        )


@router.get("/records", response_model=PaginatedRecordsResponse)
def list_analysis_records(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Records per page"),
    page_size: Optional[int] = Query(None, ge=1, le=100),
    stage: Optional[str] = Query(None, description="Filter by business stage ('all', 'new_startup', 'existing')"),
    category: Optional[str] = Query(None, description="Filter by business category"),
    district: Optional[str] = Query(None, description="Filter by Sri Lankan district"),
    result: Optional[str] = Query(None, description="Filter by feasibility result ('Feasible', 'Conditionally Feasible', 'Infeasible')"),
    search: Optional[str] = Query(None, description="Search term across category, district, and result"),
    sort: Optional[str] = Query("newest", description="Sort order: 'newest', 'highest_score', 'lowest_score', 'oldest'"),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Lists paginated SME business analysis runs with total counts and numeric attributes.
    Eliminates NaN values by extracting capital and customer counts safely.
    Filters by authenticated user if logged in, and excludes soft-deleted records.
    """
    eff_limit = page_size if page_size is not None else limit
    offset = (page - 1) * eff_limit

    query = db.query(AnalysisRecord).filter(
        or_(AnalysisRecord.is_deleted == False, AnalysisRecord.is_deleted == None)
    )

    # User isolation: If user is authenticated, show their records (or records without owner)
    if current_user:
        query = query.filter(or_(AnalysisRecord.user_id == current_user.id, AnalysisRecord.user_id == None))

    # Filter by stage
    if stage and stage.strip().lower() != "all":
        s = stage.strip().lower()
        if "new" in s:
            query = query.filter(AnalysisRecord.business_stage == "new_startup")
        elif "exist" in s:
            query = query.filter(AnalysisRecord.business_stage == "existing")

    # Filter by category
    if category and category.strip().lower() != "all":
        query = query.filter(AnalysisRecord.business_category == category.strip())

    # Filter by district
    if district and district.strip().lower() != "all":
        query = query.filter(func.lower(AnalysisRecord.district) == district.strip().lower())

    # Filter by feasibility result
    if result and result.strip().lower() != "all":
        query = query.filter(func.lower(AnalysisRecord.feasibility_label) == result.strip().lower())

    # Search filter
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(AnalysisRecord.business_category).like(term),
                func.lower(AnalysisRecord.district).like(term),
                func.lower(AnalysisRecord.feasibility_label).like(term),
                func.lower(AnalysisRecord.original_business_description).like(term)
            )
        )

    # Total count from database
    total_count = query.count()

    # Sort
    if sort == "highest_score":
        query = query.order_by(AnalysisRecord.confidence_score.desc(), AnalysisRecord.created_at.desc())
    elif sort == "lowest_score":
        query = query.order_by(AnalysisRecord.confidence_score.asc(), AnalysisRecord.created_at.desc())
    elif sort == "oldest":
        query = query.order_by(AnalysisRecord.created_at.asc())
    else:
        query = query.order_by(AnalysisRecord.created_at.desc())

    records = query.offset(offset).limit(eff_limit).all()
    items = [serialize_analysis_record(rec) for rec in records]

    return {
        "total_count": total_count,
        "page": page,
        "page_size": eff_limit,
        "items": items
    }


@router.get("/summary", response_model=Dict[str, Any])
def get_dashboard_summary(
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Returns real aggregate metrics for Dashboard KPIs for authenticated user.
    Excludes soft-deleted records.
    """
    base_query = db.query(AnalysisRecord).filter(
        or_(AnalysisRecord.is_deleted == False, AnalysisRecord.is_deleted == None)
    )
    if current_user:
        base_query = base_query.filter(or_(AnalysisRecord.user_id == current_user.id, AnalysisRecord.user_id == None))

    total_count = base_query.count()
    
    # Counts by feasibility outcome
    feasible_count = base_query.filter(AnalysisRecord.feasibility_label == "Feasible").count()
    cond_feasible_count = base_query.filter(AnalysisRecord.feasibility_label == "Conditionally Feasible").count()
    infeasible_count = base_query.filter(AnalysisRecord.feasibility_label == "Infeasible").count()

    feasible_rate = round((feasible_count / total_count * 100), 1) if total_count > 0 else 0.0

    # Top category
    top_cat_row = db.query(
        AnalysisRecord.business_category, func.count(AnalysisRecord.id).label("cnt")
    ).filter(
        or_(AnalysisRecord.is_deleted == False, AnalysisRecord.is_deleted == None)
    )
    if current_user:
        top_cat_row = top_cat_row.filter(or_(AnalysisRecord.user_id == current_user.id, AnalysisRecord.user_id == None))
    top_cat_row = top_cat_row.group_by(AnalysisRecord.business_category).order_by(func.count(AnalysisRecord.id).desc()).first()
    top_sector = top_cat_row[0] if top_cat_row else "Not provided"

    # Average capital
    cap_records = base_query.with_entities(AnalysisRecord.input_profile).all()
    cap_sum = 0.0
    cap_count = 0
    for r in cap_records:
        in_prof = r[0] or {}
        if isinstance(in_prof, str):
            try:
                in_prof = json.loads(in_prof)
            except Exception:
                in_prof = {}
        c = in_prof.get("available_capital_lkr")
        if c is not None:
            try:
                cap_sum += float(c)
                cap_count += 1
            except (ValueError, TypeError):
                pass
    avg_capital = round(cap_sum / cap_count, 2) if cap_count > 0 else 0.0

    # Latest record for 'Continue where you left off'
    latest = base_query.order_by(AnalysisRecord.created_at.desc()).first()
    latest_record = serialize_analysis_record(latest) if latest else None

    # Feasibility distribution for donut/pie chart
    feasibility_distribution = [
        {"name": "Feasible", "value": feasible_count, "color": "#22c55e"},
        {"name": "Conditional", "value": cond_feasible_count, "color": "#eab308"},
        {"name": "Infeasible", "value": infeasible_count, "color": "#ef4444"}
    ]

    # Sector distribution for bar chart
    sector_counts = db.query(
        AnalysisRecord.business_category, func.count(AnalysisRecord.id).label("count")
    ).filter(
        or_(AnalysisRecord.is_deleted == False, AnalysisRecord.is_deleted == None)
    )
    if current_user:
        sector_counts = sector_counts.filter(or_(AnalysisRecord.user_id == current_user.id, AnalysisRecord.user_id == None))
    sector_data = [
        {"category": row[0], "count": row[1]} 
        for row in sector_counts.group_by(AnalysisRecord.business_category).all()
    ]

    # Recent activity timeline (by date)
    recent_runs = base_query.order_by(AnalysisRecord.created_at.asc()).limit(30).all()
    date_map = {}
    for r in recent_runs:
        if r.created_at:
            d_str = r.created_at.strftime("%b %d")
            date_map[d_str] = date_map.get(d_str, 0) + 1
    timeline_data = [{"date": k, "count": v} for k, v in date_map.items()]

    return {
        "total_analyses": total_count,
        "feasible_count": feasible_count,
        "conditionally_feasible_count": cond_feasible_count,
        "infeasible_count": infeasible_count,
        "feasible_rate": feasible_rate,
        "feasible_rate_pct": feasible_rate,
        "average_capital_lkr": avg_capital,
        "avg_capital_lkr": avg_capital,
        "top_sector": top_sector,
        "latest_record": latest_record,
        "feasibility_distribution": feasibility_distribution,
        "sector_distribution": sector_data,
        "timeline_data": timeline_data
    }


@router.get("/record/{record_id}", response_model=Dict[str, Any])
def get_analysis_record(
    record_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves a full structured profile JSON by Analysis Record ID.
    Enforces user authorization if record is owned by a different user.
    """
    rec = db.query(AnalysisRecord).filter(AnalysisRecord.id == record_id).first()
    if not rec or rec.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis record with ID '{record_id}' not found."
        )

    # Check ownership if record has an assigned user
    if current_user and rec.user_id and rec.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this business analysis."
        )

    return rec.structured_profile


@router.delete("/record/{record_id}", response_model=Dict[str, Any])
def delete_analysis_record(
    record_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Soft-deletes an Analysis Record.
    """
    rec = db.query(AnalysisRecord).filter(AnalysisRecord.id == record_id).first()
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis record with ID '{record_id}' not found."
        )

    if current_user and rec.user_id and rec.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to delete this business analysis."
        )

    rec.is_deleted = True

    # Audit log event for deletion
    audit_entry = AnalysisAuditLog(
        user_id=current_user.id if current_user else None,
        user_email=current_user.email if current_user else "demo@sme360.ai",
        record_id=record_id,
        action="deleted",
        business_category=rec.business_category,
        district=rec.district,
        result_label=rec.feasibility_label,
        result_score=rec.confidence_score
    )
    db.add(audit_entry)

    db.commit()
    return {"status": "deleted", "id": record_id}


@router.post("/record/{record_id}/restore", response_model=Dict[str, Any])
def restore_analysis_record(
    record_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Restores a soft-deleted Analysis Record.
    """
    rec = db.query(AnalysisRecord).filter(AnalysisRecord.id == record_id).first()
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis record with ID '{record_id}' not found."
        )

    rec.is_deleted = False

    # Audit log event for restoration
    audit_entry = AnalysisAuditLog(
        user_id=current_user.id if current_user else None,
        user_email=current_user.email if current_user else "demo@sme360.ai",
        record_id=record_id,
        action="restored",
        business_category=rec.business_category,
        district=rec.district,
        result_label=rec.feasibility_label,
        result_score=rec.confidence_score
    )
    db.add(audit_entry)

    db.commit()
    return {"status": "restored", "id": record_id}


@router.get("/audit-logs", tags=["Audit"])
def get_audit_logs(
    limit: int = 50,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves chronological audit trail of business analysis creation, rerun, delete, and restore events.
    """
    query = db.query(AnalysisAuditLog)
    if current_user:
        query = query.filter(or_(AnalysisAuditLog.user_id == current_user.id, AnalysisAuditLog.user_id == None))
    logs = query.order_by(AnalysisAuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "user_email": log.user_email or "demo@sme360.ai",
            "record_id": log.record_id,
            "action": log.action,
            "business_category": log.business_category,
            "district": log.district,
            "result_label": log.result_label,
            "result_score": log.result_score,
            "created_at": log.created_at.isoformat() if log.created_at else None
        }
        for log in logs
    ]

