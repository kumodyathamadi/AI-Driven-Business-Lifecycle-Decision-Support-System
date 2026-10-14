"""Context-aware regulatory analysis and guidance API for Component 2."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from backend.app.compliance.engine import analyze_compliance
from backend.app.compliance.guidance import build_obligation_output, build_guidance
from backend.app.compliance.profile import BusinessContextRequest
from backend.app.compliance.retrieval import retrieve_evidence
from backend.app.compliance.rulebook_loader import get_obligations
from backend.database import get_db
from backend.models import ComplianceEvaluationRecord
from engine.questions import generate_follow_up_questions

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/component2",
    tags=["Component 2 - Registration & Compliance"],
)


class Component2EvidenceSource(BaseModel):
    source_id: str
    title: Optional[str] = None
    authority: Optional[str] = None
    excerpt: str
    url: Optional[str] = None
    effective_date: Optional[str] = None
    retrieval_score: Optional[float] = None
    reviewer_status: str
    contains_placeholder: bool


class Component2Obligation(BaseModel):
    obligation_id: str
    obligation: str
    title: str
    classification: Literal["Mandatory", "Conditional", "Not Applicable"]
    priority: Literal["high", "review", "none"]
    status: Literal["APPLICABLE", "UNKNOWN", "NOT_APPLICABLE"]
    authority: str
    jurisdiction: str
    source_reference: Optional[Dict[str, Any]] = None
    source_id: str
    source_paragraph: str
    source_text: str
    explanation: str
    action: str
    triggering_facts: Dict[str, Any]
    missing_facts: List[str]
    required_documents: List[str]
    documents_needed: List[str]
    documents_status: str
    documents_notice: Optional[str] = None
    registration_steps: List[str]
    next_action: str
    evidence_source: List[Component2EvidenceSource]
    has_verified_source: bool


class Component2ProfileValidation(BaseModel):
    complete: bool
    missing_required_fields: List[str]
    note: str


class Component2EvaluationResponse(BaseModel):
    evaluation_id: str
    business_context: Dict[str, Any]
    profile_validation: Component2ProfileValidation
    summary: Dict[str, int]
    obligations: List[Component2Obligation]
    guidance: List[Component2Obligation]
    follow_up_questions: List[Dict[str, Any]]
    retrieval_mode: str
    disclaimer: str = (
        "This is preliminary decision-support guidance, not legal advice. "
        "Applicability is determined by the rule engine, not by an LLM. "
        "The current corpus contains draft or placeholder material; verify all "
        "requirements with the responsible Sri Lankan authority."
    )


@router.post("/evaluate", response_model=Component2EvaluationResponse)
@router.post("/analyze", response_model=Component2EvaluationResponse, include_in_schema=False)
def evaluate_compliance(
    request: BusinessContextRequest,
    db: Session = Depends(get_db),
) -> Component2EvaluationResponse:
    """Normalize a business profile, classify rulebook obligations, retrieve evidence, and log."""
    context = request.to_business_context()
    missing_profile_fields = request.missing_profile_fields()
    try:
        analysis = analyze_compliance(request.to_rule_engine_profile())
        evidence_by_obligation: Dict[str, List[Dict[str, Any]]] = {}
        retrieval_modes = set()

        for result in analysis.obligations:
            query = " ".join(
                part
                for part in (
                    result.name,
                    result.required_action,
                    request.sector,
                    request.business_type,
                    " ".join(request.products_services),
                    " ".join(request.activities),
                    request.local_authority,
                    request.province,
                )
                if part
            )
            retrieved = retrieve_evidence(query, top_k=3)
            retrieval_modes.add(retrieved["mode"])
            evidence_by_obligation[result.id] = retrieved["evidence"]
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except (ImportError, RuntimeError) as exc:
        logger.exception("Component 2 retrieval is unavailable")
        raise HTTPException(
            status_code=503,
            detail=f"Regulatory evidence retrieval is unavailable: {exc}",
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    documents_by_obligation = {
        rule.id: rule.required_documents for rule in get_obligations()
    }
    obligation_outputs = [
        build_obligation_output(
            result,
            evidence_by_obligation.get(result.id, []),
            documents_by_obligation.get(result.id, []),
        )
        for result in analysis.obligations
    ]
    guidance_outputs = build_guidance(
        analysis.obligations, evidence_by_obligation, documents_by_obligation
    )
    summary = {
        "total": len(obligation_outputs),
        "applicable": sum(
            result["classification"] == "Mandatory"
            for result in obligation_outputs
        ),
        "not_applicable": sum(
            result["classification"] == "Not Applicable"
            for result in obligation_outputs
        ),
        "unknown": sum(
            result["classification"] == "Conditional"
            for result in obligation_outputs
        ),
    }

    missing_facts = list(
        dict.fromkeys(
            fact
            for result in analysis.obligations
            if result.missing_facts
            for fact in result.missing_facts
        )
    )
    response_data = {
        "evaluation_id": "",
        "business_context": context,
        "profile_validation": {
            "complete": not missing_profile_fields,
            "missing_required_fields": missing_profile_fields,
            "note": (
                "Partial profiles are accepted; omitted facts remain unknown "
                "and may result in conditional classifications."
            ),
        },
        "summary": summary,
        "obligations": obligation_outputs,
        "guidance": guidance_outputs,
        "follow_up_questions": generate_follow_up_questions(missing_facts),
        "retrieval_mode": (
            next(iter(retrieval_modes))
            if len(retrieval_modes) == 1
            else "mixed"
        ),
    }

    try:
        record = ComplianceEvaluationRecord(
            business_context=context,
            result=response_data,
            retrieval_mode=response_data["retrieval_mode"],
        )
        db.add(record)
        db.flush()
        response_data["evaluation_id"] = record.id
        record.result = response_data
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Could not persist Component 2 evaluation")
        raise HTTPException(
            status_code=503,
            detail="The compliance evaluation could not be recorded.",
        ) from exc

    return Component2EvaluationResponse.model_validate(response_data)
