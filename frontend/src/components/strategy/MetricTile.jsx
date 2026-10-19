import React from 'react';

/**
 * MetricTile - Display a single metric with a relative comparison bar across all evaluated strategies.
 * Adapts dynamically to both Dark and Light modes.
 */
export default function MetricTile({
  label,
  formattedValue,
  value = 0,
  maxValue = 1,
  helper,
  icon: Icon,
  variant = 'blue'
}) {
  const safeMax = maxValue > 0 ? maxValue : 1;
  const ratio = Math.min(Math.max((Number(value) / safeMax) * 100, 4), 100);

  const barColors = {
    blue: '#3b82f6',
    indigo: '#6366f1',
    emerald: '#10b981',
    amber: '#f59e0b'
  };

  const activeBarColor = barColors[variant] || '#3b82f6';

  return (
    <div className="strategy-metric-tile">
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {Icon && <Icon size={14} style={{ opacity: 0.8 }} />}
            <span>{label}</span>
          </span>
        </div>
        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          {formattedValue}
        </div>
        {helper && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>{helper}</p>
        )}
      </div>

      <div style={{ paddingTop: '0.65rem', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ width: '100%', background: 'rgba(148, 163, 184, 0.2)', borderRadius: '9999px', height: '6px', overflow: 'hidden' }}>
          <div 
            style={{ 
              height: '100%', 
              borderRadius: '9999px', 
              background: activeBarColor, 
              width: `${ratio}%`,
              transition: 'width 0.3s ease'
            }}
            role="progressbar"
            aria-valuenow={Math.round(ratio)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${label} compared to other strategies`}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
          <span>Bar compares all strategies</span>
          <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{Math.round(ratio)}% of max</span>
        </div>
      </div>
    </div>
  );
}
