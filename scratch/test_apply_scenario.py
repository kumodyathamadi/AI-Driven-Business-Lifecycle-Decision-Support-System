import urllib.request
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def post_json(endpoint, data):
    req = urllib.request.Request(
        f"{BASE_URL}{endpoint}",
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.getcode(), json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"HTTPError {e.code}: {e.read().decode('utf-8')}")
        raise e

def get_json(endpoint):
    req = urllib.request.Request(f"{BASE_URL}{endpoint}")
    with urllib.request.urlopen(req) as resp:
        return resp.getcode(), json.loads(resp.read().decode("utf-8"))

def test_apply_scenario():
    record_id = "fc90eed7-0254-44ac-a4cf-3265a63614bc"
    print(f"\n[Step 1] Using record ID: {record_id}")
    
    code, rec_data = get_json(f"/api/business/record/{record_id}")
    profile = rec_data.get("structured_profile", rec_data)
    orig_input = profile.get("business_input", {})
    orig_capital = orig_input.get("available_capital_lkr")
    orig_budget = orig_input.get("monthly_budget_lkr")
    print(f"Baseline Capital: LKR {orig_capital:,.2f}")
    print(f"Baseline Budget:  LKR {orig_budget:,.2f}")
    
    # 2. Test non-persistent simulation endpoint
    print("\n[Step 2] Testing non-persistent simulation endpoint (capital = 820,000)...")
    sim_input = dict(orig_input)
    sim_input["available_capital_lkr"] = 820000.0
    sim_code, sim_data = post_json(f"/api/business/simulate?baseline_record_id={record_id}", sim_input)
    assert sim_code == 200, "Simulation endpoint failed"
    print(f"Simulation Viability Index: {sim_data.get('financial_metrics', {}).get('viability_index')}")
    
    # Verify DB record is untouched
    _, check_data = get_json(f"/api/business/record/{record_id}")
    check_profile = check_data.get("structured_profile", check_data)
    assert check_profile["business_input"]["available_capital_lkr"] == orig_capital
    print(" Verified: Non-persistent simulation did NOT alter DB record!")

    # 3. Test Apply Scenario Endpoint
    print("\n[Step 3] Testing apply-scenario endpoint (applying capital = 820,000)...")
    new_capital_val = 820000.0
    apply_payload = {
        "available_capital_lkr": new_capital_val,
        "monthly_budget_lkr": orig_budget,
        "expected_customers_per_day": orig_input.get("expected_customers_per_day", 40),
        "expected_price_lkr": orig_input.get("expected_price_lkr", 350.0)
    }
    apply_code, applied_data = post_json(f"/api/business/record/{record_id}/apply-scenario", apply_payload)
    print(f"Apply scenario status: {apply_code}")
    assert apply_code == 200, f"Failed to apply scenario: {applied_data}"
    
    new_profile = applied_data.get("structured_profile", {})
    new_capital = new_profile.get("business_input", {}).get("available_capital_lkr")
    print(f"New Capital in Response Profile: LKR {new_capital:,.2f}")
    assert new_capital == new_capital_val, f"Expected {new_capital_val}, got {new_capital}"
    
    # Verify Business Plan regeneration
    bp = new_profile.get("personalized_business_plan") or new_profile.get("business_plan", {})
    print(f"Regenerated Business Plan sections: {list(bp.keys())}")
    fin_text = bp.get("financial_analysis", "")
    print(f"Financial analysis text preview: {fin_text[:180]}...")
    
    # 4. Verify DB persistence
    _, rec_data2 = get_json(f"/api/business/record/{record_id}")
    persisted_profile = rec_data2.get("structured_profile", rec_data2)
    persisted_capital = persisted_profile.get("business_input", {}).get("available_capital_lkr")
    assert persisted_capital == new_capital_val
    print(f" Verified: Database record permanently updated to LKR {persisted_capital:,.2f}!")

    # 5. Restore original capital so the record remains in original state
    print("\n[Step 5] Restoring original capital...")
    restore_payload = {
        "available_capital_lkr": orig_capital,
        "monthly_budget_lkr": orig_budget,
        "expected_customers_per_day": orig_input.get("expected_customers_per_day", 40),
        "expected_price_lkr": orig_input.get("expected_price_lkr", 350.0)
    }
    post_json(f"/api/business/record/{record_id}/apply-scenario", restore_payload)
    print(f" Restored baseline capital to LKR {orig_capital:,.2f}")
    
    print("\n ALL SCENARIO EXPLORER END-TO-END TESTS PASSED PERFECTLY!")
    return True

if __name__ == "__main__":
    test_apply_scenario()
