import React from 'react';
import { 
  ShieldCheck, 
  DollarSign, 
  Clock, 
  Users, 
  Target 
} from 'lucide-react';
import KpiTile from './KpiTile';
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
    <div className="bp-snapshot-bar" role="region" aria-label="Key Plan Figures">
      {/* 1. Overall Feasibility */}
      <KpiTile
        label="Feasibility"
        value={feasibilityLabel}
        helper={`Confidence: ${formatConfidence(confidenceScore)}`}
        icon={ShieldCheck}
        variant="blue"
      />

      {/* 2. Target Capital Required */}
      <KpiTile
        label="Target Capital"
        value={formatCurrency(targetCapital)}
        helper="Initial funding baseline"
        icon={DollarSign}
        variant="emerald"
      />

      {/* 3. Monthly Operating Budget */}
      <KpiTile
        label="Monthly Budget"
        value={formatCurrency(monthlyBudget)}
        helper="Monthly operational burn"
        icon={DollarSign}
        variant="indigo"
      />

      {/* 4. Capital Runway */}
      <KpiTile
        label="Capital Runway"
        value={<span>{capitalRunway} <span className="bp-snapshot-unit">Months</span></span>}
        helper="Operating cash buffer"
        icon={Clock}
        variant="amber"
      />

      {/* 5. Customer Demand & Target Daily */}
      <KpiTile
        label="Target Daily Demand"
        value={formatCustomersPerDay(targetCustomers)}
        helper={`Demand Index: ${demandVal || 'Normal'}`}
        icon={Target}
        variant="purple"
      />

      {/* 6. Staffing Capacity */}
      <KpiTile
        label="Staff Capacity"
        value={<span>{availStaff} / {reqStaff} <span className="bp-snapshot-unit">Staff</span></span>}
        helper={availStaff >= reqStaff ? 'Balanced staffing allocation' : 'Additional hiring required'}
        icon={Users}
        variant="teal"
      />
    </div>
  );
}
