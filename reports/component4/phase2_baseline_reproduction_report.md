# Component 4: Phase 2 Independent Baseline Reproduction Report

**Execution Date:** 2026-10-21  
**Git Branch:** `Component_4_Tharindu`  
**Reference Commit:** [`ee69f68`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System)  
**Execution Environment:** Windows 11, Python 3.13.7, PyTorch 2.14.1+cpu, PyTorch Geometric 2.4.0, Scikit-Learn 1.9.1, Pandas 3.0.6, NumPy 2.5.3  
**Artifact Report:** [`reports/component4/baseline_reproduction_report.json`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/reports/component4/baseline_reproduction_report.json)

---

## 1. Verified Data, Graph, & Preprocessing Manifest

- **Total Enterprises:** 1,000 businesses in Western Province (Colombo, Gampaha, Kalutara).
- **Temporal Horizon:** 24 months (`2024-01` through `2025-12`).
- **Strict Leakage Prevention:** Features are computed strictly on **Months 18 through 23** via `_get_strictly_preceding()`. The prediction target is defined strictly at **Month 24**.
- **Feature Dimension:** 41 features (28 numerical ratios/means + 9 one-hot business sectors + 4 one-hot business stages). Zero missing or infinite values.
- **Preprocessor Fitting:** Scaler and encoders fitted **exclusively on the training partition** (700 businesses).
- **Graph Partitioning:**
  - Total Simulated Edges: 3,487 (all marked `Verified_Flag = 0`).
  - $G_{\text{train}}$ Intra-Edges: 1,721 edges on 700 nodes (plus self-loops).
  - $G_{\text{val}}$ Intra-Edges: 80 edges on 150 nodes (plus self-loops).
  - $G_{\text{test}}$ Intra-Edges: 82 edges on 150 nodes (plus self-loops).
  - Cross-Split Edges: 1,604 edges (strictly excluded from training message-passing).

---

## 2. Ground-Truth Class Support Across Partitions

| Partition | Size ($N$) | Low Risk (0) | Medium Risk (1) | High Risk (2) |
|---|---|---|---|---|
| **Full Population** | 1,000 | 758 (75.80%) | 240 (24.00%) | 2 (0.20%) |
| **Train Split (70%)** | 700 | 519 (74.14%) | 180 (25.71%) | 1 (0.14%) |
| **Validation Split (15%)** | 150 | 118 (78.67%) | 31 (20.67%) | 1 (0.67%) |
| **Held-out Test Split (15%)**| 150 | **121 (80.67%)** | **29 (19.33%)** | **0 (0.00%)** |

> [!IMPORTANT]
> Because only 2 businesses in the entire dataset are labeled High Risk at Month 24, random splitting assigned 1 to Train, 1 to Validation, and **0 to Test**.
> Consequently, empirical test evaluation measures binary Low vs. Medium discrimination. Any model predicting High Risk on the test split generates purely false-positive classifications.

---

## 3. Independent Reproduction Results

### A. Non-Graph Baseline (Random Forest)
- **Configuration:** `RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42, class_weight='balanced')`.
- **Validation Metrics ($N=150$):**
  - Accuracy: **64.67%** | Balanced Accuracy: **44.84%** | Macro-F1 (3-class): **0.3987** | Binary Macro-F1: **0.6060**
  - Confusion Matrix:
    $$\begin{bmatrix} 75 & 43 & 0 \\ 9 & 22 & 0 \\ 0 & 1 & 0 \end{bmatrix}$$
    *(Medium Recall: 22 / 31 = 70.97%)*
- **Held-Out Test Metrics ($N=150$):**
  - Accuracy: **55.33%** | Balanced Accuracy: **51.34%** | Macro-F1 (3-class): **0.3186** | Binary Macro-F1: **0.4779**
  - Confusion Matrix:
    $$\begin{bmatrix} 70 & 51 & 0 \\ 16 & 13 & 0 \\ 0 & 0 & 0 \end{bmatrix}$$
    *(Low Recall: 57.85%, Medium Recall: 44.83%, High Predictions: 0)*

---

### B. Existing Checkpoint v2.1 (Evaluated on Leakage-Free Features)
- **Model Checkpoint:** `models/component4/gnn_risk_model_inductive_v2.1.pt`
- **Isolated Test Subgraph ($G_{\text{test}}$, 150 nodes, 82 edges):**
  - Accuracy: **58.00%** | Balanced Accuracy: **50.37%** | Macro-F1 (3-class): **0.3284** | Binary Macro-F1: **0.4947**
  - Confusion Matrix:
    $$\begin{bmatrix} 76 & 40 & 5 \\ 17 & 11 & 1 \\ 0 & 0 & 0 \end{bmatrix}$$
    *(Low Recall: 62.81%, Medium Recall: 37.93%, False Positive High Predictions: 6)*
- **Extended Network Inference ($G_{\text{all}}$, test nodes linked to network):**
  - Accuracy: **74.67%** | Balanced Accuracy: **50.21%** | Macro-F1 (3-class): **0.3326** | Binary Macro-F1: **0.5163**
  - Confusion Matrix:
    $$\begin{bmatrix} 109 & 10 & 2 \\ 25 & 3 & 1 \\ 0 & 0 & 0 \end{bmatrix}$$
    *(Low Recall: 90.08%, Medium Recall: 10.34%, False Positive High Predictions: 3)*

---

### C. Fresh Inductive GNN Trained on Leakage-Free Features from Scratch
- **Protocol:** Strict Inductive training on $G_{\text{train}}$ only (seed 42, 60 epochs, lr 0.008, weight_decay 1e-4, training class weights: `[0.4496, 1.2963, 233.3333]`).
- **Validation Tuning:** Best validation Macro-F1: **0.3151** at Epoch 54.
- **Isolated Test Subgraph ($G_{\text{test}}$):**
  - Accuracy: **57.33%** | Balanced Accuracy: **53.89%** | Macro-F1 (3-class): **0.3322** | Binary Macro-F1: **0.4983**
  - Confusion Matrix:
    $$\begin{bmatrix} 72 & 49 & 0 \\ 15 & 14 & 0 \\ 0 & 0 & 0 \end{bmatrix}$$
    *(Low Recall: 59.50%, Medium Recall: 48.28%, False Positive High Predictions: 0)*
- **Extended Network Inference ($G_{\text{all}}$):**
  - Accuracy: **62.00%** | Balanced Accuracy: **48.92%** | Macro-F1 (3-class): **0.3227** | Binary Macro-F1: **0.4840**
  - Confusion Matrix:
    $$\begin{bmatrix} 85 & 36 & 0 \\ 21 & 8 & 0 \\ 0 & 0 & 0 \end{bmatrix}$$
    *(Low Recall: 70.25%, Medium Recall: 27.59%, False Positive High Predictions: 0)*

---

## 4. Reconciliation of Metrics: Earlier Reported vs. Leakage-Free

| Model & Evaluation Setup | Training Data Temporal State | Test Accuracy | Test Balanced Acc | 3-Class Macro-F1 | Binary Macro-F1 | Medium Recall | High FP Count |
|---|---|---|---|---|---|---|---|
| **Random Forest (Earlier Stored)** | Contaminated (incl. Month 24) | 59.33% | 56.44% | 0.3459 | 0.5189 | 51.72% | 0 |
| **Random Forest (Reproduced)** | Strict Leakage-Free (M18–23) | 55.33% | 51.34% | 0.3186 | 0.4779 | 44.83% | 0 |
| **GNN Checkpoint v2.1 (Stored)** | Contaminated (incl. Month 24) | 72.00% | 47.25% | 0.3114 | 0.5040 | 6.90% | 5 |
| **GNN Checkpoint v2.1 (Re-eval)**| Strict Leakage-Free (M18–23) | 74.67% | 50.21% | 0.3326 | 0.5163 | 10.34% | 3 |
| **Fresh GNN Isolated Subgraph** | Strict Leakage-Free (M18–23) | 57.33% | **53.89%** | **0.3322** | 0.4983 | **48.28%** | 0 |
| **Fresh GNN Extended Network** | Strict Leakage-Free (M18–23) | 62.00% | 48.92% | 0.3227 | 0.4840 | 27.59% | 0 |

### Discrepancy Reconciliation Summary:
1. **Temporal Leakage Effect:**
   In the earlier stored reports, contemporaneous Month 24 data inflated the Random Forest's balanced accuracy to 56.44%. When strictly evaluated on preceding records (Months 18–23), true tabular balanced accuracy is **51.34%**.
2. **Relational Majority-Smoothing Effect:**
   When test nodes connect to training nodes at inference time (Extended Network), the raw accuracy increases ($57.33\% \to 62.00\%$), but **balanced accuracy deteriorates ($53.89\% \to 48.92\%$)** and Medium recall collapses from $48.28\%$ down to $27.59\%$. Because $74.14\%$ of training neighbors are Low Risk, message passing diffuses majority-class information into distressed nodes, masking minority risk.
3. **High-Risk Class Truth:**
   The fresh leakage-free model produced **0 false-positive High predictions**, aligning with the actual $0.0\%$ support in the test set.

---

## 5. Phase 3 Experiment Design (Validation Cohort Exclusively)

With the baseline reproduced and documented, we proceed to evaluate imbalance remedies **strictly on the 150 validation SMEs**:

- **Validation Target Support:** Low: 118, Medium: 31, High: 1.
- **Candidate Configurations:**
  1. **Config A (Baseline):** Standard Cross-Entropy with inverse-frequency class weights $w_c = \frac{N}{3 \cdot N_c}$ derived from training labels.
  2. **Config B (Smoothed Class Weighting):** Square-root inverse frequency weighting $w_c = \sqrt{\frac{N}{N_c}}$, preventing extreme gradient distortion on the single training High-risk instance while boosting Medium-risk sensitivity.
  3. **Config C (Multi-Class Focal Loss):**
     $$\mathcal{L}_{\text{focal}} = -\sum_{c} \alpha_c (1 - p_c)^\gamma \log(p_c)$$
     Grid search over $\gamma \in \{1.0, 1.5, 2.0\}$ and $\alpha = \text{class\_weights}$, evaluating whether down-weighting easy Low-risk examples prevents the majority class from dominating parameter updates.
- **Selection Criterion:** Candidate with the highest **Validation Balanced Accuracy** and **Validation Macro-F1**.
- **Held-Out Test Set Isolation:** The test split ($N=150$) will remain strictly untouched until final evaluation in Phase 4.
