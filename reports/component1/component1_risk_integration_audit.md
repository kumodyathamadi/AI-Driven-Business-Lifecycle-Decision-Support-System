# Component 1 Business-Plan Extraction + Five-Category Risk Assessment Integration Audit Report

**Date:** October 21, 2026  
**System:** AI-Driven SME Business Lifecycle Decision Support System (SLIIT Research)  
**Components Inspected:** Component 1 (Feasibility, SHAP, TOPSIS, Business Plan Generator) & Component 4 (GNN Risk Engine, Multi-Category Risk Assessment, Mitigation Engine)  
**Branch:** `Component_4_Tharindu`  
**Reference Commit:** `ee69f68` / Current Working Tree  
**Audit Status:** Complete & Verified against Workspace Codebase

---

## 1. Executive Summary

This audit evaluates the end-to-end data flow from **Component 1's generated business plan** to **Component 4's risk assessment and mitigation workflow**. 

### Primary Findings:
1. **Architectural Gap Between Components:** Component 1 saves its generated plans and structured outputs into the `analysis_records` table (`structured_profile` JSONB column). However, Component 4's UI and API routes previously operated in isolation—requiring the business owner to re-upload files or re-enter data, with no direct way to select a generated Component 1 plan from the active session or database.
2. **Defect in Component 1 Business Plan Download Route:** In `backend/routes/business_plan.py` line 80, the endpoint `download_plan_by_record_id` accesses `db_record.full_profile`. The `AnalysisRecord` ORM model only defines `input_profile` and `structured_profile`. Calling this endpoint immediately crashes with `AttributeError: 'AnalysisRecord' object has no attribute 'full_profile'`.
3. **Severe Extraction Loss in Document Ingestion:** The text and PDF parser in `BusinessPlanIngestionService._extract_from_unstructured_text()` (`src/component4/business_plan_ingestion.py`) fails to parse crucial headers:
   - It ignores `Prepared For:` and `BUSINESS NAME:` (causing `extracted.business_name` to remain `None`).
   - It ignores `Industry Category:` and `Business Stage:` as explicit labels, instead matching loose keywords anywhere in the document.
   - It fails to extract `TARGET CAPITAL` (planned initial capital requirement), `Business Description`, `Proposed Business Model`, `Pricing`, `Operating Costs`, `Supplier Information`, and `Financial Assumptions`.
   - It completely lacks conflict detection: when a document contains conflicting information (e.g. `Prepared For: Waasana Grocery Shop` with `Industry Category: Beauty Salon`), the current parser matches the first keyword and silently ignores the contradiction.
4. **Capital & Loan Ambiguity:** Available capital and loan amounts are handled without determining whether available starting capital already includes the borrowed funds.
5. **Score & Model Calibration Boundary:** The 5 risk categories (Credit, Market, Inflation, Liquidity, Operational) are calculated as deterministic screening indices in `[0.0, 1.0]` by `RiskAssessmentEngine`, whereas the inductive GNN predicts counterparty default risk across supply-chain networks. Disclosing this distinction transparently is vital for scientific integrity.

---

## 2. Exact Files and Functions Inspected

| Category | File Path | Functions / Classes Inspected |
| :--- | :--- | :--- |
| **Component 1 Planning** | [`src/planning/planner.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/src/planning/planner.py) | `PersonalizedPlanGenerator.generate_plan()` |
| **Component 1 Profile** | [`src/profile/builder.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/src/profile/builder.py) | `StructuredProfileBuilder.build_profile()` |
| **Component 1 Orchestrator** | [`src/orchestrator.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/src/orchestrator.py) | `analyze_business()`, `_initialize_services()` |
| **Component 1 Doc Builders** | [`backend/services/business_plan_generator/report_builder.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/backend/services/business_plan_generator/report_builder.py) | `BusinessPlanReportBuilder.build_report_data()` |
| **Component 1 PDF Engine** | [`backend/services/business_plan_generator/pdf_generator.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/backend/services/business_plan_generator/pdf_generator.py) | `BusinessPlanPDFGenerator.generate_pdf()`, `NumberedCanvas` |
| **Component 1 Routes** | [`backend/routes/business_plan.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/backend/routes/business_plan.py) | `generate_pdf_plan()`, `generate_docx_plan()`, `download_plan_by_record_id()` |
| **Component 1 Analysis** | [`backend/routes/analysis.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/backend/routes/analysis.py) | `analyze_sme_business()`, `list_analysis_records()`, `get_analysis_record()` |
| **Component 4 Ingestion** | [`src/component4/business_plan_ingestion.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/src/component4/business_plan_ingestion.py) | `BusinessPlanIngestionService.ingest_file()`, `_parse_json()`, `_parse_pdf()`, `_parse_docx()`, `_extract_from_unstructured_text()` |
| **Component 4 Schema** | [`src/component4/intake_schema.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/src/component4/intake_schema.py) | `DynamicIntakeSchemaService.analyze_missing_fields()`, `MASTER_INTAKE_SCHEMA` |
| **Component 4 Resolver** | [`src/component4/entity_resolution.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/src/component4/entity_resolution.py) | `BusinessEntityResolver.resolve()` |
| **Component 4 Risk Engine** | [`src/component4/risk_assessment.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/src/component4/risk_assessment.py) | `RiskAssessmentEngine.assess_record()`, `_evaluate_credit_risk()`, `_evaluate_market_risk()`, `_evaluate_inflation_risk()`, `_evaluate_liquidity_risk()`, `_evaluate_operational_risk()`, `_map_mitigations()` |
| **Component 4 Readiness** | [`src/component4/growth_readiness.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/src/component4/growth_readiness.py) | `GrowthReadinessEvaluator.evaluate()` |
| **Component 4 Pipeline** | [`src/component4/pipeline.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/src/component4/pipeline.py) | `Component4Pipeline.run()`, `_build_risk_engine_input()`, `_generate_markdown_report()`, `save_artifacts` |
| **Component 4 PDF Engine** | [`src/component4/mitigation_pdf_generator.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/src/component4/mitigation_pdf_generator.py) | `Component4MitigationPDFGenerator.generate()`, `NumberedCanvas` |
| **Component 4 Routes** | [`backend/routes/component4_risk.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/backend/routes/component4_risk.py) | `upload_business_plan()`, `submit_intake_and_run()`, `run_analysis_pipeline()`, `download_analysis_pdf()`, `download_analysis_report()` |
| **Database Models** | [`backend/models.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/backend/models.py) | `AnalysisRecord`, `BusinessProfile`, `Component4BusinessProfile`, `Component4AssessmentRun` |
| **Frontend UI** | [`frontend/src/components/BusinessPlan.jsx`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/frontend/src/components/BusinessPlan.jsx) | `BusinessPlan` presentation and download component |
| **Frontend Risk Suite** | [`frontend/src/components/Component4RiskSuite.jsx`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/frontend/src/components/Component4RiskSuite.jsx) | 6-step guided sequential risk assessment and mitigation workflow |

---

## 3. Existing Input/Output Schemas

### A. Component 1 Structured Profile Schema (`AnalysisRecord.structured_profile`)
```json
{
  "metadata": {
    "record_id": "uuid",
    "schema_version": "1.0.0",
    "component": "Component_1_Feasibility_Analysis",
    "generated_at": "ISO-8601"
  },
  "business_input": {
    "business_name": "string",
    "business_stage": "New | Existing",
    "business_category": "string",
    "district": "Colombo | Gampaha | Kalutara",
    "available_capital_lkr": 0.0,
    "loan_amount_lkr": 0.0,
    "monthly_budget_lkr": 0.0,
    "expected_customers_per_day": 0,
    "expected_price_lkr": 0.0,
    "competition_level": "Low | Moderate | High",
    "customer_demand_score": 0,
    "available_staff_count": 0,
    "required_staff_count": 0,
    "available_equipment_score": 0,
    "required_equipment_score": 0,
    "supplier_availability_score": 0
  },
  "feasibility_analysis": {
    "predicted_label": "Feasible | Conditionally Feasible | Infeasible",
    "confidence_score": 0.0,
    "probabilities": { "Feasible": 0.0, "Conditionally Feasible": 0.0, "Infeasible": 0.0 }
  },
  "explainability": { "positive_drivers": [], "negative_drivers": [] },
  "strategic_recommendations": { "topsis_ranking": {} },
  "personalized_business_plan": {
    "executive_overview": { "business_summary": "", "key_enablers": [], "key_risk_hurdles": [] },
    "operational_plan": { "staffing_requirements": "", "equipment_readiness": "", "supplier_logistics": "" },
    "marketing_plan": { "demand_score": "", "target_daily_customers": 0, "pricing_structure": "" },
    "financial_plan": { "available_capital_lkr": 0.0, "monthly_operating_budget_lkr": 0.0, "requested_loan_lkr": 0.0, "capital_runway_months": 0.0 },
    "action_roadmap": { "phase_1_immediate_0_to_3_months": [], "phase_2_growth_3_to_12_months": [], "phase_3_scale_1_year_plus": [] }
  }
}
```

### B. Component 4 Ingestion Output Schema (`ExtractedBusinessPlan`)
The intermediate dataclass `ExtractedBusinessPlan` holds facts extracted from JSON, PDF, DOCX, or text files. It defines:
- Core identity: `business_name`, `business_category`, `business_stage`, `district`, `province`.
- Financial parameters: `available_capital_lkr`, `monthly_budget_lkr`, `requested_loan_lkr`, `capital_runway_months`.
- Operational metrics: `available_staff_count`, `required_staff_count`, `available_equipment_score`, `supplier_availability_score`.
- Provenance tracking: `missing_fields`, `field_provenance`, `source_sections`, `validation_errors`, `evidence_sufficiency_status`.

---

## 4. Current Extraction Method and Technical Limitations

### Document Parser Deficiencies in `_extract_from_unstructured_text()`
1. **Header Ignorance:**
   - PDF and text parsers rely on basic keyword searches (e.g. `re.search(r"\bColombo\b")`).
   - The parser has no regex patterns for explicit labels such as:
     - `Prepared For: <name>`
     - `BUSINESS NAME: <name>`
     - `Industry Category: <category>`
     - `TARGET CAPITAL: <amount>`
     - `AVAILABLE CAPITAL: <amount>`
     - `MONTHLY BUDGET: <amount>`
     - `Loan: <amount>`
2. **Missing Business Identity Extraction:**
   - When extracting from PDF or DOCX, `extracted.business_name` is never assigned from text headers, resulting in `None` or falling back to the filename.
3. **No Contradiction Detection:**
   - If a business plan states `Prepared For: Waasana Grocery Shop` but has `Industry Category: Beauty Salon`, the current regex matches `"Grocery"` first and assigns category `"Grocery/Mini-Mart"`, completely burying the discrepancy. The user is never alerted to verify the actual business concept.
4. **Funding Conflation:**
   - The parser extracts `available_capital_lkr` and `requested_loan_lkr` as two independent variables without validating whether available capital already incorporates the loan. If `Available Capital = 1,500,000` and `Loan = 300,000`, the system cannot determine if total funding is LKR 1,500,000 or LKR 1,800,000.

---

## 5. Existing Risk Calculations and Their Limitations

`RiskAssessmentEngine` in `src/component4/risk_assessment.py` computes 5 deterministic category sub-indices in `[0.0, 1.0]`:

1. **Credit Risk (`_evaluate_credit_risk`):**
   - Evaluates Debt-to-Income (DTI), Collateral Coverage Ratio (CCR), and loan burden.
   - *Limitation:* If loan details are omitted, businesses without debt must be explicitly confirmed (`is_zero_debt: True`) to receive a low risk baseline (0.10); undeclared debt must receive an unconfirmed baseline (0.35) with an explicit limitation rather than being imputed as zero debt.
2. **Market Risk (`_evaluate_market_risk`):**
   - Synthesizes customer demand score, competitor count, and location suitability.
   - *Limitation:* Startups with zero sales history are penalized unless projected demand evidence is explicitly categorized as projected rather than observed.
3. **Inflation Risk (`_evaluate_inflation_risk`):**
   - Evaluates Western Province CCPI exposure, utility/energy intensity, and operating margin buffer.
   - *Limitation:* Input price increases must distinguish verified indices from owner assumptions.
4. **Liquidity Risk (`_evaluate_liquidity_risk`):**
   - Measures cash runway months ($\text{Cash} / \text{Monthly OpEx}$), working capital, and receivables lag.
   - *Limitation:* Setup expenditure and target initial capital requirements must be deducted from available capital before calculating operational runway.
5. **Operational Risk (`_evaluate_operational_risk`):**
   - Evaluates staffing deficit ratio, equipment readiness gap, and supplier availability score.
   - *Limitation:* For new startups, planned operational arrangements must be distinguished from observed operational track records.

---

## 6. Existing Recommendation Logic and Limitations

1. **Prior State:**
   - Factor recommendations were generated via a static mapping table that did not account for business stage, industry sector, or proposed growth action.
2. **Upgraded State:**
   - Recommendations are synthesized dynamically in `_map_mitigations()` based on stage (`New` vs. `Established`), sector (`Food & Beverage`, `Retail`, `Manufacturing`), and growth action (`Start New Business`, `Open New Branch`, `Purchase Equipment`).
   - *Current Gap:* Recommendations must be expanded to include all 13 required attributes:
     1. Risk Category
     2. Risk Driver
     3. Supporting Evidence
     4. Rationale / Why It Matters
     5. Specific Mitigation Action
     6. Priority (Critical, High, Medium, Low)
     7. Suggested Timeframe
     8. Estimated Cost (or "Cost estimate required")
     9. Responsible Role
     10. Expected Outcome
     11. Measurable Success Indicator
     12. Information Needed to Verify Progress
     13. Dependencies & Constraints

---

## 7. Existing PDF and Markdown Export Mechanisms

1. **Component 1 Business Plan PDF:**
   - Generated by `BusinessPlanPDFGenerator` (`backend/services/business_plan_generator/pdf_generator.py`) using ReportLab.
   - Produces an 8-page document with cover page, KPI summary card, probability chart, financial table, and action roadmap.
2. **Component 4 Mitigation Plan PDF:**
   - Generated by `Component4MitigationPDFGenerator` (`src/component4/mitigation_pdf_generator.py`) using ReportLab.
   - Features Unicode Sinhala and English text rendering via `Nirmala.ttc` (subfontIndex 0 and 1).
   - Currently structures 9 sections; must be expanded into the comprehensive 15-section executive mitigation plan required by Phase 8.
3. **Technical Markdown Audit Report:**
   - Generated by `Component4Pipeline._generate_markdown_report()` and saved to `analysis_report.md`.
   - Preserved as a research/developer audit deliverable.

---

## 8. Confirmed Defects and Evidence

| Defect ID | Severity | File & Location | Evidence / Root Cause | Impact |
| :--- | :--- | :--- | :--- | :--- |
| **DEF-01** | **Critical** | `backend/routes/business_plan.py:80` | `profile = db_record.full_profile`. The `AnalysisRecord` model in `backend/models.py` has no attribute `full_profile`. | Any call to `GET /api/business/plan/download/{record_id}/{doc_format}` crashes with `AttributeError`. |
| **DEF-02** | **High** | `frontend/src/components/Component4RiskSuite.jsx` & `backend/routes/component4_risk.py` | Component 4 only queries `Component4BusinessProfile` for existing businesses; it does not offer an option to select a saved Component 1 `AnalysisRecord`. | Business owners must re-upload or re-type their business plan after completing Component 1. |
| **DEF-03** | **High** | `src/component4/business_plan_ingestion.py:590-645` | `_extract_from_unstructured_text()` lacks regex patterns for `Prepared For:`, `BUSINESS NAME:`, `Industry Category:`, `TARGET CAPITAL:`, `AVAILABLE CAPITAL:`, `MONTHLY BUDGET:`, and `Loan:`. | Extracting from PDF or text business plans drops business name and key financial constraints. |
| **DEF-04** | **High** | `src/component4/business_plan_ingestion.py` | No conflict detection logic when document sections contradict (e.g. `Waasana Grocery Shop` vs `Industry Category: Beauty Salon`). | Parser silently picks the first keyword and ignores contradictory business identity data. |
| **DEF-05** | **Medium** | `src/component4/business_plan_ingestion.py` & `src/component4/pipeline.py` | Available capital and loan amounts are not checked to determine if capital already includes borrowed funds. | Distorts budget coverage and cash runway calculations. |
| **DEF-06** | **Medium** | `src/component4/mitigation_pdf_generator.py` | Report structures 9 sections rather than the full 15-section personalized executive roadmap with conflict alerts and explicit liquidity breakdown. | Decision-makers lack the complete 15-section risk roadmap. |

---

## 9. Proposed Minimal Implementation Plan

### Phase 2: Enhanced Business Plan Extraction & Contradiction Detection
1. Update `backend/routes/business_plan.py` line 80: fix `db_record.full_profile` to `db_record.structured_profile`.
2. Enhance `BusinessPlanIngestionService` in `src/component4/business_plan_ingestion.py`:
   - Add regex patterns for `Prepared For:`, `Industry Category:`, `Business Stage:`, `AVAILABLE CAPITAL:`, `TARGET CAPITAL:`, `MONTHLY BUDGET:`, and `Loan:`.
   - Add contradiction detection: compare `business_name` keywords against `business_category` and `description`. Flag conflicting identities in `extracted.conflicting_values`.
   - Parse operational details: pricing, target customers, demand evidence, supplier information, operating costs, and resources.
   - Detect and flag whether available capital includes the loan or represents equity alone.
3. Add backend endpoint `GET /api/component4/component1-plans` to list Component 1 analysis records for seamless direct loading in Component 4.

### Phase 3 & 4: Five-Category Risk Assessment Refinement
- Maintain independent 0.0–1.0 evaluation for Credit, Market, Inflation, Liquidity, and Operational risk.
- Explicitly differentiate confirmed facts, plan-extracted data, estimates, model predictions, derived calculations, unknown fields, and conflicting data.
- Deduct setup expenditure and target capital from available capital in Liquidity Risk before calculating operating runway.

### Phase 5 & 6: GNN Boundary & 13-Attribute Mitigation Engine
- Disclose GNN relational trade default context vs rule-based category sub-indices.
- Upgrade recommendation generator to produce all 13 required attributes per mitigation action.

### Phase 7 & 8: Growth Readiness & 15-Section PDF Plan
- Upgrade `GrowthReadinessEvaluator` with clear verdicts (`Proceed`, `Proceed with conditions`, `Pilot on limited scale`, `Defer expansion`, `Not recommended`).
- Expand `Component4MitigationPDFGenerator` to render all 15 comprehensive sections with Unicode Sinhala font support, conflict alerts, and funding breakdown.

### Phase 9: Frontend Reviewable Profile & Conflict Resolution
- Add Component 1 plan selector in Step 1 of `Component4RiskSuite.jsx`.
- Display Business Profile Summary with provenance badges and interactive conflict resolution (e.g. Grocery Shop vs Beauty Salon).

### Phase 10: Automated Verification Suite
- Comprehensive automated tests covering extraction of all headers, conflict flagging, 5-category independence, recommendation responsiveness, and PDF generation.
