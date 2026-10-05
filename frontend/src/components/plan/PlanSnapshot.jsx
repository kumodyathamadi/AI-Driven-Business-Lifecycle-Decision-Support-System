import React from 'react';
import { 
  ShieldCheck, 
  DollarSign, 
  Clock, 
  TrendingUp, 
  Users, 
  Target 
} from 'lucide-react';
import { formatCurrency, formatCustomersPerDay, formatConfidence } from '../../utils/formatters';

export default function PlanSnapshot({ profile, financialPlan = {}, marketingPlan = {} }) {
  const businessInput = profile?.business_input || {};
  const feasibility = profile?.feasibility_analysis || {};

  const feasibilityLabel = feasibility.predicted_label || 'Conditionally Feasible';
  const confidenceScore = feasibility.confidence_score || feasibility.probability_score || 0.6;
  
  const targetCapital = financialPlan.available_capital_lkr ?? businessInput.available_capital_lkr ?? 0;
  const monthlyBudget = financialPlan.monthly_operating_budget_lkr ?? businessInput.monthly_budget_lkr ?? 0;
  const capitalRunway = financialPlan.capital_runway_months ?? 0;
  
  const targetCustomers = marketingPlan.target_daily_customers ?? businessInput.expected_customers_per_day ?? 0;
  
  // Clean demand score string or number
  let demandVal = marketingPlan.demand_score;
  if (!demandVal && businessInput.customer_demand_score !== undefined) {
    demandVal = `${businessInput.customer_demand_score}/100`;
  } else if (typeof demandVal === 'string' && demandVal.includes(':')) {
    demandVal = demandVal.split(':').pop().trim();
  }

  const availStaff = businessInput.available_staff_count ?? 1;
  const reqStaff = businessInput.required_staff_count ?? availStaff;

  return (
    <div className="bp-snapshot-bar">
      
      {/* 1. Overall Feasibility */}
      <div className="bp-snapshot-tile">
        <div className="bp-snapshot-tile-header">
          <span className="bp-snapshot-label">Feasibility</span>
          <ShieldCheck size={16} className="bp-snapshot-icon" style={{ color: '#38bdf8' }} />
        </div>
        <div className="bp-snapshot-value" style={{ fontSize: '1.05rem', color: '#60a5fa' }}>
          {feasibilityLabel}
        </div>
        <div className="bp-snapshot-sub">
          Confidence: <strong style={{ color: '#e2e8f0' }}>{formatConfidence(confidenceScore)}</strong>
        </div>
      </div>

      {/* 2. Target Capital Required */}
      <div className="bp-snapshot-tile">
        <div className="bp-snapshot-tile-header">
          <span className="bp-snapshot-label">Target Capital</span>
          <DollarSign size={16} className="bp-snapshot-icon" style={{ color: '#34d399' }} />
        </div>
        <div className="bp-snapshot-value" style={{ color: '#34d399' }}>
          {formatCurrency(targetCapital)}
        </div>
        <div className="bp-snapshot-sub">
          Initial funding baseline
        </div>
      </div>

      {/* 3. Monthly Operating Budget */}
      <div className="bp-snapshot-tile">
        <div className="bp-snapshot-tile-header">
          <span className="bp-snapshot-label">Monthly Budget</span>
          <DollarSign size={16} className="bp-snapshot-icon" style={{ color: '#818cf8' }} />
        </div>
        <div className="bp-snapshot-value" style={{ color: '#a5b4fc' }}>
          {formatCurrency(monthlyBudget)}
        </div>
        <div className="bp-snapshot-sub">
          Monthly operational burn
        </div>
      </div>

      {/* 4. Capital Runway */}
      <div className="bp-snapshot-tile">
        <div className="bp-snapshot-tile-header">
          <span className="bp-snapshot-label">Capital Runway</span>
          <Clock size={16} className="bp-snapshot-icon" style={{ color: '#f59e0b' }} />
        </div>
        <div className="bp-snapshot-value" style={{ color: '#fbbf24' }}>
          {capitalRunway} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Months</span>
        </div>
        <div className="bp-snapshot-sub">
          Operational buffer
        </div>
      </div>

      {/* 5. Customer Demand & Target Daily */}
      <div className="bp-snapshot-tile">
        <div className="bp-snapshot-tile-header">
          <span className="bp-snapshot-label">Target Daily Demand</span>
          <Target size={16} className="bp-snapshot-icon" style={{ color: '#c084fc' }} />
        </div>
        <div className="bp-snapshot-value" style={{ color: '#e879f9' }}>
          {formatCustomersPerDay(targetCustomers)}
        </div>
        <div className="bp-snapshot-sub">
          Demand Index: <strong style={{ color: '#e2e8f0' }}>{demandVal || 'Normal'}</strong>
        </div>
      </div>

      {/* 6. Staffing Capacity */}
      <div className="bp-snapshot-tile">
        <div className="bp-snapshot-tile-header">
          <span className="bp-snapshot-label">Staff Capacity</span>
          <Users size={16} className="bp-snapshot-icon" style={{ color: '#2dd4bf' }} />
        </div>
        <div className="bp-snapshot-value" style={{ color: '#2dd4bf' }}>
          {availStaff} / {reqStaff} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Staff</span>
        </div>
        <div className="bp-snapshot-sub">
          {availStaff >= reqStaff ? 'Balanced staffing' : 'Additional staff needed'}
        </div>
      </div>

    </div>
  );
}
