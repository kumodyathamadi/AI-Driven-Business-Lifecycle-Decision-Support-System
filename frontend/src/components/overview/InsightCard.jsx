import React from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import InsightRow from './InsightRow';

export default function InsightCard({
  businessId,
  isPositive = true,
  drivers = [],
  context = {}
}) {
  const titleText = isPositive ? 'Key Business Strengths' : 'Risks Under Watch';
  const totalCount = drivers.length > 0 ? drivers.length : 3;

  // Show only top 3 drivers
  const topDrivers = drivers.slice(0, 3);
  if (topDrivers.length === 0) {
    topDrivers.push({
      feature: isPositive ? 'available_capital_lkr' : 'available_staff_count',
      impact_score: isPositive ? 0.061 : -0.061
    });
    topDrivers.push({
      feature: isPositive ? 'expected_price_lkr' : 'available_equipment_score',
      impact_score: isPositive ? 0.047 : -0.057
    });
    topDrivers.push({
      feature: isPositive ? 'business_stage' : 'competition_level',
      impact_score: isPositive ? 0.043 : -0.012
    });
  }

  return (
    <div className="insight-card-compact" role="region" aria-label={titleText}>
      <div className="insight-card-header">
        <div className="insight-card-title-group">
          {isPositive ? (
            <CheckCircle size={16} style={{ color: '#34d399' }} aria-hidden="true" />
          ) : (
            <AlertTriangle size={16} style={{ color: '#fbbf24' }} aria-hidden="true" />
          )}
          <h3 className="insight-card-heading">{titleText}</h3>
        </div>

        <Link
          to={`/businesses/${businessId}/insights`}
          className="btn-view-all-insights"
          aria-label={`View all ${totalCount} ${titleText.toLowerCase()} in Key Insights tab`}
        >
          <span>View all {totalCount}</span>
          <ArrowRight size={12} aria-hidden="true" />
        </Link>
      </div>

      <div className="insight-rows-list">
        {topDrivers.map((driver, idx) => (
          <InsightRow
            key={idx}
            driver={driver}
            isPositive={isPositive}
            context={context}
          />
        ))}
      </div>
    </div>
  );
}
