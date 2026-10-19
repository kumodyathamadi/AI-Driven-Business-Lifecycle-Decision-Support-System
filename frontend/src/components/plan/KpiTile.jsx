import React from 'react';

/**
 * KpiTile - Reusable metric snapshot tile for business plan key figures
 * @param {string} label - Title label (e.g. Target Capital, Feasibility)
 * @param {React.ReactNode} value - Formatted value or text
 * @param {string} helper - One-line plain-English explanatory helper
 * @param {React.ReactNode} icon - Lucide icon
 * @param {string} variant - Theme color ('blue', 'emerald', 'indigo', 'amber', 'purple', 'teal')
 */
export default function KpiTile({
  label,
  value,
  helper,
  icon: Icon,
  variant = 'blue'
}) {
  const iconColors = {
    blue: '#3b82f6',
    emerald: '#10b981',
    indigo: '#6366f1',
    amber: '#f59e0b',
    purple: '#a855f7',
    teal: '#14b8a6'
  };

  const iconColor = iconColors[variant] || '#3b82f6';

  return (
    <div className="bp-snapshot-tile">
      <div className="bp-snapshot-tile-header">
        <span className="bp-snapshot-label">{label}</span>
        {Icon && <Icon size={16} style={{ color: iconColor }} className="bp-snapshot-icon" />}
      </div>
      <div className={`bp-snapshot-value val-${variant}`}>
        {value}
      </div>
      {helper && (
        <div className="bp-snapshot-sub">
          {helper}
        </div>
      )}
    </div>
  );
}
