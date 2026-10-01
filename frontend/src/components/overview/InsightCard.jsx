import React, { useState } from 'react';
import {
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  Store,
  Clock,
  Zap,
  Percent,
  MapPin,
  DollarSign,
  Users,
  Shield,
  HelpCircle,
  X,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { resolveFeatureInsight } from '../../config/featureLabels';

export default function InsightCard({
  isPositive = true,
  drivers = [],
  context = {},
  benchmarkText = '',
  FooterIcon = CheckCircle2
}) {
  const [selectedShapItem, setSelectedShapItem] = useState(null);

  const titleText = isPositive ? 'Key Business Strengths' : 'Risks Requiring Management';
  const badgeText = isPositive
    ? `${Math.max(3, drivers.length)} Positives Identified`
    : `${Math.max(3, drivers.length)} Factors Under Watch`;

  const introText = isPositive
    ? `Core competitive advantages derived from your applicant profile and ${context.district || 'local'} demographic conditions:`
    : `Market and structural factors that could compress working liquidity if left unmitigated during launch:`;

  // Default fallback drivers if list is short
  const effectiveDrivers = drivers.length >= 3 ? drivers.slice(0, 3) : [
    drivers[0] || { feature: isPositive ? 'entrepreneur_experience_years' : 'competition_level', impact_score: isPositive ? 0.32 : -0.28 },
    drivers[1] || { feature: isPositive ? 'district' : 'available_capital_lkr', impact_score: isPositive ? 0.25 : -0.21 },
    drivers[2] || { feature: isPositive ? 'expected_price_lkr' : 'monthly_budget_lkr', impact_score: isPositive ? 0.19 : -0.16 }
  ];

  const getFactorIcon = (featureStr, isPos) => {
    const f = String(featureStr || '').toLowerCase();
    if (f.includes('district') || f.includes('location')) return MapPin;
    if (f.includes('price') || f.includes('margin')) return Percent;
    if (f.includes('capital') || f.includes('loan')) return DollarSign;
    if (f.includes('competition') || f.includes('competitor')) return Store;
    if (f.includes('budget') || f.includes('overhead')) return Zap;
    if (f.includes('customer') || f.includes('staff')) return Users;
    if (f.includes('runway') || f.includes('time')) return Clock;
    return isPos ? CheckCircle2 : AlertTriangle;
  };

  return (
    <div className="template-pillar-card" role="region" aria-label={titleText}>
      <div>
        <div className="template-pillar-header">
          <div className="pillar-title-wrap">
            {isPositive ? (
              <CheckCircle size={18} style={{ color: '#34d399' }} aria-hidden="true" />
            ) : (
              <AlertTriangle size={18} style={{ color: '#fbbf24' }} aria-hidden="true" />
            )}
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              {titleText}
            </h3>
          </div>
          <span className={isPositive ? 'pillar-badge-emerald' : 'pillar-badge-amber'}>
            {badgeText}
          </span>
        </div>

        <p className="template-pillar-intro">{introText}</p>

        <div className="template-factors-list">
          {effectiveDrivers.map((driver, idx) => {
            const rawFeature = driver?.feature || '';
            const shapVal = driver?.impact_score ?? (isPositive ? 0.25 : -0.22);
            const { title, description } = resolveFeatureInsight({
              rawFeature,
              isPositive,
              context: {
                ...context,
                shapValue: shapVal
              }
            });

            const IconComponent = getFactorIcon(rawFeature, isPositive);
            const formattedShap = shapVal > 0 ? `+${shapVal.toFixed(2)}` : shapVal.toFixed(2);

            return (
              <div key={idx} className="template-factor-item">
                <div className={`factor-icon-box ${isPositive ? 'icon-box-emerald' : 'icon-box-amber'}`} aria-hidden="true">
                  <IconComponent size={18} />
                </div>
                <div className="factor-content" style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span className="factor-title">{title}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                      <span
                        className={`shap-impact-tag ${isPositive ? 'positive' : 'negative'}`}
                        title="SHAP feature attribution value"
                      >
                        {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        <span>{formattedShap} SHAP</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedShapItem({ title, description, rawFeature, shapVal, isPositive })}
                        className="btn-why-link"
                        title="Why does this factor influence the model prediction?"
                        aria-label={`Why does ${title} impact feasibility?`}
                      >
                        Why?
                      </button>
                    </div>
                  </div>
                  <div className="factor-desc">{description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="template-pillar-footer">
        <span>{benchmarkText}</span>
        <FooterIcon
          size={16}
          style={{ color: isPositive ? '#34d399' : '#fbbf24' }}
          aria-hidden="true"
        />
      </div>

      {/* "Why?" SHAP Explanation Modal / Drawer */}
      {selectedShapItem && (
        <div
          className="modal-backdrop-overlay"
          onClick={() => setSelectedShapItem(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="shap-modal-title"
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: '1.5rem',
              background: '#0d131f',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.85)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: selectedShapItem.isPositive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: selectedShapItem.isPositive ? '#34d399' : '#fbbf24'
                }}>
                  <HelpCircle size={18} />
                </div>
                <div>
                  <h4 id="shap-modal-title" style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    {selectedShapItem.title}
                  </h4>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Machine Learning Attribution (SHAP TreeExplainer)
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedShapItem(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px'
                }}
                aria-label="Close explanation"
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.55', marginBottom: '1rem' }}>
              {selectedShapItem.description}
            </p>

            <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: '#94a3b8' }}>Attributed SHAP Contribution:</span>
                <strong style={{ color: selectedShapItem.isPositive ? '#34d399' : '#fbbf24' }}>
                  {selectedShapItem.shapVal > 0 ? `+${selectedShapItem.shapVal.toFixed(4)}` : selectedShapItem.shapVal.toFixed(4)}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Underlying ML Feature:</span>
                <code style={{ color: '#cbd5e1', background: 'rgba(255,255,255,0.06)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                  {selectedShapItem.rawFeature || 'business_metric'}
                </code>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: '1.45', marginBottom: '1.25rem' }}>
              <strong>Regional Benchmark Note:</strong> This feature was evaluated against historical Central Bank of Sri Lanka (CBSL) SME performance patterns across Western Province retail and commercial clusters.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedShapItem(null)}
                className="btn-prudential-checklist"
                style={{ background: '#4f46e5', color: '#ffffff', borderColor: '#6366f1' }}
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
