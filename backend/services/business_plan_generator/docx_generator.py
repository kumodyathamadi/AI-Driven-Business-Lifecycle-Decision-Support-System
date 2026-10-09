import os
import io
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

from backend.services.business_plan_generator.chart_generator import BusinessPlanChartGenerator
from backend.services.business_plan_generator.cover_image_handler import CoverImageHandler

LOGO_PATH = os.path.abspath(os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "frontend", "src", "assets", "logo", "sme360-ai-logo.png"
))

class BusinessPlanDocxGenerator:
    """
    Generates an editable, consultancy-grade Microsoft Word (.docx) document
    for SME360 AI Business Plans adhering to a professional narrative structure:
    'BUSINESS STORY -> ANALYSIS -> EXPLANATION -> RECOMMENDATION -> ACTION'
    with structured comparison tables used only where genuinely necessary.
    """

    @staticmethod
    def set_cell_background(cell, fill_hex):
        """Sets XML background color for a table cell."""
        tcPr = cell._element.get_or_add_tcPr()
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
        tcPr.append(shd)

    @staticmethod
    def set_cell_margins(cell, top=120, bottom=120, left=160, right=160):
        """Sets XML internal cell padding in dxa (1 pt = 20 dxa)."""
        tcPr = cell._element.get_or_add_tcPr()
        tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
        tcPr.append(tcMar)

    @staticmethod
    def generate_docx(report_data: dict) -> bytes:
        doc = Document()

        raw_cover = report_data.get("cover_image")
        cover_info = None
        if raw_cover:
            try:
                cover_info = CoverImageHandler.process_cover_image(raw_cover)
            except Exception:
                cover_info = None

        if cover_info:
            # 0. Custom Cover Page Section (Full A4, zero margins)
            sec_cover = doc.sections[0]
            sec_cover.page_width = Inches(cover_info["docx_geometry"]["page_width_in"])
            sec_cover.page_height = Inches(cover_info["docx_geometry"]["page_height_in"])
            sec_cover.top_margin = Inches(0)
            sec_cover.bottom_margin = Inches(0)
            sec_cover.left_margin = Inches(0)
            sec_cover.right_margin = Inches(0)

            p_cover = doc.add_paragraph()
            p_cover.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_cover.paragraph_format.space_before = Pt(cover_info["docx_geometry"]["top_space_pt"])
            p_cover.paragraph_format.space_after = Pt(0)
            run_cov = p_cover.add_run()
            run_cov.add_picture(
                io.BytesIO(cover_info["image_bytes"]),
                width=Inches(cover_info["docx_geometry"]["width_in"]),
                height=Inches(cover_info["docx_geometry"]["height_in"])
            )

            # Section break: Business Plan content begins cleanly on Page 2
            sec_body = doc.add_section()
            sec_body.page_width = Inches(cover_info["docx_geometry"]["page_width_in"])
            sec_body.page_height = Inches(cover_info["docx_geometry"]["page_height_in"])
            sec_body.top_margin = Inches(0.75)
            sec_body.bottom_margin = Inches(0.75)
            sec_body.left_margin = Inches(0.75)
            sec_body.right_margin = Inches(0.75)
        else:
            # Standard Business Plan without custom cover
            sec_body = doc.sections[0]
            sec_body.page_width = Inches(8.27)
            sec_body.page_height = Inches(11.69)
            sec_body.top_margin = Inches(0.75)
            sec_body.bottom_margin = Inches(0.75)
            sec_body.left_margin = Inches(0.75)
            sec_body.right_margin = Inches(0.75)

        # Corporate Color Palette
        COLOR_PRIMARY = RGBColor(30, 58, 138)   # #1e3a8a Deep Navy
        COLOR_ACCENT = RGBColor(37, 99, 235)   # #2563eb Vibrant Blue
        COLOR_DARK = RGBColor(15, 23, 42)      # #0f172a Slate 900
        COLOR_MUTED = RGBColor(100, 116, 139)  # #64748b Slate 600

        metadata = report_data.get("metadata", {})
        biz_id = report_data.get("business_identity", {})
        biz_name = biz_id.get("business_name", "Enterprise")
        category = biz_id.get("business_category", "SME Business")
        stage = biz_id.get("business_stage", "New Startup")
        district = biz_id.get("district", "Colombo")
        province = biz_id.get("province", "Western")

        # Helper: Body Paragraph
        def add_body_p(text, bold_prefix=None, space_after=5):
            p = doc.add_paragraph()
            p.paragraph_format.space_after = Pt(space_after)
            p.paragraph_format.line_spacing = 1.15
            if bold_prefix:
                r_b = p.add_run(bold_prefix)
                r_b.font.name = 'Arial'
                r_b.font.size = Pt(9.5)
                r_b.font.bold = True
                r_b.font.color.rgb = COLOR_DARK
            r = p.add_run(text)
            r.font.name = 'Arial'
            r.font.size = Pt(9.5)
            r.font.color.rgb = COLOR_DARK
            return p

        # Helper: Bullet Point
        def add_bullet_p(text, bold_prefix=None, space_after=3.5):
            p = doc.add_paragraph(style='List Bullet')
            p.paragraph_format.space_after = Pt(space_after)
            p.paragraph_format.line_spacing = 1.12
            if bold_prefix:
                r_b = p.add_run(bold_prefix)
                r_b.font.name = 'Arial'
                r_b.font.size = Pt(9.5)
                r_b.font.bold = True
                r_b.font.color.rgb = COLOR_DARK
            r = p.add_run(text)
            r.font.name = 'Arial'
            r.font.size = Pt(9.5)
            r.font.color.rgb = COLOR_DARK
            return p

        # Helper: Heading 1
        def add_h1(text):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(14)
            p.paragraph_format.space_after = Pt(6)
            r = p.add_run(text)
            r.font.name = 'Arial'
            r.font.size = Pt(14)
            r.font.bold = True
            r.font.color.rgb = COLOR_PRIMARY
            return p

        # Helper: Heading 2
        def add_h2(text):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(10)
            p.paragraph_format.space_after = Pt(4)
            r = p.add_run(text)
            r.font.name = 'Arial'
            r.font.size = Pt(11)
            r.font.bold = True
            r.font.color.rgb = COLOR_ACCENT
            return p

        # Helper: Heading 3
        def add_h3(text):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(8)
            p.paragraph_format.space_after = Pt(3)
            r = p.add_run(text)
            r.font.name = 'Arial'
            r.font.size = Pt(10)
            r.font.bold = True
            r.font.color.rgb = COLOR_DARK
            return p

        # Helper: Callout Card Panel
        def add_callout_box(title, lines_list, bg_hex="F8FAFC"):
            tbl = doc.add_table(rows=1, cols=1)
            tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
            cell = tbl.cell(0, 0)
            cell.width = Inches(7.0)
            BusinessPlanDocxGenerator.set_cell_background(cell, bg_hex)
            BusinessPlanDocxGenerator.set_cell_margins(cell, top=140, bottom=140, left=180, right=180)
            
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(2)
            if title:
                r_t = p.add_run(title + "\n")
                r_t.font.name = 'Arial'
                r_t.font.size = Pt(10)
                r_t.font.bold = True
                r_t.font.color.rgb = COLOR_PRIMARY

            for idx, line in enumerate(lines_list):
                if idx > 0 or title:
                    p = cell.add_paragraph()
                    p.paragraph_format.space_after = Pt(2)
                r_l = p.add_run(line)
                r_l.font.name = 'Arial'
                r_l.font.size = Pt(9)
                r_l.font.color.rgb = COLOR_DARK
            doc.add_paragraph().paragraph_format.space_after = Pt(4)

        # Helper: 4-Column Metric Strip
        def add_metric_strip(metrics):
            tbl = doc.add_table(rows=1, cols=len(metrics))
            tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
            col_w = Inches(7.0 / len(metrics))
            for idx, (label, val, sub) in enumerate(metrics):
                cell = tbl.cell(0, idx)
                cell.width = col_w
                BusinessPlanDocxGenerator.set_cell_background(cell, "F8FAFC")
                BusinessPlanDocxGenerator.set_cell_margins(cell, top=120, bottom=120, left=140, right=140)
                p = cell.paragraphs[0]
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p.paragraph_format.space_after = Pt(1)
                
                r_lbl = p.add_run(label.upper() + "\n")
                r_lbl.font.name = 'Arial'
                r_lbl.font.size = Pt(7)
                r_lbl.font.bold = True
                r_lbl.font.color.rgb = COLOR_MUTED

                r_val = p.add_run(str(val) + "\n")
                r_val.font.name = 'Arial'
                r_val.font.size = Pt(11)
                r_val.font.bold = True
                r_val.font.color.rgb = COLOR_PRIMARY

                r_sub = p.add_run(str(sub))
                r_sub.font.name = 'Arial'
                r_sub.font.size = Pt(7)
                r_sub.font.color.rgb = COLOR_MUTED
            doc.add_paragraph().paragraph_format.space_after = Pt(4)

        # =========================================================================
        # 1. COVER PAGE
        # =========================================================================
        if os.path.exists(LOGO_PATH):
            try:
                p_logo = doc.add_paragraph()
                p_logo.alignment = WD_ALIGN_PARAGRAPH.LEFT
                run_logo = p_logo.add_run()
                run_logo.add_picture(LOGO_PATH, width=Inches(1.8))
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

        is_new_startup = "new" in stage.lower() or "start" in stage.lower()
        doc_title = metadata.get("document_title") or ("STRATEGIC BUSINESS PLAN" if is_new_startup else "STRATEGIC BUSINESS GROWTH & EXPANSION PLAN")
        doc_desc = metadata.get("document_subtitle") or (
            "A Comprehensive Feasibility, Strategic Direction & Implementation Blueprint"
            if is_new_startup else
            "AI-Driven Business Growth, Expansion Feasibility & Investment Planning"
        )

        p_title = doc.add_paragraph()
        p_title.paragraph_format.space_after = Pt(4)
        run_title = p_title.add_run(doc_title)
        run_title.font.name = 'Arial'
        run_title.font.size = Pt(24)
        run_title.font.bold = True
        run_title.font.color.rgb = COLOR_PRIMARY

        p_desc = doc.add_paragraph()
        p_desc.paragraph_format.space_after = Pt(22)
        run_desc = p_desc.add_run(doc_desc)
        run_desc.font.name = 'Arial'
        run_desc.font.size = Pt(10)
        run_desc.font.color.rgb = COLOR_MUTED

        # Cover Executive Metadata Panel
        clean_stage_display = "New Startup" if "new" in stage.lower() else "Existing Business"
        cov_lines = [
            f"Prepared For: {biz_name}",
            f"Enterprise Category & Stage: {category} • {clean_stage_display}",
            f"Operating Catchment: {district}, {province} Province, Sri Lanka",
            f"Preparation Date: {metadata.get('generated_date', 'Current')}",
            f"Decision Record Reference: {metadata.get('record_id', 'N/A')}"
        ]
        add_callout_box("ENTERPRISE PROFILE & DOCUMENT METADATA", cov_lines, bg_hex="F8FAFC")

        p_disc = doc.add_paragraph()
        p_disc.paragraph_format.space_before = Pt(30)
        r_disc = p_disc.add_run(
            "This document synthesizes machine-learned feasibility prediction, explainable SHAP feature attribution, "
            "TOPSIS multi-criteria strategy prioritization, and sensitivity scenario stress-testing into an actionable strategic roadmap "
            "tailored specifically to this enterprise."
        )
        r_disc.font.name = 'Arial'
        r_disc.font.size = Pt(8.5)
        r_disc.font.italic = True
        r_disc.font.color.rgb = COLOR_MUTED

        doc.add_page_break()

        # =========================================================================
        # SECTION 01 — BUSINESS & MARKET OVERVIEW
        # =========================================================================
        sec_01 = report_data.get("section_01", {})
        summary_info = sec_01.get("business_summary", {})
        concept = sec_01.get("business_concept", {})
        mkt = sec_01.get("market_overview", {})
        comp = sec_01.get("competition", {})
        loc = sec_01.get("location", {})

        sec_01_name = sec_01.get("section_title")
        if sec_01_name:
            sec_01_display = f"SECTION {sec_01_name.upper()}" if not sec_01_name.upper().startswith("SECTION") else sec_01_name.upper()
        else:
            sec_01_display = "SECTION 01 — BUSINESS & MARKET OVERVIEW" if is_new_startup else "SECTION 01 — ENTERPRISE BASELINE & EXPANSION SCOPE"
        add_h1(sec_01_display)

        # 1.1 Business Overview
        add_h2("1.1 Business Overview")
        is_new_startup = "new" in stage.lower()
        model_str = summary_info.get("business_model") or "Direct Retail / Service"

        if is_new_startup:
            p1 = (
                f"{biz_name} is a proposed new startup venture within the {category} sector, "
                f"planned for launch in {district}, {province} Province, Sri Lanka. The enterprise is structured under a "
                f"{model_str} business model, providing commercial offerings tailored to the regional catchment. "
                f"As a new venture in its initial setup phase, commercial priorities center on establishing initial operations, "
                f"building customer awareness, and maintaining disciplined operating expenditure."
            )
        else:
            p1 = (
                f"{biz_name} is an established enterprise operating within the {category} sector, "
                f"located in {district}, {province} Province, Sri Lanka. Operating under a {model_str} business model, "
                f"the enterprise aims to execute strategic growth and operational refinement."
            )
        add_body_p(p1)

        desc_text = summary_info.get("business_description")
        if desc_text and desc_text != "Information not provided":
            add_body_p(f"Based on the operational details provided: {desc_text}")
        else:
            add_body_p(
                f"The business is structured to meet consumer demand in {district} through focused service execution, "
                f"relying on founder oversight and targeted local promotions to establish commercial presence."
            )

        # 1.2 Business Concept & Objectives
        add_h2("1.2 Business Concept & Strategic Purpose")
        concept_overview = concept.get("concept_overview", f"Strategic plan for a proposed {category.lower()} in {district}.")
        products_services = concept.get("products_services", f"Commercial offerings within {category}")
        target_cust = concept.get("target_customers", f"Consumers and households in {district}")
        objectives = concept.get("business_objectives", f"Establish a sustainable {category} enterprise in {district}.")

        add_body_p(concept_overview)
        add_bullet_p(products_services, bold_prefix="Primary Commercial Offerings: ")
        add_bullet_p(target_cust, bold_prefix="Target Customer Profile: ")
        add_bullet_p(objectives, bold_prefix="Foundational Objectives: ")

        # 1.3 Market Opportunity
        add_h2("1.3 Market Opportunity & Demand Analysis")
        target_catchment = mkt.get("target_market", f"{district} Catchment")
        cust_per_day = mkt.get("expected_customers_per_day", 0)
        unit_price = mkt.get("expected_selling_price_lkr", 0.0)
        op_days = mkt.get("operating_days_per_month", 26)
        demand_score = mkt.get("customer_demand_score", "50/100")
        monthly_volume = cust_per_day * op_days

        p_mkt_1 = (
            f"The proposed enterprise is positioned to serve the {target_catchment}. "
            f"Based on the entrepreneur's planning assumptions, initial daily patronage is estimated at approximately "
            f"{cust_per_day} customers per day, with an expected average unit price of LKR {unit_price:,.2f}. "
            f"Operating across an estimated {op_days} days per month, the facility anticipates a monthly customer throughput "
            f"of approximately {monthly_volume:,} customer interactions."
        )
        add_body_p(p_mkt_1)

        p_mkt_2 = (
            f"The recorded customer demand score for this business profile is {demand_score}. "
            f"This indicates that demand development and neighborhood visibility will serve as important priorities during "
            f"the initial launch phase, requiring active local marketing to capture and sustain the anticipated footfall volume."
        )
        add_body_p(p_mkt_2)

        # 1.4 Competition & Location
        add_h2("1.4 Competition & Location Dynamics")
        comp_level = comp.get("competition_level", "Moderate")
        comp_count = comp.get("competitor_count_nearby")
        comp_pos = comp.get("competitive_positioning", "Localized service and operational differentiation.")
        loc_suit = loc.get("location_suitability_score", "3/5")
        loc_type = loc.get("location_type", "Commercial Area")
        loc_notes = loc.get("location_considerations", f"Commercial density in {district}.")

        if comp_count is not None and str(comp_count) not in ["0", "Not provided in current business input"]:
            p_comp = (
                f"The local competitive environment is characterized with a competition level of {comp_level}, "
                f"with approximately {comp_count} direct competitor(s) noted in the business intake. "
                f"To secure customer loyalty and avoid price discounting friction, the positioning strategy emphasizes: {comp_pos}"
            )
        else:
            p_comp = (
                f"The local competitive environment is recorded with a competition level of {comp_level}. "
                f"Specific nearby direct competitor counts were not provided in current business inputs. "
                f"To secure customer loyalty, the positioning strategy emphasizes: {comp_pos}"
            )
        add_body_p(p_comp)

        p_loc = (
            f"The operating location in {district} holds a suitability rating of {loc_suit} within a {loc_type} setting. "
            f"{loc_notes} Commercial operations will focus on direct customer service, operational reliability, and targeted local engagement."
        )
        add_body_p(p_loc)

        # =========================================================================
        # SECTION 02 — AI FEASIBILITY & KEY INSIGHTS
        # =========================================================================
        sec_02 = report_data.get("section_02", {})
        feas = sec_02.get("feasibility_assessment", {})
        pred_label = feas.get("final_predicted_label", "Conditionally Feasible")
        conf_pct = feas.get("predicted_probability_percentage") or feas.get("confidence_percentage", "65.0%")
        probs = feas.get("probabilities", {})
        prob_feas = probs.get("Feasible", 0.0)
        prob_cond = probs.get("Conditionally Feasible", 0.0)
        prob_infeas = probs.get("Infeasible", 0.0)

        sec_02_name = sec_02.get("section_title")
        if sec_02_name:
            sec_02_display = f"SECTION {sec_02_name.upper()}" if not sec_02_name.upper().startswith("SECTION") else sec_02_name.upper()
        else:
            sec_02_display = "SECTION 02 — AI FEASIBILITY & KEY INSIGHTS" if is_new_startup else "SECTION 02 — AI FEASIBILITY ASSESSMENT & EXPLANATION"
        add_h1(sec_02_display)

        add_h2("2.1 AI Feasibility Assessment")
        feas_intro = (
            f"Based on the integrated evaluation of financial capital, market demand, operational staffing, and resource readiness, "
            f"SME360 AI assesses {biz_name} as {pred_label} with a predicted class probability of {conf_pct}. "
            f"The multi-class Random Forest feasibility model assigns a predicted probability of {prob_cond:.1%} to Conditionally Feasible, "
            f"{prob_feas:.1%} to Feasible, and {prob_infeas:.1%} to Infeasible. "
            f"The feasibility model developed in this study was trained and evaluated using the dataset used for this research. "
            f"This classification indicates that while the business demonstrates commercial potential, specific operational hurdles "
            f"and working capital safeguards should be addressed during setup."
        )
        add_body_p(feas_intro)

        # Highlighted Feasibility Outcome Box
        add_callout_box(
            f"ASSESSMENT VERDICT: {pred_label.upper()} (Predicted Class Probability: {conf_pct})",
            [f"Class Probabilities: Feasible: {prob_feas:.1%}  |  Conditionally Feasible: {prob_cond:.1%}  |  Infeasible: {prob_infeas:.1%}"],
            bg_hex="F8FAFC"
        )

        # Chart
        try:
            chart_bytes = BusinessPlanChartGenerator.generate_probability_chart(probs)
            p_chart = doc.add_paragraph()
            p_chart.add_run().add_picture(io.BytesIO(chart_bytes), width=Inches(5.5))
            p_chart.paragraph_format.space_after = Pt(6)
        except Exception:
            pass

        # 2.2 Explainable AI Attribution (SHAP)
        add_h2("2.2 Why Did the AI Reach This Assessment? (Explainable AI Attribution)")
        shap_intro = (
            "To provide decision-support transparency, SME360 AI uses SHAP (SHapley Additive exPlanations) values to determine "
            "how specific business parameters influenced the model's classification. Rather than claiming absolute causality, SHAP "
            "identifies features that contributed positive supporting weight toward feasibility versus those that applied downward pressure "
            "as operational hurdles."
        )
        add_body_p(shap_intro)

        shap_info = sec_02.get("shap_explainability", {})
        pos_drivers = shap_info.get("positive_enablers", [])
        neg_drivers = shap_info.get("negative_hurdles", [])

        add_h3("Primary Positive Supporting Factors:")
        if pos_drivers:
            for item in pos_drivers[:3]:
                feat_name = item.get("feature", "Factor")
                val_str = item.get("feature_value", "N/A")
                interp = item.get("business_interpretation", "Contributed positive support to feasibility.")
                add_bullet_p(f"{interp}", bold_prefix=f"{feat_name} ({val_str}): ")
        else:
            add_bullet_p("Baseline capital and operating assumptions align with initial industry requirements.")

        add_h3("Operational Hurdles Requiring Management Attention:")
        if neg_drivers:
            for item in neg_drivers[:3]:
                feat_name = item.get("feature", "Constraint")
                val_str = item.get("feature_value", "N/A")
                interp = item.get("business_interpretation", "Exerted downward pressure, highlighting an operational hurdle.")
                add_bullet_p(f"{interp}", bold_prefix=f"{feat_name} ({val_str}): ")
        else:
            add_bullet_p("Working capital buffer and customer footfall should be closely monitored during the opening months.")

        # =========================================================================
        # SECTION 03 — STRATEGIC RECOMMENDATIONS & DECISION SUPPORT
        # =========================================================================
        sec_03 = report_data.get("section_03", {})
        hitl = sec_03.get("human_in_the_loop_selection", {})
        is_sel = hitl.get("is_user_selected", False)
        active_strat_title = hitl.get("selected_strategy_name", "Lean Bootstrapped Launch")
        ai_strat = sec_03.get("ai_recommended_strategy", {})
        strat_candidates = sec_03.get("available_strategic_alternatives", [])
        ranked_list = sec_03.get("strategy_ranking", [])

        sec_03_name = sec_03.get("section_title")
        if sec_03_name:
            sec_03_display = f"SECTION {sec_03_name.upper()}" if not sec_03_name.upper().startswith("SECTION") else sec_03_name.upper()
        else:
            sec_03_display = "SECTION 03 — STRATEGIC RECOMMENDATIONS & TOPSIS RANKING" if is_new_startup else "SECTION 03 — GROWTH STRATEGY PRIORITIZATION & TOPSIS RANKING"
        add_h1(sec_03_display)

        add_h2("3.1 Strategic Alternatives & Direction")
        strat_intro = (
            f"Based on the feasibility diagnosis and identified operational constraints, SME360 AI formulated four tailored "
            f"strategic pathways for {biz_name}. Rather than proposing a generic one-size-fits-all plan, each alternative "
            f"represents a distinct operational philosophy balancing capital intensity, channel deployment, and resource constraints."
        )
        add_body_p(strat_intro)

        # Individual Strategy Cards
        for s in strat_candidates[:4]:
            s_name = s.get("strategy_name", "Strategy")
            s_focus = s.get("strategic_focus", "Operational Execution")
            s_approach = s.get("operational_approach", "Maintain disciplined operations.")
            s_cap = s.get("estimated_capital_required_lkr", 0.0)
            s_budget = s.get("estimated_monthly_budget_lkr", 0.0)
            s_cust = s.get("target_daily_customers", 0)
            s_score = s.get("topsis_score", "N/A")
            s_rank = s.get("rank", "-")
            s_impact = s.get("expected_feasibility_impact", "Controlled operations")

            # Fallback lookup in ranked_list if rank or topsis_score is missing
            if s_score in ["N/A", None] or s_rank in ["-", None]:
                for r_item in ranked_list:
                    if r_item.get("strategy_id") == s.get("strategy_id") or r_item.get("strategy_name") == s_name:
                        s_rank = r_item.get("rank", s_rank)
                        s_score = str(r_item.get("topsis_score", s_score))
                        break

            lines = [
                f"Strategic Focus: {s_focus} — {s_approach}",
                f"Expected Impact: {s_impact}",
                f"Target Capital: LKR {s_cap:,.0f}  |  Monthly Budget: LKR {s_budget:,.0f}  |  Target Footfall: {s_cust} Customers/Day  |  TOPSIS Closeness: {s_score}"
            ]
            add_callout_box(f"Strategy #{s_rank}: {s_name}", lines, bg_hex="F8FAFC")

        # 3.2 TOPSIS Prioritization Table
        add_h2("3.2 Strategy Prioritization (TOPSIS Multi-Criteria Method)")
        topsis_expl = (
            "The strategic alternatives were evaluated using the TOPSIS (Technique for Order of Preference by "
            "Similarity to Ideal Solution) decision methodology. The evaluation simultaneously weighed five validated criteria: "
            "Financial Viability (25%), Implementation Feasibility (20%), Market Demand Alignment (25%), Resource & Operational Friction (15%), "
            "and Resource Efficiency (15%). The table below summarizes the multi-criteria ranking:"
        )
        add_body_p(topsis_expl)

        # Focused Strategy Comparison Table
        comp_table = doc.add_table(rows=len(ranked_list[:4]) + 1, cols=5)
        comp_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        headers = ["Rank", "Strategy Alternative", "Strategic Focus", "Target Capital", "TOPSIS Score"]
        widths = [Inches(0.6), Inches(2.2), Inches(1.8), Inches(1.4), Inches(1.0)]

        for col_idx, (h_text, w) in enumerate(zip(headers, widths)):
            cell = comp_table.cell(0, col_idx)
            cell.width = w
            BusinessPlanDocxGenerator.set_cell_background(cell, "1E3A8A")
            BusinessPlanDocxGenerator.set_cell_margins(cell, top=100, bottom=100, left=120, right=120)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            r = p.add_run(h_text)
            r.font.name = 'Arial'
            r.font.size = Pt(8.5)
            r.font.bold = True
            r.font.color.rgb = RGBColor(255, 255, 255)

        for row_idx, r_item in enumerate(ranked_list[:4], start=1):
            row_data = [
                f"#{r_item.get('rank', '-')}",
                r_item.get("strategy_name", ""),
                r_item.get("strategic_focus", "Execution"),
                f"LKR {r_item.get('estimated_capital_required_lkr', 0):,.0f}",
                str(r_item.get("topsis_score", "N/A"))
            ]
            for col_idx, val in enumerate(row_data):
                cell = comp_table.cell(row_idx, col_idx)
                cell.width = widths[col_idx]
                bg_color = "F8FAFC" if row_idx % 2 == 1 else "FFFFFF"
                BusinessPlanDocxGenerator.set_cell_background(cell, bg_color)
                BusinessPlanDocxGenerator.set_cell_margins(cell, top=80, bottom=80, left=120, right=120)
                p = cell.paragraphs[0]
                r = p.add_run(val)
                r.font.name = 'Arial'
                r.font.size = Pt(8.5)
                r.font.color.rgb = COLOR_DARK
                if col_idx in [0, 1]:
                    r.font.bold = True

        doc.add_paragraph().paragraph_format.space_after = Pt(4)

        ai_top_stmt = (
            f"Under this multi-criteria analysis, {ai_strat.get('strategy_name')} attained the highest relative closeness score "
            f"({ai_strat.get('topsis_score')}), establishing it as the AI engine's preferred strategic recommendation."
        )
        add_body_p(ai_top_stmt)

        # 3.3 Human-in-the-Loop Narrative Callout
        add_h2("3.3 Entrepreneur Strategic Decision (Human-in-the-Loop Integration)")
        if is_sel:
            hitl_narrative = (
                f"The entrepreneur reviewed the generated alternatives and selected {active_strat_title} to steer operations. "
                f"While the AI system identified {ai_strat.get('strategy_name')} as the highest mathematical candidate under default weights, "
                f"SME360 AI fully respects entrepreneur domain judgment and specific resource preferences. Consequently, all subsequent financial "
                f"plans, operational structures, scenario stress-tests, and execution milestones across this report have been "
                f"re-aligned with the entrepreneur's chosen strategy."
            )
        else:
            hitl_narrative = (
                f"The entrepreneur reviewed the alternatives and confirmed the adoption of the AI's highest-ranked recommendation, "
                f"{active_strat_title} (TOPSIS Score: {ai_strat.get('topsis_score')}). The subsequent financial, operational, and "
                f"implementation plans are directly calibrated to this strategy."
            )
        add_callout_box(
            f"ACTIVE OPERATING STRATEGY: {active_strat_title} ({'Adopted by Entrepreneur' if is_sel else 'Matches AI Rank #1'})",
            [hitl_narrative],
            bg_hex="F0FDF4" if is_sel else "EFF6FF"
        )

        # =========================================================================
        # SECTION 04 — FINANCIAL & OPERATIONAL PLAN
        # =========================================================================
        sec_04 = report_data.get("section_04", {})
        fin_plan = sec_04.get("monthly_financial_plan", {})
        startup = sec_04.get("startup_investment", {})
        funding = sec_04.get("funding_structure", {})
        ops = sec_04.get("operational_plan", {})
        staff = ops.get("staffing", {})
        equip = ops.get("equipment", {})
        supp = ops.get("suppliers", {})
        mkt_plan = sec_04.get("marketing_plan", {})

        target_cap = startup.get("strategy_target_capital_lkr", 0.0)
        monthly_exp = fin_plan.get("monthly_operating_budget_lkr", 0.0)
        est_gross_sales = fin_plan.get("estimated_monthly_gross_sales_lkr", fin_plan.get("estimated_monthly_revenue_lkr", 0.0))
        
        strat_coverage = funding.get("strategy_budget_coverage_months", funding.get("capital_runway_months", 0.0))
        avail_coverage = funding.get("available_funds_coverage_months", funding.get("capital_runway_months", 0.0))
        
        avail_cap = funding.get("available_capital_lkr", funding.get("initial_available_capital_lkr", funding.get("equity_capital_lkr", 0.0)))
        debt_cap = funding.get("debt_financing_lkr", 0.0)
        total_funds = funding.get("total_available_funds_lkr", avail_cap + debt_cap)
        gap_status = startup.get("funding_gap_status", "Fully funded")

        sec_04_name = sec_04.get("section_title")
        if sec_04_name:
            sec_04_display = f"SECTION {sec_04_name.upper()}" if not sec_04_name.upper().startswith("SECTION") else sec_04_name.upper()
        else:
            sec_04_display = "SECTION 04 — FINANCIAL & OPERATIONAL PLAN" if is_new_startup else "SECTION 04 — EXPANSION FINANCIAL & OPERATIONAL PLAN"
        add_h1(sec_04_display)

        # 4.1 Financial Overview
        add_h2(f"4.1 Financial Overview — Aligned with {active_strat_title}")
        fin_p1 = (
            f"To operationalize the chosen strategy, the enterprise establishes a target capital allocation of approximately "
            f"LKR {target_cap:,.0f}. Under the baseline operating budget, recurring monthly operational expenditure is projected "
            f"at LKR {monthly_exp:,.0f}, covering commercial rent, essential payroll, utilities, and routine replenishment inventory. "
            f"With an expected customer throughput of {cust_per_day} customers per day, an expected unit price of LKR {unit_price:,.2f}, "
            f"and an operating schedule of {op_days} days per month, estimated monthly gross sales total approximately "
            f"LKR {est_gross_sales:,.0f}. "
            f"(Note: This is an estimated monthly gross sales calculation based on stated volume, price, and operating days. It does not account for variable costs or net profit.)"
        )
        add_body_p(fin_p1)

        # Highlighted Key Financial Figures Metric Strip
        fin_metrics = [
            ("Target Capital", f"LKR {target_cap:,.0f}", "Baseline Allocation"),
            ("Monthly Budget", f"LKR {monthly_exp:,.0f}", "Operating Expenditure"),
            ("Est. Gross Sales", f"LKR {est_gross_sales:,.0f}", "Volume × Price × Days"),
            ("Budget Coverage", f"{strat_coverage} Mo (Strat)", "Simplified Budget Ratio")
        ]
        add_metric_strip(fin_metrics)

        # 4.2 Funding Position & Simplified Budget Coverage
        add_h3("4.2 Funding Structure & Simplified Budget Coverage")
        fin_p2 = (
            f"The business financing structure comprises LKR {avail_cap:,.0f} in recorded available capital and "
            f"LKR {debt_cap:,.0f} in external loan financing, delivering total initial funding of LKR {total_funds:,.0f}. "
            f"Comparing available capital against the target requirement (LKR {target_cap:,.0f}) indicates that the venture is {gap_status.lower()}. "
            f"Under the baseline operating budget, simplified budget coverage corresponds to approximately {strat_coverage} months "
            f"for the strategy allocation and {avail_coverage} months for total recorded funds. "
            f"(Note: Simplified budget coverage represents a capital-to-budget ratio and does not constitute a guaranteed survival period, as it does not model cash flow cycles or unforeseen costs.)"
        )
        add_body_p(fin_p2)

        # Payback Analysis / Safeguards (For Existing Business Expansion)
        payback_info = sec_04.get("payback_and_roi_analysis")
        if payback_info:
            add_h3("4.2b Expansion Payback & Capital Recovery Analysis")
            if payback_info.get("is_calculated"):
                p_payback = (
                    f"Based on the supplied one-time expansion CapEx and net operating profit baseline, the target investment "
                    f"payback period is estimated at ~{payback_info.get('estimated_payback_months')} months. "
                    f"(Note: This calculation assumes consistent net cash flow generation without unexpected working capital shocks.)"
                )
            else:
                missing_str = ", ".join(payback_info.get("missing_inputs", [])) if payback_info.get("missing_inputs") else "Expansion CapEx and Operating Net Profit"
                p_payback = (
                    f"Payback Analysis Status: Insufficient data to calculate. "
                    f"The following required baseline inputs were not provided: {missing_str}. "
                    f"To prevent misleading financial forecasts, payback period and return on investment are not estimated from gross sales alone."
                )
            add_body_p(p_payback)

        # 4.3 Operational Plan Subsections
        add_h2("4.3 Operational Plan & Resource Allocation")
        avail_staff_num = staff.get("available_staff_count", 1)
        req_staff_num = staff.get("required_staff_count", 1)
        staff_cap_status = staff.get("capacity_status", "Balanced staffing")
        equip_score = equip.get("available_equipment_score", "3/5")
        equip_status = equip.get("readiness_status", "Meets operating baseline")
        supp_score = supp.get("supplier_availability_score", "3/5")
        supp_region = supp.get("network_region", f"Local supplier channels in {district}")

        add_h3("Staffing & Team Capacity:")
        p_staff = (
            f"The enterprise currently deploys {avail_staff_num} active staff member(s) against an estimated requirement of "
            f"{req_staff_num}, representing a {staff_cap_status}. Daily workflow will emphasize clear task specialization "
            f"and cross-training across front-of-house customer relations and stock management to maintain service continuity during peak hours."
        )
        add_body_p(p_staff)

        add_h3("Equipment Readiness & Facilities:")
        p_equip = (
            f"Available equipment readiness is evaluated at {equip_score}, currently satisfying operational requirements ({equip_status}). "
            f"To avoid upfront capital strain, essential commercial fixtures will be prioritized during initial deployment, "
            f"supplemented by preventive maintenance routines and supplier warranty coverage to avoid unscheduled downtime."
        )
        add_body_p(p_equip)

        add_h3("Supplier Logistics & Sourcing Policy:")
        p_supp = (
            f"Regional supplier availability is rated at {supp_score} for {supp_region}. Sourcing strategy will establish "
            f"commercial terms with reliable suppliers for critical inventory to safeguard against stockouts, while maintaining "
            f"controlled initial order quantities to optimize working capital."
        )
        add_body_p(p_supp)

        # 4.4 Marketing Plan
        add_h2("4.4 Marketing & Customer Acquisition Strategy")
        mkt_channel = mkt_plan.get("marketing_channel", "Word of Mouth & Local Channels")
        p_mkt_strat = (
            f"Customer acquisition will concentrate on building awareness within the {district} catchment through {mkt_channel}. "
            f"The marketing framework pairs local community engagement with selective promotional tactics designed to encourage trial and repeat patronage:"
        )
        add_body_p(p_mkt_strat)

        tactics = mkt_plan.get("promotional_tactics", [])
        if tactics:
            for t in tactics[:4]:
                add_bullet_p(t)
        else:
            add_bullet_p("Deploy localized awareness campaigns and neighborhood outreach within the commercial catchment.")
            add_bullet_p("Introduce introductory trial bundles and promotional discounts during opening weeks.")
            add_bullet_p("Implement a customer loyalty program to incentivize repeat visits and patron retention.")
            add_bullet_p("Maintain active digital messaging channels for customer inquiries, bookings, and updates.")

        # =========================================================================
        # SECTION 05 — SCENARIO ANALYSIS & ACTION ROADMAP
        # =========================================================================
        sec_05 = report_data.get("section_05", {})
        scen_list = sec_05.get("what_if_analysis", {}).get("scenarios", [])
        cf = sec_05.get("counterfactual_analysis", {})
        rm = sec_05.get("personalized_action_roadmap", {})
        kpis = sec_05.get("management_monitoring_measures") or sec_05.get("measurable_kpis", [])
        constraints = sec_05.get("operational_constraints_and_management_considerations") or sec_05.get("business_constraints_and_mitigation", [])

        sec_05_name = sec_05.get("section_title")
        if sec_05_name:
            sec_05_display = f"SECTION {sec_05_name.upper()}" if not sec_05_name.upper().startswith("SECTION") else sec_05_name.upper()
        else:
            sec_05_display = "SECTION 05 — SCENARIO ANALYSIS & ACTION ROADMAP" if is_new_startup else "SECTION 05 — PERSONALIZED GROWTH ROADMAP & MONITORING"
        add_h1(sec_05_display)

        # 5.1 What-If Scenarios
        add_h2("5.1 What-If Scenario Sensitivity Analysis")
        scen_intro = (
            "To evaluate business resilience before committing capital, SME360 AI simulated four prospective operational shifts. "
            "These scenarios represent sensitivity simulations rather than guaranteed future outcomes, highlighting how adjustments in "
            "capital, credit, footfall, and operating costs alter the feasibility prediction:"
        )
        add_body_p(scen_intro)

        for sc in scen_list[:4]:
            sc_title = sc.get("title") or sc.get("scenario_name", "Scenario")
            sc_rat = sc.get("rationale", "Sensitivity test.")
            sc_pred = sc.get("new_prediction", "Conditionally Feasible")
            sc_vdelta = sc.get("viability_delta", 0.0)
            sc_impact = sc.get("impact_summary", "Stable sensitivity.")

            shifts_pp = sc.get("class_shifts_percentage_points", {})
            if shifts_pp:
                f_pp = shifts_pp.get("Feasible", "0.0 pp")
                c_pp = shifts_pp.get("Conditionally Feasible", "0.0 pp")
                i_pp = shifts_pp.get("Infeasible", "0.0 pp")
                shifts_str = f"Feasible Δ: {f_pp}  |  Conditionally Feasible Δ: {c_pp}  |  Infeasible Δ: {i_pp}"
            else:
                sc_fdelta = sc.get("feasibility_delta", 0.0) * 100
                shifts_str = f"Feasible Δ: {sc_fdelta:+.1f} percentage points"

            tree_note = sc.get("tree_partition_note", "")

            lines = [
                f"Simulation Objective: {sc_rat}",
                f"Model Impact: Predicted Class: {sc_pred}  |  Viability Index Shift: {sc_vdelta:+.1%}",
                f"Class Shifts (Percentage Points): {shifts_str}",
                f"Analytical Takeaway: {sc_impact}"
            ]
            if tree_note:
                lines.append(f"Note: {tree_note}")

            add_callout_box(f"Scenario: {sc_title}", lines, bg_hex="F8FAFC")

        # 5.2 Counterfactual Analysis
        add_h2("5.2 Capital Boundary Search (Counterfactual Simulation)")
        cf_rec = cf.get("recommendation", "Multiple operational dimensions require joint enhancement.")
        add_callout_box(
            "Capital Boundary Search Finding",
            [
                cf_rec,
                "Insight: Under the tested scenario assumptions, parameter boundary search explores capital adjustments associated with class shifts. Adjusting capital alone does not guarantee a higher classification, as viability depends jointly on demand volume, equipment readiness, and cost discipline. This search identifies sensitivity boundaries under tested conditions and does not represent a global optimum."
            ],
            bg_hex="F8FAFC"
        )

        # 5.3 Action Roadmap (Timeline Format)
        add_h2("5.3 Time-Phased Execution Roadmap & Milestones")
        add_body_p("The implementation roadmap translates strategic recommendations into time-phased execution milestones across four distinct operational horizons:")

        phases = [
            ("Phase 1: Operational Setup & Supplier Sourcing (0 – 30 Days)", rm.get("phase_0_to_30_days", [])),
            ("Phase 2: Customer Acquisition & Burn Control (30 – 90 Days)", rm.get("phase_30_to_90_days", [])),
            ("Phase 3: Operational Stabilization & Review (3 – 6 Months)", rm.get("phase_3_to_6_months", [])),
            ("Phase 4: Commercial Scale & Strategy Review (6 – 12 Months)", rm.get("phase_6_to_12_months", []))
        ]

        for p_title, p_items in phases:
            add_h3(p_title)
            if p_items:
                for item in p_items:
                    add_bullet_p(item)
            else:
                add_bullet_p("Finalize operational setup and monitor performance metrics.")

        # 5.4 Management Monitoring Measures
        add_h2("5.4 Key Management Monitoring Measures")
        add_body_p("To track operational reality against planning assumptions, management should monitor these operational indicators regularly (Note: These represent management monitoring measures, not model predictions):")

        if kpis:
            kpi_table = doc.add_table(rows=len(kpis[:5]) + 1, cols=4)
            kpi_table.alignment = WD_TABLE_ALIGNMENT.CENTER
            kpi_headers = ["Monitoring Measure", "Target Metric", "Review Frequency", "Focus Category"]
            kpi_widths = [Inches(2.0), Inches(2.2), Inches(1.4), Inches(1.4)]

            for col_idx, (h_text, w) in enumerate(zip(kpi_headers, kpi_widths)):
                cell = kpi_table.cell(0, col_idx)
                cell.width = w
                BusinessPlanDocxGenerator.set_cell_background(cell, "1E3A8A")
                BusinessPlanDocxGenerator.set_cell_margins(cell, top=100, bottom=100, left=120, right=120)
                p = cell.paragraphs[0]
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                r = p.add_run(h_text)
                r.font.name = 'Arial'
                r.font.size = Pt(8.5)
                r.font.bold = True
                r.font.color.rgb = RGBColor(255, 255, 255)

            for row_idx, k_item in enumerate(kpis[:5], start=1):
                row_data = [
                    k_item.get("measure_name") or k_item.get("kpi_name", ""),
                    str(k_item.get("target", "")),
                    k_item.get("frequency", "Monthly"),
                    k_item.get("category") or k_item.get("type", "Operational")
                ]
                for col_idx, val in enumerate(row_data):
                    cell = kpi_table.cell(row_idx, col_idx)
                    cell.width = kpi_widths[col_idx]
                    bg_color = "F8FAFC" if row_idx % 2 == 1 else "FFFFFF"
                    BusinessPlanDocxGenerator.set_cell_background(cell, bg_color)
                    BusinessPlanDocxGenerator.set_cell_margins(cell, top=80, bottom=80, left=120, right=120)
                    p = cell.paragraphs[0]
                    r = p.add_run(val)
                    r.font.name = 'Arial'
                    r.font.size = Pt(8.5)
                    r.font.color.rgb = COLOR_DARK
                    if col_idx == 0:
                        r.font.bold = True

            doc.add_paragraph().paragraph_format.space_after = Pt(4)

        # 5.5 Constraints & Practical Management Considerations
        add_h2("5.5 Operational Constraints & Practical Management Considerations")
        for c in constraints[:4]:
            c_name = c.get("constraint", "Constraint")
            c_action = c.get("management_action") or c.get("mitigation", "Management action.")
            add_bullet_p(c_action, bold_prefix=f"{c_name}: ")

        # =========================================================================
        # FINAL AI DECISION RECOMMENDATION & SUMMARY
        # =========================================================================
        final_box = report_data.get("final_recommendation", {})
        add_h1("FINAL AI DECISION RECOMMENDATION")

        verdict_val = final_box.get("ai_feasibility_verdict", pred_label)
        rec_strat_val = final_box.get("ai_recommended_strategy", ai_strat.get("strategy_name", ""))
        chosen_strat_val = final_box.get("entrepreneur_selected_strategy", active_strat_title)
        pos_enabler_val = final_box.get("main_positive_strength", "Available Capital")
        hurdle_val = final_box.get("main_operational_constraint", "Staff Capacity & Burn Control")
        next_step_val = final_box.get("recommended_immediate_next_step", "Confirm initial supplier arrangements, configure ordering channels, and prepare operating workspace.")

        final_summary_narrative = (
            f"Following comprehensive evaluation across financial, market, operational, and algorithmic criteria, SME360 AI assesses "
            f"{biz_name} as {verdict_val}. The entrepreneur has selected {chosen_strat_val} to guide execution, "
            f"establishing a realistic operating framework attuned to current capital and market capacity. "
            f"The primary positive enabler supporting the enterprise is {pos_enabler_val}, while the primary operational hurdle "
            f"requiring proactive management is {hurdle_val}. "
            f"The recommended immediate action is to {next_step_val.lower() if next_step_val.endswith('.') else next_step_val.lower() + '.'}"
        )
        add_body_p(final_summary_narrative)

        # Highlighted Final Recommendation Summary Card
        rec_card_lines = [
            f"AI Recommended Strategy: {rec_strat_val}",
            f"Entrepreneur Selected Strategy: {chosen_strat_val} ({'Adopted Choice' if is_sel else 'Matches AI Rank #1'})",
            f"Primary Positive Enabler: {pos_enabler_val}",
            f"Primary Operational Hurdle: {hurdle_val}",
            f"Immediate Recommended Action Step: {next_step_val}"
        ]
        add_callout_box(f"AI FEASIBILITY ASSESSMENT: {verdict_val.upper()} (Predicted Class Probability: {conf_pct})", rec_card_lines, bg_hex="F8FAFC")

        add_h3("Assumptions & Analytical Disclosures:")
        for a in report_data.get("assumptions_and_considerations", []):
            add_bullet_p(a)

        bio = io.BytesIO()
        doc.save(bio)
        bio.seek(0)
        return bio.getvalue()
