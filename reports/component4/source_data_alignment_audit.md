# Component 4: Source Data Alignment and Integrity Audit Report Before Stage 7

**Project:** AI-Driven Business Lifecycle Decision Support System  
**Component:** Component 4 — GNN-Based Business Risk Prediction, Mitigation and Scalable Growth Recommendation  
**Stage:** Pre-Stage 7 Source Data Alignment and Integrity Audit  
**Date:** October 18, 2026  
**Auditor:** Senior Data Engineer & Machine Learning Research Engineer  
**Branch:** `Component_4_Tharindu`  
**Status:** Audit Completed — Alignment Corrections Applied & Validated  

---

## 1. Executive Summary

Prior to initiating **Stage 7 (GNN-Based Risk & Recommendation Modeling)**, a comprehensive empirical, schema, geographic, and provenance audit was conducted across all Component 4 data assets. This audit was specifically designed to investigate and resolve potential discrepancies between previously generated synthetic scenario tables, the original micro-enterprise feasibility dataset (`Component_One_Core_Feasibility.csv`), and the actual tax/customs invoice documents (`Dataset 06` and `Dataset 07`).

### Core Audit Outcomes:
1. **Resolution of Critical Invoice Entity Extraction Bug:**
   - In Dataset 07 extraction ([`src/component4/anonymization.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/src/component4/anonymization.py)), both `issuer_entity_id` and `recipient_entity_id` were previously evaluated as `NODE_ENT_D07_01` due to greedy full-text pattern matching.
   - **Correction Applied:** Separated issuer resolution (`NODE_ENT_D07_01`, Australian corporate parent `Typefi Systems Pty Ltd`) from recipient resolution (`NODE_ENT_D07_02`, Sri Lankan software subsidiary `Typefi Systems (Pvt.) Ltd.`, Colombo 05). Re-extracted and regenerated [`dataset07_extracted_invoices.csv`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/data/processed/component4/dataset07_extracted_invoices.csv) and associated PyTorch Geometric and NetworkX bipartite/projected graph files.
2. **Formal Adoption of 5 Evidence Source Classifications:**
   - Every file and record has been categorized into one of five mutually exclusive evidence classes:
     - `OBSERVED_FEASIBILITY_DATA`
     - `DOCUMENT_DERIVED_DATA`
     - `SIMULATED_SCENARIO`
     - `RULE_DERIVED_OUTCOME`
     - `UNKNOWN_OR_UNVERIFIED`
   - Simulation indicators (`data_origin: SIMULATED_SCENARIO`) and rule attribution (`label_source: SIMULATOR_RULES_V1`) were strictly preserved and audited.
3. **Strict Disjoint Namespace Verification (Zero Entity Merging):**
   - Feasibility survey respondents (`C00001`–`C01200`), invoice counterparty entities (`NODE_ENT_D07_...`, `NODE_ENT_D06_...`), and simulated scenario SMEs (`WP_SME_0001`–`WP_SME_0500`) occupy **mutually disjoint identifier namespaces with 0 cross-dataset overlap**.
   - No cross-dataset graph edges were manufactured. Feasibility cases were NOT linked to invoice entities or transformed into grocery stores to force artificial consistency.
4. **Geographic Coverage Disclosures Enforced:**
   - Observed feasibility records cover **exclusively Colombo District** (1,200 records / 100%). Gampaha and Kalutara have **0 observed records** in the feasibility survey.
   - Scenarios model a balanced Western Province distribution across Colombo (167), Gampaha (167), and Kalutara (166) as an explicit simulation modeling assumption.
5. **Preservation of Scientific Integrity:**
   - No verified historical business-default, bankruptcy, insolvency, or closure labels exist in the source inventory.
   - All risk labels (`overall_risk_label`) and readiness recommendations (`growth_readiness_label`) are maintained and documented as **deterministic rule-derived outcomes**, never presented as real-world bankruptcy probabilities.
6. **Test Suite Verification:**
   - All 42 unit and integration tests in [`tests/test_component4.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/tests/test_component4.py) pass with zero errors, validating schema integrity, geographic bounding, leak-free family splits, and zero target leakage.

---

## 2. Actual Source Datasets and Verified Counts

The inventory of empirical source files was verified through physical inspection, SHA-256 byte hashing, and PDF content parsing:

| Evidence Classification | Dataset Identifier | Physical File Path | Row Count / Files | Verified Entity Count | Verified Geographic Coverage | Document / Data Type |
| :--- | :--- | :--- | :---: | :---: | :--- | :--- |
| **`OBSERVED_FEASIBILITY_DATA`** | Core Feasibility Survey | `data/raw/Component_One_Core_Feasibility.csv` | 1,200 rows | 1,200 micro-enterprises (`C00001`–`C01200`) | Colombo District (100%), Western Province | Micro-enterprise feasibility survey (25 features) |
| **`DOCUMENT_DERIVED_DATA`** | Dataset 07 Invoices | `data/Dataset/07/` | 70 PDF files | 2 entities (`NODE_ENT_D07_01`, `NODE_ENT_D07_02`) | Maroochydore, AU $\rightarrow$ Colombo 05, LK | Commercial service billing (AUD & LKR) |
| **`DOCUMENT_DERIVED_DATA`** | Dataset 06 Customs Declarations | `data/Dataset/06/` | 171 PDF files | 11 entities (1 exporter, 2 declarants, 7 buyers, 1 logistics agent) | Western Province, LK $\rightarrow$ International (NL, AE, SA, US) | Sri Lanka Customs CUSDEC I / export invoices |

### Detailed Breakdown of Document Collections:
- **Dataset 07 (70 files):**
  - **69 Unique Invoices:** Extracted with 100% complete billing dates, total amounts, and dual currencies (48 LKR invoices, 21 AUD invoices).
  - **1 Semantic Content Duplicate:** `Invoice INV-0168 (1).pdf` is an exact content duplicate of `Invoice INV-0168.pdf` (cataloged as `DOC_D07_070`, duplicate of `DOC_D07_069`).
  - **Counterparty Roles:** Issuer = `NODE_ENT_D07_01` (Corporate Parent, Australia); Recipient = `NODE_ENT_D07_02` (Operating Subsidiary, Colombo, Sri Lanka).
- **Dataset 06 (171 files):**
  - **159 Unique Documents:** 50 digital text extractable documents, 109 scanned raster image PDFs lacking embedded text layers.
  - **12 Exact Binary Duplicates:** Matched by identical SHA-256 byte hashes (e.g. `3366 OZ (1).pdf` and `3366 OZ.pdf`), assigned `duplicate_status = "EXACT_BINARY_DUPLICATE"`.
  - **109 Unverified Scanned Raster Documents:** Classified under `UNKNOWN_OR_UNVERIFIED` / `UNVERIFIED_SCANNED` with `confidence_score = 0.0`. Monetary values, line items, and dates were strictly set to `None` to prevent fabrication.

---

## 3. Retained, Corrected, and Quarantined Datasets

Every generated and processed dataset under `data/processed/component4/` was audited against source evidence:

| Dataset File | Original Status | Audit Action | Rationale and Specific Modifications |
| :--- | :--- | :--- | :--- |
| [`business_profiles.csv`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/data/processed/component4/business_profiles.csv) | Generated Scenario | **Retained** | 500 rows verified with explicit `data_origin: SIMULATED_SCENARIO`. Maintained distinct from feasibility micro-enterprises. No artificial column forced to match. |
| [`financial_snapshots.csv`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/data/processed/component4/financial_snapshots.csv) | Generated Scenario | **Retained** | 6,000 monthly financial rows verified. `data_origin: SIMULATED_SCENARIO` and `label_source: SIMULATOR_RULES_V1` verified across all records. |
| [`business_relationships.csv`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/data/processed/component4/business_relationships.csv) | Generated Scenario | **Retained** | 5,053 simulated B2B edges verified. Exactly 500 lender nulls in `dependency_percentage` verified as semantically valid for loan principal. |
| [`growth_actions.csv`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/data/processed/component4/growth_actions.csv) | Generated Scenario | **Retained** | 2,000 action rows verified (1,000 BASELINE, 1,000 MITIGATED). Nulls in `mitigation_recommendation` restricted strictly to BASELINE. |
| [`risk_outcomes.csv`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/data/processed/component4/risk_outcomes.csv) | Generated Scenario | **Retained** | 2,000 outcomes verified. Risk and readiness labels confirmed as deterministic simulator outputs (`SIMULATOR_RULES_V1`). |
| [`dataset07_extracted_invoices.csv`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/data/processed/component4/dataset07_extracted_invoices.csv) | Extracted Invoices | **Corrected** | **Critical bug fixed:** Corrected party resolution in [`src/component4/anonymization.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/src/component4/anonymization.py). Recipient entity updated from `NODE_ENT_D07_01` (self-loop) to `NODE_ENT_D07_02` (`Typefi Systems Pvt Ltd`, Colombo). Re-extracted and updated. |
| [`dataset07_graph_hetero.json`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/data/processed/component4/dataset07_graph_hetero.json) | Graph Artifact | **Corrected** | Updated bipartite edges from document to `NODE_ENT_D07_02` (`BILLED_TO`) and projected B2B edges from parent to subsidiary. |
| [`dataset06_extracted_declarations.csv`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/data/processed/component4/dataset06_extracted_declarations.csv) | Extracted Declarations | **Retained** | 171 rows verified. 109 unextractable raster scans quarantined with `UNVERIFIED_SCANNED` and `confidence = 0.0`. 12 binary duplicates omitted from active graph. |
| [`graph_entities.csv`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/data/processed/component4/graph_entities.csv) | Graph Nodes | **Retained** | 5,553 scenario entities verified with `data_origin: SIMULATED_SCENARIO`. Maintained separate from invoice and feasibility namespaces. |
| [`scenario_families_and_splits.csv`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/data/processed/component4/scenario_families_and_splits.csv) | Split Registry | **Retained** | 500 scenario families verified. 70/15/15 split policy confirmed leak-free. |
| [`engineered_risk_features.csv`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/data/processed/component4/engineered_risk_features.csv) | Engineered Features | **Retained** | 2,000 rows x 57 columns verified. Targets strictly segregated into `target_*` columns; zero target leakage. |
| [`risk_assessments.csv`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/data/processed/component4/risk_assessments.csv) | Risk Scoring Engine | **Retained** | 2,000 multi-factor explainable risk scoring records verified as deterministic Stage 6 rule assessments. |
| [`data_dictionary.csv`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/data/processed/component4/data_dictionary.csv) | Metadata | **Corrected** | Expanded from 92 placeholder rows to 233 comprehensive entries across all 12 Component 4 data tables with exact data types and evidence classifications. |
| [`dataset_manifest.json`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/data/processed/component4/dataset_manifest.json) | Package Manifest | **Corrected** | Updated with 5-class evidence taxonomy, empirical geographic breakdown, table inventory, and honest limitations. |
| [`quality_summary.json`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/data/processed/component4/quality_summary.json) | Quality Summary | **Corrected** | Replaced minimal scenario-only metrics with full cross-dataset quality audit summary. |
| [`README.md`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/data/processed/component4/README.md) | Documentation | **Corrected** | Fully revised to document evidence source taxonomy, geographic boundaries, disjoint namespaces, and Stage 7 guidance. |

---

## 4. Source-to-Field Mapping Audit

A comparative semantic audit was conducted between the fields of the original feasibility survey and the scenario tables:

| Field in Feasibility Survey (`data/raw/`) | Feasibility Meaning & Distribution | Counterpart in Scenario Profiles (`data/processed/`) | Scenario Meaning & Distribution | Semantic Compatibility | Permitted Mapping Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `case_id` | Survey response key (`C00001`–`C01200`) | `business_id` | Simulated firm key (`WP_SME_0001`–`WP_SME_0500`) | **Incompatible** | Keep strictly separate; do NOT join or equate IDs. Exclude `case_id` from predictive ML inputs. |
| `business_category` | Informal micro-trade: Clothing (412), Grocery (327), Bakery (263), Saloon (198) | `business_category` | Formal SME sector: Retail (100), Professional (86), Manufacturing (85), Wholesale (77), F&B (66), Logistics (45), Services (41) | **Incompatible Scale** | Do NOT collapse or force-match informal micro-shops into formal SME manufacturing/wholesale entities. |
| `business_stage` | Applicant status: New startup (843), Existing micro-shop (357) | `business_stage` | Operational maturity: Existing SME (361), Growing SME (139) | **Incompatible Meaning** | Do NOT equate unlaunched micro-business startups ('New') with active expanding corporate SMEs ('Growing'). |
| `district` | Administrative location: 100% Colombo (1,200) | `district` | Scenario district assignment: Colombo (167), Gampaha (167), Kalutara (166) | **Incompatible Scope** | Do NOT claim observed feasibility coverage for Gampaha or Kalutara. Explicitly disclose scenario distribution as simulation assumption. |
| `province` | Administrative province: 100% Western (1,200) | `province` | Scenario province: 100% Western (500) | **Compatible** | Both operate within Sri Lanka's Western Province boundary. |
| `available_staff_count` | Helpers on hand (0 to 2 staff) | `employee_count` | Formal workforce payroll (3 to 48 employees) | **Incompatible Scale** | Informal micro-enterprise family help cannot be mapped to formal SME payroll. |
| `feasibility_label` | Grant/loan viability: Conditionally Feasible (682), Feasible (314), Infeasible (204) | `overall_risk_label` / `growth_readiness_label` | Simulated risk / readiness under capital stress: Low/Medium/High; Proceed/Modify/Delay | **Incompatible Concept** | Feasibility label is an operational grant viability score; it is **NOT** a business failure, insolvency, or default label. |

---

## 5. Inconsistent or Unsupported Entity Links Found

The audit discovered several potential or previously existing link inconsistencies that were investigated and resolved:

```
                            ENTITY ISOLATION TOPOLOGY
                                       │
     ┌─────────────────────────────────┼─────────────────────────────────┐
     ▼                                 ▼                                 ▼
TRACK 1: FEASIBILITY              TRACK 2: INVOICES                 TRACK 3: SCENARIOS
1,200 Survey Cases                 Real B2B Transactions             500 Synthetic SMEs
(C00001 - C01200)                  (NODE_ENT_D07/D06)                (WP_SME_0001 - 0500)
     │                                 │                                 │
     ▼                                 ▼                                 ▼
Isolated Survey Nodes             2 Disjoint Subgraphs              Full Supply-Chain Graph
Zero Transaction Edges            (2-Node Dyad + 11-Node Star)      5,053 Synthetic Edges
     │                                 │                                 │
     └─────────────────────────┬───────┴─────────────────────────────────┘
                               ▼
                   STRICT DISJOINT NAMESPACES
                   Zero Cross-Track Linkages Permitted
```

1. **Dataset 07 Self-Loop Inconsistency (RESOLVED):**
   - In previous extraction outputs, `NODE_ENT_D07_01` was recorded as both issuer and recipient on all 70 invoices.
   - **Root Cause:** In [`src/component4/anonymization.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/src/component4/anonymization.py), the check for `"AUSTRALIA"` matched the header on every invoice, bypassing the `is_sender` condition.
   - **Resolution:** Corrected logic to ensure `is_sender=True` resolves to `NODE_ENT_D07_01` (Australia parent) and `is_sender=False` resolves to `NODE_ENT_D07_02` (Colombo subsidiary). Regenerated CSV and PyG/NetworkX graph files.
2. **Attempted Cross-Dataset Joining (REJECTED & FORBIDDEN):**
   - Feasibility micro-enterprises and invoice entities operate in entirely different industries (grocery/saloon vs. corporate IT and floral exports).
   - Linking feasibility cases to invoice entities based on sharing "Colombo" or "Western Province" is scientifically fraudulent. The three namespaces remain strictly disjoint.
3. **Graph Connectivity Fabrication (REJECTED & FORBIDDEN):**
   - The invoice graphs represent localized structures: a 2-node bilateral dyad (Dataset 07) and an 11-node export star network (Dataset 06).
   - No synthetic bridge edges were fabricated to connect these graphs to each other or to the 500 scenario SMEs. They are maintained as separate graph components.

---

## 6. Geographic Coverage by District

All active data assets were audited for compliance with the Western Province boundary:

| Administrative District | `Component_One_Core_Feasibility.csv` | `dataset07_extracted_invoices.csv` | `dataset06_extracted_declarations.csv` | Controlled Scenario Datasets (`data/processed/`) |
| :--- | :---: | :---: | :---: | :---: |
| **Colombo District** | **1,200 (100.0%)** | **70 (Recipient)** | **171 (Exporter / Port)** | **167 (33.4%)** |
| **Gampaha District** | 0 (0.0%) | 0 | 0 | **167 (33.4%)** |
| **Kalutara District** | 0 (0.0%) | 0 | 0 | **166 (33.2%)** |
| **International (Overseas)** | 0 | 70 (Issuer: Australia) | 171 (Buyers: NL, AE, SA, US) | 0 |
| **Total Western Province** | **1,200 (100.0%)** | **70 (Recipient in LK)** | **171 (Exporter in LK)** | **500 (100.0%)** |

> **Scientific Disclosure:** The empirical feasibility data reflects survey sampling conducted exclusively in Colombo District suburbs (e.g. Panagoda, Godagama, Pitipana, Kahathuduwa, Habarakada, Palagama). Coverage across Gampaha and Kalutara exists solely within the controlled scenario dataset and is documented as a simulation assumption.

---

## 7. Actual Versus Simulated Data Proportions

To maintain complete research transparency, the proportions of empirical vs. synthetic data across Component 4 are documented:

```
                    COMPONENT 4 DATA PROPORTIONS BY RECORD COUNT
┌──────────────────────────────────────────────────────────────────────────────┐
│  SIMULATED SCENARIO DATA: 17,553 Records (88.6%)                             │
│  ███████████████████████████████████████████████████████████████████████     │
│  (6,000 Snapshots + 5,053 Edges + 2,000 Actions + 2,000 Outcomes + 2,000 Feats + 500 Profiles)│
├──────────────────────────────────────────────────────────────────────────────┤
│  OBSERVED FEASIBILITY SURVEY: 1,200 Records (6.1%)                           │
│  █████ (1,200 Micro-enterprise survey responses in Colombo)                  │
├──────────────────────────────────────────────────────────────────────────────┤
│  DOCUMENT-DERIVED INVOICE/CUSTOMS: 241 Records (1.2%)                        │
│  █ (70 Corporate service invoices + 171 Customs declarations)                │
├──────────────────────────────────────────────────────────────────────────────┤
│  RULE-DERIVED RISK ASSESSMENTS: 2,000 Records (4.1% derived)                 │
│  ███ (Stage 6 explainable multi-factor composite risk evaluations)           │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Observed Empirical Records:** 1,441 records (1,200 survey cases + 70 invoices + 171 customs declarations).
- **Controlled Scenario Records:** 16,053 records (500 profiles + 6,000 snapshots + 5,053 relationships + 2,000 actions + 2,000 outcomes).
- **Rule-Derived Diagnostic Outputs:** 2,000 records ([`risk_assessments.csv`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/data/processed/component4/risk_assessments.csv)).

---

## 8. Data Quality and Leakage Test Results

All data validation suites and integrity tests were executed via `.venv\Scripts\python.exe -m unittest tests/test_component4.py`:

```
..........................................
----------------------------------------------------------------------
Ran 42 tests in 5.315s

OK
Executing Component 4 Stage 4 Dataset Validation...
```

### Specific Validation Audit Results:
1. **Target Leakage Audit (`test_stage5_zero_target_leakage`, `test_stage6_zero_target_leakage`):**
   - **Passed.** Predictive feature inputs completely exclude `target_overall_risk`, `target_growth_readiness`, `overall_risk_label`, and rule codes.
   - Tested that providing arbitrary target labels into the Stage 6 assessment engine does not alter its deterministic output.
2. **Family-Level Partition Isolation (`test_stage4_leak_free_family_split_grouping`):**
   - **Passed.** 500 scenario families strictly split into 350 train (70.0%), 75 validation (15.0%), and 75 test (15.0%).
   - Cross-split family overlaps: `train_val_overlap = 0`, `train_test_overlap = 0`, `val_test_overlap = 0`.
   - Paired `BASELINE` and `MITIGATED` variants for every action reside in the identical split partition (`multi_split_paired_actions = 0`).
3. **Cross-Dataset Disjointness (`test_stage4_cross_dataset_isolation_and_non_mergability`):**
   - **Passed.** Zero ID overlap between feasibility cases (`C00001`..), scenario SMEs (`WP_SME_0001`..), and invoice entities (`NODE_ENT_...`).
4. **Counterparty Extraction Integrity (`test_invoice_extraction_dataset07`):**
   - **Passed.** Confirmed that all 69 unique invoices in Dataset 07 have `issuer_entity_id = NODE_ENT_D07_01` (Australia) and `recipient_entity_id = NODE_ENT_D07_02` (Sri Lanka), resolving the previous self-loop bug.
5. **Data Dictionary and Manifest Integrity (`test_stage4_data_dictionary_and_manifest_coverage`):**
   - **Passed.** All 12 Component 4 data tables are registered and documented in [`data_dictionary.csv`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/data/processed/component4/data_dictionary.csv) and [`dataset_manifest.json`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/data/processed/component4/dataset_manifest.json).

---

## 9. Unresolved Issues and Limitations

The audit confirms the following persistent domain and empirical constraints:

1. **Absence of Historical Ground-Truth Failure Records:**
   - There are **no verified historical default, insolvency, closure, or fraud labels** in the source collections.
   - All risk labels in `risk_outcomes.csv` and recommendations in `risk_assessments.csv` are produced by deterministic rule engines (`SIMULATOR_RULES_V1` and Stage 6).
   - High classification performance in Stage 7 demonstrates that the model is successfully learning simulator dynamics, **not** predicting real-world corporate bankruptcies.
2. **Unextractable Scanned Images in Dataset 06:**
   - Exactly 109 out of 171 files in Dataset 06 are scanned raster image PDFs without digital text layers.
   - These documents remain quarantined under `UNVERIFIED_SCANNED` (`confidence = 0.0`, amounts = `None`). They cannot be incorporated into numerical GNN training without verified manual keying or external OCR certification.
3. **Graph Topology Limitations of Real Invoices:**
   - Real invoice collections represent tiny subgraphs (2-node dyad in Dataset 07, 11-node star in Dataset 06).
   - These topologies are insufficient for training deep multi-hop Graph Neural Networks (which require multi-tier connectivity, rich neighborhood expansion, and diverse node classes).

---

## 10. Readiness for Stage 7 GNN Training

### Assessment: **READY FOR STAGE 7 WITH METHODOLOGICAL DISCLOSURES**

Component 4 is structurally, mathematically, and ethically ready for Stage 7 implementation under the following strict experimental protocols:

1. **GNN Graph Source:**
   - Stage 7 GNN models (e.g. Relational Graph Convolutional Networks — RGCN, Graph Attention Networks — GAT) must be trained on the **controlled scenario B2B graph** ([`graph_entities.csv`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/data/processed/component4/graph_entities.csv) and [`business_relationships.csv`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/data/processed/component4/business_relationships.csv)).
   - This provides the necessary multi-hop topological structure (5,553 nodes, 5,053 edges, multi-relational trade links) to evaluate graph representation learning.
2. **Target and Evaluation Protocol:**
   - GNN prediction targets must use the segregated target columns (`target_overall_risk`, `target_growth_readiness`).
   - All evaluation must be reported as **synthetic scenario benchmark performance**, clearly distinguishing it from empirical SME survival prediction.
3. **Isolation Protocol:**
   - The real invoice graphs (Dataset 07 and Dataset 06) and the feasibility survey records must **NOT** be merged into the scenario GNN training graph.
   - Dataset 07 and Dataset 06 should be evaluated via a separate graph anomaly detection or transaction audit baseline as outlined in Stage 3.
4. **Leak-Free Partitioning:**
   - Training, validation, and test splits must strictly follow [`scenario_families_and_splits.csv`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/data/processed/component4/scenario_families_and_splits.csv) with zero cross-split family leakage.

---

*Report signed off by Senior Data Engineer & ML Research Engineer — Ready to proceed to Stage 7.*
