import React from 'react';
import { 
  ShieldCheck, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  BarChart3 
} from 'lucide-react';
import PlanSection from './PlanSection';
import FactorList from './FactorList';
import { FeasibilityBadge } from '../common/Badge';
import { formatConfidence } from '../../utils/formatters';

export default function PlanSection02Feasibility({ 
  profile, 
  isOpen = false, 
  onToggle 
}) {
  const feasibility = profile?.feasibility_analysis || {};
  const explainability = profile?.explainability || {};
  const personalizedPlan = profile?.personalized_business_plan || {};
  const sec02 = personalizedPlan.section_02_ai_feasibility_insights || {};

  const assessment = sec02.feasibility_assessment || {
    final_predicted_label: feasibility.predicted_label || feasibility.prediction || 'Conditionally Feasible',
    confidence_score: feasibility.confidence_score || feasibility.probability_score || 0.65,
    confidence_percentage: `${((feasibility.confidence_score || 0.65) * 100).toFixed(1)}%`,
    probabilities: feasibility.probabilities || {
      'Feasible': 0.25,
      'Conditionally Feasible': 0.65,
      'Infeasible': 0.10
    }
  };

  const predLabel = assessment.final_predicted_label;
  const probs = assessment.probabilities || {};
  const pFeasible = probs['Feasible'] || 0.0;
  const pCond = probs['Conditionally Feasible'] || 0.0;
  const pInfeas = probs['Infeasible'] || 0.0;

  const shapData = sec02.shap_explainability || {
    positive_enablers: (explainability.positive_drivers || []).slice(0, 4),
    negative_hurdles: (explainability.negative_drivers || []).slice(0, 4)
  };

  const insights = sec02.key_insights || {
    strengths: (explainability.positive_drivers || []).slice(0, 3).map(d => `Favorable ${d.feature}: ${d.feature_value || 'Adequate'}`),
    constraints: (explainability.negative_drivers || []).slice(0, 3).map(d => `Constraint in ${d.feature}: ${d.feature_value || 'Requires attention'}`)
  };

  const getFeasibilitySummary = () => {
    const raw = sec02.feasibility_interpretation;
    const isLegacyAcademic = !raw || 
      raw.includes('The feasibility model developed in this study') || 
      raw.includes('Predicted Class Probability:') ||
      raw.includes('multi-dimensional baseline patterns');

    if (!isLegacyAcademic && raw.trim().length > 0) {
      return raw;
    }

    if (predLabel === 'Feasible') {
      return "This business plan is considered Feasible because the venture demonstrates strong foundational readiness across capital, market demand, and operational setup. With sufficient initial capital to cover early operations without debt pressure, healthy local customer demand, and an operational team and equipment setup ready to support steady daily customer flow, the business is well-positioned for sustainable launch and steady cash flow.";
    } else if (predLabel === 'Conditionally Feasible') {
      return "This business plan is considered Conditionally Feasible: while the core business concept shows solid commercial promise, sustainable profitability will require disciplined management of monthly operating expenses, active customer retention, and maintaining a strict cash buffer during the initial launch phase.";
    } else {
      return "This business plan is considered Infeasible under its current assumptions due to significant working capital constraints, high monthly overhead relative to customer footfall, or operational resource gaps. Restructuring initial capital and operating costs is recommended before launching.";
    }
  };

  return (
    <PlanSection
      id="section-02"
      number="02"
      title="AI Feasibility Assessment & Key Insights"
      icon={ShieldCheck}
      description="Trained Random Forest multi-class classification, model probabilities, and SHAP explainable feature attribution"
      isOpen={isOpen}
      onToggle={onToggle}
    >
      {/* 2.1 Feasibility Assessment Card & Probability Distribution */}
      <div className="bp-narrative-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted, #64748b)', fontWeight: 700 }}>
              Random Forest Feasibility Prediction
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
              <FeasibilityBadge label={predLabel} size="large" />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
                Confidence: <strong className="bp-meta-strong">{assessment.confidence_percentage}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Multi-Class Probability Bars */}
        <div style={{ marginBottom: '1.15rem' }}>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted, #64748b)', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <BarChart3 size={13} style={{ color: '#0284c7' }} />
            <span>Multi-Class Prediction Probability Distribution</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* Feasible */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.2rem' }}>
                <span className="bp-prob-name feasible">Feasible</span>
                <span className="bp-prob-pct">{(pFeasible * 100).toFixed(1)}%</span>
              </div>
              <div className="bp-prob-track">
                <div style={{ width: `${pFeasible * 100}%`, height: '100%', background: '#16a34a', borderRadius: '4px', transition: 'width 0.4s ease' }} />
              </div>
            </div>

            {/* Conditionally Feasible */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.2rem' }}>
                <span className="bp-prob-name conditional">Conditionally Feasible</span>
                <span className="bp-prob-pct">{(pCond * 100).toFixed(1)}%</span>
              </div>
              <div className="bp-prob-track">
                <div style={{ width: `${pCond * 100}%`, height: '100%', background: '#ca8a04', borderRadius: '4px', transition: 'width 0.4s ease' }} />
              </div>
            </div>

            {/* Infeasible */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.2rem' }}>
                <span className="bp-prob-name infeasible">Infeasible</span>
                <span className="bp-prob-pct">{(pInfeas * 100).toFixed(1)}%</span>
              </div>
              <div className="bp-prob-track">
                <div style={{ width: `${pInfeas * 100}%`, height: '100%', background: '#dc2626', borderRadius: '4px', transition: 'width 0.4s ease' }} />
              </div>
            </div>
          </div>
        </div>

        {/* 2.2 Feasibility Interpretation Narrative */}
        <div className="bp-interpretation-box">
          {getFeasibilitySummary()}
        </div>
      </div>

      {/* 2.3 SHAP Feature Attribution Cards (Positive Enablers & Negative Hurdles) */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted, #64748b)', fontWeight: 700, marginBottom: '0.25rem' }}>
          2.3 Why Did the AI Give This Result? (SHAP Feature Attribution)
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)', marginBottom: '0.75rem' }}>
          * SHAP identifies empirical factors that contributed to the model prediction (non-causal attribution).
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.85rem' }}>
          {/* Positive Supporting Enablers (+) in green */}
          <FactorList
            title="Positive Supporting Enablers (+)"
            type="positive"
            items={shapData.positive_enablers || []}
            emptyMessage="No positive enablers captured"
          />

          {/* Important Things to Consider */}
          <FactorList
            title="Important Things to Consider"
            type="negative"
            items={shapData.negative_hurdles || []}
            emptyMessage="No critical factors identified"
          />
        </div>
      </div>

      {/* 2.4 Evidence-Based Key Insights (Key Strengths) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
        <div className="bp-insights-box positive">
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#059669', fontWeight: 700, marginBottom: '0.35rem' }}>
            Key Strengths Identified
          </div>
          <ul className="bp-insights-list" role="list">
            {(insights.strengths || []).map((s, idx) => (
              <li key={idx} role="listitem">{s}</li>
            ))}
          </ul>
        </div>
      </div>
    </PlanSection>
  );
}
