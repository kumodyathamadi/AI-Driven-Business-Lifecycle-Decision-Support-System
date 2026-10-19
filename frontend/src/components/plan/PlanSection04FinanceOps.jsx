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
import PlanSection from './PlanSection';
import { formatCurrency, formatCustomersPerDay } from '../../utils/formatters';

export default function PlanSection04FinanceOps({ 
  profile, 
  isOpen = false, 
  onToggle 
}) {
  const businessInput = profile?.business_input || {};
  const personalizedPlan = profile?.personalized_business_plan || {};
  const sec04 = personalizedPlan.section_04_financial_operational_plan || {};
  
  // Strategy alignment info
  const stratAlignment = sec04.active_strategy_alignment || {
    strategy_name: personalizedPlan.executive_overview?.recommended_primary_strategy || 'Low-Cost, Low-Risk Start',
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
    <PlanSection
      id="section-04"
      number="04"
      title="Financial & Operational Plan"
      icon={DollarSign}
      description="Dynamic capital allocation, revenue model, funding structure, operational staffing, and marketing execution tailored to selected strategy"
      isOpen={isOpen}
      onToggle={onToggle}
    >
      {/* Strategy Re-Alignment Notification Callout */}
      <div className={`bp-strat-alignment-callout ${stratAlignment.is_user_selected ? 'selected' : 'ai'}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Sparkles size={16} className="bp-strat-alignment-icon" />
          <div>
            <span className="bp-strat-alignment-label">
              Operating Strategic Baseline:
            </span>
            <div className="bp-strat-alignment-title">
              {stratAlignment.strategy_name}
            </div>
          </div>
        </div>
        <span className={`bp-strat-alignment-badge ${stratAlignment.is_user_selected ? 'selected' : 'ai'}`}>
          {stratAlignment.is_user_selected ? 'User-Selected Strategy Aligned' : 'AI Top Recommendation Aligned'}
        </span>
      </div>

      {/* 4.1 & 4.2 Key Money Metrics Grid */}
      <div className="bp-fin-grid">
        <div className="bp-fin-card primary">
          <div className="bp-fin-card-label">Target Required Capital</div>
          <div className="bp-fin-card-num val-blue">
            {formatCurrency(startupInv.strategy_target_capital_lkr)}
          </div>
          <div className="bp-fin-card-sub">
            Allocated baseline capital: {formatCurrency(startupInv.available_capital_lkr)}
          </div>
        </div>

        <div className="bp-fin-card">
          <div className="bp-fin-card-label">Monthly Operating Budget</div>
          <div className="bp-fin-card-num val-indigo">
            {formatCurrency(monthlyFin.monthly_operating_budget_lkr)}
          </div>
          <div className="bp-fin-card-sub">
            Recurring operational burn / month
          </div>
        </div>

        <div className="bp-fin-card">
          <div className="bp-fin-card-label">Estimated Monthly Revenue</div>
          <div className="bp-fin-card-num val-emerald">
            {formatCurrency(monthlyFin.estimated_monthly_revenue_lkr)}
          </div>
          <div className="bp-fin-card-sub">
            Calculated from customer assumptions
          </div>
        </div>

        <div className="bp-fin-card runway">
          <div className="bp-fin-card-label">Capital Runway Horizon</div>
          <div className="bp-fin-card-num val-amber">
            ~{funding.capital_runway_months} Mo
          </div>
          <div className="bp-fin-card-sub">
            Operating months at zero external debt
          </div>
        </div>
      </div>

      {/* 4.2 Transparent Revenue Calculation Formula Card */}
      <div className="bp-formula-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calculator size={15} style={{ color: '#0284c7' }} />
            <span className="bp-formula-label">
              4.2 Monthly Revenue Derivation Formula
            </span>
          </div>
          <span className="bp-formula-sub">
            Explicit Assumption Transparency
          </span>
        </div>

        <div className="bp-formula-block">
          <div>
            <span className="bp-formula-term-cust">{formatCustomersPerDay(monthlyFin.expected_customers_per_day)}</span>
            {' × '}
            <span className="bp-formula-term-price">{formatCurrency(monthlyFin.expected_price_lkr)}</span>
            {' × '}
            <span className="bp-formula-term-days">{monthlyFin.operating_days_per_month} Days/Mo</span>
          </div>
          <div className="bp-formula-result">
            = {formatCurrency(monthlyFin.estimated_monthly_revenue_lkr)} / Month
          </div>
        </div>

        <div className="bp-formula-note">
          <Info size={13} style={{ color: '#0284c7', flexShrink: 0 }} />
          <span>{monthlyFin.calculation_note}</span>
        </div>
      </div>

      {/* 4.3 Funding Structure Breakdown */}
      <div className="bp-narrative-card">
        <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#0284c7', fontWeight: 700, marginBottom: '0.75rem' }}>
          4.3 Capital Structure & Working Capital Adequacy
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          <div className="bp-capital-tile">
            <span className="bp-capital-label">Available Equity Capital</span>
            <div className="bp-capital-val highlight">
              {formatCurrency(startupInv.available_capital_lkr)}
            </div>
          </div>

          <div className="bp-capital-tile">
            <span className="bp-capital-label">Debt / Loan Financing</span>
            <div className={`bp-capital-val ${startupInv.loan_amount_lkr > 0 ? 'amber' : 'normal'}`}>
              {formatCurrency(startupInv.loan_amount_lkr)}
            </div>
          </div>

          <div className="bp-capital-tile">
            <span className="bp-capital-label">Initial Inventory Cost</span>
            <div className="bp-capital-val normal">
              {formatCurrency(startupInv.initial_inventory_cost_lkr)}
            </div>
          </div>

          <div className={`bp-capital-tile ${hasFundingGap ? 'gap' : 'funded'}`}>
            <span className="bp-capital-label">Funding Gap Status</span>
            <div className={`bp-capital-val ${hasFundingGap ? 'danger' : 'success'}`}>
              {hasFundingGap ? formatCurrency(startupInv.funding_gap_lkr) : 'Zero Gap (100% Funded)'}
            </div>
          </div>
        </div>

        <div className="bp-capital-status-note">
          Status Note: <strong className="bp-meta-strong">{startupInv.funding_gap_status}</strong>. Total available funds: <strong className="bp-capital-total">{formatCurrency(funding.total_available_funds_lkr)}</strong>.
        </div>
      </div>

      {/* 4.4 Operational Resource Setup (Staffing, Equipment, Suppliers) */}
      <div className="bp-ops-grid">
        {/* Tile 1: Staffing Capacity */}
        <div className="bp-ops-tile">
          <div className="bp-ops-tile-title">
            <Users size={14} style={{ color: '#6366f1' }} />
            <span>Staffing Capacity</span>
          </div>
          <div className="bp-ops-tile-val" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{ops.staffing.available_staff_count} Avail / {ops.staffing.required_staff_count} Req</span>
            {isStaffBalanced ? (
              <CheckCircle2 size={16} style={{ color: '#059669' }} />
            ) : (
              <AlertCircle size={16} style={{ color: '#d97706' }} />
            )}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748b)', borderTop: '1px solid var(--border-color)', paddingTop: '0.35rem', marginTop: 'auto' }}>
            Status: <strong style={{ color: isStaffBalanced ? '#059669' : '#dc2626' }}>{isStaffBalanced ? 'Staffing balanced' : `${ops.staffing.staffing_gap} personnel needed`}</strong>
          </div>
        </div>

        {/* Tile 2: Equipment & Machinery Readiness */}
        <div className="bp-ops-tile">
          <div className="bp-ops-tile-title">
            <Wrench size={14} style={{ color: '#0284c7' }} />
            <span>Equipment Readiness</span>
          </div>
          <div className="bp-ops-tile-val" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Score: {ops.equipment.available_equipment_score}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>Target: {ops.equipment.required_equipment_score}</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748b)', borderTop: '1px solid var(--border-color)', paddingTop: '0.35rem', marginTop: 'auto' }}>
            Status: <strong className="bp-meta-strong">{ops.equipment.readiness_status || 'Equipment meets operating baseline'}</strong>
          </div>
        </div>

        {/* Tile 3: Supply Chain Network */}
        <div className="bp-ops-tile">
          <div className="bp-ops-tile-title">
            <Truck size={14} style={{ color: '#059669' }} />
            <span>Supplier Network</span>
          </div>
          <div className="bp-ops-tile-val" style={{ color: '#059669' }}>
            Availability: {ops.suppliers.supplier_availability_score}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748b)', borderTop: '1px solid var(--border-color)', paddingTop: '0.35rem', marginTop: 'auto' }}>
            Hub: <strong className="bp-meta-strong">{ops.suppliers.network_region || 'Regional supplier ecosystem'}</strong>
          </div>
        </div>
      </div>

      {/* 4.5 Marketing Plan & Promotional Tactics */}
      <div className="bp-narrative-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#0284c7', fontWeight: 700 }}>
            4.5 Marketing Plan & Customer Acquisition Strategy
          </div>
          <span className="bp-marketing-badge">
            Primary Channel: {marketing.marketing_channel}
          </span>
        </div>

        <p className="bp-marketing-desc">
          {marketing.customer_acquisition} {marketing.retention_and_positioning ? `Competitive positioning is anchored upon ${marketing.retention_and_positioning}` : ''}
        </p>

        <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted, #64748b)', fontWeight: 700, marginBottom: '0.5rem' }}>
          Actionable Promotional Tactics:
        </div>

        <ul className="bp-marketing-tactics" role="list">
          {(marketing.promotional_tactics || []).map((tactic, idx) => (
            <li key={idx} className="bp-marketing-tactic-item" role="listitem">
              <span className="bp-marketing-tactic-num" aria-hidden="true">
                {idx + 1}
              </span>
              <span className="bp-marketing-tactic-text">{tactic}</span>
            </li>
          ))}
        </ul>
      </div>
    </PlanSection>
  );
}
