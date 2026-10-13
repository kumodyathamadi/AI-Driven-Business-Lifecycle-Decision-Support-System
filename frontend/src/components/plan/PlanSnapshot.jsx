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
          <ShieldCheck size={16} className="bp-snapshot-icon icon-blue" />
        </div>
        <div className="bp-snapshot-value val-blue">
          {feasibilityLabel}
        </div>
        <div className="bp-snapshot-sub">
          Confidence: <strong className="bp-snapshot-highlight">{formatConfidence(confidenceScore)}</strong>
        </div>
      </div>

      {/* 2. Target Capital Required */}
      <div className="bp-snapshot-tile">
        <div className="bp-snapshot-tile-header">
          <span className="bp-snapshot-label">Target Capital</span>
          <DollarSign size={16} className="bp-snapshot-icon icon-emerald" />
        </div>
        <div className="bp-snapshot-value val-emerald">
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
          <DollarSign size={16} className="bp-snapshot-icon icon-indigo" />
        </div>
        <div className="bp-snapshot-value val-indigo">
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
          <Clock size={16} className="bp-snapshot-icon icon-amber" />
        </div>
        <div className="bp-snapshot-value val-amber">
          {capitalRunway} <span className="bp-snapshot-unit">Months</span>
        </div>
        <div className="bp-snapshot-sub">
          Operational buffer
        </div>
      </div>

      {/* 5. Customer Demand & Target Daily */}
      <div className="bp-snapshot-tile">
        <div className="bp-snapshot-tile-header">
          <span className="bp-snapshot-label">Target Daily Demand</span>
          <Target size={16} className="bp-snapshot-icon icon-purple" />
        </div>
        <div className="bp-snapshot-value val-purple">
          {formatCustomersPerDay(targetCustomers)}
        </div>
        <div className="bp-snapshot-sub">
          Demand Index: <strong className="bp-snapshot-highlight">{demandVal || 'Normal'}</strong>
        </div>
      </div>

      {/* 6. Staffing Capacity */}
      <div className="bp-snapshot-tile">
        <div className="bp-snapshot-tile-header">
          <span className="bp-snapshot-label">Staff Capacity</span>
          <Users size={16} className="bp-snapshot-icon icon-teal" />
        </div>
        <div className="bp-snapshot-value val-teal">
          {availStaff} / {reqStaff} <span className="bp-snapshot-unit">Staff</span>
        </div>
        <div className="bp-snapshot-sub">
          {availStaff >= reqStaff ? 'Balanced staffing' : 'Additional staff needed'}
        </div>
      </div>

    </div>
  );
}
