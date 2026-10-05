import React from 'react';
import { 
  DollarSign, 
  Clock, 
  TrendingUp, 
  ShieldAlert, 
  PieChart,
  Wallet
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export default function PlanSectionFinance({ profile, financialPlan = {} }) {
  const businessInput = profile?.business_input || {};
  
  const targetCapital = financialPlan.available_capital_lkr ?? businessInput.available_capital_lkr ?? 0;
  const monthlyBudget = financialPlan.monthly_operating_budget_lkr ?? businessInput.monthly_budget_lkr ?? 0;
  const capitalRunway = financialPlan.capital_runway_months ?? 0;
  const loanAmount = financialPlan.requested_loan_lkr ?? businessInput.loan_amount_lkr ?? 0;
  const guidance = financialPlan.counterfactual_guidance;

  return (
    <div className="bp-section" id="section-finance">
      
      {/* Section Header */}
      <div className="bp-section-header">
        <span className="bp-section-num">04</span>
        <div className="bp-section-heading-text">
          <h2 className="bp-section-title">
            <DollarSign size={18} style={{ color: '#34d399' }} />
            Financial Planning & Capital Requirements
          </h2>
          <div className="bp-section-subtitle">
            Target capital sizing, monthly operational budget burn, financial runway, and counterfactual sensitivity
          </div>
        </div>
      </div>

      {/* Financial Highlight Cards */}
      <div className="bp-fin-grid">
        
        {/* Card 1: Target Capital Required */}
        <div className="bp-fin-card primary">
          <div className="bp-fin-card-label">Target Capital Required</div>
          <div className="bp-fin-card-num" style={{ color: '#38bdf8' }}>
            {formatCurrency(targetCapital)}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.35rem' }}>
            Startup / operational equity reserve
          </div>
        </div>

        {/* Card 2: Monthly Operating Budget */}
        <div className="bp-fin-card">
          <div className="bp-fin-card-label">Monthly Operating Budget</div>
          <div className="bp-fin-card-num" style={{ color: '#a5b4fc' }}>
            {formatCurrency(monthlyBudget)}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.35rem' }}>
            Monthly recurring overhead & inventory
          </div>
        </div>

        {/* Card 3: Capital Runway */}
        <div className="bp-fin-card runway">
          <div className="bp-fin-card-label">Capital Runway</div>
          <div className="bp-fin-card-num" style={{ color: '#34d399' }}>
            {capitalRunway} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}>Months</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.35rem' }}>
            Survival horizon at zero revenue
          </div>
        </div>

        {/* Card 4: Requested Financing / Loan (if applicable) */}
        {loanAmount > 0 && (
          <div className="bp-fin-card">
            <div className="bp-fin-card-label">Requested Loan Amount</div>
            <div className="bp-fin-card-num" style={{ color: '#fbbf24' }}>
              {formatCurrency(loanAmount)}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.35rem' }}>
              External debt financing requirement
            </div>
          </div>
        )}

      </div>

      {/* Counterfactual Guidance / Financial Sensitivity */}
      {guidance && (
        <div className="bp-narrative-card">
          <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#38bdf8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.45rem' }}>
            <ShieldAlert size={14} />
            <span>Counterfactual Financial Guidance & Sustainability Threshold</span>
          </div>
          <p className="bp-narrative-text" style={{ fontSize: '0.84rem' }}>
            {guidance}
          </p>
        </div>
      )}

      {/* Recorded Financial Overview if available */}
      {businessInput.financial_overview && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px', borderLeft: '3px solid #34d399' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Capital Allocation & Financial Notes:
          </div>
          <p style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: 0, lineHeight: 1.5 }}>
            {businessInput.financial_overview}
          </p>
        </div>
      )}

    </div>
  );
}
