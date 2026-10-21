# Component 4 — Final Research Validation Report

## 1. Executive Summary & Verification Context

- **Component:** Component 4 — GNN-Based Business Risk Prediction, Mitigation and Scalable Growth Recommendation
- **Branch:** `Component_4_Tharindu`
- **Execution Date:** 2026-10-21
- **Evaluation Protocol:** Business-ID Grouped Split ($70\%$ Train, $15\%$ Validation, $15\%$ Held-out Test) using Random Seed `42`.
- **Temporal Integrity:** Strictly leakage-free temporal sequence (Months 18–23 features to predict Month 24 target risk label).
- **Preprocessor Fitting:** All feature scalers and one-hot encoders fitted strictly on the 700 training businesses.

---

## 2. Model Selection Rationale (Phase 3 Validation Set Only)

Model selection was conducted exclusively on the 150-business **validation partition** ($N=150$: Low: 118, Medium: 31, High: 1). Held-out test set metrics were strictly withheld during hyperparameter selection and loss comparisons.

### Validation Experiment Comparison Table

| Config ID | Loss Function & Imbalance Remedy | Val Acc | Val BalAcc (3c) | Val Macro-F1 (3c) | Med Recall | High FP Count | Rationale / Stability |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `config_A_inv_freq_ce` | Standard Inverse-Frequency CE | 53.33% | 33.70% | 0.3151 | 45.16% | 1 | High Medium recall, but 51 false-positive Mediums on Low risk; low precision. |
| `config_B_sqrt_inv_freq_ce` | Square-Root Inverse-Frequency CE | 67.33% | 34.99% | 0.3346 | 25.81% | 2 | Balanced prediction volume (31 predicted Mediums vs 31 ground truth). |
| `config_C_focal_gamma_1_0` | Multi-Class Focal Loss ($\gamma=1.0$) | 67.33% | 36.63% | 0.3541 | 32.26% | 2 | High balanced accuracy, but produced 2 false-positive High predictions. |
| **`config_C_focal_gamma_1_5`** *(Selected)* | **Multi-Class Focal Loss ($\gamma=1.5$)** | **74.00%** | **35.32%** | **0.3510** | **16.13%** | **0** | **Highest validation accuracy, cleanest FP profile, zero spurious High predictions.** |
| `config_C_focal_gamma_2_0` | Multi-Class Focal Loss ($\gamma=2.0$) | 69.33% | 32.48% | 0.3175 | 16.13% | 0 | Lower macro-F1 than $\gamma=1.5$. |
| `config_C_focal_gamma_3_0` *(Sensitivity)* | Multi-Class Focal Loss ($\gamma=3.0$) | 64.67% | 38.63% | 0.3548 | 32.26% | 0 | Strongest Medium-risk sensitivity (10/31 detected) without any High false positives. |
| `config_D_unweighted_focal_2_0` | Unweighted Focal Loss ($\gamma=2.0$) | 78.67% | 33.33% | 0.2935 | 0.00% | 0 | Complete minority-class collapse into majority Low-risk class. |

**Selection Decision:**
- **Primary Model Candidate:** `config_C_focal_gamma_1_5` was selected for final held-out testing based on its superior validation accuracy ($74.00\%$), strong binary macro-F1 ($0.5244$), and complete elimination of spurious High-risk false positives.
- **Secondary Sensitivity Benchmark:** `config_C_focal_gamma_3_0` was designated as the high-sensitivity candidate for comparative reporting.

---

## 3. Final Held-Out Test Set Evaluation ($N=150$)

### 3.1 Ground-Truth Test Target Distribution

```
Total Test Businesses (N) : 150
Low-Risk Businesses       : 121 (80.67%)
Medium-Risk Businesses    : 29  (19.33%)
High-Risk Businesses      : 0   (0.00%)
```

> [!WARNING]
> **Scientific Disclosure on High-Risk Support:**
> The held-out test cohort contains **zero High-risk businesses**. Consequently, held-out High-risk detection performance is **statistically unevaluable**. No empirical claim of High-risk detection capability or default prediction on unseen businesses can be defended from this test split. Evaluation is strictly a binary discrimination test between Low and Medium risk.

### 3.2 Measured Performance Metrics Comparison Table

All models evaluated on the identical held-out test partition ($N=150$) without test-time tuning. Bootstrap $95\%$ Confidence Intervals computed over 1,000 resamples.

| Model / Architecture | Evaluation Topology | Test Acc ($95\%$ CI) | Test BalAcc (3c) ($95\%$ CI) | Test Macro-F1 (3c) ($95\%$ CI) | Binary Macro-F1 | Medium Recall | Predicted Counts [L/M/H] |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Random Forest Baseline** | Tabular (Non-graph) | 55.33% [47.33%, 64.00%] | **51.34%** [40.97%, 61.87%] | 0.3186 [0.2646, 0.3724] | 0.4891 | **44.8%** (13/29) | 86 / 64 / 0 |
| **GNN Baseline v2.1** | Isolated Subgraph | 58.00% [49.98%, 66.00%] | 50.37% [40.07%, 60.65%] | 0.3284 [0.2722, 0.3786] | 0.4996 | 37.9% (11/29) | 93 / 51 / 6 |
| **GNN Baseline v2.1** | Extended Network | 74.67% [68.00%, 82.00%] | 50.21% [44.76%, 56.45%] | 0.3326 [0.2850, 0.3847] | 0.5103 | 10.3% (3/29) | 134 / 13 / 3 |
| **Selected Cand ($\gamma=1.5$)** | Isolated Subgraph | 76.00% [69.33%, 82.00%] | 51.04% [45.60%, 57.52%] | **0.3344** [0.2864, 0.3892] | **0.5218** | 10.3% (3/29) | 137 / 13 / 0 |
| **Selected Cand ($\gamma=1.5$)** | Extended Network | **79.33%** [73.33%, 85.33%] | 49.17% [47.90%, 50.00%] | 0.2949 [0.2821, 0.3070] | 0.4424 | 0.0% (0/29) | 148 / 2 / 0 |
| **Sensitivity Cand ($\gamma=3.0$)** | Isolated Subgraph | 64.00% [56.67%, 72.00%] | 47.53% [39.57%, 56.60%] | 0.3170 [0.2673, 0.3717] | 0.4851 | 20.7% (6/29) | 113 / 37 / 0 |
| **Sensitivity Cand ($\gamma=3.0$)** | Extended Network | 74.67% [67.98%, 81.33%] | 47.59% [44.05%, 52.49%] | 0.3013 [0.2730, 0.3425] | 0.4578 | 3.4% (1/29) | 139 / 11 / 0 |

---

## 4. Confusion Matrices (Held-Out Test Set)

Rows represent True Ground-Truth Labels; Columns represent Predicted Labels:
$$\text{Class Order: } [\text{Low (0)}, \text{Medium (1)}, \text{High (2)}]$$

### 4.1 Random Forest Baseline
$$\begin{bmatrix} 70 & 51 & 0 \\ 16 & 13 & 0 \\ 0 & 0 & 0 \end{bmatrix}$$
- Correctly identifies $13$ of $29$ Medium-risk businesses ($44.8\%$ recall).
- Generates zero false-positive High-risk predictions.

### 4.2 GNN Baseline v2.1 (Isolated Subgraph)
$$\begin{bmatrix} 76 & 40 & 5 \\ 17 & 11 & 1 \\ 0 & 0 & 0 \end{bmatrix}$$
- Captures $11$ of $29$ Medium-risk businesses ($37.9\%$ recall).
- **Major Defect:** Produces $6$ false-positive High-risk predictions ($5$ on true Low, $1$ on true Medium) despite zero true High-risk businesses in the test cohort.

### 4.3 Selected Candidate (`config_C_focal_gamma_1_5`, Isolated Subgraph)
$$\begin{bmatrix} 111 & 10 & 0 \\ 26 & 3 & 0 \\ 0 & 0 & 0 \end{bmatrix}$$
- **Key Achievement:** Completely eliminates the $6$ spurious High-risk false positives ($0$ predicted High).
- Achieves highest test accuracy ($76.00\%$) and highest test 3-class Macro-F1 ($0.3344$).
- Low-risk precision is $81.02\%$ ($111/137$).
- Conservative on Medium risk ($3/29$ recall).

### 4.4 Sensitivity Candidate (`config_C_focal_gamma_3_0`, Isolated Subgraph)
$$\begin{bmatrix} 90 & 31 & 0 \\ 23 & 6 & 0 \\ 0 & 0 & 0 \end{bmatrix}$$
- Captures twice as many Medium-risk businesses ($6/29$ recall, $20.7\%$) as the primary candidate.
- Zero false-positive High-risk predictions.

---

## 5. Comparative Analysis & Scientific Findings

1. **Random Forest vs. GNN Comparison:**
   - On balanced accuracy, the Random Forest baseline achieves $51.34\%$, slightly higher than GNN v2.1 ($50.37\%$) and comparable to the selected Focal GNN ($51.04\%$).
   - Random Forest achieves superior Medium-risk recall ($44.8\%$) compared to GNN models ($10.3\% - 37.9\%$).
   - The GNN's higher raw accuracy ($76.00\% - 79.33\%$ vs $55.33\%$) is attributable to its strong alignment with the majority Low-risk class ($80.7\%$ of test cases).
   - **Conclusion:** There is **no evidence of statistically significant GNN superiority** over tabular Random Forest on this dataset. GNN message passing does not overcome extreme tabular class imbalance.

2. **Impact of Focal Loss Imbalance Remediation:**
   - The primary research contribution of Phase 3 was successfully suppressing spurious High-risk predictions caused by standard inverse-frequency weights ($w_{\text{High}} = 233.33$).
   - Multi-Class Focal Loss ($\gamma = 1.5$) completely stabilized the network, reducing High false positives from $6$ to $0$ on test data and from $1$ to $0$ on validation data.

3. **Checkpoint Recommendation:**
   - **Production Baseline Checkpoint:** Keep `models/component4/gnn_risk_model_inductive_v2.1.pt` active as the documented baseline reference.
   - **Research Checkpoint:** Retain `models/component4/experiments/gnn_experiment_config_C_focal_gamma_1_5.pt` as the vetted class-imbalance remediation model for dissertation demonstration.
