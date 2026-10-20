# Component 4 Dataset Pack (English)

## Provenance warning
All business-level records, monthly values, relationship edges, risk labels and scenario values in this pack are SYNTHETIC. Business IDs are artificial. `Business_Relationships.csv` contains simulated edges and `Verified_Flag=0`; it is not a verified Sri Lankan business network. `Economic_Indicators.csv` contains synthetic placeholders, NOT official CBSL observations.

Use for schema/pipeline/UI/GNN prototyping only. Synthetic labels are rule-derived and cannot validate real-world SME default prediction.

## Files
Business_Profile.csv (1,000 businesses); six monthly risk feature tables; Economic_Indicators.csv; Business_Relationships.csv; Risk_Assessment.csv; Scenario_Analysis.csv; Data_Dictionary.csv; Data_Sources.csv.

Monthly tables contain 24 months (2024-01 to 2025-12) per business. Risk labels and mitigation actions are illustrative rule-derived outputs.

## Grain
Business_Profile: Business_ID
Monthly tables: Business_ID + Month
Credit_Risk_Data: Business_ID + Month + Loan_ID
Economic_Indicators: Indicator_ID + Month
Business_Relationships: Edge_ID
Risk_Assessment: Business_ID + Assessment_Month
Scenario_Analysis: Scenario_ID + Business_ID

## GNN notes
Use Business_Profile as node features and Business_Relationships as an edge list. Use Relationship_Type as edge type. For temporal modelling, join monthly features on Business_ID + Month. Do not treat synthetic edges as real relationships.

## Leakage warning
When predicting risk, exclude the target labels/scores, Risk_Factors, Recommended_Mitigation and Growth_Ready_Flag from model input. Use business-level or time-based holdouts. Synthetic labels only test whether a model learns these illustrative rules.

## Public sources to obtain real data
1. World Bank Enterprise Survey 2025, Sri Lanka: https://microdata.worldbank.org/catalog/8264
   Survey has 607 establishments and 336 variables; it can support selected firm-level features but is not a monthly risk-outcome panel.
2. CBSL Monthly Economic Indicators: https://www.cbsl.gov.lk/statistics/economic-indicators/monthly-indicators
3. CBSL Economic Indicators: https://www.cbsl.gov.lk/en/statistics/economic-indicators
4. World Bank Sri Lanka Data: https://data.worldbank.org/country/LK

## Component 1 integration
The actual Component 1 CSV headers were not verified in this session. The profile fields are based on the repository's published Component 1 description, not a confirmed column-by-column mapping. Before joining, inspect `Component_One_Core_Feasibility.csv`, create an explicit header mapping and preserve source-row identifiers. Do not assume synthetic Business_IDs correspond to Component 1 rows.
