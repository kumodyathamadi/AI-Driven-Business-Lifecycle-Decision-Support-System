import os
import io
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

from backend.services.business_plan_generator.chart_generator import BusinessPlanChartGenerator

LOGO_PATH = os.path.abspath(os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "frontend", "src", "assets", "logo", "sme360-ai-logo.png"
))

class BusinessPlanDocxGenerator:
    """
    Generates an editable Microsoft Word (.docx) document for SME360 AI Business Plans
    using python-docx adhering strictly to the 5 Research-Grounded Report Sections.
    """

    @staticmethod
    def set_cell_background(cell, fill_hex):
        """Sets XML background color for a table cell."""
        tcPr = cell._element.get_or_add_tcPr()
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
        tcPr.append(shd)

    @staticmethod
    def generate_docx(report_data: dict) -> bytes:
        doc = Document()

        # Set Standard Page Margins (0.75 in / 54 pt)
        for section in doc.sections:
            section.top_margin = Inches(0.75)
            section.bottom_margin = Inches(0.75)
            section.left_margin = Inches(0.75)
            section.right_margin = Inches(0.75)

        # Color Palette
        COLOR_PRIMARY = RGBColor(30, 58, 138)   # #1e3a8a Dark Blue
        COLOR_ACCENT = RGBColor(37, 99, 235)   # #2563eb Vibrant Blue
        COLOR_DARK = RGBColor(15, 23, 42)      # #0f172a Dark Slate
        COLOR_MUTED = RGBColor(100, 116, 139)  # #64748b Muted Slate

        metadata = report_data.get("metadata", {})
        biz_id = report_data.get("business_identity", {})

        # =========================================================================
        # 1. COVER PAGE
        # =========================================================================
        if os.path.exists(LOGO_PATH):
            try:
                p_logo = doc.add_paragraph()
                p_logo.alignment = WD_ALIGN_PARAGRAPH.LEFT
                run_logo = p_logo.add_run()
                run_logo.add_picture(LOGO_PATH, width=Inches(2.0))
            except Exception:
                pass

        p_sub = doc.add_paragraph()
        p_sub.paragraph_format.space_before = Pt(16)
        p_sub.paragraph_format.space_after = Pt(2)
        run_sub = p_sub.add_run(metadata.get("system_brand", "SME360 AI"))
        run_sub.font.name = 'Arial'
        run_sub.font.size = Pt(11)
        run_sub.font.bold = True
        run_sub.font.color.rgb = COLOR_ACCENT

        p_title = doc.add_paragraph()
        p_title.paragraph_format.space_after = Pt(4)
        run_title = p_title.add_run("STRATEGIC BUSINESS PLAN")
        run_title.font.name = 'Arial'
        run_title.font.size = Pt(24)
        run_title.font.bold = True
        run_title.font.color.rgb = COLOR_PRIMARY

        p_desc = doc.add_paragraph()
        p_desc.paragraph_format.space_after = Pt(24)
        run_desc = p_desc.add_run(metadata.get("document_subtitle", "AI-Assisted Business Feasibility & Personalized Growth Report"))
        run_desc.font.name = 'Arial'
        run_desc.font.size = Pt(10)
        run_desc.font.color.rgb = COLOR_MUTED

        # Cover Box Table
        cov_table = doc.add_table(rows=6, cols=2)
        cov_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        cov_data = [
            ("BUSINESS NAME:", biz_id.get("business_name")),
            ("CATEGORY:", biz_id.get("business_category")),
            ("BUSINESS STAGE:", biz_id.get("business_stage")),
            ("DISTRICT & PROVINCE:", f"{biz_id.get('district')}, {biz_id.get('province')}"),
            ("PREPARED DATE:", metadata.get("generated_date")),
            ("RECORD ID:", metadata.get("record_id")),
        ]

        for idx, (label, val) in enumerate(cov_data):
            row_cells = cov_table.rows[idx].cells
            row_cells[0].width = Inches(2.0)
            row_cells[1].width = Inches(4.5)
            BusinessPlanDocxGenerator.set_cell_background(row_cells[0], "F8FAFC")
            BusinessPlanDocxGenerator.set_cell_background(row_cells[1], "FFFFFF")
            p0 = row_cells[0].paragraphs[0]
            r0 = p0.add_run(label)
            r0.font.bold = True
            r0.font.size = Pt(9.5)
            r0.font.name = 'Arial'
            p1 = row_cells[1].paragraphs[0]
            r1 = p1.add_run(str(val))
            r1.font.size = Pt(9.5)
            r1.font.name = 'Arial'

        doc.add_page_break()

        # =========================================================================
        # SECTION 01 — BUSINESS & MARKET OVERVIEW
        # =========================================================================
        sec_01 = report_data.get("section_01", {})
        h1 = doc.add_heading(level=1)
        r = h1.add_run("SECTION 01 — BUSINESS & MARKET OVERVIEW")
        r.font.color.rgb = COLOR_PRIMARY
        r.font.name = 'Arial'

        sum_info = sec_01.get("business_summary", {})
        concept = sec_01.get("business_concept", {})
        mkt = sec_01.get("market_overview", {})
        comp = sec_01.get("competition", {})
        loc = sec_01.get("location", {})

        p = doc.add_paragraph()
        p.add_run("1.1 Business Identity & Summary\n").bold = True
        p.add_run(f"• Business: {sum_info.get('business_name')} | Category: {sum_info.get('business_category')} | Stage: {sum_info.get('business_stage')}\n")
        p.add_run(f"• Location: {sum_info.get('district')}, {sum_info.get('province')} ({loc.get('location_type')})\n")
        p.add_run(f"• Concept: {concept.get('concept_overview', '')}\n")
        if sum_info.get("business_description") and sum_info.get("business_description") != "Information not provided":
            p.add_run(f"• Entrepreneur Objective: {sum_info.get('business_description')}\n")

        p = doc.add_paragraph()
        p.add_run("1.2 Market, Demand & Competition\n").bold = True
        p.add_run(f"• Target Market: {mkt.get('target_market')} | Demand Index: {mkt.get('customer_demand_score')}\n")
        p.add_run(f"• Expected Footfall: {mkt.get('expected_customers_per_day')} customers/day | Expected Unit Price: LKR {mkt.get('expected_selling_price_lkr', 0):,.2f}\n")
        p.add_run(f"• Competition Level: {comp.get('competition_level')} ({comp.get('competitor_count_nearby')} competitors nearby)\n")
        p.add_run(f"• Positioning: {comp.get('competitive_positioning')}\n")

        # =========================================================================
        # SECTION 02 — AI FEASIBILITY & KEY INSIGHTS
        # =========================================================================
        sec_02 = report_data.get("section_02", {})
        h1 = doc.add_heading(level=1)
        r = h1.add_run("SECTION 02 — AI FEASIBILITY & KEY INSIGHTS")
        r.font.color.rgb = COLOR_PRIMARY
        r.font.name = 'Arial'

        feas = sec_02.get("feasibility_assessment", {})
        probs = feas.get("probabilities", {})
        pred_label = feas.get("final_predicted_label", "Conditionally Feasible")

        p = doc.add_paragraph()
        p.add_run("2.1 Model Feasibility Outcome\n").bold = True
        p.add_run(f"• Outcome: {pred_label} (Model Confidence: {feas.get('confidence_percentage')})\n")
        p.add_run(f"• Probability Distribution: Feasible {(probs.get('Feasible', 0.0)*100):.1f}% | Conditionally Feasible {(probs.get('Conditionally Feasible', 0.0)*100):.1f}% | Infeasible {(probs.get('Infeasible', 0.0)*100):.1f}%\n")
        p.add_run(f"• Interpretation: {sec_02.get('feasibility_interpretation', '')}\n")

        # Chart
        try:
            chart_bytes = BusinessPlanChartGenerator.generate_probability_chart(probs)
            p_chart = doc.add_paragraph()
            p_chart.add_run().add_picture(io.BytesIO(chart_bytes), width=Inches(5.5))
        except Exception:
            pass

        # SHAP
        shap_info = sec_02.get("shap_explainability", {})
        p = doc.add_paragraph()
        p.add_run("2.2 Explainable AI Feature Attribution (SHAP)\n").bold = True
        p.add_run("Top Positive Supporting Enablers (+):\n").bold = True
        for item in shap_info.get("positive_enablers", [])[:3]:
            p.add_run(f"  + {item.get('feature')} (Observed: {item.get('feature_value')}): {item.get('business_interpretation')}\n")
        p.add_run("Key Operational Hurdles to Mitigate (-):\n").bold = True
        for item in shap_info.get("negative_hurdles", [])[:3]:
            p.add_run(f"  - {item.get('feature')} (Observed: {item.get('feature_value')}): {item.get('business_interpretation')}\n")

        # =========================================================================
        # SECTION 03 — STRATEGIC RECOMMENDATIONS & TOPSIS
        # =========================================================================
        sec_03 = report_data.get("section_03", {})
        h1 = doc.add_heading(level=1)
        r = h1.add_run("SECTION 03 — STRATEGIC RECOMMENDATIONS & TOPSIS RANKING")
        r.font.color.rgb = COLOR_PRIMARY
        r.font.name = 'Arial'

        hitl = sec_03.get("human_in_the_loop_selection", {})
        is_sel = hitl.get("is_user_selected", False)
        active_strat = hitl.get("selected_strategy_name", "Lean Bootstrapped Launch")

        p = doc.add_paragraph()
        p.add_run(f"Active Operational Strategy: {active_strat} ({'Adopted by Entrepreneur' if is_sel else 'AI Recommended #1'})\n").bold = True
        p.add_run(f"{hitl.get('alignment_status')}\n")

        p = doc.add_paragraph()
        p.add_run("TOPSIS Multi-Criteria Decision Ranking:\n").bold = True
        for r in sec_03.get("strategy_ranking", []):
            p.add_run(f"  Rank #{r.get('rank')} — {r.get('strategy_name')} (Score: {r.get('topsis_score')}) | Est. Capital: LKR {r.get('estimated_capital_required_lkr', 0):,.0f}\n")

        # =========================================================================
        # SECTION 04 — FINANCIAL & OPERATIONAL PLAN
        # =========================================================================
        sec_04 = report_data.get("section_04", {})
        h1 = doc.add_heading(level=1)
        r = h1.add_run("SECTION 04 — FINANCIAL & OPERATIONAL PLAN")
        r.font.color.rgb = COLOR_PRIMARY
        r.font.name = 'Arial'

        fin_plan = sec_04.get("monthly_financial_plan", {})
        startup = sec_04.get("startup_investment", {})
        funding = sec_04.get("funding_structure", {})
        ops = sec_04.get("operational_plan", {})
        staff = ops.get("staffing", {})
        equip = ops.get("equipment", {})
        supp = ops.get("suppliers", {})

        p = doc.add_paragraph()
        p.add_run(f"Plan Dynamically Aligned to Strategy: {active_strat}\n").bold = True
        p.add_run(f"• Strategy Target Capital: LKR {startup.get('strategy_target_capital_lkr', 0):,.0f}\n")
        p.add_run(f"• Monthly Operating Budget: LKR {fin_plan.get('monthly_operating_budget_lkr', 0):,.0f}\n")
        p.add_run(f"• Estimated Monthly Revenue: LKR {fin_plan.get('estimated_monthly_revenue_lkr', 0):,.0f} (Calculated from user assumptions)\n")
        p.add_run(f"• Capital Runway Horizon: {funding.get('capital_runway_months', 0)} Months\n")
        p.add_run(f"• Staffing: {staff.get('available_staff_count', 1)} available vs {staff.get('required_staff_count', 1)} required ({staff.get('capacity_status')})\n")
        p.add_run(f"• Equipment Readiness: {equip.get('available_equipment_score')} score ({equip.get('readiness_status')})\n")
        p.add_run(f"• Supplier Logistics: {supp.get('supplier_availability_score')} score ({supp.get('network_region')})\n")

        # =========================================================================
        # SECTION 05 — SCENARIO ANALYSIS & ACTION ROADMAP
        # =========================================================================
        sec_05 = report_data.get("section_05", {})
        h1 = doc.add_heading(level=1)
        r = h1.add_run("SECTION 05 — SCENARIO ANALYSIS & ACTION ROADMAP")
        r.font.color.rgb = COLOR_PRIMARY
        r.font.name = 'Arial'

        p = doc.add_paragraph()
        p.add_run("5.1 What-If Scenario Simulations:\n").bold = True
        for sc in sec_05.get("what_if_analysis", {}).get("scenarios", [])[:4]:
            p.add_run(f"  • {sc.get('title')}: New Class '{sc.get('new_prediction')}' (Viability Δ: {sc.get('viability_delta', 0.0):+.1%})\n")
            p.add_run(f"    {sc.get('impact_summary')}\n")

        cf = sec_05.get("counterfactual_analysis", {})
        p.add_run(f"\nCounterfactual Threshold: {cf.get('recommendation', 'Capital is adequate.')}\n\n")

        p = doc.add_paragraph()
        p.add_run("5.2 Time-Phased Execution Milestones:\n").bold = True
        rm = sec_05.get("personalized_action_roadmap", {})
        p.add_run("Phase 1: Immediate Launch (0 – 30 Days):\n").bold = True
        for a in rm.get("phase_0_to_30_days", []):
            p.add_run(f"  • {a}\n")
        p.add_run("Phase 2: Customer Acquisition & Burn Control (30 – 90 Days):\n").bold = True
        for a in rm.get("phase_30_to_90_days", []):
            p.add_run(f"  • {a}\n")
        p.add_run("Phase 3: Operational Stabilization & Review (3 – 6 Months):\n").bold = True
        for a in rm.get("phase_3_to_6_months", []):
            p.add_run(f"  • {a}\n")
        p.add_run("Phase 4: Business Scale & Regional Expansion (6 – 12 Months):\n").bold = True
        for a in rm.get("phase_6_to_12_months", []):
            p.add_run(f"  • {a}\n")

        p = doc.add_paragraph()
        p.add_run("5.3 Measurable Key Performance Indicators (KPIs):\n").bold = True
        for k in sec_05.get("measurable_kpis", []):
            p.add_run(f"  • {k.get('kpi_name')}: Target {k.get('target')} (Review: {k.get('frequency')})\n")

        # Final AI Recommendation Box
        final_box = report_data.get("final_recommendation", {})
        p = doc.add_paragraph()
        p.add_run("\nFINAL AI DECISION RECOMMENDATION:\n").bold = True
        p.add_run(f"• Feasibility Verdict: {final_box.get('ai_feasibility_verdict')}\n")
        p.add_run(f"• AI Recommended Strategy: {final_box.get('ai_recommended_strategy')}\n")
        p.add_run(f"• Selected Operational Strategy: {final_box.get('entrepreneur_selected_strategy')}\n")
        p.add_run(f"• Primary Enabler: {final_box.get('main_positive_strength')}\n")
        p.add_run(f"• Primary Hurdle: {final_box.get('main_operational_constraint')}\n")
        p.add_run(f"• Immediate Recommended Next Step: {final_box.get('recommended_immediate_next_step')}\n")

        bio = io.BytesIO()
        doc.save(bio)
        bio.seek(0)
        return bio.getvalue()
