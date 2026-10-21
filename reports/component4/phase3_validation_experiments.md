# Component 4: Phase 3 Validation-Only Class-Imbalance Experiments Report

**Execution Date:** 2026-10-21  
**Git Branch:** `Component_4_Tharindu`  
**Reference Commit:** [`ee69f68`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System) (with documentation commit [`1c220be`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System))  
**Evaluation Scope:** Strictly Validation Partition ($N=150$). Held-out test set ($N=150$) was **completely untouched**.  
**Deliverable JSON:** [`reports/component4/phase3_validation_experiments.json`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/reports/component4/phase3_validation_experiments.json)  
**Experimental Checkpoints Directory:** [`models/component4/experiments/`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/models/component4/experiments/)

---

## 1. Experiment Boundary & Integrity Safeguards

1. **Partitioning Isolation:**
   - 700 Train / 150 Validation / 150 Held-Out Test businesses strictly partitioned by `Business_ID` with fixed `random_seed=42`.
   - Features strictly draw from preceding **Months 18 through 23**. Prediction target is strictly **Month 24**.
   - Preprocessor `StandardScaler` and `OneHotEncoder` were fitted **strictly on the 700 training businesses**.
2. **Loss Formulation Isolation:**
   - All class weights were calculated **strictly from training labels** ($N=700$: Low: 519, Medium: 180, High: 1).
   - Zero validation or test label information entered loss definitions or preprocessors.
3. **Held-Out Test Set Untouched:**
   - No forward passes, metric calculations, or hyperparameter decisions accessed the 150 test SMEs during Phase 3.
4. **Existing Checkpoints Preserved:**
   - Production checkpoints (`models/component4/gnn_risk_model_inductive_v2.1.pt`, `models/component4/gnn_risk_model.pt`) were left untouched.
   - All 7 experimental candidates were serialized separately into [`models/component4/experiments/`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/models/component4/experiments/).

---

## 2. Loss Formulations & Training Protocol

All models were trained under identical conditions:
- **Architecture:** `B2BRiskGNN(in_channels=41, hidden_channels=64, out_channels=3, dropout=0.2)`
- **Optimization:** Adam, learning rate $0.008$, weight decay $10^{-4}$, 60 epochs.
- **Graph Topology:** Forward passes during training strictly on $G_{\text{train}}$ (700 nodes, 1,721 intra-train edges + self-loops).
- **Validation Evaluation:** Evaluated at every epoch on $G_{\text{val}}$ (150 nodes, 80 intra-val edges + self-loops).

### Class Weight Formulations:
Given training counts $N_{\text{Low}} = 519$, $N_{\text{Med}} = 180$, $N_{\text{High}} = 1$ ($N = 700$):
1. **Standard Inverse-Frequency ($w_A$):**
   $$w_c = \frac{N}{3 \cdot \max(N_c, 1)} \implies [0.4496, 1.2963, 233.3333]$$
   *(Note: The weight for High Risk spikes to 233.33 because only 1 training example exists).*
2. **Square-Root Inverse-Frequency ($w_B$):**
   $$w_c^{\text{raw}} = \sqrt{\frac{N}{\max(N_c, 1)}}, \quad w_c = 3.0 \times \frac{w_c^{\text{raw}}}{\sum_k w_k^{\text{raw}}} \implies [0.1177, 0.1999, 2.6823]$$
   *(Substantially dampens gradient distortion from the single High-risk sample while still providing a 1.7x boost to Medium risk over Low risk).*

### Multi-Class Focal Loss Formulation:
$$\mathcal{L}_{\text{focal}}(p_t) = -\alpha_t (1 - p_t)^\gamma \log(p_t)$$
Where $p_t = \text{Softmax}(\mathbf{z})_y$ is the predicted probability for true label $y$, modulated by dynamic factor $(1 - p_t)^\gamma$. Tested with $\gamma \in \{1.0, 1.5, 2.0, 3.0\}$ with $\alpha = w_B$ (and an unweighted $\alpha=\mathbf{1}$ ablation).

---

## 3. Validation-Only Results Summary ($N=150$)

**Validation Ground-Truth Support:** Low: `118` ($78.67\%$), Medium: `31` ($20.67\%$), High: `1` ($0.67\%$).

| Rank | Configuration | Loss Family & Parameters | Best Epoch | Val Acc | Val Bal Acc (3-Class) | Val Macro-F1 (3-Class) | Val Macro-F1 (Binary) | Medium Recall (31 total) | High Recall (1 total) | Predicted Counts [Low, Med, High] |
|---|---|---|---|---|---|---|---|---|---|---|
| **1** | `config_C_focal_gamma_1_5` | Focal ($\gamma=1.5, \alpha=w_B$) | 3 | **74.00%** | **35.32%** | **0.3510** | **0.5244** | 16.13% (5) | 0.0% (0) | [133, 17, 0] |
| **2** | `config_C_focal_gamma_1_0` | Focal ($\gamma=1.0, \alpha=w_B$) | 24 | 64.67% | **35.33%** | 0.3507 | 0.5202 | **32.26%** (10) | 0.0% (0) | [109, 39, 2] |
| **3** | `config_C_focal_gamma_2_0` | Focal ($\gamma=2.0, \alpha=w_B$) | 4 | 70.00% | 35.21% | **0.3516** | **0.5253** | 22.58% (7) | 0.0% (0) | [123, 27, 0] |
| **4** | `config_C_focal_gamma_3_0` | Focal ($\gamma=3.0, \alpha=w_B$) | 32 | 64.67% | **35.33%** | 0.3481 | 0.5202 | **32.26%** (10) | 0.0% (0) | [109, 41, 0] |
| **5** | `config_B_sqrt_inv_freq_ce` | Cross-Entropy ($w_B$) | 21 | 67.33% | 34.87% | 0.3499 | 0.5188 | 25.81% (8) | 0.0% (0) | [117, 31, 2] |
| **6** | `config_C_focal_gamma_2_0_unw`| Focal ($\gamma=2.0, \alpha=\mathbf{1}$) | 21 | 73.33% | 34.24% | 0.3372 | 0.5040 | 12.90% (4) | 0.0% (0) | [134, 16, 0] |
| **7** | `config_A_inv_freq_ce` | Cross-Entropy ($w_A$) | 54 | 53.33% | 33.70% | 0.3151 | 0.4799 | **45.16%** (14) | 0.0% (0) | [83, 66, 1] |

---

## 4. Detailed Confusion Matrices (Validation Cohort)

### Config A: Standard Inverse-Frequency Cross-Entropy
$$\begin{bmatrix} 66 & 51 & 1 \\ 17 & 14 & 0 \\ 0 & 1 & 0 \end{bmatrix}$$
- Highest Medium recall ($45.16\%$), but severe false-positive inflation on Low risk ($51$ Low misclassified as Medium; accuracy collapses to $53.33\%$).

### Config B: Square-Root Inverse-Frequency Cross-Entropy
$$\begin{bmatrix} 93 & 23 & 2 \\ 23 & 8 & 0 \\ 1 & 0 & 0 \end{bmatrix}$$
- Well-balanced prediction volume (predicts 31 Medium, exactly matching true ground truth support of 31), achieving $67.33\%$ accuracy and $0.3499$ Macro-F1.

### Config C (Focal Loss $\gamma = 1.0$):
$$\begin{bmatrix} 87 & 29 & 2 \\ 21 & 10 & 0 \\ 1 & 0 & 0 \end{bmatrix}$$
- Captures 10 of 31 Medium-risk cases ($32.26\%$ recall) while preserving $73.73\%$ Low-risk precision.

### Config C (Focal Loss $\gamma = 1.5$ — Selected Candidate):
$$\begin{bmatrix} 106 & 12 & 0 \\ 26 & 5 & 0 \\ 1 & 0 & 0 \end{bmatrix}$$
- Cleanest false-positive profile: zero false-positive High-risk predictions, $74.00\%$ raw accuracy, and $0.5244$ Binary Macro-F1.

### Config C (Focal Loss $\gamma = 3.0$):
$$\begin{bmatrix} 87 & 31 & 0 \\ 21 & 10 & 0 \\ 1 & 0 & 0 \end{bmatrix}$$
- Captures 10 of 31 Medium-risk cases ($32.26\%$ recall) with **zero false-positive High-risk predictions**.

---

## 5. Candidate Selection Rationale

### Selection Criterion:
$$\text{Maximize } (\text{Validation Balanced Accuracy} + \text{Validation Macro-F1})$$
While enforcing:
1. Zero NaN / numerical instability during training.
2. Controlled false-positive rate on Low risk.
3. Zero spurious High-risk hallucinations.

### Selected Primary Configuration:
- **`config_C_focal_gamma_1_5`** (Multi-Class Focal Loss with $\gamma = 1.5$ and square-root inverse-frequency class weights $\alpha = w_B$).
  - **Validation Accuracy:** **74.00%**
  - **3-Class Balanced Accuracy:** **35.32%**
  - **Binary Macro-F1:** **0.5244**
  - **Best Checkpoint:** [`models/component4/experiments/gnn_experiment_config_C_focal_gamma_1_5.pt`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/models/component4/experiments/gnn_experiment_config_C_focal_gamma_1_5.pt)
- **Alternative High-Recall Candidate:**
  - For applications where identifying distressed SMEs is prioritized over overall accuracy, **`config_C_focal_gamma_3_0`** achieves the best Medium-risk sensitivity ($32.26\%$ recall, 10/31 detected) without generating false-positive High-risk predictions.

---

## 6. Scientific Limitations & Disclosures

1. **Extreme High-Risk Uncertainty:**
   - In the validation partition, only **one business** is labeled High Risk.
   - All 7 configurations failed to identify this single outlier (High recall $= 0.0\%$), capping 3-class balanced accuracy at $\approx 35\%$.
   - Any claim that the model reliably identifies High-risk loan defaults is scientifically invalid.
2. **Synthetic Label Determinism:**
   - The target labels in `Risk_Assessment.csv` are derived from synthetic rule thresholds rather than actual default events.
3. **Simulated Graph Edges:**
   - All relationship edges are synthetic (`Verified_Flag = 0`). Message passing over these edges does not reflect verified banking or transaction ledger counterparty contagion.
