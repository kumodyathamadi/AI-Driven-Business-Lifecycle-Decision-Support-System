import sqlite3
import json

conn = sqlite3.connect('data/component_1.db')
cursor = conn.cursor()
cursor.execute("SELECT structured_profile FROM analysis_records WHERE id='0dfaabf6-5ebd-406e-880a-e8065d7496e8'")
row = cursor.fetchone()
data = json.loads(row[0])

print("FEASIBILITY:")
print("  prediction:", data.get('feasibility_analysis', {}).get('predicted_label'))
print("  confidence_score:", data.get('feasibility_analysis', {}).get('confidence_score'))
print("  probabilities:", data.get('feasibility_analysis', {}).get('probabilities'))

print("\nWHAT-IF SCENARIOS:")
for sc in data.get('scenario_analysis', {}).get('what_if_simulations', []):
    print("  Title:", sc.get('title'))
    print("    modifications:", sc.get('modifications'))
    print("    new_prediction:", sc.get('new_prediction'))
    print("    viability_delta:", sc.get('viability_delta'))
    print("    feasibility_delta:", sc.get('feasibility_probability_delta'))
    print("    probability_deltas:", sc.get('probability_deltas'))
    print("    impact_summary:", sc.get('impact_summary'))

print("\nCOUNTERFACTUAL:")
print(" ", data.get('scenario_analysis', {}).get('counterfactual_boundary'))

print("\nSTRATEGIES:")
for st in data.get('strategic_recommendations', {}).get('candidate_strategies', []):
    print(" ", st.get('strategy_id'), st.get('strategy_name'), "cap:", st.get('estimated_capital_required_lkr'), "budget:", st.get('estimated_monthly_budget_lkr'), "cust:", st.get('target_daily_customers'))

print("\nTOPSIS:")
print(" ", data.get('strategic_recommendations', {}).get('topsis_ranking'))
