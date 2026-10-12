"""
Component 2 — Deterministic Three-Valued Applicability Engine

Core design principle
---------------------
  The LLM may only *phrase* results; it must NEVER decide applicability.
  All applicability decisions are made by this module using pure Python
  logic against the obligation rulebook and the BusinessProfile.

Three-valued logic
------------------
  For every trigger condition in applies_if:
    - If the profile field is None  → the fact is UNKNOWN (never False)
    - If the condition is met       → True
    - If the condition is not met   → False

  Verdict rules:
    - ANY False trigger fact        → NOT_APPLICABLE
    - ANY UNKNOWN trigger fact      → UNKNOWN  (unless already NOT_APPLICABLE)
    - ALL True trigger facts        → check exceptions
      - Any unconfirmed exception   → CONDITIONAL
      - Otherwise                   → APPLICABLE
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from backend.app.compliance.schemas import (
    ApplicabilityStatus,
    BusinessProfile,
    ComplianceAnalysisResponse,
    EvidenceChunk,
    ObligationResult,
    ObligationRule,
)
from backend.app.compliance.rulebook_loader import get_obligations
from backend.app.compliance.source_registry import get_source_url_and_date


# ---------------------------------------------------------------------------
# Three-valued single-condition evaluators
# ---------------------------------------------------------------------------

TriVal = Optional[bool]  # True | False | None (unknown)


def _eval_business_type(
    required_types: List[str], profile: BusinessProfile
) -> Tuple[TriVal, Optional[str]]:
    """Returns (verdict, missing_field_name_or_None)."""
    if profile.business_type is None:
        return None, "business_type"
    return profile.business_type.lower() in [t.lower() for t in required_types], None


def _eval_bool_field(
    field_name: str, required_value: bool, profile: BusinessProfile
) -> Tuple[TriVal, Optional[str]]:
    val = getattr(profile, field_name, None)
    if val is None:
        return None, field_name
    return val == required_value, None


def _eval_jurisdiction(
    allowed: List[str], profile: BusinessProfile
) -> Tuple[TriVal, Optional[str]]:
    if profile.jurisdiction is None and profile.local_authority is None:
        return None, "jurisdiction"
    check_value = profile.jurisdiction or profile.local_authority or ""
    return any(a.lower() in check_value.lower() or check_value.lower() in a.lower() for a in allowed), None


def _eval_local_authority(
    allowed: List[str], profile: BusinessProfile
) -> Tuple[TriVal, Optional[str]]:
    if profile.local_authority is None:
        return None, "local_authority"
    return any(a.lower() in profile.local_authority.lower() or profile.local_authority.lower() in a.lower() for a in allowed), None


def _eval_employee_band_min(
    min_employees: int, profile: BusinessProfile
) -> Tuple[TriVal, Optional[str]]:
    """True if the band implies at least min_employees employees."""
    if profile.employee_band is None:
        return None, "employee_band"
    band_val = str(profile.employee_band)
    if band_val == "0":
        return min_employees == 0, None
    # Any non-zero band means ≥1 employee
    return True, None


def _eval_legal_form(
    allowed_forms: List[str], profile: BusinessProfile
) -> Tuple[TriVal, Optional[str]]:
    if profile.legal_form is None:
        return None, "legal_form"
    return str(profile.legal_form).lower() in [f.lower() for f in allowed_forms], None


# ---------------------------------------------------------------------------
# Rule evaluator
# ---------------------------------------------------------------------------

def evaluate_rule(
    rule: ObligationRule, profile: BusinessProfile
) -> Tuple[ApplicabilityStatus, Dict[str, Any], List[str]]:
    """
    Evaluate a single obligation rule against a BusinessProfile.

    Returns
    -------
    status : ApplicabilityStatus
    trigger_facts : dict mapping fact-name → evaluated value
    missing_facts : list of profile field names that are None and needed
    """
    applies_if = rule.applies_if
    trigger_facts: Dict[str, Any] = {}
    missing_facts: List[str] = []

    has_false = False
    has_unknown = False

    def _record(cond_name: str, verdict: TriVal, missing: Optional[str]) -> None:
        nonlocal has_false, has_unknown
        trigger_facts[cond_name] = verdict
        if verdict is False:
            has_false = True
        elif verdict is None:
            has_unknown = True
            if missing and missing not in missing_facts:
                missing_facts.append(missing)

    # --- business_type ---
    if "business_type" in applies_if:
        v, m = _eval_business_type(applies_if["business_type"], profile)
        _record("business_type", v, m)

    # --- boolean flags ---
    for bool_field in ("handles_food", "has_physical_premises", "is_manufacturing", "is_importing"):
        if bool_field in applies_if:
            required = applies_if[bool_field]
            if isinstance(required, bool):
                v, m = _eval_bool_field(bool_field, required, profile)
                _record(bool_field, v, m)

    # --- jurisdiction_matches ---
    if "jurisdiction_matches" in applies_if:
        v, m = _eval_jurisdiction(applies_if["jurisdiction_matches"], profile)
        _record("jurisdiction", v, m)

    # --- local_authority_matches ---
    if "local_authority_matches" in applies_if:
        v, m = _eval_local_authority(applies_if["local_authority_matches"], profile)
        _record("local_authority", v, m)

    # --- employee_band_min ---
    if "employee_band_min" in applies_if:
        v, m = _eval_employee_band_min(applies_if["employee_band_min"], profile)
        _record("employee_band", v, m)

    # --- legal_form_matches ---
    if "legal_form_matches" in applies_if:
        v, m = _eval_legal_form(applies_if["legal_form_matches"], profile)
        _record("legal_form", v, m)

    # --- Determine verdict ---
    if has_false:
        return ApplicabilityStatus.NOT_APPLICABLE, trigger_facts, missing_facts
    if has_unknown:
        return ApplicabilityStatus.UNKNOWN, trigger_facts, missing_facts

    # All conditions True — check exceptions
    unresolved_exceptions = [
        exc for exc in rule.exceptions if not exc.confirmed
    ]
    if unresolved_exceptions:
        return ApplicabilityStatus.CONDITIONAL, trigger_facts, missing_facts

    return ApplicabilityStatus.APPLICABLE, trigger_facts, missing_facts


# ---------------------------------------------------------------------------
# Full analysis
# ---------------------------------------------------------------------------

def analyze_compliance(profile: BusinessProfile) -> ComplianceAnalysisResponse:
    """
    Run the deterministic three-valued applicability engine over all
    obligations in the rulebook and return a structured result.

    The LLM must NOT be called here. All logic is deterministic.
    """
    obligations = get_obligations()
    results: List[ObligationResult] = []

    for rule in obligations:
        status, trigger_facts, missing_facts = evaluate_rule(rule, profile)

        # Build evidence from rulebook (source-grounded, not hallucinated)
        evidence_chunks: List[EvidenceChunk] = []
        if rule.evidence.source_id:
            url, retrieved_date = get_source_url_and_date(rule.evidence.source_id)
            evidence_chunks.append(
                EvidenceChunk(
                    source_id=rule.evidence.source_id,
                    page=rule.evidence.page,
                    quote=rule.evidence.quote or "[Quote pending verification — reviewer_status: draft]",
                    url=url,
                    retrieved_date=retrieved_date,
                    authority=rule.authority,
                )
            )

        results.append(
            ObligationResult(
                id=rule.id,
                name=rule.name,
                status=status,
                trigger_facts=trigger_facts,
                missing_facts=missing_facts,
                authority=rule.authority,
                jurisdiction=rule.jurisdiction,
                required_action=rule.required_action.strip(),
                evidence=evidence_chunks,
            )
        )

    # Summary counts
    summary = {s.value: 0 for s in ApplicabilityStatus}
    for r in results:
        summary[r.status.value] += 1

    return ComplianceAnalysisResponse(
        business_profile=profile,
        summary=summary,
        obligations=results,
    )
