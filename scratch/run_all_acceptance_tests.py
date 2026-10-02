import sys
import os
import json
import hashlib
import sqlite3
import pandas as pd
import numpy as np

# Add project root to sys.path
PROJECT_ROOT = r"d:\SLIIT\Y4 S1\AI Driven Business  Lifecycle digital support system\AI-Driven-Business-Lifecycle-Decision-Support-System"
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from src.preprocessing.preprocessor import validate_and_format_input, InputValidationError
from src.prediction.predictor import FeasibilityPredictor
from src.intake.extractor import extract_business_info

test_results = {}

print("=" * 70)
print("RUNNING COMPONENT 1 ACCEPTANCE TEST SUITE")
print("=" * 70)

# TEST 8 FIRST: Model Artifact Integrity
print("\n--- Test 8: Model Artifact Integrity Check ---")
rf_path = os.path.join(PROJECT_ROOT, "models", "feasibility_model", "random_forest.joblib")
with open(rf_path, "rb") as f:
    rf_hash = hashlib.md5(f.read()).hexdigest()

expected_hash = "2e9f336825cb2b6dd31d3b944e1b7f41"
print(f"Random Forest joblib MD5: {rf_hash}")
print(f"Expected MD5:            {expected_hash}")
if rf_hash == expected_hash:
    print("PASS: random_forest.joblib is 100% UNTOUCHED.")
    test_results["Test 8 - Model Artifact"] = "PASS"
else:
    print("FAIL: random_forest.joblib hash mismatch!")
    test_results["Test 8 - Model Artifact"] = "FAIL"

# TEST 7: Database Integrity Check
print("\n--- Test 7: Historical Database Integrity Check ---")
db_path = os.path.join(PROJECT_ROOT, "data", "component_1.db")
bak_path = os.path.join(PROJECT_ROOT, "data", "component_1.db.bak")

conn_orig = sqlite3.connect(bak_path)
conn_curr = sqlite3.connect(db_path)

c_orig = conn_orig.cursor()
c_curr = conn_curr.cursor()

c_orig.execute("SELECT count(*) FROM analysis_records")
count_orig = c_orig.fetchone()[0]

c_curr.execute("SELECT count(*) FROM analysis_records")
count_curr = c_curr.fetchone()[0]

print(f"Record count in backup DB:  {count_orig}")
print(f"Record count in current DB: {count_curr}")

# Check content of last 5 records
c_orig.execute("SELECT id, business_category, feasibility_label, confidence_score FROM analysis_records ORDER BY id DESC LIMIT 5")
rows_orig = c_orig.fetchall()

c_curr.execute("SELECT id, business_category, feasibility_label, confidence_score FROM analysis_records ORDER BY id DESC LIMIT 5")
rows_curr = c_curr.fetchall()

conn_orig.close()
conn_curr.close()

if count_orig == count_curr and rows_orig == rows_curr:
    print("PASS: Historical database records are preserved and unchanged.")
    test_results["Test 7 - Database Records"] = "PASS"
else:
    print("FAIL: Database records differ from backup!")
    test_results["Test 7 - Database Records"] = "FAIL"

# TEST 1: Existing complete input regression test
print("\n--- Test 1: Existing Complete Input Regression ---")
baseline_file = os.path.join(PROJECT_ROOT, "scratch", "baseline_regression.json")
with open(baseline_file, "r") as f:
    baseline_data = json.load(f)

from src.orchestrator import analyze_business

conn = sqlite3.connect(db_path)
cur = conn.cursor()

test1_passed = True
regression_table = []
sample_inputs = {}

for case in baseline_data:
    cid = case["id"]
    cur.execute("SELECT input_profile FROM analysis_records WHERE id = ?", (cid,))
    row = cur.fetchone()
    inp = json.loads(row[0]) if isinstance(row[0], str) else row[0]
    sample_inputs[cid] = inp
    
    # Process through orchestrator (preprocessor -> RF -> SHAP -> Strategy -> TOPSIS -> Plan)
    new_res = analyze_business(inp)
    feas = new_res["feasibility_analysis"]
    new_label = feas["predicted_label"]
    new_conf = feas["confidence_score"]
    new_probs = feas["probabilities"]
    
    same_label = new_label == case["label"]
    same_conf = abs(new_conf - case["confidence"]) < 1e-5
    
    probs_match = True
    for k, v in case["probabilities"].items():
        if abs(new_probs.get(k, 0) - v) > 1e-4:
            probs_match = False
            break
            
    if not (same_label and same_conf and probs_match):
        test1_passed = False
        
    status = "EXACT MATCH" if (same_label and same_conf and probs_match) else "MISMATCH"
    regression_table.append({
        "case_id": cid[:8],
        "category": inp.get("business_category", "Unknown")[:15],
        "old_label": case["label"],
        "new_label": new_label,
        "old_conf": f"{case['confidence']:.4f}",
        "new_conf": f"{new_conf:.4f}",
        "status": status
    })

conn.close()

print(f"{'Case ID':<10} | {'Category':<15} | {'Old Label':<22} | {'New Label':<22} | {'Old Conf':<8} | {'New Conf':<8} | {'Status'}")
print("-" * 100)
for r in regression_table:
    print(f"{r['case_id']:<10} | {r['category']:<15} | {r['old_label']:<22} | {r['new_label']:<22} | {r['old_conf']:<8} | {r['new_conf']:<8} | {r['status']}")

if test1_passed:
    print("PASS: All complete baseline inputs produced 100% IDENTICAL predictions and probabilities.")
    test_results["Test 1 - Complete Input Regression"] = "PASS"
else:
    print("FAIL: Output difference detected in baseline regression.")
    test_results["Test 1 - Complete Input Regression"] = "FAIL"

# Get a base sample input for Tests 2-5
first_cid = baseline_data[0]["id"]
base_input = sample_inputs[first_cid]

# TEST 2: Missing expected_customers_per_day
print("\n--- Test 2: Missing Required Field (expected_customers_per_day) ---")
sample_input = dict(base_input)
sample_input["expected_customers_per_day"] = None

test2_passed = False
try:
    validate_and_format_input(sample_input)
    print("FAIL: Expected InputValidationError was NOT raised!")
except InputValidationError as e:
    err_msg = str(e)
    if "Expected Customers / Day" in err_msg:
        print(f"PASS: InputValidationError raised correctly: {err_msg}")
        test2_passed = True
    else:
        print(f"FAIL: Error raised but missing expected field name: {err_msg}")

test_results["Test 2 - Missing expected_customers_per_day"] = "PASS" if test2_passed else "FAIL"

# TEST 3: Missing monthly_budget_lkr
print("\n--- Test 3: Missing Monthly Operating Budget (no silent 100,000 default) ---")
sample_input = dict(base_input)
sample_input["monthly_budget_lkr"] = None

test3_passed = False
try:
    validate_and_format_input(sample_input)
    print("FAIL: Expected InputValidationError was NOT raised!")
except InputValidationError as e:
    err_msg = str(e)
    if "Monthly Operating Budget" in err_msg:
        print(f"PASS: InputValidationError raised correctly: {err_msg}")
        test3_passed = True
    else:
        print(f"FAIL: Error raised but missing expected field name: {err_msg}")

test_results["Test 3 - Missing monthly_budget_lkr"] = "PASS" if test3_passed else "FAIL"

# TEST 4: Multiple missing fields
print("\n--- Test 4: Multiple Missing Fields Validation ---")
sample_input = dict(base_input)
sample_input["monthly_budget_lkr"] = None
sample_input["expected_customers_per_day"] = ""
sample_input["entrepreneur_experience_years"] = None

test4_passed = False
try:
    validate_and_format_input(sample_input)
    print("FAIL: Expected InputValidationError was NOT raised!")
except InputValidationError as e:
    err_msg = str(e)
    has_budget = "Monthly Operating Budget" in err_msg
    has_cust = "Expected Customers / Day" in err_msg
    has_exp = "Entrepreneur Experience" in err_msg
    if has_budget and has_cust and has_exp:
        print(f"PASS: All 3 missing fields correctly reported in error:\n  '{err_msg}'")
        test4_passed = True
    else:
        print(f"FAIL: Some missing fields were not reported: {err_msg}")

test_results["Test 4 - Multiple Missing Fields"] = "PASS" if test4_passed else "FAIL"

# TEST 5: Zero is valid
print("\n--- Test 5: Zero is Valid (e.g. loan_amount_lkr = 0, entrepreneur_experience_years = 0, available_staff_count = 0) ---")
sample_input = dict(base_input)
sample_input["loan_amount_lkr"] = 0
sample_input["entrepreneur_experience_years"] = 0
sample_input["available_staff_count"] = 0

test5_passed = False
try:
    formatted_df, cleaned_dict = validate_and_format_input(sample_input)
    assert cleaned_dict["loan_amount_lkr"] == 0.0
    assert cleaned_dict["entrepreneur_experience_years"] == 0.0
    assert cleaned_dict["available_staff_count"] == 0.0
    res = analyze_business(sample_input)
    assert "feasibility_analysis" in res
    assert "predicted_label" in res["feasibility_analysis"]
    print("PASS: 0 and 0.0 values successfully accepted and processed as valid numeric numbers, NOT missing.")
    test5_passed = True
except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"FAIL: Zero was rejected or raised exception: {e}")

test_results["Test 5 - Zero is Valid"] = "PASS" if test5_passed else "FAIL"

# TEST 6: AI Intake Incomplete Information
print("\n--- Test 6: AI Intake Incomplete Extraction Test ---")
test_phrase = "I want to start a bakery in Homagama with LKR 1 million."
intake_res = extract_business_info(test_phrase)

fields = intake_res["extracted_fields"]
cat_val = fields["business_category"]["value"]
dist_val = fields["district"]["value"]
cap_val = fields["available_capital_lkr"]["value"]
cust_val = fields["expected_customers_per_day"]["value"]
bud_val = fields["monthly_budget_lkr"]["value"]

print(f"Input: '{test_phrase}'")
print(f"Extracted Category:          {cat_val} (Status: {fields['business_category']['status']})")
print(f"Extracted District:          {dist_val} (Status: {fields['district']['status']})")
print(f"Extracted Available Capital: {cap_val} (Status: {fields['available_capital_lkr']['status']})")
print(f"Expected Customers / Day:    {cust_val} (Status: {fields['expected_customers_per_day']['status']})")
print(f"Monthly Operating Budget:    {bud_val} (Status: {fields['monthly_budget_lkr']['status']})")

test6_passed = False
if (cat_val == "Bakery / Food / Grocery" and 
    dist_val == "Colombo" and 
    cap_val == 1000000.0 and 
    cust_val is None and 
    bud_val is None and 
    fields["expected_customers_per_day"]["status"] == "missing" and 
    fields["monthly_budget_lkr"]["status"] == "missing"):
    print("PASS: AI Intake extracted explicitly stated facts and left unmentioned required fields as None/missing.")
    test6_passed = True
else:
    print("FAIL: AI Intake unexpectedly populated unmentioned fields!")

test_results["Test 6 - AI Intake Incomplete"] = "PASS" if test6_passed else "FAIL"

print("\n" + "=" * 70)
print("FINAL TEST SUMMARY")
print("=" * 70)
all_pass = True
for test_name, status in test_results.items():
    print(f"{test_name:<45}: {status}")
    if status != "PASS":
        all_pass = False

print("-" * 70)
print(f"OVERALL STATUS: {'SAFE TO CONTINUE (ALL TESTS PASSED)' if all_pass else 'NOT SAFE — INVESTIGATION REQUIRED'}")
print("=" * 70)
