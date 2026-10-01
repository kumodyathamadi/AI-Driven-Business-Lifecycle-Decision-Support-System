# AI-Based Business Feasibility Analysis & Personalized Business Plan Recommendation

An AI-driven decision-support component designed to help **new entrepreneurs and existing Small and Medium Enterprises (SMEs)** evaluate business feasibility, understand the factors influencing their decisions, compare alternative strategies, explore what-if scenarios, and generate personalized business plans.

This component is developed as **Component 1** of the broader:

> **AI-Driven Business Lifecycle Decision Support System**

---

## 📌 Overview

Starting or expanding an SME involves making decisions under uncertainty. Entrepreneurs need to consider factors such as available capital, location, market demand, competition, resources, experience, staffing, equipment, and supplier availability.

Traditional feasibility assessments may provide a general conclusion but often do not explain **why** a business is feasible or infeasible, what alternative strategies could be considered, or how changes in business conditions could affect the decision.

Component 1 addresses this problem through an integrated AI-based decision-support pipeline:

```text
Business / User Data
        ↓
Feasibility Prediction
        ↓
Explainable AI
        ↓
Strategy Generation
        ↓
TOPSIS Strategy Ranking
        ↓
What-If / Counterfactual Analysis
        ↓
Personalized Business Plan
        ↓
Structured Business Profile
```

The objective is not simply to predict feasibility, but to provide **explainable, personalized, and actionable business decision support**.

---

# 🎯 Objectives

Component 1 aims to:

* Predict the feasibility of a proposed business or business expansion.
* Support both **new-business proposals** and **existing-SME growth proposals**.
* Explain the factors influencing the feasibility prediction.
* Identify suitable alternative business strategies.
* Rank strategies according to multiple business objectives and constraints.
* Allow users to explore the impact of changing assumptions.
* Generate personalized business-plan recommendations.
* Produce a structured business profile from the analysis.
* Provide decision support that can adapt when business conditions change.

---

# 🔍 Problem Addressed

SME owners often need to answer questions such as:

* Is my proposed business feasible?
* What factors are affecting my feasibility?
* Is my available capital sufficient?
* Is this location suitable?
* How does market demand affect my decision?
* Should I change my business strategy?
* What happens if I increase my budget?
* What happens if operating costs increase?
* Would another location provide a better opportunity?
* Which available strategy best matches my objectives and constraints?
* What should my initial business plan look like?

Component 1 combines **Machine Learning, Explainable AI, Multi-Criteria Decision Making, and What-If Analysis** to address these questions within a single decision-support workflow.

---

# 🧠 Core Methodology

## 1. Business Feasibility Prediction

A supervised Machine Learning model predicts the feasibility of a business proposal using business, financial, market, location, experience, and resource-related features.

### Main feasibility classes

```text
Feasible
Conditionally Feasible
Infeasible
```

The model considers multiple factors rather than relying on a single financial indicator.

### Example input factors

* Business stage
* Business category
* Business description
* District
* Province
* Location type
* Proposed action
* Available capital
* Loan amount
* Monthly budget
* Initial inventory cost
* Expected price
* Expected customers per day
* Competition level
* Customer demand
* Operating days
* Entrepreneur experience
* Location suitability
* Available staff
* Required staff
* Available equipment
* Required equipment
* Supplier availability

---

# 🔬 Machine Learning

The feasibility prediction module evaluates machine-learning models for multiclass classification.

The current development includes models such as:

* Logistic Regression
* Random Forest

The preprocessing pipeline handles:

* Missing-value imputation
* Numerical feature preprocessing
* Categorical feature encoding
* Feature transformation
* Train / validation / test separation

The selected model is used as the core feasibility prediction engine.

---

# 📊 Current Baseline Results

The current development dataset contains approximately **1,200 business cases** across the feasibility classes.

### Current Random Forest baseline

| Metric      | Result |
| ----------- | -----: |
| Accuracy    | 88.33% |
| Weighted F1 |   0.88 |
| Macro F1    |   0.87 |
| ROC-AUC     | 0.9599 |
| PR-AUC      | 0.9494 |

### Class-level F1

| Feasibility Class      |   F1 |
| ---------------------- | ---: |
| Conditionally Feasible | 0.90 |
| Feasible               | 0.87 |
| Infeasible             | 0.86 |

These are **current development/baseline results**, and further validation and evaluation are part of the ongoing research.

---

# 💡 Explainable AI

A feasibility prediction should not behave like a black box.

Component 1 therefore incorporates **Explainable AI (XAI)** to identify the factors contributing to a prediction.

### SHAP

SHAP is used to analyse feature-level contributions to model predictions.

The explanation layer aims to answer:

> **"Why did the model produce this feasibility result?"**

For example:

```text
Feasibility Prediction
        ↓
 ┌──────────────────────────┐
 │ Positive Contributors    │
 │ + High demand            │
 │ + Suitable location     │
 │ + Strong experience      │
 └──────────────────────────┘
        ↓
 ┌──────────────────────────┐
 │ Negative Contributors    │
 │ - High competition       │
 │ - Resource shortage      │
 │ - High initial cost      │
 └──────────────────────────┘
```

This makes the prediction more understandable and useful for business decision-making.

---

# 🧩 Strategy Recommendation

Feasibility prediction alone does not tell an entrepreneur **what to do next**.

Component 1 therefore generates and evaluates alternative business strategies.

Possible strategy changes can include:

* Adjusting the available budget
* Changing the proposed business action
* Changing the location
* Adjusting resource allocation
* Modifying business scale
* Adjusting operational assumptions

The strategies are evaluated according to multiple criteria rather than using a single score.

---

# ⚖️ TOPSIS-Based Strategy Ranking

**TOPSIS (Technique for Order Preference by Similarity to Ideal Solution)** is used as the multi-criteria decision-making method for ranking alternative strategies.

The strategy ranking can consider factors such as:

* Financial suitability
* Market potential
* Location suitability
* Resource availability
* Expected demand
* Risk
* Entrepreneur fit
* Business constraints

### Conceptual workflow

```text
Alternative Strategies
        ↓
Define Decision Criteria
        ↓
Calculate Criterion Weights
        ↓
Normalize Decision Matrix
        ↓
Weighted Decision Matrix
        ↓
Ideal / Negative-Ideal Solutions
        ↓
TOPSIS Closeness Coefficient
        ↓
Rank Strategies
```

This allows the system to move from:

> **"Is this business feasible?"**

towards:

> **"Which available strategy is most suitable under the given conditions?"**

---

# 🔄 What-If & Counterfactual Analysis

Business decisions are affected by changing assumptions.

Component 1 provides a scenario-analysis layer that allows users to modify selected business conditions and observe how the feasibility result and strategy recommendations change.

### Example scenarios

```text
Current Scenario
Budget = LKR 500,000
Location = Homagama
Demand = Medium
        ↓
Feasibility Result
        ↓
        ↓
What if budget increases?
        ↓
Updated Feasibility
        ↓
Updated Strategy Ranking
```

Other scenarios may include:

* Increasing available capital
* Decreasing available capital
* Changing location
* Increasing operating costs
* Changing expected demand
* Changing resource availability
* Increasing competition

The purpose is to help users understand **how assumptions affect decisions**, rather than presenting a single static prediction.

---

# 📋 Personalized Business Plan Recommendation

Following feasibility analysis and strategy ranking, the system generates a personalized business-plan recommendation.

The plan can be informed by:

* Business profile
* Feasibility prediction
* Model explanations
* Selected strategy
* Business constraints
* Scenario results
* Business objectives

### Conceptual flow

```text
Business Data
      ↓
Feasibility Analysis
      ↓
Explainability
      ↓
Strategy Evaluation
      ↓
TOPSIS Ranking
      ↓
Selected Strategy
      ↓
Personalized Business Plan
```

The recommendation layer is designed to operate **after the ML-based feasibility analysis and decision-making stages**, rather than using an LLM as the feasibility predictor.

---

# 🏢 Structured Business Profile

The final analysis can be represented as a structured business profile containing information such as:

```text
Business Profile
│
├── Business Information
├── Business Category
├── Business Location
├── Business Stage
├── Proposed Action
├── Financial Information
├── Market Information
├── Resource Information
├── Feasibility Result
├── Explanation
├── Recommended Strategy
├── Scenario Analysis
└── Personalized Plan
```

This structured representation can support future integration with other components of the wider Business Lifecycle Decision Support System.

---

# 🖥️ System Architecture

Component 1 follows a modular architecture:

```text
                    ┌─────────────────────┐
                    │   Business / User   │
                    │        Data         │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │ Data Preprocessing  │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │ ML Feasibility     │
                    │ Prediction          │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │ Explainable AI      │
                    │ SHAP Analysis       │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │ Strategy Generation │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │ TOPSIS / MCDM       │
                    │ Strategy Ranking     │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │ What-If /           │
                    │ Counterfactual      │
                    │ Analysis            │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │ Personalized        │
                    │ Business Plan       │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │ Structured Business │
                    │ Profile             │
                    └─────────────────────┘
```

---

# 🛠️ Technology Stack

### Machine Learning

* Python
* Scikit-learn
* Pandas
* NumPy
* Joblib

### Explainable AI

* SHAP

### Decision Making

* TOPSIS
* Multi-Criteria Decision Making (MCDM)

### Backend

* Python
* FastAPI

### Frontend

* React
* Vite

### Database

* PostgreSQL
* SQLite fallback

### Document Generation

* ReportLab
* python-docx

### Development & Testing

* Jupyter Notebook
* VS Code
* Pytest

---

# 📁 Project Structure

```text
Component_1/
│
├── models/
│   └── feasibility_model/
│       └── random_forest.joblib
│
├── notebooks/
│   ├── data_analysis/
│   ├── preprocessing/
│   ├── model_training/
│   ├── model_evaluation/
│   ├── explainability/
│   ├── strategy_analysis/
│   ├── topsis/
│   ├── what_if/
│   └── validation/
│
├── src/
│   ├── preprocessing/
│   ├── prediction/
│   ├── explainability/
│   ├── strategies/
│   ├── topsis/
│   ├── what_if/
│   ├── planning/
│   ├── profile/
│   ├── intake/
│   └── orchestrator.py
│
├── tests/
│   └── test_api.py
│
├── frontend/
│   └── React / Vite application
│
├── data/
│
├── requirements.txt
│
└── README.md
```

> The exact folder structure may evolve as the research implementation develops.

---

# 🔌 API

The current application architecture includes API endpoints for the main Component 1 workflow.

### Business Analysis

```text
POST /api/business/analyze
```

Performs the main business analysis workflow.

### Intake

```text
POST /api/intake/extract
```

Processes business information provided through the intake interface.

### Records

```text
GET /api/records
GET /api/record/{id}
```

Retrieves stored business analysis records.

### Business Plan

```text
POST /api/plan/generate-pdf
POST /api/plan/generate-docx
```

Generates downloadable business-plan documents.

---

# 🖥️ User Interface

The Component 1 interface is designed around an SME decision-support workflow.

### Main areas include

* Business information intake
* Business feasibility result
* Feasibility explanation
* SHAP-based insights
* Alternative strategies
* TOPSIS ranking
* Scenario Explorer
* Personalized Business Plan
* Structured Business Profile
* Saved business analyses

The interface is implemented using **React and Vite**.

---

# 📈 Evaluation Framework

Component 1 is evaluated from multiple perspectives.

## Machine Learning Evaluation

* Accuracy
* Precision
* Recall
* F1-score
* Confusion Matrix
* ROC-AUC
* PR-AUC

## Explainability Evaluation

* SHAP feature relevance
* Explanation consistency
* Agreement between important features and model behaviour

## Strategy Recommendation Evaluation

* TOPSIS sensitivity analysis
* Ranking stability
* Criterion-weight sensitivity
* Constraint satisfaction

## What-If Evaluation

* Scenario consistency
* Monotonicity checks where appropriate
* Feasibility changes under controlled assumptions
* Recommendation stability

## Domain Evaluation

Potential evaluation with SME/business-domain participants can assess:

* Recommendation usefulness
* Explanation understandability
* Business-plan relevance
* Decision-support usefulness

---

# 🔬 Research Novelty

The primary research focus of Component 1 is the integration of **feasibility prediction with personalized multi-objective strategy recommendation**.

Rather than stopping at a feasibility classification, the proposed approach connects:

```text
Prediction
    +
Explanation
    +
Multi-Criteria Decision Making
    +
What-If Analysis
    +
Personalized Planning
```

This creates a decision-support workflow that can help users understand not only **whether** a business proposal is feasible, but also:

* Why the model reached that conclusion.
* Which alternative strategies can be considered.
* How strategies compare under multiple criteria.
* How changing assumptions can affect the outcome.
* What a personalized business plan could look like.

---

# 🇱🇰 Sri Lankan SME Context

Component 1 is developed with a focus on the **Sri Lankan SME environment**.

The research considers localized business factors including:

* Sri Lankan business locations
* Local SME conditions
* LKR-based financial values
* Local market conditions
* Business resource constraints
* Sri Lankan SME business categories

The localized focus is intended to make the feasibility and recommendation process more relevant to the context in which Sri Lankan SMEs operate.

---

# 🔮 Future Development

Future development areas include:

* Larger and more representative SME datasets
* Additional business categories
* Further model comparison and tuning
* Improved explainability evaluation
* Expanded counterfactual scenarios
* More robust strategy-generation rules
* Improved TOPSIS sensitivity analysis
* SME/domain-expert evaluation
* Further personalization
* Integration with the remaining lifecycle components
* Continuous recalibration using updated business information

---

# 🚀 Current Status

Component 1 is under active research and development.

### Current development areas

* [x] Dataset preparation
* [x] Data preprocessing
* [x] ML feasibility prediction
* [x] Model evaluation
* [x] SHAP-based explainability
* [x] Strategy recommendation framework
* [x] TOPSIS-based ranking
* [x] What-If analysis framework
* [x] Personalized business-plan generation
* [x] Structured business profile
* [x] React-based user interface
* [x] FastAPI backend
* [x] Database integration
* [x] PDF / DOCX business-plan generation
* [x] API testing
* [ ] Extended SME/domain evaluation
* [ ] Final integrated evaluation
* [ ] Final research validation

---

# 🎓 Research Component

**Component:** Component 1

**Title:**
**AI-Based Business Feasibility Analysis & Personalized Business Plan Recommendation**

**Parent Research Project:**
**AI-Driven Business Lifecycle Decision Support System**

**Project ID:** J26-IT-362

---

## 📜 Academic Purpose

This repository contains the research implementation, experiments, machine-learning models, decision-support methods, backend services, frontend interface, and evaluation work associated with **Component 1** of the AI-Driven Business Lifecycle Decision Support System.

The system is developed for **academic and research purposes**.
