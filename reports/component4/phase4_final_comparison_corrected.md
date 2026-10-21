# Component 4 — Phase 4 Final Research Comparison (Corrected Audit)

**Audit Execution Timestamp:** 2026-10-21 15:42:13  
**Git Branch:** `Component_4_Tharindu` | **Git Commit:** `47240cd`  
**Audit Status:** `VERIFIED_ACCURATE` (All metrics recomputed from saved models and arrays)  

---

## 1. Ground-Truth Data & Target Integrity Audit

### 1.1 Dataset Split and Target Counts

- **Total Businesses:** 1,000 businesses divided strictly by `Business_ID` using seed `42`.
- **Split Boundary:** 700 Train ($70\%$), 150 Validation ($15\%$), 150 Held-Out Test ($15\%$).
- **Feature Window:** Months 18–23 strictly preceding Month 24 target risk label.

| Split Partition | Total Count | Low Risk | Medium Risk | High Risk | % Low | % Medium | % High |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Training Split** | 700 | 519 | 180 | 1 | 74.1% | 25.7% | 0.14% |
| **Validation Split** | 150 | 118 | 31 | 1 | 78.7% | 20.7% | 0.67% |
| **Held-Out Test Split** | 150 | 121 | 29 | 0 | 80.7% | 19.3% | 0.00% |
| **Cohort Total** | 1,000 | 758 | 240 | 2 | 75.8% | 24.0% | 0.2% |

### 1.2 Resolution of Discrepancy: Validation Support 118/31/1 vs 114/30/6

> [!IMPORTANT]
> **Discrepancy Audit Findings:**  
> The earlier Phase 3 report correctly recorded validation support as **Low: 118, Medium: 31, High: 1**.
> The numbers `114/30/6` appeared **only in the conversational text of the previous assistant summary** and **never existed in any file on disk**.
> **Exact Origin:** The assistant conflated the candidate model's test accuracy of $76.00\%$ ($114 / 150$ correct predictions) with the validation Low count, and then drafted $114$, $30$, and $6$ (the number of false-positive High predictions made by GNN v2.1) into the text table.  
> **Permanent Truth:** The true, verified validation support on disk is **Low: 118 (78.67%), Medium: 31 (20.67%), High: 1 (0.67%)**.

---

## 2. Recomputed Performance Metrics (Held-Out Test Set, N=150)

All metrics below are recomputed directly from the actual checkpoint predictions and ground-truth arrays on disk:

| Model Name | Topology | Test Acc | BalAcc (3c) | BalAcc (2c) | Macro-F1 (3c) | Macro-F1 (2c) | Medium Recall | Predicted Counts [L/M/H] |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Random Forest Baseline** | Tabular | 55.33% | 51.34% | 51.34% | 0.3186 | 0.4779 | 44.8% (13/29) | 86 / 64 / 0 |
| **GNN v2.1 Baseline (Isolated Subgraph)** | Iso Sub | 58.00% | 50.37% | 50.37% | 0.3284 | 0.4926 | 37.9% (11/29) | 93 / 51 / 6 |
| **GNN v2.1 Baseline (Extended Network)** | Ext Net | 74.67% | 50.21% | 50.21% | 0.3326 | 0.4989 | 10.3% (3/29) | 134 / 13 / 3 |
| **Selected Candidate Focal g=1.5 (Isolated Subgraph)** | Iso Sub | 76.00% | 51.04% | 51.04% | 0.3344 | 0.5017 | 10.3% (3/29) | 137 / 13 / 0 |
| **Selected Candidate Focal g=1.5 (Extended Network)** | Ext Net | 79.33% | 49.17% | 49.17% | 0.2949 | 0.4424 | 0.0% (0/29) | 148 / 2 / 0 |
| **Sensitivity Candidate Focal g=3.0 (Isolated Subgraph)** | Iso Sub | 64.00% | 47.53% | 47.53% | 0.3170 | 0.4755 | 20.7% (6/29) | 113 / 37 / 0 |
| **Sensitivity Candidate Focal g=3.0 (Extended Network)** | Ext Net | 74.67% | 47.59% | 47.59% | 0.3013 | 0.4519 | 3.5% (1/29) | 139 / 11 / 0 |

### 2.1 Recomputed Confusion Matrices & Typo Discrepancy Resolution

Rows represent True Labels $[\text{Low}, \text{Medium}, \text{High}]$; Columns represent Predicted Labels $[\text{Low}, \text{Medium}, \text{High}]$:

#### 1. Random Forest Baseline:
```
[[70 51  0]
 [16 13  0]
 [ 0  0  0]]
```
- **Correct Predictions:** $70 + 13 = 83 / 150 = 55.33\%$.
- **Predicted Counts:** $70 + 16 = 86$ Low, $51 + 13 = 64$ Medium, $0$ High $\implies$ `86 / 64 / 0`.

#### 2. GNN Baseline v2.1 (Production Checkpoint, Isolated Subgraph):
```
[[76 40  5]
 [17 11  1]
 [ 0  0  0]]
```
- **Correct Predictions:** $76 + 11 = 87 / 150 = 58.00\%$.
- **Predicted Counts:** $76 + 17 = 93$ Low, $40 + 11 = 51$ Medium, $5 + 1 = 6$ High $\implies$ `93 / 51 / 6`.
- *(Correction: The previous chat text mistyped this as [[77, 39, 5], [16, 11, 2], [0, 0, 0]] which implied 93/50/7. The actual verified matrix above yields exactly 93/51/6).*

#### 3. Selected Candidate: Focal Loss $\gamma=1.5$ (Isolated Subgraph):
```
[[111  10   0]
 [ 26   3   0]
 [  0   0   0]]
```
- **Correct Predictions:** $111 + 3 = 114 / 150 = 76.00\%$ (Exact $76.00\%$).
- **Predicted Counts:** $111 + 26 = 137$ Low, $10 + 3 = 13$ Medium, $0$ High $\implies$ `137 / 13 / 0`.
- *(Correction: The previous chat text mistyped cell [0,0] as 110 instead of 111, falsely implying 113 correct and 136/14/0. The actual verified matrix above yields exactly 114 correct and 137/13/0).*

#### 4. Sensitivity Candidate: Focal Loss $\gamma=3.0$ (Isolated Subgraph):
```
[[90 31  0]
 [23  6  0]
 [ 0  0  0]]
```
- **Correct Predictions:** $90 + 6 = 96 / 150 = 64.00\%$.
- **Predicted Counts:** $90 + 23 = 113$ Low, $31 + 6 = 37$ Medium, $0$ High $\implies$ `113 / 37 / 0`.

---

## 3. Metric Definitions & Mathematical Relationships

1. **Three-Class vs Binary Balanced Accuracy:**
   `balanced_accuracy_score(y_true, y_pred)` in scikit-learn computes the unweighted mean of recall across classes present in `y_true`. Because the held-out test cohort contains only Low ($121$) and Medium ($29$) businesses, scikit-learn evaluates:
   $$\text{BalAcc} = \frac{\text{Recall}(\text{Low}) + \text{Recall}(\text{Medium})}{2}$$
   Therefore, 3-class Balanced Accuracy on this test cohort is mathematically identical to binary Balanced Accuracy.

2. **Three-Class Macro-F1 vs Binary Macro-F1:**
   When evaluating 3 classes (`labels=[0, 1, 2]`), the High-risk class has support = 0. All models receive $F_1(\text{High}) = 0.0$ (either from 0/0 via `zero_division=0` or from 0 true positives with 6 false positives in GNN v2.1). Therefore:
   $$\text{Macro-F1 (3-class)} = \frac{F_1(\text{Low}) + F_1(\text{Medium}) + 0.0}{3} = \frac{2}{3} \times \text{Macro-F1 (Binary)}$$
   - Selected Candidate: $0.5017 \times \frac{2}{3} = 0.3344$ (Exact match).
   - Random Forest: $0.4779 \times \frac{2}{3} = 0.3186$ (Exact match).
   - GNN v2.1: $0.4926 \times \frac{2}{3} = 0.3284$ (Exact match).

3. **Unevaluable High-Risk Class:**
   Because true High-risk support is 0, held-out High-risk precision, recall, and detection capability cannot be measured. It is scientifically impermissible to claim successful High-risk detection on unseen test data.

---

## 4. Bootstrap Confidence Intervals & Paired Hypothesis Tests

### 4.1 Individual 95% Percentile Bootstrap Confidence Intervals ($B=1,000$)

Resampling is performed with replacement at the business level ($N=150$ test businesses, seed `42`):

| Model Name | Accuracy (95% CI) | Balanced Accuracy (95% CI) | Macro-F1 3-class (95% CI) |
| :--- | :---: | :---: | :---: |
| **Random Forest Baseline** | 55.34% [47.33%, 64.00%] | 51.50% [40.97%, 61.87%] | 0.3180 [0.2646, 0.3724] |
| **GNN v2.1 Baseline (Isolated Subgraph)** | 57.97% [49.98%, 66.00%] | 50.33% [40.88%, 59.85%] | 0.3273 [0.2758, 0.3806] |
| **Selected Candidate Focal g=1.5 (Isolated Subgraph)** | 75.87% [68.67%, 82.02%] | 50.96% [45.53%, 57.51%] | 0.3325 [0.2850, 0.3892] |
| **Sensitivity Candidate Focal g=3.0 (Isolated Subgraph)** | 64.02% [56.67%, 71.33%] | 47.55% [39.88%, 56.25%] | 0.3161 [0.2696, 0.3656] |

### 4.2 Paired Bootstrap Hypothesis Testing ($\Delta = \text{Model A} - \text{Model B}$)

Rather than relying solely on overlapping confidence intervals, models are compared directly on identical bootstrap resamples ($B=1,000$):

| Model Comparison | Metric | Mean $\Delta$ | $95\%$ CI of $\Delta$ | Statistically Significant ($p < 0.05$)? |
| :--- | :--- | :---: | :---: | :---: |
| **Selected Candidate Focal g=1.5 (Isolated Subgraph) vs Random Forest Baseline** | Accuracy | +20.70% | [+10.65%, +31.33%] | **YES (p < 0.05)** |
| | Balanced Accuracy | -0.55% | [-12.87%, +11.87%] | **NO (p >= 0.05)** |
| | Macro-F1 (3c) | +0.0148 | [-0.0628, +0.1010] | **NO (p >= 0.05)** |
| **Selected Candidate Focal g=1.5 (Isolated Subgraph) vs GNN v2.1 Baseline (Isolated Subgraph)** | Accuracy | +18.04% | [+9.33%, +26.02%] | **YES (p < 0.05)** |
| | Balanced Accuracy | +0.82% | [-9.93%, +11.02%] | **NO (p >= 0.05)** |
| | Macro-F1 (3c) | +0.0071 | [-0.0547, +0.0762] | **NO (p >= 0.05)** |
| **GNN v2.1 Baseline (Isolated Subgraph) vs Random Forest Baseline** | Accuracy | +2.69% | [-9.33%, +14.67%] | **NO (p >= 0.05)** |
| | Balanced Accuracy | -0.89% | [-17.77%, +15.41%] | **NO (p >= 0.05)** |
| | Macro-F1 (3c) | +0.0102 | [-0.0713, +0.0948] | **NO (p >= 0.05)** |

> [!NOTE]
> **Empirical Conclusion on Statistical Significance:**  
> 1. The Selected Candidate achieves **statistically significant superior raw accuracy** over Random Forest ($+20.70\%$, $95\%$ CI $[+10.65\%, +31.33\%]$). This is driven by strong alignment with the majority Low-risk class ($111/121$).  
> 2. However, for **Balanced Accuracy** ($\Delta = -0.55\%$, $95\%$ CI $[-12.87\%, +11.87\%]$) and **Macro-F1** ($\Delta = +0.0148$, $95\%$ CI $[-0.0628, +0.1010]$), the $95\%$ confidence interval crosses zero.  
> 3. Therefore, **there is no evidence of statistically significant GNN superiority over Random Forest** on balanced classification. Random Forest demonstrated higher recall on the minority Medium-risk class ($44.8\%$ vs $10.3\%$).

---

## 5. Experiment Boundary & Integrity Confirmation

1. **Zero Test-Time Tuning:** The held-out test partition ($N=150$) was strictly sequestered until after model selection was finalized in Phase 3 based purely on validation metrics.
2. **Checkpoint Preservation:** The original production checkpoint `models/component4/gnn_risk_model_inductive_v2.1.pt` remains unmodified. All experimental models reside separately in `models/component4/experiments/`.
3. **Authoritative Code Pipeline:** All preprocessing, graph construction, and evaluation procedures are implemented in reproducible Python scripts without unversioned notebook dependencies.
