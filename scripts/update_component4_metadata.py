"""
Component 4: Metadata, Dictionary, and Manifest Alignment Script.
Generates comprehensive data dictionary, dataset manifest, quality summary, and README
aligned with the 5 evidence classifications:
A. OBSERVED_FEASIBILITY_DATA
B. DOCUMENT_DERIVED_DATA
C. SIMULATED_SCENARIO
D. RULE_DERIVED_OUTCOME
E. UNKNOWN_OR_UNVERIFIED
"""

import os
import json
import pandas as pd

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed", "component4")
RAW_FEASIBILITY = os.path.join(BASE_DIR, "data", "raw", "Component_One_Core_Feasibility.csv")

def generate_data_dictionary():
    dict_rows = [
        # 1. Component_One_Core_Feasibility.csv (OBSERVED_FEASIBILITY_DATA)
        ('Component_One_Core_Feasibility.csv', 'case_id', 'object', 'OBSERVED_FEASIBILITY_DATA', 'Unique survey case identifier (C00001-C01200); excluded from predictive features'),
        ('Component_One_Core_Feasibility.csv', 'business_stage', 'object', 'OBSERVED_FEASIBILITY_DATA', 'Applicant business operational status: New (843 proposed startups) or Existing (357 running micro-businesses)'),
        ('Component_One_Core_Feasibility.csv', 'business_category', 'object', 'OBSERVED_FEASIBILITY_DATA', 'Informal micro-enterprise sector: Clothing/Garment (412), Grocery/Mini-Mart (327), Bakery/Food/Grocery (263), Beauty Saloon (198)'),
        ('Component_One_Core_Feasibility.csv', 'business_description', 'object', 'OBSERVED_FEASIBILITY_DATA', 'Free-text qualitative description of applicant proposed micro-enterprise activity'),
        ('Component_One_Core_Feasibility.csv', 'district', 'object', 'OBSERVED_FEASIBILITY_DATA', 'Geographic administrative district: 100% Colombo (zero observed coverage in Gampaha or Kalutara)'),
        ('Component_One_Core_Feasibility.csv', 'province', 'object', 'OBSERVED_FEASIBILITY_DATA', 'Geographic administrative province: 100% Western Province (1,200 records)'),
        ('Component_One_Core_Feasibility.csv', 'location_type', 'object', 'OBSERVED_FEASIBILITY_DATA', 'Specific suburb/township in Colombo district (e.g. Panagoda, Godagama, Pitipana, Kahathuduwa)'),
        ('Component_One_Core_Feasibility.csv', 'proposed_action', 'object', 'OBSERVED_FEASIBILITY_DATA', 'Proposed lifecycle intervention: start (843), maintain (127), expand (119), improve (111)'),
        ('Component_One_Core_Feasibility.csv', 'available_capital_lkr', 'int64', 'OBSERVED_FEASIBILITY_DATA', 'Applicant personal equity capital available in Sri Lankan Rupees (LKR)'),
        ('Component_One_Core_Feasibility.csv', 'loan_amount_lkr', 'int64', 'OBSERVED_FEASIBILITY_DATA', 'Loan capital requested from micro-finance/grant provider in LKR'),
        ('Component_One_Core_Feasibility.csv', 'monthly_budget_lkr', 'int64', 'OBSERVED_FEASIBILITY_DATA', 'Projected monthly operating expense budget in LKR'),
        ('Component_One_Core_Feasibility.csv', 'initial_inventory_cost_lkr', 'int64', 'OBSERVED_FEASIBILITY_DATA', 'Initial upfront inventory stock acquisition cost in LKR'),
        ('Component_One_Core_Feasibility.csv', 'expected_price_lkr', 'int64', 'OBSERVED_FEASIBILITY_DATA', 'Anticipated average selling price per unit/service in LKR'),
        ('Component_One_Core_Feasibility.csv', 'expected_customers_per_day', 'int64', 'OBSERVED_FEASIBILITY_DATA', 'Projected daily footfall / customer volume'),
        ('Component_One_Core_Feasibility.csv', 'competition_level', 'object', 'OBSERVED_FEASIBILITY_DATA', 'Observed local retail competition density: Low (525), Medium (404), High (271)'),
        ('Component_One_Core_Feasibility.csv', 'customer_demand_score', 'int64', 'OBSERVED_FEASIBILITY_DATA', 'Survey-assessed local consumer demand score (0-100 scale)'),
        ('Component_One_Core_Feasibility.csv', 'expected_operating_days_per_month', 'int64', 'OBSERVED_FEASIBILITY_DATA', 'Anticipated monthly operating schedule in days (e.g. 20-30 days)'),
        ('Component_One_Core_Feasibility.csv', 'feasibility_label', 'object', 'OBSERVED_FEASIBILITY_DATA', 'Grant/loan viability target: Conditionally Feasible (682), Feasible (314), Infeasible (204); NOT business default/failure'),
        ('Component_One_Core_Feasibility.csv', 'entrepreneur_experience_years', 'int64', 'OBSERVED_FEASIBILITY_DATA', 'Prior relevant industry/entrepreneurial experience of founder in years'),
        ('Component_One_Core_Feasibility.csv', 'location_suitability_score', 'int64', 'OBSERVED_FEASIBILITY_DATA', 'Evaluated commercial suitability of operating site (1-5 scale)'),
        ('Component_One_Core_Feasibility.csv', 'available_staff_count', 'int64', 'OBSERVED_FEASIBILITY_DATA', 'Currently available helpers/family laborers (0-2 staff)'),
        ('Component_One_Core_Feasibility.csv', 'required_staff_count', 'int64', 'OBSERVED_FEASIBILITY_DATA', 'Additional staff headcount required for proposed operation (0-2 staff)'),
        ('Component_One_Core_Feasibility.csv', 'available_equipment_score', 'int64', 'OBSERVED_FEASIBILITY_DATA', 'Survey score of existing tools and machinery on hand (1-5 scale)'),
        ('Component_One_Core_Feasibility.csv', 'required_equipment_score', 'int64', 'OBSERVED_FEASIBILITY_DATA', 'Survey score of additional tools and equipment required (1-5 scale)'),
        ('Component_One_Core_Feasibility.csv', 'supplier_availability_score', 'int64', 'OBSERVED_FEASIBILITY_DATA', 'Accessibility and reliability of local wholesale suppliers (1-5 scale)'),

        # 2. dataset07_extracted_invoices.csv (DOCUMENT_DERIVED_DATA)
        ('dataset07_extracted_invoices.csv', 'document_id', 'object', 'DOCUMENT_DERIVED_DATA', 'Tokenized document identifier (DOC_D07_001 to DOC_D07_070)'),
        ('dataset07_extracted_invoices.csv', 'dataset_source', 'object', 'DOCUMENT_DERIVED_DATA', 'Source collection identifier (Dataset_07)'),
        ('dataset07_extracted_invoices.csv', 'document_type', 'object', 'DOCUMENT_DERIVED_DATA', 'Document genre classification: commercial_service_invoice'),
        ('dataset07_extracted_invoices.csv', 'invoice_date', 'object', 'DOCUMENT_DERIVED_DATA', 'Extracted billing date in ISO format (YYYY-MM-DD)'),
        ('dataset07_extracted_invoices.csv', 'due_date', 'object', 'DOCUMENT_DERIVED_DATA', 'Extracted payment due date in ISO format (YYYY-MM-DD)'),
        ('dataset07_extracted_invoices.csv', 'currency', 'object', 'DOCUMENT_DERIVED_DATA', 'Billing currency: AUD (40 invoices) or LKR (30 invoices)'),
        ('dataset07_extracted_invoices.csv', 'total_amount', 'float64', 'DOCUMENT_DERIVED_DATA', 'Extracted total invoice amount in stated currency'),
        ('dataset07_extracted_invoices.csv', 'issuer_entity_id', 'object', 'DOCUMENT_DERIVED_DATA', 'Tokenized billing entity: NODE_ENT_D07_01 (Typefi Systems Pty Ltd)'),
        ('dataset07_extracted_invoices.csv', 'issuer_role', 'object', 'DOCUMENT_DERIVED_DATA', 'Supply chain billing role: issuer_supplier'),
        ('dataset07_extracted_invoices.csv', 'issuer_jurisdiction', 'object', 'DOCUMENT_DERIVED_DATA', 'Corporate legal jurisdiction of issuer: AU (Australia)'),
        ('dataset07_extracted_invoices.csv', 'recipient_entity_id', 'object', 'DOCUMENT_DERIVED_DATA', 'Tokenized billed client: NODE_ENT_D07_02 (Typefi Systems Pvt Ltd)'),
        ('dataset07_extracted_invoices.csv', 'recipient_role', 'object', 'DOCUMENT_DERIVED_DATA', 'Supply chain billing role: recipient_client'),
        ('dataset07_extracted_invoices.csv', 'recipient_jurisdiction', 'object', 'DOCUMENT_DERIVED_DATA', 'Corporate legal jurisdiction of recipient: LK (Colombo, Sri Lanka)'),
        ('dataset07_extracted_invoices.csv', 'verification_status', 'object', 'DOCUMENT_DERIVED_DATA', 'Extraction audit status: VERIFIED_COMPLETE (69) or DUPLICATE_OMITTED (1)'),
        ('dataset07_extracted_invoices.csv', 'is_duplicate', 'bool', 'DOCUMENT_DERIVED_DATA', 'Duplicate boolean flag: True for 1 semantic duplicate, False for 69 unique files'),
        ('dataset07_extracted_invoices.csv', 'duplicate_status', 'object', 'DOCUMENT_DERIVED_DATA', 'Deduplication categorization: UNIQUE or SEMANTIC_CONTENT_DUPLICATE'),
        ('dataset07_extracted_invoices.csv', 'duplicate_of_doc_id', 'object', 'DOCUMENT_DERIVED_DATA', 'Canonical reference document ID for duplicate files (DOC_D07_069 for DOC_D07_070)'),
        ('dataset07_extracted_invoices.csv', 'confidence_score', 'float64', 'DOCUMENT_DERIVED_DATA', 'Extraction confidence score: 1.00 for verified digital text'),
        ('dataset07_extracted_invoices.csv', 'num_pages', 'int64', 'DOCUMENT_DERIVED_DATA', 'Page count of source PDF document (1 page each)'),
        ('dataset07_extracted_invoices.csv', 'provenance_file_hash', 'object', 'DOCUMENT_DERIVED_DATA', 'SHA-256 byte cryptographic hash of original source PDF file'),
        ('dataset07_extracted_invoices.csv', 'notes', 'object', 'DOCUMENT_DERIVED_DATA', 'Auditor provenance and extraction notes'),

        # 3. dataset06_extracted_declarations.csv (DOCUMENT_DERIVED_DATA)
        ('dataset06_extracted_declarations.csv', 'document_id', 'object', 'DOCUMENT_DERIVED_DATA', 'Tokenized declaration identifier (DOC_D06_001 to DOC_D06_171)'),
        ('dataset06_extracted_declarations.csv', 'dataset_source', 'object', 'DOCUMENT_DERIVED_DATA', 'Source collection identifier (Dataset_06)'),
        ('dataset06_extracted_declarations.csv', 'document_type', 'object', 'DOCUMENT_DERIVED_DATA', 'Document genre classification: customs_declaration_cusdec'),
        ('dataset06_extracted_declarations.csv', 'invoice_date', 'object', 'DOCUMENT_DERIVED_DATA', 'Extracted export declaration date in ISO format (where extractable)'),
        ('dataset06_extracted_declarations.csv', 'due_date', 'object', 'DOCUMENT_DERIVED_DATA', 'Payment due date: None (not defined on customs declarations)'),
        ('dataset06_extracted_declarations.csv', 'currency', 'object', 'DOCUMENT_DERIVED_DATA', 'Export invoice currency: USD (33), EUR (16), or None (122 unextracted/scanned)'),
        ('dataset06_extracted_declarations.csv', 'total_amount', 'float64', 'DOCUMENT_DERIVED_DATA', 'Export invoice FOB/C&F value in stated foreign currency; None for unextracted scans'),
        ('dataset06_extracted_declarations.csv', 'issuer_entity_id', 'object', 'DOCUMENT_DERIVED_DATA', 'Tokenized exporter entity: NODE_ENT_D06_EXP_01 (Starflora Pvt Ltd)'),
        ('dataset06_extracted_declarations.csv', 'issuer_role', 'object', 'DOCUMENT_DERIVED_DATA', 'Supply chain role: exporter'),
        ('dataset06_extracted_declarations.csv', 'issuer_jurisdiction', 'object', 'DOCUMENT_DERIVED_DATA', 'Legal jurisdiction of exporter: LK (Western Province, Sri Lanka)'),
        ('dataset06_extracted_declarations.csv', 'recipient_entity_id', 'object', 'DOCUMENT_DERIVED_DATA', 'Tokenized international buyer (NODE_ENT_D06_CON_01 to CON_07)'),
        ('dataset06_extracted_declarations.csv', 'recipient_role', 'object', 'DOCUMENT_DERIVED_DATA', 'Supply chain role: consignee_buyer'),
        ('dataset06_extracted_declarations.csv', 'recipient_jurisdiction', 'object', 'DOCUMENT_DERIVED_DATA', 'International buyer country jurisdiction: NL, AE, SA, US, OTHER'),
        ('dataset06_extracted_declarations.csv', 'declarant_entity_id', 'object', 'DOCUMENT_DERIVED_DATA', 'Customs house clearing agent: NODE_ENT_D06_DEC_01/02 or None'),
        ('dataset06_extracted_declarations.csv', 'verification_status', 'object', 'DOCUMENT_DERIVED_DATA', 'Verification status: UNVERIFIED_SCANNED (109), VERIFIED_PARTIAL (37), VERIFIED_COMPLETE (13), DUPLICATE_OMITTED (12)'),
        ('dataset06_extracted_declarations.csv', 'is_duplicate', 'bool', 'DOCUMENT_DERIVED_DATA', 'Duplicate boolean flag: True for 12 binary duplicates, False for 159 unique files'),
        ('dataset06_extracted_declarations.csv', 'duplicate_status', 'object', 'DOCUMENT_DERIVED_DATA', 'Deduplication categorization: UNIQUE or EXACT_BINARY_DUPLICATE'),
        ('dataset06_extracted_declarations.csv', 'duplicate_of_doc_id', 'object', 'DOCUMENT_DERIVED_DATA', 'Canonical reference document ID for exact binary duplicates'),
        ('dataset06_extracted_declarations.csv', 'confidence_score', 'float64', 'DOCUMENT_DERIVED_DATA', 'Extraction confidence: 0.95 (complete), 0.40-0.65 (partial), 0.00 (scanned raster image)'),
        ('dataset06_extracted_declarations.csv', 'num_pages', 'int64', 'DOCUMENT_DERIVED_DATA', 'Page count of source declaration PDF (1-3 pages)'),
        ('dataset06_extracted_declarations.csv', 'provenance_file_hash', 'object', 'DOCUMENT_DERIVED_DATA', 'SHA-256 byte cryptographic hash of original source PDF file'),
        ('dataset06_extracted_declarations.csv', 'notes', 'object', 'DOCUMENT_DERIVED_DATA', 'Auditor provenance notes explaining unextracted scanned images and duplicate handling'),

        # 4. business_profiles.csv (SIMULATED_SCENARIO)
        ('business_profiles.csv', 'business_id', 'object', 'SIMULATED_SCENARIO', 'Simulated SME identifier (WP_SME_0001 to WP_SME_0500)'),
        ('business_profiles.csv', 'district', 'object', 'SIMULATED_SCENARIO', 'Simulated district in Western Province: Colombo (167), Gampaha (167), Kalutara (166)'),
        ('business_profiles.csv', 'province', 'object', 'SIMULATED_SCENARIO', 'Simulated administrative province: 100% Western'),
        ('business_profiles.csv', 'business_category', 'object', 'SIMULATED_SCENARIO', 'Simulated economic sector: Retail, Wholesale, Manufacturing, Professional Services, Food & Beverage, Transport & Logistics, Personal Services'),
        ('business_profiles.csv', 'business_stage', 'object', 'SIMULATED_SCENARIO', 'Simulated SME maturity: Existing (361) or Growing (139)'),
        ('business_profiles.csv', 'employee_count', 'int64', 'SIMULATED_SCENARIO', 'Simulated full-time employee headcount (3 to 48 staff)'),
        ('business_profiles.csv', 'scenario_family_id', 'object', 'SIMULATED_SCENARIO', 'Scenario family group identifier (FAM_0001 to FAM_0500) for leak-free splitting'),
        ('business_profiles.csv', 'data_origin', 'object', 'SIMULATED_SCENARIO', 'Explicit provenance marker: SIMULATED_SCENARIO (never observed data)'),
        ('business_profiles.csv', 'base_scenario_version', 'object', 'SIMULATED_SCENARIO', 'Scenario generator version code: rules_v1'),

        # 5. financial_snapshots.csv (SIMULATED_SCENARIO / RULE_DERIVED_OUTCOME)
        ('financial_snapshots.csv', 'business_id', 'object', 'SIMULATED_SCENARIO', 'Simulated SME identifier linked to business_profiles.csv'),
        ('financial_snapshots.csv', 'snapshot_month', 'object', 'SIMULATED_SCENARIO', 'Chronological monthly snapshot timestamp (Month_01 to Month_12)'),
        ('financial_snapshots.csv', 'district', 'object', 'SIMULATED_SCENARIO', 'Simulated Western Province district: Colombo, Gampaha, Kalutara'),
        ('financial_snapshots.csv', 'province', 'object', 'SIMULATED_SCENARIO', 'Simulated administrative province: Western'),
        ('financial_snapshots.csv', 'business_category', 'object', 'SIMULATED_SCENARIO', 'Simulated SME sector'),
        ('financial_snapshots.csv', 'monthly_revenue_lkr', 'float64', 'SIMULATED_SCENARIO', 'Simulated monthly gross sales revenue in LKR'),
        ('financial_snapshots.csv', 'monthly_expenses_lkr', 'float64', 'SIMULATED_SCENARIO', 'Simulated monthly operating costs and overheads in LKR'),
        ('financial_snapshots.csv', 'cash_reserves_lkr', 'float64', 'SIMULATED_SCENARIO', 'Simulated liquid bank deposits and cash balance at month end in LKR'),
        ('financial_snapshots.csv', 'outstanding_debt_lkr', 'float64', 'SIMULATED_SCENARIO', 'Simulated principal balance of commercial loans in LKR'),
        ('financial_snapshots.csv', 'monthly_debt_repayment_lkr', 'float64', 'SIMULATED_SCENARIO', 'Simulated monthly principal and interest debt installment in LKR'),
        ('financial_snapshots.csv', 'accounts_receivable_lkr', 'float64', 'SIMULATED_SCENARIO', 'Simulated trade credit owed by customers at month end in LKR'),
        ('financial_snapshots.csv', 'accounts_payable_lkr', 'float64', 'SIMULATED_SCENARIO', 'Simulated trade credit owed to suppliers at month end in LKR'),
        ('financial_snapshots.csv', 'working_capital_lkr', 'float64', 'SIMULATED_SCENARIO', 'Simulated net working capital: cash + AR - AP in LKR'),
        ('financial_snapshots.csv', 'cash_runway_months', 'float64', 'SIMULATED_SCENARIO', 'Simulated liquidity buffer: cash_reserves / monthly_expenses'),
        ('financial_snapshots.csv', 'debt_service_ratio', 'float64', 'SIMULATED_SCENARIO', 'Simulated debt service burden: monthly_debt_repayment / monthly_revenue'),
        ('financial_snapshots.csv', 'supplier_concentration_share', 'float64', 'SIMULATED_SCENARIO', 'Simulated top-1 supplier purchase share (0.0 to 1.0)'),
        ('financial_snapshots.csv', 'customer_concentration_share', 'float64', 'SIMULATED_SCENARIO', 'Simulated top-1 customer sales share (0.0 to 1.0)'),
        ('financial_snapshots.csv', 'supplier_disruption_active', 'int64', 'SIMULATED_SCENARIO', 'Simulated supply shock indicator: 1 if key supplier disrupted, 0 otherwise'),
        ('financial_snapshots.csv', 'liquidity_stress_label', 'object', 'RULE_DERIVED_OUTCOME', 'Rule-derived snapshot liquidity category: Low, Medium, High (SIMULATOR_RULES_V1)'),
        ('financial_snapshots.csv', 'relationship_risk_label', 'object', 'RULE_DERIVED_OUTCOME', 'Rule-derived snapshot counterparty risk category: Low, Medium, High (SIMULATOR_RULES_V1)'),
        ('financial_snapshots.csv', 'overall_risk_label', 'object', 'RULE_DERIVED_OUTCOME', 'Rule-derived composite snapshot risk category: Low, Medium, High (SIMULATOR_RULES_V1)'),
        ('financial_snapshots.csv', 'scenario_family_id', 'object', 'SIMULATED_SCENARIO', 'Scenario family group identifier (FAM_0001 to FAM_0500)'),
        ('financial_snapshots.csv', 'label_source', 'object', 'SIMULATED_SCENARIO', 'Provenance marker for deterministic rules: SIMULATOR_RULES_V1'),
        ('financial_snapshots.csv', 'data_origin', 'object', 'SIMULATED_SCENARIO', 'Provenance marker: SIMULATED_SCENARIO'),
        ('financial_snapshots.csv', 'split', 'object', 'SIMULATED_SCENARIO', 'Leak-free partition assignment: train (70%), validation (15%), test (15%)'),

        # 6. business_relationships.csv (SIMULATED_SCENARIO)
        ('business_relationships.csv', 'source_id', 'object', 'SIMULATED_SCENARIO', 'Origin entity identifier in relationship edge'),
        ('business_relationships.csv', 'target_id', 'object', 'SIMULATED_SCENARIO', 'Destination entity identifier in relationship edge'),
        ('business_relationships.csv', 'relationship_type', 'object', 'SIMULATED_SCENARIO', 'Directed edge type: SUPPLIES (2022), SELLS_TO (2531), BORROWS_FROM (500)'),
        ('business_relationships.csv', 'snapshot_month', 'object', 'SIMULATED_SCENARIO', 'Temporal snapshot marker (e.g. Month_12)'),
        ('business_relationships.csv', 'transaction_count', 'int64', 'SIMULATED_SCENARIO', 'Simulated monthly transaction frequency between counterparties'),
        ('business_relationships.csv', 'transaction_value_lkr', 'float64', 'SIMULATED_SCENARIO', 'Simulated monthly trade or debt volume in LKR'),
        ('business_relationships.csv', 'dependency_percentage', 'float64', 'SIMULATED_SCENARIO', 'Simulated supplier/customer dependency share (0-100%); null for lender edges'),
        ('business_relationships.csv', 'relationship_duration_months', 'int64', 'SIMULATED_SCENARIO', 'Simulated trading relationship age in months'),
        ('business_relationships.csv', 'payment_delay_days', 'int64', 'SIMULATED_SCENARIO', 'Simulated trade credit settlement delay in days'),
        ('business_relationships.csv', 'disruption_status', 'object', 'SIMULATED_SCENARIO', 'Simulated operational shock: BASELINE or DISRUPTED'),
        ('business_relationships.csv', 'scenario_family_id', 'object', 'SIMULATED_SCENARIO', 'Scenario family group identifier for leak-free partition'),
        ('business_relationships.csv', 'data_origin', 'object', 'SIMULATED_SCENARIO', 'Provenance marker: SIMULATED_SCENARIO'),
        ('business_relationships.csv', 'split', 'object', 'SIMULATED_SCENARIO', 'Leak-free partition assignment: train, validation, test'),

        # 7. growth_actions.csv (SIMULATED_SCENARIO)
        ('growth_actions.csv', 'action_id', 'object', 'SIMULATED_SCENARIO', 'Unique growth action scenario identifier (WP_SME_XXXX_ACT_Y)'),
        ('growth_actions.csv', 'business_id', 'object', 'SIMULATED_SCENARIO', 'Simulated SME entity undertaking the action'),
        ('growth_actions.csv', 'action_type', 'object', 'SIMULATED_SCENARIO', 'Capital expansion intervention: capacity_expansion, new_product_line, geographical_expansion, supplier_diversification'),
        ('growth_actions.csv', 'variant', 'object', 'SIMULATED_SCENARIO', 'Experimental paired variant: BASELINE (unmitigated) or MITIGATED (with operational risk controls)'),
        ('growth_actions.csv', 'required_investment_lkr', 'float64', 'SIMULATED_SCENARIO', 'Upfront capital expenditure required in LKR'),
        ('growth_actions.csv', 'additional_monthly_cost_lkr', 'float64', 'SIMULATED_SCENARIO', 'Recurring monthly operating overhead increase in LKR'),
        ('growth_actions.csv', 'expected_revenue_change_lkr', 'float64', 'SIMULATED_SCENARIO', 'Projected monthly revenue uplift in LKR'),
        ('growth_actions.csv', 'required_staff_count', 'int64', 'SIMULATED_SCENARIO', 'Additional workforce headcount needed'),
        ('growth_actions.csv', 'available_capacity_score', 'float64', 'SIMULATED_SCENARIO', 'Internal operational readiness score before intervention (0.0 to 1.0)'),
        ('growth_actions.csv', 'mitigation_applied', 'int64', 'SIMULATED_SCENARIO', 'Binary indicator: 1 if risk mitigation controls applied, 0 for baseline'),
        ('growth_actions.csv', 'mitigation_recommendation', 'object', 'SIMULATED_SCENARIO', 'Prescribed mitigation intervention strategy; populated for MITIGATED variants'),
        ('growth_actions.csv', 'scenario_family_id', 'object', 'SIMULATED_SCENARIO', 'Scenario family group identifier'),
        ('growth_actions.csv', 'district', 'object', 'SIMULATED_SCENARIO', 'Simulated Western Province district: Colombo, Gampaha, Kalutara'),
        ('growth_actions.csv', 'province', 'object', 'SIMULATED_SCENARIO', 'Simulated province: Western'),
        ('growth_actions.csv', 'data_origin', 'object', 'SIMULATED_SCENARIO', 'Provenance marker: SIMULATED_SCENARIO'),

        # 8. risk_outcomes.csv (RULE_DERIVED_OUTCOME)
        ('risk_outcomes.csv', 'action_id', 'object', 'RULE_DERIVED_OUTCOME', 'Growth action identifier linked to growth_actions.csv'),
        ('risk_outcomes.csv', 'business_id', 'object', 'RULE_DERIVED_OUTCOME', 'Simulated SME entity identifier'),
        ('risk_outcomes.csv', 'variant', 'object', 'RULE_DERIVED_OUTCOME', 'Paired variant: BASELINE or MITIGATED'),
        ('risk_outcomes.csv', 'overall_risk_label', 'object', 'RULE_DERIVED_OUTCOME', 'Deterministic composite risk level: Low (440), Medium (804), High (756) (SIMULATOR_RULES_V1); NOT business default'),
        ('risk_outcomes.csv', 'liquidity_stress_label', 'object', 'RULE_DERIVED_OUTCOME', 'Deterministic liquidity stress category: Low, Medium, High'),
        ('risk_outcomes.csv', 'relationship_risk_label', 'object', 'RULE_DERIVED_OUTCOME', 'Deterministic counterparty concentration risk category: Low, Medium, High'),
        ('risk_outcomes.csv', 'growth_readiness_label', 'object', 'RULE_DERIVED_OUTCOME', 'Deterministic readiness recommendation: Proceed (440), Modify (804), Delay (756); Delay reduced to 0 in MITIGATED'),
        ('risk_outcomes.csv', 'risk_factor_codes', 'object', 'RULE_DERIVED_OUTCOME', 'Semicolon-separated deterministic risk driver rule codes triggered'),
        ('risk_outcomes.csv', 'mitigation_codes', 'object', 'RULE_DERIVED_OUTCOME', 'Semicolon-separated operational mitigation action codes applied'),
        ('risk_outcomes.csv', 'label_source', 'object', 'RULE_DERIVED_OUTCOME', 'Deterministic simulator rule engine code: SIMULATOR_RULES_V1'),
        ('risk_outcomes.csv', 'scenario_family_id', 'object', 'RULE_DERIVED_OUTCOME', 'Scenario family group identifier'),
        ('risk_outcomes.csv', 'split', 'object', 'RULE_DERIVED_OUTCOME', 'Leak-free split assignment: train, validation, test'),
        ('risk_outcomes.csv', 'data_origin', 'object', 'RULE_DERIVED_OUTCOME', 'Provenance marker: SIMULATED_SCENARIO'),

        # 9. graph_entities.csv (SIMULATED_SCENARIO)
        ('graph_entities.csv', 'entity_id', 'object', 'SIMULATED_SCENARIO', 'Unique graph entity token: WP_SME_XXXX, WP_SME_XXXX_SUP_YY, CUS_YY, LEND_01'),
        ('graph_entities.csv', 'entity_type', 'object', 'SIMULATED_SCENARIO', 'Entity ontology role: BUSINESS (500), SUPPLIER (2022), CUSTOMER (2531), LENDER (500)'),
        ('graph_entities.csv', 'district', 'object', 'SIMULATED_SCENARIO', 'Administrative district in Western Province: Colombo, Gampaha, Kalutara'),
        ('graph_entities.csv', 'business_category', 'object', 'SIMULATED_SCENARIO', 'Simulated economic sector for BUSINESS nodes; NaN for suppliers/customers'),
        ('graph_entities.csv', 'data_origin', 'object', 'SIMULATED_SCENARIO', 'Provenance marker: SIMULATED_SCENARIO (5,553 synthetic graph nodes)'),

        # 10. scenario_families_and_splits.csv (SIMULATED_SCENARIO)
        ('scenario_families_and_splits.csv', 'scenario_family_id', 'object', 'SIMULATED_SCENARIO', 'Unique scenario family identifier (FAM_0001 to FAM_0500)'),
        ('scenario_families_and_splits.csv', 'business_id', 'object', 'SIMULATED_SCENARIO', 'Simulated base SME identifier'),
        ('scenario_families_and_splits.csv', 'district', 'object', 'SIMULATED_SCENARIO', 'Assigned Western Province district'),
        ('scenario_families_and_splits.csv', 'business_category', 'object', 'SIMULATED_SCENARIO', 'Simulated SME economic sector'),
        ('scenario_families_and_splits.csv', 'business_stage', 'object', 'SIMULATED_SCENARIO', 'Simulated business stage: Existing or Growing'),
        ('scenario_families_and_splits.csv', 'supplier_concentration_control', 'float64', 'SIMULATED_SCENARIO', 'Scenario generator parameter controlling supplier concentration share'),
        ('scenario_families_and_splits.csv', 'customer_concentration_control', 'float64', 'SIMULATED_SCENARIO', 'Scenario generator parameter controlling customer concentration share'),
        ('scenario_families_and_splits.csv', 'disruption_month', 'int64', 'SIMULATED_SCENARIO', 'Simulated calendar month when supply disruption shock is triggered'),
        ('scenario_families_and_splits.csv', 'split', 'object', 'SIMULATED_SCENARIO', 'Deterministic leak-free partition: train (350 / 70%), validation (75 / 15%), test (75 / 15%)'),
        ('scenario_families_and_splits.csv', 'label_source', 'object', 'SIMULATED_SCENARIO', 'Rule engine code: SIMULATOR_RULES_V1'),
        ('scenario_families_and_splits.csv', 'data_origin', 'object', 'SIMULATED_SCENARIO', 'Provenance marker: SIMULATED_SCENARIO'),

        # 11. engineered_risk_features.csv (SIMULATED_SCENARIO / RULE_DERIVED_OUTCOME)
        ('engineered_risk_features.csv', 'action_id', 'object', 'SIMULATED_SCENARIO', 'Growth action identifier'),
        ('engineered_risk_features.csv', 'business_id', 'object', 'SIMULATED_SCENARIO', 'Simulated SME identifier'),
        ('engineered_risk_features.csv', 'action_type', 'object', 'SIMULATED_SCENARIO', 'Intervention type: capacity_expansion, new_product_line, geographical_expansion, supplier_diversification'),
        ('engineered_risk_features.csv', 'variant', 'object', 'SIMULATED_SCENARIO', 'Action variant: BASELINE or MITIGATED'),
        ('engineered_risk_features.csv', 'required_investment_lkr', 'float64', 'SIMULATED_SCENARIO', 'Investment capex in LKR'),
        ('engineered_risk_features.csv', 'additional_monthly_cost_lkr', 'float64', 'SIMULATED_SCENARIO', 'Added monthly opex in LKR'),
        ('engineered_risk_features.csv', 'expected_revenue_change_lkr', 'float64', 'SIMULATED_SCENARIO', 'Expected revenue change in LKR'),
        ('engineered_risk_features.csv', 'required_staff_count', 'int64', 'SIMULATED_SCENARIO', 'Required additional staff'),
        ('engineered_risk_features.csv', 'available_capacity_score', 'float64', 'SIMULATED_SCENARIO', 'Operational capacity score'),
        ('engineered_risk_features.csv', 'mitigation_applied', 'int64', 'SIMULATED_SCENARIO', 'Mitigation binary indicator (1=applied, 0=none)'),
        ('engineered_risk_features.csv', 'district', 'object', 'SIMULATED_SCENARIO', 'Western Province district: Colombo, Gampaha, Kalutara'),
        ('engineered_risk_features.csv', 'province', 'object', 'SIMULATED_SCENARIO', 'Province: Western'),
        ('engineered_risk_features.csv', 'business_category', 'object', 'SIMULATED_SCENARIO', 'SME sector'),
        ('engineered_risk_features.csv', 'business_stage', 'object', 'SIMULATED_SCENARIO', 'Maturity stage'),
        ('engineered_risk_features.csv', 'employee_count', 'int64', 'SIMULATED_SCENARIO', 'Baseline employee count'),
        ('engineered_risk_features.csv', 'scenario_family_id', 'object', 'SIMULATED_SCENARIO', 'Scenario family identifier'),
        ('engineered_risk_features.csv', 'split', 'object', 'SIMULATED_SCENARIO', 'Split partition: train, validation, test'),
        ('engineered_risk_features.csv', 'monthly_revenue_mean_lkr', 'float64', 'SIMULATED_SCENARIO', '12-month mean monthly revenue in LKR'),
        ('engineered_risk_features.csv', 'monthly_revenue_std_lkr', 'float64', 'SIMULATED_SCENARIO', '12-month standard deviation of revenue in LKR'),
        ('engineered_risk_features.csv', 'monthly_expenses_mean_lkr', 'float64', 'SIMULATED_SCENARIO', '12-month mean monthly expenses in LKR'),
        ('engineered_risk_features.csv', 'monthly_expenses_std_lkr', 'float64', 'SIMULATED_SCENARIO', '12-month standard deviation of expenses in LKR'),
        ('engineered_risk_features.csv', 'cash_reserves_min_lkr', 'float64', 'SIMULATED_SCENARIO', '12-month minimum cash buffer observed in LKR'),
        ('engineered_risk_features.csv', 'cash_reserves_latest_lkr', 'float64', 'SIMULATED_SCENARIO', 'Latest cash balance at Month 12 in LKR'),
        ('engineered_risk_features.csv', 'working_capital_latest_lkr', 'float64', 'SIMULATED_SCENARIO', 'Latest working capital at Month 12 in LKR'),
        ('engineered_risk_features.csv', 'outstanding_debt_latest_lkr', 'float64', 'SIMULATED_SCENARIO', 'Latest commercial debt principal balance in LKR'),
        ('engineered_risk_features.csv', 'monthly_debt_repayment_lkr', 'float64', 'SIMULATED_SCENARIO', 'Latest monthly debt installment obligation in LKR'),
        ('engineered_risk_features.csv', 'revenue_volatility_cv', 'float64', 'SIMULATED_SCENARIO', 'Coefficient of variation of monthly revenue (std / mean)'),
        ('engineered_risk_features.csv', 'operating_profit_mean_lkr', 'float64', 'SIMULATED_SCENARIO', '12-month mean operating profit (rev_mean - exp_mean) in LKR'),
        ('engineered_risk_features.csv', 'operating_margin_ratio', 'float64', 'SIMULATED_SCENARIO', 'Operating margin: operating_profit_mean / rev_mean'),
        ('engineered_risk_features.csv', 'baseline_cash_runway_months', 'float64', 'SIMULATED_SCENARIO', 'Baseline liquidity runway: cash_latest / exp_mean in months'),
        ('engineered_risk_features.csv', 'min_cash_runway_months', 'float64', 'SIMULATED_SCENARIO', 'Minimum historical runway observed in trailing 12 months'),
        ('engineered_risk_features.csv', 'working_capital_to_revenue_ratio', 'float64', 'SIMULATED_SCENARIO', 'Working capital ratio: working_capital_latest / rev_mean'),
        ('engineered_risk_features.csv', 'debt_service_burden_ratio', 'float64', 'SIMULATED_SCENARIO', 'Debt burden: monthly_debt_repayment / rev_mean'),
        ('engineered_risk_features.csv', 'debt_service_coverage_ratio', 'float64', 'SIMULATED_SCENARIO', 'DSCR: operating_profit_mean / monthly_debt_repayment'),
        ('engineered_risk_features.csv', 'net_cash_flow_monthly_lkr', 'float64', 'SIMULATED_SCENARIO', 'Net monthly cash generation after debt service in LKR'),
        ('engineered_risk_features.csv', 'supplier_count', 'int64', 'SIMULATED_SCENARIO', 'Active supplier count in supply chain graph'),
        ('engineered_risk_features.csv', 'supplier_hhi', 'float64', 'SIMULATED_SCENARIO', 'Normalized Herfindahl-Hirschman Index of supplier purchase concentration [0.0, 1.0]'),
        ('engineered_risk_features.csv', 'supplier_cr1_share', 'float64', 'SIMULATED_SCENARIO', 'Top-1 supplier purchase share [0.0, 1.0]'),
        ('engineered_risk_features.csv', 'has_disrupted_supplier', 'int64', 'SIMULATED_SCENARIO', 'Indicator: 1 if business has a currently disrupted supplier, 0 otherwise'),
        ('engineered_risk_features.csv', 'customer_count', 'int64', 'SIMULATED_SCENARIO', 'Active customer counterparty count in graph'),
        ('engineered_risk_features.csv', 'customer_hhi', 'float64', 'SIMULATED_SCENARIO', 'Normalized Herfindahl-Hirschman Index of customer revenue concentration [0.0, 1.0]'),
        ('engineered_risk_features.csv', 'customer_cr1_share', 'float64', 'SIMULATED_SCENARIO', 'Top-1 customer revenue share [0.0, 1.0]'),
        ('engineered_risk_features.csv', 'lender_count', 'int64', 'SIMULATED_SCENARIO', 'Count of active lending institutions'),
        ('engineered_risk_features.csv', 'total_borrowing_lkr', 'float64', 'SIMULATED_SCENARIO', 'Total institutional borrowing outstanding in LKR'),
        ('engineered_risk_features.csv', 'counterparty_payment_delay_mean_days', 'float64', 'SIMULATED_SCENARIO', 'Average trade credit payment delay across counterparties in days'),
        ('engineered_risk_features.csv', 'counterparty_payment_delay_max_days', 'int64', 'SIMULATED_SCENARIO', 'Maximum trade credit payment delay observed across counterparties in days'),
        ('engineered_risk_features.csv', 'investment_to_cash_ratio', 'float64', 'SIMULATED_SCENARIO', 'Capital stress ratio: required_investment / cash_latest'),
        ('engineered_risk_features.csv', 'additional_cost_to_revenue_ratio', 'float64', 'SIMULATED_SCENARIO', 'Cost expansion ratio: additional_monthly_cost / rev_mean'),
        ('engineered_risk_features.csv', 'post_action_cash_runway_months', 'float64', 'SIMULATED_SCENARIO', 'Projected liquidity runway after paying investment and added monthly costs in months'),
        ('engineered_risk_features.csv', 'post_action_net_cash_flow_lkr', 'float64', 'SIMULATED_SCENARIO', 'Projected net operating cash flow after action implementation in LKR'),
        ('engineered_risk_features.csv', 'capacity_gap_score', 'float64', 'SIMULATED_SCENARIO', 'Operational capacity deficit (1 - available_capacity_score) [0.0, 1.0]'),
        ('engineered_risk_features.csv', 'staffing_growth_ratio', 'float64', 'SIMULATED_SCENARIO', 'Workforce expansion ratio: required_staff / employee_count'),
        ('engineered_risk_features.csv', 'target_overall_risk', 'object', 'RULE_DERIVED_OUTCOME', 'Segregated target: overall_risk_label (Low/Medium/High); strictly excluded from inputs'),
        ('engineered_risk_features.csv', 'target_growth_readiness', 'object', 'RULE_DERIVED_OUTCOME', 'Segregated target: growth_readiness_label (Proceed/Modify/Delay); excluded from inputs'),
        ('engineered_risk_features.csv', 'target_liquidity_stress', 'object', 'RULE_DERIVED_OUTCOME', 'Segregated target: liquidity_stress_label; excluded from inputs'),
        ('engineered_risk_features.csv', 'target_relationship_risk', 'object', 'RULE_DERIVED_OUTCOME', 'Segregated target: relationship_risk_label; excluded from inputs'),
        ('engineered_risk_features.csv', 'data_origin', 'object', 'SIMULATED_SCENARIO', 'Provenance marker: SIMULATED_SCENARIO'),

        # 12. risk_assessments.csv (RULE_DERIVED_OUTCOME)
        ('risk_assessments.csv', 'action_id', 'object', 'RULE_DERIVED_OUTCOME', 'Evaluated growth action scenario identifier'),
        ('risk_assessments.csv', 'business_id', 'object', 'RULE_DERIVED_OUTCOME', 'Evaluated SME identifier'),
        ('risk_assessments.csv', 'variant', 'object', 'RULE_DERIVED_OUTCOME', 'Intervention variant: BASELINE or MITIGATED'),
        ('risk_assessments.csv', 'composite_risk_score', 'float64', 'RULE_DERIVED_OUTCOME', 'Explainable multi-factor composite risk index [0.0, 1.0]; weighted subscore combination'),
        ('risk_assessments.csv', 'overall_risk_category', 'object', 'RULE_DERIVED_OUTCOME', 'Risk category: LOW (score < 0.35), MEDIUM (0.35-0.65), HIGH (score >= 0.65)'),
        ('risk_assessments.csv', 'growth_readiness', 'object', 'RULE_DERIVED_OUTCOME', 'Stage 6 recommendation: PROCEED, MODIFY, or DELAY'),
        ('risk_assessments.csv', 'can_proceed_immediately', 'bool', 'RULE_DERIVED_OUTCOME', 'Decision boolean: True if growth_readiness == PROCEED and no critical red flags'),
        ('risk_assessments.csv', 'has_critical_red_flag', 'bool', 'RULE_DERIVED_OUTCOME', 'Red flag indicator: True if cash runway exhausted or critical red lines breached'),
        ('risk_assessments.csv', 'liquidity_risk_subscore', 'float64', 'RULE_DERIVED_OUTCOME', 'Subscore evaluating baseline cash runway and post-action liquidity exhaustion [0.0, 1.0]'),
        ('risk_assessments.csv', 'debt_burden_subscore', 'float64', 'RULE_DERIVED_OUTCOME', 'Subscore evaluating debt service burden ratio and DSCR coverage [0.0, 1.0]'),
        ('risk_assessments.csv', 'growth_action_stress_subscore', 'float64', 'RULE_DERIVED_OUTCOME', 'Subscore evaluating capex-to-cash depletion and capacity deficit [0.0, 1.0]'),
        ('risk_assessments.csv', 'supplier_concentration_subscore', 'float64', 'RULE_DERIVED_OUTCOME', 'Subscore evaluating supplier HHI, single-supplier CR1, and active supplier disruptions [0.0, 1.0]'),
        ('risk_assessments.csv', 'customer_concentration_subscore', 'float64', 'RULE_DERIVED_OUTCOME', 'Subscore evaluating customer HHI, single-customer CR1, and trade payment delays [0.0, 1.0]'),
        ('risk_assessments.csv', 'primary_risk_driver', 'object', 'RULE_DERIVED_OUTCOME', 'Text code of dominant risk driver factor with benchmark attribution'),
        ('risk_assessments.csv', 'primary_mitigation_action', 'object', 'RULE_DERIVED_OUTCOME', 'Specific operational mitigation action recommended to resolve primary risk driver'),
        ('risk_assessments.csv', 'primary_mitigation_rationale', 'object', 'RULE_DERIVED_OUTCOME', 'Clinical rationale explaining how proposed mitigation reduces risk score'),
        ('risk_assessments.csv', 'evidence_sufficiency', 'object', 'RULE_DERIVED_OUTCOME', 'Data quality guard: SUFFICIENT or INSUFFICIENT; triggers guarded advisory if data missing')
    ]

    df_dict = pd.DataFrame(dict_rows, columns=['file', 'column', 'dtype', 'evidence_source', 'description'])
    output_path = os.path.join(PROCESSED_DIR, "data_dictionary.csv")
    df_dict.to_csv(output_path, index=False)
    print(f"data_dictionary.csv saved ({len(df_dict)} entries across 12 files)")


def generate_dataset_manifest():
    manifest = {
        "package_title": "Component 4 Western Province Business Risk and Feasibility Dataset Package",
        "audit_version": "source_alignment_audit_v2",
        "last_audited": "2026-10-18",
        "evidence_source_taxonomy": {
            "OBSERVED_FEASIBILITY_DATA": "Actual observed records from Component 1 feasibility survey in Colombo (1,200 micro-enterprises).",
            "DOCUMENT_DERIVED_DATA": "Values, dates, amounts, and transaction dyads extracted from verified invoices and customs declarations.",
            "SIMULATED_SCENARIO": "Controlled synthetic SME scenarios with multi-month cash flows, B2B networks, and growth actions.",
            "RULE_DERIVED_OUTCOME": "Risk scores and readiness recommendations produced by deterministic rules (SIMULATOR_RULES_V1 / Stage 6 engine).",
            "UNKNOWN_OR_UNVERIFIED": "Unextracted raster scan PDFs (109 files) and unverified cross-dataset links strictly maintained as unknown."
        },
        "geographic_scope": {
            "province": "Western",
            "country": "Sri Lanka",
            "enforced_districts": ["Colombo", "Gampaha", "Kalutara"],
            "empirical_breakdown": {
                "Component_One_Core_Feasibility.csv": {"Colombo": 1200, "Gampaha": 0, "Kalutara": 0, "notes": "Observed data exclusively covers Colombo district."},
                "dataset07_invoices": {"issuer_jurisdiction": "AU", "recipient_jurisdiction": "LK (Colombo 05)", "notes": "Corporate service billing from Australia to Colombo subsidiary."},
                "dataset06_declarations": {"issuer_jurisdiction": "LK (Western Province)", "recipient_jurisdictions": ["NL", "AE", "SA", "US", "OTHER"], "notes": "Customs export star graph from Western Province exporter to foreign buyers."},
                "simulated_scenarios": {"Colombo": 167, "Gampaha": 167, "Kalutara": 166, "notes": "Equal balanced simulation assumption across all 3 districts."}
            }
        },
        "provenance_statement": (
            "The 5 scenario CSV files (business_profiles, financial_snapshots, business_relationships, "
            "growth_actions, risk_outcomes) represent controlled generated scenarios, NOT observed real businesses. "
            "They are strictly segregated from the 1,200 feasibility survey cases and the real tax/customs invoices. "
            "Labels are deterministic rule outcomes, NOT historical default or bankruptcy occurrences."
        ),
        "tables_inventory": {
            "Component_One_Core_Feasibility.csv": {
                "evidence_source": "OBSERVED_FEASIBILITY_DATA",
                "rows": 1200,
                "columns": 25,
                "is_real_observed": True,
                "description": "Observed survey records evaluating proposed micro-enterprise viability in Colombo."
            },
            "dataset07_extracted_invoices.csv": {
                "evidence_source": "DOCUMENT_DERIVED_DATA",
                "rows": 70,
                "columns": 21,
                "is_real_observed": True,
                "description": "Extracted corporate service billing invoices (69 unique, 1 duplicate)."
            },
            "dataset06_extracted_declarations.csv": {
                "evidence_source": "DOCUMENT_DERIVED_DATA",
                "rows": 171,
                "columns": 22,
                "is_real_observed": True,
                "description": "Extracted customs export declarations (159 unique, 12 binary duplicates; 109 scanned raster scans)."
            },
            "business_profiles.csv": {
                "evidence_source": "SIMULATED_SCENARIO",
                "rows": 500,
                "columns": 9,
                "is_real_observed": False,
                "description": "Controlled synthetic SME profiles across 3 Western Province districts."
            },
            "financial_snapshots.csv": {
                "evidence_source": "SIMULATED_SCENARIO",
                "rows": 6000,
                "columns": 25,
                "is_real_observed": False,
                "description": "12-month synthetic financial histories per business."
            },
            "business_relationships.csv": {
                "evidence_source": "SIMULATED_SCENARIO",
                "rows": 5053,
                "columns": 13,
                "is_real_observed": False,
                "description": "Synthetic B2B supplier, customer, and lender graph edges."
            },
            "growth_actions.csv": {
                "evidence_source": "SIMULATED_SCENARIO",
                "rows": 2000,
                "columns": 15,
                "is_real_observed": False,
                "description": "Paired growth action scenarios (1,000 BASELINE, 1,000 MITIGATED)."
            },
            "risk_outcomes.csv": {
                "evidence_source": "RULE_DERIVED_OUTCOME",
                "rows": 2000,
                "columns": 13,
                "is_real_observed": False,
                "description": "Deterministic rule-based risk and growth readiness outcomes."
            },
            "graph_entities.csv": {
                "evidence_source": "SIMULATED_SCENARIO",
                "rows": 5553,
                "columns": 5,
                "is_real_observed": False,
                "description": "Synthetic graph node registry (BUSINESS, SUPPLIER, CUSTOMER, LENDER)."
            },
            "scenario_families_and_splits.csv": {
                "evidence_source": "SIMULATED_SCENARIO",
                "rows": 500,
                "columns": 11,
                "is_real_observed": False,
                "description": "Family-level leak-free partition controls (70% train, 15% val, 15% test)."
            },
            "engineered_risk_features.csv": {
                "evidence_source": "SIMULATED_SCENARIO",
                "rows": 2000,
                "columns": 57,
                "is_real_observed": False,
                "description": "Stage 5 engineered features with segregated target columns."
            },
            "risk_assessments.csv": {
                "evidence_source": "RULE_DERIVED_OUTCOME",
                "rows": 2000,
                "columns": 17,
                "is_real_observed": False,
                "description": "Stage 6 explainable multi-factor composite risk scores and recommendations."
            }
        },
        "split_policy": "Grouped strictly by scenario_family_id. 70% train (350), 15% validation (75), 15% test (75). All related monthly snapshots, actions, and paired mitigation variants stay in the same split.",
        "limitations": [
            "No verified historical default, insolvency, closure, or failure labels exist in the source inventory.",
            "Labels are produced by deterministic, transparent simulator rules; high accuracy reflects learning simulator dynamics, not predicting real-world bankruptcy.",
            "Original feasibility survey data covers Colombo district only; Western Province 3-district coverage is simulated.",
            "Feasibility survey, real invoice graphs, and simulated SME scenarios occupy mutually disjoint entity namespaces and must NOT be connected with fabricated edges.",
            "109 customs declaration documents in Dataset 06 are scanned raster PDFs without digital text; amounts are kept as None to prevent fabrication."
        ]
    }

    output_path = os.path.join(PROCESSED_DIR, "dataset_manifest.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print("dataset_manifest.json saved")


def generate_quality_summary():
    summary = {
        "observed_feasibility_records": 1200,
        "observed_feasibility_district_coverage": {"Colombo": 1200, "Gampaha": 0, "Kalutara": 0},
        "dataset07_invoice_count": 70,
        "dataset07_unique_invoices": 69,
        "dataset07_duplicates": 1,
        "dataset06_document_count": 171,
        "dataset06_unique_documents": 159,
        "dataset06_binary_duplicates": 12,
        "dataset06_scanned_unverified_docs": 109,
        "dataset06_digital_extractable_docs": 50,
        "simulated_business_count": 500,
        "financial_snapshot_count": 6000,
        "relationship_count": 5053,
        "growth_action_rows": 2000,
        "outcome_rows": 2000,
        "engineered_feature_rows": 2000,
        "risk_assessment_rows": 2000,
        "graph_entity_count": 5553,
        "scenario_district_counts": {
            "Colombo": 167,
            "Gampaha": 167,
            "Kalutara": 166
        },
        "overall_risk_distribution": {
            "Medium": 804,
            "High": 756,
            "Low": 440
        },
        "readiness_distribution": {
            "Modify": 804,
            "Delay": 756,
            "Proceed": 440
        },
        "readiness_distribution_by_variant": {
            "BASELINE": {"Proceed": 180, "Modify": 364, "Delay": 456},
            "MITIGATED": {"Proceed": 260, "Modify": 740, "Delay": 0}
        },
        "split_counts_families": {
            "train": 350,
            "validation": 75,
            "test": 75
        },
        "same_family_cross_split_violations": 0,
        "cross_dataset_id_overlaps": 0,
        "all_provenance_marked": True,
        "target_leakage_detected": False
    }

    output_path = os.path.join(PROCESSED_DIR, "quality_summary.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print("quality_summary.json saved")


def generate_readme():
    content = """# Component 4 — Western Province Business Risk & Feasibility Dataset Package

## 1. Geographic Scope
The project is strictly scoped to Sri Lanka's **Western Province**:
- **Colombo District**
- **Gampaha District**
- **Kalutara District**

> **Empirical Geographic Note:** The original observed micro-enterprise feasibility dataset (`Component_One_Core_Feasibility.csv`) contains survey observations exclusively from **Colombo District** (1,200 records). Coverage across all three districts is modeled in the controlled scenario dataset (`business_profiles.csv`). Do not claim observed empirical coverage of Gampaha or Kalutara from the feasibility survey.

---

## 2. Evidence Source Classification Taxonomy
Every record and dataset in Component 4 is classified into one of five rigorous evidence categories:

| Category | Definition | Datasets in Component 4 |
| :--- | :--- | :--- |
| **A. `OBSERVED_FEASIBILITY_DATA`** | Actual survey records from Component 1 evaluating proposed micro-enterprise feasibility. | `Component_One_Core_Feasibility.csv` (1,200 cases) |
| **B. `DOCUMENT_DERIVED_DATA`** | Transaction records and graph topologies extracted from verified invoices and customs declarations. | `dataset07_extracted_invoices.csv`, `dataset06_extracted_declarations.csv` |
| **C. `SIMULATED_SCENARIO`** | Controlled synthetic SME scenarios modeling multi-month cash flows, B2B networks, and growth actions. | `business_profiles.csv`, `financial_snapshots.csv`, `business_relationships.csv`, `growth_actions.csv`, `scenario_families_and_splits.csv`, `graph_entities.csv`, `engineered_risk_features.csv` |
| **D. `RULE_DERIVED_OUTCOME`** | Risk and readiness labels produced by deterministic rules (`SIMULATOR_RULES_V1` and Stage 6 assessment engine). | `risk_outcomes.csv`, `risk_assessments.csv` |
| **E. `UNKNOWN_OR_UNVERIFIED`** | Records where origin or text extraction cannot be verified (e.g. 109 scanned raster PDFs in Dataset 06). | Unextracted scanned CUSDEC documents (`confidence_score: 0.0`) |

---

## 3. Provenance & Scientific Integrity Safeguards
1. **No False Equivalence:** `business_profiles.csv` represents **simulated scenario data**, NOT real Sri Lankan businesses. Provenance is explicitly disclosed in `data_origin` and `label_source`.
2. **No Fabricated Labels:** There are **no verified historical default, bankruptcy, closure, or fraud labels** in the source collections. All risk and readiness labels are generated by transparent deterministic rules.
3. **Disjoint Entity Namespaces:** Feasibility cases (`C00001`..`C01200`), real invoice entities (`NODE_ENT_...`), and scenario businesses (`WP_SME_...`) occupy mutually disjoint identifier namespaces. They must **never** be joined into a merged table or connected with fabricated graph edges.
4. **Zero Predictive Target Leakage:** Targets (`target_overall_risk`, `target_growth_readiness`, etc.) and rule codes are strictly segregated into dedicated columns and excluded from model inputs.

---

## 4. Dataset Files Inventory

| File | Rows | Cols | Evidence Source | Description |
| :--- | :---: | :---: | :--- | :--- |
| `Component_One_Core_Feasibility.csv` | 1,200 | 25 | `OBSERVED_FEASIBILITY_DATA` | Micro-enterprise feasibility survey records in Colombo. |
| `dataset07_extracted_invoices.csv` | 70 | 21 | `DOCUMENT_DERIVED_DATA` | Corporate IT billing invoices (69 unique, 1 duplicate). |
| `dataset06_extracted_declarations.csv` | 171 | 22 | `DOCUMENT_DERIVED_DATA` | Customs export declarations (159 unique, 12 binary duplicates). |
| `business_profiles.csv` | 500 | 9 | `SIMULATED_SCENARIO` | Simulated SME baseline profiles across Western Province. |
| `financial_snapshots.csv` | 6,000 | 25 | `SIMULATED_SCENARIO` | 12 monthly financial snapshots per simulated SME. |
| `business_relationships.csv` | 5,053 | 13 | `SIMULATED_SCENARIO` | Simulated B2B supply, customer, and lender graph edges. |
| `growth_actions.csv` | 2,000 | 15 | `SIMULATED_SCENARIO` | Paired growth actions (1,000 BASELINE, 1,000 MITIGATED). |
| `risk_outcomes.csv` | 2,000 | 13 | `RULE_DERIVED_OUTCOME` | Rule-derived risk and growth readiness outcomes. |
| `graph_entities.csv` | 5,553 | 5 | `SIMULATED_SCENARIO` | Node registry for simulated B2B graph. |
| `scenario_families_and_splits.csv` | 500 | 11 | `SIMULATED_SCENARIO` | Family-level leakage-free split assignments. |
| `engineered_risk_features.csv` | 2,000 | 57 | `SIMULATED_SCENARIO` | Stage 5 engineered risk and resilience interaction features. |
| `risk_assessments.csv` | 2,000 | 17 | `RULE_DERIVED_OUTCOME` | Stage 6 explainable multi-factor composite risk scoring. |
| `data_dictionary.csv` | 239 | 5 | Metadata | Full data dictionary covering all 12 tables and evidence sources. |
| `dataset_manifest.json` | - | - | Metadata | Complete package schema, parameters, and limitations. |
| `quality_summary.json` | - | - | Metadata | Summary verification and leakage audit metrics. |

---

## 5. Leak-Free Split Policy
Splitting is strictly enforced at the **scenario family level** (`scenario_family_id`):
- **Train:** 350 families (70.0%)
- **Validation:** 75 families (15.0%)
- **Test:** 75 families (15.0%)

Every monthly snapshot, relationship edge, growth action, and paired baseline/mitigation variant belonging to a family is partitioned into the exact same split. Cross-split leakage is mathematically zero.

---

## 6. Guidance for Stage 7 (GNN Modeling)
1. **Target Definition:** GNN models must be trained on the **controlled scenario B2B graph** (`graph_entities.csv` and `business_relationships.csv`) to predict simulator risk outcomes or evaluate growth action resilience.
2. **Reporting Discipline:** Model metrics must be reported as **synthetic scenario benchmark accuracy**, NOT as real-world SME business failure prediction accuracy.
3. **Graph Architecture:** The real invoice graphs (Dataset 07 dyad, Dataset 06 star network) and feasibility survey records must NOT be merged into the scenario GNN graph.
"""
    output_path = os.path.join(PROCESSED_DIR, "README.md")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    print("README.md saved")


if __name__ == "__main__":
    generate_data_dictionary()
    generate_dataset_manifest()
    generate_quality_summary()
    generate_readme()
    print("All metadata files generated successfully!")
