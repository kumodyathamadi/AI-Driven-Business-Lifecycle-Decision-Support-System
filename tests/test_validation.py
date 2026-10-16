import sys
import os
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.main import app
from src.preprocessing.preprocessor import validate_and_format_input, InputValidationError

client = TestClient(app)

VALID_SME_PAYLOAD = {
    "business_name": "Saman Super Fresh",
    "business_stage": "New Startup",
    "business_category": "Bakery / Food / Grocery",
    "business_model": "Direct Retail / Service",
    "district": "Colombo",
    "location_type": "Suburban Commercial Hub",
    "available_capital_lkr": 1500000.0,
    "loan_amount_lkr": 500000.0,
    "monthly_budget_lkr": 250000.0,
    "initial_inventory_cost_lkr": 400000.0,
    "expected_price_lkr": 450.0,
    "expected_customers_per_day": 65,
    "competition_level": "Moderate",
    "customer_demand_score": 75,
    "entrepreneur_experience_years": 4,
    "available_staff_count": 3,
    "location_suitability_score": 4,
    "available_equipment_score": 3,
    "required_equipment_score": 3,
    "supplier_availability_score": 4,
    "expected_operating_days_per_month": 26
}


def test_valid_sme_profile_accepted():
    """Verify that a standard realistic Sri Lankan SME payload is accepted."""
    res = client.post("/api/business/analyze", json=VALID_SME_PAYLOAD)
    assert res.status_code == 200, f"Expected 200 for valid SME payload, got {res.status_code}: {res.text}"
    data = res.json()
    assert "feasibility_analysis" in data
    assert data["feasibility_analysis"]["predicted_label"] in ["Feasible", "Not Feasible", "Conditionally Feasible", "Infeasible"]


def test_unrealistic_capital_rejected():
    """Verify that astronomical/unrealistic capital (e.g. 2.5 quintillion or 150M) is rejected."""
    # Quintillion outlier
    payload_quintillion = dict(VALID_SME_PAYLOAD)
    payload_quintillion["available_capital_lkr"] = 2500000000000000000.0
    res = client.post("/api/business/analyze", json=payload_quintillion)
    assert res.status_code == 422, f"Expected 422 for quintillion capital, got {res.status_code}"

    # Excess over SME ceiling (150 Million LKR)
    payload_excess = dict(VALID_SME_PAYLOAD)
    payload_excess["available_capital_lkr"] = 150000000.0
    res = client.post("/api/business/analyze", json=payload_excess)
    assert res.status_code == 422, f"Expected 422 for 150M capital, got {res.status_code}"

    # Below viable minimum (LKR 500)
    payload_sub_min = dict(VALID_SME_PAYLOAD)
    payload_sub_min["available_capital_lkr"] = 500.0
    res = client.post("/api/business/analyze", json=payload_sub_min)
    assert res.status_code == 422, f"Expected 422 for LKR 500 capital, got {res.status_code}"


def test_unrealistic_customers_rejected():
    """Verify customer counts outside 1 to 2,500 patrons/day are rejected."""
    # 50,000 customers/day
    payload_excess = dict(VALID_SME_PAYLOAD)
    payload_excess["expected_customers_per_day"] = 50000
    res = client.post("/api/business/analyze", json=payload_excess)
    assert res.status_code == 422

    # 0 customers/day
    payload_zero = dict(VALID_SME_PAYLOAD)
    payload_zero["expected_customers_per_day"] = 0
    res = client.post("/api/business/analyze", json=payload_zero)
    assert res.status_code == 422


def test_unrealistic_experience_and_staff_rejected():
    """Verify unrealistic experience (120 years) and staff (500 staff) are rejected."""
    payload_exp = dict(VALID_SME_PAYLOAD)
    payload_exp["entrepreneur_experience_years"] = 120
    res = client.post("/api/business/analyze", json=payload_exp)
    assert res.status_code == 422

    payload_staff = dict(VALID_SME_PAYLOAD)
    payload_staff["available_staff_count"] = 500
    res = client.post("/api/business/analyze", json=payload_staff)
    assert res.status_code == 422


def test_unrealistic_pricing_rejected():
    """Verify customer ticket/price outside 10 to 250,000 LKR is rejected."""
    payload_high = dict(VALID_SME_PAYLOAD)
    payload_high["expected_price_lkr"] = 5000000.0
    res = client.post("/api/business/analyze", json=payload_high)
    assert res.status_code == 422

    payload_low = dict(VALID_SME_PAYLOAD)
    payload_low["expected_price_lkr"] = 2.0
    res = client.post("/api/business/analyze", json=payload_low)
    assert res.status_code == 422


def test_preprocessor_bounds_validation():
    """Verify ML Preprocessor raises InputValidationError on unrealistic raw inputs."""
    # Capital exceeds max ceiling
    bad_input = dict(VALID_SME_PAYLOAD)
    bad_input["available_capital_lkr"] = 500000000.0
    threw = False
    try:
        validate_and_format_input(bad_input)
    except InputValidationError as e:
        threw = True
        assert "Available Capital" in str(e) or "available_capital_lkr" in str(e)
    assert threw, "Preprocessor should raise InputValidationError for 500M capital"

    # Customers exceed max ceiling
    bad_input2 = dict(VALID_SME_PAYLOAD)
    bad_input2["expected_customers_per_day"] = 10000
    threw = False
    try:
        validate_and_format_input(bad_input2)
    except InputValidationError as e:
        threw = True
        assert "customer" in str(e).lower() or "expected_customers_per_day" in str(e)
    assert threw, "Preprocessor should raise InputValidationError for 10000 customers"


if __name__ == "__main__":
    print("Running validation tests...")
    test_valid_sme_profile_accepted()
    print("[OK] Valid SME profile accepted")
    test_unrealistic_capital_rejected()
    print("[OK] Unrealistic capital rejected (422)")
    test_unrealistic_customers_rejected()
    print("[OK] Unrealistic customers rejected (422)")
    test_unrealistic_experience_and_staff_rejected()
    print("[OK] Unrealistic experience/staff rejected (422)")
    test_unrealistic_pricing_rejected()
    print("[OK] Unrealistic pricing rejected (422)")
    test_preprocessor_bounds_validation()
    print("[OK] Preprocessor InputValidationError confirmed")
    print("ALL VALIDATION TESTS PASSED SUCCESSFULLY!")
