"""
Component 4: Stage 5 — Risk Feature Engineering.
Implements reproducible, leakage-free feature calculations for SME risk prediction
and growth action readiness evaluation in Sri Lanka's Western Province.

Features computed:
1. Liquidity Stress: Cash runway ratio, burn rate, operating margin, working capital ratio.
2. Debt Burden: Debt-service burden, debt-to-revenue ratio, debt-service coverage (DSCR).
3. Relationship Concentration: Herfindahl–Hirschman Index (HHI) for suppliers and customers,
   top-1 concentration share (CR1), active counterparty counts, payment delay metrics.
4. Growth Action Stress Interactions: Investment-to-cash ratio, additional-cost-to-revenue ratio,
   post-action cash runway, post-action net cash flow, capacity gap, staffing expansion ratio.

Strict Scientific Safeguards:
- Zero target leakage: Target labels (overall_risk_label, growth_readiness_label) and rule codes
  are strictly segregated into dedicated target columns (prefixed with 'target_').
- Zero division protection: All denominators protected by positive epsilons.
- Explicit Geographic Scope: Western Province (Colombo, Gampaha, Kalutara).
- Explicit Provenance Tracking: Marked as SIMULATED_SCENARIO; no merging with feasibility or invoice records.
"""

import os
import sys
import json
import re
from typing import Dict, Any, List, Sequence, Tuple, Optional, Union
import pandas as pd
import numpy as np

# Ensure src is on sys.path
SRC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

DEFAULT_DATA_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "processed", "component4")
)

WESTERN_PROVINCE_DISTRICTS = {"Colombo", "Gampaha", "Kalutara"}

EPSILON = 1.0  # Safe denominator epsilon in LKR or count


# ---------------------------------------------------------------------------
# 1. Standalone Mathematical & Financial Ratio Functions
# ---------------------------------------------------------------------------

def calculate_hhi(shares: Sequence[float], normalized: bool = True) -> float:
    """
    Computes the Herfindahl-Hirschman Index (HHI) of concentration.

    Parameters:
        shares: Sequence of percentage shares (e.g. [50.0, 30.0, 20.0]) or
                fractional shares (e.g. [0.5, 0.3, 0.2]).
        normalized: If True, returns HHI in [0.0, 1.0]. If False, conventional [0, 10000].

    Formula:
        HHI = sum( (s_i / 100)^2 ) if shares are percentages (sum > 1.5)
        HHI = sum( s_i^2 ) if shares are already fractions (sum <= 1.5)
    """
    if shares is None or len(shares) == 0:
        return 0.0

    valid_shares = [float(s) for s in shares if pd.notnull(s) and float(s) > 0.0]
    if len(valid_shares) == 0:
        return 0.0

    arr = np.array(valid_shares, dtype=float)
    total = np.sum(arr)
    if total <= 0:
        return 0.0

    # Auto-detect percentage vs fraction
    if total > 1.5:
        fractions = arr / 100.0
    else:
        fractions = arr / total

    hhi_norm = float(np.sum(fractions ** 2))
    hhi_norm = max(0.0, min(1.0, hhi_norm))

    return round(hhi_norm, 4) if normalized else round(hhi_norm * 10000.0, 1)


def calculate_cr1(shares: Sequence[float]) -> float:
    """Computes Top-1 Concentration Ratio (maximum share in [0.0, 1.0])."""
    if shares is None or len(shares) == 0:
        return 0.0
    valid = [float(s) for s in shares if pd.notnull(s) and float(s) > 0.0]
    if len(valid) == 0:
        return 0.0
    arr = np.array(valid, dtype=float)
    total = np.sum(arr)
    if total <= 0:
        return 0.0
    if total > 1.5:
        return round(float(np.max(arr) / 100.0), 4)
    return round(float(np.max(arr) / total), 4)


def calculate_cash_runway(
    cash_reserves_lkr: float,
    monthly_expenses_lkr: float,
    epsilon: float = EPSILON
) -> float:
    """
    Computes cash runway in months.
    Formula: max(0, cash_reserves_lkr) / max(monthly_expenses_lkr, epsilon)
    Units: Months
    """
    safe_cash = max(0.0, float(cash_reserves_lkr)) if pd.notnull(cash_reserves_lkr) else 0.0
    safe_expenses = max(float(epsilon), float(monthly_expenses_lkr)) if pd.notnull(monthly_expenses_lkr) else float(epsilon)
    return round(float(safe_cash / safe_expenses), 4)


def calculate_debt_service_burden(
    monthly_debt_repayment_lkr: float,
    monthly_revenue_lkr: float,
    epsilon: float = EPSILON
) -> float:
    """
    Computes monthly debt repayment burden relative to revenue.
    Formula: max(0, monthly_debt_repayment_lkr) / max(monthly_revenue_lkr, epsilon)
    Units: Dimensionless ratio in [0, inf)
    """
    safe_repay = max(0.0, float(monthly_debt_repayment_lkr)) if pd.notnull(monthly_debt_repayment_lkr) else 0.0
    safe_rev = max(float(epsilon), float(monthly_revenue_lkr)) if pd.notnull(monthly_revenue_lkr) else float(epsilon)
    return round(float(safe_repay / safe_rev), 4)


def calculate_debt_service_coverage(
    operating_cash_flow_lkr: float,
    monthly_debt_repayment_lkr: float,
    epsilon: float = EPSILON
) -> float:
    """
    Computes debt-service coverage ratio (DSCR).
    Formula: operating_cash_flow_lkr / max(monthly_debt_repayment_lkr, epsilon)
    Units: Dimensionless ratio
    """
    safe_flow = float(operating_cash_flow_lkr) if pd.notnull(operating_cash_flow_lkr) else 0.0
    safe_repay = max(float(epsilon), float(monthly_debt_repayment_lkr)) if pd.notnull(monthly_debt_repayment_lkr) else float(epsilon)
    return round(float(safe_flow / safe_repay), 4)


def calculate_operating_margin(
    monthly_revenue_lkr: float,
    monthly_expenses_lkr: float,
    epsilon: float = EPSILON
) -> float:
    """
    Computes operating profit margin ratio.
    Formula: (monthly_revenue_lkr - monthly_expenses_lkr) / max(monthly_revenue_lkr, epsilon)
    Units: Dimensionless ratio in (-inf, 1.0]
    """
    safe_rev = float(monthly_revenue_lkr) if pd.notnull(monthly_revenue_lkr) else 0.0
    safe_exp = float(monthly_expenses_lkr) if pd.notnull(monthly_expenses_lkr) else 0.0
    denom = max(float(epsilon), safe_rev)
    return round(float((safe_rev - safe_exp) / denom), 4)


def calculate_investment_to_cash_ratio(
    required_investment_lkr: float,
    cash_reserves_lkr: float,
    epsilon: float = EPSILON
) -> float:
    """
    Computes upfront capital investment pressure relative to available liquid reserves.
    Formula: max(0, required_investment_lkr) / max(cash_reserves_lkr, epsilon)
    Units: Dimensionless ratio in [0, inf)
    """
    safe_inv = max(0.0, float(required_investment_lkr)) if pd.notnull(required_investment_lkr) else 0.0
    safe_cash = max(float(epsilon), float(cash_reserves_lkr)) if pd.notnull(cash_reserves_lkr) else float(epsilon)
    return round(float(safe_inv / safe_cash), 4)


def calculate_post_action_runway(
    cash_reserves_lkr: float,
    required_investment_lkr: float,
    monthly_expenses_lkr: float,
    additional_monthly_cost_lkr: float,
    epsilon: float = EPSILON
) -> float:
    """
    Computes simulated post-investment cash runway.
    Formula: max(0, cash_reserves_lkr - required_investment_lkr) / max(monthly_expenses_lkr + additional_monthly_cost_lkr, epsilon)
    Units: Months
    """
    safe_cash = float(cash_reserves_lkr) if pd.notnull(cash_reserves_lkr) else 0.0
    safe_inv = float(required_investment_lkr) if pd.notnull(required_investment_lkr) else 0.0
    post_cash = max(0.0, safe_cash - safe_inv)

    safe_exp = float(monthly_expenses_lkr) if pd.notnull(monthly_expenses_lkr) else 0.0
    safe_cost = float(additional_monthly_cost_lkr) if pd.notnull(additional_monthly_cost_lkr) else 0.0
    post_expenses = max(float(epsilon), safe_exp + safe_cost)

    return round(float(post_cash / post_expenses), 4)


def calculate_post_action_net_cash_flow(
    monthly_revenue_lkr: float,
    expected_revenue_change_lkr: float,
    monthly_expenses_lkr: float,
    additional_monthly_cost_lkr: float,
    monthly_debt_repayment_lkr: float
) -> float:
    """
    Computes projected monthly net cash flow post-action.
    Formula: (revenue + expected_change) - (expenses + additional_cost) - debt_repayment
    Units: LKR / month
    """
    rev = float(monthly_revenue_lkr) if pd.notnull(monthly_revenue_lkr) else 0.0
    rev_change = float(expected_revenue_change_lkr) if pd.notnull(expected_revenue_change_lkr) else 0.0
    exp = float(monthly_expenses_lkr) if pd.notnull(monthly_expenses_lkr) else 0.0
    add_cost = float(additional_monthly_cost_lkr) if pd.notnull(additional_monthly_cost_lkr) else 0.0
    repay = float(monthly_debt_repayment_lkr) if pd.notnull(monthly_debt_repayment_lkr) else 0.0

    return round(float((rev + rev_change) - (exp + add_cost) - repay), 2)


def calculate_capacity_gap(available_capacity_score: float) -> float:
    """
    Computes operational capacity deficit score.
    Formula: max(0.0, min(1.0, 1.0 - available_capacity_score))
    Units: Score in [0.0, 1.0] (1.0 = zero capacity available, severe bottleneck)
    """
    score = float(available_capacity_score) if pd.notnull(available_capacity_score) else 1.0
    return round(float(max(0.0, min(1.0, 1.0 - score))), 4)


def calculate_staffing_growth_ratio(
    required_staff_count: int,
    current_employee_count: int,
    epsilon: int = 1
) -> float:
    """
    Computes headcount expansion scale relative to existing team size.
    Formula: max(0, required_staff_count) / max(current_employee_count, epsilon)
    Units: Dimensionless ratio in [0, inf)
    """
    req = max(0, required_staff_count) if pd.notnull(required_staff_count) else 0
    curr = max(epsilon, current_employee_count) if pd.notnull(current_employee_count) else epsilon
    return round(float(req / curr), 4)


# ---------------------------------------------------------------------------
# 2. RiskFeatureEngineer: Dataset Processing & Feature Pipeline
# ---------------------------------------------------------------------------

class RiskFeatureEngineer:
    """
    Orchestrates dataset aggregation, feature engineering, zero-leakage target segregation,
    and metadata generation for Component 4.
    """

    def __init__(self, data_dir: str = DEFAULT_DATA_DIR):
        self.data_dir = data_dir

    def extract_relationship_features(
        self,
        rel_df: pd.DataFrame,
        business_ids: Optional[Union[Sequence[str], pd.Series]] = None
    ) -> pd.DataFrame:
        """
        Aggregates relational edges from business_relationships.csv into
        per-business concentration and counterparty risk metrics.
        Returns exactly 1 row per base SME business (500 rows).
        """
        # Determine base SME IDs
        if business_ids is not None:
            all_sme_ids = sorted(list(set(business_ids)))
        else:
            targets = [x for x in rel_df["target_id"].dropna().unique() if re.match(r"^WP_SME_\d{4}$", str(x))]
            sources = [x for x in rel_df["source_id"].dropna().unique() if re.match(r"^WP_SME_\d{4}$", str(x))]
            all_sme_ids = sorted(list(set(targets).union(set(sources))))

        base_sme_df = pd.DataFrame({"business_id": all_sme_ids})

        # 1. Supplier aggregation (relationship_type == 'SUPPLIES', target_id == SME)
        sups = rel_df[rel_df["relationship_type"] == "SUPPLIES"].copy()
        sups = sups[sups["target_id"].isin(all_sme_ids)]
        sups["share_frac"] = sups["dependency_percentage"].fillna(0.0) / 100.0
        sups["share_sq"] = sups["share_frac"] ** 2

        sup_agg = sups.groupby("target_id").agg(
            supplier_count=("source_id", "count"),
            supplier_hhi=("share_sq", lambda s: round(float(s.sum()), 4)),
            supplier_cr1_share=("share_frac", lambda s: round(float(s.max()), 4) if len(s) > 0 else 0.0),
            has_disrupted_supplier=("disruption_status", lambda s: int((s != "BASELINE").sum() > 0))
        ).reset_index().rename(columns={"target_id": "business_id"})

        # 2. Customer aggregation (relationship_type == 'SELLS_TO', source_id == SME)
        custs = rel_df[rel_df["relationship_type"] == "SELLS_TO"].copy()
        custs = custs[custs["source_id"].isin(all_sme_ids)]
        custs["share_frac"] = custs["dependency_percentage"].fillna(0.0) / 100.0
        custs["share_sq"] = custs["share_frac"] ** 2

        cust_agg = custs.groupby("source_id").agg(
            customer_count=("target_id", "count"),
            customer_hhi=("share_sq", lambda s: round(float(s.sum()), 4)),
            customer_cr1_share=("share_frac", lambda s: round(float(s.max()), 4) if len(s) > 0 else 0.0)
        ).reset_index().rename(columns={"source_id": "business_id"})

        # 3. Lender aggregation (relationship_type == 'BORROWS_FROM', source_id == SME)
        bnks = rel_df[rel_df["relationship_type"] == "BORROWS_FROM"].copy()
        bnks = bnks[bnks["source_id"].isin(all_sme_ids)]
        bnk_agg = bnks.groupby("source_id").agg(
            lender_count=("target_id", "count"),
            total_borrowing_lkr=("transaction_value_lkr", lambda s: round(float(s.sum()), 2))
        ).reset_index().rename(columns={"source_id": "business_id"})

        # 4. Payment delay aggregation across all active trading relationships
        trading_sups = sups[["target_id", "payment_delay_days"]].rename(columns={"target_id": "business_id"})
        trading_custs = custs[["source_id", "payment_delay_days"]].rename(columns={"source_id": "business_id"})
        trading = pd.concat([trading_sups, trading_custs])

        delay_agg = trading.groupby("business_id").agg(
            counterparty_payment_delay_mean_days=("payment_delay_days", lambda s: round(float(s.mean()), 2) if len(s) > 0 else 0.0),
            counterparty_payment_delay_max_days=("payment_delay_days", lambda s: int(s.max()) if len(s) > 0 else 0)
        ).reset_index()

        # Combine all parts into base_sme_df
        merged = base_sme_df.merge(sup_agg, on="business_id", how="left")
        merged = merged.merge(cust_agg, on="business_id", how="left")
        merged = merged.merge(bnk_agg, on="business_id", how="left")
        merged = merged.merge(delay_agg, on="business_id", how="left")

        # Fill missing counts with 0
        merged["supplier_count"] = merged["supplier_count"].fillna(0).astype(int)
        merged["supplier_hhi"] = merged["supplier_hhi"].fillna(0.0).round(4)
        merged["supplier_cr1_share"] = merged["supplier_cr1_share"].fillna(0.0).round(4)
        merged["has_disrupted_supplier"] = merged["has_disrupted_supplier"].fillna(0).astype(int)

        merged["customer_count"] = merged["customer_count"].fillna(0).astype(int)
        merged["customer_hhi"] = merged["customer_hhi"].fillna(0.0).round(4)
        merged["customer_cr1_share"] = merged["customer_cr1_share"].fillna(0.0).round(4)

        merged["lender_count"] = merged["lender_count"].fillna(0).astype(int)
        merged["total_borrowing_lkr"] = merged["total_borrowing_lkr"].fillna(0.0).round(2)

        merged["counterparty_payment_delay_mean_days"] = merged["counterparty_payment_delay_mean_days"].fillna(0.0).round(2)
        merged["counterparty_payment_delay_max_days"] = merged["counterparty_payment_delay_max_days"].fillna(0).astype(int)

        return merged

    def extract_financial_snapshot_features(self, snaps_df: pd.DataFrame) -> pd.DataFrame:
        """
        Aggregates trailing 12-month financial snapshots into baseline stability,
        profitability, debt burden, and liquidity indicators per business.
        """
        # Ensure chronological order
        snaps_sorted = snaps_df.sort_values(["business_id", "snapshot_month"])

        # Latest row per business (baseline state at decision time)
        latest_snaps = snaps_sorted.groupby("business_id").last().reset_index()

        # 12-month aggregations
        agg = snaps_sorted.groupby("business_id").agg(
            monthly_revenue_mean_lkr=("monthly_revenue_lkr", "mean"),
            monthly_revenue_std_lkr=("monthly_revenue_lkr", "std"),
            monthly_expenses_mean_lkr=("monthly_expenses_lkr", "mean"),
            monthly_expenses_std_lkr=("monthly_expenses_lkr", "std"),
            cash_reserves_min_lkr=("cash_reserves_lkr", "min"),
        ).reset_index()

        # Merge with latest snapshot values
        merged = agg.merge(
            latest_snaps[[
                "business_id",
                "cash_reserves_lkr",
                "working_capital_lkr",
                "outstanding_debt_lkr",
                "monthly_debt_repayment_lkr"
            ]].rename(columns={
                "cash_reserves_lkr": "cash_reserves_latest_lkr",
                "working_capital_lkr": "working_capital_latest_lkr",
                "outstanding_debt_lkr": "outstanding_debt_latest_lkr",
                "monthly_debt_repayment_lkr": "monthly_debt_repayment_lkr",
            }),
            on="business_id",
            how="left"
        )

        # Derived Ratios
        rev_mean = merged["monthly_revenue_mean_lkr"].to_numpy(dtype=float)
        rev_std = merged["monthly_revenue_std_lkr"].fillna(0.0).to_numpy(dtype=float)
        exp_mean = merged["monthly_expenses_mean_lkr"].to_numpy(dtype=float)
        exp_std = merged["monthly_expenses_std_lkr"].fillna(0.0).to_numpy(dtype=float)
        cash_latest = merged["cash_reserves_latest_lkr"].to_numpy(dtype=float)
        cash_min = merged["cash_reserves_min_lkr"].to_numpy(dtype=float)
        repay = merged["monthly_debt_repayment_lkr"].to_numpy(dtype=float)
        working_cap = merged["working_capital_latest_lkr"].to_numpy(dtype=float)

        op_profit_mean = rev_mean - exp_mean
        op_margin = (rev_mean - exp_mean) / np.maximum(EPSILON, rev_mean)
        cash_runway = np.maximum(0.0, cash_latest) / np.maximum(EPSILON, exp_mean)
        cash_runway_min = np.maximum(0.0, cash_min) / np.maximum(EPSILON, exp_mean)
        debt_burden = np.maximum(0.0, repay) / np.maximum(EPSILON, rev_mean)
        dscr = op_profit_mean / np.maximum(EPSILON, repay)
        working_cap_ratio = working_cap / np.maximum(EPSILON, rev_mean)
        net_cash_flow = op_profit_mean - repay
        rev_volatility = rev_std / np.maximum(EPSILON, rev_mean)

        merged["monthly_revenue_mean_lkr"] = rev_mean.round(2)
        merged["monthly_revenue_std_lkr"] = rev_std.round(2)
        merged["revenue_volatility_cv"] = rev_volatility.round(4)
        merged["monthly_expenses_mean_lkr"] = exp_mean.round(2)
        merged["monthly_expenses_std_lkr"] = exp_std.round(2)
        merged["operating_profit_mean_lkr"] = op_profit_mean.round(2)
        merged["operating_margin_ratio"] = op_margin.round(4)
        merged["cash_reserves_latest_lkr"] = cash_latest.round(2)
        merged["cash_reserves_min_lkr"] = cash_min.round(2)
        merged["baseline_cash_runway_months"] = cash_runway.round(4)
        merged["min_cash_runway_months"] = cash_runway_min.round(4)
        merged["working_capital_latest_lkr"] = working_cap.round(2)
        merged["working_capital_to_revenue_ratio"] = working_cap_ratio.round(4)
        merged["outstanding_debt_latest_lkr"] = merged["outstanding_debt_latest_lkr"].to_numpy(dtype=float).round(2)
        merged["monthly_debt_repayment_lkr"] = repay.round(2)
        merged["debt_service_burden_ratio"] = debt_burden.round(4)
        merged["debt_service_coverage_ratio"] = dscr.round(4)
        merged["net_cash_flow_monthly_lkr"] = net_cash_flow.round(2)

        return merged

    def build_feature_dataset(self) -> pd.DataFrame:
        """
        Merges business profiles, aggregated snapshots, aggregated relationships,
        and proposed growth actions into a unified 2,000-row feature table.
        Computes interaction features and segregates target labels cleanly.
        """
        profiles_path = os.path.join(self.data_dir, "business_profiles.csv")
        snapshots_path = os.path.join(self.data_dir, "financial_snapshots.csv")
        relationships_path = os.path.join(self.data_dir, "business_relationships.csv")
        actions_path = os.path.join(self.data_dir, "growth_actions.csv")
        outcomes_path = os.path.join(self.data_dir, "risk_outcomes.csv")
        splits_path = os.path.join(self.data_dir, "scenario_families_and_splits.csv")

        # Load input datasets
        df_prof = pd.read_csv(profiles_path)
        df_snaps = pd.read_csv(snapshots_path)
        df_rel = pd.read_csv(relationships_path)
        df_act = pd.read_csv(actions_path)
        df_out = pd.read_csv(outcomes_path)
        df_splits = pd.read_csv(splits_path)

        # 1. Aggregate Relational and Financial baseline
        df_rel_feats = self.extract_relationship_features(df_rel, business_ids=df_prof["business_id"].tolist())
        df_fin_feats = self.extract_financial_snapshot_features(df_snaps)

        # 2. Merge Business-Level baseline features (500 rows)
        base_cols = [
            "business_id", "district", "province", "business_category",
            "business_stage", "employee_count", "scenario_family_id"
        ]
        base_df = df_prof[base_cols].copy()
        base_df = base_df.merge(df_splits[["business_id", "split"]], on="business_id", how="left")
        base_df = base_df.merge(df_fin_feats, on="business_id", how="left")
        base_df = base_df.merge(df_rel_feats, on="business_id", how="left")

        # 3. Merge with Growth Actions (2,000 action rows)
        act_cols = [
            "action_id", "business_id", "action_type", "variant",
            "required_investment_lkr", "additional_monthly_cost_lkr",
            "expected_revenue_change_lkr", "required_staff_count",
            "available_capacity_score", "mitigation_applied"
        ]
        action_merged = df_act[act_cols].merge(base_df, on="business_id", how="left")

        # 4. Vectorized Growth Action Stress & Resilience Interactions
        inv = action_merged["required_investment_lkr"].to_numpy(dtype=float)
        add_cost = action_merged["additional_monthly_cost_lkr"].to_numpy(dtype=float)
        rev_change = action_merged["expected_revenue_change_lkr"].to_numpy(dtype=float)
        req_staff = action_merged["required_staff_count"].to_numpy(dtype=float)
        cap_score = action_merged["available_capacity_score"].to_numpy(dtype=float)

        cash_latest = action_merged["cash_reserves_latest_lkr"].to_numpy(dtype=float)
        rev_mean = action_merged["monthly_revenue_mean_lkr"].to_numpy(dtype=float)
        exp_mean = action_merged["monthly_expenses_mean_lkr"].to_numpy(dtype=float)
        debt_repay = action_merged["monthly_debt_repayment_lkr"].to_numpy(dtype=float)
        curr_staff = action_merged["employee_count"].to_numpy(dtype=float)

        inv_to_cash = np.maximum(0.0, inv) / np.maximum(EPSILON, cash_latest)
        add_cost_to_rev = np.maximum(0.0, add_cost) / np.maximum(EPSILON, rev_mean)
        post_cash = np.maximum(0.0, cash_latest - inv)
        post_exp = np.maximum(EPSILON, exp_mean + add_cost)
        post_runway = post_cash / post_exp
        post_net_flow = (rev_mean + rev_change) - (exp_mean + add_cost) - debt_repay
        cap_gap = np.maximum(0.0, np.minimum(1.0, 1.0 - cap_score))
        staff_growth = np.maximum(0.0, req_staff) / np.maximum(1.0, curr_staff)

        action_merged["investment_to_cash_ratio"] = inv_to_cash.round(4)
        action_merged["additional_cost_to_revenue_ratio"] = add_cost_to_rev.round(4)
        action_merged["post_action_cash_runway_months"] = post_runway.round(4)
        action_merged["post_action_net_cash_flow_lkr"] = post_net_flow.round(2)
        action_merged["capacity_gap_score"] = cap_gap.round(4)
        action_merged["staffing_growth_ratio"] = staff_growth.round(4)

        # 5. Merge Ground-Truth Targets cleanly with 'target_' prefix to strictly prevent leakage
        # Ensure we do NOT leak risk_factor_codes or mitigation_codes into predictive features
        target_cols = df_out[[
            "action_id", "business_id", "variant",
            "overall_risk_label", "growth_readiness_label",
            "liquidity_stress_label", "relationship_risk_label"
        ]].copy()
        target_cols = target_cols.rename(columns={
            "overall_risk_label": "target_overall_risk",
            "growth_readiness_label": "target_growth_readiness",
            "liquidity_stress_label": "target_liquidity_stress",
            "relationship_risk_label": "target_relationship_risk",
        })

        final_df = action_merged.merge(target_cols, on=["action_id", "business_id", "variant"], how="left")
        final_df["data_origin"] = "SIMULATED_SCENARIO"

        return final_df

    def save_engineered_features(
        self,
        output_csv: str = os.path.join(DEFAULT_DATA_DIR, "engineered_risk_features.csv"),
        output_json: str = os.path.join(DEFAULT_DATA_DIR, "engineered_features_dictionary.json"),
    ) -> pd.DataFrame:
        """
        Executes the full pipeline, saves engineered features CSV and data dictionary JSON.
        """
        print("Executing Component 4 Stage 5 Risk Feature Engineering pipeline...")
        df_features = self.build_feature_dataset()

        # Enforce geographic assertion
        provinces = set(df_features["province"].unique())
        districts = set(df_features["district"].unique())
        assert provinces == {"Western"}, f"Unexpected province: {provinces}"
        assert districts.issubset(WESTERN_PROVINCE_DISTRICTS), f"Unexpected district: {districts}"

        os.makedirs(os.path.dirname(output_csv), exist_ok=True)
        df_features.to_csv(output_csv, index=False)
        print(f"Saved engineered features to: {output_csv} ({len(df_features)} rows × {len(df_features.columns)} columns)")

        # Create comprehensive feature dictionary
        feature_dict = self.generate_feature_dictionary(df_features)
        with open(output_json, "w", encoding="utf-8") as f:
            json.dump(feature_dict, f, indent=2)
        print(f"Saved feature dictionary to: {output_json}")

        return df_features

    def generate_feature_dictionary(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Generates documentation metadata for every feature."""
        definitions = {
            # Metadata & Context
            "action_id": {"type": "identifier", "unit": "id", "description": "Unique identifier for growth action scenario"},
            "business_id": {"type": "identifier", "unit": "id", "description": "Unique identifier for base SME scenario"},
            "action_type": {"type": "categorical", "unit": "category", "description": "Proposed strategic growth action"},
            "variant": {"type": "categorical", "unit": "category", "description": "Scenario intervention status: BASELINE or MITIGATED"},
            "district": {"type": "categorical", "unit": "administrative_district", "description": "Western Province district: Colombo, Gampaha, Kalutara"},
            "province": {"type": "categorical", "unit": "province", "description": "Provincial boundary: Western Province"},
            "business_category": {"type": "categorical", "unit": "industry_sector", "description": "SME business domain"},
            "business_stage": {"type": "categorical", "unit": "lifecycle_stage", "description": "Lifecycle maturity: Startup, Existing, Growing"},
            "employee_count": {"type": "numerical", "unit": "persons", "description": "Current baseline team headcount"},
            "scenario_family_id": {"type": "group_identifier", "unit": "family_id", "description": "Leakage-safe grouping identifier for train/val/test splits"},
            "split": {"type": "split_assignment", "unit": "partition", "description": "Data split: train (70%), validation (15%), test (15%)"},
            "data_origin": {"type": "provenance", "unit": "provenance_tag", "description": "Explicit provenance marker: SIMULATED_SCENARIO"},

            # Financial Baseline Features
            "monthly_revenue_mean_lkr": {"type": "numerical", "unit": "LKR/month", "description": "12-month trailing mean monthly revenue"},
            "monthly_revenue_std_lkr": {"type": "numerical", "unit": "LKR/month", "description": "12-month standard deviation of monthly revenue"},
            "revenue_volatility_cv": {"type": "numerical", "unit": "ratio", "description": "Coefficient of variation for revenue (std / mean)"},
            "monthly_expenses_mean_lkr": {"type": "numerical", "unit": "LKR/month", "description": "12-month trailing mean monthly operational expenses"},
            "monthly_expenses_std_lkr": {"type": "numerical", "unit": "LKR/month", "description": "12-month standard deviation of monthly expenses"},
            "operating_profit_mean_lkr": {"type": "numerical", "unit": "LKR/month", "description": "Mean monthly operating income before debt repayment"},
            "operating_margin_ratio": {"type": "numerical", "unit": "ratio", "description": "Operating margin ratio (operating_profit / revenue)"},
            "cash_reserves_latest_lkr": {"type": "numerical", "unit": "LKR", "description": "Latest available liquid cash reserve balance"},
            "cash_reserves_min_lkr": {"type": "numerical", "unit": "LKR", "description": "Minimum observed liquid cash balance across 12-month history"},
            "baseline_cash_runway_months": {"type": "numerical", "unit": "months", "description": "Pre-action baseline cash runway (latest cash / mean expenses)"},
            "min_cash_runway_months": {"type": "numerical", "unit": "months", "description": "Worst-case historical cash runway (min cash / mean expenses)"},
            "working_capital_latest_lkr": {"type": "numerical", "unit": "LKR", "description": "Latest working capital (cash + receivables - payables)"},
            "working_capital_to_revenue_ratio": {"type": "numerical", "unit": "ratio", "description": "Working capital adequacy relative to monthly revenue"},
            "outstanding_debt_latest_lkr": {"type": "numerical", "unit": "LKR", "description": "Latest total outstanding formal borrowing liability"},
            "monthly_debt_repayment_lkr": {"type": "numerical", "unit": "LKR/month", "description": "Contractual monthly debt service installment"},
            "debt_service_burden_ratio": {"type": "numerical", "unit": "ratio", "description": "Monthly debt repayment burden (repayment / revenue)"},
            "debt_service_coverage_ratio": {"type": "numerical", "unit": "ratio", "description": "Debt service coverage ratio (operating_income / repayment)"},
            "net_cash_flow_monthly_lkr": {"type": "numerical", "unit": "LKR/month", "description": "Pre-action net monthly cash flow after debt service"},

            # Relational Concentration Features
            "supplier_count": {"type": "numerical", "unit": "count", "description": "Total number of distinct active suppliers"},
            "supplier_hhi": {"type": "numerical", "unit": "HHI_normalized_[0,1]", "description": "Herfindahl-Hirschman Index of supplier purchase concentration"},
            "supplier_cr1_share": {"type": "numerical", "unit": "ratio_[0,1]", "description": "Top-1 supplier concentration share"},
            "customer_count": {"type": "numerical", "unit": "count", "description": "Total number of distinct active customers"},
            "customer_hhi": {"type": "numerical", "unit": "HHI_normalized_[0,1]", "description": "Herfindahl-Hirschman Index of customer sales concentration"},
            "customer_cr1_share": {"type": "numerical", "unit": "ratio_[0,1]", "description": "Top-1 customer concentration share"},
            "lender_count": {"type": "numerical", "unit": "count", "description": "Total number of active debt lenders"},
            "total_borrowing_lkr": {"type": "numerical", "unit": "LKR", "description": "Total contractual loan exposure from relationship table"},
            "counterparty_payment_delay_mean_days": {"type": "numerical", "unit": "days", "description": "Average transaction payment settlement delay"},
            "counterparty_payment_delay_max_days": {"type": "numerical", "unit": "days", "description": "Maximum transaction payment settlement delay"},
            "supplier_disruption_active": {"type": "binary", "unit": "flag", "description": "1 if any supplier has active disruption, 0 otherwise"},

            # Growth Action Parameters
            "required_investment_lkr": {"type": "numerical", "unit": "LKR", "description": "Upfront capital required for expansion"},
            "additional_monthly_cost_lkr": {"type": "numerical", "unit": "LKR/month", "description": "Additional recurring monthly operational overhead"},
            "expected_revenue_change_lkr": {"type": "numerical", "unit": "LKR/month", "description": "Expected additional monthly revenue from expansion"},
            "required_staff_count": {"type": "numerical", "unit": "persons", "description": "Additional headcount required for the growth action"},
            "available_capacity_score": {"type": "numerical", "unit": "score_[0,1]", "description": "Current infrastructure / team capacity availability"},
            "mitigation_applied": {"type": "binary", "unit": "flag", "description": "1 if mitigation intervention applied, 0 for baseline"},

            # Growth Action Stress Interactions
            "investment_to_cash_ratio": {"type": "numerical", "unit": "ratio", "description": "Investment capital pressure (investment / cash reserves)"},
            "additional_cost_to_revenue_ratio": {"type": "numerical", "unit": "ratio", "description": "Overhead increase pressure (additional cost / revenue)"},
            "post_action_cash_runway_months": {"type": "numerical", "unit": "months", "description": "Simulated remaining cash runway post-investment"},
            "post_action_net_cash_flow_lkr": {"type": "numerical", "unit": "LKR/month", "description": "Simulated monthly net cash flow post-action"},
            "capacity_gap_score": {"type": "numerical", "unit": "score_[0,1]", "description": "Deficit capacity score (1 - capacity_score)"},
            "staffing_growth_ratio": {"type": "numerical", "unit": "ratio", "description": "Headcount growth burden (required staff / current staff)"},

            # Segregated Ground-Truth Targets (NOT predictive features)
            "target_overall_risk": {"type": "target_label", "unit": "class", "description": "Simulator rule target: Low, Medium, High"},
            "target_growth_readiness": {"type": "target_label", "unit": "class", "description": "Decision recommendation target: Proceed, Modify, Delay"},
            "target_liquidity_stress": {"type": "target_label", "unit": "class", "description": "Intermediate simulator liquidity label: Low, Medium, High"},
            "target_relationship_risk": {"type": "target_label", "unit": "class", "description": "Intermediate simulator relationship label: Low, Medium, High"},
        }

        feature_summary = {}
        for col in df.columns:
            meta = definitions.get(col, {"type": "unknown", "unit": "unknown", "description": "Unannotated column"})
            feature_summary[col] = {
                "metadata": meta,
                "dtype": str(df[col].dtype),
                "null_count": df[col].isnull().sum(),
                "sample_values": df[col].dropna().head(3).tolist(),
            }

        return {
            "dataset_title": "Component 4 Engineered Risk Features Package",
            "scope": "Western Province, Sri Lanka (Colombo, Gampaha, Kalutara)",
            "total_rows": len(df),
            "total_columns": len(df.columns),
            "predictive_feature_count": len([c for c in df.columns if not c.startswith("target_") and c not in ["action_id", "business_id", "scenario_family_id", "split", "data_origin"]]),
            "target_count": len([c for c in df.columns if c.startswith("target_")]),
            "columns": feature_summary,
        }


if __name__ == "__main__":
    engineer = RiskFeatureEngineer()
    engineer.save_engineered_features()
