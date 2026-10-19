import React from 'react';
import { TrendingUp, AlertTriangle } from 'lucide-react';

export default function FactorList({
  title,
  type = 'positive',
  items = [],
  emptyMessage = 'No specific factors identified'
}) {
  const isPositive = type === 'positive';
  const Icon = isPositive ? TrendingUp : AlertTriangle;

  return (
    <div className={`bp-factor-container ${isPositive ? 'positive' : 'negative'}`}>
      <div className={`bp-factor-header ${isPositive ? 'positive' : 'negative'}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon size={16} aria-hidden="true" />
          <h4 className="bp-factor-title">{title}</h4>
        </div>
        <span className={`bp-factor-count ${isPositive ? 'positive' : 'negative'}`}>
          {items.length} {items.length === 1 ? 'factor' : 'factors'}
        </span>
      </div>

      <div className="bp-factor-list" role="list">
        {items.length > 0 ? (
          items.map((item, idx) => (
            <div key={idx} className={`bp-factor-item ${isPositive ? 'positive' : 'negative'}`} role="listitem">
              <div className="bp-factor-item-top">
                <span className="bp-factor-name">{item.feature}</span>
                {item.feature_value !== undefined && item.feature_value !== null && item.feature_value !== '' && (
                  <span className={`bp-factor-badge ${isPositive ? 'positive' : 'negative'}`}>
                    Value: {item.feature_value}
                  </span>
                )}
              </div>
              <p className="bp-factor-desc">
                {item.business_interpretation || (isPositive 
                  ? 'Contributed positive support to the feasibility prediction.' 
                  : 'Contributed downward pressure, identifying an operational hurdle to mitigate.')}
              </p>
            </div>
          ))
        ) : (
          <div className="bp-factor-empty">{emptyMessage}</div>
        )}
      </div>
    </div>
  );
}
