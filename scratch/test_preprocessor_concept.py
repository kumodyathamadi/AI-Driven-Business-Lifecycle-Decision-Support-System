import sys
import os
import json
import sqlite3

sys.path.insert(0, os.path.abspath("."))

from src.preprocessing.preprocessor import validate_and_format_input, InputValidationError
from src.orchestrator import analyze_business

with open('scratch/baseline_regression.json', 'r') as f:
    baseline = json.load(f)

conn = sqlite3.connect('data/component_1.db')
cur = conn.cursor()

regression_passed = True
for b in baseline:
    r_id = b['id']
    cur.execute('SELECT input_profile FROM analysis_records WHERE id = ?', (r_id,))
    inp = json.loads(cur.fetchone()[0])
    
    # Run full orchestrator
    res = analyze_business(inp)
    feas = res['feasibility_analysis']
    
    new_label = feas['predicted_label']
    new_conf = feas['confidence_score']
    new_probs = feas['probabilities']
    
    old_label = b['label']
    old_conf = b['confidence']
    old_probs = b['probabilities']
    
    label_match = (new_label == old_label)
    conf_match = abs(new_conf - old_conf) < 1e-4
    prob_match = all(abs(new_probs[k] - old_probs[k]) < 1e-4 for k in old_probs)
    
    status = "MATCH" if (label_match and conf_match and prob_match) else "MISMATCH"
    if status == "MISMATCH":
        regression_passed = False
        
    print(f"Case {r_id[:8]} | {status} | Old: {old_label} ({old_conf}) -> New: {new_label} ({new_conf}) | Probs match: {prob_match}")

print(f"\nALL REGRESSION TESTS PASSED: {regression_passed}")
assert regression_passed, "Regression test failed!"
