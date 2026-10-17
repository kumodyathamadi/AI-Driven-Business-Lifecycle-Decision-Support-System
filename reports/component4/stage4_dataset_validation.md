# Component 4: Stage 4 — Dataset Integration and Validation Report

**Project:** AI-Driven Business Lifecycle Decision Support System  
**Component:** Component 4 — GNN-Based Business Risk Prediction, Mitigation and Scalable Growth Recommendation  
**Stage:** Stage 4 — Dataset Integration, Schema Harmonization, and Split Leakage Audit  
**Date:** October 17, 2026  
**Status:** Completed & Validated  

---

## 1. Executive Summary

This report delivers the empirical and methodological validation for **Stage 4: Dataset Integration and Validation** for Component 4. A rigorous, reproducible validation audit was executed across all active data assets in the repository:
1. **Raw Feasibility Survey Dataset** (`data/raw/Component_One_Core_Feasibility.csv`)
2. **Document-Extracted Invoice Collections** (`data/processed/component4/dataset07_extracted_invoices.csv` & `dataset06_extracted_declarations.csv`)
3. **Controlled Western Province SME Risk Scenarios Package** (`data/processed/component4/`)

### Key Findings & Empirical Boundaries:
- **Strict Disjoint Namespaces:** The 1,200 feasibility survey respondents (`C00001`–`C01200`), the 11 document-extracted enterprise entities (`NODE_ENT_D07_01`, `NODE_ENT_D06_EXP_01`, etc.), and the 500 controlled scenario SMEs (`WP_SME_0001`–`WP_SME_0500`) share **zero identifiers, zero names, and zero transaction linkages**.
- **Non-Mergability Policy Enforced:** Attempting to join the feasibility records with invoice transaction data or scenario records by guessing identities is scientifically invalid. These datasets are kept strictly segregated into dedicated research tracks.
- **Geographic Scope Verification:** 100% of scenario records are strictly confined to Sri Lanka's **Western Province**, spanning **Colombo** (167 businesses), **Gampaha** (167 businesses), and **Kalutara** (166 businesses).
- **Target Segregation:** The feasibility classification target (`feasibility_label`: *Feasible*, *Conditionally Feasible*, *Infeasible*) is maintained strictly distinct from Component 4 operational risk and growth readiness targets (`overall_risk_label`: *Low*, *Medium*, *High*; `growth_readiness_label`: *Proceed*, *Modify*, *Delay*).
- **Leak-Free Family Split:** All 500 base business families are partitioned 70% train (350 families), 15% validation (75 families), and 15% test (75 families). All 12 monthly snapshots, 2 growth actions, and paired `BASELINE`/`MITIGATED` variants stay in the exact same split, preventing cross-partition data leakage.

---

## 2. Comprehensive Dataset Inventory & Provenance

The table below summarizes all active datasets audited by [`src/component4/dataset_validation.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/src/component4/dataset_validation.py):

| Dataset Key | File Path | Records | Columns | Provenance & Origin | Real vs Simulated | Geographic Coverage |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- |
| **Feasibility Survey** | `data/raw/Component_One_Core_Feasibility.csv` | 1,200 | 25 | `ANONYMIZED_SURVEY` | Observed survey | Colombo District (Western Province) |
| **Dataset 07 (Invoices)** | `data/processed/component4/dataset07_extracted_invoices.csv` | 70 | 21 | `DOCUMENT_EXTRACTED` | Observed corporate invoices | Sri Lanka / Australia |
| **Dataset 06 (CUSDEC)** | `data/processed/component4/dataset06_extracted_declarations.csv` | 171 | 22 | `DOCUMENT_EXTRACTED` | Observed customs docs | Sri Lanka (Air Cargo / Seaport exports) |
| **Business Profiles** | `data/processed/component4/business_profiles.csv` | 500 | 9 | `SIMULATED_SCENARIO` | Controlled scenario | Western Province (Colombo, Gampaha, Kalutara) |
| **Financial Snapshots** | `data/processed/component4/financial_snapshots.csv` | 6,000 | 25 | `SIMULATED_SCENARIO` | Controlled scenario | Western Province (Colombo, Gampaha, Kalutara) |
| **Business Relationships** | `data/processed/component4/business_relationships.csv` | 5,053 | 13 | `SIMULATED_SCENARIO` | Controlled scenario | Western Province (intra-family edges) |
| **Growth Actions** | `data/processed/component4/growth_actions.csv` | 2,000 | 15 | `SIMULATED_SCENARIO` | Controlled scenario | Western Province (paired variants) |
| **Risk Outcomes** | `data/processed/component4/risk_outcomes.csv` | 2,000 | 13 | `SIMULATED_SCENARIO` | Controlled scenario | Western Province (rule-derived labels) |
| **Graph Entities** | `data/processed/component4/graph_entities.csv` | 5,553 | 5 | `SIMULATED_SCENARIO` | Controlled scenario | Western Province (nodes registry) |
| **Splits & Families** | `data/processed/component4/scenario_families_and_splits.csv` | 500 | 11 | `SIMULATED_SCENARIO` | Controlled scenario | Western Province (split controls) |

---

## 3. Data Integrity, Missing Values, and Duplicates Audit

### 3.1 Missing Values Analysis
- **Feasibility Survey:** Zero missing values across all 1,200 rows and 25 columns (100% complete).
- **Business Profiles:** Zero missing values across all 500 rows.
- **Financial Snapshots:** Zero missing values across all 6,000 rows.
- **Business Relationships (500 missing):** Exactly 500 rows have null `dependency_percentage`. These correspond strictly to `BORROWS_FROM` loan edges, where a supplier volume share is not semantically applicable. Supplier and customer edges have 100% complete dependency percentages.
- **Growth Actions (1,000 missing):** Exactly 1,000 rows have null `mitigation_recommendation`. These correspond to the unmitigated `BASELINE` variant where no intervention has been applied. All 1,000 `MITIGATED` variants have full recommendation documentation.
- **Risk Outcomes (1,000 missing):** Exactly 1,000 rows have null `mitigation_codes`, matching the unmitigated `BASELINE` variant.
- **Graph Entities (5,053 missing):** The 500 central business nodes have complete district and sector classifications; external counterparty entities (banks, suppliers, buyers) have null internal district attributes.
- **Extracted Invoices & Declarations:** Null fields in Dataset 06 and 07 reflect unextracted raster scan fields (`confidence_score = 0.0`) or non-duplicate tracking columns (`duplicate_of_doc_id`), strictly preserving document provenance without fabricating values.

### 3.2 Duplicate Analysis
- **Feasibility Records:** 0 duplicate rows; `case_id` is 100% unique (`C00001`–`C01200`).
- **Dataset 07:** 69 unique invoices, 1 verified semantic content duplicate (`DOC_D07_070` duplicate of `DOC_D07_069`).
- **Dataset 06:** 159 unique customs declarations, 12 exact binary duplicate files (matching SHA-256 hashes).
- **Scenario Profiles:** 0 duplicate rows; `business_id` is 100% unique (`WP_SME_0001`–`WP_SME_0500`).
- **Scenario Actions:** 0 duplicate rows; composite key `(action_id, variant)` is strictly unique across all 2,000 rows.

---

## 4. Geographic Coverage Verification

All Component 4 scenario records were validated against the official administrative boundaries of Sri Lanka's **Western Province**:

```
                       WESTERN PROVINCE (N = 500 Base SMEs)
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           ▼                            ▼                            ▼
        Colombo                      Gampaha                      Kalutara
     167 Businesses               167 Businesses               166 Businesses
        (33.4%)                      (33.4%)                      (33.2%)
```

- **Enforced Province:** `Western` (100% compliance across `business_profiles.csv`, `financial_snapshots.csv`, `growth_actions.csv`).
- **Sector Representation:** Distributed across `Retail & Wholesale Trade`, `Food & Beverage Services`, `Apparel & Textiles`, `Light Manufacturing`, `Information Technology Services`, `Logistics & Transportation`, and `Health & Wellness Services`.
- **Limitation Note:** District distributions reflect balanced scenario controls rather than empirical establishment counts from the Department of Census and Statistics.

---

## 5. Label Definitions and Segregation Policy

To avoid conceptual conflation and label leakage, target variables are strictly segregated:

### 5.1 Pre-Launch Economic Viability Target (Feasibility Dataset)
- **Target:** `feasibility_label`
- **Classes:** `Feasible` (314), `Conditionally Feasible` (682), `Infeasible` (204).
- **Semantics:** Evaluates pre-launch financial and operational viability based on initial capital, projected operating margin, and business type.
- **Role:** Exclusively evaluated under the Component 1 / Component 4 Stage 2 baseline model. **Not** used as a post-launch risk target.

### 5.2 Controlled Operational Risk & Growth Targets (Component 4 Scenario Package)
- **Primary Operational Target:** `overall_risk_label`
  - **Classes:** `Low` (440, 22.0%), `Medium` (804, 40.2%), `High` (756, 37.8%).
  - **Definition:** Deterministic composite indicator derived from cash runway stress, debt-service coverage, and relationship concentration.
- **Mitigation & Decision Target:** `growth_readiness_label`
  - **Classes:** `Proceed` (440, 22.0%), `Modify` (804, 40.2%), `Delay` (756, 37.8%).
  - **Definition:** Decision recommendation for proposed expansion actions based on post-action financial runway, capacity score, and investment burden.
- **De-escalation Dynamics:**

| Growth Readiness Class | BASELINE Variant (N=1,000) | MITIGATED Variant (N=1,000) | Impact of Mitigation Intervention |
| :--- | :---: | :---: | :--- |
| **Delay** | 756 (75.6%) | 0 (0.0%) | 100% of high-risk delay actions successfully de-escalated |
| **Modify** | 78 (7.8%) | 726 (72.6%) | Transformed into conditional execution plans |
| **Proceed** | 166 (16.6%) | 274 (27.4%) | Fully cleared to proceed post-mitigation |

---

## 6. Leakage Prevention and Split Policy Audit

Cross-validation leakage occurs when related observations (e.g. repeated time-series snapshots of the same business, or paired before/after mitigation variants) are split across training and evaluation partitions.

The validation script executed strict grouping audits:

```
                      SCENARIO FAMILY SPLIT PROTOCOL
                                    │
                         500 Scenario Families
                                    │
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
      Train (70%)            Validation (15%)           Test (15%)
      350 Families             75 Families              75 Families
     4,200 Snapshots          900 Snapshots            900 Snapshots
     1,400 Outcomes           300 Outcomes             300 Outcomes
```

### Verification Results:
1. **Scenario Family Overlap:**
   - `train` ∩ `validation` overlap: **0 families** (0.0%).
   - `train` ∩ `test` overlap: **0 families** (0.0%).
   - `validation` ∩ `test` overlap: **0 families** (0.0%).
2. **Multi-Split Families:** Exactly **0 families** span multiple partitions.
3. **Paired Variant Integrity:** All 2,000 growth action variants (`BASELINE` and `MITIGATED` pairs) reside strictly in the same split as their parent business profile and monthly snapshots.
4. **Partition Ratios:** Train = 70.0%, Validation = 15.0%, Test = 15.0%.

---

## 7. Cross-Dataset Non-Mergability Assessment

A fundamental integrity requirement of Component 4 is prohibiting artificial dataset joins:

| Dataset Pair | Identifiers Checked | Overlapping Identifiers | Integration Decision | Scientific Rationale |
| :--- | :--- | :---: | :---: | :--- |
| **Feasibility vs Scenario** | `case_id` (`C0...`) vs `business_id` (`WP_SME_...`) | **0** | **PROHIBITED** | Disjoint domains: anonymized survey respondents vs simulated SME profiles. |
| **Feasibility vs Invoices** | `case_id` (`C0...`) vs `entity_id` (`NODE_ENT_...`) | **0** | **PROHIBITED** | Disjoint domains: retail micro-enterprises vs corporate exporters/service providers. |
| **Scenario vs Invoices** | `business_id` vs `entity_id` | **0** | **PROHIBITED** | Disjoint domains: controlled scenarios vs real-world corporate tax invoices. |

**Conclusion:** The datasets must remain strictly decoupled. Machine learning baselines and GNN prototypes will operate within their well-defined domains without data contamination.

---

## 8. Reproducibility & Next Stage Readiness

- **Validation Script:** [`src/component4/dataset_validation.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/src/component4/dataset_validation.py)
- **Validation Report JSON:** [`reports/component4/stage4_validation_summary.json`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/reports/component4/stage4_validation_summary.json)
- **Test Suite Status:** Ready for automated unit tests under `tests/test_component4.py`.
- **Next Development Stage:** **Stage 5 — Risk Feature Engineering** ([`src/component4/risk_features.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/src/component4/risk_features.py)), implementing reproducible liquidity stress, debt service burden, Herfindahl–Hirschman Index (HHI) supplier concentration, and growth action cost ratios.
