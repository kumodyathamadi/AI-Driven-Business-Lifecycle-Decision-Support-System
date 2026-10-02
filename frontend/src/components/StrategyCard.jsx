import React from 'react';
import { CheckCircle2, Sliders, ArrowRight, Sparkles, Check } from 'lucide-react';

export default function StrategyCard({ 
  strategy, 
  rank, 
  isActive = false, 
  onAdopt, 
  onSimulate, 
  isAdopting = false 
}) {
  if (!strategy) return null;

  const isTopRanked = rank === 1;

  return (
    <div 
      className="glass-card" 
      style={{ 
        border: isActive 
          ? '1.5px solid rgba(16, 185, 129, 0.7)' 
          : isTopRanked 
          ? '1px solid rgba(59, 130, 246, 0.6)' 
          : '1px solid var(--border-color)',
        background: isActive 
          ? 'linear-gradient(135deg, rgba(6, 78, 59, 0.25), rgba(15, 23, 42, 0.8))'
          : isTopRanked 
          ? 'rgba(30, 58, 138, 0.25)' 
          : 'rgba(30, 41, 59, 0.65)',
        boxShadow: isActive 
          ? '0 8px 32px rgba(16, 185, 129, 0.2), 0 0 15px rgba(16, 185, 129, 0.1)'
          : isTopRanked 
          ? '0 8px 32px rgba(59, 130, 246, 0.15)' 
          : '0 8px 32px rgba(0, 0, 0, 0.3)',
        marginBottom: '1rem',
        position: 'relative',
        transition: 'all 0.2s ease'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ 
            width: '36px', 
            height: '36px', 
            borderRadius: '8px', 
            background: isActive ? '#059669' : isTopRanked ? '#2563eb' : '#334155', 
            color: '#ffffff', 
            fontWeight: 800, 
            fontSize: '0.9rem',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: isActive ? '0 0 10px rgba(16, 185, 129, 0.4)' : 'none'
          }}>
            #{rank}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                {strategy.strategy_name}
              </h4>
              {isActive && (
                <span style={{ 
                  fontSize: '0.7rem', 
                  fontWeight: 800, 
                  color: '#34d399', 
                  background: 'rgba(16, 185, 129, 0.15)', 
                  border: '1px solid rgba(16, 185, 129, 0.4)', 
                  padding: '0.15rem 0.5rem', 
                  borderRadius: '9999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  <Check size={11} />
                  <span>ACTIVE IN BUSINESS PLAN</span>
                </span>
              )}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 600 }}>
              {strategy.strategic_focus}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ 
            fontSize: '0.8rem', 
            background: '#0f172a', 
            color: '#60a5fa', 
            padding: '0.35rem 0.85rem', 
            borderRadius: '20px', 
            fontFamily: 'monospace', 
            fontWeight: 700, 
            border: '1px solid rgba(59, 130, 246, 0.3)' 
          }}>
            Decision Score: {strategy.topsis_score !== undefined && strategy.topsis_score !== null ? `${Math.round(strategy.topsis_score <= 1 ? strategy.topsis_score * 100 : strategy.topsis_score)}/100` : 'N/A'}
          </span>
        </div>
      </div>

      <p style={{ fontSize: '0.825rem', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '1rem' }}>
        {strategy.operational_approach}
      </p>

      {/* Sizing & Impact Metrics */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '1rem',
        paddingTop: '0.85rem', 
        borderTop: '1px solid var(--border-color)', 
        fontSize: '0.75rem', 
        color: '#94a3b8' 
      }}>
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div>
            <span>Est. Capital: </span>
            <strong style={{ color: '#ffffff' }}>LKR {Number(strategy.estimated_capital_required_lkr || 0).toLocaleString()}</strong>
          </div>
          <div>
            <span>Monthly Budget: </span>
            <strong style={{ color: '#ffffff' }}>LKR {Number(strategy.estimated_monthly_budget_lkr || 0).toLocaleString()}</strong>
          </div>
          <div>
            <span>Target Volume: </span>
            <strong style={{ color: '#ffffff' }}>{strategy.target_daily_customers || 0} / day</strong>
          </div>
          <div>
            <span>Expected Impact: </span>
            <strong style={{ color: '#4ade80' }}>{strategy.expected_feasibility_impact}</strong>
          </div>
        </div>

        {/* HITL Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {onSimulate && (
            <button
              type="button"
              onClick={() => onSimulate(strategy)}
              style={{
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                color: '#a5b4fc',
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.74rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.2s'
              }}
              title="Test this strategy in the interactive What-If Simulator"
            >
              <Sliders size={13} />
              <span>Simulate in What-If</span>
            </button>
          )}

          {onAdopt && (
            isActive ? (
              <span style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#34d399',
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.74rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <CheckCircle2 size={13} />
                <span>Primary Plan Strategy</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onAdopt(strategy)}
                disabled={isAdopting}
                style={{
                  background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.4rem 0.95rem',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: isAdopting ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.35)',
                  transition: 'all 0.2s'
                }}
              >
                <span>Adopt This Strategy</span>
                <ArrowRight size={13} />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
