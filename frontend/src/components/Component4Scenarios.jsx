import React, { useState } from 'react';
import { 
  Sliders, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight, 
  Info,
  DollarSign,
  Truck,
  Flame,
  Percent
} from 'lucide-react';
import { formatLKR } from './Dashboard';

export default function Component4Scenarios({ activeAssessment }) {
  // Scenario Selection State
  const [selectedScenarioId, setSelectedScenarioId] = useState('interest_rate');
  const [severityLevel, setSeverityLevel] = useState('moderate'); // 'mild', 'moderate', 'severe'

  // Extract baseline financial inputs safely
  const availableFacts = activeAssessment?.available_facts || activeAssessment?.business_input || {};
  const monthlyRevenue = Number(availableFacts.monthly_revenue || availableFacts.revenue || 450000);
  const monthlyOperatingCost = Number(availableFacts.monthly_operational_cost || availableFacts.operational_cost || 280000);
  const loanBalance = Number(availableFacts.outstanding_loan_balance || availableFacts.loan_balance || 500000);
  const monthlyLoanRepayment = Number(availableFacts.monthly_loan_repayment || 35000);
  const cashReserve = Number(availableFacts.cash_reserve || availableFacts.available_cash || 200000);

  // Defined Scenarios with explicit assumptions
  const scenarioDefinitions = {
    interest_rate: {
      id: 'interest_rate',
      title: 'Interest-Rate Increase',
      icon: Percent,
      description: 'Stress-test debt service obligations under Central Bank of Sri Lanka policy rate adjustments.',
      affectedDimension: 'Credit Risk & Liquidity Risk',
      levels: {
        mild: { label: '+1.5% Rate Hike', rateDelta: 0.015, prob: 'Likely' },
        moderate: { label: '+3.0% Rate Hike', rateDelta: 0.030, prob: 'Moderate' },
        severe: { label: '+5.0% Rate Hike', rateDelta: 0.050, prob: 'Plausible Stress' }
      },
      calculate: (level) => {
        const delta = scenarioDefinitions.interest_rate.levels[level].rateDelta;
        const additionalMonthlyInterest = (loanBalance * delta) / 12;
        const newMonthlyRepayment = monthlyLoanRepayment + additionalMonthlyInterest;
        const repaymentIncreasePct = monthlyLoanRepayment > 0 ? (additionalMonthlyInterest / monthlyLoanRepayment) * 100 : 0;
        const annualAdditionalCost = additionalMonthlyInterest * 12;

        return {
          baselineMetric: `Monthly Repayment: ${formatLKR(monthlyLoanRepayment)}`,
          impactMetric: `New Repayment: ${formatLKR(newMonthlyRepayment)} (+${formatLKR(additionalMonthlyInterest)}/mo)`,
          secondaryImpact: `Annual Additional Debt Service: ${formatLKR(annualAdditionalCost)}`,
          riskLevelShift: level === 'severe' ? 'High' : 'Medium',
          suggestedResponse: 'Approach lending institution to discuss fixed-rate conversion or tenure extension. Maintain a dedicated 3-month debt service reserve in an interest-bearing account.'
        };
      }
    },
    inflation: {
      id: 'inflation',
      title: 'Inflation & Input Cost Surge',
      icon: Flame,
      description: 'Simulate margin compression from raw material, utility, and freight inflation in Sri Lanka.',
      affectedDimension: 'Inflation Risk',
      levels: {
        mild: { label: '+8% Cost Rise (5% Passthrough)', costPct: 0.08, passPct: 0.05, prob: 'Likely' },
        moderate: { label: '+15% Cost Rise (8% Passthrough)', costPct: 0.15, passPct: 0.08, prob: 'Moderate' },
        severe: { label: '+25% Cost Rise (10% Passthrough)', costPct: 0.25, passPct: 0.10, prob: 'Severe Stress' }
      },
      calculate: (level) => {
        const { costPct, passPct } = scenarioDefinitions.inflation.levels[level];
        const addedMonthlyCost = monthlyOperatingCost * costPct;
        const addedMonthlyRevenue = monthlyRevenue * passPct;
        const netMonthlyProfitDelta = addedMonthlyRevenue - addedMonthlyCost;
        const newOperatingCost = monthlyOperatingCost + addedMonthlyCost;
        const newNetCashflow = (monthlyRevenue + addedMonthlyRevenue) - newOperatingCost;

        return {
          baselineMetric: `Operating Costs: ${formatLKR(monthlyOperatingCost)}/mo`,
          impactMetric: `New Costs: ${formatLKR(newOperatingCost)}/mo (+${formatLKR(addedMonthlyCost)})`,
          secondaryImpact: `Net Monthly Margin Impact: -${formatLKR(Math.abs(netMonthlyProfitDelta))}/mo`,
          riskLevelShift: level === 'mild' ? 'Medium' : 'High',
          suggestedResponse: 'Lock in 90-day wholesale supply contracts. Explore domestic supplier alternatives for imported inputs to insulate against foreign exchange and tariff fluctuations.'
        };
      }
    },
    demand_slump: {
      id: 'demand_slump',
      title: 'Reduced Customer Demand',
      icon: TrendingDown,
      description: 'Assess operating cash flow resilience during consumer spending contractions or localized competition.',
      affectedDimension: 'Market Risk & Liquidity Risk',
      levels: {
        mild: { label: '-10% Demand Contraction', dropPct: 0.10, prob: 'Likely' },
        moderate: { label: '-20% Demand Contraction', dropPct: 0.20, prob: 'Moderate' },
        severe: { label: '-35% Demand Contraction', dropPct: 0.35, prob: 'Extreme' }
      },
      calculate: (level) => {
        const dropPct = scenarioDefinitions.demand_slump.levels[level].dropPct;
        const lostMonthlyRevenue = monthlyRevenue * dropPct;
        const newMonthlyRevenue = monthlyRevenue - lostMonthlyRevenue;
        const remainingCashBufferMonths = monthlyOperatingCost > 0 
          ? (cashReserve / (monthlyOperatingCost - (newMonthlyRevenue * 0.4))).toFixed(1) 
          : '3.0';

        return {
          baselineMetric: `Baseline Monthly Revenue: ${formatLKR(monthlyRevenue)}`,
          impactMetric: `Stressed Revenue: ${formatLKR(newMonthlyRevenue)} (-${formatLKR(lostMonthlyRevenue)}/mo)`,
          secondaryImpact: `Estimated Cash Runway: ~${remainingCashBufferMonths} months`,
          riskLevelShift: level === 'severe' ? 'High' : 'Medium',
          suggestedResponse: 'Pivot sales toward online delivery and corporate wholesale pre-orders. Reduce discretionary operational overhead immediately to lower the monthly break-even threshold.'
        };
      }
    },
    supplier_disruption: {
      id: 'supplier_disruption',
      title: 'Key Supplier Disruption',
      icon: Truck,
      description: 'Model inventory stockout and delivery delay risks when a critical tier-1 supplier delays deliveries.',
      affectedDimension: 'Operational Risk',
      levels: {
        mild: { label: '7-Day Lead Time Delay', delayDays: 7, orderLossPct: 0.05, prob: 'Likely' },
        moderate: { label: '14-Day Lead Time Delay', delayDays: 14, orderLossPct: 0.15, prob: 'Moderate' },
        severe: { label: '30-Day Delay / 50% Shortage', delayDays: 30, orderLossPct: 0.30, prob: 'Severe' }
      },
      calculate: (level) => {
        const { delayDays, orderLossPct } = scenarioDefinitions.supplier_disruption.levels[level];
        const unfulfilledSales = monthlyRevenue * orderLossPct;

        return {
          baselineMetric: `Normal Supplier Lead Time: 3–5 Days`,
          impactMetric: `Stressed Delay: +${delayDays} Days Lead Time`,
          secondaryImpact: `Estimated Revenue at Risk: ${formatLKR(unfulfilledSales)}/mo`,
          riskLevelShift: level === 'mild' ? 'Low' : level === 'moderate' ? 'Medium' : 'High',
          suggestedResponse: 'Maintain a minimum 21-day inventory safety stock for critical raw materials. Identify and pre-qualify at least one backup local vendor in Western Province.'
        };
      }
    }
  };

  const activeScenario = scenarioDefinitions[selectedScenarioId];
  const results = activeScenario.calculate(severityLevel);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Title & Context */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sliders size={20} style={{ color: 'var(--primary-green)' }} />
          Scenario Stress-Test &amp; Sensitivity Analysis
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem', margin: 0 }}>
          Evaluate how macroeconomic shifts, price fluctuations, and operational shocks would impact your business risk profile.
        </p>
      </div>

      {/* Illustrative Disclaimer Alert */}
      <div style={{
        background: 'var(--bg-subtle)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-sm)',
        padding: '0.75rem 1rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.65rem'
      }}>
        <Info size={17} style={{ color: 'var(--accent-blue)', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--text-primary)' }}>Illustrative Sensitivity Modeling:</strong> Scenarios use standard deterministic financial stress models applied to your business’s confirmed baseline figures. These calculations represent prospective resilience planning, not historical guarantees.
        </div>
      </div>

      {/* Scenario Selector Cards */}
      <div className="grid-4">
        {Object.values(scenarioDefinitions).map((s) => {
          const Icon = s.icon;
          const isSelected = selectedScenarioId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSelectedScenarioId(s.id)}
              style={{
                background: isSelected ? 'var(--primary-green-subtle)' : 'var(--bg-surface)',
                border: isSelected ? '1.5px solid var(--primary-green)' : '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Icon size={18} style={{ color: isSelected ? 'var(--primary-green)' : 'var(--text-secondary)' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {s.title}
                </span>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                {s.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Selected Scenario Controls & Results */}
      <div className="content-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Active Scenario Simulation
            </span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.2rem 0 0 0' }}>
              {activeScenario.title}
            </h3>
          </div>

          {/* Severity Level Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'var(--bg-subtle)', padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            {['mild', 'moderate', 'severe'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSeverityLevel(lvl)}
                style={{
                  background: severityLevel === lvl ? 'var(--bg-surface)' : 'transparent',
                  border: severityLevel === lvl ? '1px solid var(--border-color)' : 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: severityLevel === lvl ? 600 : 500,
                  color: severityLevel === lvl ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Assumption Badge */}
        <div style={{ marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Assumed Shift: </span>
          <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
            {activeScenario.levels[severityLevel].label}
          </strong>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
            ({activeScenario.levels[severityLevel].prob} likelihood)
          </span>
        </div>

        {/* Impact Comparison Grid */}
        <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
          <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Current Baseline
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
              {results.baselineMetric}
            </div>
          </div>

          <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Stressed Financial Impact
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--risk-high)', marginTop: '0.35rem' }}>
              {results.impactMetric}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {results.secondaryImpact}
            </div>
          </div>

          <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Most Affected Dimension
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
              {activeScenario.affectedDimension}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Projected Severity: <strong>{results.riskLevelShift}</strong>
            </div>
          </div>
        </div>

        {/* Suggested Response Recommendation */}
        <div style={{
          background: 'var(--primary-green-subtle)',
          border: '1px solid var(--primary-green-border)',
          borderRadius: 'var(--radius-sm)',
          padding: '1rem 1.25rem'
        }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary-green)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem' }}>
            Recommended Resilience Response
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>
            {results.suggestedResponse}
          </p>
        </div>
      </div>
    </div>
  );
}
