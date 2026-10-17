# Component 4: Stage 2 — Feasibility Baseline Model Evaluation Report

**Project:** AI-Driven Business Lifecycle Decision Support System  
**Component:** Component 4 — GNN-Based Business Risk Prediction, Mitigation and Scalable Growth Recommendation  
**Stage:** Stage 2 — Feasibility Baseline ML Pipeline  
**Date:** October 17, 2026  
**Status:** Completed & Validated  

---

## 1. Executive Summary

This report documents the implementation, validation, and held-out test evaluation of the **Feasibility Baseline Machine Learning Pipeline** for Component 4.

### Key Outcomes:
1. **Reproducible Pipeline:** Preprocessing and training pipelines were implemented in [`src/component4/preprocessing.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/src/component4/preprocessing.py) and [`src/component4/feasibility_baseline.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/src/component4/feasibility_baseline.py).
2. **Leakage-Free Protocol:** 
   - Strict 70/15/15 stratified train/val/test split using fixed random seed `42`.
   - Feature scalers and encoders fit **exclusively** on training data (840 samples).
   - Invariant columns (`district`, `province`) and identifiers (`case_id`) excluded.
3. **Validation-Driven Selection:** Among 6 model configurations across 3 model families (`DummyClassifier`, `LogisticRegression`, and `RandomForestClassifier`), **Random Forest (balanced)** achieved the highest validation Macro F1 score (**0.8505**), significantly outperforming unweighted models on minority-class detection.
4. **Held-Out Test Results:** Evaluated once on the 180 unseen test records, the selected model attained **88.33% Accuracy**, **87.70% Macro F1**, and balanced recall across all classes (**86.41%** for Conditionally Feasible, **89.36%** for Feasible, and **93.33%** for Infeasible).

> [!IMPORTANT]
> **Task Definition Disclaimer:**  
> This baseline predicts **pre-launch economic feasibility** (`feasibility_label`), derived from initial capital, budgeted expenses, and survey demand scores. It is **NOT** a predictor of verified real-world business failure, bankruptcy, loan default, or operational distress.

---

## 2. Experimental Setup and Split Configuration

- **Dataset:** [`data/raw/Component_One_Core_Feasibility.csv`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/data/raw/Component_One_Core_Feasibility.csv) (1,200 records)
- **Random Seed:** `42` (Fixed for reproducibility)
- **Split Ratio:** 70% Train (840), 15% Validation (180), 15% Held-Out Test (180)
- **Stratification:** Stratified on `feasibility_label` to preserve class proportions across all partitions.

### 2.1 Split Class Proportions

| Target Class | Full Dataset (N=1,200) | Train Set (N=840, 70%) | Validation Set (N=180, 15%) | Test Set (N=180, 15%) | Proportion |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Conditionally Feasible** | 682 | 477 | 102 | 103 | 56.83% |
| **Feasible** | 314 | 220 | 47 | 47 | 26.17% |
| **Infeasible** | 204 | 143 | 31 | 30 | 17.00% |
| **Total** | **1,200** | **840** | **180** | **180** | **100.0%** |

### 2.2 Feature Preprocessing Architecture
- **Excluded Features (5 columns):**
  - `case_id`: Primary record identifier (`C00001`–`C01200`) — not predictive.
  - `district`: 100% `"Colombo"` across all records — zero variance removed.
  - `province`: 100% `"Western"` across all records — zero variance removed.
  - `business_description`: Unstructured textual notes — redundant with `business_category`.
  - `feasibility_label`: Target variable.
- **Numerical Pipeline (15 features):** `SimpleImputer(strategy='median')` followed by `StandardScaler()`. Fit exclusively on `X_train`.
- **Categorical Pipeline (5 features):** `SimpleImputer(strategy='most_frequent')` followed by `OneHotEncoder(handle_unknown='ignore', sparse_output=False)`.
  - Encodes `business_stage`, `business_category`, `location_type`, `proposed_action`, and `competition_level`.
- **Engineered Dimensions:** Transforms 20 input features into **74 dense numerical features**.

---

## 3. Validation Model Comparison & Selection

All candidate models were fit on `X_train` and evaluated on `X_val` (180 samples). Model selection was conducted **strictly using validation Macro F1** to prevent any data leakage from the held-out test partition.

| Model Candidate | Validation Accuracy | Validation Macro Precision | Validation Macro Recall | Validation Macro F1 | Validation Weighted F1 | Selection Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Dummy (most_frequent)** | 0.5667 | 0.1889 | 0.3333 | 0.2411 | 0.4099 | Reference Baseline |
| **Dummy (stratified)** | 0.4167 | 0.3129 | 0.3133 | 0.3130 | 0.4149 | Random Baseline |
| **Logistic Regression (unweighted)** | 0.7444 | 0.7248 | 0.6691 | 0.6856 | 0.7353 | Linear Baseline |
| **Logistic Regression (balanced)** | 0.6944 | 0.6636 | 0.7148 | 0.6771 | 0.6977 | Linear Baseline |
| **Random Forest (unweighted)** | 0.8389 | 0.8351 | 0.7925 | 0.8082 | 0.8353 | Non-linear Baseline |
| **Random Forest (balanced)** | **0.8611** | **0.8446** | **0.8619** | **0.8505** | **0.8615** | **SELECTED BEST** |

### 3.1 Impact of Class Imbalance & Class Weighting
- In the unweighted Random Forest, the minority class (`Infeasible`, 31 validation records) achieved a recall of only **61.29%**, with 12 out of 31 infeasible cases misclassified into viable classes.
- Applying `class_weight='balanced'` inversely weights sample frequencies, boosting `Infeasible` validation recall to **80.65%** (25 / 31 detected) and elevating validation Macro F1 from **0.8082** to **0.8505**.
- Consequently, **Random Forest (balanced)** was selected as the champion model.

---

## 4. Held-Out Test Evaluation

The champion model (`RandomForestClassifier(n_estimators=200, class_weight='balanced', random_state=42)`) was evaluated **once** on the held-out test partition ($N = 180$).

### 4.1 Overall Performance Metrics
- **Test Accuracy:** **0.8833 (88.33%)**
- **Macro-Averaged Precision:** **0.8614 (86.14%)**
- **Macro-Averaged Recall:** **0.8970 (89.70%)**
- **Macro-Averaged F1-Score:** **0.8770 (87.70%)**
- **Weighted F1-Score:** **0.8839 (88.39%)**

### 4.2 Per-Class Classification Report (Test Set)

| Class | Precision | Recall | F1-Score | Support (N) |
| :--- | :---: | :---: | :---: | :---: |
| **Conditionally Feasible** | 0.9271 | 0.8641 | 0.8945 | 103 |
| **Feasible** | 0.8571 | 0.8936 | 0.8750 | 47 |
| **Infeasible** | 0.8000 | **0.9333** | 0.8615 | 30 |
| **Macro Average** | **0.8614** | **0.8970** | **0.8770** | **180** |
| **Weighted Average** | **0.8876** | **0.8833** | **0.8839** | **180** |

### 4.3 Confusion Matrix (Held-Out Test Set)

```
                       Predicted Class
                  Cond. Feas.   Feasible   Infeasible
Actual Class
Cond. Feasible        89           7           7       (Total: 103)
Feasible               5          42           0       (Total:  47)
Infeasible             2           0          28       (Total:  30)
```

- **Infeasible Detection:** 28 out of 30 infeasible businesses in the test set were correctly flagged (**93.33% recall**), with only 2 cases misclassified.
- **Feasible Detection:** 42 out of 47 feasible businesses were correctly identified (**89.36% recall**), with 0 cases misclassified as infeasible.

---

## 5. Artifact Verification and Storage

The following model artifacts and documentation were generated and verified:

| Artifact Path | Format | Description |
| :--- | :--- | :--- |
| [`models/component4/feasibility_model.joblib`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/models/component4/feasibility_model.joblib) | Joblib | Serialized Random Forest classifier |
| [`models/component4/feasibility_preprocessor.joblib`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/models/component4/feasibility_preprocessor.joblib) | Joblib | Serialized Scikit-learn preprocessing pipeline |
| [`models/component4/feasibility_model_metadata.json`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/models/component4/feasibility_model_metadata.json) | JSON | Complete training metadata, package versions, and feature list |
| [`reports/component4/stage2_feasibility_metrics.json`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/reports/component4/stage2_feasibility_metrics.json) | JSON | Machine-readable validation comparison and test metrics |

---

## 6. Dataset Limitations and Boundary Discussion

1. **Geographic Invariance:**
   - 100% of records in the dataset are situated in the **Colombo District (Western Province)** across 46 sub-localities. The model cannot generalize to other Sri Lankan districts (e.g., Kandy, Galle, Jaffna) without out-of-distribution regional data.
2. **Subsector Coverage:**
   - The dataset encompasses only 4 micro-enterprise categories: `Clothing/Garment`, `Grocery/Mini-Mart`, `Bakery/Food/Grocery`, and `Beauty Saloon`. High-tech startups, heavy manufacturing, or agricultural exports are not represented.
3. **Pre-Launch vs. Post-Launch Failure:**
   - Feasibility labels measure whether the planned business model balances capital with initial expenses. They do not track operational defaults, supply-chain interruptions, customer churn, or credit repayment over time.

---

## 7. Conclusion and Readiness for Next Stage

Stage 2 is complete. The feasibility baseline establishes a solid, reproducible, and leakage-free benchmark (**Macro F1: 0.8770**). All Component 1 files remain preserved, and the test suite has been updated to cover all Stage 2 functionality.
