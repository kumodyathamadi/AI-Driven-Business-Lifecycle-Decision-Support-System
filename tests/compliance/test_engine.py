"""
Component 2 — Applicability Engine Tests

Four canonical test cases:
  1. Clearly APPLICABLE  — food bakery in Colombo, all facts known
  2. Clearly NOT_APPLICABLE — clothing retailer (OBL-003 food-only rules don't apply)
  3. UNKNOWN from missing facts — bakery but no local_authority known
  4. CONDITIONAL — all triggers true but exception unresolved

Design rule: these tests run purely on the deterministic engine.
No LLM, no network, no Qdrant, no external services.
"""

import sys
from pathlib import Path

import pytest

# Make sure backend is importable from repo root
REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from backend.app.compliance.schemas import (
    ApplicabilityStatus,
    BusinessProfile,
    EmployeeBand,
    LegalForm,
)
from backend.app.compliance.engine import evaluate_rule, analyze_compliance
from backend.app.compliance.rulebook_loader import get_obligations


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def bakery_colombo_full():
    """A well-specified CMC bakery — all facts known."""
    return BusinessProfile(
        business_type="bakery",
        activity=["food_preparation", "retail_sales"],
        local_authority="Colombo Municipal Council",
        handles_food=True,
        has_physical_premises=True,
        employee_band=EmployeeBand.MICRO,
        is_manufacturing=True,
        is_importing=False,
        legal_form=LegalForm.SOLE_PROPRIETORSHIP,
        jurisdiction="Western Province",
    )


@pytest.fixture
def clothing_retailer():
    """A clothing retailer — food-specific rules should NOT apply."""
    return BusinessProfile(
        business_type="clothing_retail",
        activity=["retail_sales"],
        local_authority="Colombo Municipal Council",
        handles_food=False,
        has_physical_premises=True,
        employee_band=EmployeeBand.MICRO,
        is_manufacturing=False,
        is_importing=False,
        legal_form=LegalForm.SOLE_PROPRIETORSHIP,
        jurisdiction="Western Province",
    )


@pytest.fixture
def bakery_missing_local_authority():
    """Bakery but local_authority is unknown — jurisdiction-dependent rules should be UNKNOWN."""
    return BusinessProfile(
        business_type="bakery",
        handles_food=True,
        has_physical_premises=True,
        is_manufacturing=False,
        # local_authority and jurisdiction are None → UNKNOWN
    )


@pytest.fixture
def restaurant_no_employees():
    """Restaurant with 0 employees — EPF/ETF rules NOT applicable."""
    return BusinessProfile(
        business_type="restaurant",
        activity=["food_preparation", "food_service"],
        local_authority="Colombo Municipal Council",
        handles_food=True,
        has_physical_premises=True,
        employee_band=EmployeeBand.NONE,  # 0 employees
        is_manufacturing=False,
        is_importing=False,
        legal_form=LegalForm.SOLE_PROPRIETORSHIP,
        jurisdiction="Western Province",
    )


# ---------------------------------------------------------------------------
# Test 1: Clearly APPLICABLE — bakery in Colombo, all facts provided
# ---------------------------------------------------------------------------

class TestApplicable:
    def test_food_hygiene_licence_applies(self, bakery_colombo_full):
        """OBL-003 (Food Hygiene Licence) must be APPLICABLE for a bakery handling food."""
        obligations = get_obligations()
        obl_003 = next(o for o in obligations if o.id == "OBL-003")
        status, trigger_facts, missing = evaluate_rule(obl_003, bakery_colombo_full)
        assert status in (ApplicabilityStatus.APPLICABLE, ApplicabilityStatus.CONDITIONAL), (
            f"Expected APPLICABLE or CONDITIONAL, got {status}. "
            f"trigger_facts={trigger_facts}, missing={missing}"
        )
        assert not missing, f"Should have no missing facts for a fully-specified profile: {missing}"

    def test_trade_licence_applies(self, bakery_colombo_full):
        """OBL-002 (CMC Trade Licence) must apply to a physical CMC bakery."""
        obligations = get_obligations()
        obl_002 = next(o for o in obligations if o.id == "OBL-002")
        status, trigger_facts, missing = evaluate_rule(obl_002, bakery_colombo_full)
        assert status in (ApplicabilityStatus.APPLICABLE, ApplicabilityStatus.CONDITIONAL)
        assert "local_authority" not in missing

    def test_full_analysis_has_no_errors(self, bakery_colombo_full):
        """Full analyze_compliance must return without raising and have obligations."""
        result = analyze_compliance(bakery_colombo_full)
        assert len(result.obligations) > 0
        assert result.summary is not None


# ---------------------------------------------------------------------------
# Test 2: Clearly NOT_APPLICABLE — clothing retailer for food-specific rules
# ---------------------------------------------------------------------------

class TestNotApplicable:
    def test_food_hygiene_not_for_clothing(self, clothing_retailer):
        """OBL-003 (Food Hygiene) must NOT apply to a clothing retailer who doesn't handle food."""
        obligations = get_obligations()
        obl_003 = next(o for o in obligations if o.id == "OBL-003")
        status, trigger_facts, missing = evaluate_rule(obl_003, clothing_retailer)
        assert status == ApplicabilityStatus.NOT_APPLICABLE, (
            f"Expected NOT_APPLICABLE, got {status}. trigger_facts={trigger_facts}"
        )

    def test_labelling_not_for_clothing_non_manufacturer(self, clothing_retailer):
        """OBL-007 (Food Labelling) must NOT apply to clothing retailer."""
        obligations = get_obligations()
        obl_007 = next(o for o in obligations if o.id == "OBL-007")
        status, trigger_facts, missing = evaluate_rule(obl_007, clothing_retailer)
        assert status == ApplicabilityStatus.NOT_APPLICABLE


# ---------------------------------------------------------------------------
# Test 3: UNKNOWN due to missing facts
# ---------------------------------------------------------------------------

class TestMissingFacts:
    def test_trade_licence_unknown_without_local_authority(self, bakery_missing_local_authority):
        """OBL-002 (CMC Trade Licence) requires local_authority. Without it → UNKNOWN."""
        obligations = get_obligations()
        obl_002 = next(o for o in obligations if o.id == "OBL-002")
        status, trigger_facts, missing = evaluate_rule(obl_002, bakery_missing_local_authority)
        assert status == ApplicabilityStatus.UNKNOWN, (
            f"Expected UNKNOWN, got {status}. missing={missing}"
        )
        assert "local_authority" in missing

    def test_missing_facts_never_false(self, bakery_missing_local_authority):
        """
        Robustness: a profile with all None fields must never produce NOT_APPLICABLE
        for an obligation that would apply to a bakery.
        """
        empty_bakery = BusinessProfile(business_type="bakery")
        obligations = get_obligations()
        obl_003 = next(o for o in obligations if o.id == "OBL-003")
        status, _, _ = evaluate_rule(obl_003, empty_bakery)
        # handles_food is None → UNKNOWN, not NOT_APPLICABLE
        assert status != ApplicabilityStatus.NOT_APPLICABLE, (
            "Missing facts must never become False (three-valued logic violation)"
        )


# ---------------------------------------------------------------------------
# Test 4: CONDITIONAL — exception unresolved
# ---------------------------------------------------------------------------

class TestConditional:
    def test_epf_conditional_when_family_exception_unresolved(self, bakery_colombo_full):
        """
        OBL-005 (EPF) has an unconfirmed exception for family-only businesses.
        A profile with employees should trigger CONDITIONAL (all triggers True,
        but exception unresolved).
        """
        obligations = get_obligations()
        obl_005 = next(o for o in obligations if o.id == "OBL-005")
        # Verify there is an unconfirmed exception
        unresolved = [e for e in obl_005.exceptions if not e.confirmed]
        if not unresolved:
            pytest.skip("OBL-005 has no unresolved exceptions — test not applicable")
        status, trigger_facts, missing = evaluate_rule(obl_005, bakery_colombo_full)
        assert status == ApplicabilityStatus.CONDITIONAL, (
            f"Expected CONDITIONAL (unresolved exception), got {status}. "
            f"trigger_facts={trigger_facts}"
        )

    def test_business_name_conditional_sole_trader_exception(self, bakery_colombo_full):
        """
        OBL-001 (Business Name Registration) has an unconfirmed exception for
        sole proprietors using their own name. Trigger facts are all True for
        bakery_colombo_full → expect CONDITIONAL.
        """
        obligations = get_obligations()
        obl_001 = next(o for o in obligations if o.id == "OBL-001")
        unresolved = [e for e in obl_001.exceptions if not e.confirmed]
        if not unresolved:
            pytest.skip("OBL-001 has no unresolved exceptions")
        status, trigger_facts, missing = evaluate_rule(obl_001, bakery_colombo_full)
        assert status == ApplicabilityStatus.CONDITIONAL, (
            f"Expected CONDITIONAL, got {status}. trigger_facts={trigger_facts}"
        )
