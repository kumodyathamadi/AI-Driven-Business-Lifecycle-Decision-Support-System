import React from 'react';
import { Check, Sparkles, Sliders, Eye } from 'lucide-react';
import { formatCurrency, formatCustomersPerDay } from '../../utils/formatters';

export default function CompareTable({
  strategies = [],
  activeStrategyId,
  isAdopting,
  onSelectStrategy,
  onAdopt,
  onSimulate
}) {
  if (!strategies || strategies.length === 0) return null;

  // Calculate dynamic best values for highlighting
  const scores = strategies.map(s => {
    const raw = s.topsis_score !== undefined && s.topsis_score !== null ? s.topsis_score : 0.7;
    return Math.round(raw <= 1 ? raw * 100 : raw);
  });
  const maxScore = Math.max(...scores);

  const capitals = strategies.map(s => Number(s.estimated_capital_required_lkr || 0));
  const minCapital = Math.min(...capitals);

  const budgets = strategies.map(s => Number(s.estimated_monthly_budget_lkr || 0));
  const minBudget = Math.min(...budgets);

  const volumes = strategies.map(s => Number(s.target_daily_customers || 0));
  const maxVolume = Math.max(...volumes);

  return (
    <div className="strategy-compare-card">
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Side-by-Side Strategy Comparison
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
            Compare all 4 strategic pathways. Green cells indicate the most favorable option for each metric.
          </p>
        </div>
        <div>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#34d399',
            background: 'rgba(16, 185, 129, 0.15)',
            padding: '0.3rem 0.65rem',
            borderRadius: '6px',
            border: '1px solid rgba(16, 185, 129, 0.35)'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
            <span>Highlighted = Best Value</span>
          </span>
        </div>
      </div>

      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table className="strategy-compare-table">
          <thead>
            <tr>
              <th scope="col" style={{ minWidth: '180px', position: 'sticky', left: 0, background: 'var(--bg-card-solid)', zIndex: 10, borderRight: '1px solid var(--border-color)' }}>
                Evaluation Metric
              </th>
              {strategies.map((strat, idx) => {
                const stratId = strat.strategy_id || `strat_${idx}`;
                const isActive = stratId === activeStrategyId || strat.isActive;
                const rank = strat.rank || idx + 1;

                return (
                  <th 
                    key={stratId} 
                    scope="col" 
                    style={{
                      minWidth: '220px',
                      background: isActive ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-card-solid)',
                      borderTop: isActive ? '3px solid #10b981' : 'none',
                      borderRight: '1px solid var(--border-color)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <span style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '4px',
                        background: rank === 1 ? '#2563eb' : 'rgba(148, 163, 184, 0.3)',
                        color: '#ffffff',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        #{rank}
                      </span>
                      <span style={{ fontSize: '0.925rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {strat.strategy_name}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 500 }}>
                      {strat.strategic_focus}
                    </div>

                    {isActive && (
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
                        border: '1px solid rgba(16, 185, 129, 0.4)'
                      }}>
                        <Check size={10} />
                        <span>Active in Plan</span>
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {/* Row 1: Decision Score */}
            <tr>
              <th scope="row" style={{ fontWeight: 700, color: 'var(--text-primary)', position: 'sticky', left: 0, background: 'var(--bg-card-solid)', zIndex: 10, borderRight: '1px solid var(--border-color)' }}>
                Decision Score
                <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '0.15rem' }}>
                  Overall TOPSIS performance
                </span>
              </th>
              {strategies.map((strat, idx) => {
                const raw = strat.topsis_score !== undefined && strat.topsis_score !== null ? strat.topsis_score : 0.7;
                const score = Math.round(raw <= 1 ? raw * 100 : raw);
                const isBest = score === maxScore;

                return (
                  <td 
                    key={strat.strategy_id || idx}
                    className={isBest ? 'best-cell' : ''}
                    style={{ borderRight: '1px solid var(--border-color)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.45rem' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '1.15rem', fontWeight: 900, color: isBest ? '#34d399' : '#3b82f6' }}>
                        {score}/100
                      </span>
                      {isBest && (
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#10b981', background: 'rgba(16, 185, 129, 0.2)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                          Highest
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* Row 2: Est. Capital */}
            <tr>
              <th scope="row" style={{ fontWeight: 700, color: 'var(--text-primary)', position: 'sticky', left: 0, background: 'var(--bg-card-solid)', zIndex: 10, borderRight: '1px solid var(--border-color)' }}>
                Est. Capital Required
                <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '0.15rem' }}>
                  Initial setup and buffer
                </span>
              </th>
              {strategies.map((strat, idx) => {
                const capital = Number(strat.estimated_capital_required_lkr || 0);
                const isBest = capital === minCapital;

                return (
                  <td 
                    key={strat.strategy_id || idx}
                    className={isBest ? 'best-cell' : ''}
                    style={{ borderRight: '1px solid var(--border-color)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.45rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatCurrency(capital)}
                      </span>
                      {isBest && (
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#10b981', background: 'rgba(16, 185, 129, 0.2)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                          Lowest
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* Row 3: Monthly Budget */}
            <tr>
              <th scope="row" style={{ fontWeight: 700, color: 'var(--text-primary)', position: 'sticky', left: 0, background: 'var(--bg-card-solid)', zIndex: 10, borderRight: '1px solid var(--border-color)' }}>
                Monthly Operating Budget
                <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '0.15rem' }}>
                  Recurring monthly costs
                </span>
              </th>
              {strategies.map((strat, idx) => {
                const budget = Number(strat.estimated_monthly_budget_lkr || 0);
                const isBest = budget === minBudget;

                return (
                  <td 
                    key={strat.strategy_id || idx}
                    className={isBest ? 'best-cell' : ''}
                    style={{ borderRight: '1px solid var(--border-color)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.45rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatCurrency(budget)}
                      </span>
                      {isBest && (
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#10b981', background: 'rgba(16, 185, 129, 0.2)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                          Lowest
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* Row 4: Target Volume */}
            <tr>
              <th scope="row" style={{ fontWeight: 700, color: 'var(--text-primary)', position: 'sticky', left: 0, background: 'var(--bg-card-solid)', zIndex: 10, borderRight: '1px solid var(--border-color)' }}>
                Target Daily Volume
                <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '0.15rem' }}>
                  Expected daily footfall/orders
                </span>
              </th>
              {strategies.map((strat, idx) => {
                const volume = Number(strat.target_daily_customers || 0);
                const isBest = volume === maxVolume;

                return (
                  <td 
                    key={strat.strategy_id || idx}
                    className={isBest ? 'best-cell' : ''}
                    style={{ borderRight: '1px solid var(--border-color)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.45rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatCustomersPerDay(volume)}
                      </span>
                      {isBest && (
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#10b981', background: 'rgba(16, 185, 129, 0.2)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                          Highest
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* Row 5: Expected Impact */}
            <tr>
              <th scope="row" style={{ fontWeight: 700, color: 'var(--text-primary)', position: 'sticky', left: 0, background: 'var(--bg-card-solid)', zIndex: 10, borderRight: '1px solid var(--border-color)' }}>
                Expected Impact
                <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '0.15rem' }}>
                  Feasibility probability delta
                </span>
              </th>
              {strategies.map((strat, idx) => (
                <td key={strat.strategy_id || idx} style={{ fontWeight: 700, color: '#34d399', borderRight: '1px solid var(--border-color)' }}>
                  {strat.expected_feasibility_impact || 'Positive Trajectory'}
                </td>
              ))}
            </tr>

            {/* Row 6: Actions */}
            <tr>
              <th scope="row" style={{ fontWeight: 700, color: 'var(--text-primary)', position: 'sticky', left: 0, background: 'var(--bg-card-solid)', zIndex: 10, borderRight: '1px solid var(--border-color)' }}>
                Actions
              </th>
              {strategies.map((strat, idx) => {
                const stratId = strat.strategy_id || `strat_${idx}`;
                const isActive = stratId === activeStrategyId || strat.isActive;

                return (
                  <td key={stratId} style={{ borderRight: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => onSelectStrategy(stratId)}
                        style={{
                          width: '100%',
                          padding: '0.45rem 0.75rem',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          background: 'var(--bg-card-solid)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <Eye size={13} style={{ color: '#3b82f6' }} />
                        <span>See Details</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSimulate(strat)}
                        style={{
                          width: '100%',
                          padding: '0.45rem 0.75rem',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          color: 'var(--text-secondary)',
                          background: 'var(--bg-card-solid)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <Sliders size={13} style={{ color: 'var(--text-muted)' }} />
                        <span>Simulate in What-If</span>
                      </button>

                      {isActive ? (
                        <div style={{
                          width: '100%',
                          padding: '0.45rem 0.75rem',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#34d399',
                          background: 'rgba(16, 185, 129, 0.18)',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem'
                        }}>
                          <Check size={12} style={{ color: '#10b981' }} />
                          <span>Active in Plan</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAdopt(strat)}
                          disabled={isAdopting}
                          style={{
                            width: '100%',
                            padding: '0.45rem 0.75rem',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: '#ffffff',
                            background: '#2563eb',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: isAdopting ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem',
                            opacity: isAdopting ? 0.6 : 1
                          }}
                        >
                          <Sparkles size={13} />
                          <span>Adopt Strategy</span>
                        </button>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
