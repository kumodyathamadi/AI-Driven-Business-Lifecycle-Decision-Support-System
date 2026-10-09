from typing import Dict, Any, List


class SMEStrategyGenerator:
    """
    Context-Aware Strategy Generation Engine.
    Generates structured, multi-objective alternative strategic options for an SME based on
    business profile, model feasibility prediction, and local SHAP explanation drivers.
    """

    def generate_strategies(
        self,
        cleaned_input: Dict[str, Any],
        feasibility_result: Dict[str, Any],
        shap_explanation: Dict[str, Any]
    ) -> List[Dict[str, Any]]:

        business_name = cleaned_input.get("business_name")
        stage = cleaned_input.get("business_stage", "New")
        category = cleaned_input.get("business_category", "Retail")
        capital = cleaned_input.get("available_capital_lkr", 500000.0)
        budget = cleaned_input.get("monthly_budget_lkr", 100000.0)
        customers = cleaned_input.get("expected_customers_per_day", 30)
        competition = cleaned_input.get("competition_level", "Moderate")
        prediction = feasibility_result.get("prediction", "Conditionally Feasible")

        display_name = business_name if business_name else category

        # Extract top negative drivers as constraint focus points
        negative_drivers = shap_explanation.get("top_negative_drivers", [])
        top_hurdle = negative_drivers[0]["feature"] if negative_drivers else "Capital & Working Reserve"

        strategies = []

        # Derive contextual operational & financial metrics from SME input
        loan = max(0.0, float(cleaned_input.get("loan_amount_lkr", 0.0)))
        runway_months = capital / max(budget, 1.0)
        loan_to_capital = loan / max(capital, 1.0)
        demand_score = float(cleaned_input.get("customer_demand_score", 50.0))
        experience_yrs = float(cleaned_input.get("entrepreneur_experience_years", 2.0))
        loc_score = float(cleaned_input.get("location_suitability_score", 3.0))
        avail_eq = float(cleaned_input.get("available_equipment_score", 3.0))
        req_eq = float(cleaned_input.get("required_equipment_score", 3.0))
        eq_ratio = avail_eq / max(1.0, req_eq)
        avail_staff = float(cleaned_input.get("available_staff_count", 2.0))
        req_staff = float(cleaned_input.get("required_staff_count", 2.0))
        staff_ratio = avail_staff / max(1.0, req_staff)
        supplier_score = float(cleaned_input.get("supplier_availability_score", 3.0))
        comp_str = str(cleaned_input.get("competition_level", "Moderate")).lower()
        comp_high = "high" in comp_str
        comp_low = "low" in comp_str
        district = str(cleaned_input.get("district", "Colombo"))
        is_metro = district.lower() in ("colombo", "gampaha", "kandy")

        def clamp(val: float) -> float:
            return round(float(min(9.8, max(1.0, val))), 2)

        strategies = []
        is_existing = "existing" in str(stage).lower()

        # Context-aware criteria calculations
        s1_capital = round(capital * 0.60, 2)
        s1_budget = round(budget * 0.75, 2)
        s1_fin = 8.5 + (0.3 if runway_months >= 3.5 else (-0.6 if runway_months < 1.5 else 0.0)) - (0.4 if loan_to_capital > 0.4 else 0.0)
        s1_feas = 9.0 + (0.3 if experience_yrs >= 4 else 0.0) - (0.5 if eq_ratio < 0.7 else 0.0)
        s1_dem = 7.0 + (0.5 if demand_score < 45 else (-0.4 if demand_score > 85 else 0.0))
        s1_risk = 3.0 + (0.4 if loan_to_capital > 0.5 else 0.0) + (0.3 if comp_high else (-0.3 if comp_low else 0.0))
        s1_eff = 8.8 + (0.3 if staff_ratio >= 1.0 else (-0.4 if staff_ratio < 0.7 else 0.0))

        s2_capital = round(capital * 1.10, 2)
        s2_budget = round(budget * 1.25, 2)
        s2_fin = 7.5 + (0.8 if runway_months >= 5.0 else (-1.2 if runway_months < 2.0 else 0.0)) - (0.5 if loan_to_capital > 0.3 else 0.0)
        s2_feas = 7.2 + (0.8 if experience_yrs >= 5 else (-0.8 if experience_yrs <= 1 else 0.0)) - (0.8 if staff_ratio < 0.8 else 0.0)
        s2_dem = 9.2 + (0.4 if demand_score >= 80 else (-1.0 if demand_score < 45 else 0.0)) + (0.3 if loc_score >= 4 else (-0.4 if loc_score <= 2 else 0.0))
        s2_risk = 6.5 + (0.8 if comp_high else (-0.6 if comp_low else 0.0)) + (0.6 if loan_to_capital > 0.3 else 0.0) - (0.4 if runway_months >= 5.0 else 0.0)
        s2_eff = 7.5 + (0.5 if demand_score >= 75 else (-0.7 if demand_score < 45 else 0.0))

        s3_capital = round(capital * 0.75, 2)
        s3_budget = round(budget * 0.85, 2)
        s3_fin = 8.2 + (0.3 if runway_months >= 3.0 else (-0.4 if runway_months < 1.5 else 0.0))
        s3_feas = 8.5 + (0.4 if supplier_score >= 4 else (-0.6 if supplier_score <= 2 else 0.0))
        s3_dem = 8.8 + (0.5 if comp_high else 0.0) + (0.3 if is_metro else 0.0)
        s3_risk = 4.2 + (0.5 if supplier_score <= 2 else (-0.3 if supplier_score >= 4 else 0.0))
        s3_eff = 8.5 + (0.3 if avail_eq >= 3 else (-0.4 if avail_eq < 2 else 0.0))

        s4_capital = round(capital * 0.90, 2)
        s4_budget = round(budget * 0.90, 2)
        s4_fin = 8.0 + (0.3 if runway_months >= 3.0 else (-0.5 if runway_months < 1.5 else 0.0))
        s4_feas = 8.0 + (0.5 if (avail_eq >= 4 and eq_ratio >= 1.0) else (-0.8 if avail_eq <= 2 else 0.0)) + (0.4 if experience_yrs >= 4 else (-0.5 if experience_yrs <= 1 else 0.0))
        s4_dem = 7.8 + (0.6 if comp_high else 0.0) + (0.4 if loc_score >= 4 else 0.0)
        s4_risk = 4.8 - (0.4 if comp_high else 0.0) + (0.6 if eq_ratio < 0.7 else 0.0)
        s4_eff = 8.0 + (0.4 if avail_eq >= 4 else (-0.4 if avail_eq < 3 else 0.0))

        if is_existing:
            # =====================================================================
            # EXISTING BUSINESS GROWTH STRATEGIES
            # =====================================================================
            # Strategy A: Phased Modular Expansion (Capital-Guarded)
            strategies.append({
                "strategy_id": "STRAT_01",
                "strategy_name": f"Phased Modular Expansion ({display_name})",
                "strategic_focus": "Capital Preservation & Phased Scale",
                "operational_approach": (
                    f"Execute a staged expansion for {display_name}, validating initial branch or service capacity "
                    f"with controlled layout to mitigate exposure around {top_hurdle} before committing further capital."
                ),
                "estimated_capital_required_lkr": s1_capital,
                "estimated_monthly_budget_lkr": s1_budget,
                "target_daily_customers": int(customers * 0.85),
                "implementation_complexity": "Low to Moderate",
                "expected_feasibility_impact": "Guarded Capital Outlay with Staged Expansion",
                "criteria_scores": {
                    "financial_viability": clamp(s1_fin),
                    "implementation_feasibility": clamp(s1_feas),
                    "market_demand_alignment": clamp(s1_dem),
                    "operational_risk": clamp(s1_risk),
                    "resource_efficiency": clamp(s1_eff)
                },
                "criteria_rationale": "Staged rollout preserves parent enterprise cash flow while proving expansion demand."
            })

            # Strategy B: Capacity & Scale Expansion
            strategies.append({
                "strategy_id": "STRAT_02",
                "strategy_name": f"Capacity & Scale Expansion ({display_name})",
                "strategic_focus": "High Volume & Capacity Scaling",
                "operational_approach": (
                    f"Rapidly expand customer-serving capacity, equipment throughput, and team size for {display_name} "
                    f"to capture unmet market demand across {district}."
                ),
                "estimated_capital_required_lkr": s2_capital,
                "estimated_monthly_budget_lkr": s2_budget,
                "target_daily_customers": int(customers * 1.3),
                "implementation_complexity": "Moderate to High",
                "expected_feasibility_impact": "Higher Commercial Throughput via Scaled Operations",
                "criteria_scores": {
                    "financial_viability": clamp(s2_fin),
                    "implementation_feasibility": clamp(s2_feas),
                    "market_demand_alignment": clamp(s2_dem),
                    "operational_risk": clamp(s2_risk),
                    "resource_efficiency": clamp(s2_eff)
                },
                "criteria_rationale": "Aggressive capacity scale maximizes market capture; requires structured operational oversight."
            })

            # Strategy C: Omnichannel & Shared-Facility Growth
            strategies.append({
                "strategy_id": "STRAT_03",
                "strategy_name": "Omnichannel & Shared-Facility Growth",
                "strategic_focus": "Channel Diversification & Shared Asset Efficiency",
                "operational_approach": (
                    f"Leverage {display_name}'s existing commercial infrastructure and supplier network through "
                    f"digital ordering, delivery dispatch, and multi-channel fulfillment without proportional fixed rent increases."
                ),
                "estimated_capital_required_lkr": s3_capital,
                "estimated_monthly_budget_lkr": s3_budget,
                "target_daily_customers": int(customers * 1.15),
                "implementation_complexity": "Moderate",
                "expected_feasibility_impact": "Asset-Light Revenue Growth Leveraging Core Hub",
                "criteria_scores": {
                    "financial_viability": clamp(s3_fin),
                    "implementation_feasibility": clamp(s3_feas),
                    "market_demand_alignment": clamp(s3_dem),
                    "operational_risk": clamp(s3_risk),
                    "resource_efficiency": clamp(s3_eff)
                },
                "criteria_rationale": "Shared facilities and digital fulfillment enhance margin without heavy duplicate overhead."
            })

            # Strategy D: Product / Service-Line Extension
            strategies.append({
                "strategy_id": "STRAT_04",
                "strategy_name": "Product / Service-Line Extension",
                "strategic_focus": "High Margin & Offering Diversification",
                "operational_approach": (
                    f"Introduce complementary, high-margin product offerings or specialized service packages within "
                    f"{display_name}'s current operations to drive higher spend per visit and cross-selling."
                ),
                "estimated_capital_required_lkr": s4_capital,
                "estimated_monthly_budget_lkr": s4_budget,
                "target_daily_customers": int(customers * 0.9),
                "implementation_complexity": "Low to Moderate",
                "expected_feasibility_impact": "Margin Expansion via Product Diversification",
                "criteria_scores": {
                    "financial_viability": clamp(s4_fin),
                    "implementation_feasibility": clamp(s4_feas),
                    "market_demand_alignment": clamp(s4_dem),
                    "operational_risk": clamp(s4_risk),
                    "resource_efficiency": clamp(s4_eff)
                },
                "criteria_rationale": "Adding high-margin product lines increases average ticket size without opening a separate location."
            })

        else:
            # =====================================================================
            # NEW STARTUP LAUNCH STRATEGIES (Preserved)
            # =====================================================================
            # Strategy 1: Lean Operational Bootstrapping Strategy
            strategies.append({
                "strategy_id": "STRAT_01",
                "strategy_name": f"Lean Bootstrapped Launch ({display_name})",
                "strategic_focus": "Capital Preservation & Lean Operations",
                "operational_approach": (
                    f"Optimize initial setup for {display_name} by operating lean. Focus on essential equipment "
                    f"and low-cost customer outreach to address the constraint around {top_hurdle}."
                ),
                "estimated_capital_required_lkr": s1_capital,
                "estimated_monthly_budget_lkr": s1_budget,
                "target_daily_customers": int(customers * 0.8),
                "implementation_complexity": "Low",
                "expected_feasibility_impact": "Capital Preservation and Leaner Launch",
                "criteria_scores": {
                    "financial_viability": clamp(s1_fin),
                    "implementation_feasibility": clamp(s1_feas),
                    "market_demand_alignment": clamp(s1_dem),
                    "operational_risk": clamp(s1_risk),
                    "resource_efficiency": clamp(s1_eff)
                },
                "criteria_rationale": "High financial cushion and lean execution mitigate early operational overhead."
            })

            # Strategy 2: Aggressive Market Penetration & Scale Strategy
            strategies.append({
                "strategy_id": "STRAT_02",
                "strategy_name": f"Market Expansion & Customer Acquisition ({display_name})",
                "strategic_focus": "Demand Generation & Volume Reach",
                "operational_approach": (
                    f"Allocate resources toward targeted local customer outreach and visibility for {display_name} to address {competition} "
                    f"competition and capture available market demand."
                ),
                "estimated_capital_required_lkr": s2_capital,
                "estimated_monthly_budget_lkr": s2_budget,
                "target_daily_customers": int(customers * 1.3),
                "implementation_complexity": "Moderate to High",
                "expected_feasibility_impact": "Higher Volume Throughput with Staged Outlays",
                "criteria_scores": {
                    "financial_viability": clamp(s2_fin),
                    "implementation_feasibility": clamp(s2_feas),
                    "market_demand_alignment": clamp(s2_dem),
                    "operational_risk": clamp(s2_risk),
                    "resource_efficiency": clamp(s2_eff)
                },
                "criteria_rationale": "High revenue throughput enabled by market scale; capital intensity requires staged commitments."
            })

            # Strategy 3: Digital & Direct-to-Consumer Partnership Strategy
            strategies.append({
                "strategy_id": "STRAT_03",
                "strategy_name": "Hybrid Digital & Local Delivery Model",
                "strategic_focus": "Digital Channel Expansion & Low Fixed Cost",
                "operational_approach": (
                    f"Combine focused physical setup with online ordering, social messaging channels, and local delivery "
                    f"coordination to extend customer reach in {district}."
                ),
                "estimated_capital_required_lkr": s3_capital,
                "estimated_monthly_budget_lkr": s3_budget,
                "target_daily_customers": int(customers * 1.1),
                "implementation_complexity": "Moderate",
                "expected_feasibility_impact": "Balanced Growth with Controlled Operating Expenditure",
                "criteria_scores": {
                    "financial_viability": clamp(s3_fin),
                    "implementation_feasibility": clamp(s3_feas),
                    "market_demand_alignment": clamp(s3_dem),
                    "operational_risk": clamp(s3_risk),
                    "resource_efficiency": clamp(s3_eff)
                },
                "criteria_rationale": "Omnichannel reach expands customer access while maintaining controlled operating overhead."
            })

            # Strategy 4: High Value Premium Niche Positioning
            strategies.append({
                "strategy_id": "STRAT_04",
                "strategy_name": "Premium Quality & Niche Differentiation",
                "strategic_focus": "High Margin & Customer Loyalty",
                "operational_approach": (
                    f"Focus on premium product quality, customized service, and distinctive branding to achieve higher margins "
                    f"without relying heavily on mass customer volume."
                ),
                "estimated_capital_required_lkr": s4_capital,
                "estimated_monthly_budget_lkr": s4_budget,
                "target_daily_customers": int(customers * 0.7),
                "implementation_complexity": "Moderate",
                "expected_feasibility_impact": "Margin Stability via Differentiated Pricing",
                "criteria_scores": {
                    "financial_viability": clamp(s4_fin),
                    "implementation_feasibility": clamp(s4_feas),
                    "market_demand_alignment": clamp(s4_dem),
                    "operational_risk": clamp(s4_risk),
                    "resource_efficiency": clamp(s4_eff)
                },
                "criteria_rationale": "Differentiated margins protect cash flow against customer volume fluctuations."
            })

        return strategies
