import React from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Wrench, 
  Truck, 
  Target, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  PieChart, 
  Layers, 
  Calculator 
} from 'lucide-react';
import { formatCurrency, formatCustomersPerDay } from '../../utils/formatters';

export default function PlanSection04FinanceOps({ profile }) {
  const businessInput = profile?.business_input || {};
  const personalizedPlan = profile?.personalized_business_plan || {};
  const sec04 = personalizedPlan.section_04_financial_operational_plan || {};
  
  // Strategy alignment info
  const stratAlignment = sec04.active_strategy_alignment || {
    strategy_name: personalizedPlan.executive_overview?.recommended_primary_strategy || 'Lean Bootstrapped Launch',
    is_user_selected: Boolean(personalizedPlan.executive_overview?.is_user_selected)
  };

  // 4.1 Startup Investment
  const startupInv = sec04.startup_investment || {
    available_capital_lkr: businessInput.available_capital_lkr ?? 0,
    strategy_target_capital_lkr: businessInput.available_capital_lkr ?? 0,
    loan_amount_lkr: businessInput.loan_amount_lkr ?? 0,
    initial_inventory_cost_lkr: businessInput.initial_inventory_cost_lkr ?? 0,
    funding_gap_lkr: Math.max(0, (businessInput.available_capital_lkr ?? 0) - (businessInput.available_capital_lkr ?? 0)),
    funding_gap_status: 'Fully funded from baseline capital'
  };

  // 4.2 Monthly Financial Plan
  const monthlyFin = sec04.monthly_financial_plan || {
    monthly_operating_budget_lkr: businessInput.monthly_budget_lkr ?? 0,
    expected_price_lkr: businessInput.expected_price_lkr ?? 0,
    expected_customers_per_day: businessInput.expected_customers_per_day ?? 0,
    operating_days_per_month: businessInput.expected_operating_days_per_month ?? 26,
    estimated_monthly_revenue_lkr: (businessInput.expected_customers_per_day ?? 0) * (businessInput.expected_price_lkr ?? 0) * (businessInput.expected_operating_days_per_month ?? 26),
    revenue_calculation_formula: 'Estimated Monthly Revenue = Target Customers/Day × Expected Unit Price × Operating Days/Month',
    calculation_note: 'Calculated from user-provided assumptions. Does not guarantee actual cash sales.'
  };

  // 4.3 Funding Structure
  const funding = sec04.funding_structure || {
    equity_capital_lkr: startupInv.available_capital_lkr,
    debt_financing_lkr: startupInv.loan_amount_lkr,
    total_available_funds_lkr: startupInv.available_capital_lkr + startupInv.loan_amount_lkr,
    target_required_capital_lkr: startupInv.strategy_target_capital_lkr,
    capital_runway_months: startupInv.strategy_target_capital_lkr > 0 ? (startupInv.strategy_target_capital_lkr / Math.max(monthlyFin.monthly_operating_budget_lkr, 1)).toFixed(1) : '6.0'
  };

  // 4.4 Operational Setup
  const ops = sec04.operational_plan || {
    staffing: {
      available_staff_count: businessInput.available_staff_count ?? 1,
      required_staff_count: businessInput.required_staff_count ?? 1,
      staffing_gap: Math.max(0, (businessInput.required_staff_count ?? 1) - (businessInput.available_staff_count ?? 1)),
      capacity_status: (businessInput.available_staff_count ?? 1) >= (businessInput.required_staff_count ?? 1) ? 'Balanced staffing allocation' : 'Additional staff hiring required',
      recommended_approach: `Deploy core personnel with targeted task specialization.`
    },
    equipment: {
      available_equipment_score: `${businessInput.available_equipment_score ?? 3}/5`,
      required_equipment_score: `${businessInput.required_equipment_score ?? 3}/5`,
      readiness_status: (businessInput.available_equipment_score ?? 3) >= (businessInput.required_equipment_score ?? 3) ? 'Equipment meets operating baseline' : 'Supplemental machinery required',
      recommended_approach: 'Prioritize vital commercial equipment and evaluate lease-to-own arrangements.'
    },
    suppliers: {
      supplier_availability_score: `${businessInput.supplier_availability_score ?? 3}/5`,
      network_region: `Local supplier channels in ${businessInput.district || 'Western Province'}`,
      sourcing_approach: 'Establish supplier agreements to safeguard against inventory bottlenecks.'
    },
    operations_management: {
      procurement_inventory: `Maintain minimum buffer inventory sized for ${monthlyFin.operating_days_per_month} operating days.`,
      daily_operations: `Manage daily store operations targeted at ${monthlyFin.expected_customers_per_day} customers per day.`,
      delivery_digital: 'Utilize digital messaging and local delivery logistics where applicable.'
    }
  };

  // 4.5 Marketing Plan
  const marketing = sec04.marketing_plan || {
    marketing_channel: businessInput.marketing_channel || 'Word of Mouth & Local Channels',
    customer_acquisition: `Target local catchment in ${businessInput.district || 'commercial area'} to secure ${monthlyFin.expected_customers_per_day} daily patrons.`,
    promotional_tactics: personalizedPlan.marketing_plan?.promotional_tactics || [
      'Deploy local awareness campaigns and promotional launch flyers.',
      'Introductory pricing bundles to encourage first-time trials.',
      'Customer loyalty perks to maximize repeat purchase retention.'
    ],
    retention_and_positioning: 'Localized customer service, consistent quality, and community engagement.'
  };

  const isStaffBalanced = ops.staffing.available_staff_count >= ops.staffing.required_staff_count;
  const hasFundingGap = startupInv.funding_gap_lkr > 0;

  return (
    <div className="bp-section" id="section-04">
      {/* Section Header */}
      <div className="bp-section-header">
        <span className="bp-section-num">04</span>
        <div className="bp-section-heading-text">
          <h2 className="bp-section-title">
            <DollarSign size={18} style={{ color: '#38bdf8' }} />
            Financial & Operational Plan
          </h2>
          <div className="bp-section-subtitle">
            Dynamic capital allocation, revenue model, funding structure, operational staffing, and marketing execution tailored to selected strategy
          </div>
        </div>
      </div>

      {/* Strategy Re-Alignment Notification Callout */}
      <div style={{
        padding: '0.85rem 1.15rem',
        borderRadius: '8px',
        background: stratAlignment.is_user_selected 
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(15, 23, 42, 0.85))'
          : 'linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(15, 23, 42, 0.85))',
        border: `1px solid ${stratAlignment.is_user_selected ? 'rgba(16, 185, 129, 0.4)' : 'rgba(59, 130, 246, 0.3)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Sparkles size={16} style={{ color: stratAlignment.is_user_selected ? '#34d399' : '#60a5fa' }} />
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', fontWeight: 700 }}>
              Operating Strategic Baseline:
            </span>
            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#ffffff' }}>
              {stratAlignment.strategy_name}
            </div>
          </div>
        </div>
        <span style={{
          fontSize: '0.74rem',
          fontWeight: 700,
          padding: '0.25rem 0.65rem',
          borderRadius: '4px',
          background: stratAlignment.is_user_selected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
          color: stratAlignment.is_user_selected ? '#34d399' : '#60a5fa',
          border: `1px solid ${stratAlignment.is_user_selected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
        }}>
          {stratAlignment.is_user_selected ? 'User-Selected Strategy Aligned' : 'AI Top Recommendation Aligned'}
        </span>
      </div>

      {/* 4.1 & 4.2 Financial Overview Metrics */}
      <div className="bp-fin-grid">
        <div className="bp-fin-card primary">
          <div className="bp-fin-card-label">Target Required Capital</div>
          <div className="bp-fin-card-num" style={{ color: '#38bdf8' }}>
            {formatCurrency(startupInv.strategy_target_capital_lkr)}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.35rem' }}>
            Allocated baseline capital: {formatCurrency(startupInv.available_capital_lkr)}
          </div>
        </div>

        <div className="bp-fin-card">
          <div className="bp-fin-card-label">Monthly Operating Budget</div>
          <div className="bp-fin-card-num" style={{ color: '#a5b4fc' }}>
            {formatCurrency(monthlyFin.monthly_operating_budget_lkr)}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.35rem' }}>
            Recurring operational burn / month
          </div>
        </div>

        <div className="bp-fin-card">
          <div className="bp-fin-card-label">Estimated Monthly Revenue</div>
          <div className="bp-fin-card-num" style={{ color: '#34d399' }}>
            {formatCurrency(monthlyFin.estimated_monthly_revenue_lkr)}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.35rem' }}>
            Calculated from customer assumptions
          </div>
        </div>

        <div className="bp-fin-card runway">
          <div className="bp-fin-card-label">Capital Runway Horizon</div>
          <div className="bp-fin-card-num" style={{ color: '#fbbf24' }}>
            ~{funding.capital_runway_months} Mo
          </div>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.35rem' }}>
            Operating months at zero external debt
          </div>
        </div>
      </div>

      {/* 4.2 Transparent Revenue Calculation Formula Card */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '9px',
        padding: '1rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calculator size={15} style={{ color: '#38bdf8' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8' }}>
              4.2 Monthly Revenue Derivation Formula
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>
            Explicit Assumption Transparency
          </span>
        </div>

        <div style={{
          background: 'rgba(2, 6, 23, 0.85)',
          padding: '0.75rem 1rem',
          borderRadius: '6px',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          fontFamily: 'ui-monospace, monospace',
          fontSize: '0.84rem',
          color: '#e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <div>
            <span style={{ color: '#38bdf8' }}>{formatCustomersPerDay(monthlyFin.expected_customers_per_day)}</span>
            {' × '}
            <span style={{ color: '#34d399' }}>{formatCurrency(monthlyFin.expected_price_lkr)}</span>
            {' × '}
            <span style={{ color: '#fbbf24' }}>{monthlyFin.operating_days_per_month} Days/Mo</span>
          </div>
          <div style={{ fontWeight: 800, color: '#4ade80' }}>
            = {formatCurrency(monthlyFin.estimated_monthly_revenue_lkr)} / Month
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.75rem', color: '#94a3b8' }}>
          <Info size={13} style={{ color: '#38bdf8', flexShrink: 0 }} />
          <span>{monthlyFin.calculation_note}</span>
        </div>
      </div>

      {/* 4.3 Funding Structure Breakdown */}
      <div className="bp-narrative-card">
        <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#38bdf8', fontWeight: 700, marginBottom: '0.75rem' }}>
          4.3 Capital Structure & Working Capital Adequacy
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Available Equity Capital</span>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.2rem' }}>
              {formatCurrency(startupInv.available_capital_lkr)}
            </div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Debt / Loan Financing</span>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: startupInv.loan_amount_lkr > 0 ? '#fbbf24' : '#cbd5e1', marginTop: '0.2rem' }}>
              {formatCurrency(startupInv.loan_amount_lkr)}
            </div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Initial Inventory Cost</span>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#cbd5e1', marginTop: '0.2rem' }}>
              {formatCurrency(startupInv.initial_inventory_cost_lkr)}
            </div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.75rem', borderRadius: '6px', border: hasFundingGap ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(34, 197, 94, 0.35)' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Funding Gap Status</span>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: hasFundingGap ? '#f87171' : '#34d399', marginTop: '0.2rem' }}>
              {hasFundingGap ? formatCurrency(startupInv.funding_gap_lkr) : 'Zero Gap (100% Funded)'}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#94a3b8' }}>
          Status Note: <strong style={{ color: '#ffffff' }}>{startupInv.funding_gap_status}</strong>. Total available funds: <strong style={{ color: '#38bdf8' }}>{formatCurrency(funding.total_available_funds_lkr)}</strong>.
        </div>
      </div>

      {/* 4.4 Operational Resource Setup */}
      <div className="bp-ops-grid">
        {/* Tile 1: Staffing Capacity */}
        <div className="bp-ops-tile">
          <div className="bp-ops-tile-title">
            <Users size={14} style={{ color: '#818cf8' }} />
            <span>Staffing Capacity</span>
          </div>
          <div className="bp-ops-tile-val" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{ops.staffing.available_staff_count} Avail / {ops.staffing.required_staff_count} Req</span>
            {isStaffBalanced ? (
              <CheckCircle2 size={16} style={{ color: '#34d399' }} />
            ) : (
              <AlertCircle size={16} style={{ color: '#f59e0b' }} />
            )}
          </div>
          <div className="bp-ops-tile-desc">
            {ops.staffing.capacity_status}. {ops.staffing.recommended_approach}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.35rem' }}>
            Gap: <strong style={{ color: isStaffBalanced ? '#34d399' : '#f87171' }}>{ops.staffing.staffing_gap} personnel needed</strong>
          </div>
        </div>

        {/* Tile 2: Equipment & Machinery Readiness */}
        <div className="bp-ops-tile">
          <div className="bp-ops-tile-title">
            <Wrench size={14} style={{ color: '#38bdf8' }} />
            <span>Equipment Readiness</span>
          </div>
          <div className="bp-ops-tile-val" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Score: {ops.equipment.available_equipment_score}</span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Target: {ops.equipment.required_equipment_score}</span>
          </div>
          <div className="bp-ops-tile-desc">
            {ops.equipment.readiness_status}. {ops.equipment.recommended_approach}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.35rem' }}>
            Focus: <strong style={{ color: '#cbd5e1' }}>Prioritize essential commercial fixtures</strong>
          </div>
        </div>

        {/* Tile 3: Supply Chain Network */}
        <div className="bp-ops-tile">
          <div className="bp-ops-tile-title">
            <Truck size={14} style={{ color: '#34d399' }} />
            <span>Supplier Network</span>
          </div>
          <div className="bp-ops-tile-val" style={{ color: '#34d399' }}>
            Availability: {ops.suppliers.supplier_availability_score}
          </div>
          <div className="bp-ops-tile-desc">
            Regional Hub: {ops.suppliers.network_region}. {ops.suppliers.sourcing_approach}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.35rem' }}>
            Strategy: <strong style={{ color: '#cbd5e1' }}>Dual-supplier contracts to avert bottlenecks</strong>
          </div>
        </div>
      </div>

      {/* 4.5 Marketing Plan & Promotional Tactics */}
      <div className="bp-narrative-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
          <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#38bdf8', fontWeight: 700 }}>
            4.5 Marketing Plan & Customer Acquisition Strategy
          </div>
          <span style={{ fontSize: '0.74rem', color: '#cbd5e1', background: 'rgba(56, 189, 248, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
            Primary Channel: {marketing.marketing_channel}
          </span>
        </div>

        <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.55, margin: '0 0 0.85rem 0' }}>
          {marketing.customer_acquisition} Competitive positioning is anchored upon {marketing.retention_and_positioning}
        </p>

        <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', fontWeight: 700, marginBottom: '0.5rem' }}>
          Actionable Promotional Tactics:
        </div>

        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          {(marketing.promotional_tactics || []).map((tactic, idx) => (
            <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem', fontSize: '0.83rem', color: '#e2e8f0', lineHeight: 1.45 }}>
              <span style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.68rem',
                fontWeight: 800,
                flexShrink: 0,
                marginTop: '0.1rem'
              }}>
                {idx + 1}
              </span>
              <span>{tactic}</span>
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
}
