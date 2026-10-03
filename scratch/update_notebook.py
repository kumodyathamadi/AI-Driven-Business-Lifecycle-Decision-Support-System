import json
import os

NOTEBOOK_PATH = r"d:\SLIIT\Y4 S1\AI Driven Business  Lifecycle digital support system\AI-Driven-Business-Lifecycle-Decision-Support-System\notebooks\10_research_validation.ipynb"

with open(NOTEBOOK_PATH, "r", encoding="utf-8") as f:
    nb = json.load(f)

# Update cell 3 (Experiment 2: SHAP)
for cell in nb["cells"]:
    if cell.get("cell_type") == "code":
        src = "".join(cell.get("source", []))
        if "# Experiment 2: SHAP Explainability" in src:
            cell["outputs"] = []
            cell["execution_count"] = None
            cell["source"] = [
                "# Experiment 2: SHAP Explainability & Attribution Stability\n",
                "explainer = shap.TreeExplainer(rf_model)\n",
                "shap_values = explainer(X_test_dense)\n",
                "print('SHAP values computed for N =', len(X_test_dense))\n",
                "global_df = pd.read_csv('../reports/research_evaluation/experiment_02_shap_validation/shap_global_importance.csv')\n",
                "top_global = global_df.head(5)[['rank', 'feature_name', 'mean_abs_shap']]\n",
                "print('\\nTop 5 Global Influential Features:')\n",
                "print(top_global.to_string(index=False))"
            ]
        elif "# Experiment 3 & 4: Contextual Strategy Generation" in src:
            cell["outputs"] = []
            cell["execution_count"] = None
            cell["source"] = [
                "# Experiment 3 & 4: Contextual Strategy Generation & TOPSIS MCDM Sensitivity Analysis\n",
                "decision_matrix_df = pd.read_csv('../reports/research_evaluation/experiment_04_topsis_validation/topsis_decision_matrix.csv')\n",
                "sensitivity_df = pd.read_csv('../reports/research_evaluation/experiment_04_topsis_validation/topsis_sensitivity_results.csv')\n",
                "print('TOPSIS Decision Matrix Baseline:')\n",
                "print(decision_matrix_df[['strategy_id', 'topsis_score', 'baseline_rank']].to_string(index=False))\n",
                "print('\\nTOPSIS Sensitivity Analysis Across 4 Weight Scenarios:')\n",
                "print(sensitivity_df[['scenario', 'strategy_id', 'topsis_score', 'rank']].head(8).to_string(index=False))"
            ]
        elif "# Experiment 5 & 5B: What-If Scenario Validation" in src:
            cell["outputs"] = []
            cell["execution_count"] = None
            cell["source"] = [
                "# Experiment 5 & 5B: What-If Scenario Validation & Counterfactual Boundary Analysis\n",
                "what_if_df = pd.read_csv('../reports/research_evaluation/experiment_05_what_if_validation/what_if_scenarios.csv')\n",
                "cf_df = pd.read_csv('../reports/research_evaluation/experiment_05_what_if_validation/counterfactual_analysis.csv')\n",
                "print('What-If Scenario Simulation Results:')\n",
                "print(what_if_df[['case_id', 'scenario_id', 'base_prediction', 'new_prediction', 'feasibility_probability_delta']].to_string(index=False))\n",
                "print('\\nCounterfactual Minimum Change Boundary Analysis:')\n",
                "print(cf_df[['case_id', 'base_prediction', 'target_outcome', 'required_capital_lkr', 'additional_capital_needed_lkr']].to_string(index=False))"
            ]
        elif "# Experiment 6 & 6B: Personalized Business Plan Generation" in src:
            cell["outputs"] = []
            cell["execution_count"] = None
            cell["source"] = [
                "# Experiment 6 & 6B: Personalized Business Plan Generation & Pipeline End-to-End Consistency\n",
                "plan_matrix_df = pd.read_csv('../reports/research_evaluation/experiment_06_business_plan_validation/business_plan_validation_matrix.csv')\n",
                "checklist_df = pd.read_csv('../reports/research_evaluation/experiment_06_business_plan_validation/pipeline_consistency_checklist.csv')\n",
                "print('Business Plan Validation Matrix:')\n",
                "print(plan_matrix_df[['case_id', 'predicted_feasibility', 'all_5_sections_present', 'recommended_topsis_strategy', 'plan_validation_status']].to_string(index=False))\n",
                "print('\\nPipeline End-to-End Consistency Audit Checklist:')\n",
                "print(checklist_df[['pipeline_stage', 'validation_check', 'pass_status']].to_string(index=False))"
            ]

with open(NOTEBOOK_PATH, "w", encoding="utf-8") as f:
    json.dump(nb, f, indent=1)

print("Notebook 10_research_validation.ipynb updated successfully.")
