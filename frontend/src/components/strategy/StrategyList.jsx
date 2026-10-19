import React from 'react';
import { Check } from 'lucide-react';

/**
 * StrategyList - Master list selector component
 * Mobile: horizontally scrollable list
 * Desktop: stacked vertical tablist
 * Seamlessly follows Dark and Light modes.
 */
export default function StrategyList({
  strategies = [],
  selectedId,
  activeStrategyId,
  onSelect
}) {
  return (
    <div 
      role="tablist" 
      aria-label="Strategies list"
      aria-orientation="vertical"
      className="strategy-master-list"
    >
      {strategies.map((strat, idx) => {
        const stratId = strat.strategy_id || `strat_${idx}`;
        const isSelected = stratId === selectedId;
        const isActiveInPlan = stratId === activeStrategyId || strat.isActive;
        const rank = strat.rank || idx + 1;
        const rawScore = strat.topsis_score !== undefined && strat.topsis_score !== null ? strat.topsis_score : 0.7;
        const score = Math.round(rawScore <= 1 ? rawScore * 100 : rawScore);

        return (
          <button
            key={stratId}
            role="tab"
            id={`tab-${stratId}`}
            aria-controls={`panel-${stratId}`}
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onSelect(stratId)}
            type="button"
            className={`strategy-master-item ${isSelected ? 'selected' : ''}`}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  background: rank === 1 ? '#2563eb' : 'rgba(148, 163, 184, 0.3)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  #{rank}
                </span>
                <span style={{
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: 'var(--text-primary)',
                  lineHeight: 1.2
                }}>
                  {strat.strategy_name}
                </span>
              </div>
              <span style={{
                fontFamily: 'monospace',
                fontWeight: 800,
                fontSize: '0.825rem',
                color: '#3b82f6',
                flexShrink: 0,
                marginLeft: '0.5rem'
              }}>
                {score}/100
              </span>
            </div>

            {/* Score Bar */}
            <div style={{
              width: '100%',
              background: 'rgba(148, 163, 184, 0.2)',
              borderRadius: '9999px',
              height: '6px',
              overflow: 'hidden',
              margin: '0.2rem 0'
            }}>
              <div 
                style={{
                  height: '100%',
                  borderRadius: '9999px',
                  background: rank === 1 ? '#2563eb' : '#64748b',
                  width: `${Math.min(Math.max(score, 5), 100)}%`,
                  transition: 'width 0.3s ease'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {strat.strategic_focus || 'Balanced Growth'}
              </span>

              {isActiveInPlan && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '4px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  flexShrink: 0
                }}>
                  <Check size={10} />
                  <span>Active in Plan</span>
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
