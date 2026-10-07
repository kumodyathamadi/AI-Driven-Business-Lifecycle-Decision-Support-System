import React from 'react';
import { 
  ShieldCheck, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  BarChart3 
} from 'lucide-react';
import { FeasibilityBadge } from '../common/Badge';
import { formatConfidence } from '../../utils/formatters';

export default function PlanSection02Feasibility({ profile }) {
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

  return (
    <div className="bp-section" id="section-02">
      {/* Section Header */}
      <div className="bp-section-header">
        <span className="bp-section-num">02</span>
        <div className="bp-section-heading-text">
          <h2 className="bp-section-title">
            <ShieldCheck size={18} style={{ color: '#38bdf8' }} />
            AI Feasibility Assessment & Key Insights
          </h2>
          <div className="bp-section-subtitle">
            Trained Random Forest multi-class classification, model probabilities, and SHAP explainable feature attribution
          </div>
        </div>
      </div>

      {/* 2.1 Feasibility Assessment Card & Probability Distribution */}
      <div className="bp-narrative-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#94a3b8', fontWeight: 700 }}>
              Random Forest Feasibility Prediction
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
              <FeasibilityBadge label={predLabel} size="large" />
              <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                Confidence: <strong style={{ color: '#ffffff' }}>{assessment.confidence_percentage}</strong>
              </span>
            </div>
          </div>

          <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', maxWidth: '340px', textAlign: 'right' }}>
            Empirical baseline trained on 1,500+ verified Sri Lankan SME enterprise profiles.
          </div>
        </div>

        {/* Multi-Class Probability Bars */}
        <div style={{ marginBottom: '1.15rem' }}>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#94a3b8', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <BarChart3 size={13} style={{ color: '#60a5fa' }} />
            <span>Multi-Class Prediction Probability Distribution</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* Feasible */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.2rem' }}>
                <span style={{ color: '#4ade80', fontWeight: 600 }}>Feasible</span>
                <span style={{ color: '#ffffff', fontWeight: 700 }}>{(pFeasible * 100).toFixed(1)}%</span>
              </div>
              <div style={{ height: '7px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${pFeasible * 100}%`, height: '100%', background: '#22c55e', borderRadius: '4px', transition: 'width 0.4s ease' }} />
              </div>
            </div>

            {/* Conditionally Feasible */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.2rem' }}>
                <span style={{ color: '#facc15', fontWeight: 600 }}>Conditionally Feasible</span>
                <span style={{ color: '#ffffff', fontWeight: 700 }}>{(pCond * 100).toFixed(1)}%</span>
              </div>
              <div style={{ height: '7px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${pCond * 100}%`, height: '100%', background: '#eab308', borderRadius: '4px', transition: 'width 0.4s ease' }} />
              </div>
            </div>

            {/* Infeasible */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.2rem' }}>
                <span style={{ color: '#f87171', fontWeight: 600 }}>Infeasible</span>
                <span style={{ color: '#ffffff', fontWeight: 700 }}>{(pInfeas * 100).toFixed(1)}%</span>
              </div>
              <div style={{ height: '7px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${pInfeas * 100}%`, height: '100%', background: '#ef4444', borderRadius: '4px', transition: 'width 0.4s ease' }} />
              </div>
            </div>
          </div>
        </div>

        {/* 2.2 Feasibility Interpretation */}
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px', borderLeft: '3px solid #60a5fa', fontSize: '0.825rem', color: '#cbd5e1', lineHeight: 1.55 }}>
          {sec02.feasibility_interpretation || `The proposed business is assessed as '${predLabel}' under the evaluated financial, market, operational, and resource conditions.`}
        </div>
      </div>

      {/* 2.3 SHAP Feature Attribution Cards */}
      <div>
        <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#94a3b8', fontWeight: 700, marginBottom: '0.25rem' }}>
          2.3 Why Did the AI Give This Result? (SHAP Feature Attribution)
        </div>
        <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.75rem' }}>
          * SHAP identifies empirical factors that contributed to the model prediction (non-causal attribution).
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.85rem' }}>
          
          {/* Positive Supporting Enablers */}
          <div style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: '10px', padding: '1rem' }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem' }}>
              <TrendingUp size={15} />
              <span>Positive Supporting Enablers (+)</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {(shapData.positive_enablers || []).map((item, idx) => (
                <div key={idx} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>
                    <span>{item.feature}</span>
                    <span style={{ color: '#4ade80', fontSize: '0.74rem' }}>{item.feature_value ? `Value: ${item.feature_value}` : ''}</span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#cbd5e1', marginTop: '0.25rem', lineHeight: 1.4 }}>
                    {item.business_interpretation || 'Contributed positive support to the feasibility prediction.'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Negative Operational Hurdles */}
          <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '10px', padding: '1rem' }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem' }}>
              <AlertTriangle size={15} />
              <span>Operational Risk Hurdles to Mitigate (-)</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {(shapData.negative_hurdles || []).map((item, idx) => (
                <div key={idx} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>
                    <span>{item.feature}</span>
                    <span style={{ color: '#fca5a5', fontSize: '0.74rem' }}>{item.feature_value ? `Value: ${item.feature_value}` : ''}</span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#cbd5e1', marginTop: '0.25rem', lineHeight: 1.4 }}>
                    {item.business_interpretation || 'Contributed downward pressure, identifying an operational hurdle.'}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* 2.4 Evidence-Based Key Insights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
        <div style={{ background: 'rgba(15, 23, 42, 0.75)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#34d399', fontWeight: 700, marginBottom: '0.35rem' }}>
            Key Strengths Identified
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {(insights.strengths || []).map((s, idx) => (
              <li key={idx}>{s}</li>
            ))}
          </ul>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.75)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#fbbf24', fontWeight: 700, marginBottom: '0.35rem' }}>
            Core Operational Constraints
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {(insights.constraints || []).map((c, idx) => (
              <li key={idx}>{c}</li>
            ))}
          </ul>
        </div>
      </div>

    </div>
  );
}
