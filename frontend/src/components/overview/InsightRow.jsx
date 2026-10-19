import React from 'react';
import {
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
  const rawFeature = driver?.feature || '';
  const shapVal = Number(driver?.impact_score ?? (isPositive ? 0.05 : -0.04));
  const absShap = Math.abs(shapVal);

  const impactLevel = absShap >= 0.045 ? 'High' : absShap >= 0.02 ? 'Medium' : 'Low';

  const { title } = resolveFeatureInsight({
    rawFeature,
    isPositive,
    context: {
      ...context,
      shapValue: shapVal
    }
  });

  const IconComponent = getFactorIcon(rawFeature, isPositive);

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
      </div>
    </div>
  );
}
