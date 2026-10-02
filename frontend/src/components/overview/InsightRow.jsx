import React, { useState } from 'react';
import {
  HelpCircle,
  X,
  TrendingUp,
  TrendingDown,
  Sparkles,
  MapPin,
  Percent,
  DollarSign,
  Store,
  Zap,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { resolveFeatureInsight } from '../../config/featureLabels';

function getFactorIcon(featureStr, isPositive) {
  const f = String(featureStr || '').toLowerCase();
  if (f.includes('district') || f.includes('location')) return MapPin;
  if (f.includes('price') || f.includes('margin')) return Percent;
  if (f.includes('capital') || f.includes('loan')) return DollarSign;
  if (f.includes('competition') || f.includes('competitor')) return Store;
  if (f.includes('budget') || f.includes('overhead')) return Zap;
  if (f.includes('customer') || f.includes('staff')) return Users;
  if (f.includes('runway') || f.includes('time')) return Clock;
  return isPositive ? CheckCircle2 : AlertTriangle;
}

export default function InsightRow({ driver, isPositive, context }) {
  const [showPopover, setShowPopover] = useState(false);

  const rawFeature = driver?.feature || '';
  const shapVal = Number(driver?.impact_score ?? (isPositive ? 0.05 : -0.04));
  const absShap = Math.abs(shapVal);

  const impactLevel = absShap >= 0.045 ? 'High' : absShap >= 0.02 ? 'Medium' : 'Low';

  const { title, description } = resolveFeatureInsight({
    rawFeature,
    isPositive,
    context: {
      ...context,
      shapValue: shapVal
    }
  });

  const IconComponent = getFactorIcon(rawFeature, isPositive);
  const formattedShap = shapVal > 0 ? `+${shapVal.toFixed(4)}` : shapVal.toFixed(4);

  return (
    <div className="insight-row-item">
      <div className="insight-row-left">
        <div className={`insight-row-icon-box ${isPositive ? 'positive' : 'negative'}`} aria-hidden="true">
          <IconComponent size={14} />
        </div>
        <span className="insight-row-title">{title}</span>
      </div>

      <div className="insight-row-right">
        {/* Compact Impact Chip: High / Medium / Low */}
        <span className={`insight-impact-chip ${isPositive ? 'positive' : 'negative'} ${impactLevel.toLowerCase()}`}>
          {impactLevel}
        </span>

        {/* Why? Popover Trigger */}
        <div className="insight-popover-trigger-wrap">
          <button
            type="button"
            className="btn-why-compact"
            onClick={() => setShowPopover(!showPopover)}
            aria-label={`Why does ${title} impact feasibility?`}
            aria-expanded={showPopover}
          >
            Why?
          </button>

          {showPopover && (
            <div
              className="insight-row-popover"
              role="tooltip"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="insight-popover-top">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Sparkles size={13} style={{ color: isPositive ? '#34d399' : '#fbbf24' }} />
                  <strong>{title}</strong>
                </div>
                <button
                  type="button"
                  className="insight-popover-close-btn"
                  onClick={() => setShowPopover(false)}
                  aria-label="Close"
                >
                  <X size={13} />
                </button>
              </div>

              <p className="insight-popover-desc">
                {description}
              </p>

              <div className="insight-popover-meta">
                <div className="insight-meta-field">
                  <span>SHAP Contribution:</span>
                  <strong style={{ color: isPositive ? '#34d399' : '#fbbf24' }}>
                    {formattedShap}
                  </strong>
                </div>
                <div className="insight-meta-field">
                  <span>ML Feature:</span>
                  <code>{rawFeature || 'business_metric'}</code>
                </div>
              </div>

              <div className="insight-popover-footer">
                Benchmark: CBSL Western Province SME baseline
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
