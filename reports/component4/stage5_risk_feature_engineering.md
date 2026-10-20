# Component 4: Stage 5 — Risk Feature Engineering Report

**Project:** AI-Driven Business Lifecycle Decision Support System  
**Component:** Component 4 — GNN-Based Business Risk Prediction, Mitigation and Scalable Growth Recommendation  
**Stage:** Stage 5 — Risk Feature Engineering, Relational Concentration & Leak-Free Action Stress Modeling  
**Date:** October 17, 2026  
**Status:** Completed & Validated  

---

## 1. Executive Summary

This report establishes the feature engineering methodology and validation for **Stage 5: Risk Feature Engineering** of Component 4. The objective of Stage 5 is to derive mathematically sound, reproducible, and leakage-free features that capture the multidimensional operational, financial, relational, and growth-action risks facing Small and Medium Enterprises (SMEs) in Sri Lanka's **Western Province** (Colombo, Gampaha, Kalutara).

### Key Accomplishments:
1. **Engineered Feature Dataset:** Built [`data/processed/component4/engineered_risk_features.csv`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/data/processed/component4/engineered_risk_features.csv), containing **2,000 action-scenario rows × 57 columns** (41 predictive features, 12 contextual/identifier metadata fields, and 4 segregated ground-truth target columns).
2. **Feature Metadata Dictionary:** Serialized [`data/processed/component4/engineered_features_dictionary.json`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/data/processed/component4/engineered_features_dictionary.json) providing data types, physical units, descriptions, and value samples for every column.
3. **Reproducible Pipeline:** Implemented [`src/component4/risk_features.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/src/component4/risk_features.py) with standalone mathematical functions and vectorized pandas/numpy pipeline aggregations.
4. **Zero-Division & Value Protection:** Enforced positive denominator epsilons across all ratios, guaranteeing **0 missing values** and **0 infinite values** across all 2,000 records.
5. **Strict Leakage Prevention:** Ground-truth targets (`target_overall_risk`, `target_growth_readiness`, etc.) are explicitly prefixed with `target_` and segregated from predictive features. Simulator rule codes (`risk_factor_codes`, `mitigation_codes`) are completely excluded from predictive features.
6. **Automated Unit Tests:** Expanded [`tests/test_component4.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/tests/test_component4.py) with `TestComponent4Stage5` (8 tests). All **31 unit tests** in the test suite pass with zero errors in 8.09s.

---

## 2. Dataset & Column Provenance

Feature engineering integrates four distinct scenario tables from the Western Province SME risk package, maintaining strict provenance tracking:

```
┌─────────────────────────────────┐       ┌──────────────────────────────────┐
│     business_profiles.csv       │       │    financial_snapshots.csv       │
│  (500 base Western SMEs)        │       │  (6,000 monthly snapshots)       │
│  - district, business_category  │       │  - 12-month revenue, expenses    │
│  - business_stage, employees    │       │  - cash reserves, debt balances  │
└────────────────┬────────────────┘       └─────────────────┬────────────────┘
                 │                                          │
                 └──────────────────┬───────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                    RiskFeatureEngineer Pipeline                            │
│  - extract_financial_snapshot_features (500 aggregated SME baselines)      │
│  - extract_relationship_features (500 HHI & counterparty profiles)         │
│  - merge with growth_actions.csv (2,000 proposed growth actions)           │
│  - compute growth action stress interaction features                       │
│  - merge segregated targets from risk_outcomes.csv                         │
└───────────────────────────────────┬────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│            engineered_risk_features.csv (2,000 rows × 57 cols)             │
│  - 0 nulls, 0 infs, Western Province only, leak-free grouped split         │
└────────────────────────────────────────────────────────────────────────────┘
```

- **Data Origin Disclosure:** All rows are explicitly labeled `data_origin = "SIMULATED_SCENARIO"`.
- **Decoupling Guarantee:** No features are joined, inferred, or merged from the feasibility survey dataset (`C0...`) or corporate invoice datasets (`Typefi`, `Star Flora`).

---

## 3. Mathematical Formulas and Feature Taxonomy

### 3.1 Liquidity Stress & Runway Indicators
Measures the SME's ability to cover ongoing operational obligations without external intervention.

| Feature Name | Column Type | Physical Units | Mathematical Formula | Domain Interpretation |
| :--- | :--- | :--- | :--- | :--- |
| `monthly_revenue_mean_lkr` | Numerical | LKR/month | $\bar{R} = \frac{1}{12}\sum_{m=1}^{12} R_m$ | Average baseline monthly revenue |
| `revenue_volatility_cv` | Numerical | Ratio | $\frac{\sigma_R}{\max(\bar{R}, \epsilon)}$ | Revenue unpredictability coefficient |
| `operating_margin_ratio` | Numerical | Ratio | $\frac{\bar{R} - \bar{E}}{\max(\bar{R}, \epsilon)}$ | Operating profit margin before financing |
| `baseline_cash_runway_months` | Numerical | Months | $\frac{\max(0, \text{Cash}_{\text{latest}})}{\max(\bar{E}, \epsilon)}$ | Months of operations funded by current cash |
| `min_cash_runway_months` | Numerical | Months | $\frac{\max(0, \text{Cash}_{\min})}{\max(\bar{E}, \epsilon)}$ | Worst-case historical cash buffer |
| `working_capital_to_revenue_ratio`| Numerical | Ratio | $\frac{\text{Cash} + \text{AR} - \text{AP}}{\max(\bar{R}, \epsilon)}$ | Short-term liquidity adequacy |
| `net_cash_flow_monthly_lkr` | Numerical | LKR/month | $(\bar{R} - \bar{E}) - \text{Repayment}$ | Monthly net cash surplus / deficit |

### 3.2 Debt Service & Financial Burden Indicators
Quantifies the rigidity of contractual loan service requirements relative to income generation.

| Feature Name | Column Type | Physical Units | Mathematical Formula | Domain Interpretation |
| :--- | :--- | :--- | :--- | :--- |
| `outstanding_debt_latest_lkr` | Numerical | LKR | Direct observed liability | Total outstanding formal borrowing |
| `monthly_debt_repayment_lkr` | Numerical | LKR/month | Direct contractual payment | Monthly debt installment |
| `debt_service_burden_ratio` | Numerical | Ratio | $\frac{\text{Repayment}}{\max(\bar{R}, \epsilon)}$ | Proportion of gross revenue consumed by debt service |
| `debt_service_coverage_ratio` | Numerical | Ratio | $\frac{\bar{R} - \bar{E}}{\max(\text{Repayment}, \epsilon)}$ | Debt Service Coverage Ratio (DSCR); values $< 1.0$ indicate operational deficit |

### 3.3 Relational Concentration & Counterparty Exposure (HHI)
Evaluates dependency risks across supply chain, customer base, and lenders.

| Feature Name | Column Type | Physical Units | Mathematical Formula | Domain Interpretation |
| :--- | :--- | :--- | :--- | :--- |
| `supplier_count` | Numerical | Count | $N_{\text{sup}} = \sum \mathbf{1}_{\{\text{SUPPLIES}\}}$ | Number of distinct active suppliers |
| `supplier_hhi` | Numerical | Index $[0.0, 1.0]$ | $\sum_{i=1}^{N_{\text{sup}}} \left(\frac{s_i}{100}\right)^2$ | Herfindahl–Hirschman Index of supplier purchase concentration |
| `supplier_cr1_share` | Numerical | Ratio $[0.0, 1.0]$ | $\max_i \left(\frac{s_i}{100}\right)$ | Share of purchases from largest single supplier |
| `customer_count` | Numerical | Count | $N_{\text{cus}} = \sum \mathbf{1}_{\{\text{SELLS\_TO}\}}$ | Number of distinct active commercial customers |
| `customer_hhi` | Numerical | Index $[0.0, 1.0]$ | $\sum_{j=1}^{N_{\text{cus}}} \left(\frac{c_j}{100}\right)^2$ | Herfindahl–Hirschman Index of customer sales concentration |
| `customer_cr1_share` | Numerical | Ratio $[0.0, 1.0]$ | $\max_j \left(\frac{c_j}{100}\right)$ | Share of revenue from largest single customer |
| `lender_count` | Numerical | Count | $N_{\text{bnk}} = \sum \mathbf{1}_{\{\text{BORROWS\_FROM}\}}$ | Number of active lending institutions |
| `counterparty_payment_delay_mean_days` | Numerical | Days | $\frac{1}{K}\sum_{k=1}^K \text{delay}_k$ | Average invoice settlement delay across trade partners |
| `counterparty_payment_delay_max_days` | Numerical | Days | $\max_k (\text{delay}_k)$ | Maximum invoice settlement delay observed |
| `supplier_disruption_active` | Binary | Flag $\{0, 1\}$ | $\mathbf{1}_{\{\exists \text{supplier: status} \ne \text{BASELINE}\}}$ | Active supply disruption shock indicator |

### 3.4 Growth Action Stress & Resilience Interactions
Evaluates the marginal strain imposed on the business when executing a specific growth initiative.

| Feature Name | Column Type | Physical Units | Mathematical Formula | Domain Interpretation |
| :--- | :--- | :--- | :--- | :--- |
| `investment_to_cash_ratio` | Numerical | Ratio | $\frac{\text{Investment}}{\max(\text{Cash}_{\text{latest}}, \epsilon)}$ | Upfront capital requirement relative to cash reserves |
| `additional_cost_to_revenue_ratio` | Numerical | Ratio | $\frac{\Delta \text{Cost}}{\max(\bar{R}, \epsilon)}$ | Expansion overhead expansion relative to revenue |
| `post_action_cash_runway_months` | Numerical | Months | $\frac{\max(0, \text{Cash} - \text{Investment})}{\max(\bar{E} + \Delta \text{Cost}, \epsilon)}$ | Remaining cash runway immediately post-investment |
| `post_action_net_cash_flow_lkr` | Numerical | LKR/month | $(\bar{R} + \Delta R) - (\bar{E} + \Delta \text{Cost}) - \text{Repayment}$ | Simulated monthly cash flow post-action |
| `capacity_gap_score` | Numerical | Score $[0.0, 1.0]$ | $\max(0, \min(1, 1 - \text{CapacityScore}))$ | Operational bottleneck / capacity deficit |
| `staffing_growth_ratio` | Numerical | Ratio | $\frac{\text{RequiredStaff}}{\max(\text{CurrentStaff}, 1)}$ | Workforce expansion rate relative to current size |

---

## 4. Zero-Division & Edge-Case Protection

In real-world SME financial modeling, zero revenues, zero cash reserves, zero debt, and single-supplier situations are frequent. To ensure computational stability:

1. **Denominator Epsilon:** All financial divisions enforce $\max(\text{denominator}, \epsilon)$ where $\epsilon = 1.0$ LKR.
2. **Negative Balance Clamping:** Cash reserves and runways cannot be negative in physical runway calculations; post-investment balances are clamped at $0.0$ ($\max(0.0, \text{Cash} - \text{Investment})$).
3. **Empty Counterparty Handling:** When an SME has 0 suppliers or 0 customers, HHI evaluates cleanly to $0.0$, CR1 evaluates to $0.0$, and counterparty counts evaluate to $0$.
4. **Capacity Boundary Clamping:** Capacity score deficit is bounded strictly to $[0.0, 1.0]$.
5. **Empirical Verification:** The final dataset of 2,000 rows exhibits **0 NaN values** and **0 infinite values** across all numerical fields.

---

## 5. Target Leakage Prevention & Segregation

To uphold scientific validity and prevent circular model training:

1. **Target Prefixing:** Ground-truth targets from `risk_outcomes.csv` are explicitly prefixed with `target_`:
   - `target_overall_risk` (*Low*, *Medium*, *High*)
   - `target_growth_readiness` (*Proceed*, *Modify*, *Delay*)
   - `target_liquidity_stress` (*Low*, *Medium*, *High*)
   - `target_relationship_risk` (*Low*, *Medium*, *High*)
2. **Exclusion of Simulator Rule Triggers:** Simulator output codes that explicitly name the rule reasons (e.g. `LOW_CASH_RUNWAY;EXPANSION_COST_PRESSURE` and `mitigation_codes`) are completely excluded from predictive features.
3. **Separation of Pre-Action and Post-Action States:** Pre-action financial metrics (mean revenue, baseline runway) reflect historical baseline status; post-action features reflect objective financial arithmetic of the proposed investment, not the rule's final decision label.

---

## 6. Geographic Scope & Distribution

The engineered feature dataset preserves the strict geographic restriction to Sri Lanka's **Western Province**:

```
                  DISTRICT DISTRIBUTION (N = 2,000 Actions)
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         ▼                            ▼                            ▼
      Colombo                      Gampaha                      Kalutara
    668 Actions                  668 Actions                  664 Actions
      (33.4%)                      (33.4%)                      (33.2%)
```

- **Province:** `Western` (100% of rows).
- **Split Distribution:**
  - `train`: 1,400 actions (70.0%, 350 business families).
  - `validation`: 300 actions (15.0%, 75 business families).
  - `test`: 300 actions (15.0%, 75 business families).
- **Variant Distribution:** 1,000 `BASELINE` actions, 1,000 `MITIGATED` actions.

---

## 7. Verification Test Suite Execution

Automated test class `TestComponent4Stage5` was added to [`tests/test_component4.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/tests/test_component4.py):

| Test Method | Focus Area | Result | Notes |
| :--- | :--- | :---: | :--- |
| `test_hhi_calculation_and_edge_cases` | HHI formula, monopoly, fractional, empty lists | **PASSED** | Correct mathematical output; zero division safe |
| `test_cr1_top_concentration_share` | Top-1 concentration share | **PASSED** | Bounds strictly in $[0.0, 1.0]$ |
| `test_financial_ratio_calculators_and_zero_division` | Runway, DSCR, margin, burden | **PASSED** | Negative and zero denominator edge cases safe |
| `test_growth_action_stress_calculators` | Post-action runway, net cash, capacity gap | **PASSED** | Correctly clamps when investment exceeds cash |
| `test_stage5_feature_pipeline_execution_and_schema` | Full dataset build & dimensions | **PASSED** | Exactly 2,000 rows × 57 cols; 0 nulls; 0 infs |
| `test_stage5_geographic_scope_western_province` | Geographic boundary assertions | **PASSED** | 100% Western Province (Colombo, Gampaha, Kalutara) |
| `test_stage5_zero_target_leakage` | Column inspection for target leakage | **PASSED** | Predictive feature columns contain zero rule targets |
| `test_stage5_relationship_aggregation_integrity` | Per-business aggregation | **PASSED** | Exactly 500 base SME rows; bounded indices |

**Execution Result:**
```
Ran 31 tests in 8.091s
OK
```

---

## 8. Known Limitations & Research Boundaries

1. **Simulated Ground Truth:** The underlying business, snapshot, and growth action rows are simulated scenarios. Strong correlation between engineered features and `target_overall_risk` reflects learning the underlying rule logic of `SIMULATOR_RULES_V1`, not empirical bankruptcy prediction of real Sri Lankan businesses.
2. **Static Network Structure:** The relationship graph models 5,053 simulated supplier/customer/lender edges within scenario families. While topologically rich, it is not an observed national inter-firm payment network.
3. **Enterprise Survey Context:** As established in Stage 3, the World Bank Enterprise Survey 2025 microdata remains a potential future benchmark once Western Province-only records are properly isolated via official region codes.

---

## 9. Readiness for Stage 6

With Stage 5 complete, validated, and documented:
- Engineered dataset: [`data/processed/component4/engineered_risk_features.csv`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/data/processed/component4/engineered_risk_features.csv)
- Feature dictionary: [`data/processed/component4/engineered_features_dictionary.json`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/data/processed/component4/engineered_features_dictionary.json)
- Feature code: [`src/component4/risk_features.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/src/component4/risk_features.py)
- Next Step: **Stage 6 — Risk Assessment and Mitigation Engine** ([`src/component4/risk_assessment.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/src/component4/risk_assessment.py)), implementing multi-factor explainable scoring, growth readiness categorization, primary risk factor attribution, and mitigation recommendation logic.
