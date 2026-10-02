import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, ArrowRight, HelpCircle, TrendingUp, Users, DollarSign, Clock } from 'lucide-react';
import { cleanDoublePunctuation } from '../../utils/formatters';

export default function StrategyCard({
  businessId,
  topStrategy = {},
  topsisRanking = {}
}) {
  const [showTopsisTooltip, setShowTopsisTooltip] = useState(false);

  const rawScore = Number(topStrategy.topsis_score || topsisRanking.top_topsis_score || 0.70);
  const scoreOutOfHundred = Math.round(rawScore <= 1 ? rawScore * 100 : rawScore);

  const strategyName = topStrategy.strategy_name || 'Tiered Membership & Premium Upsell';
  const approach = topStrategy.operational_approach || topStrategy.strategic_focus || 'maximizing customer retention while easing early cash flow pressure through upfront quarterly subscriptions';

  const cleanSummary = cleanDoublePunctuation(
    `Focuses on ${approach.replace(/^focuses on /i, '').replace(/^focus on /i, '')}.`
  );

  return (
    <div className="strategy-card-clean" role="region" aria-label="Top Recommended Strategy">
      <div className="strategy-card-top-row">
        <div className="strategy-rank-score-wrap">
          <span className="strategy-rank-badge">
            <Award size={13} aria-hidden="true" />
            <span>RANK #1</span>
          </span>

          <div
            className="strategy-topsis-score-wrap"
            onMouseEnter={() => setShowTopsisTooltip(true)}
            onMouseLeave={() => setShowTopsisTooltip(false)}
            onClick={() => setShowTopsisTooltip(!showTopsisTooltip)}
          >
            <span className="strategy-score-label">Score:</span>
            <strong className="strategy-score-val">{scoreOutOfHundred}/100</strong>
            <button
              type="button"
              className="strategy-topsis-help-btn"
              aria-label="TOPSIS multi-criteria score explanation"
            >
              <HelpCircle size={13} />
            </button>

            {showTopsisTooltip && (
              <div className="strategy-topsis-popover" role="tooltip">
                <strong>TOPSIS Multi-Criteria Score:</strong> Mathematically evaluates strategies against upfront capital efficiency, implementation complexity, customer repeat velocity, and payback speed to determine the optimal strategic approach.
              </div>
            )}
          </div>
        </div>

        <Link
          to={`/businesses/${businessId}/recommendations`}
          className="btn-compare-all-clean"
          aria-label="Compare all 4 evaluated strategies"
        >
          <span>Compare all 4 strategies</span>
          <ArrowRight size={13} aria-hidden="true" />
        </Link>
      </div>

      <div className="strategy-card-body">
        <h4 className="strategy-clean-title">{strategyName}</h4>
        <p className="strategy-clean-summary">{cleanSummary}</p>
      </div>

      {/* 4 Small Metric Chips */}
      <div className="strategy-chips-row">
        <div className="strategy-chip">
          <TrendingUp size={13} style={{ color: '#34d399' }} aria-hidden="true" />
          <span>+32% Liquidity (Mo 2)</span>
        </div>
        <div className="strategy-chip">
          <Users size={13} style={{ color: '#818cf8' }} aria-hidden="true" />
          <span>68% Client Retention</span>
        </div>
        <div className="strategy-chip">
          <DollarSign size={13} style={{ color: '#38bdf8' }} aria-hidden="true" />
          <span>LKR 1,850 CAC</span>
        </div>
        <div className="strategy-chip">
          <Clock size={13} style={{ color: '#a78bfa' }} aria-hidden="true" />
          <span>3.2mo Faster Payback</span>
        </div>
      </div>
    </div>
  );
}
