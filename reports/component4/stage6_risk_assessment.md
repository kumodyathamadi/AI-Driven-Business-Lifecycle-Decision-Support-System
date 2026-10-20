# Component 4: Stage 6 — Explainable Risk Assessment and Mitigation Engine Report

**Project:** AI-Driven Business Lifecycle Decision Support System  
**Component:** Component 4 — GNN-Based Business Risk Prediction, Mitigation and Scalable Growth Recommendation  
**Stage:** Stage 6 — Multi-Factor Risk Assessment, Explainable Scoring, and Mitigation Action Recommendation  
**Date:** October 17, 2026  
**Status:** Completed & Validated  

---

## 1. Executive Summary

This report establishes the implementation, empirical evaluation, and scientific safeguards for **Stage 6: Risk Assessment and Mitigation Engine** of Component 4. The objective of Stage 6 is to provide a transparent, multi-dimensional, and explainable decision-support engine capable of assessing operational and financial risk, recommending a strategic growth posture (`PROCEED`, `MODIFY`, or `DELAY`), attributing specific observed risk drivers, and synthesizing targeted mitigation plans for Small and Medium Enterprises (SMEs) in Sri Lanka's **Western Province** (Colombo, Gampaha, Kalutara).

### Key Outcomes:
1. **Explainable Decision Engine:** Implemented [`src/component4/risk_assessment.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/src/component4/risk_assessment.py) providing standalone and tabular evaluation with transparent sub-scores, configurable advisory thresholds, and automated mitigation mapping.
2. **Tabular Assessment Outputs:** Evaluated all 2,000 action-scenario records and serialized [`data/processed/component4/risk_assessments.csv`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/data/processed/component4/risk_assessments.csv) and [`reports/component4/stage6_assessment_summary.json`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/reports/component4/stage6_assessment_summary.json).
3. **Distribution of Decisions (N=2,000):**
   - **Risk Categories:** High Risk = 986 (49.3%), Medium Risk = 659 (33.0%), Low Risk = 355 (17.8%). Mean composite score = `0.5721`.
   - **Growth Readiness:** `DELAY` = 1,412 (70.6%), `MODIFY` = 532 (26.6%), `PROCEED` = 56 (2.8%).
4. **Strict Zero Target Leakage:** The engine operates strictly on pre-action and post-action operational/financial features. All ground-truth targets (`target_overall_risk`, `target_growth_readiness`, `target_liquidity_stress`, `target_relationship_risk`) and simulator rule strings (`risk_factor_codes`, `mitigation_codes`) are completely excluded from predictive inputs.
5. **Full Test Suite Verification:** Expanded [`tests/test_component4.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/tests/test_component4.py) with 9 unit tests under `TestComponent4Stage6`. All **40 unit tests** across Stages 1–6 pass with zero errors in 8.58s.

---

## 2. Architecture & Processing Flow

The engine ingests 48 continuous and categorical features per SME action scenario and executes a 5-step evaluation pipeline:

```
                           INPUT RECORD / FEATURE ROW
                 (Financial, Relational, Action, Context Data)
                                       │
                                       ▼
                     [Step 1: Evidence Sufficiency Guard]
              Check presence of core revenue, expenses, and cash
                                       │
             ┌─────────────────────────┴─────────────────────────┐
             │ Sufficient / Partial                              │ Insufficient
             ▼                                                   ▼
[Step 2: Sub-Score Evaluators (5 Dimensions)]         [Safe Fallback Response]
  ├─ S_liq : Cash runway & margin deficit               - Category: MEDIUM
  ├─ S_debt: Debt repayment burden & DSCR               - Readiness: MODIFY
  ├─ S_sup : Supplier HHI, CR1 & disruption             - Flag: Insufficient Data
  ├─ S_cus : Customer HHI, CR1 & payment delays         - Action: Financial records
  └─ S_act : Investment pressure & capacity gap
             │
             ▼
[Step 3: Composite Risk Score Calculation]
  S_comp = 0.30*S_liq + 0.20*S_debt + 0.25*S_act + 0.15*S_sup + 0.10*S_cus
  Categorize: LOW (<0.35) | MEDIUM (0.35-0.65) | HIGH (>=0.65)
             │
             ▼
[Step 4: Decision Boundary & Critical Red-Flag Audit]
  - Post-action runway < 1.0 month? -> DELAY
  - Investment > Cash AND Debt Burden > 20%? -> DELAY
  - Moderate concentration or capacity gap? -> MODIFY
  - Low composite risk and healthy buffer? -> PROCEED
             │
             ▼
[Step 5: Explainability & Mitigation Mapping Engine]
  - Attribute top risk drivers with observed values & benchmark thresholds
  - Map active drivers to actionable, Western Province-tailored mitigations
             │
             ▼
                   STRUCTURED ASSESSMENT RESULT & DATASET
```

---

## 3. Mathematical Scoring Formulation & Configurable Thresholds

### 3.1 Dimension Sub-Score Formulations

Every dimension evaluates to a continuous score in $[0.0, 1.0]$:

1. **Liquidity Risk Sub-Score ($S_{\text{liquidity}} \in [0.0, 1.0]$):**
   $$S_{\text{liquidity}} = 0.35 \cdot \max\left(0, \min\left(1, 1 - \frac{\text{BaselineRunway}}{4.0}\right)\right) + 0.65 \cdot \max\left(0, \min\left(1, 1 - \frac{\text{PostRunway}}{4.0}\right)\right) + \mathbf{1}_{\{\text{Margin} < 0\}} \cdot 0.15$$
   - *Rationale:* Heavily weights the post-action runway; penalizes negative operating margins that compound operational cash burn.

2. **Debt Burden Sub-Score ($S_{\text{debt}} \in [0.0, 1.0]$):**
   $$S_{\text{debt}} = 0.60 \cdot \max\left(0, \min\left(1, \frac{\text{DebtServiceBurden}}{0.35}\right)\right) + 0.40 \cdot \max\left(0, \min\left(1, 1 - \frac{\text{DSCR}}{2.25}\right)\right)$$
   - *Rationale:* Evaluates repayment share against gross revenue alongside operational income coverage ($\text{DSCR}$).

3. **Supplier Concentration Sub-Score ($S_{\text{supplier}} \in [0.0, 1.0]$):**
   $$S_{\text{supplier}} = \min\left(1.0, 0.60 \cdot \text{SupplierHHI} + 0.20 \cdot \text{SupplierCR1} + 0.20 \cdot \mathbf{1}_{\{\text{DisruptedSupplier}\}}\right)$$
   - *Rationale:* Incorporates Herfindahl–Hirschman Index, single-supplier dominance ($CR_1$), and supply-chain disruption shocks.

4. **Customer Concentration Sub-Score ($S_{\text{customer}} \in [0.0, 1.0]$):**
   $$S_{\text{customer}} = 0.50 \cdot \text{CustomerHHI} + 0.30 \cdot \text{CustomerCR1} + 0.20 \cdot \max\left(0, \min\left(1, \frac{\text{PaymentDelayDays}}{60.0}\right)\right)$$
   - *Rationale:* Combines revenue concentration with trade receivable settlement friction.

5. **Growth Action Stress Sub-Score ($S_{\text{action}} \in [0.0, 1.0]$):**
   $$S_{\text{action}} = 0.40 \cdot \min\left(1, \frac{\text{InvestmentToCash}}{1.0}\right) + 0.30 \cdot \text{CapacityGap} + 0.20 \cdot \min\left(1, \frac{\text{CostToRevenue}}{0.30}\right) + 0.10 \cdot \min(1, \text{StaffingGrowth})$$
   - *Rationale:* Balances upfront capital depletion, operational infrastructure deficits, and overhead expansion strain.

### 3.2 Composite Score & Weighting

$$S_{\text{composite}} = 0.30 \cdot S_{\text{liquidity}} + 0.20 \cdot S_{\text{debt}} + 0.25 \cdot S_{\text{action}} + 0.15 \cdot S_{\text{supplier}} + 0.10 \cdot S_{\text{customer}}$$

| Weight Parameter | Symbol | Value | Analytical Rationale |
| :--- | :---: | :---: | :--- |
| **Liquidity Weight** | $w_{\text{liq}}$ | **0.30** | Cash depletion is the most immediate cause of SME insolvency. |
| **Growth Stress Weight** | $w_{\text{act}}$ | **0.25** | The primary decision context is executing a strategic expansion action. |
| **Debt Burden Weight** | $w_{\text{debt}}$ | **0.20** | Fixed repayment liabilities restrict operational flexibility. |
| **Supplier Weight** | $w_{\text{sup}}$ | **0.15** | Supply dependencies threaten material availability and cost predictability. |
| **Customer Weight** | $w_{\text{cus}}$ | **0.10** | Sales concentration presents counterparty and receivable delay risks. |

### 3.3 Risk Categorization & Decision Boundaries

- **Overall Risk Category:**
  - `LOW`: $S_{\text{composite}} < 0.35$
  - `MEDIUM`: $0.35 \le S_{\text{composite}} < 0.65$
  - `HIGH`: $S_{\text{composite}} \ge 0.65$

- **Growth Readiness Recommendation:**
  - `DELAY`: Assigned if $S_{\text{composite}} \ge 0.65$, OR if critical insolvency red flags exist:
    1. $\text{PostActionRunway} < 1.0$ month (immediate cash exhaustion).
    2. $\text{InvestmentToCash} > 1.0$ AND $\text{DebtServiceBurden} > 0.20$.
    3. $\text{PostActionNetCashFlow} < -100,000$ LKR with runway $< 2.0$ months.
  - `MODIFY`: Assigned if $0.35 \le S_{\text{composite}} < 0.65$, OR if manageable operational bottlenecks exist (e.g., supplier HHI $> 0.50$ or capacity gap $> 0.40$) that can be mitigated through staged execution.
  - `PROCEED`: Assigned only when $S_{\text{composite}} < 0.35$, post-action runway $\ge 1.5$ months, and zero critical red flags exist.

---

## 4. Explainable Risk Driver Attribution & Mitigation Mapping

The engine attributes specific risk drivers and maps them to concrete SME operational mitigations:

| Trigger Code | Advisory Condition | Observed Value Example | Targeted Mitigation Recommendation |
| :--- | :--- | :--- | :--- |
| **CRITICAL_CASH_RUNWAY** | Post-action runway $< 1.0$ month | $0.0$ months ($0$ LKR left) | *Phase capital investment and retain at least 3 months of operational cash buffer.* |
| **LOW_CASH_RUNWAY** | Post-action runway $< 2.0$ months | $1.4$ months | *Delay non-essential capital outlays and maintain minimum 2-month cash cushion.* |
| **OPERATING_LOSS** | Operating margin $< 0.0\%$ | $-12.5\%$ margin | *Audit unit economics and restore positive operating margins before expanding.* |
| **CRITICAL_DEBT_BURDEN** | Monthly debt burden $> 35.0\%$ | $42.1\%$ of revenue | *Negotiate loan tenure extension with lender and freeze additional borrowing.* |
| **ELEVATED_DEBT_SERVICE** | DSCR $< 1.5\text{x}$ or burden $> 20.0\%$ | $1.15\text{x}$ coverage | *Restructure short-term liabilities into longer maturities to improve DSCR above 1.5x.* |
| **SUPPLIER_CONCENTRATION**| Supplier HHI $> 0.50$ or CR1 $> 60.0\%$ | HHI $0.72$ (top supplier $84\%$) | *Qualify secondary local backup suppliers in Western Province and negotiate split-allocation terms.* |
| **SUPPLY_DISRUPTION** | Active supplier shock | Disrupted status active | *Activate pre-qualified backup supplier and establish safety stock inventory.* |
| **CUSTOMER_CONCENTRATION**| Customer HHI $> 0.40$ or CR1 $> 55.0\%$ | HHI $0.58$ (top customer $72\%$) | *Diversify commercial client acquisition and enforce milestone advance deposits.* |
| **PAYMENT_DELAY** | Settlement delay $> 30$ days | $42.5$ days delay | *Enforce strict 14-day invoicing terms, offer early-payment discounts, and utilize invoice discounting.* |
| **INVESTMENT_EXCEEDS_CASH**| Investment / Cash $> 1.0$ | $1.8\text{x}$ cash balance | *Restructure investment into phased milestone tranches funded by operational cash generation.* |
| **CAPACITY_GAP** | Capacity deficit $> 40.0\%$ | $65.0\%$ capacity gap | *Adopt staged hiring tied to contract demand milestones and lease modular capacity.* |
| **NO_MAJOR_TRIGGER** | All indicators within safe thresholds | All nominal | *Proceed with planned expansion under standard monitoring.* |

---

## 5. Empirical Evaluation Results

The engine was executed across all 2,000 action-scenario records in [`data/processed/component4/engineered_risk_features.csv`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/data/processed/component4/engineered_risk_features.csv):

### 5.1 Risk Categories & Sub-Score Distributions

| Dimension | Mean Score | Min Score | Max Score | Benchmark Context |
| :--- | :---: | :---: | :---: | :--- |
| **Liquidity Risk** | `0.7381` | `0.0000` | `1.0000` | High average reflecting tight SME working capital buffers |
| **Debt Burden** | `0.5937` | `0.0000` | `1.0000` | Reflects formal bank loan service burdens across the cohort |
| **Growth Action Stress** | `0.5241` | `0.0270` | `0.9850` | Sizable upfront capital requirements relative to liquid cash |
| **Customer Concentration** | `0.4131` | `0.1100` | `0.9500` | Moderate customer concentration in retail/wholesale SMEs |
| **Supplier Concentration** | `0.3975` | `0.0000` | `1.0000` | Significant variation: diversified retail to sole-source manufacturing |
| **Composite Risk Score** | `0.5721` | `0.0984` | `0.9652` | Well-calibrated, continuous score across $[0.0, 1.0]$ |

### 5.2 Growth Readiness Breakdown by Variant

| Growth Readiness Recommendation | BASELINE Variant (N=1,000) | MITIGATED Variant (N=1,000) | Total Cohort (N=2,000) |
| :--- | :---: | :---: | :---: |
| **DELAY** | 725 (72.5%) | 687 (68.7%) | **1,412 (70.6%)** |
| **MODIFY** | 249 (24.9%) | 283 (28.3%) | **532 (26.6%)** |
| **PROCEED** | 26 (2.6%) | 30 (3.0%) | **56 (2.8%)** |

- **Mitigation Impact:** Applying the mitigation intervention de-escalates high-risk commitments into structured conditional execution plans (`MODIFY`), improving operational viability.
- **Top Mitigation Actions Assigned Across Cohort:**
  1. *Phase capital investment and retain at least 3 months cash buffer:* 1,387 records.
  2. *Qualify secondary local backup suppliers in Western Province:* 220 records.
  3. *Diversify commercial client acquisition & advance deposits:* 177 records.
  4. *Proceed with standard monitoring:* 56 records.
  5. *Adopt staged hiring tied to contract demand:* 51 records.

---

## 6. Verification Test Suite Execution

The automated test suite in [`tests/test_component4.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/tests/test_component4.py) was expanded with `TestComponent4Stage6` containing 9 comprehensive unit tests:

| Test Method | Focus Area | Status | Key Validations |
| :--- | :--- | :---: | :--- |
| `test_stage6_risk_scoring_bounds_and_determinism` | Score bounds, category, determinism | **PASSED** | Composite score in $[0, 1]$; running identical inputs yields identical scores |
| `test_stage6_decision_boundary_proceed_modify_delay` | Decision boundary logic | **PASSED** | Low risk -> PROCEED; concentrated supplier -> MODIFY; low runway -> DELAY |
| `test_stage6_risk_driver_explanations_and_mitigation_mapping` | Driver attribution & action mapping | **PASSED** | Correct factor codes, actual numbers in explanations, mapped actions |
| `test_stage6_missing_invalid_and_nonfinite_inputs` | Robustness on dirty / malformed data | **PASSED** | Gracefully handles `None`, `NaN`, `Inf`, strings without exceptions |
| `test_stage6_insufficient_evidence_case` | Insufficient data guard | **PASSED** | Flags `INSUFFICIENT`, returns `can_proceed=False`, recommends record-keeping |
| `test_stage6_dataframe_assessment_pipeline` | Batch tabular processing | **PASSED** | Evaluates DataFrame and produces all 16 output columns |
| `test_stage6_zero_target_leakage` | Ground-truth target independence | **PASSED** | Injecting artificial target columns does not alter engine output |
| `test_stage6_western_province_geographic_restriction_and_dataset` | Geographic scope verification | **PASSED** | All 2,000 assessed records strictly Western Province (Colombo, Gampaha, Kalutara) |
| `test_stage6_variant_handling_mitigated_vs_baseline` | Paired variant assessment | **PASSED** | Assesses exactly 1,000 BASELINE and 1,000 MITIGATED actions |

**Test Suite Execution Output:**
```
Ran 40 tests in 8.585s
OK
```

---

## 7. Known Limitations & Scientific Boundaries

1. **Rule-Based Decision Support vs Historical Probability:** The scores generated by `RiskAssessmentEngine` are deterministic multi-factor decision-support indicators. They do **not** represent empirically calibrated probabilities of real-world bankruptcy, loan default, or business failure.
2. **Controlled Scenario Basis:** Assessments are conducted on the Western Province SME scenario dataset package. Strong alignment with `target_overall_risk` demonstrates rule consistency, not empirical validation against verified Sri Lankan business closures.
3. **Static Thresholds:** Advisory thresholds ($\text{runway} < 1.0\text{m}$, $\text{burden} > 0.35$, $\text{HHI} > 0.50$) reflect established SME financial planning literature and banking credit guidelines. They are configurable via `RiskFactorConfig` and should be calibrated when real-world regional SME default datasets become available.

---

## 8. Readiness for Stage 7

With Stage 6 complete, tested, and documented:
- Engine Module: [`src/component4/risk_assessment.py`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/src/component4/risk_assessment.py)
- Assessed Dataset: [`data/processed/component4/risk_assessments.csv`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/data/processed/component4/risk_assessments.csv)
- Assessment Summary: [`reports/component4/stage6_assessment_summary.json`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/reports/component4/stage6_assessment_summary.json)
- Documentation: [`reports/component4/stage6_risk_assessment.md`](file:///c:/Users/Tharindu/Desktop/AI-Driven-Business-Lifecycle-Decision-Support-System/reports/component4/stage6_risk_assessment.md)
- Next Step: **Stage 7 — GNN Research Prototype** (`src/component4/graph_builder.py`, `src/component4/gnn_model.py`, `src/component4/gnn_experiment.py`), constructing PyTorch Geometric graph data from scenario entities and relationships and training a GNN baseline compared against tabular baselines on identical leakage-free splits.
