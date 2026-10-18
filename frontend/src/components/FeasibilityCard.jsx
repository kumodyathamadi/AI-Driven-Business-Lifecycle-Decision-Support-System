import React from 'react';
import { useOutletContext, useNavigate, useParams, Link } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, XCircle, Award, TrendingUp, AlertOctagon, HelpCircle, ArrowRight } from 'lucide-react';
import ProbabilityChart from './ProbabilityChart';
import { resolveDriverValue } from '../utils/formatters';

export default function FeasibilityCard({ feasibilityData: propFeas }) {
  const ctx = useOutletContext();
  const navigate = useNavigate();
  const { id } = useParams();

  const feasibilityData = propFeas || ctx?.profile?.feasibility_analysis;
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
    let clean = String(featureStr)
      .replace(/\(\(LKR\)\)/gi, '')
      .replace(/\(LKR\)/gi, '')
      .replace(/_lkr\b/gi, '')
      .replace(/^num__|^cat__/, '')
      .replace(/_/g, ' ')
      .trim();

    const lower = clean.toLowerCase();
    if (lower.includes('available capital') || lower === 'capital') return 'Available Capital';
    if (lower.includes('loan amount') || lower === 'loan') return 'Requested Loan Amount';
    if (lower.includes('monthly budget') || lower === 'budget') return 'Monthly Operating Budget';
    if (lower.includes('initial inventory') || lower.includes('inventory cost')) return 'Initial Inventory Cost';
    if (lower.includes('expected price') || lower === 'price') return 'Expected Product Price';
    if (lower.includes('customer') && lower.includes('day')) return 'Expected Daily Customers';
    if (lower.includes('customer demand') || lower.includes('demand score')) return 'Customer Demand Index (1–100)';
    if (lower.includes('experience')) return 'Entrepreneur Experience';
    if (lower.includes('available equipment')) return 'Available Equipment Readiness (1–5)';
    if (lower.includes('required equipment')) return 'Required Equipment Readiness (1–5)';
    if (lower.includes('supplier availability') || lower.includes('supplier')) return 'Supplier Availability Index (1–5)';
    if (lower.includes('location suitability') || lower.includes('location score')) return 'Location Suitability Index (1–5)';
    if (lower.includes('available staff')) return 'Available Staff Count';
    if (lower.includes('required staff')) return 'Required Staff Count';
    if (lower.includes('business stage') || lower === 'stage') return 'Business Stage';
    if (lower.includes('proposed action') || lower === 'action') return 'Proposed Action';
    if (lower.includes('competition level') || lower === 'competition') return 'Competition Level';
    if (lower.includes('operating days')) return 'Operating Days / Month';
    if (lower.includes('district')) return 'District Location';

    return clean.replace(/\b(\w)/g, (c) => c.toUpperCase());
  };

  const formatDisplayValue = (val) => {
    if (!val || val === 'null' || val === 'undefined') return 'N/A';
    const s = String(val).trim();
    if (s.toLowerCase() === 'start') return 'Start New Enterprise';
    if (s.toLowerCase() === 'expand') return 'Expand / New Branch';
    if (s.toLowerCase() === 'product') return 'New Product / Service Line';
    if (s.toLowerCase() === 'new') return 'New Startup';
    if (s.toLowerCase() === 'existing') return 'Existing Business';
    return s;
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
        <div className="feasibility-explainability-card">
          {/* Header Row */}
          <div className="feasibility-explainability-header">
            <div className="feasibility-explainability-title-group">
              <div className="feasibility-header-icon-box">
                <HelpCircle size={20} />
              </div>
              <div>
                <h3 className="feasibility-explainability-title">
                  Explainability: Why This Score Was Predicted
                </h3>
                <p className="feasibility-explainability-subtitle">
                  Operational, financial, and market factor contributions identified by our ML explainability model.
                </p>
              </div>
            </div>

            {id && (
              <Link 
                to={`/businesses/${id}/insights`}
                className="feasibility-explainability-link"
              >
                <span>Full Technical Attribution</span>
                <ArrowRight size={14} />
              </Link>
            )}
          </div>

          {/* 2-Column Factors Grid */}
          <div className="feasibility-drivers-grid">
            {/* Column 1: Positive Drivers */}
            <div className="feasibility-drivers-box positive">
              <div className="feasibility-drivers-box-header positive">
                <div className="feasibility-box-header-title">
                  <div className="feasibility-box-icon positive">
                    <TrendingUp size={16} />
                  </div>
                  <h4>Key Supporting Factors</h4>
                </div>
                <span className="feasibility-count-pill positive">
                  {positiveDrivers.slice(0, 3).length} Positive Drivers
                </span>
              </div>

              <div className="feasibility-driver-items-list">
                {positiveDrivers.slice(0, 3).map((driver, idx) => {
                  const label = formatFeatureLabel(driver.feature);
                  const rawVal = resolveDriverValue(driver, businessInput);
                  const displayVal = formatDisplayValue(rawVal);
                  const impact = driver.impact_score !== undefined ? Number(driver.impact_score) : null;

                  return (
                    <div key={idx} className="feasibility-driver-item positive">
                      <div className="feasibility-driver-item-top">
                        <span className="feasibility-driver-name">{label}</span>
                        <span className="feasibility-driver-badge positive">
                          + Positive Driver
                        </span>
                      </div>
                      <div className="feasibility-driver-item-bottom">
                        <span className="feasibility-driver-val-label">Value:</span>
                        <strong className="feasibility-driver-val-text">{displayVal}</strong>
                        {impact !== null && (
                          <span className="feasibility-driver-impact positive" title="SHAP Impact Contribution">
                            +{Math.abs(impact).toFixed(3)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Column 2: Negative Risk Drivers */}
            <div className="feasibility-drivers-box negative">
              <div className="feasibility-drivers-box-header negative">
                <div className="feasibility-box-header-title">
                  <div className="feasibility-box-icon negative">
                    <AlertOctagon size={16} />
                  </div>
                  <h4>Key Risk Hurdles</h4>
                </div>
                <span className="feasibility-count-pill negative">
                  {negativeDrivers.slice(0, 3).length} Risk Factors
                </span>
              </div>

              <div className="feasibility-driver-items-list">
                {negativeDrivers.slice(0, 3).map((driver, idx) => {
                  const label = formatFeatureLabel(driver.feature);
                  const rawVal = resolveDriverValue(driver, businessInput);
                  const displayVal = formatDisplayValue(rawVal);
                  const impact = driver.impact_score !== undefined ? Number(driver.impact_score) : null;

                  return (
                    <div key={idx} className="feasibility-driver-item negative">
                      <div className="feasibility-driver-item-top">
                        <span className="feasibility-driver-name">{label}</span>
                        <span className="feasibility-driver-badge negative">
                          - Risk Factor
                        </span>
                      </div>
                      <div className="feasibility-driver-item-bottom">
                        <span className="feasibility-driver-val-label">Value:</span>
                        <strong className="feasibility-driver-val-text">{displayVal}</strong>
                        {impact !== null && (
                          <span className="feasibility-driver-impact negative" title="SHAP Impact Contribution">
                            -{Math.abs(impact).toFixed(3)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

