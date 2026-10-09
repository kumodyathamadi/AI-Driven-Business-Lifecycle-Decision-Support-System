import os
import io
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

from backend.services.business_plan_generator.chart_generator import BusinessPlanChartGenerator
from backend.services.business_plan_generator.cover_image_handler import CoverImageHandler

# Path to logo asset
LOGO_PATH = os.path.abspath(os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "frontend", "src", "assets", "logo", "sme360-ai-logo.png"
))

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and draw total page count, 
    running header with logo, running footer, and user-provided cover page if present.
    """
    def __init__(self, *args, **kwargs):
        self.cover_info = kwargs.pop("cover_info", None)
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()  # type: ignore[attr-defined]

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        current_page = self.getPageNumber()

        # If custom cover page is provided, Page 1 is the full A4 cover page
        if self.cover_info and current_page == 1:
            self.saveState()
            try:
                img_reader = ImageReader(io.BytesIO(self.cover_info["image_bytes"]))
                geom = self.cover_info["pdf_geometry"]
                self.drawImage(
                    img_reader,
                    geom["x"],
                    geom["y"],
                    width=geom["width"],
                    height=geom["height"],
                    preserveAspectRatio=True
                )
            except Exception:
                pass
            self.restoreState()
            # Suppress headers, footers, and page numbers on cover page
            return

        # Suppress running header/footer on the business plan title page
        title_page_num = 2 if self.cover_info else 1
        if current_page <= title_page_num:
            return

        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Running Header on A4 (margins 27.6pt, usable width 540pt -> 28 to 568)
        self.setLineWidth(0.5)
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.line(28, 800, 568, 800)
        
        self.drawString(28, 806, "SME360 AI — Strategic Business Plan & Decision Support Report")
        
        if os.path.exists(LOGO_PATH):
            try:
                self.drawImage(LOGO_PATH, 522, 802, width=46, height=18, preserveAspectRatio=True, mask='auto')
            except Exception:
                pass

        # Running Footer
        self.line(28, 45, 568, 45)
        self.drawString(28, 32, "Confidential — Prepared by SME360 AI Decision Support Engine")
        
        if self.cover_info:
            display_page = current_page - 1
            display_total = page_count - 1
            page_text = f"Page {display_page} of {display_total}"
        else:
            page_text = f"Page {current_page} of {page_count}"
            
        self.drawRightString(568, 32, page_text)

        self.restoreState()


class BusinessPlanPDFGenerator:
    """
    Generates a professional, consultancy-grade, research-grounded PDF document
    for SME360 AI Business Plans. Follows a natural narrative structure:
    'BUSINESS STORY -> ANALYSIS -> EXPLANATION -> RECOMMENDATION -> ACTION'
    with structured comparison tables used only where genuinely necessary.
    """

    @staticmethod
    def generate_pdf(report_data: dict) -> bytes:
        raw_cover = report_data.get("cover_image")
        cover_info = None
        if raw_cover:
            try:
                cover_info = CoverImageHandler.process_cover_image(raw_cover)
            except Exception:
                cover_info = None

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=27.6,
            rightMargin=27.6,
            topMargin=54,
            bottomMargin=54
        )

        styles = getSampleStyleSheet()
        
        # Professional Corporate Palette
        primary_color = colors.HexColor("#1e3a8a")  # Deep Navy Blue
        accent_blue = colors.HexColor("#2563eb")    # Vibrant Executive Blue
        dark_text = colors.HexColor("#0f172a")      # Slate 900
        muted_text = colors.HexColor("#475569")     # Slate 600
        card_bg = colors.HexColor("#f8fafc")        # Slate 50
        card_border = colors.HexColor("#cbd5e1")    # Slate 300
        grid_border = colors.HexColor("#e2e8f0")    # Slate 200

        title_style = ParagraphStyle(
            'CoverTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=24,
            leading=30,
            textColor=primary_color,
            spaceAfter=6
        )

        subtitle_style = ParagraphStyle(
            'CoverSubtitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=11,
            leading=15,
            textColor=accent_blue,
            spaceAfter=14
        )

        h1_style = ParagraphStyle(
            'SectionH1',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=13,
            leading=16,
            textColor=primary_color,
            spaceBefore=14,
            spaceAfter=6,
            keepWithNext=True
        )

        h2_style = ParagraphStyle(
            'SectionH2',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=10.5,
            leading=14,
            textColor=accent_blue,
            spaceBefore=10,
            spaceAfter=4,
            keepWithNext=True
        )

        h3_style = ParagraphStyle(
            'SectionH3',
            parent=styles['Heading3'],
            fontName='Helvetica-Bold',
            fontSize=9.5,
            leading=13,
            textColor=colors.HexColor("#1e293b"),
            spaceBefore=7,
            spaceAfter=3,
            keepWithNext=True
        )

        body_style = ParagraphStyle(
            'BodyDark',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8.5,
            leading=12.5,
            textColor=dark_text,
            spaceAfter=5
        )

        bullet_style = ParagraphStyle(
            'BulletDark',
            parent=body_style,
            leftIndent=14,
            firstLineIndent=-9,
            spaceAfter=3.5
        )

        table_header_style = ParagraphStyle(
            'TableHeader',
            parent=body_style,
            fontName='Helvetica-Bold',
            textColor=colors.white,
            fontSize=8,
            leading=10.5
        )

        table_cell_style = ParagraphStyle(
            'TableCell',
            parent=body_style,
            fontSize=8,
            leading=11,
            spaceAfter=0
        )

        story = []

        if cover_info:
            # Page 1 is reserved for the full-page cover image drawn by canvas
            story.append(PageBreak())

        # Helper: Creates a styled callout box
        def create_callout_box(flowables, bg=card_bg, border=card_border, padding=8):
            t = Table([[flowables]], colWidths=[540])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), bg),
                ('BOX', (0,0), (-1,-1), 1, border),
                ('PADDING', (0,0), (-1,-1), padding),
                ('TOPPADDING', (0,0), (-1,-1), padding),
                ('BOTTOMPADDING', (0,0), (-1,-1), padding),
            ]))
            return t

        # Helper: Creates a multi-metric horizontal strip (e.g. 4 metrics)
        def create_metric_strip(metrics):
            num = len(metrics)
            w = 540.0 / num
            cells = []
            for label, val, sub in metrics:
                c = [
                    Paragraph(f"<font color='#64748b' size='7'><b>{label.upper()}</b></font>", body_style),
                    Spacer(1, 1),
                    Paragraph(f"<font color='#1e3a8a' size='10.5'><b>{val}</b></font>", body_style),
                    Spacer(1, 1),
                    Paragraph(f"<font color='#475569' size='7'>{sub}</font>", body_style)
                ]
                cells.append(c)
            t = Table([cells], colWidths=[w]*num)
            t.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
                ('BOX', (0,0), (-1,-1), 1, card_border),
                ('INNERGRID', (0,0), (-1,-1), 0.5, grid_border),
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                ('PADDING', (0,0), (-1,-1), 5),
            ]))
            return t

        # =========================================================================
        # COVER PAGE
        # =========================================================================
        story.append(Spacer(1, 20))
        if os.path.exists(LOGO_PATH):
            try:
                story.append(Image(LOGO_PATH, width=150, height=60))
            except Exception:
                pass
        
        story.append(Spacer(1, 25))
        story.append(HRFlowable(width="100%", thickness=4, color=accent_blue, spaceBefore=0, spaceAfter=18))

        metadata = report_data.get("metadata", {})
        biz_id = report_data.get("business_identity", {})
        biz_name = biz_id.get("business_name", "Enterprise")
        category = biz_id.get("business_category", "SME Business")
        stage = biz_id.get("business_stage", "New Startup")
        district = biz_id.get("district", "Colombo")
        province = biz_id.get("province", "Western")

        is_new_startup = "new" in stage.lower() or "start" in stage.lower()
        doc_title = metadata.get("document_title") or ("STRATEGIC BUSINESS PLAN" if is_new_startup else "STRATEGIC BUSINESS GROWTH & EXPANSION PLAN")
        doc_subtitle = metadata.get("document_subtitle") or (
            "A Comprehensive Feasibility, Strategic Direction & Implementation Blueprint"
            if is_new_startup else
            "AI-Driven Business Growth, Expansion Feasibility & Investment Planning"
        )

        story.append(Paragraph(metadata.get("system_brand", "SME360 AI"), subtitle_style))
        story.append(Paragraph(doc_title, title_style))
        story.append(Paragraph(doc_subtitle, ParagraphStyle('CoverSub2', parent=body_style, fontSize=10, textColor=muted_text, spaceAfter=25)))

        # Metadata Card (Executive Presentation, not a database dump)
        clean_stage_display = "New Startup" if "new" in stage.lower() else "Existing Business"
        meta_items = [
            Paragraph(f"<b>Prepared For:</b> {biz_name}", body_style),
            Paragraph(f"<b>Industry Category:</b> {category} | <b>Business Stage:</b> {clean_stage_display}", body_style),
            Paragraph(f"<b>Operating Location:</b> {district}, {province} Province, Sri Lanka", body_style),
            Paragraph(f"<b>Prepared Date:</b> {metadata.get('generated_date', 'Current')}", body_style),
            Paragraph(f"<b>Decision System Reference:</b> <font color='#64748b'>{metadata.get('record_id', 'N/A')}</font>", body_style)
        ]
        story.append(create_callout_box(meta_items, bg=colors.HexColor("#f8fafc"), border=card_border, padding=12))

        story.append(Spacer(1, 40))
        story.append(Paragraph(
            "<i>This document synthesizes machine-learned feasibility assessment, explainable SHAP feature attribution, "
            "TOPSIS multi-criteria strategic prioritization, and sensitivity scenario stress-testing into an actionable strategic roadmap "
            "prepared specifically for the entrepreneur.</i>",
            ParagraphStyle('Disclaimer', parent=body_style, fontSize=8, leading=11.5, textColor=muted_text)
        ))

        story.append(PageBreak())

        # =========================================================================
        # SECTION 01 — BUSINESS & MARKET OVERVIEW
        # =========================================================================
        sec_01 = report_data.get("section_01", {})
        summary_info = sec_01.get("business_summary", {})
        concept = sec_01.get("business_concept", {})
        market = sec_01.get("market_overview", {})
        comp = sec_01.get("competition", {})
        loc = sec_01.get("location", {})

        sec_01_name = sec_01.get("section_title")
        if sec_01_name:
            sec_01_display = f"SECTION {sec_01_name.upper()}" if not sec_01_name.upper().startswith("SECTION") else sec_01_name.upper()
        else:
            sec_01_display = "SECTION 01 — BUSINESS & MARKET OVERVIEW" if is_new_startup else "SECTION 01 — ENTERPRISE BASELINE & EXPANSION SCOPE"
        story.append(Paragraph(sec_01_display, h1_style))
        story.append(HRFlowable(width="100%", thickness=1.5, color=accent_blue, spaceBefore=0, spaceAfter=8))

        # 1.1 Business Overview Narrative
        story.append(Paragraph("<b>1.1 Business Overview</b>", h2_style))
        
        is_new_startup = "new" in stage.lower()
        model_str = summary_info.get("business_model") or "Direct Retail / Service"
        
        if is_new_startup:
            p1 = (
                f"<b>{biz_name}</b> is a proposed new startup venture within the <b>{category}</b> sector, "
                f"planned for launch in {district}, {province} Province, Sri Lanka. The enterprise is structured under a "
                f"<b>{model_str}</b> model, providing commercial offerings tailored to the local market catchment. "
                f"As a new venture in its initial setup phase, commercial priorities center on establishing initial operations, "
                f"building customer awareness, and maintaining disciplined operating expenditure."
            )
        else:
            p1 = (
                f"<b>{biz_name}</b> is an established enterprise operating within the <b>{category}</b> sector, "
                f"located in {district}, {province} Province, Sri Lanka. Operating under a <b>{model_str}</b> business model, "
                f"the enterprise aims to execute strategic growth and operational refinement."
            )
        story.append(Paragraph(p1, body_style))

        desc_text = summary_info.get("business_description")
        if desc_text and desc_text != "Information not provided":
            p2 = f"Based on the operational details provided: {desc_text}"
            story.append(Paragraph(p2, body_style))
        else:
            p2 = (
                f"The business is structured to meet consumer demand in {district} through focused service execution, "
                f"relying on founder oversight and targeted local promotions to establish commercial presence."
            )
            story.append(Paragraph(p2, body_style))

        # 1.2 Business Concept
        story.append(Spacer(1, 4))
        story.append(Paragraph("<b>1.2 Business Concept & Objectives</b>", h2_style))
        concept_overview = concept.get("concept_overview", f"Strategic plan for a proposed {category.lower()} in {district}.")
        products_services = concept.get("products_services", f"Commercial offerings within {category}")
        target_cust = concept.get("target_customers", f"Consumers and households in {district}")
        objectives = concept.get("business_objectives", f"Establish a sustainable {category} enterprise in {district}.")

        story.append(Paragraph(concept_overview, body_style))
        story.append(Paragraph(f"• <b>Primary Commercial Offerings:</b> {products_services}", bullet_style))
        story.append(Paragraph(f"• <b>Target Customer Profile:</b> {target_cust}", bullet_style))
        story.append(Paragraph(f"• <b>Foundational Objectives:</b> {objectives}", bullet_style))

        # 1.3 Market Opportunity
        story.append(Spacer(1, 4))
        story.append(Paragraph("<b>1.3 Market Opportunity & Demand Analysis</b>", h2_style))
        
        target_catchment = market.get("target_market", f"{district} Catchment")
        cust_per_day = market.get("expected_customers_per_day", 0)
        unit_price = market.get("expected_selling_price_lkr", 0.0)
        op_days = market.get("operating_days_per_month", 26)
        demand_score = market.get("customer_demand_score", "50/100")
        monthly_volume = cust_per_day * op_days

        p_mkt_1 = (
            f"The proposed enterprise is positioned to serve the <b>{target_catchment}</b>. "
            f"Based on the entrepreneur's planning assumptions, initial daily patronage is estimated at approximately "
            f"<b>{cust_per_day} customers per day</b>, with an expected average unit price of <b>LKR {unit_price:,.2f}</b>. "
            f"Operating across an estimated <b>{op_days} days per month</b>, the facility anticipates a monthly customer throughput "
            f"of approximately <b>{monthly_volume:,} customer interactions</b>."
        )
        story.append(Paragraph(p_mkt_1, body_style))

        p_mkt_2 = (
            f"The recorded customer demand score for this business profile is <b>{demand_score}</b>. "
            f"This indicates that demand development and neighborhood visibility will serve as important priorities during "
            f"the initial launch phase, requiring active local marketing to capture and sustain the anticipated footfall volume."
        )
        story.append(Paragraph(p_mkt_2, body_style))

        # 1.4 Competition & Location
        story.append(Spacer(1, 4))
        story.append(Paragraph("<b>1.4 Competition & Location Dynamics</b>", h2_style))
        
        comp_level = comp.get("competition_level", "Moderate")
        comp_count = comp.get("competitor_count_nearby")
        comp_pos = comp.get("competitive_positioning", "Localized service and operational differentiation.")
        loc_suit = loc.get("location_suitability_score", "3/5")
        loc_type = loc.get("location_type", "Commercial Area")
        loc_notes = loc.get("location_considerations", f"Commercial density in {district}.")

        if comp_count is not None and str(comp_count) not in ["0", "Not provided in current business input"]:
            p_comp = (
                f"The local competitive environment is characterized with a competition level of <b>{comp_level}</b>, "
                f"with approximately <b>{comp_count} direct competitor(s)</b> noted in the business intake. "
                f"To secure customer loyalty and avoid price discounting friction, the positioning strategy emphasizes: <i>{comp_pos}</i>"
            )
        else:
            p_comp = (
                f"The local competitive environment is recorded with a competition level of <b>{comp_level}</b>. "
                f"Specific nearby direct competitor counts were not provided in current business inputs. "
                f"To secure customer loyalty, the positioning strategy emphasizes: <i>{comp_pos}</i>"
            )
        story.append(Paragraph(p_comp, body_style))

        p_loc = (
            f"The operating location in {district} holds a suitability rating of <b>{loc_suit}</b> within a <b>{loc_type}</b> setting. "
            f"{loc_notes} Commercial operations will focus on direct customer service, operational reliability, and targeted local engagement."
        )
        story.append(Paragraph(p_loc, body_style))

        story.append(Spacer(1, 10))

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
        story.append(Paragraph(sec_02_display, h1_style))
        story.append(HRFlowable(width="100%", thickness=1.5, color=accent_blue, spaceBefore=0, spaceAfter=8))

        # 2.1 AI Feasibility Statement
        story.append(Paragraph("<b>2.1 AI Feasibility Assessment</b>", h2_style))
        
        feas_intro = (
            f"Based on the integrated evaluation of financial capital, market demand, operational staffing, and resource readiness, "
            f"SME360 AI assesses <b>{biz_name}</b> as <b>{pred_label}</b> with a predicted class probability of <b>{conf_pct}</b>. "
            f"The multi-class Random Forest feasibility model assigns a predicted probability of <b>{prob_cond:.1%}</b> to Conditionally Feasible, "
            f"<b>{prob_feas:.1%}</b> to Feasible, and <b>{prob_infeas:.1%}</b> to Infeasible. "
            f"The feasibility model developed in this study was trained and evaluated using the dataset used for this research. "
            f"This classification indicates that while the business demonstrates commercial potential, specific operational hurdles "
            f"and working capital safeguards should be addressed during setup."
        )
        story.append(Paragraph(feas_intro, body_style))

        # Highlighted Feasibility Outcome Card
        feas_badge_color = "#166534" if pred_label == "Feasible" else "#854d0e" if "Conditionally" in pred_label else "#991b1b"
        feas_card_content = [
            Paragraph(f"<font color='{feas_badge_color}' size='11'><b>ASSESSMENT VERDICT: {pred_label.upper()} (Predicted Class Probability: {conf_pct})</b></font>", body_style),
            Spacer(1, 2),
            Paragraph(f"<font color='#475569'>Class Probabilities: Feasible: <b>{prob_feas:.1%}</b>  |  Conditionally Feasible: <b>{prob_cond:.1%}</b>  |  Infeasible: <b>{prob_infeas:.1%}</b></font>", body_style)
        ]
        story.append(create_callout_box(feas_card_content, bg=colors.HexColor("#f8fafc"), border=card_border, padding=7))

        # Embedded Probability Chart
        try:
            chart_bytes = BusinessPlanChartGenerator.generate_probability_chart(probs)
            chart_img = Image(io.BytesIO(chart_bytes), width=480, height=130)
            story.append(Spacer(1, 5))
            story.append(chart_img)
        except Exception:
            pass

        # 2.2 SHAP Explainability (Narrative, Not Tables)
        story.append(Spacer(1, 4))
        story.append(Paragraph("<b>2.2 Why Did the AI Reach This Assessment? (Explainable AI Attribution)</b>", h2_style))
        
        shap_intro = (
            "To provide decision-support transparency, SME360 AI uses SHAP (SHapley Additive exPlanations) values to determine "
            "how specific business parameters influenced the model's classification. Rather than claiming absolute causality, SHAP "
            "identifies features that contributed positive supporting weight toward feasibility versus those that applied downward pressure "
            "as operational hurdles."
        )
        story.append(Paragraph(shap_intro, body_style))

        shap_info = sec_02.get("shap_explainability", {})
        pos_drivers = shap_info.get("positive_enablers", [])
        neg_drivers = shap_info.get("negative_hurdles", [])

        # Positive Drivers Subsection
        story.append(Spacer(1, 2))
        story.append(Paragraph("<b>Primary Positive Supporting Factors:</b>", h3_style))
        if pos_drivers:
            for item in pos_drivers[:3]:
                feat_name = item.get("feature", "Factor")
                val_str = item.get("feature_value", "N/A")
                interp = item.get("business_interpretation", "Contributed positive support to feasibility.")
                story.append(Paragraph(f"• <b>{feat_name} ({val_str}):</b> {interp}", bullet_style))
        else:
            story.append(Paragraph("• Baseline capital and operating assumptions align with initial industry requirements.", bullet_style))

        # Negative Drivers Subsection
        story.append(Spacer(1, 2))
        story.append(Paragraph("<b>Operational Hurdles Requiring Management Attention:</b>", h3_style))
        if neg_drivers:
            for item in neg_drivers[:3]:
                feat_name = item.get("feature", "Constraint")
                val_str = item.get("feature_value", "N/A")
                interp = item.get("business_interpretation", "Exerted downward pressure, highlighting an operational hurdle.")
                story.append(Paragraph(f"• <b>{feat_name} ({val_str}):</b> {interp}", bullet_style))
        else:
            story.append(Paragraph("• Working capital buffer and customer footfall should be closely monitored during the opening months.", bullet_style))

        story.append(Spacer(1, 10))

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
        story.append(Paragraph(sec_03_display, h1_style))
        story.append(HRFlowable(width="100%", thickness=1.5, color=accent_blue, spaceBefore=0, spaceAfter=8))

        # 3.1 Strategic Direction
        story.append(Paragraph("<b>3.1 Strategic Alternatives & Direction</b>", h2_style))
        strat_intro = (
            f"Based on the feasibility diagnosis and identified operational constraints, SME360 AI formulated four tailored "
            f"strategic pathways for <b>{biz_name}</b>. Rather than proposing a generic one-size-fits-all plan, each alternative "
            f"represents a distinct operational philosophy balancing capital intensity, channel deployment, and resource constraints."
        )
        story.append(Paragraph(strat_intro, body_style))

        # Individual Strategy Cards / Subsections
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

            strat_box_elements = [
                Paragraph(f"<b>Strategy #{s_rank}: {s_name}</b>", ParagraphStyle('StratHead', parent=body_style, fontName='Helvetica-Bold', fontSize=9.5, textColor=primary_color)),
                Spacer(1, 2),
                Paragraph(f"<b>Strategic Focus:</b> {s_focus} — {s_approach}", body_style),
                Paragraph(f"<b>Expected Impact:</b> {s_impact}", body_style),
                Spacer(1, 2),
                Paragraph(
                    f"<font color='#1e3a8a'><b>Target Capital:</b> LKR {s_cap:,.0f}</font>  |  "
                    f"<b>Monthly Budget:</b> LKR {s_budget:,.0f}  |  "
                    f"<b>Target Footfall:</b> {s_cust} Customers/Day  |  "
                    f"<b>TOPSIS Closeness:</b> {s_score}",
                    ParagraphStyle('StratMeta', parent=body_style, fontSize=7.5, textColor=dark_text)
                )
            ]
            story.append(create_callout_box(strat_box_elements, bg=colors.HexColor("#f8fafc"), border=card_border, padding=6))
            story.append(Spacer(1, 4))

        # 3.2 TOPSIS Prioritization Table
        story.append(Spacer(1, 4))
        story.append(Paragraph("<b>3.2 Strategy Prioritization (TOPSIS Multi-Criteria Method)</b>", h2_style))
        topsis_expl = (
            "The strategic alternatives were evaluated using the TOPSIS (Technique for Order of Preference by "
            "Similarity to Ideal Solution) decision methodology. The evaluation simultaneously weighed five validated criteria: "
            "<b>Financial Viability (25%)</b>, <b>Implementation Feasibility (20%)</b>, <b>Market Demand Alignment (25%)</b>, "
            "<b>Resource & Operational Friction (15%)</b>, and <b>Resource Efficiency (15%)</b>. The table below summarizes the multi-criteria ranking:"
        )
        story.append(Paragraph(topsis_expl, body_style))

        comp_table_data = [
            [
                Paragraph("<b>Rank</b>", table_header_style),
                Paragraph("<b>Strategy Alternative</b>", table_header_style),
                Paragraph("<b>Strategic Focus</b>", table_header_style),
                Paragraph("<b>Target Capital</b>", table_header_style),
                Paragraph("<b>TOPSIS Score</b>", table_header_style),
            ]
        ]
        for r in ranked_list[:4]:
            comp_table_data.append([
                Paragraph(f"<b>#{r.get('rank', '-')}</b>", table_cell_style),
                Paragraph(f"<b>{r.get('strategy_name', '')}</b>", table_cell_style),
                Paragraph(r.get("strategic_focus", "Execution"), table_cell_style),
                Paragraph(f"LKR {r.get('estimated_capital_required_lkr', 0):,.0f}", table_cell_style),
                Paragraph(str(r.get("topsis_score", "N/A")), table_cell_style),
            ])
        comp_table = Table(comp_table_data, colWidths=[35, 175, 155, 105, 70])
        comp_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), primary_color),
            ('PADDING', (0,0), (-1,-1), 4.5),
            ('BOX', (0,0), (-1,-1), 1, card_border),
            ('INNERGRID', (0,0), (-1,-1), 0.5, grid_border),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        story.append(comp_table)

        ai_top_stmt = (
            f"Under this multi-criteria analysis, <b>{ai_strat.get('strategy_name')}</b> attained the highest relative closeness score "
            f"(<b>{ai_strat.get('topsis_score')}</b>), establishing it as the AI engine's preferred strategic recommendation."
        )
        story.append(Spacer(1, 4))
        story.append(Paragraph(ai_top_stmt, body_style))

        # 3.3 Human-in-the-Loop Selection Narrative
        story.append(Spacer(1, 4))
        story.append(Paragraph("<b>3.3 Entrepreneur Strategic Decision (Human-in-the-Loop Integration)</b>", h2_style))
        if is_sel:
            hitl_narrative = (
                f"The entrepreneur reviewed the generated alternatives and selected <b>{active_strat_title}</b> to steer operations. "
                f"While the AI system identified {ai_strat.get('strategy_name')} as the highest mathematical candidate under default weights, "
                f"SME360 AI fully respects entrepreneur domain judgment and specific resource preferences. Consequently, all subsequent financial "
                f"plans, operational structures, scenario stress-tests, and execution milestones across this report have been "
                f"re-aligned with the entrepreneur's chosen strategy."
            )
        else:
            hitl_narrative = (
                f"The entrepreneur reviewed the alternatives and confirmed the adoption of the AI's highest-ranked recommendation, "
                f"<b>{active_strat_title}</b> (TOPSIS Score: {ai_strat.get('topsis_score')}). The subsequent financial, operational, and "
                f"implementation plans are directly calibrated to this strategy."
            )
        hitl_box = [
            Paragraph(f"<b>ACTIVE OPERATING STRATEGY:</b> <font color='#1e3a8a'><b>{active_strat_title}</b></font> ({'Adopted by Entrepreneur' if is_sel else 'Matches AI Rank #1'})", body_style),
            Spacer(1, 2),
            Paragraph(hitl_narrative, body_style)
        ]
        story.append(create_callout_box(hitl_box, bg=colors.HexColor("#f0fdf4") if is_sel else colors.HexColor("#eff6ff"), border=colors.HexColor("#86efac") if is_sel else colors.HexColor("#93c5fd"), padding=7))

        story.append(Spacer(1, 10))

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
        story.append(Paragraph(sec_04_display, h1_style))
        story.append(HRFlowable(width="100%", thickness=1.5, color=accent_blue, spaceBefore=0, spaceAfter=8))

        # 4.1 Financial Overview Narrative
        story.append(Paragraph(f"<b>4.1 Financial Overview — Aligned with {active_strat_title}</b>", h2_style))
        
        fin_p1 = (
            f"To operationalize the chosen strategy, the enterprise establishes a target capital allocation of approximately "
            f"<b>LKR {target_cap:,.0f}</b>. Under the baseline operating budget, recurring monthly operational expenditure is projected "
            f"at <b>LKR {monthly_exp:,.0f}</b>, covering commercial rent, essential payroll, utilities, and routine replenishment inventory. "
            f"With an expected customer throughput of <b>{cust_per_day} customers per day</b>, an expected unit price of <b>LKR {unit_price:,.2f}</b>, "
            f"and an operating schedule of <b>{op_days} days per month</b>, estimated monthly gross sales total approximately "
            f"<b>LKR {est_gross_sales:,.0f}</b>. "
            f"<i>(Note: This is an estimated monthly gross sales calculation based on stated volume, price, and operating days. It does not account for variable costs or net profit.)</i>"
        )
        story.append(Paragraph(fin_p1, body_style))

        # Key Financial Figures Metric Strip
        story.append(Spacer(1, 2))
        fin_metrics = [
            ("Target Capital", f"LKR {target_cap:,.0f}", "Baseline Allocation"),
            ("Monthly Budget", f"LKR {monthly_exp:,.0f}", "Operating Expenditure"),
            ("Est. Gross Sales", f"LKR {est_gross_sales:,.0f}", "Volume × Price × Days"),
            ("Budget Coverage", f"{strat_coverage} Mo (Strat)", "Simplified Budget Ratio")
        ]
        story.append(create_metric_strip(fin_metrics))
        story.append(Spacer(1, 4))

        # 4.2 Funding Position & Simplified Budget Coverage
        story.append(Paragraph("<b>4.2 Funding Structure & Simplified Budget Coverage</b>", h3_style))
        fin_p2 = (
            f"The business financing structure comprises <b>LKR {avail_cap:,.0f}</b> in recorded available capital and "
            f"<b>LKR {debt_cap:,.0f}</b> in external loan financing, delivering total initial funding of <b>LKR {total_funds:,.0f}</b>. "
            f"Comparing available capital against the target requirement (LKR {target_cap:,.0f}) indicates that the venture is <b>{gap_status.lower()}</b>. "
            f"Under the baseline operating budget, simplified budget coverage corresponds to approximately <b>{strat_coverage} months</b> "
            f"for the strategy allocation and <b>{avail_coverage} months</b> for total recorded funds. "
            f"<i>(Note: Simplified budget coverage represents a capital-to-budget ratio and does not constitute a guaranteed survival period, as it does not model cash flow cycles or unforeseen costs.)</i>"
        )
        story.append(Paragraph(fin_p2, body_style))

        # Payback Analysis / Safeguards (For Existing Business Expansion)
        payback_info = sec_04.get("payback_and_roi_analysis")
        if payback_info:
            story.append(Spacer(1, 4))
            story.append(Paragraph("<b>4.2b Expansion Payback & Capital Recovery Analysis</b>", h3_style))
            if payback_info.get("is_calculated"):
                p_payback = (
                    f"Based on the supplied one-time expansion CapEx and net operating profit baseline, the target investment "
                    f"payback period is estimated at <b>~{payback_info.get('estimated_payback_months')} months</b>. "
                    f"<i>(Note: This calculation assumes consistent net cash flow generation without unexpected working capital shocks.)</i>"
                )
            else:
                missing_str = ", ".join(payback_info.get("missing_inputs", [])) if payback_info.get("missing_inputs") else "Expansion CapEx and Operating Net Profit"
                p_payback = (
                    f"<b>Payback Analysis Status:</b> <font color='#991b1b'><b>Insufficient data to calculate</b></font>. "
                    f"The following required baseline inputs were not provided: <i>{missing_str}</i>. "
                    f"To prevent misleading financial forecasts, payback period and return on investment are not estimated from gross sales alone."
                )
            story.append(Paragraph(p_payback, body_style))

        # 4.3 Operational Plan Subsections
        story.append(Spacer(1, 4))
        story.append(Paragraph("<b>4.3 Operational Plan & Resource Allocation</b>", h2_style))
        
        avail_staff_num = staff.get("available_staff_count", 1)
        req_staff_num = staff.get("required_staff_count", 1)
        staff_cap_status = staff.get("capacity_status", "Balanced staffing")
        equip_score = equip.get("available_equipment_score", "3/5")
        equip_status = equip.get("readiness_status", "Meets operating baseline")
        supp_score = supp.get("supplier_availability_score", "3/5")
        supp_region = supp.get("network_region", f"Local supplier channels in {district}")

        story.append(Paragraph("<b>Staffing & Workforce Management:</b>", h3_style))
        p_staff = (
            f"The enterprise currently deploys <b>{avail_staff_num} active staff member(s)</b> against an estimated requirement of "
            f"<b>{req_staff_num}</b>, representing a <b>{staff_cap_status}</b>. Daily workflow will emphasize clear task specialization "
            f"and cross-training across front-of-house customer relations and stock management to maintain service continuity during peak hours."
        )
        story.append(Paragraph(p_staff, body_style))

        story.append(Paragraph("<b>Equipment Readiness & Facilities:</b>", h3_style))
        p_equip = (
            f"Available equipment readiness is rated at <b>{equip_score}</b>, currently satisfying operational requirements ({equip_status}). "
            f"To avoid upfront capital strain, essential commercial fixtures will be prioritized during initial deployment, "
            f"supplemented by preventive maintenance routines and supplier warranty coverage to avoid unscheduled downtime."
        )
        story.append(Paragraph(p_equip, body_style))

        story.append(Paragraph("<b>Supplier Logistics & Sourcing Policy:</b>", h3_style))
        p_supp = (
            f"Regional supplier availability is rated at <b>{supp_score}</b> for {supp_region}. Sourcing strategy will establish "
            f"commercial terms with reliable suppliers for critical inventory to safeguard against stockouts, while maintaining "
            f"controlled initial order quantities to optimize working capital."
        )
        story.append(Paragraph(p_supp, body_style))

        # 4.4 Marketing Plan
        story.append(Spacer(1, 4))
        story.append(Paragraph("<b>4.4 Marketing & Customer Acquisition Strategy</b>", h2_style))
        mkt_channel = mkt_plan.get("marketing_channel", "Word of Mouth & Local Channels")
        p_mkt_strat = (
            f"Customer acquisition will concentrate on building awareness within the {district} catchment through <b>{mkt_channel}</b>. "
            f"The marketing framework pairs local community engagement with selective promotional tactics designed to encourage trial and repeat patronage:"
        )
        story.append(Paragraph(p_mkt_strat, body_style))

        tactics = mkt_plan.get("promotional_tactics", [])
        if tactics:
            for t in tactics[:4]:
                story.append(Paragraph(f"• {t}", bullet_style))
        else:
            story.append(Paragraph("• Deploy localized awareness campaigns and neighborhood outreach within the commercial catchment.", bullet_style))
            story.append(Paragraph("• Introduce introductory trial bundles and promotional discounts during opening weeks.", bullet_style))
            story.append(Paragraph("• Implement a customer loyalty program to incentivize repeat visits and patron retention.", bullet_style))
            story.append(Paragraph("• Maintain active digital messaging channels for customer inquiries, bookings, and updates.", bullet_style))

        story.append(Spacer(1, 10))

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
        story.append(Paragraph(sec_05_display, h1_style))
        story.append(HRFlowable(width="100%", thickness=1.5, color=accent_blue, spaceBefore=0, spaceAfter=8))

        # 5.1 What-If Scenarios
        story.append(Paragraph("<b>5.1 What-If Scenario Sensitivity Analysis</b>", h2_style))
        scen_intro = (
            "To evaluate business resilience before committing capital, SME360 AI simulated four prospective operational shifts. "
            "These scenarios represent sensitivity simulations rather than guaranteed future outcomes, highlighting how adjustments in "
            "capital, credit, footfall, and operating costs alter the feasibility prediction:"
        )
        story.append(Paragraph(scen_intro, body_style))

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
                shifts_str = f"Feasible Δ: <b>{f_pp}</b> | Conditionally Feasible Δ: <b>{c_pp}</b> | Infeasible Δ: <b>{i_pp}</b>"
            else:
                sc_fdelta = sc.get("feasibility_delta", 0.0) * 100
                shifts_str = f"Feasible Δ: <b>{sc_fdelta:+.1f} percentage points</b>"

            tree_note = sc.get("tree_partition_note", "")

            sc_box = [
                Paragraph(f"<b>Scenario: {sc_title}</b>", ParagraphStyle('ScHead', parent=body_style, fontName='Helvetica-Bold', fontSize=9, textColor=primary_color)),
                Spacer(1, 1),
                Paragraph(f"<b>Simulation Objective:</b> {sc_rat}", body_style),
                Paragraph(f"<b>Model Impact:</b> Predicted Class: <b>{sc_pred}</b>  |  Viability Index Shift: <b>{sc_vdelta:+.1%}</b>", body_style),
                Paragraph(f"<b>Class Shifts (Percentage Points):</b> {shifts_str}", body_style),
                Paragraph(f"<b>Analytical Takeaway:</b> {sc_impact}", body_style)
            ]
            if tree_note:
                sc_box.append(Paragraph(f"<i>{tree_note}</i>", ParagraphStyle('TreeNote', parent=body_style, fontSize=7.5, textColor=muted_text)))

            story.append(create_callout_box(sc_box, bg=colors.HexColor("#f8fafc"), border=card_border, padding=6))
            story.append(Spacer(1, 3))

        # 5.2 Counterfactual Analysis
        story.append(Spacer(1, 3))
        story.append(Paragraph("<b>5.2 Capital Boundary Search (Counterfactual Simulation)</b>", h2_style))
        cf_rec = cf.get("recommendation", "Multiple operational dimensions require joint enhancement.")
        cf_box = [
            Paragraph(f"<b>Boundary Search Finding:</b> {cf_rec}", body_style),
            Spacer(1, 1),
            Paragraph(
                "<i>Insight: Under the tested scenario assumptions, parameter boundary search explores capital adjustments associated with class shifts. "
                "Adjusting capital alone does not guarantee a higher classification, as viability depends jointly on demand volume, equipment readiness, and cost discipline. "
                "This search identifies sensitivity boundaries under tested conditions and does not represent a global optimum.</i>",
                ParagraphStyle('CfNote', parent=body_style, fontSize=7.5, textColor=muted_text)
            )
        ]
        story.append(create_callout_box(cf_box, bg=colors.HexColor("#f8fafc"), border=card_border, padding=6))

        # 5.3 Action Roadmap
        story.append(Spacer(1, 4))
        story.append(Paragraph("<b>5.3 Time-Phased Execution Roadmap & Milestones</b>", h2_style))
        roadmap_intro = "The implementation roadmap translates strategic recommendations into time-phased execution milestones across four distinct operational horizons:"
        story.append(Paragraph(roadmap_intro, body_style))

        phases = [
            ("Phase 1: Operational Setup & Supplier Sourcing (0 – 30 Days)", rm.get("phase_0_to_30_days", [])),
            ("Phase 2: Customer Acquisition & Burn Control (30 – 90 Days)", rm.get("phase_30_to_90_days", [])),
            ("Phase 3: Operational Stabilization & Review (3 – 6 Months)", rm.get("phase_3_to_6_months", [])),
            ("Phase 4: Commercial Scale & Strategy Review (6 – 12 Months)", rm.get("phase_6_to_12_months", []))
        ]

        for p_title, p_items in phases:
            story.append(Paragraph(f"<b>{p_title}:</b>", h3_style))
            if p_items:
                for item in p_items:
                    story.append(Paragraph(f"• {item}", bullet_style))
            else:
                story.append(Paragraph("• Finalize operational setup and monitor performance metrics.", bullet_style))

        # 5.4 Management Monitoring Measures
        story.append(Spacer(1, 4))
        story.append(Paragraph("<b>5.4 Key Management Monitoring Measures</b>", h2_style))
        story.append(Paragraph("To track operational reality against planning assumptions, management should monitor these operational indicators regularly (Note: These represent management monitoring measures, not model predictions):", body_style))

        if kpis:
            kpi_table_data = [
                [
                    Paragraph("<b>Monitoring Measure</b>", table_header_style),
                    Paragraph("<b>Target Metric</b>", table_header_style),
                    Paragraph("<b>Review Frequency</b>", table_header_style),
                    Paragraph("<b>Focus Category</b>", table_header_style)
                ]
            ]
            for k in kpis[:5]:
                kpi_table_data.append([
                    Paragraph(f"<b>{k.get('measure_name') or k.get('kpi_name', '')}</b>", table_cell_style),
                    Paragraph(str(k.get("target", "")), table_cell_style),
                    Paragraph(k.get("frequency", "Monthly"), table_cell_style),
                    Paragraph(k.get("category") or k.get("type", "Operational"), table_cell_style)
                ])
            kpi_table = Table(kpi_table_data, colWidths=[150, 160, 110, 120])
            kpi_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), primary_color),
                ('PADDING', (0,0), (-1,-1), 4.5),
                ('BOX', (0,0), (-1,-1), 1, card_border),
                ('INNERGRID', (0,0), (-1,-1), 0.5, grid_border),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ]))
            story.append(kpi_table)

        # 5.5 Operational Constraints
        story.append(Spacer(1, 4))
        story.append(Paragraph("<b>5.5 Operational Constraints & Practical Management Considerations</b>", h2_style))
        for c in constraints[:4]:
            c_name = c.get("constraint", "Constraint")
            c_action = c.get("management_action") or c.get("mitigation", "Management action.")
            story.append(Paragraph(f"• <b>{c_name}:</b> {c_action}", bullet_style))

        story.append(Spacer(1, 10))

        # =========================================================================
        # FINAL AI RECOMMENDATION & EXECUTIVE SUMMARY
        # =========================================================================
        final_box = report_data.get("final_recommendation", {})
        story.append(Paragraph("FINAL AI DECISION RECOMMENDATION", h1_style))
        story.append(HRFlowable(width="100%", thickness=1.5, color=accent_blue, spaceBefore=0, spaceAfter=8))

        verdict_val = final_box.get("ai_feasibility_verdict", pred_label)
        rec_strat_val = final_box.get("ai_recommended_strategy", ai_strat.get("strategy_name", ""))
        chosen_strat_val = final_box.get("entrepreneur_selected_strategy", active_strat_title)
        pos_enabler_val = final_box.get("main_positive_strength", "Available Capital")
        hurdle_val = final_box.get("main_operational_constraint", "Staff Capacity & Burn Control")
        next_step_val = final_box.get("recommended_immediate_next_step", "Confirm initial supplier arrangements, configure ordering channels, and prepare operating workspace.")

        final_summary_narrative = (
            f"Following comprehensive evaluation across financial, market, operational, and algorithmic criteria, SME360 AI assesses "
            f"<b>{biz_name}</b> as <b>{verdict_val}</b>. The entrepreneur has selected <b>{chosen_strat_val}</b> to guide execution, "
            f"establishing a realistic operating framework attuned to current capital and market capacity. "
            f"The primary positive enabler supporting the enterprise is <b>{pos_enabler_val}</b>, while the primary operational hurdle "
            f"requiring proactive management is <b>{hurdle_val}</b>. "
            f"The recommended immediate action is to <b>{next_step_val.lower() if next_step_val.endswith('.') else next_step_val.lower() + '.'}</b>"
        )
        story.append(Paragraph(final_summary_narrative, body_style))

        # Highlighted Final Recommendation Summary Card
        rec_card_items = [
            Paragraph(f"<b>AI FEASIBILITY ASSESSMENT:</b> <font color='{feas_badge_color}'><b>{verdict_val.upper()} (Predicted Class Probability: {conf_pct})</b></font>", body_style),
            Paragraph(f"<b>AI RECOMMENDED STRATEGY:</b> {rec_strat_val}", body_style),
            Paragraph(f"<b>ENTREPRENEUR SELECTED STRATEGY:</b> <b>{chosen_strat_val}</b> ({'Adopted Choice' if is_sel else 'Matches AI Rank #1'})", body_style),
            Paragraph(f"<b>PRIMARY POSITIVE ENABLER:</b> {pos_enabler_val}", body_style),
            Paragraph(f"<b>PRIMARY OPERATIONAL HURDLE:</b> {hurdle_val}", body_style),
            Paragraph(f"<b>IMMEDIATE ACTION STEP:</b> <b>{next_step_val}</b>", body_style)
        ]
        story.append(create_callout_box(rec_card_items, bg=colors.HexColor("#f8fafc"), border=card_border, padding=8))

        story.append(Spacer(1, 10))
        story.append(Paragraph("<b>Assumptions & Analytical Disclosures:</b>", h3_style))
        for a in report_data.get("assumptions_and_considerations", []):
            story.append(Paragraph(f"• {a}", bullet_style))

        # Build PDF document
        def canvas_maker(*args, **kwargs):
            kwargs["cover_info"] = cover_info
            return NumberedCanvas(*args, **kwargs)

        doc.build(story, canvasmaker=canvas_maker)
        buffer.seek(0)
        return buffer.getvalue()
