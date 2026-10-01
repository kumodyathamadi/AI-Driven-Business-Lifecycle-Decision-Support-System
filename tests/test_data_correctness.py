import sys
import os
import math
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.main import app
from src.preprocessing.preprocessor import validate_and_format_input, parse_clean_number, normalize_business_stage
from src.prediction.predictor import FeasibilityPredictor

client = TestClient(app)

def test_parse_clean_number():
    assert parse_clean_number("Rs. 500,000") == 500000.0
    assert parse_clean_number("500k") == 500000.0
    assert parse_clean_number("1.5 million") == 1500000.0
    assert parse_clean_number("2 lakh") == 200000.0
    assert parse_clean_number(float("nan"), default=100.0) == 100.0
    assert parse_clean_number(None, default=50.0) == 50.0
    assert parse_clean_number("", default=25.0) == 25.0
    assert parse_clean_number("invalid_string", default=10.0) == 10.0

def test_stage_canonicalization():
    c_stage, d_label, m_token = normalize_business_stage("New Startup")
    assert c_stage == "new_startup"
    assert d_label == "New Startup"
    assert m_token == "New"

    c_stage, d_label, m_token = normalize_business_stage("Existing Business")
    assert c_stage == "existing"
    assert d_label == "Existing Business"
    assert m_token == "Existing"

def test_model_feasibility_variance():
    """
    Verifies that the feasibility model outputs vary sensibly across differing inputs
    rather than returning a constant label.
    """
    fp = FeasibilityPredictor()
    
    # Case 1: Strong, high-capital, high-demand, low-competition business
    strong_input = {
        "business_stage": "new_startup",
        "business_category": "Grocery / Mini-Mart",
        "district": "Colombo",
        "available_capital_lkr": 3000000.0,
        "monthly_budget_lkr": 100000.0,
        "expected_price_lkr": 500.0,
        "expected_customers_per_day": 80,
        "competition_level": "Low",
        "customer_demand_score": 95,
        "location_suitability_score": 5,
        "available_staff_count": 4,
        "required_staff_count": 4,
        "available_equipment_score": 5,
        "required_equipment_score": 5,
        "supplier_availability_score": 5
    }
    df_strong, _ = validate_and_format_input(strong_input)
    res_strong = fp.predict_feasibility(df_strong)
    
    # Case 2: Underfunded, zero-experience, high-competition business
    weak_input = {
        "business_stage": "new_startup",
        "business_category": "Grocery / Mini-Mart",
        "district": "Colombo",
        "available_capital_lkr": 20000.0,
        "monthly_budget_lkr": 400000.0,
        "expected_price_lkr": 50.0,
        "expected_customers_per_day": 2,
        "competition_level": "High",
        "customer_demand_score": 10,
        "location_suitability_score": 1,
        "available_staff_count": 0,
        "required_staff_count": 5,
        "available_equipment_score": 1,
        "required_equipment_score": 5,
        "supplier_availability_score": 1
    }
    df_weak, _ = validate_and_format_input(weak_input)
    res_weak = fp.predict_feasibility(df_weak)
    
    print("\nStrong Business Outcome:", res_strong["prediction"], res_strong["probabilities"])
    print("Weak Business Outcome:", res_weak["prediction"], res_weak["probabilities"])
    
    # Feasible probability for strong business should significantly exceed weak business
    assert res_strong["probabilities"]["Feasible"] > res_weak["probabilities"]["Feasible"]
    assert res_weak["probabilities"]["Infeasible"] > res_strong["probabilities"]["Infeasible"]

def test_api_records_and_summary_counts():
    """
    Verifies that the records endpoint returns real non-zero total_count, no NaNs, and real summary KPIs.
    """
    res = client.get("/api/business/records?limit=5")
    assert res.status_code == 200
    data = res.json()
    assert data["total_count"] >= 1
    assert len(data["items"]) >= 1
    
    first = data["items"][0]
    assert not math.isnan(first["available_capital_lkr"])
    assert not math.isnan(first["expected_customers_per_day"])
    assert first["stage_label"] in ("New Startup", "Existing Business")
    assert first["predicted_label"] in ("Feasible", "Conditionally Feasible", "Infeasible")
    
    sum_res = client.get("/api/business/summary")
    assert sum_res.status_code == 200
    s_data = sum_res.json()
    assert s_data["total_analyses"] == data["total_count"]
    assert s_data["average_capital_lkr"] > 0
    assert s_data["top_sector"] != "Not provided"

if __name__ == "__main__":
    test_parse_clean_number()
    test_stage_canonicalization()
    test_model_feasibility_variance()
    test_api_records_and_summary_counts()
    print("\nALL DATA CORRECTNESS TESTS PASSED SUCCESSFULLY!")
