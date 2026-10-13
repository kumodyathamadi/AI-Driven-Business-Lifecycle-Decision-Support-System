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
    if (label === 'Feasible') return <CheckCircle2 size={22} color="currentColor" />;
    if (label === 'Conditionally Feasible') return <AlertTriangle size={22} color="currentColor" />;
    return <XCircle size={22} color="currentColor" />;
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
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.85rem' }}>
            SME360 AI Predicted Feasibility Outcome
          </div>
          
          <div className={getBadgeClass(predicted_label)} style={{ marginBottom: '1.25rem' }}>
            {getBadgeIcon(predicted_label)}
            <span>{predicted_label}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <Award size={18} style={{ color: '#3b82f6' }} />
            <span>Predicted Class Probability:</span>
            <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>
              {(confidence_score * 100).toFixed(1)}%
            </strong>
          </div>
        </div>

        {/* Probability Distribution Chart Card */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
            Class Probability Distribution
          </h3>
          <ProbabilityChart probabilities={probabilities} />
        </div>
      </div>

      {/* Factor Contributions Explainability Section (Why the score is what it is) */}
      {(positiveDrivers.length > 0 || negativeDrivers.length > 0) && (
        <div className="glass-card feasibility-explainability-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <HelpCircle size={18} style={{ color: '#3b82f6' }} />
                Explainability: Why This Score Was Predicted
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Operational, financial, and market factor contributions identified by our ML explainability model.
              </p>
            </div>

            {id && (
              <Link 
                to={`/businesses/${id}/insights`}
                style={{ fontSize: '0.78rem', color: '#3b82f6', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', textDecoration: 'none', fontWeight: 600 }}
              >
                <span>Full Technical Attribution</span>
                <ArrowRight size={14} />
              </Link>
            )}
          </div>

          <div className="grid-2" style={{ gap: '1rem' }}>
            {/* Positive Drivers */}
            <div className="feasibility-drivers-box positive">
              <h4 className="feasibility-drivers-heading positive">
                <TrendingUp size={16} />
                Key Supporting Factors (+)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {positiveDrivers.slice(0, 3).map((driver, idx) => (
                  <div key={idx} className="feasibility-driver-item positive">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 600 }}>
                      <span className="feasibility-driver-name">{formatFeatureLabel(driver.feature)}</span>
                      <span className="feasibility-driver-badge positive">
                        + Positive Driver
                      </span>
                    </div>
                    <div className="feasibility-driver-value">
                      Value: <strong>{resolveDriverValue(driver, businessInput)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Negative Risk Drivers */}
            <div className="feasibility-drivers-box negative">
              <h4 className="feasibility-drivers-heading negative">
                <AlertOctagon size={16} />
                Key Risk Hurdles (-)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {negativeDrivers.slice(0, 3).map((driver, idx) => (
                  <div key={idx} className="feasibility-driver-item negative">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 600 }}>
                      <span className="feasibility-driver-name">{formatFeatureLabel(driver.feature)}</span>
                      <span className="feasibility-driver-badge negative">
                        - Risk Factor
                      </span>
                    </div>
                    <div className="feasibility-driver-value">
                      Value: <strong>{resolveDriverValue(driver, businessInput)}</strong>
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
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#3b82f6', marginBottom: '0.5rem' }}>
            Executive Feasibility Summary
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            {executiveSummary}
          </p>
        </div>
      )}
    </div>
  );
}

