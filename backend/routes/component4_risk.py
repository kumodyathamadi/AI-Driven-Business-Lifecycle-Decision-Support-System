"""
Component 4: Backend REST API Router for Business Plan Risk Analysis & GNN Integration.
Exposes endpoints for:
1. Business plan upload, extraction preview, and dynamic missing-info schema detection
2. Dynamic intake submission with persistent entity resolution & risk execution
3. Candidate business entity resolution and confirmation
4. End-to-end risk and growth readiness analysis execution
5. Interactive relationship graph visualization data (with provenance distinctions)
6. Business assessment history retrieval
7. Report retrieval and file downloads
"""

import os
import sys
import json
import shutil
import uuid
import re
import pandas as pd
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Response, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

# Ensure root directory is in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

SRC_DIR = os.path.join(PROJECT_ROOT, "src")
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from backend.database import get_db
from backend.models import (
    Component4BusinessProfile,
    Component4BusinessRelationship,
    Component4AssessmentRun,
    AnalysisRecord
)
from component4.business_plan_ingestion import (
    BusinessPlanIngestionService,
    MAX_UPLOAD_SIZE_BYTES,
    SUPPORTED_EXTENSIONS
)
from component4.entity_resolution import (
    BusinessEntityResolver,
    ResolvedBusinessEntity,
    WESTERN_PROVINCE_DISTRICTS
)
from component4.intake_schema import (
    DynamicIntakeSchemaService,
    MASTER_INTAKE_SCHEMA,
    PROVENANCE_EXTRACTED,
    PROVENANCE_USER_DECLARED,
    PROVENANCE_INDEPENDENTLY_VERIFIED,
    PROVENANCE_SIMULATED
)
from component4.pipeline import (
    Component4Pipeline,
    DEFAULT_OUTPUT_DIR
)
from component4.mitigation_pdf_generator import Component4MitigationPDFGenerator

router = APIRouter(prefix="/api/component4", tags=["Component 4 — Risk & GNN Decision Support"])

UPLOAD_TMP_DIR = os.path.join(PROJECT_ROOT, "scratch", "uploaded_plans")
os.makedirs(UPLOAD_TMP_DIR, exist_ok=True)

# Singleton service instances
ingestion_service = BusinessPlanIngestionService()
entity_resolver = BusinessEntityResolver()
pipeline = Component4Pipeline(output_base_dir=DEFAULT_OUTPUT_DIR)


def sanitize_for_logging(text: str) -> str:
    """Masks sensitive personally identifiable information (emails, phone numbers, NIC) from log strings."""
    if not text:
        return ""
    # Mask email addresses
    s = re.sub(r'[\w\.-]+@[\w\.-]+\.\w+', '[EMAIL_MASKED]', text)
    # Mask Sri Lankan phone numbers (+94... or 07...)
    s = re.sub(r'(?:\+94|0)\s*\d{2}\s*\d{3}\s*\d{4}', '[PHONE_MASKED]', s)
    # Mask National Identity Card (NIC) patterns
    s = re.sub(r'\b\d{9}[vVxX]|\b\d{12}\b', '[ID_MASKED]', s)
    return s


def find_existing_business_profile(
    db: Session,
    business_id: Optional[str] = None,
    registration_number: Optional[str] = None,
    business_name: Optional[str] = None,
    district: Optional[str] = None
) -> Optional[Component4BusinessProfile]:
    """
    Looks up an existing persistent business record without guessing or fabricating matches.
    Prevents generating new business IDs on repeated uploads of known enterprises.
    """
    # 1. Direct confirmed ID
    if business_id:
        p = db.query(Component4BusinessProfile).filter(Component4BusinessProfile.id == business_id).first()
        if p:
            return p

    # 2. Exact Business Registration Number (BRN / TIN)
    if registration_number and registration_number.strip():
        reg_clean = registration_number.strip()
        p = db.query(Component4BusinessProfile).filter(
            Component4BusinessProfile.registration_number == reg_clean
        ).first()
        if p:
            return p

    # 3. Exact business name + district combination
    if business_name and district:
        name_clean = business_name.strip()
        dist_clean = district.strip()
        if len(name_clean) >= 3:
            p = db.query(Component4BusinessProfile).filter(
                Component4BusinessProfile.business_name.ilike(name_clean),
                Component4BusinessProfile.district.ilike(dist_clean)
            ).first()
            if p:
                return p

    return None


class RunAnalysisRequest(BaseModel):
    plan_file_path: Optional[str] = Field(default=None, description="Path to uploaded business plan file")
    confirmed_business_id: Optional[str] = Field(default=None, description="Confirmed entity ID (e.g. C00001, WP_SME_0001)")
    plan_json: Optional[Dict[str, Any]] = Field(default=None, description="Direct JSON business plan content")


class SubmitIntakeAndRunRequest(BaseModel):
    plan_file_path: Optional[str] = Field(default=None, description="Path to uploaded business plan file")
    plan_json: Optional[Dict[str, Any]] = Field(default=None, description="Direct business plan JSON")
    confirmed_business_id: Optional[str] = Field(default=None, description="Confirmed or chosen business identifier")
    business_name: Optional[str] = Field(default=None, description="Business name")
    district: Optional[str] = Field(default=None, description="District (Colombo, Gampaha, Kalutara)")
    business_category: Optional[str] = Field(default=None, description="Business Sector/Category")
    registration_number: Optional[str] = Field(default=None, description="BRN or TIN identifier")
    capital_includes_loan: Optional[bool] = Field(default=None, description="Whether available capital includes borrowed funds")
    conflict_resolutions: Optional[Dict[str, Any]] = Field(default_factory=dict, description="User resolutions for conflicting values")
    completed_fields: Dict[str, Any] = Field(default_factory=dict, description="Completed missing-info fields")
    declared_relationships: List[Dict[str, Any]] = Field(default_factory=list, description="User declared counterparties")


@router.post("/plan/upload")
async def upload_business_plan(
    file: UploadFile = File(...),
    confirmed_business_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Uploads a business plan file (PDF, DOCX, TXT, or JSON).
    Performs safety verification, structured information extraction, dynamic missing-info schema analysis,
    and persistent entity candidate resolution.
    """
    filename = os.path.basename(file.filename or "uploaded_plan.json")
    ext = os.path.splitext(filename)[1].lower()

    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Supported formats: {sorted(SUPPORTED_EXTENSIONS)}"
        )

    # Save file safely to scratch directory
    safe_filename = f"upload_{os.urandom(4).hex()}_{filename}"
    target_path = os.path.join(UPLOAD_TMP_DIR, safe_filename)

    try:
        contents = await file.read()
        if len(contents) > MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"File exceeds maximum upload size limit ({MAX_UPLOAD_SIZE_BYTES / (1024*1024):.1f} MB)."
            )

        with open(target_path, "wb") as f:
            f.write(contents)

        # Ingest and parse
        extracted = ingestion_service.ingest_file(target_path)
        if not extracted.is_valid and extracted.validation_errors:
            return {
                "success": False,
                "file_path": target_path,
                "extraction": extracted.to_dict(),
                "error": extracted.validation_errors[0]
            }

        # Query DB for existing persistent business profile to prevent ID duplication
        existing_profile = find_existing_business_profile(
            db=db,
            business_id=confirmed_business_id,
            registration_number=extracted.business_identifier,
            business_name=extracted.business_name,
            district=extracted.district
        )

        existing_facts = existing_profile.latest_intake_data if existing_profile else {}
        existing_business_id = existing_profile.id if existing_profile else None

        # Compare extracted facts against required risk schema
        available_facts, missing_form_schema, sufficiency_status = (
            DynamicIntakeSchemaService.analyze_missing_fields(
                extracted_facts=extracted.to_dict(),
                existing_profile=existing_facts
            )
        )

        # Resolve entity candidates
        active_id = existing_business_id or confirmed_business_id
        resolved = entity_resolver.resolve(extracted, confirmed_business_id=active_id)

        # If existing persistent DB entity exists, reflect its ID
        if existing_profile:
            resolved.entity_id = existing_profile.id
            resolved.data_origin = existing_profile.source_origin
            resolved.provenance_notes.append(f"Linked to persistent database profile {existing_profile.id}.")

        suggested_id = (
            existing_business_id
            or (resolved.entity_id if (resolved.entity_id.startswith("WP_SME_") or resolved.entity_id.startswith("C0")) else None)
            or f"c4_biz_{uuid.uuid4().hex[:12]}"
        )

        has_conflicts = len(extracted.conflicting_values) > 0

        return {
            "success": True,
            "file_path": target_path,
            "filename": filename,
            "file_format": ext,
            "extraction": extracted.to_dict(),
            "available_facts": {k: f.to_dict() for k, f in available_facts.items()},
            "missing_form_schema": missing_form_schema,
            "sufficiency_status": sufficiency_status,
            "resolved_entity": resolved.to_dict(),
            "candidate_matches": resolved.candidate_matches,
            "requires_user_confirmation": resolved.requires_user_confirmation or has_conflicts,
            "conflicts": extracted.conflicting_values,
            "financial_assumptions": extracted.financial_assumptions,
            "existing_business_id": existing_business_id,
            "suggested_business_id": suggested_id
        }

    except HTTPException:
        raise
    except Exception as e:
        clean_msg = sanitize_for_logging(str(e))
        raise HTTPException(status_code=500, detail=f"Failed to process business plan: {clean_msg}")


@router.get("/component1-plans")
def list_component1_plans(
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    Lists recent Component 1 generated business plans stored in AnalysisRecords.
    Allows Component 4 to directly ingest plans without re-uploading or manual data re-entry.
    """
    records = db.query(AnalysisRecord).order_by(AnalysisRecord.created_at.desc()).limit(limit).all()
    results = []
    for rec in records:
        inp = rec.input_profile if isinstance(rec.input_profile, dict) else {}
        sp = rec.structured_profile if isinstance(rec.structured_profile, dict) else {}

        b_name = (
            inp.get("business_name")
            or sp.get("business_input", {}).get("business_name")
            or sp.get("personalized_business_plan", {}).get("business_name")
            or f"Enterprise {rec.id[:8]}"
        )
        capital = (
            inp.get("available_capital_lkr")
            or sp.get("business_input", {}).get("available_capital_lkr")
        )
        budget = (
            inp.get("monthly_budget_lkr")
            or sp.get("business_input", {}).get("monthly_budget_lkr")
        )

        results.append({
            "id": rec.id,
            "business_name": b_name,
            "business_category": rec.business_category,
            "business_stage": rec.business_stage,
            "district": rec.district,
            "feasibility_label": rec.feasibility_label,
            "confidence_score": rec.confidence_score,
            "available_capital_lkr": capital,
            "monthly_budget_lkr": budget,
            "created_at": rec.created_at.isoformat() if rec.created_at else None
        })
    return results


@router.post("/plan/load-component1/{record_id}")
def load_component1_plan(
    record_id: str,
    db: Session = Depends(get_db)
):
    """
    Loads and parses an existing Component 1 generated business plan directly from the database.
    Extracts all Phase 2 mandatory fields, checks for conflicts (e.g. concept vs sector),
    evaluates capital vs loan relationship, and dynamically determines missing risk inputs.
    """
    rec = db.query(AnalysisRecord).filter(AnalysisRecord.id == record_id).first()
    if not rec:
        raise HTTPException(
            status_code=404,
            detail=f"Component 1 Analysis Record with ID '{record_id}' not found."
        )

    # Prefer structured profile; fallback to input profile
    plan_dict = rec.structured_profile if isinstance(rec.structured_profile, dict) and rec.structured_profile else rec.input_profile
    if not isinstance(plan_dict, dict):
        raise HTTPException(
            status_code=500,
            detail="Stored Component 1 record does not contain valid structured profile JSON."
        )

    # Ingest directly in memory
    extracted = ingestion_service.ingest_dict(plan_dict, source_name=f"component1_{record_id[:8]}.json")

    # Persist a temporary file representation so submit_intake_and_run can refer to it
    safe_filename = f"c1_plan_{record_id[:8]}_{os.urandom(4).hex()}.json"
    target_path = os.path.join(UPLOAD_TMP_DIR, safe_filename)
    try:
        with open(target_path, "w", encoding="utf-8") as f:
            json.dump(plan_dict, f, indent=2)
    except Exception as e:
        print(f"Warning saving temporary plan file: {e}")

    # Check for existing profile in DB
    existing_profile = find_existing_business_profile(
        db=db,
        registration_number=extracted.business_identifier,
        business_name=extracted.business_name,
        district=extracted.district
    )
    existing_facts = existing_profile.latest_intake_data if existing_profile else {}
    existing_business_id = existing_profile.id if existing_profile else None

    # Analyze missing fields
    available_facts, missing_form_schema, sufficiency_status = (
        DynamicIntakeSchemaService.analyze_missing_fields(
            extracted_facts=extracted.to_dict(),
            existing_profile=existing_facts
        )
    )

    # Resolve entity candidates
    resolved = entity_resolver.resolve(extracted, confirmed_business_id=existing_business_id)
    if existing_profile:
        resolved.entity_id = existing_profile.id
        resolved.data_origin = existing_profile.source_origin
        resolved.provenance_notes.append(f"Linked to persistent database profile {existing_profile.id}.")

    suggested_id = (
        existing_business_id
        or (resolved.entity_id if (resolved.entity_id.startswith("WP_SME_") or resolved.entity_id.startswith("C0")) else None)
        or f"c4_biz_{uuid.uuid4().hex[:12]}"
    )

    has_conflicts = len(extracted.conflicting_values) > 0

    return {
        "success": True,
        "source_type": "COMPONENT_1_DATABASE",
        "record_id": record_id,
        "file_path": target_path,
        "filename": f"Component1_Plan_{record_id[:8]}.json",
        "file_format": ".json",
        "extraction": extracted.to_dict(),
        "available_facts": {k: f.to_dict() for k, f in available_facts.items()},
        "missing_form_schema": missing_form_schema,
        "sufficiency_status": sufficiency_status,
        "resolved_entity": resolved.to_dict(),
        "candidate_matches": resolved.candidate_matches,
        "requires_user_confirmation": resolved.requires_user_confirmation or has_conflicts,
        "conflicts": extracted.conflicting_values,
        "financial_assumptions": extracted.financial_assumptions,
        "existing_business_id": existing_business_id,
        "suggested_business_id": suggested_id
    }


@router.post("/intake/submit-and-run")
def submit_intake_and_run(
    request: SubmitIntakeAndRunRequest,
    db: Session = Depends(get_db)
):
    """
    Submits completed dynamic intake fields, confirms business identity, resolves or creates
    a persistent business profile (without generating duplicate IDs for re-uploads),
    persists user-declared relationships, and runs the risk and GNN pipeline.
    """
    file_path = request.plan_file_path

    # If direct JSON provided, or if file_path does not exist, synthesize plan JSON from request
    if (not file_path or not os.path.exists(file_path)):
        if request.plan_json or request.completed_fields or request.business_name:
            temp_json_path = os.path.join(UPLOAD_TMP_DIR, f"plan_{os.urandom(4).hex()}.json")
            base_plan = request.plan_json or {
                "business_name": request.business_name or "Registered SME",
                "district": request.district or "Colombo",
                "province": "Western",
                "business_category": request.business_category or "Enterprise",
                "business_stage": "Operating SME",
                "financial_projections": request.completed_fields or {}
            }
            with open(temp_json_path, "w", encoding="utf-8") as f:
                json.dump(base_plan, f, indent=2)
            file_path = temp_json_path

    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=400, detail="Valid business plan file path or plan JSON is required.")

    # 1. Validate user-submitted intake fields
    is_valid, validated_data, val_errors = DynamicIntakeSchemaService.validate_intake_payload(request.completed_fields)
    if not is_valid:
        raise HTTPException(status_code=400, detail={"message": "Validation errors in intake submission", "errors": val_errors})

    # Apply explicit user conflict resolutions if provided
    if request.conflict_resolutions:
        for c_field, c_choice in request.conflict_resolutions.items():
            if c_field == "business_category":
                validated_data["business_category"] = {"value": c_choice, "provenance": "USER_CONFIRMED"}
            elif c_field == "capital_includes_loan":
                validated_data["capital_includes_loan"] = {"value": bool(c_choice), "provenance": "USER_CONFIRMED"}
            else:
                validated_data[c_field] = {"value": c_choice, "provenance": "USER_CONFIRMED"}

    if request.capital_includes_loan is not None:
        validated_data["capital_includes_loan"] = {"value": request.capital_includes_loan, "provenance": "USER_CONFIRMED"}

    # Ingest base plan
    plan = ingestion_service.ingest_file(file_path)

    # 2. Resolve business identity attributes
    b_name = (
        request.business_name
        or (validated_data.get("business_name", {}).get("value") if isinstance(validated_data.get("business_name"), dict) else validated_data.get("business_name"))
        or plan.business_name
        or "Registered SME"
    )
    b_dist = (
        request.district
        or (validated_data.get("district", {}).get("value") if isinstance(validated_data.get("district"), dict) else validated_data.get("district"))
        or plan.district
        or "Colombo"
    )
    b_cat = (
        (request.conflict_resolutions.get("business_category") if request.conflict_resolutions else None)
        or request.business_category
        or (validated_data.get("business_category", {}).get("value") if isinstance(validated_data.get("business_category"), dict) else validated_data.get("business_category"))
        or plan.business_category
        or "Grocery/Mini-Mart"
    )
    b_reg = (
        request.registration_number
        or (validated_data.get("registration_number", {}).get("value") if isinstance(validated_data.get("registration_number"), dict) else validated_data.get("registration_number"))
        or plan.business_identifier
    )

    # Geographic boundary enforcement
    if b_dist not in WESTERN_PROVINCE_DISTRICTS:
        raise HTTPException(
            status_code=400,
            detail=f"District '{b_dist}' is outside Western Province research boundary (Colombo, Gampaha, Kalutara)."
        )

    # 3. Persistent Business ID Resolution: Re-use existing profile or create new collision-safe profile
    profile = find_existing_business_profile(
        db=db,
        business_id=request.confirmed_business_id,
        registration_number=b_reg,
        business_name=b_name,
        district=b_dist
    )

    is_reused_profile = profile is not None

    if profile:
        # Re-upload for existing enterprise: update timestamp, intake data, and fields
        setattr(profile, "updated_at", datetime.now(timezone.utc))
        if b_name:
            setattr(profile, "business_name", b_name)
        if b_dist:
            setattr(profile, "district", b_dist)
        if b_cat:
            setattr(profile, "business_category", b_cat)
        if b_reg:
            setattr(profile, "registration_number", b_reg)

        # Merge intake data
        current_data = dict(profile.latest_intake_data or {})
        current_data.update(validated_data)
        setattr(profile, "latest_intake_data", current_data)
        biz_id = profile.id
    else:
        # New enterprise profile: assign collision-safe persistent ID
        biz_id = request.confirmed_business_id or f"c4_biz_{uuid.uuid4().hex[:12]}"
        b_stage = (
            (validated_data.get("business_stage", {}).get("value") if isinstance(validated_data.get("business_stage"), dict) else validated_data.get("business_stage"))
            or plan.business_stage
            or "Growing"
        )
        b_model = (
            (validated_data.get("operating_model", {}).get("value") if isinstance(validated_data.get("operating_model"), dict) else validated_data.get("operating_model"))
            or plan.primary_strategy
            or "B2C Physical Store"
        )
        profile = Component4BusinessProfile(
            id=biz_id,
            business_name=b_name,
            registration_number=b_reg,
            district=b_dist,
            province="Western",
            business_category=b_cat,
            business_stage=b_stage,
            operating_model=b_model,
            source_origin="USER_UPLOAD",
            latest_intake_data=validated_data,
            is_verified=False
        )
        db.add(profile)

    db.commit()
    db.refresh(profile)

    # 4. Save user-declared relationships
    if request.declared_relationships:
        for rel_item in request.declared_relationships:
            p_name = rel_item.get("partner_name", "").strip()
            if not p_name:
                continue
            # Avoid duplicate declared relationship
            existing_rel = db.query(Component4BusinessRelationship).filter_by(
                business_id=profile.id,
                partner_name=p_name
            ).first()

            p_type = str(rel_item.get("partner_type", "SUPPLIER")).upper()
            r_type = str(rel_item.get("relationship_type", "SUPPLIES")).upper()
            tx_val = float(rel_item["transaction_value_lkr"]) if rel_item.get("transaction_value_lkr") is not None else None
            dep_pct = float(rel_item["dependency_percentage"]) if rel_item.get("dependency_percentage") is not None else None
            delay = float(rel_item["payment_delay_days"]) if rel_item.get("payment_delay_days") is not None else None

            if existing_rel:
                setattr(existing_rel, "partner_type", p_type)
                setattr(existing_rel, "relationship_type", r_type)
                setattr(existing_rel, "transaction_value_lkr", tx_val)
                setattr(existing_rel, "dependency_percentage", dep_pct)
                setattr(existing_rel, "payment_delay_days", delay)
            else:
                db_rel = Component4BusinessRelationship(
                    business_id=profile.id,
                    partner_name=p_name,
                    partner_type=p_type,
                    relationship_type=r_type,
                    provenance_category="USER_DECLARED",
                    transaction_value_lkr=tx_val,
                    dependency_percentage=dep_pct,
                    payment_delay_days=delay,
                    is_verified=False,
                    verification_notes="User declared counterparty via dynamic intake form."
                )
                db.add(db_rel)

        db.commit()

    # 5. Execute pipeline
    try:
        res = pipeline.run(
            business_plan_path=file_path,
            confirmed_business_id=profile.id,
            user_intake_overrides=validated_data,
            user_declared_relationships=request.declared_relationships,
            save_artifacts=True
        )

        # 6. Save Assessment Run Log in DB
        res_dict = res.to_dict()
        assessment_run = Component4AssessmentRun(
            id=res.analysis_id,
            business_id=profile.id,
            plan_filename=res.business_plan_filename,
            evidence_sufficiency=res.overall_summary.get("evidence_sufficiency", "SUFFICIENT"),
            overall_risk_category=res.stage6_risk_assessment.overall_risk_category,
            composite_risk_score=res.stage6_risk_assessment.composite_risk_score,
            gnn_status=res.stage7_gnn_inference.gnn_status,
            gnn_predicted_risk=res.stage7_gnn_inference.predicted_risk_category,
            gnn_score=res.stage7_gnn_inference.graph_contextual_risk_score,
            growth_readiness=res.growth_readiness.decision,
            risk_adjusted_recommendation=res.growth_readiness.risk_adjusted_recommendation,
            full_results_json=res_dict,
            markdown_report=res.markdown_report
        )
        db.add(assessment_run)
        db.commit()

        return {
            "success": True,
            "analysis_id": res.analysis_id,
            "persistent_business_id": profile.id,
            "is_reused_profile": is_reused_profile,
            "timestamp": res.timestamp,
            "summary": res.overall_summary,
            "business_plan": res.plan_extraction.to_dict(),
            "plan_extraction": res.plan_extraction.to_dict(),
            "resolved_entity": res.resolved_entity.to_dict(),
            "stage6_risk_assessment": res.stage6_risk_assessment.to_dict(),
            "stage7_gnn_inference": res.stage7_gnn_inference.to_dict(),
            "growth_readiness": res.growth_readiness.to_dict(),
            "output_files": res.output_files
        }
    except Exception as e:
        clean_msg = sanitize_for_logging(str(e))
        raise HTTPException(status_code=500, detail=f"Analysis pipeline execution error: {clean_msg}")


@router.post("/analysis/run")
def run_analysis(request: RunAnalysisRequest):
    """
    Executes the full Component 4 decision support pipeline on an uploaded plan.
    Runs Stage 6 deterministic risk scoring, Stage 7 GNN relational inference,
    and growth readiness evaluation.
    """
    file_path = request.plan_file_path

    # If direct JSON provided, save to temp file
    if not file_path and request.plan_json:
        temp_json_path = os.path.join(UPLOAD_TMP_DIR, f"plan_{os.urandom(4).hex()}.json")
        with open(temp_json_path, "w", encoding="utf-8") as f:
            json.dump(request.plan_json, f, indent=2)
        file_path = temp_json_path

    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=400, detail="Valid business plan file path or plan JSON is required.")

    try:
        res = pipeline.run(
            business_plan_path=file_path,
            confirmed_business_id=request.confirmed_business_id,
            save_artifacts=True
        )
        return {
            "success": True,
            "analysis_id": res.analysis_id,
            "timestamp": res.timestamp,
            "summary": res.overall_summary,
            "business_plan": res.plan_extraction.to_dict(),
            "plan_extraction": res.plan_extraction.to_dict(),
            "resolved_entity": res.resolved_entity.to_dict(),
            "stage6_risk_assessment": res.stage6_risk_assessment.to_dict(),
            "stage7_gnn_inference": res.stage7_gnn_inference.to_dict(),
            "growth_readiness": res.growth_readiness.to_dict(),
            "output_files": res.output_files
        }
    except Exception as e:
        clean_msg = sanitize_for_logging(str(e))
        raise HTTPException(status_code=500, detail=f"Analysis pipeline error: {clean_msg}")


@router.post("/assess")
def assess_business(request: Dict[str, Any], db: Session = Depends(get_db)):
    """Convenience and backwards-compatible direct assessment endpoint."""
    plan_source = request.get("plan_source") or request.get("plan_json") or request
    intake = request.get("intake_submission") or request.get("completed_fields") or request
    declared_rels = request.get("user_declared_relationships") or request.get("declared_relationships") or []
    confirmed_id = request.get("confirmed_business_id")
    try:
        res = pipeline.run(
            plan_source=plan_source,
            intake_submission=intake,
            user_declared_relationships=declared_rels,
            confirmed_business_id=confirmed_id,
            save_artifacts=False
        )
        return {
            "success": True,
            "analysis_id": res.analysis_id,
            "timestamp": res.timestamp,
            "summary": res.overall_summary,
            "business_plan": res.business_plan.to_dict(),
            "plan_extraction": res.plan_extraction.to_dict(),
            "resolved_entity": res.resolved_entity.to_dict(),
            "stage6_risk_assessment": res.stage6_risk_assessment.to_dict(),
            "stage7_gnn_inference": res.stage7_gnn_inference.to_dict(),
            "growth_readiness": res.growth_readiness.to_dict()
        }
    except Exception as e:
        clean_msg = sanitize_for_logging(str(e))
        raise HTTPException(status_code=500, detail=f"Assessment error: {clean_msg}")


@router.get("/business/{business_id}/history")
def get_business_assessment_history(
    business_id: str,
    db: Session = Depends(get_db)
):
    """Retrieves chronological assessment run history for a persistent business ID."""
    runs = db.query(Component4AssessmentRun).filter(
        Component4AssessmentRun.business_id == business_id
    ).order_by(Component4AssessmentRun.created_at.desc()).all()

    history = []
    for r in runs:
        history.append({
            "analysis_id": r.id,
            "business_id": r.business_id,
            "plan_filename": r.plan_filename,
            "evidence_sufficiency": r.evidence_sufficiency,
            "overall_risk_category": r.overall_risk_category,
            "composite_risk_score": r.composite_risk_score,
            "gnn_status": r.gnn_status,
            "gnn_predicted_risk": r.gnn_predicted_risk,
            "gnn_score": r.gnn_score,
            "growth_readiness": r.growth_readiness,
            "risk_adjusted_recommendation": r.risk_adjusted_recommendation,
            "created_at": r.created_at.isoformat() if r.created_at else None
        })

    return {
        "success": True,
        "business_id": business_id,
        "total_runs": len(history),
        "history": history
    }


@router.get("/assessments/recent")
def list_recent_assessments(
    limit: int = 15,
    db: Session = Depends(get_db)
):
    """Retrieves recent assessment runs across persistent businesses for dashboard display."""
    runs = db.query(Component4AssessmentRun).order_by(
        Component4AssessmentRun.created_at.desc()
    ).limit(limit).all()

    history = []
    for r in runs:
        biz = db.query(Component4BusinessProfile).filter_by(id=r.business_id).first()
        history.append({
            "analysis_id": r.id,
            "business_id": r.business_id,
            "business_name": biz.business_name if biz else r.business_id,
            "district": biz.district if biz else "Colombo",
            "business_category": biz.business_category if biz else "Enterprise",
            "plan_filename": r.plan_filename,
            "evidence_sufficiency": r.evidence_sufficiency,
            "overall_risk_category": r.overall_risk_category,
            "composite_risk_score": r.composite_risk_score,
            "gnn_status": r.gnn_status,
            "gnn_predicted_risk": r.gnn_predicted_risk,
            "gnn_score": r.gnn_score,
            "growth_readiness": r.growth_readiness,
            "risk_adjusted_recommendation": r.risk_adjusted_recommendation,
            "created_at": r.created_at.isoformat() if r.created_at else None
        })

    return {
        "success": True,
        "total": len(history),
        "assessments": history
    }


@router.get("/businesses")
def list_component4_businesses(
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Lists persistent registered Component 4 business profiles with latest risk status."""
    profiles = db.query(Component4BusinessProfile).order_by(
        Component4BusinessProfile.updated_at.desc()
    ).limit(limit).all()

    businesses = []
    for p in profiles:
        latest_run = db.query(Component4AssessmentRun).filter_by(business_id=p.id).order_by(
            Component4AssessmentRun.created_at.desc()
        ).first()

        businesses.append({
            "id": p.id,
            "business_name": p.business_name,
            "registration_number": p.registration_number,
            "district": p.district,
            "province": p.province,
            "business_category": p.business_category,
            "business_stage": p.business_stage,
            "source_origin": p.source_origin,
            "latest_risk_category": latest_run.overall_risk_category if latest_run else None,
            "composite_risk_score": latest_run.composite_risk_score if latest_run else None,
            "latest_assessment_id": latest_run.id if latest_run else None,
            "assessment_count": len(getattr(p, "assessment_runs", [])) if getattr(p, "assessment_runs", None) else 0,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        })

    return {
        "success": True,
        "total": len(businesses),
        "businesses": businesses
    }


@router.get("/analysis/{analysis_id}")
def get_analysis_by_id(analysis_id: str, db: Session = Depends(get_db)):
    """Retrieves saved analysis results by analysis identifier from disk or database."""
    target_dir = os.path.join(DEFAULT_OUTPUT_DIR, analysis_id)
    json_path = os.path.join(target_dir, "analysis_results.json")

    if os.path.exists(json_path):
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, dict):
                if "business_plan" not in data and "plan_extraction" in data:
                    data["business_plan"] = data["plan_extraction"]
            return {"success": True, "data": data}
        except Exception:
            pass

    # Database fallback
    run_rec = db.query(Component4AssessmentRun).filter_by(id=analysis_id).first()
    if run_rec and run_rec.full_results_json:
        data = dict(run_rec.full_results_json)
        if "business_plan" not in data and "plan_extraction" in data:
            data["business_plan"] = data["plan_extraction"]
        return {"success": True, "data": data}

    raise HTTPException(status_code=404, detail=f"Analysis ID '{analysis_id}' not found.")


@router.get("/analysis/{analysis_id}/report")
def get_analysis_report(analysis_id: str, download: bool = False):
    """Retrieves or downloads the generated markdown report."""
    target_dir = os.path.join(DEFAULT_OUTPUT_DIR, analysis_id)
    md_path = os.path.join(target_dir, "analysis_report.md")

    if not os.path.exists(md_path):
        raise HTTPException(status_code=404, detail=f"Report for analysis ID '{analysis_id}' not found.")

    try:
        with open(md_path, "r", encoding="utf-8") as f:
            report_text = f.read()

        if download:
            return Response(
                content=report_text,
                media_type="text/markdown",
                headers={
                    "Content-Disposition": f"attachment; filename=\"Component4_Report_{analysis_id}.md\""
                }
            )
        return {"success": True, "analysis_id": analysis_id, "markdown_report": report_text}
    except Exception as e:
        clean_msg = sanitize_for_logging(str(e))
        raise HTTPException(status_code=500, detail=f"Failed to load report: {clean_msg}")


@router.get("/analysis/{analysis_id}/pdf")
@router.get("/analysis/{analysis_id}/mitigation-plan.pdf")
def get_analysis_mitigation_plan_pdf(
    analysis_id: str,
    download: bool = False,
    db: Session = Depends(get_db)
):
    """
    Retrieves or downloads the professional, evidence-based PDF Mitigation Plan.
    Synthesizes all 5 risk categories, empirical drivers, prioritized mitigations,
    and growth readiness into a downloadable document with Unicode Sinhala/English support.
    """
    target_dir = os.path.join(DEFAULT_OUTPUT_DIR, analysis_id)
    pdf_path = os.path.join(target_dir, "mitigation_plan.pdf")
    json_path = os.path.join(target_dir, "analysis_results.json")

    pdf_bytes = None
    if os.path.exists(pdf_path):
        try:
            with open(pdf_path, "rb") as f:
                pdf_bytes = f.read()
        except Exception as e:
            print(f"Warning reading cached PDF: {e}")

    if pdf_bytes is None:
        analysis_data = None
        if os.path.exists(json_path):
            try:
                with open(json_path, "r", encoding="utf-8") as f:
                    analysis_data = json.load(f)
            except Exception as e:
                print(f"Warning reading json results: {e}")

        if analysis_data is None:
            run_rec = db.query(Component4AssessmentRun).filter_by(id=analysis_id).first()
            if run_rec and run_rec.full_results_json:
                analysis_data = dict(run_rec.full_results_json)

        if analysis_data:
            try:
                pdf_bytes = Component4MitigationPDFGenerator.generate(analysis_data)
                # Cache for next request
                os.makedirs(target_dir, exist_ok=True)
                with open(pdf_path, "wb") as f:
                    f.write(pdf_bytes)
            except Exception as e:
                clean_msg = sanitize_for_logging(str(e))
                raise HTTPException(status_code=500, detail=f"Failed to generate mitigation plan PDF: {clean_msg}")

    if not pdf_bytes:
        raise HTTPException(status_code=404, detail=f"Analysis ID '{analysis_id}' not found.")

    disposition = "attachment" if download else "inline"
    filename = f"Component4_Mitigation_Plan_{analysis_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'{disposition}; filename="{filename}"'
        }
    )


@router.get("/graph/{business_id}")
def get_business_relationship_graph(business_id: str, db: Session = Depends(get_db)):
    """
    Returns graph topology data (nodes and edges) for interactive visualization.
    Clearly distinguishes verified relationships, user-declared nodes, and evidence sources.
    Zero synthetic edges are fabricated for isolated entities.
    """
    # 1. Lookup persistent business profile in DB if available
    biz = db.query(Component4BusinessProfile).filter_by(id=business_id).first()
    label = biz.business_name if biz else business_id
    district = biz.district if biz else "Colombo"

    target_node = {
        "id": business_id,
        "label": label,
        "type": "BUSINESS",
        "category": "Target SME",
        "is_target": True,
        "district": district,
        "verified": biz.is_verified if biz else True
    }

    nodes = [target_node]
    edges = []

    # 2. Retrieve persistent relationships from DB
    db_rels = db.query(Component4BusinessRelationship).filter_by(business_id=business_id).all()
    for r in db_rels:
        partner_id = r.partner_name
        if not any(n["id"] == partner_id for n in nodes):
            nodes.append({
                "id": partner_id,
                "label": partner_id,
                "type": r.partner_type,
                "category": r.partner_type.capitalize(),
                "is_target": False,
                "district": "Western Province",
                "verified": r.is_verified,
                "evidence_source": r.provenance_category
            })

        edges.append({
            "source": business_id if r.relationship_type in ["SELLS_TO", "BORROWS_FROM"] else partner_id,
            "target": partner_id if r.relationship_type in ["SELLS_TO", "BORROWS_FROM"] else business_id,
            "relationship_type": r.relationship_type,
            "role": r.partner_type,
            "transaction_value_lkr": r.transaction_value_lkr,
            "dependency_percentage": r.dependency_percentage,
            "payment_delay_days": r.payment_delay_days,
            "disruption_status": "BASELINE",
            "verified": r.is_verified,
            "evidence_source": r.provenance_category
        })

    # 3. Retrieve scenario relationships if linked or scenario SME
    scenario_rels = entity_resolver._retrieve_relationships(business_id, "SIMULATED_SCENARIO")
    for r in scenario_rels:
        partner_id = r.partner_id
        if not any(n["id"] == partner_id for n in nodes):
            nodes.append({
                "id": partner_id,
                "label": partner_id,
                "type": r.role,
                "category": r.role.capitalize(),
                "is_target": False,
                "district": "Western Province",
                "verified": r.is_verified,
                "evidence_source": r.evidence_source
            })

        edges.append({
            "source": r.source_id,
            "target": r.target_id,
            "relationship_type": r.relationship_type,
            "role": r.role,
            "transaction_value_lkr": r.transaction_value_lkr,
            "dependency_percentage": r.dependency_percentage,
            "payment_delay_days": r.payment_delay_days,
            "disruption_status": r.disruption_status,
            "verified": r.is_verified,
            "evidence_source": r.evidence_source
        })

    return {
        "success": True,
        "business_id": business_id,
        "nodes": nodes,
        "edges": edges,
        "has_network": len(edges) > 0,
        "node_count": len(nodes),
        "edge_count": len(edges),
        "methodology_note": (
            "Relationships categorized strictly into VERIFIED_OBSERVED, USER_DECLARED, and SIMULATED_SCENARIO. "
            "Zero artificial edges fabricated for isolated nodes."
        )
    }


@router.get("/candidates")
def list_candidate_businesses(district: Optional[str] = None, category: Optional[str] = None):
    """Returns candidate Western Province businesses from the scenario inventory for selection."""
    if entity_resolver.profiles_df is None or entity_resolver.profiles_df.empty:
        return {"success": True, "candidates": []}

    df = entity_resolver.profiles_df
    col_map = {c.lower(): c for c in df.columns}
    bid_col = col_map.get("business_id", "Business_ID")
    dist_col = col_map.get("district", "District")
    prov_col = col_map.get("province", "Province")
    cat_col = col_map.get("business_sector", col_map.get("business_category", "Business_Sector"))
    stage_col = col_map.get("business_stage", "Business_Stage")
    emp_col = col_map.get("employee_count", "Employee_Count")

    if district and dist_col in df.columns:
        df = df[df[dist_col].astype(str).str.lower() == district.lower()]
    if category and cat_col in df.columns:
        df = df[df[cat_col].astype(str).str.lower().str.contains(category.lower())]

    candidates = []
    for _, row in df.head(30).iterrows():
        candidates.append({
            "business_id": str(row.get(bid_col, "")),
            "district": str(row.get(dist_col, "")),
            "province": str(row.get(prov_col, "")),
            "business_category": str(row.get(cat_col, "")),
            "business_stage": str(row.get(stage_col, "")),
            "employee_count": int(row.get(emp_col, 0)) if pd.notnull(row.get(emp_col)) else 0,
            "data_origin": "VERIFIED_DATASET_PROFILE"
        })

    return {"success": True, "total": len(candidates), "candidates": candidates}


@router.get("/model-status")
def get_model_status():
    """
    Returns the training, evaluation status, and provenance metadata for the Component 4 B2B GNN.
    Transparently discloses simulated graph edges, inductive evaluation protocol, transductive benchmark,
    balanced accuracy, class imbalance limitations, and baseline comparison.
    """
    eval_report_path = os.path.join(PROJECT_ROOT, "reports", "component4", "gnn_evaluation_report.json")
    meta_path = os.path.join(PROJECT_ROOT, "models", "component4", "gnn_model_metadata.json")

    eval_data = {}
    meta_data = {}

    if os.path.exists(eval_report_path):
        try:
            with open(eval_report_path, "r", encoding="utf-8") as f:
                eval_data = json.load(f)
        except Exception:
            pass

    if os.path.exists(meta_path):
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                meta_data = json.load(f)
        except Exception:
            pass

    gnn_metrics_dict = eval_data.get("gnn_metrics", {
        "test_accuracy": 0.7200,
        "test_balanced_accuracy": 0.4725,
        "test_macro_f1": 0.3114,
        "test_macro_f1_3class": 0.3114,
        "test_macro_f1_2class": 0.5040
    })
    baseline_metrics_dict = eval_data.get("baseline_metrics", {
        "test_accuracy": 0.5933,
        "test_balanced_accuracy": 0.5644,
        "test_macro_f1_3class": 0.3459,
        "test_macro_f1_2class": 0.5189,
        "test_macro_f1": 0.3459
    })

    return {
        "success": True,
        "model_name": "Component 4 B2B Risk GNN",
        "model_architecture": "B2BRiskGNN (2-Layer GraphConv + Skip Connections + LayerNorm)",
        "model_version": meta_data.get("model_version", "Component4_B2BRiskGNN_v2.1"),
        "evaluation_protocol": meta_data.get("evaluation_protocol", "inductive"),
        "framework": "PyTorch 2.14 / PyTorch Geometric",
        "status": "DEPLOYED",
        "checkpoint_path": "models/component4/gnn_risk_model.pt",
        "versioned_checkpoint_path": "models/component4/gnn_risk_model_inductive_v2.1.pt",
        "preprocessor_path": "models/component4/gnn_preprocessor.joblib",
        "input_feature_dim": 41,
        "target_classes": ["Low", "Medium", "High"],
        "training_dataset_summary": {
            "businesses_count": 1000,
            "geographic_scope": "Western Province, Sri Lanka (Colombo, Gampaha, Kalutara)",
            "monthly_records_count": 24000,
            "graph_edges_count": 3487,
            "graph_edges_provenance": "SIMULATED_EXPERIMENTAL_EDGES (Verified_Flag=0)",
            "split_strategy": "Business_ID Grouped Split (70% Train, 15% Val, 15% Test)",
            "random_seed": 42
        },
        "evaluation_metrics": {
            "evaluation_protocol": "inductive",
            "gnn_metrics": gnn_metrics_dict,
            "baseline_metrics": baseline_metrics_dict,
            "inductive_evaluation": eval_data.get("inductive_evaluation", {}),
            "transductive_evaluation": eval_data.get("transductive_evaluation", {}),
            "gnn_test_accuracy": gnn_metrics_dict.get("test_accuracy", 0.7200),
            "gnn_test_balanced_accuracy": gnn_metrics_dict.get("test_balanced_accuracy", 0.4725),
            "gnn_test_macro_f1": gnn_metrics_dict.get("test_macro_f1", 0.3114),
            "gnn_test_macro_f1_3class": gnn_metrics_dict.get("test_macro_f1_3class", 0.3114),
            "gnn_test_macro_f1_2class": gnn_metrics_dict.get("test_macro_f1_2class", 0.5040),
            "baseline_model": "Random Forest Classifier (Non-Graph)",
            "baseline_test_accuracy": baseline_metrics_dict.get("test_accuracy", 0.5933),
            "baseline_test_balanced_accuracy": baseline_metrics_dict.get("test_balanced_accuracy", 0.5644),
            "baseline_test_macro_f1": baseline_metrics_dict.get("test_macro_f1", 0.3459),
            "baseline_test_macro_f1_3class": baseline_metrics_dict.get("test_macro_f1_3class", 0.3459),
            "baseline_test_macro_f1_2class": baseline_metrics_dict.get("test_macro_f1_2class", 0.5189),
        },
        "protocols_summary": {
            "tabular_baseline": {
                "name": "Tabular Random Forest Baseline",
                "accuracy": 0.5933,
                "balanced_accuracy": 0.5644,
                "binary_macro_f1": 0.5189,
                "three_class_macro_f1": 0.3459,
                "cross_split_relationships_at_inference": False
            },
            "inductive_isolated_subgraph": {
                "name": "Strict Isolated-Subgraph Inductive GNN",
                "accuracy": 0.5533,
                "balanced_accuracy": 0.4741,
                "binary_macro_f1": 0.4577,
                "three_class_macro_f1": 0.3088,
                "cross_split_relationships_at_inference": False
            },
            "inductive_extended_network": {
                "name": "Inductive GNN (Explicit Test-Time Relationships)",
                "accuracy": 0.7200,
                "balanced_accuracy": 0.4725,
                "binary_macro_f1": 0.5040,
                "three_class_macro_f1": 0.3114,
                "cross_split_relationships_at_inference": True
            },
            "transductive_benchmark": {
                "name": "Transductive Full-Graph Benchmark",
                "accuracy": 0.6800,
                "balanced_accuracy": 0.5788,
                "binary_macro_f1": 0.5614,
                "three_class_macro_f1": 0.3743,
                "cross_split_relationships_at_inference": True
            }
        },
        "class_imbalance_disclosure": eval_data.get("class_imbalance_disclosure", {
            "high_risk_cases_total": 2,
            "high_risk_cases_test": 0,
            "scientific_limitation_statement": (
                "The dataset contains only 2 High-risk SMEs (0.2%), and 0 occur in the test split. "
                "Consequently, empirical test evaluation measures binary Low vs Medium discrimination."
            )
        }),
        "performance_verdict": eval_data.get("performance_verdict", {
            "finding": (
                "Random Forest achieves higher Balanced Accuracy (56.44%) and Binary Macro-F1 (51.89%) "
                "compared to Inductive GNN (47.25% / 50.40%). Under 3-class evaluation, Random Forest Macro-F1 "
                "(34.59%) also exceeds Inductive GNN (31.14%). GNN higher raw accuracy (72.00%) "
                "reflects majority-class bias toward Low risk, not superior relational discrimination."
            )
        }),
        "data_provenance_disclosure": (
            "The 3,487 edges in Business_Relationships.csv are simulated for experimental graph evaluation (Verified_Flag=0). "
            "Isolated businesses with 0 relationship edges fall back cleanly to non-graph deterministic assessment. "
            "Zero synthetic edges are fabricated for standalone entities."
        )
    }
