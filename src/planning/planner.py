from typing import Dict, Any, List


class PersonalizedPlanGenerator:
    """
    Personalized Business & Growth Plan Generator.
    Synthesizes ML feasibility prediction, SHAP explanation drivers, TOPSIS strategy ranking,
    and What-If scenarios into a tailored 5-section strategic plan.
    """

    def generate_plan(
        self,
        cleaned_input: Dict[str, Any],
        feasibility_result: Dict[str, Any],
        shap_explanation: Dict[str, Any],
        topsis_result: Dict[str, Any],
        what_if_result: List[Dict[str, Any]],
        counterfactual: Dict[str, Any],
        selected_strategy_id: Any = None
    ) -> Dict[str, Any]:

        business_name = cleaned_input.get("business_name")
        category = cleaned_input.get("business_category", "Grocery / Mini-Mart")
        stage = cleaned_input.get("business_stage", "New")
        district = cleaned_input.get("district", "Colombo")
        capital = cleaned_input.get("available_capital_lkr", 500000.0)
        budget = cleaned_input.get("monthly_budget_lkr", 100000.0)
        prediction = feasibility_result.get("prediction", "Conditionally Feasible")

        display_name = business_name if business_name else f"Your {category}"
        summary_intro = (
            f"Evaluation for {business_name} ({stage} {category}) located in {district}, Sri Lanka."
            if business_name else
            f"Evaluation for a {stage} {category} located in {district}, Sri Lanka."
        )

        # Resolve active strategy (either user-selected or TOPSIS Rank #1 default)
        ranked_strategies = topsis_result.get("ranked_strategies", [])
        active_strategy = None
        if selected_strategy_id and ranked_strategies:
            for s in ranked_strategies:
                if s.get("strategy_id") == selected_strategy_id or s.get("strategy_name") == selected_strategy_id:
                    active_strategy = s
                    break

        if not active_strategy:
            if ranked_strategies:
                active_strategy = ranked_strategies[0]
            else:
                active_strategy = {
                    "strategy_id": "STRAT_01",
                    "strategy_name": topsis_result.get("top_recommended_strategy", "Lean Bootstrapped Launch"),
                    "strategic_focus": "Risk Mitigation & Capital Preservation",
                    "estimated_capital_required_lkr": capital,
                    "estimated_monthly_budget_lkr": budget,
                    "target_daily_customers": cleaned_input.get("expected_customers_per_day", 30),
                    "expected_feasibility_impact": "Operational Feasibility"
                }

        top_strategy_name = active_strategy.get("strategy_name", "Lean Bootstrapped Launch")
        strat_capital = active_strategy.get("estimated_capital_required_lkr", capital)
        strat_budget = active_strategy.get("estimated_monthly_budget_lkr", budget)
        strat_customers = active_strategy.get("target_daily_customers", cleaned_input.get("expected_customers_per_day", 30))
        strat_focus = active_strategy.get("strategic_focus", "Operational Execution")

        top_positive = [d["feature"] for d in shap_explanation.get("top_positive_drivers", [])[:3]]
        top_hurdles = [d["feature"] for d in shap_explanation.get("top_negative_drivers", [])[:3]]

        # Section 1: Executive Business Overview
        section_1 = {
            "title": "1. Executive Business Overview",
            "business_name": business_name,
            "business_summary": (
                f"{summary_intro} "
                f"The AI feasibility decision support system predicts an outcome of '{prediction}' "
                f"with {feasibility_result.get('confidence_score', 0.88):.1%} model confidence."
            ),
            "key_enablers": top_positive if top_positive else ["Local Location Suitability"],
            "key_risk_hurdles": top_hurdles if top_hurdles else ["Working Capital Reserve"],
            "recommended_primary_strategy": top_strategy_name,
            "strategic_focus": strat_focus,
            "strategy_id": active_strategy.get("strategy_id", "STRAT_01"),
            "is_user_selected": bool(selected_strategy_id and selected_strategy_id != topsis_result.get("top_recommended_id"))
        }

        # Section 2: Operational & Resource Plan
        section_2 = {
            "title": "2. Operational Setup & Resource Management",
            "staffing_requirements": (
                f"Available Staff: {cleaned_input.get('available_staff_count', 2)} | "
                f"Required Staff: {cleaned_input.get('required_staff_count', 2)}. "
                f"{'Staff capacity is balanced.' if cleaned_input.get('available_staff_count', 2) >= cleaned_input.get('required_staff_count', 2) else 'Additional hiring required before launch.'}"
            ),
            "equipment_readiness": f"Equipment Score: {cleaned_input.get('available_equipment_score', 3)}/5 vs Required: {cleaned_input.get('required_equipment_score', 3)}/5.",
            "supplier_logistics": f"Supplier Availability Score: {cleaned_input.get('supplier_availability_score', 4)}/5 ({district} SME Supply Network)."
        }

        # Section 3: Marketing & Customer Demand Strategy
        section_3 = {
            "title": "3. Marketing & Customer Acquisition",
            "demand_score": f"Customer Demand Index: {cleaned_input.get('customer_demand_score', 60)}/100",
            "target_daily_customers": strat_customers,
            "pricing_structure": f"LKR {cleaned_input.get('expected_price_lkr', 500):,.2f} per unit / service",
            "promotional_tactics": [
                f"Deploy {strat_focus.lower()} campaigns tailored for {display_name} in {district}.",
                f"Digital social media presence targeting local consumers in {district}.",
                "Introductory pricing and bundled customer loyalty promotions."
            ]
        }

        # Section 4: Financial Planning & Working Capital
        section_4 = {
            "title": "4. Financial Planning & Capital Requirements",
            "available_capital_lkr": strat_capital,
            "monthly_operating_budget_lkr": strat_budget,
            "requested_loan_lkr": cleaned_input.get("loan_amount_lkr", 0.0),
            "capital_runway_months": round(strat_capital / max(strat_budget, 1.0), 1),
            "counterfactual_guidance": counterfactual.get("recommendation", "Financial reserve is adequate.")
        }

        # Section 5: Action Roadmap (0-3m, 3-12m, 1y+)
        strat_id = active_strategy.get("strategy_id")
        if strat_id == "STRAT_01":
            strategy_milestone = f"Implement Lean Bootstrapped setup for {display_name}: secure essential low-cost tools and conserve cash reserves."
        elif strat_id == "STRAT_02":
            strategy_milestone = f"Execute Market Expansion for {display_name}: secure micro-loan buffer, erect high-visibility signage, and launch high-volume promotions."
        elif strat_id == "STRAT_03":
            strategy_milestone = f"Launch Hybrid Digital model for {display_name}: establish social ordering channels and finalize local delivery agreements in {district}."
        elif strat_id == "STRAT_04":
            strategy_milestone = f"Establish Premium Quality differentiation for {display_name}: curate luxury customer experience, finalize premium branding, and launch VIP packages."
        else:
            strategy_milestone = f"Implement core operational strategy: {top_strategy_name}."

        phase_2_list = [
            "Track monthly cash flow against LKR {:,.2f} operating budget.".format(strat_budget),
            f"Evaluate customer footfall and aim to hit target daily volume of {strat_customers} customers.",
            "Review What-If scenario results for potential capital expansion."
        ]
        phase_3_list = [
            f"Assess secondary location feasibility in neighboring {district} commercial hubs.",
            "Re-run AI Feasibility pipeline with actual 12-month operational metrics."
        ]

        section_5 = {
            "title": "5. Time-Phased Action Roadmap",
            "phase_1_immediate_0_to_3_months": [
                f"Register '{business_name}' and obtain local municipal authority permits." if business_name else "Register business name and obtain local municipal authority permits.",
                strategy_milestone,
                "Procure initial inventory and establish supplier agreement terms.",
                f"Launch targeted local campaign for {display_name}."
            ],
            "phase_2_growth_3_to_12_months": phase_2_list,
            "phase_2_stabilization_3_to_12_months": phase_2_list,
            "phase_3_scale_1_year_plus": phase_3_list,
            "phase_3_growth_1_year_plus": phase_3_list
        }

        return {
            "plan_metadata": {
                "business_category": category,
                "district": district,
                "feasibility_label": prediction
            },
            "executive_overview": section_1,
            "operational_plan": section_2,
            "marketing_plan": section_3,
            "financial_plan": section_4,
            "action_roadmap": section_5
        }
