import React from 'react';
import { 
  Sliders, 
  GitBranch, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  ArrowRight, 
  Sparkles, 
  Target, 
  ShieldCheck, 
  Compass, 
  BarChart2, 
  FileCheck 
} from 'lucide-react';
import PlanSection from './PlanSection';
import ScenarioCard from './ScenarioCard';
import RoadmapPhase from './RoadmapPhase';
import KpiTable from './KpiTable';
import { formatCurrency } from '../../utils/formatters';

export default function PlanSection05ScenariosRoadmap({ 
  profile, 
  isOpen = false, 
  onToggle 
}) {
  const personalizedPlan = profile?.personalized_business_plan || {};
  const whatIfProfile = profile?.what_if_analysis || {};
  const counterfactualProfile = profile?.counterfactual || {};
  const sec05 = personalizedPlan.section_05_scenario_action_roadmap || {};

  // 5.1 & 5.2 What-If Scenarios
  const scenarios = sec05.what_if_analysis?.scenarios || (Array.isArray(whatIfProfile) ? whatIfProfile : whatIfProfile?.scenarios) || [];
  
  // 5.3 Counterfactual Analysis
  const cf = sec05.counterfactual_analysis || {
    variable_tested: 'Available Capital (LKR)',
    target_condition: 'Feasible (≥ 50% Probability)',
    counterfactual_found: counterfactualProfile.counterfactual_found ?? false,
    target_outcome: counterfactualProfile.target_outcome || 'Feasible',
    required_capital_lkr: counterfactualProfile.required_capital_lkr,
    additional_capital_needed_lkr: counterfactualProfile.additional_capital_needed_lkr,
    recommendation: counterfactualProfile.recommendation || 'Maintain balanced capital allocation and preserve operating runway.'
  };

  // 5.4 4-Phase Roadmap
  const roadmap = sec05.personalized_action_roadmap || {
    phase_0_to_30_days: [
      'Establish operating workspace and essential equipment setup.',
      'Procure initial startup inventory and verify supplier delivery terms.',
      'Configure customer communication channels and local ordering procedures.',
      'Establish daily cash recording and operating expenditure controls.'
    ],
    phase_30_to_90_days: [
      'Launch initial promotional campaigns to attain customer targets.',
      'Closely monitor monthly operational burn rate against budget.',
      'Gather initial customer feedback on pricing and satisfaction.'
    ],
    phase_3_to_6_months: [
      'Audit working capital buffer and refine stock reordering.',
      'Review retention metrics and repeat footfall patterns.',
      'Optimize supplier payment terms.'
    ],
    phase_6_to_12_months: [
      'Assess local expansion or service extensions.',
      'Re-run SME360 AI Feasibility pipeline with real operational figures.',
      'Reinvest operating surplus into productivity-enhancing equipment.'
    ]
  };

  // 5.5 Measurable KPIs / Management Monitoring Measures
  const kpis = sec05.management_monitoring_measures || sec05.measurable_kpis || [
    { kpi_name: 'Monthly Gross Sales', target: 'Per financial plan assumptions', frequency: 'Monthly', type: 'Financial' },
    { kpi_name: 'Daily Customer Count', target: 'Target footfall benchmark', frequency: 'Daily', type: 'Operational' },
    { kpi_name: 'Operating Budget Compliance', target: 'Within monthly operating budget', frequency: 'Monthly', type: 'Cost Control' },
    { kpi_name: 'Simplified Budget Coverage', target: 'Monitor capital-to-budget buffer', frequency: 'Monthly', type: 'Liquidity' },
    { kpi_name: 'Customer Retention Tracking', target: 'Establish repeat customer baseline during initial 90 days', frequency: 'Monthly', type: 'Customer Retention' }
  ];

  // 5.6 Operational Constraints & Management Considerations
  const constraints = sec05.operational_constraints_and_management_considerations || sec05.business_constraints_and_mitigation || [
    { constraint: 'Capital Allocation & Cash Buffer', mitigation: 'Enforce strict working capital controls and maintain lean inventory levels.' },
    { constraint: 'Staff Capacity Shortage', mitigation: 'Establish standardized operating checklists and cross-train existing personnel.' },
    { constraint: 'Equipment Readiness', mitigation: 'Prioritize vital core fixtures and arrange supplier warranties.' },
    { constraint: 'Local Competitor Saturation', mitigation: 'Execute clear service differentiation and introduce repeat customer perks.' },
    { constraint: 'Customer Demand Uncertainty', mitigation: 'Produce controlled initial batches and monitor daily sales velocities.' }
  ];

  return (
    <PlanSection
      id="section-05"
      number="05"
      title="Scenario Analysis & Action Roadmap"
      icon={Sliders}
      description="What-If sensitivity testing, counterfactual boundaries, 4-phase execution roadmap, measurable KPIs, and operational constraints"
      isOpen={isOpen}
      onToggle={onToggle}
    >
      {/* 5.1 & 5.2 What-If Empirical Scenario Analysis */}
      <div className="bp-narrative-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#0284c7', fontWeight: 700 }}>
            5.1 & 5.2 What-If Empirical Scenario Analysis
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)' }}>
            Multi-class re-inference via Random Forest
          </span>
        </div>

        <p className="bp-narrative-text" style={{ fontSize: '0.84rem', lineHeight: 1.5, margin: '0 0 0.85rem 0' }}>
          The following scenarios were simulated by perturbing specific operational variables through the validated Random Forest classifier to measure feasibility probability shifts.
        </p>

        {scenarios.length > 0 ? (
          <div className="bp-scenarios-grid">
            {scenarios.map((sc, idx) => (
              <ScenarioCard key={idx} scenario={sc} index={idx} />
            ))}
          </div>
        ) : (
          <div className="bp-whatif-empty">
            Baseline sensitivity simulations active. Detailed What-If scenarios available via the Scenario Explorer tab.
          </div>
        )}
      </div>

      {/* 5.3 Counterfactual Boundary Analysis */}
      <div className="bp-counterfactual-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <GitBranch size={15} style={{ color: '#0284c7' }} />
            <span className="bp-counterfactual-title">
              5.3 Counterfactual Boundary Search
            </span>
          </div>
          <span className={`bp-counterfactual-badge ${cf.counterfactual_found ? 'found' : 'unfound'}`}>
            {cf.counterfactual_found ? 'Target Condition Found' : 'Multi-Factor Constraint'}
          </span>
        </div>

        <p className="bp-counterfactual-desc">
          {cf.counterfactual_found ? (
            <>
              Single-variable empirical boundary search identifies that an available capital allocation of{' '}
              <strong className="bp-cf-capital">{formatCurrency(cf.required_capital_lkr)}</strong> (additional{' '}
              <strong className="bp-cf-additional">{formatCurrency(cf.additional_capital_needed_lkr)}</strong>) shifts the decision model into{' '}
              <strong className="bp-cf-outcome">{cf.target_outcome}</strong> feasibility.
            </>
          ) : (
            <>
              The system performed a single-variable capital search within the tested range. The target feasibility condition was not reached through capital modification alone, indicating that demand, location suitability, or team sizing constraints represent co-active hurdles.
            </>
          )}
        </p>

        <div className="bp-caveat-box">
          <strong className="bp-caveat-title">Research Caveat:</strong> Counterfactual analysis computes minimal single-feature perturbations against the trained model decision boundary; it does not constitute a guaranteed commercial optimum.
        </div>
      </div>

      {/* 5.4 4-Phase Personalized Action Roadmap */}
      <div className="bp-narrative-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#0284c7', fontWeight: 700 }}>
            5.4 Phased Implementation Action Roadmap (0–12 Months)
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)' }}>
            Sequenced by operational readiness
          </span>
        </div>

        <div className="bp-roadmap-timeline">
          <RoadmapPhase
            phaseNumber={1}
            phaseTitle="Phase 1: Immediate Launch (0–30 Days)"
            phaseFocus="Statutory, Procurement & Workspace Setup"
            actions={roadmap.phase_0_to_30_days || []}
            variant="blue"
          />

          <RoadmapPhase
            phaseNumber={2}
            phaseTitle="Phase 2: Operational Stabilization (30–90 Days)"
            phaseFocus="Demand Traction & Budget Control"
            actions={roadmap.phase_30_to_90_days || []}
            variant="indigo"
          />

          <RoadmapPhase
            phaseNumber={3}
            phaseTitle="Phase 3: Financial & Operational Review (3–6 Months)"
            phaseFocus="Inventory Optimization & Customer Retention"
            actions={roadmap.phase_3_to_6_months || []}
            variant="amber"
          />

          <RoadmapPhase
            phaseNumber={4}
            phaseTitle="Phase 4: Scaling & Expansion Evaluation (6–12 Months)"
            phaseFocus="Capacity Expansion & Model Re-Audit"
            actions={roadmap.phase_6_to_12_months || []}
            variant="emerald"
          />
        </div>
      </div>

      {/* 5.5 Measurable Operational & Financial KPIs */}
      <div className="bp-narrative-card">
        <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#0284c7', fontWeight: 700, marginBottom: '0.75rem' }}>
          5.5 Measurable Key Performance Indicators (KPIs)
        </div>

        <KpiTable kpis={kpis} />
      </div>

      {/* 5.6 Business Constraints & Mitigation Considerations */}
      <div className="bp-narrative-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#d97706', fontWeight: 700 }}>
            5.6 Business Constraints & Mitigation Considerations
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)' }}>
            Component 1 Operational Hurdles (Non-GNN)
          </span>
        </div>

        <p className="bp-narrative-text" style={{ fontSize: '0.82rem', margin: '0 0 0.75rem 0', lineHeight: 1.45 }}>
          Identified operational bottlenecks and practical management actions tailored to the entrepreneur's operating constraints:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {constraints.map((item, idx) => (
            <div key={idx} className="bp-constraint-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={14} style={{ color: '#d97706', flexShrink: 0 }} />
                <span className="bp-constraint-name">
                  {item.constraint}
                </span>
              </div>
              <div className="bp-constraint-desc">
                <strong className="bp-constraint-mitigation-tag">Mitigation:</strong> {item.mitigation}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PlanSection>
  );
}
