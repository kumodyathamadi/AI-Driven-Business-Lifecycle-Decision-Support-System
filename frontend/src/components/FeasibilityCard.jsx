import React from 'react';
import { useOutletContext, useNavigate, useParams, Link } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, XCircle, Award, TrendingUp, AlertOctagon, HelpCircle, ArrowRight } from 'lucide-react';
import ProbabilityChart from './ProbabilityChart';
import { resolveDriverValue } from '../utils/formatters';

export default function FeasibilityCard({ feasibilityData: propFeas, executiveSummary: propSummary }) {
  const ctx = useOutletContext();
  const navigate = useNavigate();
  const { id } = useParams();

  const feasibilityData = propFeas || ctx?.profile?.feasibility_analysis;
  const executiveSummary = propSummary || ctx?.profile?.personalized_business_plan?.executive_overview?.business_summary;
  const explainability = ctx?.profile?.explainability || {};
  const positiveDrivers = explainability.positive_drivers || [];
  const negativeDrivers = explainability.negative_drivers || [];
  const businessInput = ctx?.profile?.business_input || ctx?.profile?.input_profile || {};

  if (!feasibilityData) return null;

  const { predicted_label, confidence_score, probabilities } = feasibilityData;

  const getBadgeClass = (label) => {
    if (label === 'Feasible') return 'badge-feasible';
    if (label === 'Conditionally Feasible') return 'badge-conditionally';
    return 'badge-infeasible';
  };

  const getBadgeIcon = (label) => {
    if (label === 'Feasible') return <CheckCircle2 size={22} style={{ color: '#4ade80' }} />;
    if (label === 'Conditionally Feasible') return <AlertTriangle size={22} style={{ color: '#fde047' }} />;
    return <XCircle size={22} style={{ color: '#fca5a5' }} />;
  };

  const formatFeatureLabel = (featureStr) => {
    if (!featureStr) return 'Business Factor';
    return featureStr
      .replace(/_/g, ' ')
      .replace(/\blkr\b/i, '(LKR)')
      .replace(/\bper day\b/i, '/ Day')
      .replace(/\bcount\b/i, 'Count')
      .replace(/\bscore\b/i, 'Index')
      .replace(/\b(\w)/g, (c) => c.toUpperCase());
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="grid-2">
        
        {/* Result Card */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.85rem' }}>
            SME360 AI Predicted Feasibility Outcome
          </div>
          
          <div className={getBadgeClass(predicted_label)} style={{ marginBottom: '1.25rem' }}>
            {getBadgeIcon(predicted_label)}
            <span>{predicted_label}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#cbd5e1' }}>
            <Award size={18} style={{ color: '#60a5fa' }} />
            <span>Predicted Class Probability:</span>
            <strong style={{ color: '#ffffff', fontSize: '1rem' }}>
              {(confidence_score * 100).toFixed(1)}%
            </strong>
          </div>
        </div>

        {/* Probability Distribution Chart Card */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginBottom: '1rem' }}>
            Class Probability Distribution
          </h3>
          <ProbabilityChart probabilities={probabilities} />
        </div>
      </div>

      {/* Factor Contributions Explainability Section (Why the score is what it is) */}
      {(positiveDrivers.length > 0 || negativeDrivers.length > 0) && (
        <div className="glass-card" style={{ border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <HelpCircle size={18} style={{ color: '#60a5fa' }} />
                Explainability: Why This Score Was Predicted
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                Operational, financial, and market factor contributions identified by our ML explainability model.
              </p>
            </div>

            {id && (
              <Link 
                to={`/businesses/${id}/insights`}
                style={{ fontSize: '0.78rem', color: '#60a5fa', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', textDecoration: 'none', fontWeight: 600 }}
              >
                <span>Full Technical Attribution</span>
                <ArrowRight size={14} />
              </Link>
            )}
          </div>

          <div className="grid-2" style={{ gap: '1rem' }}>
            {/* Positive Drivers */}
            <div style={{ background: 'rgba(6, 78, 59, 0.25)', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '1rem', borderRadius: '10px' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                <TrendingUp size={16} />
                Key Supporting Factors (+)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {positiveDrivers.slice(0, 3).map((driver, idx) => (
                  <div key={idx} style={{ background: 'rgba(15, 23, 42, 0.85)', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 600 }}>
                      <span style={{ color: '#f1f5f9' }}>{formatFeatureLabel(driver.feature)}</span>
                      <span style={{ color: '#4ade80', fontSize: '0.72rem', background: 'rgba(34, 197, 94, 0.15)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                        + Positive Driver
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                      Value: <strong style={{ color: '#cbd5e1' }}>{resolveDriverValue(driver, businessInput)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Negative Risk Drivers */}
            <div style={{ background: 'rgba(127, 29, 29, 0.25)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '1rem', borderRadius: '10px' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                <AlertOctagon size={16} />
                Key Risk Hurdles (-)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {negativeDrivers.slice(0, 3).map((driver, idx) => (
                  <div key={idx} style={{ background: 'rgba(15, 23, 42, 0.85)', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 600 }}>
                      <span style={{ color: '#f1f5f9' }}>{formatFeatureLabel(driver.feature)}</span>
                      <span style={{ color: '#fca5a5', fontSize: '0.72rem', background: 'rgba(239, 68, 68, 0.15)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                        - Risk Factor
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                      Value: <strong style={{ color: '#cbd5e1' }}>{resolveDriverValue(driver, businessInput)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Executive Summary */}
      {executiveSummary && (
        <div className="glass-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#60a5fa', marginBottom: '0.5rem' }}>
            Executive Feasibility Summary
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#cbd5e1', lineHeight: '1.6' }}>
            {executiveSummary}
          </p>
        </div>
      )}
    </div>
  );
}

