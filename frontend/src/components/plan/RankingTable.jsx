import React from 'react';
import { Award, Check, Sparkles } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export default function RankingTable({
  ranking = [],
  selectedStrategyId,
  selectedStrategyName
}) {
  if (!ranking || ranking.length === 0) {
    return (
      <div className="bp-empty-state">
        No candidate strategies available for ranking evaluation.
      </div>
    );
  }

  return (
    <div className="bp-ranking-table-wrapper">
      <div className="bp-table-scroll-container">
        <table className="bp-topsis-table" aria-label="TOPSIS Strategy Ranking Table">
          <thead>
            <tr>
              <th scope="col" style={{ width: '60px' }}>Rank</th>
              <th scope="col">Strategy Name</th>
              <th scope="col">Focus Area</th>
              <th scope="col" style={{ textAlign: 'right' }}>Target Capital</th>
              <th scope="col" style={{ textAlign: 'right' }}>TOPSIS Score</th>
              <th scope="col" style={{ textAlign: 'center', width: '120px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((strat, idx) => {
              const isAiTop = idx === 0;
              const isThisActive = 
                (selectedStrategyId && strat.strategy_id === selectedStrategyId) ||
                (selectedStrategyName && strat.strategy_name === selectedStrategyName);

              return (
                <tr 
                  key={strat.strategy_id || idx}
                  className={`bp-topsis-row ${isAiTop ? 'top-row-highlight' : ''} ${isThisActive ? 'active-strat' : ''}`}
                >
                  <th scope="row" className="bp-topsis-rank-cell">
                    <div className="bp-rank-badge-wrapper">
                      <span className={`bp-rank-number ${isAiTop ? 'rank-top' : ''}`}>
                        #{strat.rank || idx + 1}
                      </span>
                      {isAiTop && (
                        <span className="bp-top-pill" title="AI Highest Ranked Strategy">Top</span>
                      )}
                    </div>
                  </th>
                  <td className="bp-topsis-strat-name">
                    <div className="bp-strat-name-text">{strat.strategy_name}</div>
                    {strat.description && (
                      <div className="bp-strat-subdesc">{strat.description}</div>
                    )}
                  </td>
                  <td className="bp-topsis-focus">
                    <span className="bp-focus-tag">
                      {strat.strategic_focus || strat.focus_area || 'Operational Growth'}
                    </span>
                  </td>
                  <td className="bp-topsis-capital" style={{ textAlign: 'right' }}>
                    <span className="bp-capital-value">
                      {formatCurrency(strat.estimated_capital_required_lkr)}
                    </span>
                  </td>
                  <td className="bp-topsis-score" style={{ textAlign: 'right' }}>
                    <span className="bp-score-num">
                      {strat.topsis_score !== undefined && strat.topsis_score !== null 
                        ? strat.topsis_score 
                        : 'N/A'}
                    </span>
                  </td>
                  <td className="bp-topsis-status" style={{ textAlign: 'center' }}>
                    {isThisActive ? (
                      <span className="bp-status-badge active" title="Currently selected and active in this business plan">
                        <Check size={12} />
                        <span>Active Plan</span>
                      </span>
                    ) : isAiTop ? (
                      <span className="bp-status-badge ai-top" title="AI recommended highest multi-criteria score">
                        <Sparkles size={12} />
                        <span>AI #1</span>
                      </span>
                    ) : (
                      <span className="bp-status-badge alt">
                        Alternative
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bp-table-helper-note">
        <strong>TOPSIS Score:</strong> Technique for Order of Preference by Similarity to Ideal Solution. Evaluates each strategy on a 0 to 1 closeness index across 5 research-weighted criteria.
      </div>
    </div>
  );
}
