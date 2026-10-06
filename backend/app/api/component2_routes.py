"""
Component 2: AI-Based Business Registration & Regulatory Compliance API Router
Scope: Sri Lanka - Western Province, Colombo District
Methodology: RAG (Retrieval-Augmented Generation) using Localized Gazette & Municipal Statutes
"""

from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

router = APIRouter(
    prefix="/api/v1/component2",
    tags=["Component 2 - Registration & Compliance"]
)

class BusinessContextRequest(BaseModel):
    business_name: str
    sector: str  # food, clothing, saloon, vehicle
    entity_type: str  # Sole proprietorship, Partnership, Private Limited
    municipal_council: str  # Colombo Municipal Council, Kotte MC, Dehiwala MC
    employees_count: int
    annual_revenue_lkr: float
    activities: List[str]

class RAGCitationResponse(BaseModel):
    act_title: str
    sub_title: str
    jurisdiction: str
    enforcing_authority: str
    vector_score: float
    legal_excerpt: str
    ai_rationale: str
    penalty_risk: str
    required_artifacts: List[str]

class ComplianceEvaluationResponse(BaseModel):
    readiness_percentage: int
    rules_evaluated: int
    rules_applied: int
    completed_count: int
    in_progress_count: int
    next_best_action: dict
    citations: List[RAGCitationResponse]

@router.post("/evaluate", response_model=ComplianceEvaluationResponse)
async def evaluate_compliance(request: BusinessContextRequest):
    """
    RAG Evaluation Engine:
    Identifies applicable legal, registration, licensing, and regulatory requirements
    according to business characteristics in Colombo District, Western Province.
    """
    if request.sector not in ["food", "clothing", "saloon", "vehicle"]:
        raise HTTPException(status_code=400, detail="Invalid sector. Supported: food, clothing, saloon, vehicle")

    # Mock evaluation logic grounded in Colombo District database
    return {
        "readiness_percentage": 14 if request.sector == "food" else 35,
        "rules_evaluated": 17,
        "rules_applied": 11,
        "completed_count": 1,
        "in_progress_count": 1,
        "next_best_action": {
            "title": "Taxpayer Identification Number (TIN)",
            "authority": "Inland Revenue Department (RAMIS)",
            "deadline_days": 16,
            "rationale": "Mandatory IRD registration before commercial bank account opening."
        },
        "citations": [
            {
                "act_title": "Business Names Statute No. 6 of 1990 (Western Province)",
                "sub_title": "Registration of business names in Colombo District",
                "jurisdiction": "Western Province",
                "enforcing_authority": "Dept of Business Names (WP)",
                "vector_score": 0.984,
                "legal_excerpt": "Every person or firm carrying on business under a business name in the Western Province must register it under this Statute within 14 days...",
                "ai_rationale": f"Business {request.business_name} operates as {request.entity_type} under trade name within {request.municipal_council}.",
                "penalty_risk": "Fines up to LKR 50,000 and invalidation of legal contracts executed under unregistered name.",
                "required_artifacts": ["Form A", "Grama Niladhari Certificate", "NIC Copy", "Assessment Tax Receipt"]
            }
        ]
    }
