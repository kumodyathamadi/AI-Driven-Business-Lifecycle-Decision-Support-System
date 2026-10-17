# Component 4: Stage 1 — Data Inventory and Graph Feasibility Report

**Project:** AI-Driven Business Lifecycle Decision Support System  
**Component:** Component 4 — GNN-Based Business Risk Prediction, Mitigation and Scalable Growth Recommendation  
**Stage:** Stage 1 — Repository, Environment, and Dataset Inspection  
**Date:** October 17, 2026  
**Status:** Completed  

---

## 1. Executive Summary

This report establishes the empirical foundation for **Component 4**. Before writing model code or designing graph architectures, an exhaustive audit was performed on the active Python environment, existing repository conventions, and the two datasets located in the workspace:
1. **Business Feasibility Dataset** (`data/raw/Component_One_Core_Feasibility.csv`)
2. **Tax Invoice / Customs Dataset** (`data/Dataset/06` and `data/Dataset/07`)

### Key Empirical Findings:
- **No Shared Entities:** The 1,200 SME feasibility records (`C00001`–`C01200`) represent anonymized local retail/service businesses in Colombo (grocery, clothing, bakery, salons). They share **zero identifiers, company names, or transaction linkages** with the companies in the invoice datasets (`Typefi Systems` and `Star Flora`).
- **No Ground-Truth Business Risk / Failure Labels:** Neither dataset contains historical business distress, default, bankruptcy, or failure labels. The feasibility dataset target (`feasibility_label`) measures **pre-launch economic viability** based on startup capital and operational parameters, which is fundamentally distinct from post-launch operational or financial risk.
- **Invoice Graph Topology:** 
  - `data/Dataset/07` consists of 70 recurring inter-company invoices between exactly two nodes (a 1-to-1 seller–buyer relationship over time).
  - `data/Dataset/06` consists of 171 export/customs declarations (53 text-extractable, 118 scanned image-only) representing a single exporter node submitting shipments to overseas consignees.
- **Architectural Implication:** Training a Graph Neural Network (GNN) on the raw invoice data for node-level risk prediction is **statistically undefensible without manufacturing synthetic ground-truth labels or artificial graph connections**. Therefore, per project guidelines (Cases C and D), Component 4 will build:
  1. A rigorous traditional ML baseline for the feasibility task.
  2. A defensible, privacy-preserving invoice relationship pipeline and graph constructor.
  3. A clearly labeled exploratory/scenario-based graph analysis and synthetic-scenario risk evaluation prototype.
  4. A standalone, modular Risk Mitigation and Growth Readiness decision-support prototype.

---

## 2. Environment and Package Verification

The inspection confirmed the active virtual environment (`.venv`) and verified core library versions:

| Package | Version | Status / Notes |
| :--- | :--- | :--- |
| **Python** | `3.13.7` (64-bit Windows) | Active interpreter |
| **PyTorch (`torch`)** | `2.14.1+cpu` | Operational, tensor creation verified |
| **PyTorch Geometric (`torch_geometric`)** | `2.4.0` | Operational, `Data` graph container verified |
| **scikit-learn** | `1.9.1` | Installed, ready for baseline models |
| **pandas** | `3.0.6` | Operational |
| **numpy** | `2.5.3` | Operational |
| **pypdf** | `6.21.0` | Installed to inspect PDF text streams without external OCR binaries |
| **CUDA** | `False` | CPU execution mode confirmed |

---

## 3. Dataset B: Feasibility Dataset Audit

- **File Path:** [`data/raw/Component_One_Core_Feasibility.csv`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/data/raw/Component_One_Core_Feasibility.csv)
- **Dimensions:** 1,200 rows × 25 columns
- **Data Completeness:** 0 missing values across all 25 columns (100% complete)
- **Duplicate Rows:** 0 duplicate rows
- **Identifier Integrity:** `case_id` is unique for every row (`C00001` to `C01200`), confirming it must be treated strictly as an identifier, not a predictive feature.

### 3.1 Target Variable Analysis: `feasibility_label`
The target column contains 3 distinct categorical classes:

| Class Label | Frequency (N) | Percentage (%) | Baseline Strategy |
| :--- | :---: | :---: | :--- |
| **Conditionally Feasible** | 682 | 56.83% | Majority class |
| **Feasible** | 314 | 26.17% | Intermediate class |
| **Infeasible** | 204 | 17.00% | Minority class |
| **Total** | **1,200** | **100.0%** | Multi-class setup |

> [!NOTE]
> The target distribution shows significant class imbalance (56.8% majority class). Evaluation must use stratified splitting and report Macro F1, Macro Recall, and per-class metrics alongside Accuracy.

### 3.2 Feature Categorization and Schema

#### A. Invariant / Zero-Variance Columns
- `district`: 100% "Colombo" (1,200 / 1,200)
- `province`: 100% "Western" (1,200 / 1,200)
*Observation:* Both columns carry zero predictive variance and should be dropped during preprocessing to prevent redundant dimensions.

#### B. Informational / Text Columns
- `case_id`: Primary record key (`C00001`–`C01200`) — must be excluded from feature matrices.
- `business_description`: 61 distinct short descriptions (e.g. "small clothing retail business", "online and local clothing sales") — closely aligned with `business_category`.

#### C. Informative Categorical Features (4 columns)
- `business_stage` (2 unique): `New` (843), `Existing` (357)
- `business_category` (4 unique): `Clothing/ Garment` (412), `Grocery/Mini-Mart` (327), `Bakery/Food/Grocery` (263), `Beauty Saloon` (198)
- `proposed_action` (4 unique): `start` (843), `maintain` (127), `expand` (119), `improve` (111)
- `competition_level` (3 unique): `Low` (525), `Medium` (404), `High` (271)
- `location_type` (46 unique): Sub-towns within Colombo district (e.g., Panagoda, Godagama, Pitipana, Kahathuduwa).

#### D. Numerical Features (15 columns)
All 15 numerical fields are non-negative:

| Feature Name | Min | Median | Mean | Std | Max | Zeros |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `available_capital_lkr` | 2,653 | 339,458 | 362,309 | 238,323 | 899,926 | 0 |
| `loan_amount_lkr` | 0 | 0 | 50,064 | 114,642 | 499,655 | 868 |
| `monthly_budget_lkr` | 40,000 | 179,936 | 185,699 | 84,728 | 499,286 | 0 |
| `initial_inventory_cost_lkr` | 10,000 | 85,270 | 87,030 | 45,860 | 199,840 | 0 |
| `expected_price_lkr` | 100 | 1,489 | 1,515 | 827 | 2,999 | 0 |
| `expected_customers_per_day` | 5 | 28 | 27.6 | 13.0 | 50 | 0 |
| `customer_demand_score` | 40 | 70 | 69.9 | 17.5 | 100 | 0 |
| `expected_operating_days_per_month` | 20 | 25 | 25.0 | 3.2 | 30 | 0 |
| `entrepreneur_experience_years` | 0 | 5 | 5.0 | 3.2 | 10 | 108 |
| `location_suitability_score` | 1 | 3 | 3.0 | 1.4 | 5 | 0 |
| `available_staff_count` | 0 | 2 | 2.5 | 1.7 | 5 | 180 |
| `required_staff_count` | 0 | 2 | 2.5 | 1.7 | 5 | 190 |
| `available_equipment_score` | 1 | 3 | 3.0 | 1.4 | 5 | 0 |
| `required_equipment_score` | 1 | 3 | 3.0 | 1.4 | 5 | 0 |
| `supplier_availability_score` | 1 | 3 | 3.0 | 1.4 | 5 | 0 |

---

## 4. Dataset A: Tax Invoices / Customs Dataset Audit

The tax invoice directory contains two subdirectories with distinctly different document types and structures:

### 4.1 Subdirectory `data/Dataset/07` (Digital Service Invoices)
- **Total Files:** 70 PDF files (approx. 40–80 KB each).
- **Text Extractability:** 70 / 70 (100% extractable with `pypdf`, native digital PDFs).
- **Domain:** Inter-company recurring software engineering and IT service fee invoices.
- **Parties Identified:**
  - **Seller / Service Provider:** `Typefi Systems (Pvt.) Ltd.` (Colombo 05, Sri Lanka).
  - **Buyer / Client:** `Typefi Systems Pty Ltd` (Queensland, Australia).
- **Temporal Range:** May 2022 to mid-2024 (monthly recurring service fee and quarterly adjusting invoices).
- **Extracted Fields Available:**
  - `Invoice Number`: Unique identifier (e.g., `INV-0097` to `INV-0168`).
  - `Invoice Date` & `Due Date`: Standardized dates present.
  - `Reference`: Service billing period (e.g., "Service Fee May 2022").
  - `Amount Due`: Typically zero or paid.
- **Duplicate Files:** Duplicate found: `Invoice INV-0168 (1).pdf` is identical to `Invoice INV-0168.pdf`.

### 4.2 Subdirectory `data/Dataset/06` (Customs & Export Declarations)
- **Total Files:** 171 PDF files (approx. 200 KB – 3.2 MB each).
- **Format Distribution:**
  - **Text-extractable PDFs:** 53 files (31%)
  - **Scanned Image-only PDFs:** 118 files (69%)
- **Domain:** Sri Lanka Customs Goods Declarations (CUSDEC Schedule II, Katunayake Exports Office KTEX1), Air Waybill loading lists, and commercial export packing lists.
- **Primary Exporter Identified:** `Star Flora (Pvt) Ltd` (Panagoda, Homagama, Sri Lanka).
- **Consignees:** Foreign floral and foliage distributors (e.g., SFH, BTFL, OZ, JD, BLOOMS, ADOMEX, FFS).
- **Duplicate Files:** Multiple duplicate file pairs found (e.g., `3366 OZ (1).pdf` and `3366 OZ.pdf`).

---

## 5. Graph Feasibility and GNN Target Assessment

Per user prompt guidelines (Section 5 and Section 6):

### 5.1 Linkability Between Invoices and Feasibility Cases
- **Feasibility Cases:** 1,200 micro/small businesses (anonymized `C00001`–`C01200`) in Colombo retail/service subsectors.
- **Invoices / CUSDEC:** Real medium-to-large corporate entities (`Typefi Systems` in IT services; `Star Flora` in commercial flora export).
- **Verdict:** **Zero cross-dataset overlap.** Matching SME cases with invoice corporate entities would constitute false data fabrication, which is strictly prohibited. Separate datasets must remain separate.

### 5.2 Network Graph Topology from Invoices
- In `Dataset 07`, only **2 business entities** exist (Typefi SL and Typefi Australia), linked by 69 distinct temporal billing events. This is a 2-node temporal link, not a complex multi-node transaction graph.
- In `Dataset 06`, Star Flora is the sole exporter with shipments to ~7 overseas buyers. 69% of documents are scanned images without OCR text.
- **Verdict:** A real-world business transaction graph extracted solely from these files comprises at most ~9–10 nodes in star/bipartite topologies, which is insufficient for meaningful GNN message-passing over high-dimensional graph neighborhoods.

### 5.3 Target Label Analysis (Case C & Case D Evaluation)
- Neither the feasibility dataset nor the invoice PDFs contain verified real-world business failure, loan default, or bankruptcy labels.
- In accordance with **Case C and Case D** of the project specification:
  - We will **not** invent ground-truth risk labels or claim false supervised business-risk prediction.
  - The feasibility baseline will strictly predict **pre-launch feasibility** (`feasibility_label`).
  - The graph pipeline will defensibly extract valid buyer–seller transaction attributes, build an empirical graph representation, and provide an exploratory/synthetic-scenario GNN module clearly documented as a prototype.
  - The Risk Mitigation and Growth Readiness layer will operate as a transparent, rule- and evidence-based decision-support prototype.

---

## 6. Privacy and Confidentiality Safeguards

The raw invoice and customs files contain real corporate names, registered office addresses, individual contact names, and Taxpayer Identification Numbers (TINs). To ensure privacy compliance:
1. **Zero Raw PII Exposure:** No TINs, personal names, or exact invoice dollar figures will be printed in application logs, git commits, or external reports.
2. **Entity Tokenization:** Extracted node representations in graph construction will use anonymized or hashed entity keys (e.g., `NODE_ENT_01`, `NODE_ENT_02`).
3. **Read-Only Raw Data:** Original files in `data/Dataset/` and `data/raw/` remain strictly unmodified.
4. **Git Protection:** Confirmed that `data/Dataset/` is not tracked in Git.

---

## 7. Stage 1 Verification Suite

A unit test suite was implemented in [`tests/test_component4.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/tests/test_component4.py) verifying:
1. PyTorch and PyTorch Geometric tensor/data initialization.
2. Feasibility dataset file presence, row count (1,200), column count (25), zero missing values, zero duplicates.
3. Uniqueness and format of `case_id`.
4. Target class set (`Conditionally Feasible`, `Feasible`, `Infeasible`) and exact frequencies.
5. Invoice directory existence and PDF file counts (70 and 171).

**Test Execution Result:**  
`Ran 5 tests in 0.032s — OK (5/5 passed)`

---

## 8. Roadmap for Next Stages

- **Stage 2:** Implement reproducible preprocessing pipeline and train traditional ML feasibility baselines (`DummyClassifier`, `LogisticRegression`, `RandomForestClassifier`), saving fitted pipelines and held-out test metrics.
- **Stage 3:** Build invoice extraction pipeline for `Dataset 07` (and extractable parts of `06`), construct the empirical transaction graph, and document graph statistics.
- **Stage 4:** Construct the GNN prototype (PyTorch Geometric GCN/GraphSAGE) with clearly separated experimental design and baseline comparisons.
- **Stage 5:** Implement Component 4's standalone Risk Mitigation and Scalable Growth Readiness module.
