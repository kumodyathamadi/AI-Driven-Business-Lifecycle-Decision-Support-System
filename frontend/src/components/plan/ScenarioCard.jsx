import React from 'react';
import { Sliders, TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
import { FeasibilityBadge } from '../common/Badge';

export default function ScenarioCard({ scenario, index }) {
  if (!scenario) return null;

  const title = scenario.title || scenario.scenario_name || `Scenario ${index !== undefined ? index + 1 : ''}`;
  const predLabel = scenario.new_prediction || scenario.predicted_label || 'Conditionally Feasible';
  
  const rawDelta = scenario.viability_delta ?? scenario.feasibility_delta ?? scenario.probability_delta ?? 0;
  const deltaNum = typeof rawDelta === 'number' ? rawDelta : parseFloat(rawDelta) || 0;
  const isPositive = deltaNum > 0.001;
  const isNegative = deltaNum < -0.001;
  const deltaStr = `${isPositive ? '+' : ''}${(deltaNum * 100).toFixed(1)}%`;

  // Format modification tags
  const formatModifications = (mods) => {
    if (!mods) return 'Simulated parameter adjustment';
    if (typeof mods === 'string') return mods;
    return Object.entries(mods).map(([k, v]) => {
      const cleanKey = k.replace(/_/g, ' ').replace(/lkr/i, '(LKR)');
      const cleanVal = typeof v === 'number' ? v.toLocaleString() : v;
      return `${cleanKey}: ${cleanVal}`;
    }).join(' • ');
  };

  const modsText = formatModifications(scenario.modifications);
  const impact = scenario.impact_summary || scenario.decision_impact || scenario.rationale || 'Decision model shift observed.';

  return (
    <div className={`bp-scenario-card ${isPositive ? 'positive' : isNegative ? 'negative' : 'neutral'}`}>
      <div className="bp-scenario-card-header">
        <div className="bp-scenario-title-area">
          <div className="bp-scenario-icon-wrapper">
            <Sliders size={16} />
          </div>
          <div>
            <h4 className="bp-scenario-title">{title}</h4>
            <div className="bp-scenario-mods">{modsText}</div>
          </div>
        </div>

        <div className="bp-scenario-outcome">
          <FeasibilityBadge label={predLabel} size="small" />
          <div className={`bp-scenario-delta-badge ${isPositive ? 'positive' : isNegative ? 'negative' : 'neutral'}`}>
            {isPositive && <TrendingUp size={13} />}
            {isNegative && <TrendingDown size={13} />}
            {!isPositive && !isNegative && <Minus size={13} />}
            <span>{deltaStr}</span>
          </div>
        </div>
      </div>

      <div className="bp-scenario-body">
        <div className="bp-scenario-impact">
          <span className="bp-impact-label">Decision Impact:</span>
          <span className="bp-impact-text">{impact}</span>
        </div>
      </div>
    </div>
  );
}
