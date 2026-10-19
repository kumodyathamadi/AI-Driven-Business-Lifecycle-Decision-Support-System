import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function CriteriaCard({ criterion }) {
  if (!criterion) return null;

  const isBenefit = criterion.type === 'Benefit';
  const weightPct = Math.round(Number(criterion.weight || 0) * 100);

  return (
    <div className="strategy-criteria-card">
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.2rem 0.55rem',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: isBenefit ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            color: isBenefit ? '#34d399' : '#fbbf24',
            border: `1px solid ${isBenefit ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`
          }}>
            {isBenefit ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            <span>{criterion.type} ({isBenefit ? 'Higher is better' : 'Lower is better'})</span>
          </span>

          <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.85rem', color: '#3b82f6' }}>
            {weightPct}% Weight
          </span>
        </div>

        <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.35rem 0', lineHeight: 1.3 }}>
          {criterion.criterion}
        </h4>

        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
          {criterion.description}
        </p>
      </div>

      {/* Weight Progress Bar */}
      <div style={{ paddingTop: '0.65rem', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ width: '100%', background: 'rgba(148, 163, 184, 0.2)', borderRadius: '9999px', height: '6px', overflow: 'hidden' }}>
          <div 
            style={{
              height: '100%',
              borderRadius: '9999px',
              background: '#3b82f6',
              width: `${Math.min(Math.max(weightPct * 2.5, 8), 100)}%`,
              transition: 'width 0.3s ease'
            }}
            role="progressbar"
            aria-valuenow={weightPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${criterion.criterion} weight`}
          />
        </div>
      </div>
    </div>
  );
}
