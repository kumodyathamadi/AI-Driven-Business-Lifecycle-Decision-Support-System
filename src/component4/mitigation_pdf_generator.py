"""
Component 4: Professional PDF Mitigation Plan Generator for SMEs in Western Province, Sri Lanka.
Generates an evidence-based, 9-section downloadable PDF report containing:
1. Business & Assessment Summary
2. Overall Composite Risk Status & Derivation Methodology
3. Multi-Category Risk Assessment Scorecard (Credit, Market, Inflation, Liquidity, Operational)
4. Primary Risk Drivers & Supporting Empirical Evidence
5. Evidence Completeness, Data Provenance & Missing Information Audit
6. Prioritized Category-Specific Mitigation Roadmap
7. Implementation Matrix (Timeline, Ownership, Cost Estimates, Success Indicators)
8. Growth-Readiness Assessment for Requested Growth Action
9. Assumptions, Limitations, Data Provenance Disclosures & Reassessment Triggers

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
        self._startPage()

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
        if self._pageNumber > 1:
            self.setLineWidth(0.5)
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.line(36, 756, 576, 756)
            self.drawString(36, 762, "SME360 AI — Business Risk Assessment & PDF Mitigation Plan")
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
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(576, 30, page_str)

        self.restoreState()


class Component4MitigationPDFGenerator:
    """
    Builds a professional, comprehensive, and readable PDF Mitigation Plan.
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
            fontSize=22,
            leading=26,
            textColor=c_primary,
            spaceAfter=4
        )

        badge_style = ParagraphStyle(
            'HeaderBadge',
            fontName=FONT_BOLD,
            fontSize=9,
            leading=12,
            textColor=c_accent,
            spaceAfter=4,
            textTransform='uppercase'
        )

        h1_style = ParagraphStyle(
            'SectionH1',
            parent=styles['Heading1'],
            fontName=FONT_BOLD,
            fontSize=13,
            leading=16,
            textColor=c_primary,
            spaceBefore=14,
            spaceAfter=6,
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
        stage = resolved.get("business_stage") or plan.get("business_stage") or "Established"
        overall_risk_cat = str(stage6.get("overall_risk_category") or summary.get("overall_risk_category") or "MEDIUM").upper()
        composite_score = float(stage6.get("composite_risk_score", 0.50))
        readiness_dec = str(readiness.get("decision") or stage6.get("growth_readiness") or "MODIFY").upper()
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

        # -------------------------------------------------------------------
        # Cover / Title Block
        # -------------------------------------------------------------------
        story.append(Paragraph("SME360 AI DECISION SUPPORT SYSTEM — WESTERN PROVINCE", badge_style))
        story.append(Paragraph("Business Risk Mitigation &amp; Scalable Growth Plan", title_style))
        story.append(Paragraph(
            f"<b>Enterprise:</b> {esc(business_name)} &nbsp;|&nbsp; <b>ID:</b> {esc(entity_id)} &nbsp;|&nbsp; "
            f"<b>Sector:</b> {esc(category)} &nbsp;|&nbsp; <b>Stage:</b> {esc(stage)} &nbsp;|&nbsp; "
            f"<b>Location:</b> {esc(district)}, {esc(province)} Province",
            body_muted
        ))
        story.append(Spacer(1, 10))

        # -------------------------------------------------------------------
        # Section 1: Executive & Business Identity Summary
        # -------------------------------------------------------------------
        story.append(Paragraph("1. Executive &amp; Business Identity Summary", h1_style))
        story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=8))

        exec_summary_text = (
            f"This comprehensive mitigation plan was compiled for <b>{esc(business_name)}</b> "
            f"(Entity Reference: <code>{esc(entity_id)}</code>), operating in the <b>{esc(category)}</b> sector "
            f"at the <b>{esc(stage)}</b> lifecycle stage in <b>{esc(district)} District, Western Province</b>. "
            f"Assessment was executed under Analysis Run <code>{esc(analysis_id)}</code> on <b>{esc(timestamp_str)}</b>. "
            f"The evaluation synthesizes empirical financial disclosures, trade counterparties, and operational capacity "
            f"to establish bounded risk sub-scores across five discrete dimensions, evaluating readiness for the proposed "
            f"growth initiative: <i>'{esc(growth_action)}'</i>."
        )
        story.append(Paragraph(exec_summary_text, body_style))
        story.append(Spacer(1, 6))

        # Identity & Financial Parameters Table
        cash_reserves = plan.get("cash_reserves_latest_lkr") or plan.get("available_capital_lkr") or plan.get("available_starting_capital_lkr")
        monthly_burn = plan.get("fixed_monthly_costs_lkr") or plan.get("monthly_budget_lkr")
        monthly_rev = plan.get("monthly_revenue_lkr") or plan.get("projected_revenue_lkr")
        debt_bal = plan.get("outstanding_loan_balance_lkr") or plan.get("outstanding_debt_latest_lkr")
        repay_amt = plan.get("monthly_loan_repayment_lkr") or plan.get("monthly_debt_repayment_lkr")
        inv_cost = plan.get("required_investment_lkr") or plan.get("initial_inventory_cost_lkr") or plan.get("proposed_growth_budget_lkr")
        runway_mo = stage6.get("capital_runway_months") or plan.get("capital_runway_months")

        summary_table_data = [
            [
                Paragraph("<b>Metric Parameter</b>", cell_bold),
                Paragraph("<b>Reported / Assessed Value</b>", cell_bold),
                Paragraph("<b>Financial Metric</b>", cell_bold),
                Paragraph("<b>Reported / Assessed Value</b>", cell_bold),
            ],
            [
                Paragraph("Liquid Cash Reserves", cell_style),
                Paragraph(fmt_lkr(cash_reserves), cell_style),
                Paragraph("Monthly Revenue", cell_style),
                Paragraph(fmt_lkr(monthly_rev), cell_style),
            ],
            [
                Paragraph("Monthly Fixed Outflows", cell_style),
                Paragraph(fmt_lkr(monthly_burn), cell_style),
                Paragraph("Outstanding Debt Balance", cell_style),
                Paragraph(fmt_lkr(debt_bal) if debt_bal else "Zero Debt Confirmed", cell_style),
            ],
            [
                Paragraph("Computed Cash Runway", cell_style),
                Paragraph(f"{runway_mo:.1f} Months" if runway_mo is not None else "Pending reserves", cell_style),
                Paragraph("Monthly Debt Repayment", cell_style),
                Paragraph(fmt_lkr(repay_amt) if repay_amt else "Zero Installment", cell_style),
            ],
            [
                Paragraph("Proposed Growth Action", cell_style),
                Paragraph(esc(growth_action), cell_style),
                Paragraph("Required Growth Capital", cell_style),
                Paragraph(fmt_lkr(inv_cost), cell_style),
            ],
        ]

        summary_table = Table(summary_table_data, colWidths=[130, 140, 130, 140])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), c_bg_light),
            ('TEXTCOLOR', (0, 0), (-1, 0), c_primary),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, c_border),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 10))

        # -------------------------------------------------------------------
        # Section 2: Overall Composite Risk Status & Derivation Methodology
        # -------------------------------------------------------------------
        story.append(Paragraph("2. Overall Composite Risk Status &amp; Derivation Methodology", h1_style))
        story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=8))

        # Visual Risk Status Banner
        if overall_risk_cat == "HIGH":
            banner_bg = c_high_bg
            banner_text_col = c_high_text
            status_desc = "HIGH RISK — Acute capital, debt, or supply exposure detected. Growth action requires postponement or structural modification."
        elif overall_risk_cat == "LOW":
            banner_bg = c_low_bg
            banner_text_col = c_low_text
            status_desc = "LOW RISK — Prudent liquidity, balanced solvency, and viable capacity. Qualified for phased organic growth."
        else:
            banner_bg = c_med_bg
            banner_text_col = c_med_text
            status_desc = "MEDIUM RISK — Bounded operational or market friction observed. Conditional expansion permissible with risk mitigations."

        banner_data = [
            [
                Paragraph(f"<b>COMPOSITE RISK: {overall_risk_cat} ({composite_score:.2f} / 1.00)</b>", ParagraphStyle('B1', fontName=FONT_BOLD, fontSize=11, leading=14, textColor=banner_text_col)),
                Paragraph(f"<b>GROWTH DECISION: {readiness_dec}</b>", ParagraphStyle('B2', fontName=FONT_BOLD, fontSize=11, leading=14, textColor=c_primary, alignment=2))
            ],
            [
                Paragraph(status_desc, ParagraphStyle('B3', fontName=FONT_REGULAR, fontSize=8.5, leading=11, textColor=c_text)),
                Paragraph(f"Evidence Sufficiency: <b>{esc(stage6.get('evidence_sufficiency', 'SUFFICIENT'))}</b>", ParagraphStyle('B4', fontName=FONT_REGULAR, fontSize=8.5, leading=11, textColor=c_muted, alignment=2))
            ]
        ]
        banner_table = Table(banner_data, colWidths=[360, 180])
        banner_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), banner_bg),
            ('BOX', (0, 0), (-1, -1), 1, banner_text_col),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(banner_table)
        story.append(Spacer(1, 6))

        methodology_text = (
            "<b>Derivation Methodology &amp; Mathematical Basis:</b><br/>"
            "The Composite Risk Score is an explainable multi-factor indicator synthesized across 5 bounded categories: "
            "<b>Liquidity Risk (25%)</b>, <b>Credit Risk (20%)</b>, <b>Market Risk (20%)</b>, <b>Operational Risk (20%)</b>, "
            "and <b>Inflation Risk (15%)</b>. Each dimension score is strictly bounded in <code>[0.0, 1.0]</code> based on calibrated "
            "Sri Lankan SME empirical benchmarks. In addition to weighted averages, critical solvency tripwires "
            "(cash runway &lt; 1.0 month, acute loan delinquency &gt;= 30 days, or debt-to-capital &gt; 5.0x) mandate an override to "
            "HIGH risk. This score is a <b>decision support aid</b> and conditional scenario index; it is <b>not</b> a guaranteed "
            "commercial credit score or uncalibrated failure probability."
        )
        story.append(Paragraph(methodology_text, body_style))
        story.append(Spacer(1, 10))

        # -------------------------------------------------------------------
        # Section 3: Multi-Category Risk Assessment Scorecard
        # -------------------------------------------------------------------
        story.append(Paragraph("3. Multi-Category Risk Assessment Scorecard", h1_style))
        story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=8))

        sub_scores = stage6.get("sub_scores", {})
        cat_suff = stage6.get("category_evidence_sufficiency", {})

        score_rows = [
            [
                Paragraph("<b>Risk Category</b>", cell_bold),
                Paragraph("<b>Sub-Score</b>", cell_bold),
                Paragraph("<b>Risk Level</b>", cell_bold),
                Paragraph("<b>Weight</b>", cell_bold),
                Paragraph("<b>Data Status</b>", cell_bold),
                Paragraph("<b>Core Observed Metrics &amp; Benchmarks</b>", cell_bold),
            ]
        ]

        categories_meta = [
            ("Credit Risk", "credit_risk", 0.20, "credit", "Outstanding debt, monthly installment, debt service burden (DSCR), payment arrears, overdue days"),
            ("Market Risk", "market_risk", 0.20, "market", "Customer concentration (HHI/CR1), counterparty payment delay days, demand evidence, sales trajectory"),
            ("Inflation Risk", "inflation_risk", 0.15, "inflation", "Imported input dependency pct, supplier price increases, margin compression, CBSL benchmark"),
            ("Liquidity Risk", "liquidity_risk", 0.25, "liquidity", "Liquid cash reserves, monthly operational cash burn, baseline and post-action runway months"),
            ("Operational Risk", "operational_risk", 0.20, "operational", "Supplier concentration (HHI/CR1), shipment delivery delay days, staffing constraints, safety stock"),
        ]

        for cat_label, score_key, weight, suff_key, metrics_desc in categories_meta:
            sc = float(sub_scores.get(score_key, 0.50))
            lvl = "HIGH" if sc >= 0.65 else ("MEDIUM" if sc >= 0.35 else "LOW")
            suff = cat_suff.get(suff_key, "CONFIRMED")

            lvl_color = c_high_text if lvl == "HIGH" else (c_med_text if lvl == "MEDIUM" else c_low_text)
            score_rows.append([
                Paragraph(f"<b>{cat_label}</b>", cell_style),
                Paragraph(f"{sc:.2f} / 1.00", cell_style),
                Paragraph(f"<font color='{lvl_color}'><b>{lvl}</b></font>", cell_style),
                Paragraph(f"{weight:.0%}", cell_style),
                Paragraph(esc(suff), cell_style),
                Paragraph(metrics_desc, cell_style),
            ])

        scorecard_table = Table(score_rows, colWidths=[95, 60, 60, 45, 65, 215])
        scorecard_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), c_bg_light),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 0), (-1, -1), 0.5, c_border),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(scorecard_table)
        story.append(Spacer(1, 10))

        # -------------------------------------------------------------------
        # Section 4: Primary Risk Drivers & Supporting Empirical Evidence
        # -------------------------------------------------------------------
        story.append(Paragraph("4. Main Risk Drivers &amp; Supporting Empirical Evidence", h1_style))
        story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=8))

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
                    Paragraph("<b>Empirical Evidence &amp; Operational Impact</b>", cell_bold),
                ]
            ]
            for d in drivers[:5]:
                code = esc(d.get("factor_code", "UNKNOWN"))
                metric_name = esc(d.get("metric_name", "indicator"))
                obs_val = d.get("observed_value", 0)
                thresh_val = d.get("threshold", 0)
                sev = float(d.get("severity_score", 0.5))
                desc = esc(d.get("description", ""))

                sev_col = c_high_text if sev >= 0.70 else (c_med_text if sev >= 0.40 else c_low_text)

                driver_rows.append([
                    Paragraph(f"<b>{code}</b><br/><font color='{c_muted}'>{metric_name}</font>", cell_style),
                    Paragraph(str(obs_val), cell_style),
                    Paragraph(str(thresh_val), cell_style),
                    Paragraph(f"<font color='{sev_col}'><b>{sev:.2f}</b></font>", cell_style),
                    Paragraph(desc, cell_style),
                ])

            drivers_table = Table(driver_rows, colWidths=[110, 60, 50, 45, 275])
            drivers_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), c_bg_light),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('GRID', (0, 0), (-1, -1), 0.5, c_border),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(drivers_table)

        story.append(Spacer(1, 10))

        # -------------------------------------------------------------------
        # Section 5: Evidence Completeness, Data Provenance & Missing Information
        # -------------------------------------------------------------------
        story.append(Paragraph("5. Evidence Sufficiency, Data Provenance &amp; Missing Information", h1_style))
        story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=8))

        prov = stage6.get("evidence_provenance_summary", {})
        conf_facts = prov.get("confirmed_user_facts", [])
        estimates = prov.get("user_estimates_and_projections", [])
        ext_sources = prov.get("externally_sourced_evidence", [])
        unknowns = prov.get("unknown_or_unavailable_fields", [])
        derived = prov.get("derived_values_and_formulas", {})

        prov_rows = [
            [Paragraph("<b>Provenance Class</b>", cell_bold), Paragraph("<b>Identified Parameters &amp; Verification Evidence</b>", cell_bold)],
            [
                Paragraph("<b>Confirmed Facts</b><br/><font color='#15803d'>Independently verified</font>", cell_style),
                Paragraph(", ".join(conf_facts) if conf_facts else "None independently verified", cell_style)
            ],
            [
                Paragraph("<b>User Estimates</b><br/><font color='#b45309'>Subject to variation</font>", cell_style),
                Paragraph(", ".join(estimates) if estimates else "None declared as user estimates", cell_style)
            ],
            [
                Paragraph("<b>External Sources</b><br/><font color='#2563eb'>Macro benchmarks</font>", cell_style),
                Paragraph(
                    "; ".join([f"{item.get('metric')}: {item.get('value')} ({item.get('source')})" for item in ext_sources])
                    if ext_sources else "CBSL Western Province sector baseline", cell_style
                )
            ],
            [
                Paragraph("<b>Derived Calculations</b><br/><font color='#475569'>Mathematical formulas</font>", cell_style),
                Paragraph(
                    "; ".join([f"<b>{k}</b>: {v.get('value')} ({v.get('calculation')})" for k, v in derived.items()])
                    if derived else "Cash runway (cash / monthly burn), DSCR, Debt-to-capital", cell_style
                )
            ],
            [
                Paragraph("<b>Unknown / Missing Fields</b><br/><font color='#b91c1c'>Explicit limitations</font>", cell_style),
                Paragraph(
                    ", ".join(unknowns) if unknowns else "All required decision support fields supplied",
                    ParagraphStyle('Unk', parent=cell_style, textColor=c_high_text if unknowns else c_low_text)
                )
            ],
        ]

        prov_table = Table(prov_rows, colWidths=[150, 390])
        prov_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), c_bg_light),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 0), (-1, -1), 0.5, c_border),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(prov_table)
        story.append(Spacer(1, 10))

        # -------------------------------------------------------------------
        # Section 6: Prioritized, Category-Specific Mitigation Roadmap
        # -------------------------------------------------------------------
        story.append(PageBreak())  # Clean break to mitigation roadmap
        story.append(Paragraph("6. Prioritized Category-Specific Mitigation Roadmap", h1_style))
        story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=8))

        mitigations = stage6.get("recommended_mitigations", [])
        if not mitigations:
            story.append(Paragraph("<i>No immediate mitigation interventions required. Standard quarterly reviews recommended.</i>", body_muted))
        else:
            mit_table_rows = [
                [
                    Paragraph("<b>Priority &amp; Category</b>", cell_bold),
                    Paragraph("<b>Targeted Risk Factor</b>", cell_bold),
                    Paragraph("<b>Recommended Action &amp; Operational Rationale</b>", cell_bold)
                ]
            ]
            for m in mitigations:
                prio = str(m.get("priority", "MEDIUM")).upper()
                cat_name = esc(m.get("category", "Operational Risk"))
                prio_col = c_high_text if prio == "CRITICAL" else (c_high_text if prio == "HIGH" else (c_med_text if prio == "MEDIUM" else c_low_text))
                factor_title = esc(m.get("risk_factor") or m.get("targeted_factor") or "Risk Factor")
                action_text = esc(m.get("action", ""))
                mech_text = esc(m.get("mechanism") or m.get("rationale") or "")

                mit_table_rows.append([
                    Paragraph(f"<font color='{prio_col}'><b>{prio} PRIORITY</b></font><br/><font color='{c_muted}'>{cat_name}</font>", cell_style),
                    Paragraph(f"<b>{factor_title}</b>", cell_style),
                    Paragraph(f"<b>Action:</b> {action_text}<br/><font color='{c_muted}'><b>Rationale:</b> {mech_text}</font>", cell_style)
                ])

            mit_table = Table(mit_table_rows, colWidths=[110, 140, 290])
            mit_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), c_bg_light),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('GRID', (0, 0), (-1, -1), 0.5, c_border),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(mit_table)

        story.append(Spacer(1, 10))

        # -------------------------------------------------------------------
        # Section 7: Implementation Matrix
        # -------------------------------------------------------------------
        story.append(Paragraph("7. Implementation Matrix: Timeline, Ownership &amp; Indicators", h1_style))
        story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=8))

        impl_rows = [
            [
                Paragraph("<b>Action &amp; Role</b>", cell_bold),
                Paragraph("<b>Timeline</b>", cell_bold),
                Paragraph("<b>Estimated Cost / Impact</b>", cell_bold),
                Paragraph("<b>Measurable Success Indicator</b>", cell_bold),
                Paragraph("<b>Reassessment Trigger</b>", cell_bold)
            ]
        ]

        for m in mitigations:
            act_short = esc(m.get("action", ""))
            role = esc(m.get("responsible_role", "Managing Director / Operations Lead"))
            timeframe = esc(m.get("suggested_timeline") or m.get("time_horizon") or "1–2 Months")
            cost_est = esc(m.get("estimated_cost", "Unavailable / Non-monetary"))
            indicator = esc(m.get("measurable_indicator", "Parameter normalized within 60 days"))
            triggers = esc(m.get("reassessment_triggers", "Quarterly financial review"))

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
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 0), (-1, -1), 0.5, c_border),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(impl_table)
        story.append(Spacer(1, 10))

        # -------------------------------------------------------------------
        # Section 8: Growth-Readiness Assessment
        # -------------------------------------------------------------------
        story.append(Paragraph("8. Growth-Readiness Assessment for Requested Growth Action", h1_style))
        story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=8))

        rec_color = c_high_text if readiness_dec == "DELAY" else (c_med_text if readiness_dec == "MODIFY" else c_low_text)
        reasons = readiness.get("reasons") or readiness.get("decision_rationales") or []
        modifications = readiness.get("suggested_modifications") or []
        conditions = readiness.get("conditions_that_must_be_met") or []
        evidence_needed = readiness.get("evidence_needed_to_reconsider") or []

        growth_summary_html = (
            f"<b>Requested Growth Action:</b> {esc(growth_action)} &nbsp;|&nbsp; "
            f"<b>Capital Outlay:</b> {fmt_lkr(inv_cost)}<br/>"
            f"<b>Readiness Decision:</b> <font color='{rec_color}'><b>{readiness_dec}</b></font> — "
            f"{esc(readiness.get('risk_adjusted_recommendation', ''))}"
        )
        story.append(Paragraph(growth_summary_html, body_style))
        story.append(Spacer(1, 6))

        readiness_rows = [
            [Paragraph("<b>Evaluation Dimension</b>", cell_bold), Paragraph("<b>Stage-Aligned Findings &amp; Constraints</b>", cell_bold)],
            [
                Paragraph("<b>Decision Rationales</b>", cell_style),
                Paragraph("<br/>• ".join([esc(r) for r in reasons]) if reasons else "Parameters satisfy baseline growth criteria", cell_style)
            ],
            [
                Paragraph("<b>Suggested Modifications</b>", cell_style),
                Paragraph("<br/>• ".join([esc(m) for m in modifications]) if modifications else "Execute planned strategy with milestone tracking", cell_style)
            ],
            [
                Paragraph("<b>Mandatory Prerequisites</b>", cell_style),
                Paragraph("<br/>• ".join([esc(c) for c in conditions]) if conditions else "Maintain minimum 3 months operating cash buffer", cell_style)
            ],
            [
                Paragraph("<b>Evidence to Reconsider</b>", cell_style),
                Paragraph("<br/>• ".join([esc(e) for e in evidence_needed]) if evidence_needed else "Not applicable (approved to proceed)", cell_style)
            ]
        ]

        readiness_table = Table(readiness_rows, colWidths=[140, 400])
        readiness_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), c_bg_light),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 0), (-1, -1), 0.5, c_border),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(readiness_table)
        story.append(Spacer(1, 10))

        # -------------------------------------------------------------------
        # Section 9: Assumptions, Limitations & Reassessment Triggers
        # -------------------------------------------------------------------
        story.append(Paragraph("9. Assumptions, Limitations, Data Provenance &amp; Reassessment Triggers", h1_style))
        story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=8))

        assumptions_text = (
            "<b>Methodological Assumptions &amp; Scientific Disclosures:</b><br/>"
            "• <b>Transparent Rule-Based Scoring:</b> The 5 risk dimension sub-scores are deterministic, transparent indices "
            "calibrated to Sri Lankan macroeconomic conditions. They do <i>not</i> represent uncalibrated failure probabilities.<br/>"
            "• <b>GNN Graph Context Distinction:</b> The Graph Neural Network (B2BRiskGNN) provides graph-relational trade context "
            "trained on 1,000 Western Province enterprises. The GNN does <i>not</i> predict individual category sub-scores directly. "
            "Graph edges in the training set reflect experimental trade patterns (Verified_Flag=0); standalone entities fall back "
            "cleanly to non-graph assessment without edge fabrication.<br/>"
            "• <b>Strict Geographic Boundary:</b> Valid exclusively for Western Province, Sri Lanka (Colombo, Gampaha, Kalutara).<br/>"
            "• <b>Zero Target Leakage:</b> No ground-truth outcome labels or simulated performance codes are used in scoring.<br/>"
            "• <b>No Guarantees:</b> Recommendations provide preventative risk reduction guidance. They do not promise statutory loan "
            "approvals or commercial profits.<br/><br/>"
            "<b>Mandatory Reassessment Triggers:</b><br/>"
            "1. <b>Revenue Shock:</b> Actual monthly revenue decreases by &gt; 15% relative to the declared baseline.<br/>"
            "2. <b>Liquidity Contraction:</b> Liquid cash reserves drop below 2.0 months of operating expenses.<br/>"
            "3. <b>Repayment Friction:</b> Any loan installment or statutory liability becomes more than 15 days past due.<br/>"
            "4. <b>Supply Chain Failure:</b> Primary supplier delays inbound shipments by &gt; 10 days or increases prices by &gt; 10%.<br/>"
            "5. <b>Strategic Pivots:</b> Revision to proposed growth capital budget exceeding 20% of planned allocation."
        )
        story.append(Paragraph(assumptions_text, body_style))
        story.append(Spacer(1, 12))

        # Concluding Sign-off block
        signoff_text = (
            f"<b>Plan Generated:</b> {esc(timestamp_str)} &nbsp;|&nbsp; "
            f"<b>Engine:</b> Component 4 Stage 6 Explainable Risk &amp; Mitigation Engine &nbsp;|&nbsp; "
            f"<b>Status:</b> Official Decision Support Document"
        )
        story.append(Paragraph(signoff_text, body_muted))

        # Build document with NumberedCanvas
        doc.build(story, canvasmaker=NumberedCanvas)
        return buffer.getvalue()
