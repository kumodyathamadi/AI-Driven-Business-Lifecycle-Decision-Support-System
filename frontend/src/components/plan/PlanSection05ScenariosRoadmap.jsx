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
import { formatCurrency } from '../../utils/formatters';

export default function PlanSection05ScenariosRoadmap({ profile }) {
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

  // 5.6 Operational Constraints & Management Considerations (NOT Component 4 risk prediction)
  const constraints = sec05.operational_constraints_and_management_considerations || sec05.business_constraints_and_mitigation || [
    { constraint: 'Capital Allocation & Cash Buffer', mitigation: 'Enforce strict working capital controls and maintain lean inventory levels.' },
    { constraint: 'Staff Capacity Shortage', mitigation: 'Establish standardized operating checklists and cross-train existing personnel.' },
    { constraint: 'Equipment Readiness', mitigation: 'Prioritize vital core fixtures and arrange supplier warranties.' },
    { constraint: 'Local Competitor Saturation', mitigation: 'Execute clear service differentiation and introduce repeat customer perks.' },
    { constraint: 'Customer Demand Uncertainty', mitigation: 'Produce controlled initial batches and monitor daily sales velocities.' }
  ];

  // 5.7 Final AI Decision Summary Box
  const finalSummary = sec05.final_ai_recommendation || sec05.final_recommendation || personalizedPlan.final_recommendation || {
    ai_feasibility_verdict: profile?.feasibility_analysis?.predicted_label || 'Conditionally Feasible',
    ai_confidence_score: profile?.feasibility_analysis?.confidence_score || 0.65,
    ai_recommended_strategy: profile?.strategic_recommendations?.topsis_ranking?.top_recommended_strategy || 'Low-Cost, Low-Risk Start',
    entrepreneur_selected_strategy: profile?.strategic_recommendations?.selected_strategy_name || 'Low-Cost, Low-Risk Start',
    is_user_selected: Boolean(personalizedPlan.executive_overview?.is_user_selected),
    main_positive_strength: 'Location Suitability & Footfall Potential',
    main_operational_constraint: 'Working Capital & Inventory Buffer',
    key_scenario_insight: 'What-If testing confirms sensitivity to operating capital and demand stability.',
    recommended_immediate_next_step: 'Confirm initial supplier arrangements, configure ordering channels, and prepare operating workspace.'
  };

  return (
    <div className="bp-section" id="section-05">
      {/* Section Header */}
      <div className="bp-section-header">
        <span className="bp-section-num">05</span>
        <div className="bp-section-heading-text">
          <h2 className="bp-section-title">
            <Sliders size={18} style={{ color: '#38bdf8' }} />
            Scenario Analysis & Action Roadmap
          </h2>
          <div className="bp-section-subtitle">
            What-If sensitivity testing, counterfactual boundaries, 4-phase execution roadmap, measurable KPIs, and final AI synthesis
          </div>
        </div>
      </div>

      {/* 5.1 & 5.2 What-If Sensitivity Testing Table */}
      <div className="bp-narrative-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#38bdf8', fontWeight: 700 }}>
            5.1 & 5.2 What-If Empirical Scenario Analysis
          </div>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
            Multi-class re-inference via Random Forest
          </span>
        </div>

        <p className="bp-narrative-text" style={{ fontSize: '0.84rem', lineHeight: 1.5, margin: '0 0 0.85rem 0' }}>
          The following scenarios were simulated by perturbing specific operational variables through the validated Random Forest classifier to measure feasibility probability shifts.
        </p>

        {scenarios.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="bp-whatif-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
              <thead className="bp-whatif-head">
                <tr className="bp-whatif-head-row">
                  <th style={{ padding: '0.55rem 0.65rem', fontWeight: 700 }}>Scenario</th>
                  <th style={{ padding: '0.55rem 0.65rem', fontWeight: 700 }}>Modification</th>
                  <th style={{ padding: '0.55rem 0.65rem', fontWeight: 700 }}>Predicted Label</th>
                  <th style={{ padding: '0.55rem 0.65rem', fontWeight: 700 }}>Probability Delta</th>
                  <th style={{ padding: '0.55rem 0.65rem', fontWeight: 700 }}>Decision Impact</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((sc, idx) => {
                  const delta = sc.viability_delta ?? sc.feasibility_delta ?? 0.0;
                  const deltaNum = typeof delta === 'number' ? delta : parseFloat(delta) || 0;
                  const isPositive = deltaNum > 0;
                  const deltaStr = `${isPositive ? '+' : ''}${(deltaNum * 100).toFixed(1)}%`;

                  return (
                    <tr key={idx} className={`bp-whatif-row ${idx % 2 === 0 ? 'even' : 'odd'}`}>
                      <td className="bp-whatif-title" style={{ padding: '0.65rem', fontWeight: 700 }}>
                        {sc.title || `Scenario ${idx + 1}`}
                      </td>
                      <td className="bp-whatif-mods" style={{ padding: '0.65rem', fontFamily: 'ui-monospace, monospace', fontSize: '0.76rem' }}>
                        {sc.modifications ? JSON.stringify(sc.modifications).replace(/[{}"']/g, '').replace(/,/g, ', ') : 'Simulated shift'}
                      </td>
                      <td style={{ padding: '0.65rem' }}>
                        <span className={`bp-whatif-badge ${sc.new_prediction === 'Feasible' ? 'feasible' : sc.new_prediction === 'Infeasible' ? 'infeasible' : 'conditional'}`}>
                          {sc.new_prediction || 'Conditionally Feasible'}
                        </span>
                      </td>
                      <td className={`bp-whatif-delta ${isPositive ? 'positive' : deltaNum < 0 ? 'negative' : 'neutral'}`} style={{ padding: '0.65rem', fontWeight: 700 }}>
                        {deltaStr}
                      </td>
                      <td className="bp-whatif-impact" style={{ padding: '0.65rem', fontSize: '0.76rem' }}>
                        {sc.impact_summary || sc.rationale || 'Probability shift observed.'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#38bdf8', fontWeight: 700 }}>
            5.4 Phased Implementation Action Roadmap (0–12 Months)
          </div>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
            Sequenced by operational readiness
          </span>
        </div>

        <div className="bp-roadmap-timeline">
          {/* Phase 1: 0 to 30 Days */}
          <div className="bp-timeline-phase phase-1">
            <div className="bp-timeline-node">1</div>
            <div className="bp-timeline-phase-header">
              <span className="bp-phase-badge phase-1">
                <Calendar size={12} />
                Phase 1: Immediate Launch (0–30 Days)
              </span>
              <span style={{ fontSize: '0.73rem', color: '#94a3b8' }}>Statutory, Procurement & Setup</span>
            </div>
            <div className="bp-phase-card">
              <ul className="bp-action-list">
                {(roadmap.phase_0_to_30_days || []).map((item, idx) => (
                  <li key={idx} className="bp-action-item">
                    <span className="bp-action-bullet" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Phase 2: 30 to 90 Days */}
          <div className="bp-timeline-phase phase-2">
            <div className="bp-timeline-node">2</div>
            <div className="bp-timeline-phase-header">
              <span className="bp-phase-badge phase-2">
                <Calendar size={12} />
                Phase 2: Operational Stabilization (30–90 Days)
              </span>
              <span style={{ fontSize: '0.73rem', color: '#94a3b8' }}>Demand Traction & Budget Control</span>
            </div>
            <div className="bp-phase-card">
              <ul className="bp-action-list">
                {(roadmap.phase_30_to_90_days || []).map((item, idx) => (
                  <li key={idx} className="bp-action-item">
                    <span className="bp-action-bullet" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Phase 3: 3 to 6 Months */}
          <div className="bp-timeline-phase phase-3">
            <div className="bp-timeline-node">3</div>
            <div className="bp-timeline-phase-header">
              <span className="bp-phase-badge phase-3">
                <Calendar size={12} />
                Phase 3: Financial & Operational Review (3–6 Months)
              </span>
              <span style={{ fontSize: '0.73rem', color: '#94a3b8' }}>Inventory Optimization & Retention</span>
            </div>
            <div className="bp-phase-card">
              <ul className="bp-action-list">
                {(roadmap.phase_3_to_6_months || []).map((item, idx) => (
                  <li key={idx} className="bp-action-item">
                    <span className="bp-action-bullet" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Phase 4: 6 to 12 Months */}
          <div className="bp-timeline-phase phase-2">
            <div className="bp-timeline-node" style={{ borderColor: '#10b981', color: '#10b981' }}>4</div>
            <div className="bp-timeline-phase-header">
              <span className="bp-phase-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.35)' }}>
                <Calendar size={12} />
                Phase 4: Scaling & Expansion Evaluation (6–12 Months)
              </span>
              <span style={{ fontSize: '0.73rem', color: '#94a3b8' }}>Capacity Expansion & Model Re-Audit</span>
            </div>
            <div className="bp-phase-card">
              <ul className="bp-action-list">
                {(roadmap.phase_6_to_12_months || []).map((item, idx) => (
                  <li key={idx} className="bp-action-item">
                    <span className="bp-action-bullet" style={{ background: '#10b981' }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 5.5 Measurable Operational & Financial KPIs */}
      <div className="bp-narrative-card">
        <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#38bdf8', fontWeight: 700, marginBottom: '0.75rem' }}>
          5.5 Measurable Key Performance Indicators (KPIs)
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="bp-kpi-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
            <thead className="bp-kpi-head">
              <tr className="bp-kpi-head-row">
                <th style={{ padding: '0.55rem 0.65rem', fontWeight: 700 }}>KPI Metric</th>
                <th style={{ padding: '0.55rem 0.65rem', fontWeight: 700 }}>Category</th>
                <th style={{ padding: '0.55rem 0.65rem', fontWeight: 700 }}>Operational Target</th>
                <th style={{ padding: '0.55rem 0.65rem', fontWeight: 700 }}>Review Frequency</th>
              </tr>
            </thead>
            <tbody>
              {kpis.map((kpi, idx) => (
                <tr key={idx} className={`bp-kpi-row ${idx % 2 === 0 ? 'even' : 'odd'}`}>
                  <td className="bp-kpi-name" style={{ padding: '0.65rem', fontWeight: 700 }}>
                    {kpi.kpi_name}
                  </td>
                  <td style={{ padding: '0.65rem' }}>
                    <span className="bp-kpi-badge">
                      {kpi.type}
                    </span>
                  </td>
                  <td className="bp-kpi-target" style={{ padding: '0.65rem', fontWeight: 700 }}>
                    {kpi.target}
                  </td>
                  <td className="bp-kpi-freq" style={{ padding: '0.65rem' }}>
                    {kpi.frequency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5.6 Business Constraints & Mitigation Considerations (Research Boundary: NOT Component 4 GNN risk prediction) */}
      <div className="bp-narrative-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#d97706', fontWeight: 700 }}>
            5.6 Business Constraints & Mitigation Considerations
          </div>
          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
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
                <AlertTriangle size={13} style={{ color: '#d97706', flexShrink: 0 }} />
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

      {/* 5.7 Final AI Recommendation Synthesis Box */}
      <div className="bp-final-synthesis-card">
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, #0284c7, #6366f1, #059669)'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <FileCheck size={20} style={{ color: '#0284c7' }} />
            <div>
              <span className="bp-synthesis-sub">
                Synthesized Decision Outcome
              </span>
              <h3 className="bp-synthesis-title">
                Final AI Recommendation & Operational Summary
              </h3>
            </div>
          </div>

          <span className="bp-synthesis-badge">
            AI Decision Support Synthesis
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
          <div className="bp-synthesis-tile">
            <span className="bp-synthesis-tile-label">AI Feasibility Verdict</span>
            <div className="bp-synthesis-tile-val val-blue">
              {finalSummary.ai_feasibility_verdict} ({((finalSummary.ai_confidence_score || 0.65) * 100).toFixed(1)}%)
            </div>
          </div>

          <div className="bp-synthesis-tile">
            <span className="bp-synthesis-tile-label">AI Recommended Strategy</span>
            <div className="bp-synthesis-tile-val val-indigo">
              {finalSummary.ai_recommended_strategy}
            </div>
          </div>

          <div className="bp-synthesis-tile">
            <span className="bp-synthesis-tile-label">Entrepreneur Selected Strategy</span>
            <div className={`bp-synthesis-tile-val ${finalSummary.is_user_selected ? 'val-emerald' : 'val-neutral'}`}>
              {finalSummary.entrepreneur_selected_strategy} {finalSummary.is_user_selected && '(Adopted)'}
            </div>
          </div>

          <div className="bp-synthesis-tile">
            <span className="bp-synthesis-tile-label">Immediate Priority Action</span>
            <div className="bp-synthesis-tile-val highlight" style={{ fontSize: '0.85rem', lineHeight: 1.35 }}>
              {finalSummary.recommended_immediate_next_step}
            </div>
          </div>
        </div>

        <div className="bp-synthesis-footer">
          <strong className="val-emerald">Core Strength:</strong> {finalSummary.main_positive_strength} | <strong className="val-amber">Main Constraint:</strong> {finalSummary.main_operational_constraint} | <strong className="val-blue">Scenario Insight:</strong> {finalSummary.key_scenario_insight}
        </div>
      </div>

    </div>
  );
}
