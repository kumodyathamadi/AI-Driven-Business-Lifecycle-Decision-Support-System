import React from 'react';
import { 
  Sparkles, 
  Sliders, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  TrendingUp, 
  Award,
  DollarSign,
  Users,
  Calendar,
  Lightbulb
} from 'lucide-react';
import MetricTile from './MetricTile';
import { formatCurrency, formatCustomersPerDay } from '../../utils/formatters';
import { getFriendlyStrategyName, getHowStrategyWasDeveloped } from '../../utils/strategyHelper';

export default function StrategyDetail({
  strategy,
  strategies = [],
  currentIndex,
  totalCount,
  isActiveInPlan,
  isTopRanked,
  isAdopting,
  onAdopt,
  onSimulate,
  onPrev,
  onNext
}) {
  if (!strategy) return null;

  const rawScore = strategy.topsis_score !== undefined && strategy.topsis_score !== null ? strategy.topsis_score : 0.7;
  const score = Math.round(rawScore <= 1 ? rawScore * 100 : rawScore);

  // Compute maximum values among all strategies for comparative bars
  const maxCapital = Math.max(...strategies.map(s => Number(s.estimated_capital_required_lkr || 0)), 1);
  const maxBudget = Math.max(...strategies.map(s => Number(s.estimated_monthly_budget_lkr || 0)), 1);
  const maxCustomers = Math.max(...strategies.map(s => Number(s.target_daily_customers || 0)), 1);

  const capitalValue = Number(strategy.estimated_capital_required_lkr || 0);
  const budgetValue = Number(strategy.estimated_monthly_budget_lkr || 0);
  const customerValue = Number(strategy.target_daily_customers || 0);

  return (
    <div
      role="tabpanel"
      id={`panel-${strategy.strategy_id}`}
      aria-labelledby={`tab-${strategy.strategy_id}`}
      className="strategy-detail-panel"
    >
      {/* Top Header: Rank, Name, Focus & Large Decision Score */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ flex: '1 1 300px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#60a5fa',
              border: '1px solid rgba(59, 130, 246, 0.3)'
            }}>
              #{strategy.rank || currentIndex + 1} Ranked Strategy
            </span>

            {isTopRanked && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                background: 'rgba(59, 130, 246, 0.2)',
                color: '#93c5fd'
              }}>
                <Award size={13} />
                <span>AI Recommended Default</span>
              </span>
            )}

            {isActiveInPlan && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                background: 'rgba(16, 185, 129, 0.18)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.4)'
              }}>
                <Check size={13} />
                <span>Active in Business Plan</span>
              </span>
            )}
          </div>

          <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.35rem 0 0.25rem 0', lineHeight: 1.25 }}>
            {getFriendlyStrategyName(strategy.strategy_name, strategy.strategy_id)}
          </h3>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#3b82f6', margin: 0 }}>
            Strategic Focus: <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{strategy.strategic_focus}</span>
          </p>
        </div>

        {/* Large Decision Score Box */}
        <div style={{
          padding: '0.75rem 1.25rem',
          background: 'rgba(148, 163, 184, 0.08)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          textAlign: 'right',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          flexShrink: 0
        }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
            Decision Score
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.2rem', margin: '0.15rem 0' }}>
            <span style={{ fontSize: '2rem', fontWeight: 900, color: '#3b82f6', fontFamily: 'monospace', lineHeight: 1 }}>
              {score}
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>/100</span>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            TOPSIS Multi-Criteria
          </span>
        </div>
      </div>

      {/* Description */}
      <div>
        <h4 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '0.45rem' }}>
          Operational Approach
        </h4>
        <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
          {strategy.operational_approach}
        </p>
      </div>

      {/* How This Strategy Was Generated Callout */}
      <div style={{
        background: 'rgba(59, 130, 246, 0.08)',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        borderRadius: '12px',
        padding: '0.9rem 1.1rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: 'rgba(59, 130, 246, 0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#60a5fa',
          flexShrink: 0,
          marginTop: '2px'
        }}>
          <Lightbulb size={18} />
        </div>
        <div>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#60a5fa' }}>
            How This Strategy Was Developed
          </span>
          <p style={{ fontSize: '0.885rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: '0.25rem 0 0 0' }}>
            {getHowStrategyWasDeveloped(strategy)}
          </p>
        </div>
      </div>

      {/* Expected Impact Callout */}
      {strategy.expected_feasibility_impact && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          borderRadius: '12px',
          padding: '1rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem'
        }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399', flexShrink: 0, marginTop: '2px' }}>
            <TrendingUp size={18} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#34d399' }}>
              Expected Impact on Business Feasibility
            </span>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
              {strategy.expected_feasibility_impact}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
              Projected shift in financial health and operational feasibility based on Sri Lankan SME benchmarks.
            </p>
          </div>
        </div>
      )}

      {/* Three Comparative Metric Tiles */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h4 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', margin: 0 }}>
            Resource Requirements & Target Volume
          </h4>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Compared across all 4 strategy options
          </span>
        </div>

        <div className="strategy-metric-tiles-grid">
          <MetricTile
            label="Est. Capital Required"
            formattedValue={formatCurrency(capitalValue)}
            value={capitalValue}
            maxValue={maxCapital}
            helper="Money to start and equip"
            icon={DollarSign}
            variant="blue"
          />
          <MetricTile
            label="Monthly Operating Budget"
            formattedValue={formatCurrency(budgetValue)}
            value={budgetValue}
            maxValue={maxBudget}
            helper="Recurring monthly costs"
            icon={Calendar}
            variant="indigo"
          />
          <MetricTile
            label="Target Daily Customers"
            formattedValue={formatCustomersPerDay(customerValue)}
            value={customerValue}
            maxValue={maxCustomers}
            helper="Daily sales volume goal"
            icon={Users}
            variant="emerald"
          />
        </div>
      </div>

      {/* Primary Actions & Prev/Next Stepper */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        paddingTop: '1.25rem',
        borderTop: '1px solid var(--border-color)'
      }}>
        {/* Previous / Next Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={onPrev}
            disabled={currentIndex <= 0}
            style={{
              padding: '0.55rem 0.9rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: currentIndex <= 0 ? 'var(--text-muted)' : 'var(--text-primary)',
              background: 'var(--bg-card-solid)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              cursor: currentIndex <= 0 ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              opacity: currentIndex <= 0 ? 0.4 : 1
            }}
            aria-label="Previous strategy"
          >
            <ArrowLeft size={14} />
            <span>Previous</span>
          </button>
          
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, padding: '0 0.25rem' }}>
            {currentIndex + 1} of {totalCount}
          </span>

          <button
            type="button"
            onClick={onNext}
            disabled={currentIndex >= totalCount - 1}
            style={{
              padding: '0.55rem 0.9rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: currentIndex >= totalCount - 1 ? 'var(--text-muted)' : 'var(--text-primary)',
              background: 'var(--bg-card-solid)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              cursor: currentIndex >= totalCount - 1 ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              opacity: currentIndex >= totalCount - 1 ? 0.4 : 1
            }}
            aria-label="Next strategy"
          >
            <span>Next</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            onClick={() => onSimulate(strategy)}
            style={{
              padding: '0.6rem 1.15rem',
              fontSize: '0.825rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              background: 'var(--bg-card-solid)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
            }}
          >
            <Sliders size={15} style={{ color: '#3b82f6' }} />
            <span>Simulate in What-If</span>
          </button>

          {isActiveInPlan ? (
            <div style={{
              padding: '0.6rem 1.15rem',
              fontSize: '0.825rem',
              fontWeight: 700,
              color: '#34d399',
              background: 'rgba(16, 185, 129, 0.18)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}>
              <Check size={15} style={{ color: '#10b981' }} />
              <span>Active in Business Plan</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onAdopt(strategy)}
              disabled={isAdopting}
              style={{
                padding: '0.6rem 1.25rem',
                fontSize: '0.825rem',
                fontWeight: 700,
                color: '#ffffff',
                background: '#2563eb',
                border: 'none',
                borderRadius: '8px',
                cursor: isAdopting ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.35)',
                opacity: isAdopting ? 0.6 : 1
              }}
            >
              <Sparkles size={15} />
              <span>Adopt This Strategy</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
