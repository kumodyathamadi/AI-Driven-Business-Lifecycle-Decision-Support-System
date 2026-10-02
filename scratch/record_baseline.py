import sqlite3
import json
import os
import sys

# Ensure root directory in sys.path
sys.path.insert(0, os.path.abspath("."))

from src.orchestrator import analyze_business

conn = sqlite3.connect('data/component_1.db')
cur = conn.cursor()
cur.execute('SELECT id, input_profile FROM analysis_records WHERE is_deleted = 0 or is_deleted is null LIMIT 5')
rows = cur.fetchall()

baseline = []
for r_id, inp_raw in rows:
    inp = json.loads(inp_raw) if isinstance(inp_raw, str) else inp_raw
    res = analyze_business(inp)
    feas = res['feasibility_analysis']
    label = feas['predicted_label']
    conf = feas['confidence_score']
    probs = feas['probabilities']
    top_pos = res['explainability']['positive_drivers'][0]['feature'] if res['explainability']['positive_drivers'] else None
    top_strat = res['strategic_recommendations']['candidate_strategies'][0]['strategy_name'] if res['strategic_recommendations']['candidate_strategies'] else None
    
    baseline.append({
        'id': r_id,
        'label': label,
        'confidence': conf,
        'probabilities': probs,
        'top_driver': top_pos,
        'top_strategy': top_strat
    })
    print(f"Case {r_id[:8]} | Label: {label} | Conf: {conf} | Probs: {probs}")

os.makedirs('scratch', exist_ok=True)
with open('scratch/baseline_regression.json', 'w') as f:
    json.dump(baseline, f, indent=2)
print("Saved baseline to scratch/baseline_regression.json")
