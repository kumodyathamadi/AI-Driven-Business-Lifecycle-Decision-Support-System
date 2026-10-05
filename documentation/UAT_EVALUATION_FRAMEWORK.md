# 📋 Component 1 — Expert & User Acceptance Testing (UAT) Evaluation Framework
**Project Title:** AI-Driven Business Lifecycle Decision Support System  
**Component 1:** AI-Based Business Feasibility Analysis & Personalized Business Plan Recommendation  
**Project ID:** J26-IT-362  
**Target Audience:** 10–15 Domain Experts & SME Stakeholders  

---

## 1. Evaluation Objectives & Purpose
This framework provides a rigorous, standardized, empirical evaluation instrument to validate Component 1 under real-world domain conditions. It evaluates the system's analytical reliability, explainability, decision-support utility, and interface usability across **10 core dimensions** before final academic submission and system demonstration.

> [!IMPORTANT]
> **Academic Integrity Notice:** In accordance with research standards, this document establishes the protocol, scenarios, and questionnaires. It contains **no simulated or fabricated participant responses**. Actual scores will be collected directly from real domain participants during scheduled evaluation sessions.

---

## 2. Participant Profile Selection & Stratification
To ensure external validity and representative domain feedback, the evaluation panel targets **10–15 participants** stratified across 4 domain cohorts:

| Cohort ID | Participant Role | Target Count | Domain Qualifications / Profile | Key Evaluation Focus |
| :--- | :--- | :---: | :--- | :--- |
| **EXP-SME** | SME Owners / Founders | 3–4 | Active owners of retail, food/beverage, or service SMEs in Sri Lanka (≥ 2 years operation). | Practical relevance, ease of data entry, business plan clarity. |
| **EXP-CON** | SME Business Consultants | 3–4 | Management/business development advisors with micro & SME consulting experience. | Strategy viability, TOPSIS ranking logic, action roadmap realism. |
| **EXP-BNK** | Commercial Banking / Credit Officers | 2–3 | SME credit risk evaluators or loan officers from licensed commercial banks. | Financial feasibility assessment, loan dependency sensitivity, risk hurdles. |
| **EXP-ACA** | Entrepreneurship / Business Academics | 2–4 | University lecturers or researchers in SME management, entrepreneurship, or DSS. | Explainability (SHAP), algorithmic fairness, MCDM robustness, HITL workflow. |

---

## 3. Participant Briefing & Ethical Consent Form

```
STUDY INFORMATION & INFORMED CONSENT
Project ID: J26-IT-362 | Component 1: SME Feasibility & Decision Support Engine

Dear Participant,
You are invited to participate in the academic evaluation of an AI-driven decision support system designed to assist Sri Lankan Small and Medium Enterprises (SMEs) during their pre-launch and early lifecycle stages.

During this session (approx. 35–45 minutes), you will:
1. Review the system demonstration using standardized SME scenarios.
2. Interact directly with the system (feasibility prediction, SHAP drivers, TOPSIS strategy ranking, What-If simulator, and personalized business plan).
3. Complete the structured evaluation questionnaire below.

Confidentiality & Rights:
- All responses are strictly anonymized and used solely for academic research purposes.
- Your participation is entirely voluntary; you may withdraw or omit any question at any time.
- The system generates decision support recommendations and does not provide formal legal or credit guarantees.

Consent Declaration:
[ ] I confirm that I have read and understood the study information and agree to participate.
Participant Signature / Initials: _______________________    Date: _______________
Cohort (circle):  SME Owner  |  Business Consultant  |  Loan Officer  |  Academic/Researcher
```

---

## 4. Standardized Evaluation Scenarios
Participants will evaluate the system using three standardized Sri Lankan SME profiles representing the 3 model classes:

### Scenario A (`C00018` — Feasible Retail Bakery)
- **Business Profile:** Existing Artisanal Bakery in Colombo (Commercial district).
- **Financial State:** Available Capital: LKR 550,000; Monthly Budget: LKR 117,000; Loan: LKR 0.
- **Operations:** 3 staff, daily footfall 19, equipment readiness 4/5, demand score 79/100, 3 years experience.
- **Expected System Outcome:** `Feasible` (Confidence ~55.0%). SHAP highlights solid equipment score and zero loan reliance.

### Scenario B (`C00001` — Conditionally Feasible Grocery/Mini-Mart)
- **Business Profile:** New startup Grocery / Mini-Mart in Colombo (Suburban commercial hub).
- **Financial State:** Available Capital: LKR 730,000; Monthly Budget: LKR 185,000; Loan: LKR 0.
- **Operations:** 2 staff, daily footfall 10, equipment readiness 2/5 (deficit), demand score 56/100, 1 year experience.
- **Expected System Outcome:** `Conditionally Feasible` (Confidence ~71.0%). SHAP identifies equipment score and low footfall as hurdles; What-If reveals +30% footfall boosts feasibility viability.

### Scenario C (`C00002` — Infeasible Apparel Boutique)
- **Business Profile:** New startup Clothing / Garment shop in Colombo with high local competition.
- **Financial State:** Available Capital: LKR 97,000; Monthly Budget: LKR 271,000; Loan: LKR 528,000 (high leverage).
- **Operations:** 1 staff, daily footfall 45, equipment readiness 1/5, high competition, 0 years experience.
- **Expected System Outcome:** `Infeasible` (Confidence ~98.0%). SHAP identifies severe capital shortfall and extreme loan dependency; Counterfactual search shows single-variable capital injection cannot alone bridge the gap.

---

## 5. Structured Questionnaire (10 Dimensions, 5-Point Likert Scale)
**Rating Scale:**  
`1 = Strongly Disagree (SD)` | `2 = Disagree (D)` | `3 = Neutral (N)` | `4 = Agree (A)` | `5 = Strongly Agree (SA)`

### Dimension 1: Feasibility Result Usefulness & Credibility
- **Q1.1:** The 3-class feasibility outcomes (*Feasible, Conditionally Feasible, Infeasible*) provide a realistic and nuanced assessment of business survival.  
  `[ 1 ]  [ 2 ]  [ 3 ]  [ 4 ]  [ 5 ]`
- **Q1.2:** The model's confidence score and probability distributions help quantify the uncertainty of the business venture.  
  `[ 1 ]  [ 2 ]  [ 3 ]  [ 4 ]  [ 5 ]`

### Dimension 2: SHAP Local Explainability & Attribution Clarity
- **Q2.1:** The identification of positive enablers (e.g., adequate capital, experience) is clear and logically consistent with business reality.  
  `[ 1 ]  [ 2 ]  [ 3 ]  [ 4 ]  [ 5 ]`
- **Q2.2:** The negative hurdle attributions (e.g., equipment deficit, high loan ratio) accurately pinpoint what the entrepreneur must fix.  
  `[ 1 ]  [ 2 ]  [ 3 ]  [ 4 ]  [ 5 ]`

### Dimension 3: Strategy Recommendation Actionability
- **Q3.1:** The four generated candidate strategies are distinct, relevant, and contextually adapted to the SME's actual profile.  
  `[ 1 ]  [ 2 ]  [ 3 ]  [ 4 ]  [ 5 ]`
- **Q3.2:** The strategic recommendations provide clear, practical guidance that an SME founder can operationalize.  
  `[ 1 ]  [ 2 ]  [ 3 ]  [ 4 ]  [ 5 ]`

### Dimension 4: TOPSIS Multi-Criteria Ranking Usefulness
- **Q4.1:** Ranking strategies across the 5 criteria (Financial Viability, Feasibility, Market Alignment, Operational Risk, Resource Efficiency) is transparent and balanced.  
  `[ 1 ]  [ 2 ]  [ 3 ]  [ 4 ]  [ 5 ]`
- **Q4.2:** The relative closeness score ($C_i^*$) provides an intuitive way to compare alternative strategic pathways.  
  `[ 1 ]  [ 2 ]  [ 3 ]  [ 4 ]  [ 5 ]`

### Dimension 5: What-If Scenario Simulation Utility
- **Q5.1:** The interactive sliders and scenario tests (+50% Capital, +30% Footfall, -20% Budget) allow entrepreneurs to explore assumption shifts effectively.  
  `[ 1 ]  [ 2 ]  [ 3 ]  [ 4 ]  [ 5 ]`
- **Q5.2:** The multi-class probability deltas and Viability Index changes clearly communicate whether an operational tweak improves business prospects.  
  `[ 1 ]  [ 2 ]  [ 3 ]  [ 4 ]  [ 5 ]`

### Dimension 6: Counterfactual Search Utility & Boundary Insights
- **Q6.1:** The counterfactual boundary analysis clearly explains the minimum conditions or capital required to achieve feasibility.  
  `[ 1 ]  [ 2 ]  [ 3 ]  [ 4 ]  [ 5 ]`
- **Q6.2:** The explanation of when a business constraint is multi-dimensional (and cannot be solved by capital alone) prevents unrealistic expectations.  
  `[ 1 ]  [ 2 ]  [ 3 ]  [ 4 ]  [ 5 ]`

### Dimension 7: Personalized Business Plan Quality & Completeness
- **Q7.1:** The 5-section generated business plan (Executive Summary, Operational, Marketing, Financial Runway, Action Roadmap) provides a comprehensive strategic foundation.  
  `[ 1 ]  [ 2 ]  [ 3 ]  [ 4 ]  [ 5 ]`
- **Q7.2:** The 3-phase execution roadmap (0–3 months, 3–12 months, 1+ year) provides realistic, phased operational milestones.  
  `[ 1 ]  [ 2 ]  [ 3 ]  [ 4 ]  [ 5 ]`

### Dimension 8: Human-in-the-Loop (HITL) Strategy Selection
- **Q8.1:** The ability for the entrepreneur to adopt an alternative strategy (e.g. Rank #2 or #3) while preserving AI transparency respects human decision autonomy.  
  `[ 1 ]  [ 2 ]  [ 3 ]  [ 4 ]  [ 5 ]`
- **Q8.2:** The system correctly and seamlessly adapts the personalized plan and financial runway to reflect the human-selected strategy.  
  `[ 1 ]  [ 2 ]  [ 3 ]  [ 4 ]  [ 5 ]`

### Dimension 9: System Usability & Interface Design
- **Q9.1:** The intake process, dashboard navigation, and visual analytics (charts, radar graphs, cards) are intuitive and easy to understand.  
  `[ 1 ]  [ 2 ]  [ 3 ]  [ 4 ]  [ 5 ]`
- **Q9.2:** Error messages for missing required fields are clear and prevent incorrect or incomplete analyses without silent assumptions.  
  `[ 1 ]  [ 2 ]  [ 3 ]  [ 4 ]  [ 5 ]`

### Dimension 10: Overall Decision Support Utility
- **Q10.1:** Component 1 substantially improves upon generic business plan templates and manual spreadsheet estimation.  
  `[ 1 ]  [ 2 ]  [ 3 ]  [ 4 ]  [ 5 ]`
- **Q10.2:** I would recommend this tool to early-stage entrepreneurs, SME advisors, or credit assessment teams in Sri Lanka.  
  `[ 1 ]  [ 2 ]  [ 3 ]  [ 4 ]  [ 5 ]`

---

## 6. Qualitative Feedback Questions
1. **Strengths:** Which feature of Component 1 did you find most valuable for SME planning and decision support?
   *(Open text response)*
2. **Weaknesses / Friction Points:** Where did you encounter ambiguity, confusion, or unrealistic recommendations?
   *(Open text response)*
3. **Local Context Suitability:** How well do the financial ranges, location metrics, and strategies reflect the Sri Lankan SME environment?
   *(Open text response)*
4. **Integration Recommendations:** What additional inputs or features would you like to see before linking to legal (Comp 2) or financial (Comp 3) modules?
   *(Open text response)*

---

## 7. Quantitative Scoring & Statistical Analysis Methodology
Once evaluation data is collected, the following statistical measures will be computed:

1. **Item & Dimension Means ($\mu$) and Standard Deviations ($\sigma$):**
   $$\mu_d = \frac{1}{N \cdot K_d} \sum_{i=1}^N \sum_{j=1}^{K_d} x_{i,j,d}$$
   where $N$ is participant count, $K_d = 2$ items per dimension $d$.

2. **Dimension-Level Acceptance Threshold:**
   - **Target Benchmark:** Mean score $\mu_d \ge 4.00$ (out of 5.00) indicates strong acceptance.
   - **Marginal Threshold:** $3.50 \le \mu_d < 4.00$ indicates acceptable with minor revisions.
   - **Critical Revision:** $\mu_d < 3.50$ flags that dimension for technical or design refinement.

3. **Cohort Comparison (ANOVA / Kruskal-Wallis):**
   Evaluate whether SME Owners, Consultants, Bankers, and Academics evaluate dimensions differently (e.g. Bankers may scrutinize financial runway more rigorously than founders).

4. **Internal Consistency Reliability (Cronbach's $\alpha$):**
   Ensure questionnaire scale reliability exceeds $\alpha \ge 0.80$ across the 20 Likert items.
