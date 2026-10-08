import pandas as pd
import numpy as np
from typing import Dict, Any, List, TypedDict
from src.preprocessing.preprocessor import validate_and_format_input


class ScenarioDefinition(TypedDict):
    scenario_id: str
    title: str
    modifications: Dict[str, Any]
    rationale: str


class WhatIfEngine:
    """
    Assumption-Aware What-If Scenario Simulation Engine.
    Passes modified user input scenarios through the exact same preprocessing and Random Forest model.
    """

    def __init__(self, predictor):
        self.predictor = predictor

    def simulate_scenarios(
        self,
        base_input_dict: Dict[str, Any],
        base_prediction: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Simulates predefined assumption shifts (e.g. +50% capital, +30% customers, +loan)
        and measures probability shifts against base state.
        """
        base_probs = base_prediction["probabilities"]
        base_feasible = float(base_probs.get("Feasible", 0.0))
        base_cond = float(base_probs.get("Conditionally Feasible", 0.0))
        base_infeas = float(base_probs.get("Infeasible", 0.0))
        # Viability Index = P(Feasible) + 0.5 * P(Conditionally Feasible)
        base_viability = round(base_feasible + 0.5 * base_cond, 4)

        scenarios_to_test: List[ScenarioDefinition] = [
            {
                "scenario_id": "SCEN_01",
                "title": "+50% Capital Injection",
                "modifications": {
                    "available_capital_lkr": base_input_dict.get("available_capital_lkr", 500000.0) * 1.5
                },
                "rationale": "Test sensitivity to additional equity or family capital injection."
            },
            {
                "scenario_id": "SCEN_02",
                "title": "Secured SME Working Loan (LKR 500,000)",
                "modifications": {
                    "loan_amount_lkr": base_input_dict.get("loan_amount_lkr", 0.0) + 500000.0,
                    "available_capital_lkr": base_input_dict.get("available_capital_lkr", 500000.0) + 500000.0
                },
                "rationale": "Assess impact of formal bank credit line."
            },
            {
                "scenario_id": "SCEN_03",
                "title": "+30% Customer Footfall Boost",
                "modifications": {
                    "expected_customers_per_day": int(base_input_dict.get("expected_customers_per_day", 30) * 1.3),
                    "customer_demand_score": min(100, int(base_input_dict.get("customer_demand_score", 60) + 15))
                },
                "rationale": "Simulate successful targeted marketing & footfall growth."
            },
            {
                "scenario_id": "SCEN_04",
                "title": "Optimized Operating Cost (-20% Monthly Budget)",
                "modifications": {
                    "monthly_budget_lkr": base_input_dict.get("monthly_budget_lkr", 100000.0) * 0.8
                },
                "rationale": "Test lean operational efficiency impact."
            }
        ]

        results = []
        for scen in scenarios_to_test:
            mod_input = base_input_dict.copy()
            mod_input.update(scen["modifications"])

            mod_df, mod_cleaned = validate_and_format_input(mod_input)
            mod_pred = self.predictor.predict_feasibility(mod_df)

            mod_probs = mod_pred["probabilities"]
            mod_feasible = float(mod_probs.get("Feasible", 0.0))
            mod_cond = float(mod_probs.get("Conditionally Feasible", 0.0))
            mod_infeas = float(mod_probs.get("Infeasible", 0.0))
            mod_viability = round(mod_feasible + 0.5 * mod_cond, 4)

            delta_feasible = round(mod_feasible - base_feasible, 4)
            delta_cond = round(mod_cond - base_cond, 4)
            delta_infeas = round(mod_infeas - base_infeas, 4)
            viability_delta = round(mod_viability - base_viability, 4)

            df_pp = round(delta_feasible * 100, 1)
            dc_pp = round(delta_cond * 100, 1)
            di_pp = round(delta_infeas * 100, 1)

            # Informative summary strictly separating class probability deltas (in percentage points) from viability index
            if abs(df_pp) < 0.05 and abs(dc_pp) < 0.05 and abs(di_pp) < 0.05:
                shifts_summary = (
                    f"Class probability shifts: Feasible (+0.0 pp), Conditional (+0.0 pp), Infeasible (+0.0 pp). "
                    f"Note: The simulated parameter adjustment remains within the same decision partition of the trained model (no measurable shift under current decision tree branches)."
                )
            else:
                shifts_summary = (
                    f"Class probability shifts: Feasible ({df_pp:+.1f} percentage points), "
                    f"Conditional ({dc_pp:+.1f} percentage points), "
                    f"Infeasible ({di_pp:+.1f} percentage points)."
                )

            results.append({
                "scenario_id": scen["scenario_id"],
                "title": scen["title"],
                "modifications": scen["modifications"],
                "rationale": scen["rationale"],
                "new_prediction": mod_pred["prediction"],
                "new_probabilities": mod_probs,
                "probability_deltas": {
                    "Feasible": delta_feasible,
                    "Conditionally Feasible": delta_cond,
                    "Infeasible": delta_infeas
                },
                "probability_deltas_pp": {
                    "Feasible": df_pp,
                    "Conditionally Feasible": dc_pp,
                    "Infeasible": di_pp
                },
                "class_shifts_percentage_points": {
                    "Feasible": f"{df_pp:+.1f} percentage points",
                    "Conditionally Feasible": f"{dc_pp:+.1f} percentage points",
                    "Infeasible": f"{di_pp:+.1f} percentage points"
                },
                "tree_partition_note": "The simulated parameter adjustment remains within the same decision partition of the trained model (no measurable shift under current decision tree branches)." if (abs(df_pp) < 0.05 and abs(dc_pp) < 0.05 and abs(di_pp) < 0.05) else None,
                "base_viability_score": base_viability,
                "new_viability_score": mod_viability,
                "viability_delta": viability_delta,
                "feasibility_probability_delta": delta_feasible,
                "impact_summary": shifts_summary
            })

        return results


class CounterfactualSearchEngine:
    """
    Finds minimum boundary adjustments in available capital, monthly budget, or expected customer demand
    required to elevate a business state into a 'Feasible' outcome.
    """

    def __init__(self, predictor):
        self.predictor = predictor

    def find_counterfactual(self, base_input_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Grid searches minimum capital increment required to reach Feasible probability >= 0.50.
        Uses adaptive step size and vectorized batch inference for instant sub-second response.
        """
        base_capital = max(0.0, float(base_input_dict.get("available_capital_lkr", 500000.0)))
        max_multiplier = 4.0
        max_capital = max(base_capital * max_multiplier, base_capital + 1000000.0)
        total_range = max_capital - base_capital

        # Cap search at 20 steps with minimum step size of 50,000 LKR
        max_steps = 20
        step = max(50000.0, total_range / max_steps)

        candidate_capitals = []
        current_cap = base_capital
        while current_cap <= max_capital and len(candidate_capitals) <= max_steps:
            candidate_capitals.append(round(current_cap, 2))
            current_cap += step

        if not candidate_capitals:
            candidate_capitals = [base_capital]

        base_df, _ = validate_and_format_input(base_input_dict)
        batch_df = pd.concat([base_df] * len(candidate_capitals), ignore_index=True)
        batch_df["available_capital_lkr"] = candidate_capitals

        processed_input = self.predictor.preprocessor.transform(batch_df)
        if hasattr(processed_input, "toarray"):
            dense_input = processed_input.toarray()
        else:
            dense_input = np.array(processed_input)

        preds = self.predictor.model.predict(dense_input)
        probs = self.predictor.model.predict_proba(dense_input)

        feas_class_idx = self.predictor.classes.index("Feasible") if "Feasible" in self.predictor.classes else 0

        target_found = False
        optimal_capital = base_capital
        best_prob = 0.0
        best_pred = "Infeasible"

        for i, cap_val in enumerate(candidate_capitals):
            pred_label = str(preds[i])
            feas_prob = float(probs[i][feas_class_idx])

            if pred_label == "Feasible" or feas_prob >= 0.50:
                target_found = True
                optimal_capital = cap_val
                best_prob = feas_prob
                best_pred = pred_label
                break

        if target_found:
            capital_needed = optimal_capital - base_capital
            return {
                "counterfactual_found": True,
                "target_outcome": best_pred,
                "target_feasible_probability": round(best_prob, 4),
                "required_capital_lkr": round(optimal_capital, 2),
                "additional_capital_needed_lkr": round(capital_needed, 2),
                "recommendation": (
                    f"Capital boundary search under tested scenario assumptions indicates that an available capital allocation of "
                    f"LKR {optimal_capital:,.2f} (+LKR {capital_needed:,.2f}) shifts the predicted feasibility to '{best_pred}' "
                    f"(Predicted Class Probability: {best_prob:.1%}). Note: This single-variable boundary search evaluates parameter sensitivity "
                    f"under fixed model assumptions and does not represent a guaranteed commercial optimum."
                )
            }
        else:
            return {
                "counterfactual_found": False,
                "target_outcome": "Feasible",
                "recommendation": (
                    "Capital boundary search under tested scenario assumptions did not identify a single-variable capital threshold "
                    "to shift the outcome to Feasible within the tested range. Multiple operational dimensions (customer demand, location suitability, staffing) "
                    "require joint enhancement."
                )
            }
