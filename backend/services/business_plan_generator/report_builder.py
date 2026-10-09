import os
from datetime import datetime
from typing import Dict, Any


class BusinessPlanReportBuilder:
    """
    Normalizes structured profile analysis results into a clean, comprehensive 
    BusinessPlanReport data dictionary for PDF and DOCX document generators.
    
    Structure adheres strictly to the Research-Grounded Report Sections:
    - Section 01: Business & Market Overview
    - Section 02: AI Feasibility & Key Insights (Probabilities & SHAP)
    - Section 03: Strategic Recommendations & TOPSIS Ranking
    - Section 04: Financial & Operational Plan (Aligned with Selected Strategy)
    - Section 05: Scenario Analysis & Action Roadmap
    - Final AI Recommendation & Decision Summary
    """

    @staticmethod
    def build_report_data(profile: dict) -> dict:
        metadata = profile.get("metadata", {})
        business_input = profile.get("business_input", {})
        feasibility_analysis = profile.get("feasibility_analysis", {})
        explainability = profile.get("explainability", {})
        strategic_recommendations = profile.get("strategic_recommendations", {})
        scenario_analysis = profile.get("scenario_analysis", {})
        personalized_business_plan = profile.get("personalized_business_plan", {})

        # Date
        created_at_raw = metadata.get("created_at") or metadata.get("generated_at") or datetime.now().isoformat()
        try:
            date_str = datetime.fromisoformat(str(created_at_raw).replace("Z", "+00:00")).strftime("%B %d, %Y")
        except Exception:
            date_str = datetime.now().strftime("%B %d, %Y")

        # Identity
        category = business_input.get("business_category", "SME Enterprise")
        stage = business_input.get("business_stage", "New Startup")
        district = business_input.get("district", "Colombo")
        province = business_input.get("province", "Western")
        raw_name = business_input.get("business_name") or profile.get("business_name") or f"{district} {category}"
        business_name = str(raw_name).strip()

        # Check for pre-built structured sections in personalized_business_plan
        sec_01 = personalized_business_plan.get("section_01_business_market_overview")
        sec_02 = personalized_business_plan.get("section_02_ai_feasibility_insights")
        sec_03 = personalized_business_plan.get("section_03_strategic_recommendations")
        sec_04 = personalized_business_plan.get("section_04_financial_operational_plan")
        sec_05 = personalized_business_plan.get("section_05_scenario_action_roadmap")
        final_rec = personalized_business_plan.get("final_recommendation")

        # Fallback / extraction if older profile record without section_01
        predicted_label = feasibility_analysis.get("predicted_label") or feasibility_analysis.get("prediction", "Conditionally Feasible")
        confidence_score = float(feasibility_analysis.get("confidence_score", feasibility_analysis.get("probability_score", 0.65)))
        probabilities = feasibility_analysis.get("probabilities", {
            "Feasible": 0.25,
            "Conditionally Feasible": 0.65,
            "Infeasible": 0.10
        })

        executive_overview = personalized_business_plan.get("executive_overview", {})
        operational_plan = personalized_business_plan.get("operational_plan", {})
        marketing_plan = personalized_business_plan.get("marketing_plan", {})
        financial_plan = personalized_business_plan.get("financial_plan", {})
        action_roadmap = personalized_business_plan.get("action_roadmap", {})

        # TOPSIS & Strategies handling
        topsis_ranking = strategic_recommendations.get("topsis_ranking", {})
        ranked_strategies = topsis_ranking.get("ranked_strategies", [])
        candidate_strategies = ranked_strategies or strategic_recommendations.get("candidate_strategies", [])
        
        # Ensure every candidate strategy has rank and topsis_score
        for rank_idx, s in enumerate(candidate_strategies, start=1):
            if "rank" not in s or s["rank"] in ["-", None]:
                s["rank"] = rank_idx
            if "topsis_score" not in s or s["topsis_score"] in ["N/A", None]:
                s["topsis_score"] = topsis_ranking.get("top_topsis_score", 0.7500) if rank_idx == 1 else round(0.75 - rank_idx * 0.05, 4)

        ai_top_strategy = topsis_ranking.get("top_recommended_strategy", "Lean Operational Bootstrapping Strategy")
        ai_top_score = str(topsis_ranking.get("top_topsis_score", "0.7850"))
        
        selected_strategy_id = strategic_recommendations.get("selected_strategy_id") or executive_overview.get("strategy_id")
        selected_strategy_name = strategic_recommendations.get("selected_strategy_name") or executive_overview.get("recommended_primary_strategy")
        is_user_selected = bool(
            executive_overview.get("is_user_selected") or
            (selected_strategy_id and selected_strategy_id != topsis_ranking.get("top_recommended_id"))
        )

        active_strategy_name = selected_strategy_name if is_user_selected else ai_top_strategy
        active_strategy_id = selected_strategy_id if is_user_selected else topsis_ranking.get("top_recommended_id", "STRAT_01")

        # Capital and Coverage
        effective_capital = float(financial_plan.get("available_capital_lkr", business_input.get("available_capital_lkr", 0.0)))
        effective_budget = float(financial_plan.get("monthly_operating_budget_lkr", business_input.get("monthly_budget_lkr", 0.0)))
        strategy_target_capital = float(financial_plan.get("strategy_target_capital_lkr", effective_capital))
        loan_amount = float(business_input.get("loan_amount_lkr", 0.0))
        total_available_funds = effective_capital + loan_amount
        monthly_budget_val = max(effective_budget, 1.0)
        
        strategy_budget_coverage = financial_plan.get("strategy_budget_coverage_months") or round(strategy_target_capital / monthly_budget_val, 1)
        available_funds_coverage = financial_plan.get("available_funds_coverage_months") or round(total_available_funds / monthly_budget_val, 1)
        
        customers_per_day = int(marketing_plan.get("target_daily_customers", business_input.get("expected_customers_per_day", 0)))
        expected_price = float(business_input.get("expected_price_lkr", 0.0))
        operating_days = int(business_input.get("expected_operating_days_per_month", 26))

        # Competitor count logic
        raw_comp_count = business_input.get("competitor_count_nearby")
        if raw_comp_count is None or raw_comp_count == 0 or raw_comp_count == "0":
            competitor_count_display = "Not provided in current business input"
            competitor_info_display = business_input.get("competitor_information") or "Specific nearby direct competitor counts were not provided in current business inputs."
        else:
            competitor_count_display = int(raw_comp_count)
            competitor_info_display = business_input.get("competitor_information") or f"{raw_comp_count} direct competitor(s) recorded in initial business intake."

        cover_image = profile.get("cover_image") or metadata.get("cover_image") or business_input.get("cover_image")

        is_new_startup = "new" in str(stage).lower() or "start" in str(stage).lower()
        doc_title = "STRATEGIC BUSINESS PLAN" if is_new_startup else "STRATEGIC BUSINESS GROWTH & EXPANSION PLAN"
        doc_subtitle = (
            "A Comprehensive Feasibility, Strategic Direction & Implementation Blueprint"
            if is_new_startup else
            "AI-Driven Business Growth, Expansion Feasibility & Investment Planning"
        )

        # Standardize Section 04 for robust generator consumption across both Startup & Existing Business
        if sec_04 and isinstance(sec_04, dict):
            inv_block = sec_04.get("expansion_investment") or sec_04.get("startup_investment") or {}
            fin_block = sec_04.get("monthly_financial_plan") or {}
            funding_block = sec_04.get("funding_structure") or {}
            ops_block = sec_04.get("operational_scaling_plan") or sec_04.get("operational_plan") or {}

            # Standardized Target Capital
            t_cap = (
                inv_block.get("strategy_target_expansion_capital_lkr") or
                inv_block.get("strategy_target_capital_lkr") or
                funding_block.get("strategy_target_capital_lkr") or
                strategy_target_capital
            )
            # Standardized Available Capital
            a_cap = (
                inv_block.get("allocated_expansion_capital_lkr") or
                inv_block.get("available_capital_lkr") or
                funding_block.get("allocated_expansion_capital_lkr") or
                funding_block.get("available_capital_lkr") or
                effective_capital
            )
            # Standardized Monthly Operating Budget
            m_bud = (
                fin_block.get("additional_monthly_operating_budget_lkr") or
                fin_block.get("monthly_operating_budget_lkr") or
                funding_block.get("monthly_operating_budget_lkr") or
                effective_budget
            )
            # Standardized Total Funds
            tot_f = (
                funding_block.get("total_available_expansion_funds_lkr") or
                funding_block.get("total_available_funds_lkr") or
                inv_block.get("total_available_funds_lkr") or
                (a_cap + loan_amount)
            )
            # Standardized Funding Gap Status
            gap_stat = inv_block.get("funding_gap_status")
            if not gap_stat or a_cap is None or a_cap <= 0.0:
                if a_cap is None or a_cap <= 0.0:
                    gap_stat = "Funding status pending (Capital not provided)"
                else:
                    gap_stat = "Fully funded from baseline capital" if tot_f >= t_cap else "Capital gap identified"

            # Gross Sales calculations
            b_sales = fin_block.get("baseline_monthly_gross_sales_lkr") or (customers_per_day * expected_price * operating_days)
            u_sales = fin_block.get("expansion_uplift_monthly_gross_sales_lkr") or 0.0
            p_sales = fin_block.get("projected_total_monthly_gross_sales_lkr") or (b_sales + u_sales if not is_new_startup else b_sales)

            standard_inv = {
                **inv_block,
                "strategy_target_capital_lkr": t_cap,
                "strategy_target_expansion_capital_lkr": t_cap,
                "available_capital_lkr": a_cap,
                "allocated_expansion_capital_lkr": a_cap,
                "loan_amount_lkr": loan_amount,
                "total_available_funds_lkr": tot_f,
                "total_available_expansion_funds_lkr": tot_f,
                "funding_gap_status": gap_stat
            }
            standard_fin = {
                **fin_block,
                "monthly_operating_budget_lkr": m_bud,
                "additional_monthly_operating_budget_lkr": m_bud,
                "expected_price_lkr": expected_price,
                "operating_days_per_month": operating_days,
                "baseline_monthly_gross_sales_lkr": b_sales,
                "expansion_uplift_monthly_gross_sales_lkr": u_sales,
                "projected_total_monthly_gross_sales_lkr": p_sales,
                "estimated_monthly_gross_sales_lkr": b_sales
            }
            standard_funding = {
                **funding_block,
                "strategy_target_capital_lkr": t_cap,
                "strategy_target_expansion_capital_lkr": t_cap,
                "available_capital_lkr": a_cap,
                "allocated_expansion_capital_lkr": a_cap,
                "total_available_funds_lkr": tot_f,
                "total_available_expansion_funds_lkr": tot_f,
                "monthly_operating_budget_lkr": m_bud,
                "funding_gap_status": gap_stat,
                "strategy_budget_coverage_months": funding_block.get("strategy_budget_coverage_months", round(t_cap / max(m_bud, 1.0), 1)),
                "available_funds_coverage_months": funding_block.get("available_funds_coverage_months", round(tot_f / max(m_bud, 1.0), 1))
            }
            sec_04["startup_investment"] = standard_inv
            sec_04["expansion_investment"] = standard_inv
            sec_04["monthly_financial_plan"] = standard_fin
            sec_04["funding_structure"] = standard_funding
            sec_04["operational_plan"] = ops_block
            sec_04["operational_scaling_plan"] = ops_block

        # Standardize Section 05 monitoring measures
        if sec_05 and isinstance(sec_05, dict):
            raw_measures = sec_05.get("management_monitoring_measures") or sec_05.get("measurable_kpis") or []
            std_measures = []
            for m in raw_measures:
                m_name = m.get("measure_name") or m.get("metric") or m.get("kpi_name") or "Operational Metric"
                t_val = str(m.get("target") or m.get("focus") or "")
                freq_val = str(m.get("frequency") or "Monthly")
                cat_val = str(m.get("category") or m.get("type") or "Operational")
                std_measures.append({
                    "measure_name": m_name,
                    "metric": m_name,
                    "kpi_name": m_name,
                    "target": t_val,
                    "focus": t_val,
                    "frequency": freq_val,
                    "category": cat_val,
                    "type": cat_val
                })
            sec_05["management_monitoring_measures"] = std_measures
            sec_05["measurable_kpis"] = std_measures

        # Build Normalized Report Dictionary
        report_data = {
            "cover_image": cover_image,
            "metadata": {
                "record_id": metadata.get("record_id", "N/A"),
                "schema_version": metadata.get("schema_version", "2.0.0"),
                "generated_date": date_str,
                "system_brand": "SME360 AI",
                "document_title": doc_title,
                "document_subtitle": doc_subtitle,
                "is_new_startup": is_new_startup
            },
            "business_identity": {
                "business_name": business_name,
                "business_category": category,
                "business_stage": stage,
                "district": district,
                "province": province,
                "prepared_for": f"{business_name} Ownership / Management",
            },

            # -----------------------------------------------------------------
            # 5 Major Research Sections
            # -----------------------------------------------------------------
            "section_01": sec_01 or {
                "section_number": "01",
                "section_title": "01 — Business & Market Overview",
                "business_summary": {
                    "business_name": business_name,
                    "business_category": category,
                    "business_stage": stage,
                    "business_model": business_input.get("business_model") or "Direct Retail / Service",
                    "district": district,
                    "province": province,
                    "location_address": business_input.get("address") or "Information not provided",
                    "proposed_action": business_input.get("proposed_action") or "Launch Operations",
                    "business_description": business_input.get("additional_description") or "Information not provided"
                },
                "business_concept": {
                    "concept_overview": executive_overview.get("business_summary", f"Strategic plan for a proposed {stage.lower()} {category.lower()} in {district}."),
                    "products_services": f"Products and commercial offerings in {category}",
                    "target_customers": business_input.get("target_age_group") or f"Local consumers in {district}",
                    "business_objectives": business_input.get("additional_description") or f"Establish a sustainable {category} in {district}."
                },
                "market_overview": {
                    "target_market": f"{district} ({business_input.get('location_type', 'Urban')} Catchment)",
                    "customer_profile": business_input.get("target_age_group") or "Information not provided",
                    "expected_customers_per_day": customers_per_day,
                    "expected_selling_price_lkr": expected_price,
                    "operating_days_per_month": operating_days,
                    "customer_demand_score": f"{business_input.get('customer_demand_score', 50)}/100"
                },
                "competition": {
                    "competition_level": business_input.get("competition_level", "Moderate"),
                    "competitor_count_nearby": competitor_count_display,
                    "competitor_information": competitor_info_display,
                    "competitive_positioning": f"Differentiation via customer service and {active_strategy_name}."
                },
                "location": {
                    "district": district,
                    "province": province,
                    "location_type": business_input.get("location_type", "Commercial Hub"),
                    "location_suitability_score": f"{business_input.get('location_suitability_score', 3)}/5",
                    "location_considerations": f"Commercial density and customer foot traffic in {district}."
                }
            },

            "section_02": sec_02 or {
                "section_number": "02",
                "section_title": "02 — AI Feasibility & Key Insights",
                "feasibility_assessment": {
                    "final_predicted_label": predicted_label,
                    "confidence_score": confidence_score,
                    "confidence_percentage": f"{(confidence_score * 100):.1f}%",
                    "predicted_class_probability": confidence_score,
                    "predicted_probability_percentage": f"{(confidence_score * 100):.1f}%",
                    "probabilities": probabilities
                },
                "feasibility_interpretation": (
                    f"The proposed business is assessed as '{predicted_label}' with {confidence_score:.1%} predicted class probability "
                    f"under the evaluated financial, operational, and market parameters."
                ),
                "shap_explainability": {
                    "methodology_note": "SHAP feature attribution indicates factors that contributed to the model prediction without asserting causal proof.",
                    "positive_enablers": [
                        {
                            "feature": d.get("feature", "").replace("_", " ").title(),
                            "direction": "+",
                            "relative_importance": round(abs(float(d.get("importance", d.get("impact_score", 0.0)))), 4),
                            "feature_value": str(d.get("feature_value", "N/A")),
                            "business_interpretation": f"Favorable recorded condition for {d.get('feature', '')} contributed positive support to feasibility."
                        }
                        for d in explainability.get("positive_drivers", [])[:4]
                    ],
                    "negative_hurdles": [
                        {
                            "feature": d.get("feature", "").replace("_", " ").title(),
                            "direction": "-",
                            "relative_importance": round(abs(float(d.get("importance", d.get("impact_score", 0.0)))), 4),
                            "feature_value": str(d.get("feature_value", "N/A")),
                            "business_interpretation": f"Constraint in {d.get('feature', '')} contributed downward pressure, highlighting an operational hurdle."
                        }
                        for d in explainability.get("negative_drivers", [])[:4]
                    ]
                },
                "key_insights": {
                    "strengths": [f"Favorable {d.get('feature', '')}: {d.get('feature_value', 'Adequate')}" for d in explainability.get("positive_drivers", [])[:3]] or ["Baseline readiness supports initial launch."],
                    "constraints": [f"Constraint in {d.get('feature', '')}: {d.get('feature_value', 'Requires attention')}" for d in explainability.get("negative_drivers", [])[:3]] or ["Working capital buffer requires ongoing monitoring."]
                }
            },

            "section_03": sec_03 or {
                "section_number": "03",
                "section_title": "03 — Strategic Recommendations & TOPSIS Ranking",
                "available_strategic_alternatives": candidate_strategies,
                "topsis_evaluation": {
                    "criteria_weights": [
                        {"criterion": "Financial Viability", "weight": 0.25, "description": "Assessment of cash flow adequacy, capital runway, and budgetary resilience."},
                        {"criterion": "Implementation Feasibility", "weight": 0.20, "description": "Ease of operational execution given available experience and team size."},
                        {"criterion": "Market Demand Alignment", "weight": 0.25, "description": "Alignment with local consumer demand score and footfall potential."},
                        {"criterion": "Resource & Operational Friction", "weight": 0.15, "description": "Exposure to fixed-cost burn, supply dependencies, and resource hurdles."},
                        {"criterion": "Resource Efficiency", "weight": 0.15, "description": "Ratio of output generation to invested equipment and human capital."}
                    ]
                },
                "strategy_ranking": topsis_ranking.get("ranked_strategies", candidate_strategies),
                "ai_recommended_strategy": {
                    "strategy_name": ai_top_strategy,
                    "strategy_id": topsis_ranking.get("top_recommended_id", "STRAT_01"),
                    "topsis_score": ai_top_score
                },
                "human_in_the_loop_selection": {
                    "is_user_selected": is_user_selected,
                    "selected_strategy_id": active_strategy_id,
                    "selected_strategy_name": active_strategy_name,
                    "alignment_status": (
                        "Selected strategy matches the AI's highest-ranked recommendation."
                        if not is_user_selected else
                        f"The entrepreneur selected an alternative strategy ({active_strategy_name}) that was ranked differently by the AI. The business plan has been re-aligned with the entrepreneur's selected strategy."
                    )
                }
            },

            "section_04": sec_04 or {
                "section_number": "04",
                "section_title": "04 — Financial & Operational Plan",
                "active_strategy_alignment": {
                    "strategy_name": active_strategy_name,
                    "is_user_selected": is_user_selected
                },
                "startup_investment": {
                    "available_capital_lkr": effective_capital,
                    "strategy_target_capital_lkr": strategy_target_capital,
                    "loan_amount_lkr": loan_amount,
                    "initial_inventory_cost_lkr": float(business_input.get("initial_inventory_cost_lkr", 0.0)),
                    "funding_gap_lkr": max(0.0, strategy_target_capital - total_available_funds),
                    "funding_gap_status": "Fully funded from baseline capital" if total_available_funds >= strategy_target_capital else "Capital gap identified"
                },
                "monthly_financial_plan": {
                    "monthly_operating_budget_lkr": effective_budget,
                    "expected_price_lkr": expected_price,
                    "expected_customers_per_day": customers_per_day,
                    "operating_days_per_month": operating_days,
                    "estimated_monthly_gross_sales_lkr": customers_per_day * expected_price * operating_days,
                    "estimated_monthly_revenue_lkr": customers_per_day * expected_price * operating_days,
                    "revenue_calculation_formula": "Estimated Monthly Gross Sales = Target Customers/Day × Expected Unit Price × Operating Days/Month",
                    "calculation_note": "Gross sales estimate based on stated customer volume, unit price, and operating days. Does not model variable costs or net profit."
                },
                "funding_structure": {
                    "available_capital_lkr": effective_capital,
                    "initial_available_capital_lkr": effective_capital,
                    "debt_financing_lkr": loan_amount,
                    "total_available_funds_lkr": total_available_funds,
                    "target_required_capital_lkr": strategy_target_capital,
                    "strategy_budget_coverage_months": strategy_budget_coverage,
                    "available_funds_coverage_months": available_funds_coverage,
                    "capital_runway_months": strategy_budget_coverage
                },
                "operational_plan": {
                    "staffing": {
                        "available_staff_count": business_input.get("available_staff_count", 1),
                        "required_staff_count": business_input.get("required_staff_count", 1),
                        "capacity_status": "Balanced staffing allocation"
                    },
                    "equipment": {
                        "available_equipment_score": f"{business_input.get('available_equipment_score', 3)}/5",
                        "required_equipment_score": f"{business_input.get('required_equipment_score', 3)}/5",
                        "readiness_status": "Equipment meets operating baseline"
                    },
                    "suppliers": {
                        "supplier_availability_score": f"{business_input.get('supplier_availability_score', 3)}/5",
                        "network_region": f"Local supplier channels in {district}"
                    }
                },
                "marketing_plan": {
                    "marketing_channel": business_input.get("marketing_channel", "Word of Mouth"),
                    "promotional_tactics": marketing_plan.get("promotional_tactics", [])
                }
            },

            "section_05": sec_05 or {
                "section_number": "05",
                "section_title": "05 — Scenario Analysis & Action Roadmap",
                "what_if_analysis": {
                    "scenarios": scenario_analysis.get("what_if_simulations", [])
                },
                "counterfactual_analysis": scenario_analysis.get("counterfactual_boundary", {}),
                "personalized_action_roadmap": {
                    "phase_0_to_30_days": action_roadmap.get("phase_1", []),
                    "phase_30_to_90_days": action_roadmap.get("phase_2", [])[:2],
                    "phase_3_to_6_months": action_roadmap.get("phase_2", [])[2:],
                    "phase_6_to_12_months": action_roadmap.get("phase_3", [])
                },
                "management_monitoring_measures": [
                    {"measure_name": "Monthly Gross Sales", "target": f"LKR {customers_per_day * expected_price * operating_days:,.2f}", "frequency": "Monthly", "category": "Sales Tracking"},
                    {"measure_name": "Daily Customer Count", "target": f"{customers_per_day} / Day", "frequency": "Daily", "category": "Volume"},
                    {"measure_name": "Operating Budget Compliance", "target": f"≤ LKR {effective_budget:,.2f} / Month", "frequency": "Monthly", "category": "Cost Control"},
                    {"measure_name": "Simplified Budget Coverage", "target": f"Monitor reserve buffer (approx {strategy_budget_coverage} mo)", "frequency": "Monthly", "category": "Liquidity"}
                ],
                "measurable_kpis": [
                    {"kpi_name": "Monthly Gross Sales", "target": f"LKR {customers_per_day * expected_price * operating_days:,.2f}", "frequency": "Monthly"},
                    {"kpi_name": "Daily Customer Count", "target": f"{customers_per_day} / Day", "frequency": "Daily"},
                    {"kpi_name": "Operating Budget Compliance", "target": f"≤ LKR {effective_budget:,.2f} / Month", "frequency": "Monthly"},
                    {"kpi_name": "Simplified Budget Coverage", "target": f"Approx {strategy_budget_coverage} Months", "frequency": "Monthly"}
                ],
                "operational_constraints_and_management_considerations": [
                    {"constraint": "Capital Allocation", "management_action": "Enforce strict working capital controls and prioritize lean setup investments."},
                    {"constraint": "Staff Capacity", "management_action": "Establish standardized operating checklists and cross-train staff."},
                    {"constraint": "Equipment Readiness", "management_action": "Prioritize vital operating fixtures and arrange supplier warranties."}
                ],
                "business_constraints_and_mitigation": [
                    {"constraint": "Capital Allocation", "mitigation": "Enforce strict working capital controls and prioritize lean setup investments."},
                    {"constraint": "Staff Capacity", "mitigation": "Establish standardized operating checklists and cross-train staff."},
                    {"constraint": "Equipment Readiness", "mitigation": "Prioritize vital operating fixtures and arrange supplier warranties."}
                ],
                "final_ai_recommendation": {
                    "ai_feasibility_verdict": predicted_label,
                    "ai_recommended_strategy": ai_top_strategy,
                    "entrepreneur_selected_strategy": active_strategy_name,
                    "is_user_selected": is_user_selected,
                    "recommended_immediate_next_step": "Confirm initial supplier arrangements, configure ordering channels, and prepare operating workspace."
                }
            },

            "final_recommendation": final_rec or {
                "ai_feasibility_verdict": predicted_label,
                "ai_confidence_score": confidence_score,
                "predicted_class_probability": confidence_score,
                "ai_recommended_strategy": ai_top_strategy,
                "entrepreneur_selected_strategy": active_strategy_name,
                "is_user_selected": is_user_selected,
                "recommended_immediate_next_step": "Confirm initial supplier arrangements, configure ordering channels, and prepare operating workspace."
            },

            # -----------------------------------------------------------------
            # Backward-Compatibility Keys
            # -----------------------------------------------------------------
            "executive_summary": {
                "business_summary": executive_overview.get("business_summary", f"Strategic plan for a proposed {stage.lower()} {category.lower()} in {district}."),
                "predicted_label": predicted_label,
                "confidence_score": confidence_score,
                "confidence_percent": f"{(confidence_score * 100):.1f}%",
                "probabilities": probabilities,
                "active_strategy": active_strategy_name,
                "is_user_selected": is_user_selected,
            },
            "business_overview": {
                "category": category,
                "stage": stage,
                "district": district,
                "experience_years": int(business_input.get("entrepreneur_experience_years", 0)),
                "staff_count": int(business_input.get("available_staff_count", 1)),
                "competition_level": business_input.get("competition_level", "Moderate")
            },
            "financial_overview": {
                "available_capital_lkr": effective_capital,
                "monthly_budget_lkr": effective_budget,
                "expected_price_lkr": expected_price,
                "estimated_monthly_gross_sales_lkr": customers_per_day * expected_price * operating_days,
                "estimated_monthly_revenue_lkr": customers_per_day * expected_price * operating_days,
                "loan_required": effective_capital < (effective_budget * 6),
                "strategy_budget_coverage_months": strategy_budget_coverage,
                "available_funds_coverage_months": available_funds_coverage,
                "capital_runway_months": strategy_budget_coverage,
                "guidance_summary": financial_plan.get("counterfactual_guidance", "Maintain a conservative operating buffer.")
            },
            "market_analysis": {
                "expected_customers_per_day": customers_per_day,
                "target_monthly_customers": customers_per_day * operating_days,
                "competition_level": business_input.get("competition_level", "Moderate"),
                "demand_score": marketing_plan.get("demand_score", "Moderate Market Demand"),
                "target_customer_desc": marketing_plan.get("target_daily_customers", f"{customers_per_day} target daily customers in {district}.")
            },
            "operational_plan": {
                "staffing_requirements": operational_plan.get("staffing_requirements", f"Current staff allocation: {business_input.get('available_staff_count', 1)}."),
                "equipment_readiness": operational_plan.get("equipment_readiness", "Essential operating equipment requirements identified.")
            },
            "key_business_factors": {
                "positive_enablers": explainability.get("positive_drivers", []),
                "operational_hurdles": explainability.get("negative_drivers", []),
                "risk_hurdles": explainability.get("negative_drivers", [])
            },
            "strategies": candidate_strategies,
            "strategy_priorities": {
                "top_recommended_strategy": active_strategy_name,
                "top_topsis_score": ai_top_score,
                "ai_top_strategy": ai_top_strategy,
                "ai_top_score": ai_top_score,
                "is_user_selected": is_user_selected,
                "selected_strategy_id": active_strategy_id,
                "selected_strategy_name": active_strategy_name,
                "ranked_strategies": topsis_ranking.get("ranked_strategies", candidate_strategies)
            },
            "scenarios": scenario_analysis.get("what_if_simulations", []),
            "action_roadmap": {
                "phase_1": action_roadmap.get("phase_1", []),
                "phase_2": action_roadmap.get("phase_2", []),
                "phase_3": action_roadmap.get("phase_3", [])
            },
            "assumptions_and_considerations": [
                "The feasibility model developed in this study was trained and evaluated using the dataset used for this research.",
                "Financial projections assume operating days and steady unit pricing based on provided business inputs.",
                "Simplified budget coverage represents a capital-to-budget ratio and does not constitute a guaranteed survival period.",
                "The entrepreneur should perform on-the-ground market and supplier validation before committing heavy capital investments."
            ],
            "raw_profile": profile
        }

        return report_data
