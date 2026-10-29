"""
Component 4: Phase 2 & 3 — Dynamic Schema-Driven Intake & Provenance Management.
Provides:
1. Complete Five-Dimension Risk Assessment Requirement Schema:
   - Credit Risk (loan balance, installment, interest rate, payment delay, arrears)
   - Market Risk (sales growth, demand index, competitor pressure, customer concentration)
   - Inflation Risk (expected cost increases, imported input dependency, price adjustment power)
   - Liquidity Risk (available liquid cash, monthly budget, receivables, payables, cash runway)
   - Operational Risk (critical suppliers, single supplier dependency, inventory coverage, delivery delay, staffing)
2. Missing Information Detection: Compares extracted business plan facts against required fields.
3. Provenance Tagging: EXTRACTED_FROM_PLAN, USER_DECLARED, INDEPENDENTLY_VERIFIED, SIMULATED.
4. Validation & Safeguards: Handles "Unknown" and "Not available", validates numeric & logical constraints,
   ensuring unknown values are never automatically treated as low risk or independently verified.
"""

import os
import sys
from datetime import datetime, timezone
from dataclasses import dataclass, field, asdict
from typing import Dict, Any, List, Optional, Tuple, Union

WESTERN_PROVINCE_DISTRICTS = {"Colombo", "Gampaha", "Kalutara"}

# Legacy Provenance Codes
PROVENANCE_EXTRACTED = "EXTRACTED_FROM_PLAN"
PROVENANCE_USER_DECLARED = "USER_DECLARED"
PROVENANCE_INDEPENDENTLY_VERIFIED = "INDEPENDENTLY_VERIFIED"
PROVENANCE_SIMULATED = "SIMULATED_SCENARIO"

# Phase 2 Canonical 7-Tier Provenance Categories
PROVENANCE_STATED_IN_PLAN = "STATED_IN_PLAN"
PROVENANCE_USER_CONFIRMED = "USER_CONFIRMED"
PROVENANCE_USER_ESTIMATED = "USER_ESTIMATED"
PROVENANCE_UNKNOWN = "UNKNOWN"
PROVENANCE_NOT_APPLICABLE = "NOT_APPLICABLE"
PROVENANCE_DERIVED = "DERIVED_CALCULATION"
PROVENANCE_CONFLICTING = "CONFLICTING_SOURCES"

CANONICAL_FIELD_ALIASES: Dict[str, str] = {
    # Debt & Loan fields
    "outstanding_loan_balance": "outstanding_loan_balance_lkr",
    "outstanding_debt_lkr": "outstanding_loan_balance_lkr",
    "outstanding_loan_balance_lkr": "outstanding_loan_balance_lkr",
    "total_outstanding_loan_balance_lkr": "outstanding_loan_balance_lkr",
    "total_outstanding_loan_balance": "outstanding_loan_balance_lkr",
    "monthly_loan_repayment": "monthly_loan_repayment_lkr",
    "monthly_loan_repayments_lkr": "monthly_loan_repayment_lkr",
    "monthly_debt_repayment_lkr": "monthly_loan_repayment_lkr",
    "monthly_loan_repayment_lkr": "monthly_loan_repayment_lkr",
    "overdue_repayments": "repayment_overdue_status",
    "repayment_status": "repayment_overdue_status",
    "payment_delay_days": "repayment_delay_days",
    "repayment_delay_days": "repayment_delay_days",
    "repayment_overdue_status": "repayment_overdue_status",
    "overdue_payment_count_12m": "overdue_payment_count_12m",
    "overdue_payment_count": "overdue_payment_count_12m",
    "total_overdue_amount_lkr": "total_overdue_amount_lkr",
    "total_overdue_amount": "total_overdue_amount_lkr",
    "arrears_amount_lkr": "total_overdue_amount_lkr",
    "longest_overdue_period_days": "longest_overdue_period_days",
    "longest_overdue_days": "longest_overdue_period_days",
    "other_monthly_debt_obligations_lkr": "other_monthly_debt_obligations_lkr",
    "other_monthly_debt_obligations": "other_monthly_debt_obligations_lkr",
    "outstanding_guarantees_lkr": "outstanding_guarantees_lkr",
    "outstanding_guarantees": "outstanding_guarantees_lkr",
    "debt_guarantees": "debt_guarantees_or_obligations",
    "debt_guarantees_or_obligations": "debt_guarantees_or_obligations",
    "debt_service_available_revenue_lkr": "debt_service_available_revenue_lkr",
    "loan_interest_rate_pct": "loan_interest_rate_pct",
    "annual_interest_rate_pct": "loan_interest_rate_pct",
    "monthly_interest_cost_lkr": "monthly_interest_cost_lkr",
    "initial_financing_amount_lkr": "initial_financing_amount_lkr",
    "requested_loan_lkr": "initial_financing_amount_lkr",
    "loan_amount_lkr": "initial_financing_amount_lkr",
    "upcoming_large_repayment_notes": "upcoming_large_repayment_notes",
    "repayment_history_status": "repayment_history_status",

    # Capital & Liquid funds
    "available_starting_capital_lkr": "available_starting_capital_lkr",
    "available_capital_lkr": "available_starting_capital_lkr",
    "starting_capital": "available_starting_capital_lkr",
    "cash_available_operations": "current_cash_reserve_lkr",
    "current_cash_reserve_lkr": "current_cash_reserve_lkr",
    "cash_reserve_after_startup": "remaining_cash_reserves_after_setup_lkr",
    "remaining_cash_reserves_after_setup_lkr": "remaining_cash_reserves_after_setup_lkr",
    "initial_setup_expenditure_lkr": "initial_setup_expenditure_lkr",
    "initial_setup_expenditure": "initial_setup_expenditure_lkr",
    "capital_includes_loan": "capital_includes_loan",
    "other_mandatory_monthly_obligations_lkr": "other_mandatory_monthly_obligations_lkr",
    "other_mandatory_obligations": "other_mandatory_monthly_obligations_lkr",

    # Revenue & Market
    "monthly_sales_revenue": "monthly_revenue_lkr",
    "monthly_revenue_lkr": "monthly_revenue_lkr",
    "projected_revenue_lkr": "monthly_revenue_lkr",
    "expected_or_actual_monthly_sales_lkr": "monthly_revenue_lkr",
    "monthly_customer_count": "monthly_customer_count",
    "average_transaction_value_lkr": "average_transaction_value_lkr",
    "average_transaction_value": "average_transaction_value_lkr",
    "sales_trend_3_6m": "sales_trend_3_6m",
    "demand_evidence_type": "demand_evidence",
    "customer_demand_evidence": "demand_evidence",
    "demand_evidence": "demand_evidence",
    "direct_competitors_count": "direct_competitors_count",
    "competitor_count": "direct_competitors_count",
    "competitor_pricing_vs_business": "competitor_pricing_vs_business",
    "largest_customer_sales_share_pct": "largest_customer_sales_share_pct",
    "customer_concentration_pct": "largest_customer_sales_share_pct",
    "seasonal_demand_variation_pct": "seasonal_demand_variation_pct",
    "customer_retention_rate_pct": "customer_retention_rate_pct",
    "price_adjustment_flexibility": "price_adjustment_flexibility",
    "monthly_marketing_budget_lkr": "monthly_marketing_budget_lkr",
    "marketing_budget_lkr": "monthly_marketing_budget_lkr",

    # Costs & Inflation
    "monthly_fixed_costs": "fixed_monthly_costs_lkr",
    "fixed_monthly_costs_lkr": "fixed_monthly_costs_lkr",
    "monthly_budget_lkr": "fixed_monthly_costs_lkr",
    "monthly_variable_costs": "variable_monthly_costs_lkr",
    "variable_monthly_costs_lkr": "variable_monthly_costs_lkr",
    "main_materials_monthly_cost_lkr": "main_materials_monthly_cost_lkr",
    "supplier_price_change_past_3_6m_pct": "supplier_price_change_past_3_6m_pct",
    "recent_supplier_price_increase_pct": "supplier_price_change_past_3_6m_pct",
    "expected_supplier_price_increase_3_6m_pct": "expected_supplier_price_increase_3_6m_pct",
    "expected_cost_increase_pct": "expected_supplier_price_increase_3_6m_pct",
    "imported_inputs_pct": "imported_inputs_pct",
    "imported_input_dependency_pct": "imported_inputs_pct",
    "imported_materials_exposure": "imported_materials_exposure",
    "imported_input_exposure": "imported_materials_exposure",
    "foreign_currency_exposure": "foreign_currency_exposure",
    "monthly_fuel_transport_cost_lkr": "monthly_fuel_transport_cost_lkr",
    "monthly_electricity_energy_cost_lkr": "monthly_electricity_energy_cost_lkr",
    "ability_to_increase_prices": "ability_to_increase_prices",
    "price_adjustment_ability": "ability_to_increase_prices",
    "cost_increase_pass_through_pct": "cost_increase_pass_through_pct",
    "alternative_suppliers_available": "alternative_suppliers_available",
    "largest_supplier_purchase_share_pct": "largest_supplier_purchase_share_pct",
    "external_inflation_source_notes": "external_inflation_source_notes",

    # Working Capital & Liquidity terms
    "accounts_receivable": "accounts_receivable_lkr",
    "accounts_receivable_lkr": "accounts_receivable_lkr",
    "customer_payment_delay_days": "customer_payment_delay_days",
    "accounts_payable": "accounts_payable_lkr",
    "accounts_payable_lkr": "accounts_payable_lkr",
    "supplier_payment_period_days": "supplier_payment_period_days",
    "working_capital_requirement_lkr": "working_capital_requirement_lkr",
    "expected_large_one_off_payments_3_6m_lkr": "expected_large_one_off_payments_3_6m_lkr",

    # Operations & Supply Chain
    "critical_suppliers_count": "critical_suppliers_count",
    "supplier_count": "critical_suppliers_count",
    "supplier_dependency_level": "supplier_dependency_level",
    "supplier_dependency_percentage": "largest_supplier_dependency_pct",
    "single_supplier_dependency_pct": "largest_supplier_dependency_pct",
    "largest_supplier_dependency_pct": "largest_supplier_dependency_pct",
    "alternative_suppliers_status": "alternative_suppliers_status",
    "supplier_lead_time_days": "supplier_lead_time_days",
    "delivery_delay_days": "delivery_delay_days",
    "supplier_delay_days": "supplier_delay_days",
    "supplier_delays_stockouts_3_6m": "supplier_delays_stockouts_3_6m",
    "startup_stockout_risk": "startup_stockout_risk",
    "inventory_coverage_days": "inventory_coverage_days",
    "inventory_days": "inventory_coverage_days",
    "total_employees_count": "total_employees_count",
    "available_staff_count": "total_employees_count",
    "critical_vacant_roles_count": "critical_vacant_roles_count",
    "backup_staff_available": "backup_staff_available",
    "staffing_availability": "staffing_availability",
    "essential_equipment_dependence": "essential_equipment_dependence",
    "backup_utilities_available": "backup_utilities_available",
    "expected_downtime_hours": "expected_downtime_hours",
    "business_continuity_plan_exists": "business_continuity_plan_exists",
    "logistics_delivery_dependence": "logistics_delivery_dependence",
    "capacity_utilization_pct": "capacity_utilization_pct",
    "growth_operational_constraints": "growth_operational_constraints",
    "operational_constraints": "operational_constraints",

    # Growth Action
    "growth_objective": "proposed_growth_action",
    "proposed_growth_action": "proposed_growth_action",
    "proposed_growth_budget_lkr": "proposed_growth_budget_lkr",
    "required_investment_lkr": "proposed_growth_budget_lkr",
}


@dataclass
class IntakeFieldMeta:
    """Schema definition for an intake field required or recommended for risk assessment."""
    field_key: str
    label: str
    category: str        # identity, credit_risk, market_risk, inflation_risk, liquidity_risk, operational_risk, growth_action
    data_type: str       # number, text, select, boolean
    required_for_full_readiness: bool
    description: str
    unit: Optional[str] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    options: Optional[List[str]] = None
    default_if_unknown: Optional[Any] = None
    risk_implication_if_missing: str = "Increases uncertainty penalty in composite risk evaluation."


MASTER_INTAKE_SCHEMA: Dict[str, IntakeFieldMeta] = {
    # -----------------------------------------------------------------------
    # 1. Identity & Scope
    # -----------------------------------------------------------------------
    "business_name": IntakeFieldMeta(
        field_key="business_name",
        label="Business Name",
        category="identity",
        data_type="text",
        required_for_full_readiness=True,
        description="Official registered name or proposed trading name."
    ),
    "registration_number": IntakeFieldMeta(
        field_key="registration_number",
        label="Business Registration Number (BRN / TIN)",
        category="identity",
        data_type="text",
        required_for_full_readiness=False,
        description="Official municipal registration or tax identifier if available."
    ),
    "district": IntakeFieldMeta(
        field_key="district",
        label="District",
        category="identity",
        data_type="select",
        required_for_full_readiness=True,
        description="Must be located within Sri Lanka Western Province (Colombo, Gampaha, Kalutara).",
        options=["Colombo", "Gampaha", "Kalutara"],
        risk_implication_if_missing="Non-Western Province entities are quarantined as OUT_OF_SCOPE."
    ),
    "business_category": IntakeFieldMeta(
        field_key="business_category",
        label="Business Sector / Industry Category",
        category="identity",
        data_type="select",
        required_for_full_readiness=True,
        description="Primary commercial activity sector.",
        options=[
            "Grocery/Mini-Mart", "Bakery", "Restaurant", "Retail", "Wholesale",
            "Manufacturing", "Transport and Logistics", "Food and Beverage",
            "Information Technology", "Construction", "Professional Services",
            "Tourism and Hospitality"
        ]
    ),
    "business_stage": IntakeFieldMeta(
        field_key="business_stage",
        label="Lifecycle Stage",
        category="identity",
        data_type="select",
        required_for_full_readiness=True,
        description="Current organizational development stage.",
        options=["New", "Early-stage", "Growth-stage", "Established"]
    ),

    # -----------------------------------------------------------------------
    # 2. Credit Risk Dimension (Canonical & Aliases)
    # -----------------------------------------------------------------------
    "outstanding_loan_balance_lkr": IntakeFieldMeta(
        field_key="outstanding_loan_balance_lkr",
        label="Outstanding Loan Balance",
        category="credit_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Current principal balance of commercial loans, microfinance, or institutional debt.",
        unit="LKR",
        min_value=0.0,
        risk_implication_if_missing="Assumed unstated debt status; requires debt clarification if other debt signals exist."
    ),
    "outstanding_debt_lkr": IntakeFieldMeta(
        field_key="outstanding_debt_lkr",
        label="Outstanding Loan Balance (Legacy)",
        category="credit_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Legacy alias for outstanding_loan_balance_lkr.",
        unit="LKR",
        min_value=0.0
    ),
    "outstanding_loan_balance": IntakeFieldMeta(
        field_key="outstanding_loan_balance",
        label="Outstanding Loan Balance (Frontend)",
        category="credit_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Frontend alias for outstanding_loan_balance_lkr.",
        unit="LKR",
        min_value=0.0
    ),
    "initial_financing_amount_lkr": IntakeFieldMeta(
        field_key="initial_financing_amount_lkr",
        label="Initial Financing / Requested Loan Amount",
        category="credit_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Initial loan incurred or financing sought for enterprise setup.",
        unit="LKR",
        min_value=0.0
    ),
    "requested_loan_lkr": IntakeFieldMeta(
        field_key="requested_loan_lkr",
        label="Requested Loan Amount (Legacy)",
        category="credit_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Legacy alias for initial_financing_amount_lkr.",
        unit="LKR",
        min_value=0.0
    ),
    "monthly_loan_repayment_lkr": IntakeFieldMeta(
        field_key="monthly_loan_repayment_lkr",
        label="Monthly Debt Repayment Installment",
        category="credit_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Monthly principal and interest obligation due to lenders.",
        unit="LKR",
        min_value=0.0
    ),
    "monthly_debt_repayment_lkr": IntakeFieldMeta(
        field_key="monthly_debt_repayment_lkr",
        label="Monthly Debt Repayment (Legacy)",
        category="credit_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Legacy alias for monthly_loan_repayment_lkr.",
        unit="LKR",
        min_value=0.0
    ),
    "monthly_loan_repayment": IntakeFieldMeta(
        field_key="monthly_loan_repayment",
        label="Monthly Loan Repayment (Frontend)",
        category="credit_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Frontend alias for monthly_loan_repayment_lkr.",
        unit="LKR",
        min_value=0.0
    ),
    "repayment_overdue_status": IntakeFieldMeta(
        field_key="repayment_overdue_status",
        label="Repayment Delinquency / Overdue Status",
        category="credit_risk",
        data_type="select",
        required_for_full_readiness=False,
        description="Current delinquency status on loan repayments.",
        options=["Current", "No", "1-30 Days", "30+ Days", "60+ Days", "90+ Days", "Unknown"]
    ),
    "overdue_repayments": IntakeFieldMeta(
        field_key="overdue_repayments",
        label="Overdue Repayments (Frontend)",
        category="credit_risk",
        data_type="select",
        required_for_full_readiness=False,
        description="Frontend alias for repayment_overdue_status.",
        options=["No", "Current", "1-30 Days", "30+ Days", "Unknown"]
    ),
    "repayment_status": IntakeFieldMeta(
        field_key="repayment_status",
        label="Repayment Status (Frontend)",
        category="credit_risk",
        data_type="text",
        required_for_full_readiness=False,
        description="Frontend alias for repayment_overdue_status."
    ),
    "repayment_delay_days": IntakeFieldMeta(
        field_key="repayment_delay_days",
        label="Repayment Delay Days",
        category="credit_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Days past due on loan payments.",
        unit="Days",
        min_value=0.0,
        max_value=365.0
    ),
    "payment_delay_days": IntakeFieldMeta(
        field_key="payment_delay_days",
        label="Payment Delay Days (Legacy)",
        category="credit_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Legacy alias for repayment_delay_days.",
        unit="Days",
        min_value=0.0,
        max_value=365.0
    ),
    "debt_guarantees_or_obligations": IntakeFieldMeta(
        field_key="debt_guarantees_or_obligations",
        label="Existing Debt Guarantees / Contingent Obligations",
        category="credit_risk",
        data_type="text",
        required_for_full_readiness=False,
        description="Personal director guarantees, third-party liens, or secondary debt collateral."
    ),
    "debt_guarantees": IntakeFieldMeta(
        field_key="debt_guarantees",
        label="Debt Guarantees (Frontend)",
        category="credit_risk",
        data_type="text",
        required_for_full_readiness=False,
        description="Frontend alias for debt_guarantees_or_obligations."
    ),
    "monthly_interest_cost_lkr": IntakeFieldMeta(
        field_key="monthly_interest_cost_lkr",
        label="Monthly Interest Cost",
        category="credit_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Interest component of monthly debt service.",
        unit="LKR",
        min_value=0.0
    ),
    "annual_interest_rate_pct": IntakeFieldMeta(
        field_key="annual_interest_rate_pct",
        label="Annual Interest Rate (%)",
        category="credit_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Annual borrowing interest rate percentage.",
        unit="%",
        min_value=0.0,
        max_value=60.0
    ),
    "loan_interest_rate_pct": IntakeFieldMeta(
        field_key="loan_interest_rate_pct",
        label="Loan Interest Rate (%)",
        category="credit_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Annual nominal borrowing interest rate percentage.",
        unit="%",
        min_value=0.0,
        max_value=60.0,
        risk_implication_if_missing="Interest sensitivity cannot be reliably evaluated without borrowing rate."
    ),
    "total_overdue_amount_lkr": IntakeFieldMeta(
        field_key="total_overdue_amount_lkr",
        label="Total Overdue Amount (Arrears)",
        category="credit_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Total overdue loan principal and interest currently in arrears (LKR).",
        unit="LKR",
        min_value=0.0,
        risk_implication_if_missing="Overdue arrears exposure cannot be calculated; conditional baseline assumed."
    ),
    "longest_overdue_period_days": IntakeFieldMeta(
        field_key="longest_overdue_period_days",
        label="Longest Overdue Period (Days)",
        category="credit_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Maximum continuous days past due across all debt facilities.",
        unit="Days",
        min_value=0.0,
        max_value=730.0,
        risk_implication_if_missing="Delinquency severity cannot be confirmed."
    ),
    "overdue_payment_count_12m": IntakeFieldMeta(
        field_key="overdue_payment_count_12m",
        label="Overdue Payments in Past 12 Months",
        category="credit_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Count of missed or delayed monthly loan payments during the past 12 months.",
        unit="Incidents",
        min_value=0.0,
        max_value=12.0
    ),
    "other_monthly_debt_obligations_lkr": IntakeFieldMeta(
        field_key="other_monthly_debt_obligations_lkr",
        label="Other Monthly Debt Obligations",
        category="credit_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Monthly servicing for non-bank loans, equipment leases, or informal credit (LKR).",
        unit="LKR",
        min_value=0.0
    ),
    "outstanding_guarantees_lkr": IntakeFieldMeta(
        field_key="outstanding_guarantees_lkr",
        label="Outstanding Debt Guarantees / Contingent Liabilities",
        category="credit_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Monetary exposure of personal or cross-corporate loan guarantees (LKR).",
        unit="LKR",
        min_value=0.0
    ),
    "debt_service_available_revenue_lkr": IntakeFieldMeta(
        field_key="debt_service_available_revenue_lkr",
        label="Monthly Revenue Available for Debt Servicing",
        category="credit_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Verified operating cash surplus dedicated specifically to debt service (LKR).",
        unit="LKR",
        min_value=0.0
    ),
    "upcoming_large_repayment_notes": IntakeFieldMeta(
        field_key="upcoming_large_repayment_notes",
        label="Upcoming Large Repayment or Loan Maturity",
        category="credit_risk",
        data_type="text",
        required_for_full_readiness=False,
        description="Impending balloon installments, bullet principal repayments, or credit renewals."
    ),
    "repayment_history_status": IntakeFieldMeta(
        field_key="repayment_history_status",
        label="Repayment History Status",
        category="credit_risk",
        data_type="select",
        required_for_full_readiness=False,
        description="Historical debt repayment timeliness track record.",
        options=["On time", "Occasional delays", "Frequent delays", "Not applicable — new startup", "No history available", "Unknown"],
        risk_implication_if_missing="Missing credit track record leaves default history unconfirmed."
    ),

    # -----------------------------------------------------------------------
    # 3. Market Risk Dimension
    # -----------------------------------------------------------------------
    "monthly_revenue_lkr": IntakeFieldMeta(
        field_key="monthly_revenue_lkr",
        label="Monthly Revenue",
        category="market_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Current verified or estimated monthly gross sales revenue.",
        unit="LKR",
        min_value=0.0
    ),
    "monthly_sales_revenue": IntakeFieldMeta(
        field_key="monthly_sales_revenue",
        label="Monthly Sales Revenue (Frontend)",
        category="market_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Frontend alias for monthly_revenue_lkr.",
        unit="LKR",
        min_value=0.0
    ),
    "monthly_customer_count": IntakeFieldMeta(
        field_key="monthly_customer_count",
        label="Monthly Customer Count",
        category="market_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Average number of active paying customers served per month.",
        unit="Customers",
        min_value=0.0
    ),
    "sales_growth_pct": IntakeFieldMeta(
        field_key="sales_growth_pct",
        label="Recent Sales Growth Trend (%)",
        category="market_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Observed or recent quarter-on-quarter sales revenue growth.",
        unit="%",
        min_value=-100.0,
        max_value=200.0
    ),
    "customer_concentration_pct": IntakeFieldMeta(
        field_key="customer_concentration_pct",
        label="Top-3 Customer Revenue Share (%)",
        category="market_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Percentage of sales revenue derived from top 3 buyers.",
        unit="%",
        min_value=0.0,
        max_value=100.0
    ),
    "demand_evidence": IntakeFieldMeta(
        field_key="demand_evidence",
        label="Demand Verification Evidence",
        category="market_risk",
        data_type="select",
        required_for_full_readiness=False,
        description="Basis for revenue and demand assumptions.",
        options=["contracts_signed", "pre_orders", "historical_sales", "market_survey", "estimate_only", "none", "Unknown"]
    ),
    "customer_demand_evidence": IntakeFieldMeta(
        field_key="customer_demand_evidence",
        label="Customer Demand Evidence (Frontend)",
        category="market_risk",
        data_type="select",
        required_for_full_readiness=False,
        description="Frontend alias for demand_evidence.",
        options=["Verified sales", "Customer survey", "Pre-orders", "Market research", "Owner estimate", "No evidence", "contracts_signed", "historical_sales", "Unknown"]
    ),
    "average_transaction_value_lkr": IntakeFieldMeta(
        field_key="average_transaction_value_lkr",
        label="Average Transaction Value",
        category="market_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Average revenue spend per customer transaction or order (LKR).",
        unit="LKR",
        min_value=0.0
    ),
    "sales_trend_3_6m": IntakeFieldMeta(
        field_key="sales_trend_3_6m",
        label="Sales Trend over Last 3–6 Months",
        category="market_risk",
        data_type="select",
        required_for_full_readiness=False,
        description="Recent historical sales direction for operating business.",
        options=["Increasing", "Stable", "Declining", "Not applicable — startup", "Unknown"]
    ),
    "direct_competitors_count": IntakeFieldMeta(
        field_key="direct_competitors_count",
        label="Number of Direct Competitors in Target Area",
        category="market_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Active direct commercial competitors within local market area.",
        unit="Competitors",
        min_value=0.0
    ),
    "competitor_pricing_vs_business": IntakeFieldMeta(
        field_key="competitor_pricing_vs_business",
        label="Competitor Pricing Comparison",
        category="market_risk",
        data_type="select",
        required_for_full_readiness=False,
        description="Relative price point of local competitor alternatives.",
        options=["Lower", "Similar", "Higher", "Unknown"]
    ),
    "largest_customer_sales_share_pct": IntakeFieldMeta(
        field_key="largest_customer_sales_share_pct",
        label="Sales Dependent on Largest Customer (%)",
        category="market_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Share of total revenue derived from the single highest-volume customer.",
        unit="%",
        min_value=0.0,
        max_value=100.0
    ),
    "seasonal_demand_variation_pct": IntakeFieldMeta(
        field_key="seasonal_demand_variation_pct",
        label="Expected Seasonal Demand Variation (%)",
        category="market_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Peak vs trough seasonal percentage swing in product demand.",
        unit="%",
        min_value=0.0,
        max_value=200.0
    ),
    "customer_retention_rate_pct": IntakeFieldMeta(
        field_key="customer_retention_rate_pct",
        label="Customer Retention / Repeat Purchase Rate (%)",
        category="market_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Proportion of clientele making regular repeat purchases.",
        unit="%",
        min_value=0.0,
        max_value=100.0
    ),
    "price_adjustment_flexibility": IntakeFieldMeta(
        field_key="price_adjustment_flexibility",
        label="Selling-Price Adjustment Flexibility",
        category="market_risk",
        data_type="select",
        required_for_full_readiness=False,
        description="Commercial flexibility to adjust selling prices without forfeiting customer volume.",
        options=["High", "Moderate", "Low", "None", "Unknown"]
    ),
    "monthly_marketing_budget_lkr": IntakeFieldMeta(
        field_key="monthly_marketing_budget_lkr",
        label="Expected Customer Acquisition / Marketing Budget",
        category="market_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Planned monthly expenditure on advertising, digital marketing, and promotions (LKR).",
        unit="LKR",
        min_value=0.0
    ),
    "demand_competition_notes": IntakeFieldMeta(
        field_key="demand_competition_notes",
        label="Competition & Market Dynamics Notes",
        category="market_risk",
        data_type="text",
        required_for_full_readiness=False,
        description="Notes on local competitor pricing, density, or market share."
    ),
    "competition_level": IntakeFieldMeta(
        field_key="competition_level",
        label="Market Competition & Price Pressure",
        category="market_risk",
        data_type="select",
        required_for_full_readiness=False,
        description="Intensity of competitor pricing and local substitutes.",
        options=["Low", "Medium", "High", "Unknown"]
    ),

    # -----------------------------------------------------------------------
    # 4. Inflation Risk Dimension
    # -----------------------------------------------------------------------
    "expected_cost_increase_pct": IntakeFieldMeta(
        field_key="expected_cost_increase_pct",
        label="Expected Input Cost Inflation (%)",
        category="inflation_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Anticipated 12-month percentage increase in key raw materials, energy, and labor.",
        unit="%",
        min_value=0.0,
        max_value=100.0
    ),
    "recent_supplier_price_increase_pct": IntakeFieldMeta(
        field_key="recent_supplier_price_increase_pct",
        label="Recent Supplier Price Increase (%)",
        category="inflation_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Observed price hikes from primary suppliers over recent quarters.",
        unit="%",
        min_value=0.0,
        max_value=200.0
    ),
    "imported_input_dependency_pct": IntakeFieldMeta(
        field_key="imported_input_dependency_pct",
        label="Imported Input / Fuel Dependency (%)",
        category="inflation_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Share of raw materials, fuel, or merchandise depending on foreign imports.",
        unit="%",
        min_value=0.0,
        max_value=100.0
    ),
    "imported_materials_exposure": IntakeFieldMeta(
        field_key="imported_materials_exposure",
        label="Imported Materials Exposure (Frontend)",
        category="inflation_risk",
        data_type="select",
        required_for_full_readiness=False,
        description="Frontend alias for imported_input_exposure.",
        options=["Low", "Moderate", "High", "Unknown"]
    ),
    "imported_input_exposure": IntakeFieldMeta(
        field_key="imported_input_exposure",
        label="Imported Input / Currency Exposure",
        category="inflation_risk",
        data_type="text",
        required_for_full_readiness=False,
        description="Exposure to foreign exchange volatility and import tariffs."
    ),
    "inflation_affected_categories": IntakeFieldMeta(
        field_key="inflation_affected_categories",
        label="Key Cost Categories Impacted by Inflation",
        category="inflation_risk",
        data_type="text",
        required_for_full_readiness=False,
        description="Identified expenditure items most vulnerable to price increases (e.g. utilities, flour, packaging)."
    ),
    "price_adjustment_ability": IntakeFieldMeta(
        field_key="price_adjustment_ability",
        label="Ability to Pass Cost Increases to Customers",
        category="inflation_risk",
        data_type="select",
        required_for_full_readiness=False,
        description="Pricing power to adjust end-user prices when costs rise.",
        options=["Full Cost Passthrough", "Partial Passthrough (Moderate)", "Inelastic / Fixed Prices (Low)", "Unknown"]
    ),
    "main_materials_monthly_cost_lkr": IntakeFieldMeta(
        field_key="main_materials_monthly_cost_lkr",
        label="Main Materials / Products Monthly Purchase Cost",
        category="inflation_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Estimated monthly procurement cost of essential raw materials or trading stock (LKR).",
        unit="LKR",
        min_value=0.0
    ),
    "supplier_price_change_past_3_6m_pct": IntakeFieldMeta(
        field_key="supplier_price_change_past_3_6m_pct",
        label="Supplier Price Changes over Past 3–6 Months (%)",
        category="inflation_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Observed historical vendor price increase percentage over the preceding quarter.",
        unit="%",
        min_value=-50.0,
        max_value=200.0,
        risk_implication_if_missing="Historical price trend missing; inflation indicators limited to current cost structure."
    ),
    "expected_supplier_price_increase_3_6m_pct": IntakeFieldMeta(
        field_key="expected_supplier_price_increase_3_6m_pct",
        label="Expected Supplier Price Increase over Next 3–6 Months (%)",
        category="inflation_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Anticipated supplier price increase percentage over the coming 3–6 months.",
        unit="%",
        min_value=-50.0,
        max_value=200.0
    ),
    "imported_inputs_pct": IntakeFieldMeta(
        field_key="imported_inputs_pct",
        label="Percentage of Major Inputs Purchased from Overseas (%)",
        category="inflation_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Proportion of essential raw materials or inventory imported from foreign suppliers.",
        unit="%",
        min_value=0.0,
        max_value=100.0
    ),
    "foreign_currency_exposure": IntakeFieldMeta(
        field_key="foreign_currency_exposure",
        label="Exposure to Foreign-Currency Purchases",
        category="inflation_risk",
        data_type="select",
        required_for_full_readiness=False,
        description="Sensitivity of procurement costs to foreign exchange (USD/LKR) fluctuations.",
        options=["None", "Low", "Moderate", "High", "Unknown"]
    ),
    "monthly_fuel_transport_cost_lkr": IntakeFieldMeta(
        field_key="monthly_fuel_transport_cost_lkr",
        label="Monthly Transport & Fuel Cost",
        category="inflation_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Monthly expenditure on logistics, commercial delivery, freight, and vehicular fuel (LKR).",
        unit="LKR",
        min_value=0.0
    ),
    "monthly_electricity_energy_cost_lkr": IntakeFieldMeta(
        field_key="monthly_electricity_energy_cost_lkr",
        label="Monthly Electricity & Energy Cost",
        category="inflation_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Monthly commercial electricity, LP gas, diesel generator, and energy utility expenditure (LKR).",
        unit="LKR",
        min_value=0.0
    ),
    "ability_to_increase_prices": IntakeFieldMeta(
        field_key="ability_to_increase_prices",
        label="Ability to Increase Selling Prices",
        category="inflation_risk",
        data_type="select",
        required_for_full_readiness=False,
        description="Flexibility to raise customer prices in response to wholesale cost increases.",
        options=["Easily", "Partially", "Difficult", "Unknown"]
    ),
    "cost_increase_pass_through_pct": IntakeFieldMeta(
        field_key="cost_increase_pass_through_pct",
        label="Estimated Input-Cost Pass-Through to Customers (%)",
        category="inflation_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Estimated percentage share of input-cost inflation that can be passed on to end buyers.",
        unit="%",
        min_value=0.0,
        max_value=100.0
    ),
    "alternative_suppliers_available": IntakeFieldMeta(
        field_key="alternative_suppliers_available",
        label="Availability of Alternative Suppliers",
        category="inflation_risk",
        data_type="select",
        required_for_full_readiness=False,
        description="Market availability of substitute vendors to counter price increases.",
        options=["Good", "Limited", "None", "Unknown"]
    ),
    "largest_supplier_purchase_share_pct": IntakeFieldMeta(
        field_key="largest_supplier_purchase_share_pct",
        label="Essential Purchases Dependent on Largest Supplier (%)",
        category="inflation_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Share of total critical input spending absorbed by the single largest supplier.",
        unit="%",
        min_value=0.0,
        max_value=100.0
    ),
    "external_inflation_source_notes": IntakeFieldMeta(
        field_key="external_inflation_source_notes",
        label="Source and Date of External Inflation / Price-Index Evidence",
        category="inflation_risk",
        data_type="text",
        required_for_full_readiness=False,
        description="Documentation reference and date of any external inflation index (e.g. CBSL CCPI, sector bulletin) used."
    ),

    # -----------------------------------------------------------------------
    # 5. Liquidity Risk Dimension
    # -----------------------------------------------------------------------
    "available_starting_capital_lkr": IntakeFieldMeta(
        field_key="available_starting_capital_lkr",
        label="Available Starting Capital",
        category="liquidity_risk",
        data_type="number",
        required_for_full_readiness=True,
        description="Original equity capital contributed at venture establishment.",
        unit="LKR",
        min_value=0.0
    ),
    "available_capital_lkr": IntakeFieldMeta(
        field_key="available_capital_lkr",
        label="Available Capital Reserves (Legacy)",
        category="liquidity_risk",
        data_type="number",
        required_for_full_readiness=True,
        description="Immediately accessible liquid capital reserves.",
        unit="LKR",
        min_value=0.0
    ),
    "current_cash_reserve_lkr": IntakeFieldMeta(
        field_key="current_cash_reserve_lkr",
        label="Current Cash Reserves for Operations",
        category="liquidity_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Immediately accessible cash in bank accounts or cash-in-hand dedicated to current operations.",
        unit="LKR",
        min_value=0.0
    ),
    "cash_available_operations": IntakeFieldMeta(
        field_key="cash_available_operations",
        label="Cash Available for Operations (Frontend)",
        category="liquidity_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Frontend alias for current_cash_reserve_lkr.",
        unit="LKR",
        min_value=0.0
    ),
    "cash_reserve_after_startup": IntakeFieldMeta(
        field_key="cash_reserve_after_startup",
        label="Post-Startup Emergency Cash Reserve",
        category="liquidity_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Emergency liquidity cushion preserved after initial setup expenditures.",
        unit="LKR",
        min_value=0.0
    ),
    "fixed_monthly_costs_lkr": IntakeFieldMeta(
        field_key="fixed_monthly_costs_lkr",
        label="Monthly Fixed Operating Costs",
        category="liquidity_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Inflexible recurring expenses: rent, core salaries, insurance, utilities.",
        unit="LKR",
        min_value=0.0
    ),
    "monthly_fixed_costs": IntakeFieldMeta(
        field_key="monthly_fixed_costs",
        label="Monthly Fixed Costs (Frontend)",
        category="liquidity_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Frontend alias for fixed_monthly_costs_lkr.",
        unit="LKR",
        min_value=0.0
    ),
    "variable_monthly_costs_lkr": IntakeFieldMeta(
        field_key="variable_monthly_costs_lkr",
        label="Monthly Variable Operating Costs",
        category="liquidity_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Costs varying with production or sales volume: inventory replenishment, packaging, commissions.",
        unit="LKR",
        min_value=0.0
    ),
    "monthly_variable_costs": IntakeFieldMeta(
        field_key="monthly_variable_costs",
        label="Monthly Variable Costs (Frontend)",
        category="liquidity_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Frontend alias for variable_monthly_costs_lkr.",
        unit="LKR",
        min_value=0.0
    ),
    "monthly_budget_lkr": IntakeFieldMeta(
        field_key="monthly_budget_lkr",
        label="Monthly Operating Budget (Legacy)",
        category="liquidity_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Total recurring monthly operating budget.",
        unit="LKR",
        min_value=0.0
    ),
    "accounts_receivable_lkr": IntakeFieldMeta(
        field_key="accounts_receivable_lkr",
        label="Outstanding Accounts Receivable",
        category="liquidity_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Total uncollected customer invoices currently due.",
        unit="LKR",
        min_value=0.0
    ),
    "accounts_receivable": IntakeFieldMeta(
        field_key="accounts_receivable",
        label="Accounts Receivable (Frontend)",
        category="liquidity_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Frontend alias for accounts_receivable_lkr.",
        unit="LKR",
        min_value=0.0
    ),
    "accounts_payable_lkr": IntakeFieldMeta(
        field_key="accounts_payable_lkr",
        label="Outstanding Accounts Payable",
        category="liquidity_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Total pending payments due to suppliers or vendors.",
        unit="LKR",
        min_value=0.0
    ),
    "accounts_payable": IntakeFieldMeta(
        field_key="accounts_payable",
        label="Accounts Payable (Frontend)",
        category="liquidity_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Frontend alias for accounts_payable_lkr.",
        unit="LKR",
        min_value=0.0
    ),
    "capital_runway_months": IntakeFieldMeta(
        field_key="capital_runway_months",
        label="Estimated Cash Runway",
        category="liquidity_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Months enterprise can operate before exhausting available cash buffer.",
        unit="Months",
        min_value=0.0,
        max_value=120.0
    ),
    "capital_includes_loan": IntakeFieldMeta(
        field_key="capital_includes_loan",
        label="Whether Available Capital Includes Loan Financing",
        category="liquidity_risk",
        data_type="select",
        required_for_full_readiness=False,
        description="Confirmation of whether stated available capital already embeds loan borrowings.",
        options=["Yes", "No", "Unknown"],
        risk_implication_if_missing="Unclear funding composition creates risk of double-counting borrowed money."
    ),
    "initial_setup_expenditure_lkr": IntakeFieldMeta(
        field_key="initial_setup_expenditure_lkr",
        label="Initial Setup Expenditure",
        category="liquidity_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Non-recurring capital expenditure spent on site fit-out, machinery, or licensing (LKR).",
        unit="LKR",
        min_value=0.0
    ),
    "remaining_cash_reserves_after_setup_lkr": IntakeFieldMeta(
        field_key="remaining_cash_reserves_after_setup_lkr",
        label="Remaining Cash Reserves After Setup",
        category="liquidity_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Actual unencumbered cash cushion remaining after initial startup expenditures (LKR).",
        unit="LKR",
        min_value=0.0,
        risk_implication_if_missing="Cash runway cannot be reliably calculated without actual remaining cash cushion."
    ),
    "other_mandatory_monthly_obligations_lkr": IntakeFieldMeta(
        field_key="other_mandatory_monthly_obligations_lkr",
        label="Other Mandatory Monthly Financial Obligations",
        category="liquidity_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Statutory EPF/ETF, taxes, commercial vehicle leasing, or mandatory insurance outlays (LKR).",
        unit="LKR",
        min_value=0.0
    ),
    "customer_payment_delay_days": IntakeFieldMeta(
        field_key="customer_payment_delay_days",
        label="Customer Payment Delay / Receivable Period (Days)",
        category="liquidity_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Average credit duration extended to buyers before payment receipt.",
        unit="Days",
        min_value=0.0,
        max_value=365.0
    ),
    "supplier_payment_period_days": IntakeFieldMeta(
        field_key="supplier_payment_period_days",
        label="Supplier Payment Period / Trade Credit Terms (Days)",
        category="liquidity_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Trade credit grace window granted by suppliers before invoice settlement.",
        unit="Days",
        min_value=0.0,
        max_value=365.0
    ),
    "working_capital_requirement_lkr": IntakeFieldMeta(
        field_key="working_capital_requirement_lkr",
        label="Inventory or Working-Capital Requirement Buffer",
        category="liquidity_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Estimated operating liquidity required to bridge receivable and inventory holding cycles (LKR).",
        unit="LKR",
        min_value=0.0
    ),
    "expected_large_one_off_payments_3_6m_lkr": IntakeFieldMeta(
        field_key="expected_large_one_off_payments_3_6m_lkr",
        label="Expected Large One-Off Payments in Next 3–6 Months",
        category="liquidity_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Anticipated lumpy disbursements such as annual tax settlements or license renewals (LKR).",
        unit="LKR",
        min_value=0.0
    ),

    # -----------------------------------------------------------------------
    # 6. Operational Risk Dimension
    # -----------------------------------------------------------------------
    "available_staff_count": IntakeFieldMeta(
        field_key="available_staff_count",
        label="Current Staff Headcount",
        category="operational_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Number of current dedicated full-time and part-time workers.",
        unit="Personnel",
        min_value=0.0,
        max_value=500.0
    ),
    "staffing_availability": IntakeFieldMeta(
        field_key="staffing_availability",
        label="Staffing Availability (Frontend)",
        category="operational_risk",
        data_type="select",
        required_for_full_readiness=False,
        description="Adequacy of current workforce to meet operational requirements.",
        options=["Adequate", "Constrained", "Shortage", "Unknown"]
    ),
    "main_suppliers_list": IntakeFieldMeta(
        field_key="main_suppliers_list",
        label="Primary Commercial Suppliers",
        category="operational_risk",
        data_type="text",
        required_for_full_readiness=False,
        description="Names of key external vendors and suppliers."
    ),
    "supplier_count": IntakeFieldMeta(
        field_key="supplier_count",
        label="Active Suppliers Count",
        category="operational_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Number of regular external vendors and suppliers.",
        unit="Vendors",
        min_value=0.0,
        max_value=100.0
    ),
    "supplier_dependency_percentage": IntakeFieldMeta(
        field_key="supplier_dependency_percentage",
        label="Single Primary Supplier Dependency (%)",
        category="operational_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Percentage of total raw materials purchased from the single largest supplier.",
        unit="%",
        min_value=0.0,
        max_value=100.0
    ),
    "supplier_dependency_level": IntakeFieldMeta(
        field_key="supplier_dependency_level",
        label="Supplier Dependency Level (Frontend)",
        category="operational_risk",
        data_type="select",
        required_for_full_readiness=False,
        description="Frontend alias for supplier_dependency_percentage.",
        options=["Low", "Moderate", "High", "Unknown"]
    ),
    "single_supplier_dependency_pct": IntakeFieldMeta(
        field_key="single_supplier_dependency_pct",
        label="Single Supplier Dependency (Legacy)",
        category="operational_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Legacy alias for supplier_dependency_percentage.",
        unit="%",
        min_value=0.0,
        max_value=100.0
    ),
    "supplier_delay_days": IntakeFieldMeta(
        field_key="supplier_delay_days",
        label="Average Supplier Delivery Delay (Days)",
        category="operational_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Average delivery lag experienced on critical purchase orders.",
        unit="Days",
        min_value=0.0,
        max_value=90.0
    ),
    "delivery_delay_days": IntakeFieldMeta(
        field_key="delivery_delay_days",
        label="Delivery Delay Days (Frontend)",
        category="operational_risk",
        data_type="select",
        required_for_full_readiness=False,
        description="Frontend alias for supplier_delay_days.",
        options=["1-3 days", "3-5 days", "7-14 days", "14+ days", "Unknown"]
    ),
    "inventory_days": IntakeFieldMeta(
        field_key="inventory_days",
        label="Inventory Holding Buffer (Days)",
        category="operational_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Average inventory stock buffer held to absorb supply interruptions.",
        unit="Days",
        min_value=0.0,
        max_value=180.0
    ),
    "critical_suppliers_count": IntakeFieldMeta(
        field_key="critical_suppliers_count",
        label="Number of Critical Suppliers",
        category="operational_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Count of essential vendors whose failure would immediately halt operations.",
        unit="Suppliers",
        min_value=0.0
    ),
    "largest_supplier_dependency_pct": IntakeFieldMeta(
        field_key="largest_supplier_dependency_pct",
        label="Essential Inventory Dependent on Largest Supplier (%)",
        category="operational_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Percentage share of core inventory or inputs sourced from single largest supplier.",
        unit="%",
        min_value=0.0,
        max_value=100.0,
        risk_implication_if_missing="Single-supplier bottleneck exposure cannot be evaluated."
    ),
    "alternative_suppliers_status": IntakeFieldMeta(
        field_key="alternative_suppliers_status",
        label="Availability of Alternative Suppliers",
        category="operational_risk",
        data_type="select",
        required_for_full_readiness=False,
        description="Ease and speed of onboarding replacement suppliers if existing vendor fails.",
        options=["Good", "Limited", "None", "Unknown"]
    ),
    "supplier_lead_time_days": IntakeFieldMeta(
        field_key="supplier_lead_time_days",
        label="Typical Supplier Delivery Lead Time (Days)",
        category="operational_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Average days elapsed from purchase order placement to receipt at facility.",
        unit="Days",
        min_value=0.0,
        max_value=180.0
    ),
    "supplier_delays_stockouts_3_6m": IntakeFieldMeta(
        field_key="supplier_delays_stockouts_3_6m",
        label="Supplier Delays or Stock-Out Incidents in Past 3–6 Months",
        category="operational_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Number of stock-out or delayed replenishment incidents experienced during last quarter.",
        unit="Incidents",
        min_value=0.0
    ),
    "startup_stockout_risk": IntakeFieldMeta(
        field_key="startup_stockout_risk",
        label="Expected Stock-Out Frequency / Risk for Startup",
        category="operational_risk",
        data_type="select",
        required_for_full_readiness=False,
        description="Anticipated inventory stock-out risk based on planned supplier SLAs.",
        options=["Low", "Medium", "High", "Unknown"]
    ),
    "inventory_coverage_days": IntakeFieldMeta(
        field_key="inventory_coverage_days",
        label="Inventory Coverage Buffer (Days)",
        category="operational_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Days of average customer sales supported by current inventory buffer.",
        unit="Days",
        min_value=0.0,
        max_value=180.0
    ),
    "total_employees_count": IntakeFieldMeta(
        field_key="total_employees_count",
        label="Total Active Employees Headcount",
        category="operational_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Current full-time and part-time employee headcount.",
        unit="Personnel",
        min_value=0.0
    ),
    "critical_vacant_roles_count": IntakeFieldMeta(
        field_key="critical_vacant_roles_count",
        label="Critical Vacant Roles Count",
        category="operational_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Unfilled critical positions essential for normal daily operations.",
        unit="Roles",
        min_value=0.0
    ),
    "backup_staff_available": IntakeFieldMeta(
        field_key="backup_staff_available",
        label="Availability of Backup Staff for Critical Tasks",
        category="operational_risk",
        data_type="select",
        required_for_full_readiness=False,
        description="Availability of cross-trained backup staff able to cover essential roles during absences.",
        options=["Yes", "Partial", "No", "Unknown"]
    ),
    "essential_equipment_dependence": IntakeFieldMeta(
        field_key="essential_equipment_dependence",
        label="Dependence on Essential Equipment or Technology",
        category="operational_risk",
        data_type="select",
        required_for_full_readiness=False,
        description="Operational dependency on specialized machinery, POS systems, or cloud services.",
        options=["Critical", "Moderate", "Low", "None"]
    ),
    "backup_utilities_available": IntakeFieldMeta(
        field_key="backup_utilities_available",
        label="Availability of Backup Equipment, Power & Connectivity",
        category="operational_risk",
        data_type="select",
        required_for_full_readiness=False,
        description="Availability of backup generators, secondary internet, or reserve equipment.",
        options=["Yes", "Partial", "No", "Unknown"]
    ),
    "expected_downtime_hours": IntakeFieldMeta(
        field_key="expected_downtime_hours",
        label="Expected Downtime / Interruption Duration (Hours)",
        category="operational_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Estimated operational downtime in hours to restore service after an outage.",
        unit="Hours",
        min_value=0.0
    ),
    "business_continuity_plan_exists": IntakeFieldMeta(
        field_key="business_continuity_plan_exists",
        label="Existence of Documented Contingency / Business Continuity Plan",
        category="operational_risk",
        data_type="select",
        required_for_full_readiness=False,
        description="Whether a written business continuity, emergency response, and backup vendor plan exists.",
        options=["Yes", "No", "Unknown"]
    ),
    "logistics_delivery_dependence": IntakeFieldMeta(
        field_key="logistics_delivery_dependence",
        label="Dependence on External Delivery & Logistics Providers",
        category="operational_risk",
        data_type="select",
        required_for_full_readiness=False,
        description="Reliance on third-party couriers or transport services to deliver orders.",
        options=["High", "Moderate", "Low", "None"]
    ),
    "capacity_utilization_pct": IntakeFieldMeta(
        field_key="capacity_utilization_pct",
        label="Expected Operating Capacity Utilization (%)",
        category="operational_risk",
        data_type="number",
        required_for_full_readiness=False,
        description="Ratio of current output to maximum sustainable operational capacity.",
        unit="%",
        min_value=0.0,
        max_value=100.0
    ),
    "growth_operational_constraints": IntakeFieldMeta(
        field_key="growth_operational_constraints",
        label="Operational Constraints from Proposed Growth Action",
        category="operational_risk",
        data_type="text",
        required_for_full_readiness=False,
        description="Key capacity bottlenecks, staffing constraints, or logistics barriers introduced by expansion."
    ),
    "operational_constraints": IntakeFieldMeta(
        field_key="operational_constraints",
        label="Primary Operational Bottleneck",
        category="operational_risk",
        data_type="select",
        required_for_full_readiness=False,
        description="Key capacity or operational constraint limiting current output.",
        options=["None", "Specialized Equipment Bottleneck", "Storage / Warehouse Space", "Staff Skill Shortage", "Transport & Delivery Delay", "Unknown"]
    ),

    # -----------------------------------------------------------------------
    # 7. Proposed Growth Action
    # -----------------------------------------------------------------------
    "proposed_growth_action": IntakeFieldMeta(
        field_key="proposed_growth_action",
        label="Proposed Growth Action",
        category="growth_action",
        data_type="select",
        required_for_full_readiness=True,
        description="Proposed business lifecycle action to be risk-assessed.",
        options=["start", "expand", "organic_expansion", "Open Branch", "Increase Inventory", "Add Alternative Supplier", "Procure Machinery", "Digital Platform Launch", "Unknown"]
    ),
    "growth_objective": IntakeFieldMeta(
        field_key="growth_objective",
        label="Growth Objective (Frontend)",
        category="growth_action",
        data_type="select",
        required_for_full_readiness=False,
        description="Frontend alias for proposed_growth_action.",
        options=["organic_expansion", "start", "expand", "Open Branch", "Increase Inventory", "Procure Machinery", "Digital Platform Launch", "Unknown"]
    ),
    "proposed_growth_budget_lkr": IntakeFieldMeta(
        field_key="proposed_growth_budget_lkr",
        label="Estimated Growth Investment Outlay",
        category="growth_action",
        data_type="number",
        required_for_full_readiness=False,
        description="Upfront capital outlay required to implement the proposed action.",
        unit="LKR",
        min_value=0.0
    ),
    "required_investment_lkr": IntakeFieldMeta(
        field_key="required_investment_lkr",
        label="Required Investment (Legacy)",
        category="growth_action",
        data_type="number",
        required_for_full_readiness=False,
        description="Legacy alias for proposed_growth_budget_lkr.",
        unit="LKR",
        min_value=0.0
    ),
    "additional_monthly_cost_lkr": IntakeFieldMeta(
        field_key="additional_monthly_cost_lkr",
        label="Additional Recurring Monthly Cost",
        category="growth_action",
        data_type="number",
        required_for_full_readiness=False,
        description="New recurring monthly expenses added after implementing the growth action.",
        unit="LKR",
        min_value=0.0
    ),
    "required_staff_count": IntakeFieldMeta(
        field_key="required_staff_count",
        label="Additional Staff Headcount Needed",
        category="growth_action",
        data_type="number",
        required_for_full_readiness=False,
        description="New workers needed to implement the proposed action.",
        unit="Personnel",
        min_value=0.0,
        max_value=100.0
    ),
}


@dataclass
class ProvenanceFact:
    """Represents a discrete verified or declared fact with explicit provenance tracking."""
    field_key: str
    value: Any
    provenance: str       # EXTRACTED_FROM_PLAN, USER_DECLARED, INDEPENDENTLY_VERIFIED, SIMULATED
    status: str           # VERIFIED, USER_PROVIDED, MISSING, UNKNOWN
    recorded_at: str      # ISO timestamp
    source_reference: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class DynamicIntakeSchemaService:
    """Compares extracted plan facts against the 5-dimension risk schema and builds a dynamic intake form."""

    @staticmethod
    def analyze_missing_fields(
        extracted_facts: Dict[str, Any],
        existing_profile: Optional[Dict[str, Any]] = None
    ) -> Tuple[Dict[str, ProvenanceFact], List[Dict[str, Any]], str]:
        now_iso = datetime.now(timezone.utc).isoformat()
        available_facts: Dict[str, ProvenanceFact] = {}
        missing_form_schema: List[Dict[str, Any]] = []

        combined_source = {}
        if existing_profile:
            combined_source.update(existing_profile)
        if extracted_facts:
            combined_source.update(extracted_facts)

        missing_required_count = 0

        for key, meta in MASTER_INTAKE_SCHEMA.items():
            raw_entry = combined_source.get(key)
            if isinstance(raw_entry, dict) and "value" in raw_entry:
                val = raw_entry["value"]
                entry_prov = raw_entry.get("provenance")
                entry_stat = raw_entry.get("status")
            else:
                val = raw_entry
                entry_prov = None
                entry_stat = None
            
            has_val = val is not None and val != "" and val != "Unknown" and val != "Not available" and val != "N/A"

            if has_val:
                provenance = entry_prov or (PROVENANCE_EXTRACTED if key in extracted_facts else PROVENANCE_USER_DECLARED)
                status = entry_stat or ("VERIFIED" if provenance == PROVENANCE_INDEPENDENTLY_VERIFIED else "USER_PROVIDED")
                available_facts[key] = ProvenanceFact(
                    field_key=key,
                    value=val,
                    provenance=provenance,
                    status=status,
                    recorded_at=now_iso,
                    source_reference="Business Plan Document" if provenance == PROVENANCE_EXTRACTED else "Database Profile"
                )
            else:
                if meta.required_for_full_readiness:
                    missing_required_count += 1

                missing_form_schema.append({
                    "field_key": meta.field_key,
                    "label": meta.label,
                    "category": meta.category,
                    "data_type": meta.data_type,
                    "required_for_full_readiness": meta.required_for_full_readiness,
                    "description": meta.description,
                    "unit": meta.unit,
                    "min_value": meta.min_value,
                    "max_value": meta.max_value,
                    "options": meta.options,
                    "default_if_unknown": meta.default_if_unknown,
                    "risk_implication_if_missing": meta.risk_implication_if_missing,
                    "current_status": "MISSING" if val is None or val == "" else "DECLARED_UNKNOWN"
                })

        if missing_required_count == 0:
            sufficiency = "SUFFICIENT"
        elif missing_required_count <= 2:
            sufficiency = "PARTIAL"
        else:
            sufficiency = "INSUFFICIENT"

        return available_facts, missing_form_schema, sufficiency

    @staticmethod
    def validate_intake_payload(
        intake_submission: Dict[str, Any]
    ) -> Tuple[bool, Dict[str, Any], List[str]]:
        cleaned_data = {}
        errors = []
        now_iso = datetime.now(timezone.utc).isoformat()

        for raw_key, raw_val in intake_submission.items():
            key = CANONICAL_FIELD_ALIASES.get(raw_key, raw_key)
            if key not in MASTER_INTAKE_SCHEMA and raw_key not in MASTER_INTAKE_SCHEMA:
                continue

            meta = MASTER_INTAKE_SCHEMA.get(key) or MASTER_INTAKE_SCHEMA[raw_key]

            # Detect unknown / missing values without converting to false zero or low risk
            raw_val_str = str(raw_val).strip() if raw_val is not None else ""
            if raw_val is None or raw_val_str.lower() in [
                "unknown", "not available", "n/a", "not sure", "none", "null", "undefined", ""
            ]:
                entry = {
                    "value": None,
                    "provenance": PROVENANCE_USER_DECLARED,
                    "status": "DECLARED_UNKNOWN",
                    "recorded_at": now_iso
                }
                cleaned_data[key] = entry
                cleaned_data[raw_key] = entry
                continue

            # Special parsing for string-based overdue repayments / delinquency
            if key in ("repayment_overdue_status", "repayment_delay_days", "payment_delay_days") or raw_key in ("repayment_overdue_status", "repayment_delay_days", "payment_delay_days"):
                s = str(raw_val).strip()
                s_lower = s.lower()
                delay_days = 0.0
                status_label = "Current"
                if "30+" in s_lower or "30 plus" in s_lower:
                    delay_days = 30.0
                    status_label = "30+ Days Overdue"
                elif "60+" in s_lower:
                    delay_days = 60.0
                    status_label = "60+ Days Overdue"
                elif "90+" in s_lower:
                    delay_days = 90.0
                    status_label = "90+ Days Overdue"
                elif "1-30" in s_lower:
                    delay_days = 15.0
                    status_label = "1-30 Days Overdue"
                elif s_lower in ("no", "current", "none", "0"):
                    delay_days = 0.0
                    status_label = "Current"
                else:
                    try:
                        delay_days = float(s)
                        status_label = f"{int(delay_days)} Days Overdue" if delay_days > 0 else "Current"
                    except (ValueError, TypeError):
                        status_label = s

                delay_entry = {
                    "value": delay_days,
                    "provenance": PROVENANCE_USER_CONFIRMED,
                    "status": "USER_PROVIDED",
                    "recorded_at": now_iso
                }
                status_entry = {
                    "value": status_label,
                    "provenance": PROVENANCE_USER_CONFIRMED,
                    "status": "USER_PROVIDED",
                    "recorded_at": now_iso
                }
                cleaned_data["repayment_delay_days"] = delay_entry
                cleaned_data["payment_delay_days"] = delay_entry
                cleaned_data["repayment_overdue_status"] = status_entry
                cleaned_data["overdue_repayments"] = status_entry
                cleaned_data["repayment_status"] = status_entry
                continue

            # Special parsing for supplier delivery delay options
            if key in ("supplier_delay_days", "delivery_delay_days") or raw_key in ("supplier_delay_days", "delivery_delay_days"):
                s = str(raw_val).strip()
                days = 5.0
                if "1-3" in s:
                    days = 2.0
                elif "3-5" in s:
                    days = 4.0
                elif "7-14" in s:
                    days = 10.0
                elif "14+" in s or ">" in s:
                    days = 15.0
                else:
                    try:
                        days = float(s)
                    except (ValueError, TypeError):
                        days = 5.0
                delay_entry = {
                    "value": days,
                    "provenance": PROVENANCE_USER_CONFIRMED,
                    "status": "USER_PROVIDED",
                    "recorded_at": now_iso
                }
                cleaned_data["supplier_delay_days"] = delay_entry
                cleaned_data["delivery_delay_days"] = {
                    "value": s,
                    "provenance": PROVENANCE_USER_CONFIRMED,
                    "status": "USER_PROVIDED",
                    "recorded_at": now_iso
                }
                continue

            # Special parsing for supplier dependency options
            if key in ("supplier_dependency_percentage", "supplier_dependency_level") or raw_key in ("supplier_dependency_percentage", "supplier_dependency_level"):
                s = str(raw_val).strip()
                pct = 50.0
                if s == "Low":
                    pct = 25.0
                elif s == "Moderate":
                    pct = 50.0
                elif s == "High":
                    pct = 80.0
                else:
                    try:
                        pct = float(s)
                    except (ValueError, TypeError):
                        pct = 50.0
                pct_entry = {
                    "value": pct,
                    "provenance": PROVENANCE_USER_CONFIRMED,
                    "status": "USER_PROVIDED",
                    "recorded_at": now_iso
                }
                cleaned_data["supplier_dependency_percentage"] = pct_entry
                cleaned_data["supplier_dependency_level"] = {
                    "value": s,
                    "provenance": PROVENANCE_USER_CONFIRMED,
                    "status": "USER_PROVIDED",
                    "recorded_at": now_iso
                }
                if "largest_supplier_dependency_pct" not in cleaned_data:
                    cleaned_data["largest_supplier_dependency_pct"] = pct_entry
                continue

            # Special parsing for imported input exposure options
            if key in ("imported_input_exposure", "imported_materials_exposure") or raw_key in ("imported_input_exposure", "imported_materials_exposure"):
                s = str(raw_val).strip()
                pct = 40.0
                if s == "Low":
                    pct = 15.0
                elif s == "Moderate":
                    pct = 40.0
                elif s == "High":
                    pct = 75.0
                else:
                    try:
                        pct = float(s)
                    except (ValueError, TypeError):
                        pct = 40.0
                pct_entry = {
                    "value": pct,
                    "provenance": PROVENANCE_USER_CONFIRMED,
                    "status": "USER_PROVIDED",
                    "recorded_at": now_iso
                }
                cleaned_data["imported_input_dependency_pct"] = pct_entry
                cleaned_data["imported_input_exposure"] = {
                    "value": s,
                    "provenance": PROVENANCE_USER_CONFIRMED,
                    "status": "USER_PROVIDED",
                    "recorded_at": now_iso
                }
                cleaned_data["imported_materials_exposure"] = {
                    "value": s,
                    "provenance": PROVENANCE_USER_CONFIRMED,
                    "status": "USER_PROVIDED",
                    "recorded_at": now_iso
                }
                if "imported_inputs_pct" not in cleaned_data:
                    cleaned_data["imported_inputs_pct"] = pct_entry
                continue

            # Standard numeric fields
            if meta.data_type == "number":
                try:
                    num_val = float(raw_val)
                    if meta.min_value is not None and num_val < meta.min_value:
                        errors.append(f"{meta.label}: Value ({num_val}) cannot be less than {meta.min_value}.")
                    if meta.max_value is not None and num_val > meta.max_value:
                        errors.append(f"{meta.label}: Value ({num_val}) cannot exceed {meta.max_value}.")
                    entry = {
                        "value": num_val,
                        "provenance": PROVENANCE_USER_CONFIRMED,
                        "status": "USER_PROVIDED",
                        "recorded_at": now_iso
                    }
                    cleaned_data[key] = entry
                    cleaned_data[raw_key] = entry
                except (ValueError, TypeError):
                    errors.append(f"{meta.label}: Must be a valid numeric value or 'Unknown'.")

            elif meta.data_type == "select":
                str_val = str(raw_val).strip()
                entry = {
                    "value": str_val,
                    "provenance": PROVENANCE_USER_CONFIRMED,
                    "status": "USER_PROVIDED",
                    "recorded_at": now_iso
                }
                cleaned_data[key] = entry
                cleaned_data[raw_key] = entry

            else:
                str_val = str(raw_val).strip()
                entry = {
                    "value": str_val,
                    "provenance": PROVENANCE_USER_CONFIRMED,
                    "status": "USER_PROVIDED",
                    "recorded_at": now_iso
                }
                cleaned_data[key] = entry
                cleaned_data[raw_key] = entry

        is_valid = len(errors) == 0
        return is_valid, cleaned_data, errors

    @classmethod
    def build_dynamic_intake_request(cls, plan: Any) -> Dict[str, Any]:
        """Constructs dynamic intake form tailored to missing facts from the plan across all 5 risk dimensions."""
        if hasattr(plan, "to_dict"):
            plan_dict = plan.to_dict()
        elif isinstance(plan, dict):
            plan_dict = plan
        else:
            plan_dict = getattr(plan, "__dict__", {})

        available_facts, missing_form, sufficiency = cls.analyze_missing_fields(plan_dict)

        dimension_names = [
            "credit_risk",
            "market_risk",
            "inflation_risk",
            "liquidity_risk",
            "operational_risk"
        ]
        dimensions = {}
        for dim in dimension_names:
            dimensions[dim] = [f for f in missing_form if f.get("category") == dim]

        missing_count = len(missing_form)
        missing_prompt = f"Please provide {missing_count} missing risk fields or explicitly select 'Unknown' for fields without verified data."

        return {
            "business_name": plan_dict.get("business_name"),
            "district": plan_dict.get("district"),
            "evidence_sufficiency_status": sufficiency,
            "available_facts": {k: f.to_dict() if hasattr(f, "to_dict") else f for k, f in available_facts.items()},
            "dimensions": dimensions,
            "missing_fields": missing_form,
            "missing_fields_prompt": missing_prompt,
            "total_missing_fields": missing_count,
        }
