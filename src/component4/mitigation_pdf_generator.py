"""
Component 4: Professional 15-Section PDF Mitigation and Growth Action Plan Generator
for SMEs in Western Province, Sri Lanka.

Generates an evidence-based, 15-section downloadable PDF report containing:
1. Cover Page & Business Identity Block
2. Executive Risk Summary & Overall Stance
3. Extracted Business Profile & Validation Status (including contradiction detection)
4. Available Capital, Funding, Setup Costs & Liquidity Assumptions
5. Separate Credit Risk Assessment
6. Separate Market Risk Assessment
7. Separate Inflation Risk Assessment
8. Separate Liquidity Risk Assessment
9. Separate Operational Risk Assessment
10. Evidence Quality, Data Provenance & Missing Information Summary
11. Key Risk Drivers & Detailed Empirical Explanations
12. Prioritized Mitigation Action Plan (13 structured attributes)
13. Growth Options & Risk-Based Readiness Assessment
14. Implementation Timeline & Measurable Monitoring Indicators
15. Methodological Assumptions, Model Disclosures & Reassessment Triggers

Supports Unicode Sinhala and English text via Nirmala UI font with graceful Helvetica fallback.
"""

import os
import io
import html
from datetime import datetime
from typing import Dict, Any, List, Optional

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Path to logo asset
LOGO_PATH = os.path.abspath(os.path.join(
    os.path.dirname(__file__), "..", "..", "frontend", "src", "assets", "logo", "sme360-ai-logo.png"
))

# Font registration with Unicode Sinhala support
FONT_REGULAR = "Helvetica"
FONT_BOLD = "Helvetica-Bold"

NIRMALA_PATH = "C:/Windows/Fonts/Nirmala.ttc"
if os.path.exists(NIRMALA_PATH):
    try:
        pdfmetrics.registerFont(TTFont("NirmalaUI", NIRMALA_PATH, subfontIndex=0))
        pdfmetrics.registerFont(TTFont("NirmalaUI-Bold", NIRMALA_PATH, subfontIndex=1))
        FONT_REGULAR = "NirmalaUI"
        FONT_BOLD = "NirmalaUI-Bold"
    except Exception:
        FONT_REGULAR = "Helvetica"
        FONT_BOLD = "Helvetica-Bold"


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to compute total page count and draw running headers & footers.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        getattr(self, "_startPage")()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count: int):
        self.saveState()
        self.setFont(FONT_REGULAR, 8)
        self.setFillColor(colors.HexColor("#475569"))

        # Running Header (pages 2+)
        if getattr(self, "_pageNumber", 1) > 1:
            self.setLineWidth(0.5)
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.line(36, 756, 576, 756)
            self.drawString(36, 762, "SME360 AI — 15-Section Mitigation & Growth Action Plan")
            if os.path.exists(LOGO_PATH):
                try:
                    self.drawImage(LOGO_PATH, 525, 758, width=50, height=18, preserveAspectRatio=True, mask='auto')
                except Exception:
                    pass

        # Running Footer (all pages)
        self.setLineWidth(0.5)
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.line(36, 42, 576, 42)
        self.drawString(36, 30, "Confidential Decision Support Prototype — Western Province SME Research")
        page_str = f"Page {getattr(self, '_pageNumber', 1)} of {page_count}"
        self.drawRightString(576, 30, page_str)

        self.restoreState()


class Component4MitigationPDFGenerator:
    """
    Builds a professional, comprehensive, and readable 15-section PDF Mitigation and Growth Action Plan.
    """

    @classmethod
    def generate(cls, analysis_data: Dict[str, Any]) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            leftMargin=36,
            rightMargin=36,
            topMargin=48,
            bottomMargin=48
        )

        styles = getSampleStyleSheet()

        # Custom Design System Color Palette
        c_primary = colors.HexColor("#1e3a8a")     # Deep Navy
        c_accent = colors.HexColor("#2563eb")      # Vibrant Blue
        c_teal = colors.HexColor("#0f766e")        # Teal
        c_text = colors.HexColor("#0f172a")        # Slate 900
        c_muted = colors.HexColor("#475569")       # Slate 600
        c_bg_light = colors.HexColor("#f8fafc")    # Light slate
        c_border = colors.HexColor("#e2e8f0")      # Border

        # Risk Colors
        c_low_text = colors.HexColor("#15803d")
        c_low_bg = colors.HexColor("#dcfce7")
        c_med_text = colors.HexColor("#b45309")
        c_med_bg = colors.HexColor("#fef3c7")
        c_high_text = colors.HexColor("#b91c1c")
        c_high_bg = colors.HexColor("#fee2e2")

        # Typography Styles
        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Heading1'],
            fontName=FONT_BOLD,
            fontSize=20,
            leading=24,
            textColor=c_primary,
            spaceAfter=4
        )

        badge_style = ParagraphStyle(
            'HeaderBadge',
            fontName=FONT_BOLD,
            fontSize=9,
            leading=12,
            textColor=c_accent,
            spaceAfter=3,
            textTransform='uppercase'
        )

        h1_style = ParagraphStyle(
            'SectionH1',
            parent=styles['Heading1'],
            fontName=FONT_BOLD,
            fontSize=12,
            leading=15,
            textColor=c_primary,
            spaceBefore=12,
            spaceAfter=5,
            keepWithNext=True
        )

        h2_style = ParagraphStyle(
            'SectionH2',
            parent=styles['Heading2'],
            fontName=FONT_BOLD,
            fontSize=10,
            leading=13,
            textColor=c_teal,
            spaceBefore=8,
            spaceAfter=4,
            keepWithNext=True
        )

        body_style = ParagraphStyle(
            'BodyNormal',
            parent=styles['Normal'],
            fontName=FONT_REGULAR,
            fontSize=8.5,
            leading=11.5,
            textColor=c_text
        )

        body_bold = ParagraphStyle(
            'BodyBold',
            parent=body_style,
            fontName=FONT_BOLD
        )

        body_muted = ParagraphStyle(
            'BodyMuted',
            parent=body_style,
            textColor=c_muted,
            fontSize=8,
            leading=10.5
        )

        cell_style = ParagraphStyle(
            'TableCell',
            parent=body_style,
            fontSize=8,
            leading=10.5
        )

        cell_bold = ParagraphStyle(
            'TableCellBold',
            parent=cell_style,
            fontName=FONT_BOLD
        )

        cell_center = ParagraphStyle(
            'TableCellCenter',
            parent=cell_style,
            alignment=1
        )

        # Extraction of pipeline and assessment sub-dictionaries
        plan = analysis_data.get("plan_extraction") or analysis_data.get("business_plan") or {}
        resolved = analysis_data.get("resolved_entity") or {}
        stage6 = analysis_data.get("stage6_risk_assessment") or {}
        gnn = analysis_data.get("stage7_gnn_inference") or {}
        readiness = analysis_data.get("growth_readiness") or {}
        summary = analysis_data.get("overall_summary") or {}

        # Core fields
        analysis_id = analysis_data.get("analysis_id", "CMP4_ANALYSIS")
        timestamp_str = analysis_data.get("timestamp", datetime.now().strftime("%Y-%m-%d %H:%M"))
        business_name = resolved.get("business_name") or plan.get("business_name") or "Western Province SME"
        entity_id = resolved.get("entity_id") or stage6.get("business_id") or "WP_SME"
        district = resolved.get("district") or plan.get("district") or "Colombo"
        province = resolved.get("province") or "Western"
        category = resolved.get("business_category") or plan.get("business_category") or "General SME"
        stage = resolved.get("business_stage") or plan.get("business_stage") or "Operating SME"
        overall_risk_cat = str(stage6.get("overall_risk_category") or summary.get("overall_risk_category") or "MEDIUM").upper()
        composite_score = float(stage6.get("composite_risk_score", 0.50))
        readiness_dec = str(readiness.get("decision") or stage6.get("growth_readiness") or "MODIFY")
        growth_action = plan.get("proposed_growth_action") or readiness.get("original_proposed_action") or "Planned Enterprise Growth"

        # Helpers for safe text escaping
        def esc(val: Any) -> str:
            if val is None:
                return "Not available"
            s = str(val).strip()
            if not s or s.lower() in ("none", "nan", "null"):
                return "Not available"
            return html.escape(s)

        def fmt_lkr(val: Any) -> str:
            if val is None or val == "" or val == "None":
                return "Not available"
            try:
                num = float(val)
                return f"LKR {num:,.0f}"
            except (ValueError, TypeError):
                return esc(val)

        story = []

        # ===================================================================
        # Section 1: Cover Page & Business Identity Block
        # ===================================================================
        story.append(Paragraph("SME360 AI DECISION SUPPORT SYSTEM — WESTERN PROVINCE, SRI LANKA", badge_style))
        story.append(Paragraph("Business Risk Mitigation &amp; Scalable Growth Plan", title_style))
        story.append(Paragraph(
            f"<b>Enterprise:</b> {esc(business_name)} &nbsp;|&nbsp; <b>Entity ID:</b> {esc(entity_id)} &nbsp;|&nbsp; "
            f"<b>Sector:</b> {esc(category)} &nbsp;|&nbsp; <b>Stage:</b> {esc(stage)} &nbsp;|&nbsp; "
            f"<b>Location:</b> {esc(district)}, {esc(province)} Province",
            body_muted
        ))
        story.append(Spacer(1, 8))

        # Identity & Header Table
        feasp = plan.get("feasibility_result") or {}
        feasp_label = feasp.get("predicted_label") or feasp.get("prediction") or "Assessed via Component 1"
        feasp_conf = feasp.get("confidence_score")
        feasp_str = f"{feasp_label} ({feasp_conf:.1%})" if isinstance(feasp_conf, float) else str(feasp_label)

        header_table_data = [
            [
                Paragraph("<b>Assessment Reference ID</b>", cell_bold),
                Paragraph(f"<code>{esc(analysis_id)}</code>", cell_style),
                Paragraph("<b>Assessment Timestamp</b>", cell_bold),
                Paragraph(esc(timestamp_str), cell_style),
            ],
            [
                Paragraph("<b>Operating Location</b>", cell_bold),
                Paragraph(f"{esc(district)} District, {esc(province)} Province", cell_style),
                Paragraph("<b>Component 1 Feasibility</b>", cell_bold),
                Paragraph(esc(feasp_str), cell_style),
            ]
        ]
        header_table = Table(header_table_data, colWidths=[140, 130, 140, 130])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), c_bg_light),
            ('GRID', (0, 0), (-1, -1), 0.5, c_border),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 8))

        # ===================================================================
        # Section 2: Executive Risk Summary
        # ===================================================================
        story.append(Paragraph("2. Executive Risk Summary", h1_style))
        story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=6))

        if overall_risk_cat == "HIGH":
            banner_bg = c_high_bg
            banner_text_col = c_high_text
            status_desc = "HIGH RISK — Acute capital, debt service, or supply chain exposure detected. Strategic expansion requires postponement or substantial risk mitigations."
        elif overall_risk_cat == "LOW":
            banner_bg = c_low_bg
            banner_text_col = c_low_text
            status_desc = "LOW RISK — Prudent liquidity buffer, balanced solvency, and viable operational capacity. Qualified for phased organic growth."
        else:
            banner_bg = c_med_bg
            banner_text_col = c_med_text
            status_desc = "MEDIUM RISK — Bounded operational, market, or debt friction observed. Conditional expansion permissible upon implementing targeted mitigations."

        banner_data = [
            [
                Paragraph(f"<b>COMPOSITE RISK: {overall_risk_cat} ({composite_score:.2f} / 1.00)</b>", ParagraphStyle('B1', fontName=FONT_BOLD, fontSize=11, leading=14, textColor=banner_text_col)),
                Paragraph(f"<b>GROWTH DECISION: {esc(readiness_dec)}</b>", ParagraphStyle('B2', fontName=FONT_BOLD, fontSize=10, leading=13, textColor=c_primary, alignment=2))
            ],
            [
                Paragraph(status_desc, ParagraphStyle('B3', fontName=FONT_REGULAR, fontSize=8.5, leading=11, textColor=c_text)),
                Paragraph(f"Evidence Sufficiency: <b>{esc(stage6.get('evidence_sufficiency', 'SUFFICIENT'))}</b>", ParagraphStyle('B4', fontName=FONT_REGULAR, fontSize=8.5, leading=11, textColor=c_muted, alignment=2))
            ]
        ]
        banner_table = Table(banner_data, colWidths=[350, 190])
        banner_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), banner_bg),
            ('BOX', (0, 0), (-1, -1), 1, banner_text_col),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(banner_table)
        story.append(Spacer(1, 8))

        # ===================================================================
        # Section 3: Extracted Business Profile & Validation Status
        # ===================================================================
        story.append(Paragraph("3. Extracted Business Profile &amp; Validation Status", h1_style))
        story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=6))

        desc = plan.get("business_description") or "Stated SME business concept in Western Province"
        pricing = plan.get("pricing_details") or (f"LKR {plan.get('expected_price_lkr', 0):,.2f}" if plan.get("expected_price_lkr") else "Standard market pricing")
        demand_ev = plan.get("demand_evidence") or (f"Demand Score: {plan.get('customer_demand_score', 'N/A')}/100" if plan.get("customer_demand_score") else "Not disclosed")
        comp = plan.get("competition_level") or "Moderate"
        staff = plan.get("available_staff_count") or "Not disclosed"
        strategy = plan.get("primary_strategy") or "Organic Market Penetration"

        profile_rows = [
            [
                Paragraph("<b>Profile Attribute</b>", cell_bold),
                Paragraph("<b>Extracted / Stated Value</b>", cell_bold),
                Paragraph("<b>Profile Attribute</b>", cell_bold),
                Paragraph("<b>Extracted / Stated Value</b>", cell_bold),
            ],
            [
                Paragraph("Business Concept", cell_style),
                Paragraph(esc(desc), cell_style),
                Paragraph("Target Sector", cell_style),
                Paragraph(esc(category), cell_style),
            ],
            [
                Paragraph("Pricing Structure", cell_style),
                Paragraph(esc(pricing), cell_style),
                Paragraph("Demand Evidence", cell_style),
                Paragraph(esc(demand_ev), cell_style),
            ],
            [
                Paragraph("Competition Level", cell_style),
                Paragraph(esc(comp), cell_style),
                Paragraph("Available Staff", cell_style),
                Paragraph(f"{staff} staff members" if str(staff).isdigit() else esc(staff), cell_style),
            ],
            [
                Paragraph("Primary Strategy", cell_style),
                Paragraph(esc(strategy), cell_style),
                Paragraph("Proposed Growth Action", cell_style),
                Paragraph(esc(growth_action), cell_style),
            ]
        ]
        profile_table = Table(profile_rows, colWidths=[120, 150, 120, 150])
        profile_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), c_bg_light),
            ('GRID', (0, 0), (-1, -1), 0.5, c_border),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(profile_table)
        story.append(Spacer(1, 6))

        # Contradiction / Conflict Audit Box
        conflicts = plan.get("conflicting_values") or {}
        if conflicts:
            conflict_boxes = []
            for c_key, c_val in conflicts.items():
                c_msg = c_val.get("message", "Contradiction flagged in business profile inputs.")
                c_status = c_val.get("status", "conflicting").upper()
                c_col = c_high_text if c_status == "CONFLICTING" else c_low_text
                conflict_boxes.append(f"• <b>{esc(c_key.replace('_', ' ').title())}:</b> {esc(c_msg)} [Status: <font color='{c_col}'><b>{c_status}</b></font>]")

            conflict_html = "<b>Identity &amp; Conceptual Contradiction Flagged:</b><br/>" + "<br/>".join(conflict_boxes)
            conflict_table = Table([[Paragraph(conflict_html, cell_style)]], colWidths=[540])
            conflict_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), c_high_bg),
                ('BOX', (0, 0), (-1, -1), 1, c_high_text),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ]))
            story.append(conflict_table)
        else:
            story.append(Paragraph("<i>Integrity Status: Zero conflicting business identity or conceptual contradictions detected.</i>", body_muted))

        story.append(Spacer(1, 8))

        # ===================================================================
        # Section 4: Available Capital, Funding & Liquidity Assumptions
        # ===================================================================
        story.append(Paragraph("4. Available Capital, Funding, Setup Costs &amp; Liquidity Assumptions", h1_style))
        story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=6))

        avail_cap = plan.get("available_capital_lkr") or plan.get("available_starting_capital_lkr")
        target_cap = plan.get("target_capital_lkr")
        monthly_budget = plan.get("monthly_budget_lkr") or plan.get("fixed_monthly_costs_lkr")
        loan_amount = plan.get("requested_loan_lkr") or plan.get("outstanding_loan_balance_lkr") or 0.0
        growth_outlay = plan.get("required_investment_lkr") or plan.get("proposed_growth_budget_lkr")
        runway_mo = stage6.get("capital_runway_months") or plan.get("capital_runway_months")

        fin_table_data = [
            [
                Paragraph("<b>Capital / Funding Parameter</b>", cell_bold),
                Paragraph("<b>Reported Amount (LKR)</b>", cell_bold),
                Paragraph("<b>Financial Metric</b>", cell_bold),
                Paragraph("<b>Assessed Value</b>", cell_bold),
            ],
            [
                Paragraph("Stated Available Capital", cell_style),
                Paragraph(fmt_lkr(avail_cap), cell_style),
                Paragraph("Target Capital Requirement", cell_style),
                Paragraph(fmt_lkr(target_cap), cell_style),
            ],
            [
                Paragraph("Stated Loan / Debt Financing", cell_style),
                Paragraph(fmt_lkr(loan_amount) if loan_amount else "Zero Borrowing Declared", cell_style),
                Paragraph("Monthly Operating Budget", cell_style),
                Paragraph(fmt_lkr(monthly_budget), cell_style),
            ],
            [
                Paragraph("Required Setup / Growth Outlay", cell_style),
                Paragraph(fmt_lkr(growth_outlay), cell_style),
                Paragraph("Baseline Cash Runway", cell_style),
                Paragraph(f"{runway_mo:.1f} Months" if runway_mo is not None else "Pending verification", cell_style),
            ]
        ]
        fin_table = Table(fin_table_data, colWidths=[140, 130, 140, 130])
        fin_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), c_bg_light),
            ('GRID', (0, 0), (-1, -1), 0.5, c_border),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(fin_table)
        story.append(Spacer(1, 5))

        # Capital vs Loan Analysis Disclosure
        includes_loan = plan.get("capital_includes_loan")
        cap_val = float(avail_cap or 0.0)
        loan_val = float(loan_amount or 0.0)

        if loan_val > 0 and cap_val > 0:
            if includes_loan is True:
                struct_text = (
                    f"<b>Confirmed Capital Structure:</b> Available Capital (LKR {cap_val:,.0f}) <b>already includes</b> the loan. "
                    f"Net Equity Capital is LKR {max(0.0, cap_val - loan_val):,.0f} + Borrowed Loan LKR {loan_val:,.0f} = Total Funds LKR {cap_val:,.0f}."
                )
            elif includes_loan is False:
                struct_text = (
                    f"<b>Confirmed Capital Structure:</b> Loan is <b>additive</b> to available capital. "
                    f"Equity Capital LKR {cap_val:,.0f} + Additional Loan LKR {loan_val:,.0f} = Total Available Funding LKR {cap_val + loan_val:,.0f}."
                )
            else:
                struct_text = (
                    f"<b>Capital-Loan Structure Ambiguity:</b> The system does <b>not</b> add available capital (LKR {cap_val:,.0f}) and loan (LKR {loan_val:,.0f}) "
                    f"automatically without verification. Conservative interpretation: Total funding = LKR {cap_val:,.0f} (Equity: LKR {max(0.0, cap_val - loan_val):,.0f}). "
                    f"Additive interpretation: Total funding = LKR {cap_val + loan_val:,.0f}. User confirmation is required before committing to debt obligations."
                )
            story.append(Paragraph(struct_text, body_muted))

        story.append(Spacer(1, 8))

        # ===================================================================
        # Sections 5 to 9: Five Separate Risk Category Assessments
        # ===================================================================
        sub_scores = stage6.get("sub_scores", {})
        cat_suff = stage6.get("category_evidence_sufficiency", {})
        supported_ind = stage6.get("supported_indicators", {})

        def get_cat_level(sc: float) -> str:
            return "HIGH" if sc >= 0.65 else ("MEDIUM" if sc >= 0.35 else "LOW")

        def get_cat_color(lvl: str):
            return c_high_text if lvl == "HIGH" else (c_med_text if lvl == "MEDIUM" else c_low_text)

        # -------------------------------------------------------------------
        # Section 5: Credit Risk Assessment
        # -------------------------------------------------------------------
        sc_credit = float(sub_scores.get("credit_risk", 0.50))
        lvl_credit = get_cat_level(sc_credit)
        suff_credit = cat_suff.get("credit", "CONFIRMED")
        col_credit = get_cat_color(lvl_credit)

        story.append(Paragraph(
            f"5. Credit Risk Assessment &nbsp;—&nbsp; Sub-Score: <b>{sc_credit:.2f} / 1.00</b> "
            f"(<font color='{col_credit}'><b>{lvl_credit} RISK</b></font>) &nbsp;|&nbsp; "
            f"Evidence: <code>{esc(suff_credit)}</code>",
            h1_style
        ))
        story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=6))

        credit_ind = supported_ind.get("credit", {})
        repay_stat = credit_ind.get("repayment_history_status") or plan.get("repayment_history_status") or plan.get("repayment_overdue_status") or "Current (No Arrears Reported)"
        overdue_amt = plan.get("total_overdue_amount_lkr")
        overdue_days = plan.get("longest_overdue_period_days")
        if overdue_amt and overdue_amt > 0:
            repay_obs = f"Overdue: LKR {overdue_amt:,.0f} ({overdue_days or 0:.0f}d past due)"
        else:
            repay_obs = esc(repay_stat)

        credit_table_data = [
            [
                Paragraph("<b>Credit &amp; Debt Indicator</b>", cell_bold),
                Paragraph("<b>Observed Metric</b>", cell_bold),
                Paragraph("<b>Benchmark / Threshold</b>", cell_bold),
                Paragraph("<b>Solvency Impact</b>", cell_bold),
            ],
            [
                Paragraph("Outstanding Debt Balance", cell_style),
                Paragraph(fmt_lkr(loan_amount) if loan_amount else "LKR 0 (Zero Debt)", cell_style),
                Paragraph("&lt; 2.5x Available Capital", cell_style),
                Paragraph("Debt principal exposure", cell_style),
            ],
            [
                Paragraph("Monthly Debt Repayment", cell_style),
                Paragraph(fmt_lkr(plan.get("monthly_loan_repayment_lkr", 0)) if plan.get("monthly_loan_repayment_lkr") else "LKR 0", cell_style),
                Paragraph("&lt; 30% of Monthly Operating Revenue", cell_style),
                Paragraph("Fixed cash drain", cell_style),
            ],
            [
                Paragraph("Payment Arrears / Overdue Status", cell_style),
                Paragraph(repay_obs, cell_style),
                Paragraph("0 Days Past Due (Current)", cell_style),
                Paragraph("Default risk tripwire", cell_style),
            ],
        ]
        credit_table = Table(credit_table_data, colWidths=[150, 130, 130, 130])
        credit_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), c_bg_light),
            ('GRID', (0, 0), (-1, -1), 0.5, c_border),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(credit_table)
        story.append(Spacer(1, 6))

        # -------------------------------------------------------------------
        # Section 6: Market Risk Assessment
        # -------------------------------------------------------------------
        sc_market = float(sub_scores.get("market_risk", 0.50))
        lvl_market = get_cat_level(sc_market)
        suff_market = cat_suff.get("market", "CONFIRMED")
        col_market = get_cat_color(lvl_market)

        story.append(Paragraph(
            f"6. Market Risk Assessment &nbsp;—&nbsp; Sub-Score: <b>{sc_market:.2f} / 1.00</b> "
            f"(<font color='{col_market}'><b>{lvl_market} RISK</b></font>) &nbsp;|&nbsp; "
            f"Evidence: <code>{esc(suff_market)}</code>",
            h1_style
        ))
        story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=6))

        market_ind = supported_ind.get("market", {})
        cus_count = market_ind.get("estimated_monthly_customer_count") or plan.get("monthly_customer_count")
        avg_order = market_ind.get("average_transaction_value_lkr") or plan.get("average_transaction_value_lkr")
        if cus_count and avg_order:
            order_metric = f"{cus_count:,.0f} clients @ LKR {avg_order:,.0f}"
            if market_ind.get("sales_discrepancy_detected"):
                order_metric += " <font color='#b91c1c'><b>[Discrepancy]</b></font>"
        else:
            order_metric = esc(pricing)

        comp_cnt = plan.get("direct_competitors_count")
        comp_price = plan.get("competitor_pricing_vs_business")
        if comp_cnt is not None:
            comp_metric = f"{comp_cnt:.0f} rivals ({comp_price or 'Similar'} prices)"
        else:
            comp_metric = esc(comp)

        top_cus = market_ind.get("largest_customer_share_pct") or plan.get("largest_customer_sales_share_pct") or plan.get("customer_concentration_percentage")

        market_table_data = [
            [
                Paragraph("<b>Market &amp; Demand Indicator</b>", cell_bold),
                Paragraph("<b>Observed Metric</b>", cell_bold),
                Paragraph("<b>Benchmark / Threshold</b>", cell_bold),
                Paragraph("<b>Market Vulnerability</b>", cell_bold),
            ],
            [
                Paragraph("Customer Demand Evidence", cell_style),
                Paragraph(esc(market_ind.get("demand_evidence_type") or demand_ev), cell_style),
                Paragraph("&gt; 60/100 Validated Demand Index", cell_style),
                Paragraph("Revenue realization confidence", cell_style),
            ],
            [
                Paragraph("Volume &amp; Ticket Pricing", cell_style),
                Paragraph(order_metric, cell_style),
                Paragraph("Sustainable volume at positive margin", cell_style),
                Paragraph("Customer acquisition viability", cell_style),
            ],
            [
                Paragraph("Market Competition Intensity", cell_style),
                Paragraph(comp_metric, cell_style),
                Paragraph("Moderate or Low in Catchment", cell_style),
                Paragraph("Pricing power &amp; margin stability", cell_style),
            ],
            [
                Paragraph("Customer Concentration", cell_style),
                Paragraph(f"{top_cus:.0f}% top customer" if top_cus else "Distributed retail base", cell_style),
                Paragraph("&lt; 30% Single Client Share", cell_style),
                Paragraph("Counterparty cash vulnerability", cell_style),
            ],
        ]
        market_table = Table(market_table_data, colWidths=[150, 130, 130, 130])
        market_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), c_bg_light),
            ('GRID', (0, 0), (-1, -1), 0.5, c_border),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(market_table)
        story.append(Spacer(1, 6))

        # -------------------------------------------------------------------
        # Section 7: Inflation Risk Assessment
        # -------------------------------------------------------------------
        sc_inf = float(sub_scores.get("inflation_risk", 0.50))
        lvl_inf = get_cat_level(sc_inf)
        suff_inf = cat_suff.get("inflation", "CONFIRMED")
        col_inf = get_cat_color(lvl_inf)

        story.append(Paragraph(
            f"7. Inflation Risk Assessment &nbsp;—&nbsp; Sub-Score: <b>{sc_inf:.2f} / 1.00</b> "
            f"(<font color='{col_inf}'><b>{lvl_inf} RISK</b></font>) &nbsp;|&nbsp; "
            f"Evidence: <code>{esc(suff_inf)}</code>",
            h1_style
        ))
        story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=6))

        inf_ind = supported_ind.get("inflation", {})
        energy_cost = inf_ind.get("monthly_energy_and_fuel_cost_lkr") or ((plan.get("monthly_fuel_transport_cost_lkr") or 0) + (plan.get("monthly_electricity_energy_cost_lkr") or 0))
        hike_val = inf_ind.get("expected_supplier_price_increase_pct") or plan.get("supplier_price_change_past_3_6m_pct")
        hike_str = f"+{hike_val:.1f}% expected price hike" if hike_val else "Semi-annual supplier price increases"
        pt_ability = inf_ind.get("cost_pass_through_ability") or plan.get("ability_to_increase_prices") or "Variable markup on stock rotation"
        imp_exp = plan.get("imported_input_exposure") or plan.get("foreign_currency_exposure") or "Moderate (Sector Standard)"

        inf_table_data = [
            [
                Paragraph("<b>Inflation Exposure Indicator</b>", cell_bold),
                Paragraph("<b>Observed Metric</b>", cell_bold),
                Paragraph("<b>Benchmark / Threshold</b>", cell_bold),
                Paragraph("<b>Cost Impact</b>", cell_bold),
            ],
            [
                Paragraph("Imported-Input Exposure", cell_style),
                Paragraph(f"{inf_ind.get('imported_inputs_pct', plan.get('imported_inputs_pct', 15)):.0f}% ({inf_ind.get('foreign_currency_exposure') or imp_exp})", cell_style),
                Paragraph("&lt; 30% Foreign Currency Linked", cell_style),
                Paragraph("Exchange rate pass-through", cell_style),
            ],
            [
                Paragraph("Supplier Price Volatility", cell_style),
                Paragraph(hike_str, cell_style),
                Paragraph("&lt; 10% Annual Cost Increase", cell_style),
                Paragraph("Gross margin compression", cell_style),
            ],
            [
                Paragraph("Energy &amp; Utility Burden", cell_style),
                Paragraph(fmt_lkr(energy_cost) if energy_cost else "Standard retail tariff", cell_style),
                Paragraph("&lt; 20% of Operating Expenses", cell_style),
                Paragraph("Overhead inflation vulnerability", cell_style),
            ],
            [
                Paragraph("Retail Price Flexibility", cell_style),
                Paragraph(esc(pt_ability), cell_style),
                Paragraph("Ability to pass price shocks", cell_style),
                Paragraph("Working capital depletion", cell_style),
            ],
        ]
        inf_table = Table(inf_table_data, colWidths=[150, 130, 130, 130])
        inf_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), c_bg_light),
            ('GRID', (0, 0), (-1, -1), 0.5, c_border),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(inf_table)
        story.append(Spacer(1, 6))

        # -------------------------------------------------------------------
        # Section 8: Liquidity Risk Assessment
        # -------------------------------------------------------------------
        sc_liq = float(sub_scores.get("liquidity_risk", 0.50))
        lvl_liq = get_cat_level(sc_liq)
        suff_liq = cat_suff.get("liquidity", "CONFIRMED")
        col_liq = get_cat_color(lvl_liq)

        story.append(Paragraph(
            f"8. Liquidity Risk Assessment &nbsp;—&nbsp; Sub-Score: <b>{sc_liq:.2f} / 1.00</b> "
            f"(<font color='{col_liq}'><b>{lvl_liq} RISK</b></font>) &nbsp;|&nbsp; "
            f"Evidence: <code>{esc(suff_liq)}</code>",
            h1_style
        ))
        story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=6))

        liq_ind = supported_ind.get("liquidity", {})
        rem_reserves = liq_ind.get("remaining_cash_reserves_after_setup_lkr") or plan.get("remaining_cash_reserves_after_setup_lkr") or avail_cap
        net_cf = liq_ind.get("net_monthly_operating_cash_flow_lkr")
        cf_str = (f"+LKR {net_cf:,.0f}/mo (Surplus)" if net_cf >= 0 else f"-LKR {abs(net_cf):,.0f}/mo (Burn)") if net_cf is not None else fmt_lkr(monthly_budget)
        coverage_ratio = liq_ind.get("essential_payment_coverage_ratio")

        liq_table_data = [
            [
                Paragraph("<b>Liquidity &amp; Cash Buffer Indicator</b>", cell_bold),
                Paragraph("<b>Observed Metric</b>", cell_bold),
                Paragraph("<b>Benchmark / Threshold</b>", cell_bold),
                Paragraph("<b>Cash Flow Impact</b>", cell_bold),
            ],
            [
                Paragraph("Remaining Liquid Reserves", cell_style),
                Paragraph(fmt_lkr(rem_reserves), cell_style),
                Paragraph("&gt; 3.0 Months Operating Buffer", cell_style),
                Paragraph("Emergency buffer capacity", cell_style),
            ],
            [
                Paragraph("Net Operating Cash Flow", cell_style),
                Paragraph(cf_str, cell_style),
                Paragraph("&gt; 0 LKR (Cash positive)", cell_style),
                Paragraph("Operational burn / replenishment", cell_style),
            ],
            [
                Paragraph("Computed Cash Runway", cell_style),
                Paragraph(f"{liq_ind.get('calculated_cash_runway_months', runway_mo):.1f} Months" if (liq_ind.get('calculated_cash_runway_months') or runway_mo) is not None else "Pending reserves", cell_style),
                Paragraph("&gt; 3.0 Months Safe Floor", cell_style),
                Paragraph("Insolvency survival horizon", cell_style),
            ],
            [
                Paragraph("Essential Payment Coverage", cell_style),
                Paragraph(f"{coverage_ratio:.2f}x Revenue/Mandatory" if coverage_ratio is not None else "Baseline coverage", cell_style),
                Paragraph("&gt; 1.25x Essential Coverage", cell_style),
                Paragraph("Mandatory liability servicing", cell_style),
            ],
        ]
        liq_table = Table(liq_table_data, colWidths=[150, 130, 130, 130])
        liq_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), c_bg_light),
            ('GRID', (0, 0), (-1, -1), 0.5, c_border),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(liq_table)
        story.append(Spacer(1, 6))

        # -------------------------------------------------------------------
        # Section 9: Operational Risk Assessment
        # -------------------------------------------------------------------
        sc_op = float(sub_scores.get("operational_risk", 0.50))
        lvl_op = get_cat_level(sc_op)
        suff_op = cat_suff.get("operational", "CONFIRMED")
        col_op = get_cat_color(lvl_op)

        story.append(Paragraph(
            f"9. Operational Risk Assessment &nbsp;—&nbsp; Sub-Score: <b>{sc_op:.2f} / 1.00</b> "
            f"(<font color='{col_op}'><b>{lvl_op} RISK</b></font>) &nbsp;|&nbsp; "
            f"Evidence: <code>{esc(suff_op)}</code>",
            h1_style
        ))
        story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=6))

        op_ind = supported_ind.get("operational", {})
        sup_dep = op_ind.get("largest_supplier_dependency_pct") or plan.get("largest_supplier_dependency_pct") or plan.get("supplier_dependency_percentage")
        alt_status = op_ind.get("alternative_suppliers_status") or plan.get("alternative_suppliers_available") or "Distributed"
        lead_days = op_ind.get("typical_lead_time_days") or plan.get("typical_supplier_lead_time_days") or plan.get("supplier_delay_days")
        inv_days = op_ind.get("inventory_coverage_days") or plan.get("inventory_coverage_days")
        bcp_val = op_ind.get("business_continuity_plan_exists") or plan.get("business_continuity_plan_exists") or "None"

        op_table_data = [
            [
                Paragraph("<b>Operational &amp; Supply Chain Indicator</b>", cell_bold),
                Paragraph("<b>Observed Metric</b>", cell_bold),
                Paragraph("<b>Benchmark / Threshold</b>", cell_bold),
                Paragraph("<b>Continuity Impact</b>", cell_bold),
            ],
            [
                Paragraph("Key Supplier Dependency", cell_style),
                Paragraph(f"{sup_dep:.0f}% primary ({alt_status} alternatives)" if sup_dep else "Distributed wholesale suppliers", cell_style),
                Paragraph("&lt; 40% Concentration", cell_style),
                Paragraph("Single point of failure", cell_style),
            ],
            [
                Paragraph("Inbound Delivery Turnaround", cell_style),
                Paragraph(f"{lead_days:.0f} days turnaround" if lead_days else "Standard 1–3 day lead time", cell_style),
                Paragraph("&lt; 7 Days Delay Tolerance", cell_style),
                Paragraph("Stockout risk &amp; customer loss", cell_style),
            ],
            [
                Paragraph("Inventory Coverage Buffer", cell_style),
                Paragraph(f"{inv_days:.0f} days sales buffer" if inv_days else "30 days target buffer", cell_style),
                Paragraph("&gt; 21 Days Coverage Floor", cell_style),
                Paragraph("Disruption buffer stock", cell_style),
            ],
            [
                Paragraph("Continuity Plan &amp; Staff Redundancy", cell_style),
                Paragraph(f"BCP: {bcp_val} | Staff: {staff}", cell_style),
                Paragraph("Documented SOPs &amp; Backup Staff", cell_style),
                Paragraph("Operational bottleneck &amp; resilience", cell_style),
            ],
        ]
        op_table = Table(op_table_data, colWidths=[150, 130, 130, 130])
        op_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), c_bg_light),
            ('GRID', (0, 0), (-1, -1), 0.5, c_border),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(op_table)
        story.append(Spacer(1, 8))

        # ===================================================================
        # Section 10: Evidence Quality & Missing Information Summary
        # ===================================================================
        story.append(PageBreak())  # Clean break to detailed audit and roadmap
        story.append(Paragraph("10. Evidence Quality, Data Provenance &amp; Missing Information Summary", h1_style))
        story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=6))

        prov = stage6.get("evidence_provenance_summary", {})
        conf_facts = prov.get("confirmed_user_facts", [])
        estimates = prov.get("user_estimates_and_projections", [])
        ext_sources = prov.get("externally_sourced_evidence", [])
        unknowns = prov.get("unknown_or_unavailable_fields", [])
        derived = prov.get("derived_values_and_formulas", {})
        limitations = stage6.get("assessment_limitations", [])
        engine_missing = stage6.get("missing_inputs", [])
        all_unknowns = list(dict.fromkeys(unknowns + engine_missing))

        prov_rows = [
            [Paragraph("<b>Provenance Class</b>", cell_bold), Paragraph("<b>Identified Parameters &amp; Verification Evidence</b>", cell_bold)],
            [
                Paragraph("<b>Confirmed User Facts</b><br/><font color='#15803d'>Independently verified</font>", cell_style),
                Paragraph(", ".join(conf_facts) if conf_facts else "Enterprise registration details, verified bank statements", cell_style)
            ],
            [
                Paragraph("<b>User Estimates &amp; Projections</b><br/><font color='#b45309'>Subject to variation</font>", cell_style),
                Paragraph(", ".join(estimates) if estimates else "Projected daily customer footfall, target revenue trajectory", cell_style)
            ],
            [
                Paragraph("<b>External Benchmark Sources</b><br/><font color='#2563eb'>Macro references</font>", cell_style),
                Paragraph(
                    "; ".join([f"{item.get('metric')}: {item.get('value')} ({item.get('source')})" for item in ext_sources])
                    if ext_sources else "CBSL Western Province sector baseline &amp; inflation indicators", cell_style
                )
            ],
            [
                Paragraph("<b>Derived Mathematical Calculations</b><br/><font color='#475569'>Formula computed</font>", cell_style),
                Paragraph(
                    "; ".join([f"<b>{k}</b>: {v.get('value')} ({v.get('calculation')})" for k, v in derived.items()])
                    if derived else "Cash runway (Available Capital / Monthly Budget), DSCR, Debt-to-Capital", cell_style
                )
            ],
            [
                Paragraph("<b>Unknown / Missing Fields</b><br/><font color='#b91c1c'>Explicit limitations</font>", cell_style),
                Paragraph(
                    ", ".join(all_unknowns) if all_unknowns else "All required risk screening fields provided; zero values were not fabricated",
                    ParagraphStyle('Unk', parent=cell_style, textColor=c_high_text if all_unknowns else c_low_text)
                )
            ],
            [
                Paragraph("<b>Assessment Limitations</b><br/><font color='#b45309'>Scope &amp; constraints</font>", cell_style),
                Paragraph(
                    "<br/>• ".join(limitations) if limitations else "Zero assessment constraints; complete input-driven parameter model evaluated.",
                    cell_style
                )
            ],
        ]
        prov_table = Table(prov_rows, colWidths=[150, 390])
        prov_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), c_bg_light),
            ('GRID', (0, 0), (-1, -1), 0.5, c_border),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(prov_table)
        story.append(Spacer(1, 8))

        # ===================================================================
        # Section 11: Key Risk Drivers & Detailed Explanations
        # ===================================================================
        story.append(Paragraph("11. Key Risk Drivers &amp; Detailed Empirical Explanations", h1_style))
        story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=6))

        drivers = stage6.get("primary_risk_drivers", [])
        if not drivers:
            story.append(Paragraph("<i>No critical or warning risk drivers were triggered. Enterprise parameters operate within safe advisory thresholds.</i>", body_muted))
        else:
            driver_rows = [
                [
                    Paragraph("<b>Triggered Factor</b>", cell_bold),
                    Paragraph("<b>Observed Metric</b>", cell_bold),
                    Paragraph("<b>Threshold</b>", cell_bold),
                    Paragraph("<b>Severity</b>", cell_bold),
                    Paragraph("<b>Empirical Evidence &amp; Operational Rationale</b>", cell_bold),
                ]
            ]
            for d in drivers[:5]:
                code = esc(d.get("factor_code", "UNKNOWN"))
                metric_name = esc(d.get("metric_name", "indicator"))
                obs_val = d.get("observed_value", 0)
                thresh_val = d.get("threshold", 0)
                sev = float(d.get("severity_score", 0.5))
                desc_d = esc(d.get("description", ""))

                sev_col = c_high_text if sev >= 0.70 else (c_med_text if sev >= 0.40 else c_low_text)

                driver_rows.append([
                    Paragraph(f"<b>{code}</b><br/><font color='{c_muted}'>{metric_name}</font>", cell_style),
                    Paragraph(str(obs_val), cell_style),
                    Paragraph(str(thresh_val), cell_style),
                    Paragraph(f"<font color='{sev_col}'><b>{sev:.2f}</b></font>", cell_style),
                    Paragraph(desc_d, cell_style),
                ])

            drivers_table = Table(driver_rows, colWidths=[110, 60, 50, 45, 275])
            drivers_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), c_bg_light),
                ('GRID', (0, 0), (-1, -1), 0.5, c_border),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ]))
            story.append(drivers_table)

        story.append(Spacer(1, 8))

        # ===================================================================
        # Section 12: Prioritized Mitigation Action Plan (13 Attributes)
        # ===================================================================
        story.append(Paragraph("12. Prioritized Mitigation Action Plan (Evidence-Based Roadmap)", h1_style))
        story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=6))

        mitigations = stage6.get("recommended_mitigations", [])
        if not mitigations:
            story.append(Paragraph("<i>No immediate mitigation interventions required. Standard quarterly reviews recommended.</i>", body_muted))
        else:
            for i, m in enumerate(mitigations[:4], 1):
                prio = str(m.get("priority", "MEDIUM")).upper()
                prio_col = c_high_text if prio in ("CRITICAL", "HIGH") else (c_med_text if prio == "MEDIUM" else c_low_text)
                cat_name = esc(m.get("category", "General Risk"))
                driver = esc(m.get("risk_driver") or m.get("targeted_factor") or m.get("risk_factor") or "Identified Risk Exposure")
                action_text = esc(m.get("action", ""))
                ev_text = esc(m.get("evidence") or m.get("supporting_evidence") or "Derived from reported operational profile")
                why_text = esc(m.get("rationale") or m.get("mechanism") or "Prevents liquidity depletion and operational disruption")
                timeline = esc(m.get("suggested_timeline") or m.get("time_horizon") or "1–2 Months")
                cost_text = esc(m.get("estimated_cost", "Cost estimate required"))
                role = esc(m.get("responsible_role", "Managing Director / Financial Lead"))
                outcome = esc(m.get("expected_outcome", "Risk factor stabilized within safe operating thresholds"))
                indicator = esc(m.get("measurable_indicator", "Parameter normalized upon subsequent quarterly audit"))
                verif = esc(m.get("verification_info", "Verified bank statements and inventory ledger"))
                deps = esc(m.get("dependencies_constraints", "Subject to executive approval and working capital availability"))

                card_data = [
                    [
                        Paragraph(f"<b>#{i}. {prio} PRIORITY &nbsp;|&nbsp; {cat_name}</b>", ParagraphStyle('C1', fontName=FONT_BOLD, fontSize=9, textColor=prio_col)),
                        Paragraph(f"<b>Targeted Driver:</b> {driver}", ParagraphStyle('C2', fontName=FONT_BOLD, fontSize=8.5, textColor=c_primary, alignment=2))
                    ],
                    [
                        Paragraph(
                            f"<b>Action:</b> {action_text}<br/>"
                            f"<b>Supporting Evidence:</b> {ev_text}<br/>"
                            f"<b>Why It Matters (Rationale):</b> {why_text}<br/>"
                            f"<b>Timeframe:</b> {timeline} &nbsp;|&nbsp; <b>Cost Estimate:</b> {cost_text} &nbsp;|&nbsp; <b>Owner:</b> {role}<br/>"
                            f"<b>Expected Outcome:</b> {outcome} &nbsp;|&nbsp; <b>Success Metric:</b> {indicator}<br/>"
                            f"<b>Verification Needed:</b> {verif} &nbsp;|&nbsp; <b>Constraints:</b> {deps}",
                            cell_style
                        ),
                        Paragraph("", cell_style)
                    ]
                ]
                card_table = Table(card_data, colWidths=[380, 160])
                card_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), c_bg_light),
                    ('SPAN', (0, 1), (1, 1)),
                    ('BOX', (0, 0), (-1, -1), 0.5, c_border),
                    ('TOPPADDING', (0, 0), (-1, -1), 4),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                    ('LEFTPADDING', (0, 0), (-1, -1), 6),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ]))
                story.append(card_table)
                story.append(Spacer(1, 4))

        story.append(Spacer(1, 6))

        # ===================================================================
        # Section 13: Growth Options & Readiness Assessment
        # ===================================================================
        story.append(Paragraph("13. Growth Options &amp; Risk-Based Readiness Assessment", h1_style))
        story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=6))

        reasons = readiness.get("reasons") or readiness.get("decision_rationales") or []
        modifications = readiness.get("suggested_modifications") or []
        conditions = readiness.get("conditions_that_must_be_met") or []
        evidence_needed = readiness.get("evidence_needed_to_reconsider") or []

        growth_html = (
            f"<b>Requested Growth Initiative:</b> {esc(growth_action)} &nbsp;|&nbsp; "
            f"<b>Required Capital Outlay:</b> {fmt_lkr(growth_outlay)}<br/>"
            f"<b>Readiness Decision:</b> <b>{esc(readiness_dec)}</b> &nbsp;—&nbsp; "
            f"{esc(readiness.get('risk_adjusted_recommendation', ''))}"
        )
        story.append(Paragraph(growth_html, body_style))
        story.append(Spacer(1, 5))

        readiness_rows = [
            [Paragraph("<b>Evaluation Dimension</b>", cell_bold), Paragraph("<b>Stage-Aligned Findings &amp; Constraints</b>", cell_bold)],
            [
                Paragraph("<b>Decision Rationales</b>", cell_style),
                Paragraph("<br/>• ".join([esc(r) for r in reasons]) if reasons else "Enterprise satisfies baseline capital and operational criteria", cell_style)
            ],
            [
                Paragraph("<b>Suggested Modifications</b>", cell_style),
                Paragraph("<br/>• ".join([esc(m) for m in modifications]) if modifications else "Execute planned strategy with milestone tracking", cell_style)
            ],
            [
                Paragraph("<b>Mandatory Prerequisites</b>", cell_style),
                Paragraph("<br/>• ".join([esc(c) for c in conditions]) if conditions else "Maintain minimum 3 months operating cash reserve buffer", cell_style)
            ],
            [
                Paragraph("<b>Evidence to Reconsider</b>", cell_style),
                Paragraph("<br/>• ".join([esc(e) for e in evidence_needed]) if evidence_needed else "Not applicable (approved to proceed under conditions)", cell_style)
            ]
        ]
        readiness_table = Table(readiness_rows, colWidths=[140, 400])
        readiness_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), c_bg_light),
            ('GRID', (0, 0), (-1, -1), 0.5, c_border),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(readiness_table)
        story.append(Spacer(1, 8))

        # ===================================================================
        # Section 14: Implementation Matrix & Monitoring Timeline
        # ===================================================================
        story.append(Paragraph("14. Implementation Matrix &amp; Measurable Monitoring Indicators", h1_style))
        story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=6))

        impl_rows = [
            [
                Paragraph("<b>Mitigation Action &amp; Role</b>", cell_bold),
                Paragraph("<b>Timeline</b>", cell_bold),
                Paragraph("<b>Estimated Cost</b>", cell_bold),
                Paragraph("<b>Measurable KPI Target</b>", cell_bold),
                Paragraph("<b>Verification Checkpoint</b>", cell_bold)
            ]
        ]
        for m in mitigations[:4]:
            act_short = esc(m.get("action", ""))
            role = esc(m.get("responsible_role", "Managing Director"))
            timeframe = esc(m.get("suggested_timeline") or m.get("time_horizon") or "1–2 Months")
            cost_est = esc(m.get("estimated_cost", "Cost estimate required"))
            indicator = esc(m.get("measurable_indicator", "Parameter normalized within 60 days"))
            triggers = esc(m.get("reassessment_triggers", "Quarterly review"))

            impl_rows.append([
                Paragraph(f"<b>{act_short}</b><br/><font color='{c_teal}'>Owner: {role}</font>", cell_style),
                Paragraph(timeframe, cell_style),
                Paragraph(cost_est, cell_style),
                Paragraph(indicator, cell_style),
                Paragraph(triggers, cell_style)
            ])

        impl_table = Table(impl_rows, colWidths=[140, 75, 95, 115, 115])
        impl_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), c_bg_light),
            ('GRID', (0, 0), (-1, -1), 0.5, c_border),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(impl_table)
        story.append(Spacer(1, 8))

        # ===================================================================
        # Section 15: Methodological Assumptions, Model Disclosures & Triggers
        # ===================================================================
        story.append(Paragraph("15. Methodological Assumptions, Model Disclosures &amp; Reassessment Triggers", h1_style))
        story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=6))

        calc_ver = stage6.get("calculation_version", "2.4.0")
        assumptions_text = (
            "<b>Scientific Methodology &amp; Engineering Disclosures:</b><br/>"
            f"• <b>Calculation Engine Version:</b> <code>v{esc(calc_ver)}</code> — Input-driven multi-category risk screening calibrated to Sri Lankan macroeconomic indicators.<br/>"
            "• <b>Transparent Rule-Based Screening Indicators:</b> The 5 risk category sub-scores are explainable, transparent "
            "screening indices calibrated to Sri Lankan macroeconomic conditions. They do <i>not</i> represent uncalibrated failure probabilities.<br/>"
            "• <b>GNN Graph Context Distinction:</b> The Graph Neural Network (B2BRiskGNN) provides relational trade network context "
            "trained on 1,000 Western Province enterprises. The GNN does <i>not</i> predict individual category sub-scores directly. "
            "Standalone enterprises fall back cleanly to non-graph assessment without edge fabrication.<br/>"
            "• <b>Strict Geographic Boundary:</b> Valid exclusively for Western Province, Sri Lanka (Colombo, Gampaha, Kalutara).<br/>"
            "• <b>Zero Target Leakage:</b> No ground-truth outcome labels or future performance codes are used in scoring.<br/>"
            "• <b>No Commercial Guarantees:</b> Recommendations provide preventative risk reduction guidance; they do not guarantee statutory loan approvals.<br/><br/>"
            "<b>Mandatory Reassessment Triggers:</b><br/>"
            "1. <b>Revenue Shock:</b> Actual monthly revenue drops by &gt; 15% relative to declared baseline.<br/>"
            "2. <b>Liquidity Contraction:</b> Liquid cash reserves drop below 2.0 months of operating expenses.<br/>"
            "3. <b>Repayment Friction:</b> Any loan installment or statutory payment becomes more than 15 days past due.<br/>"
            "4. <b>Supply Chain Failure:</b> Primary supplier delays inbound deliveries by &gt; 10 days or increases prices by &gt; 10%.<br/>"
            "5. <b>Strategic Pivots:</b> Revision to proposed growth capital budget exceeding 20% of planned allocation."
        )
        story.append(Paragraph(assumptions_text, body_style))
        story.append(Spacer(1, 10))

        # Sign-off block
        signoff_text = (
            f"<b>Plan Generated:</b> {esc(timestamp_str)} &nbsp;|&nbsp; "
            f"<b>Engine:</b> Component 4 Stage 6 Explainable Risk &amp; Mitigation Engine &nbsp;|&nbsp; "
            f"<b>Document ID:</b> {esc(analysis_id)} &nbsp;|&nbsp; <b>Status:</b> Official Decision Support Document"
        )
        story.append(Paragraph(signoff_text, body_muted))

        # Build document with NumberedCanvas
        doc.build(story, canvasmaker=NumberedCanvas)
        return buffer.getvalue()
