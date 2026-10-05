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

        # =====================================================================
        # Strategy 1: Lean Operational Bootstrapping Strategy
        # Focus: Risk Mitigation & Capital Preservation
        # =====================================================================
        s1_capital = round(capital * 0.60, 2)
        s1_budget = round(budget * 0.75, 2)

        # Context-aware criteria modulations for S1
        # Financial: High if capital runway covers lean budget, penalized if heavy existing debt
        s1_fin = 8.5 + (0.3 if runway_months >= 3.5 else (-0.6 if runway_months < 1.5 else 0.0)) - (0.4 if loan_to_capital > 0.4 else 0.0)
        # Feasibility: Naturally high for lean execution; adjusted for equipment readiness
        s1_feas = 9.0 + (0.3 if experience_yrs >= 4 else 0.0) - (0.5 if eq_ratio < 0.7 else 0.0)
        # Demand: Lean prioritizes core survival over mass reach; aligned well when demand is moderate
        s1_dem = 7.0 + (0.5 if demand_score < 45 else (-0.4 if demand_score > 85 else 0.0))
        # Operational Risk (Cost): Low fixed overhead. Low competition lowers risk, high debt raises risk
        s1_risk = 3.0 + (0.4 if loan_to_capital > 0.5 else 0.0) + (0.3 if comp_high else (-0.3 if comp_low else 0.0))
        # Resource Efficiency: High capital preservation
        s1_eff = 8.8 + (0.3 if staff_ratio >= 1.0 else (-0.4 if staff_ratio < 0.7 else 0.0))

        strategies.append({
            "strategy_id": "STRAT_01",
            "strategy_name": f"Lean Bootstrapped Launch ({display_name})",
            "strategic_focus": "Risk Mitigation & Capital Preservation",
            "operational_approach": (
                f"Optimize initial setup for {display_name} by operating lean. Focus on essential equipment "
                f"and low-cost marketing to mitigate constraint around {top_hurdle}."
            ),
            "estimated_capital_required_lkr": s1_capital,
            "estimated_monthly_budget_lkr": s1_budget,
            "target_daily_customers": int(customers * 0.8),
            "implementation_complexity": "Low",
            "expected_feasibility_impact": "High Risk Reduction (+15% Feasibility Probability)",
            "criteria_scores": {
                "financial_viability": clamp(s1_fin),
                "implementation_feasibility": clamp(s1_feas),
                "market_demand_alignment": clamp(s1_dem),
                "operational_risk": clamp(s1_risk),  # Cost criterion (lower is better)
                "resource_efficiency": clamp(s1_eff)
            },
            "criteria_rationale": "High financial cushion and lean execution mitigate early operational overhead."
        })

        # =====================================================================
        # Strategy 2: Aggressive Market Penetration & Scale Strategy
        # Focus: Demand Generation & High Volume
        # =====================================================================
        s2_capital = round(capital * 1.10, 2)
        s2_budget = round(budget * 1.25, 2)

        # Context-aware criteria modulations for S2
        # Financial: Highly sensitive to capital runway. Dangerous if runway < 2 months, viable if >= 5 months
        s2_fin = 7.5 + (0.8 if runway_months >= 5.0 else (-1.2 if runway_months < 2.0 else 0.0)) - (0.5 if loan_to_capital > 0.3 else 0.0)
        # Feasibility: Complex execution requires seasoned leadership and adequate staffing
        s2_feas = 7.2 + (0.8 if experience_yrs >= 5 else (-0.8 if experience_yrs <= 1 else 0.0)) - (0.8 if staff_ratio < 0.8 else 0.0)
        # Demand: Dominates when market demand and footfall index are strong
        s2_dem = 9.2 + (0.4 if demand_score >= 80 else (-1.0 if demand_score < 45 else 0.0)) + (0.3 if loc_score >= 4 else (-0.4 if loc_score <= 2 else 0.0))
        # Operational Risk (Cost): High burn rate. Severe risk if high competition + high loan
        s2_risk = 6.5 + (0.8 if comp_high else (-0.6 if comp_low else 0.0)) + (0.6 if loan_to_capital > 0.3 else 0.0) - (0.4 if runway_months >= 5.0 else 0.0)
        # Resource Efficiency: High throughput if demand is validated
        s2_eff = 7.5 + (0.5 if demand_score >= 75 else (-0.7 if demand_score < 45 else 0.0))

        strategies.append({
            "strategy_id": "STRAT_02",
            "strategy_name": f"Market Expansion & Customer Acquisition ({display_name})",
            "strategic_focus": "Demand Generation & High Volume",
            "operational_approach": (
                f"Invest heavily in targeted local promotions and location visibility for {display_name} to overcome {competition} "
                f"competition level and capture high market demand."
            ),
            "estimated_capital_required_lkr": s2_capital,
            "estimated_monthly_budget_lkr": s2_budget,
            "target_daily_customers": int(customers * 1.3),
            "implementation_complexity": "Moderate to High",
            "expected_feasibility_impact": "High Revenue Potential (Requires Micro-Loan buffer)",
            "criteria_scores": {
                "financial_viability": clamp(s2_fin),
                "implementation_feasibility": clamp(s2_feas),
                "market_demand_alignment": clamp(s2_dem),
                "operational_risk": clamp(s2_risk),  # Cost criterion
                "resource_efficiency": clamp(s2_eff)
            },
            "criteria_rationale": "High revenue throughput enabled by market scale; risk increases under capital constraints."
        })

        # =====================================================================
        # Strategy 3: Digital & Direct-to-Consumer Partnership Strategy
        # Focus: Digital Channel Expansion & Low Fixed Cost
        # =====================================================================
        s3_capital = round(capital * 0.75, 2)
        s3_budget = round(budget * 0.85, 2)

        # Context-aware criteria modulations for S3
        # Financial: Balanced asset-light model
        s3_fin = 8.2 + (0.3 if runway_months >= 3.0 else (-0.4 if runway_months < 1.5 else 0.0))
        # Feasibility: Fulfillment relies on suppliers & delivery partners
        s3_feas = 8.5 + (0.4 if supplier_score >= 4 else (-0.6 if supplier_score <= 2 else 0.0))
        # Demand: Highly effective when physical competition is high or in metro digital hubs
        s3_dem = 8.8 + (0.5 if comp_high else 0.0) + (0.3 if is_metro else 0.0)
        # Operational Risk (Cost): Low fixed rent, slightly higher logistics volatility if suppliers are weak
        s3_risk = 4.2 + (0.5 if supplier_score <= 2 else (-0.3 if supplier_score >= 4 else 0.0))
        # Resource Efficiency: Superior digital turnover per invested LKR
        s3_eff = 8.5 + (0.3 if avail_eq >= 3 else (-0.4 if avail_eq < 2 else 0.0))

        strategies.append({
            "strategy_id": "STRAT_03",
            "strategy_name": "Hybrid Digital & Local Delivery Model",
            "strategic_focus": "Digital Channel Expansion & Low Fixed Cost",
            "operational_approach": (
                f"Combine small physical footprint with online ordering, social commerce, and local delivery "
                f"partnerships to maximize customer reach in {district}."
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
                "operational_risk": clamp(s3_risk),  # Cost criterion
                "resource_efficiency": clamp(s3_eff)
            },
            "criteria_rationale": "Omnichannel reach bypasses physical retail congestion with controlled operating costs."
        })

        # =====================================================================
        # Strategy 4: High Value Premium Niche Positioning
        # Focus: High Margin & Customer Loyalty
        # =====================================================================
        s4_capital = round(capital * 0.90, 2)
        s4_budget = round(budget * 0.90, 2)

        # Context-aware criteria modulations for S4
        # Financial: High gross margins insulate against volume dips
        s4_fin = 8.0 + (0.3 if runway_months >= 3.0 else (-0.5 if runway_months < 1.5 else 0.0))
        # Feasibility: Demands high equipment readiness and entrepreneur craft
        s4_feas = 8.0 + (0.5 if (avail_eq >= 4 and eq_ratio >= 1.0) else (-0.8 if avail_eq <= 2 else 0.0)) + (0.4 if experience_yrs >= 4 else (-0.5 if experience_yrs <= 1 else 0.0))
        # Demand: Highly attractive in saturated markets to escape price erosion
        s4_dem = 7.8 + (0.6 if comp_high else 0.0) + (0.4 if loc_score >= 4 else 0.0)
        # Operational Risk (Cost): Insulated from price competition, but vulnerable if equipment is poor
        s4_risk = 4.8 - (0.4 if comp_high else 0.0) + (0.6 if eq_ratio < 0.7 else 0.0)
        # Resource Efficiency: High margin generated per transaction
        s4_eff = 8.0 + (0.4 if avail_eq >= 4 else (-0.4 if avail_eq < 3 else 0.0))

        strategies.append({
            "strategy_id": "STRAT_04",
            "strategy_name": "Premium Quality & Niche Differentiation",
            "strategic_focus": "High Margin & Customer Loyalty",
            "operational_approach": (
                f"Focus on premium product quality, customized service, and unique branding to achieve higher pricing "
                f"margins without depending on huge customer footfall."
            ),
            "estimated_capital_required_lkr": s4_capital,
            "estimated_monthly_budget_lkr": s4_budget,
            "target_daily_customers": int(customers * 0.7),
            "implementation_complexity": "Moderate",
            "expected_feasibility_impact": "High Profit Margin Stability",
            "criteria_scores": {
                "financial_viability": clamp(s4_fin),
                "implementation_feasibility": clamp(s4_feas),
                "market_demand_alignment": clamp(s4_dem),
                "operational_risk": clamp(s4_risk),  # Cost criteria
                "resource_efficiency": clamp(s4_eff)
            },
            "criteria_rationale": "High gross margin shielding against volume volatility; dependent on equipment readiness."
        })

        return strategies
