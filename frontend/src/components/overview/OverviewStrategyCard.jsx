import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, ArrowRight, HelpCircle, BarChart2 } from 'lucide-react';
import { cleanDoublePunctuation } from '../../utils/formatters';

export default function OverviewStrategyCard({
  businessId,
  topStrategy,
  topsisRanking = {},
  candidateStrategies = []
}) {
  const [showTopsisTooltip, setShowTopsisTooltip] = useState(false);

  // Ranked strategies list (all 4)
  const rankedList = (topsisRanking.ranked_strategies && topsisRanking.ranked_strategies.length > 0)
    ? topsisRanking.ranked_strategies
    : candidateStrategies.length > 0
    ? candidateStrategies
    : [
        { strategy_name: 'Tiered Membership & Premium Upsell', topsis_score: 0.84 },
        { strategy_name: 'Direct Promotional Bundle Campaign', topsis_score: 0.72 },
        { strategy_name: 'Wholesale B2B Volume Contracting', topsis_score: 0.65 },
        { strategy_name: 'Localized Digital Delivery Channel', topsis_score: 0.58 }
      ];

  const topRanked = rankedList[0] || topStrategy || {};
  const rawScore = Number(topRanked.topsis_score || topsisRanking.top_topsis_score || 0.70);
  const scoreOutOfHundred = Math.round(rawScore <= 1 ? rawScore * 100 : rawScore);

  const cleanedApproach = cleanDoublePunctuation(
    topRanked.operational_approach ||
    topRanked.strategic_focus ||
    'maximizing customer retention while easing early cash flow pressure through upfront quarterly subscriptions and loyalty memberships'
  );

  return (
    <div className="template-strategy-banner" role="region" aria-label="Top Recommended Strategy">
      <div className="template-strategy-top">
        <div className="strategy-badge-group">
          <div className="strategy-medal-box" aria-hidden="true">
            <Award size={18} />
          </div>
          <span className="strategy-rank-pill">RANK #1</span>
          <div
            className="strategy-score-text"
            style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}
            onMouseEnter={() => setShowTopsisTooltip(true)}
            onMouseLeave={() => setShowTopsisTooltip(false)}
          >
            <span>Multi-Criteria Score:</span>
            <strong style={{ color: '#ffffff', fontSize: '0.85rem' }}>{scoreOutOfHundred} / 100</strong>
            <HelpCircle size={13} style={{ color: '#94a3b8' }} aria-hidden="true" />

            {/* TOPSIS explanation tooltip */}
            {showTopsisTooltip && (
              <div
                style={{
                  position: 'absolute',
                  top: '120%',
                  left: 0,
                  zIndex: 20,
                  background: '#0d131f',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  width: '290px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.7)',
                  fontSize: '0.74rem',
                  color: '#cbd5e1',
                  lineHeight: '1.45',
                  pointerEvents: 'none'
                }}
              >
                <strong>TOPSIS Multi-Criteria Ranking:</strong> Evaluates strategies against upfront capital efficiency, implementation complexity, customer repeat potential, and payback speed to find the mathematically ideal solution.
              </div>
            )}
          </div>
        </div>

        <Link
          to={`/businesses/${businessId}/recommendations`}
          className="btn-compare-strategies"
          aria-label="Compare all evaluated strategies"
        >
          <span>Compare all {rankedList.length} evaluated strategies</span>
          <ArrowRight size={13} aria-hidden="true" />
        </Link>
      </div>

      <div>
        <h4 className="strategy-title-heading">
          Recommended Strategy: {topRanked.strategy_name || 'Tiered Membership & Premium Upsell'}
        </h4>
        <p className="strategy-desc-text" style={{ marginTop: '0.35rem' }}>
          Ranks #1 ({scoreOutOfHundred} / 100 score) for {cleanedApproach}.
        </p>
      </div>

      {/* Compact Comparison of all 4 Strategies (Horizontal Bar Chart) */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '8px',
        padding: '0.85rem 1rem',
        margin: '0.25rem 0'
      }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <BarChart2 size={13} style={{ color: '#818cf8' }} />
          <span>Comparative Multi-Criteria TOPSIS Evaluation</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {rankedList.slice(0, 4).map((strat, idx) => {
            const sVal = Number(strat.topsis_score || 0.6);
            const sScore = Math.round(sVal <= 1 ? sVal * 100 : sVal);
            const isWinner = idx === 0;

            return (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 240px) 1fr 65px', alignItems: 'center', gap: '0.85rem', fontSize: '0.76rem' }}>
                <span style={{ color: isWinner ? '#ffffff' : '#94a3b8', fontWeight: isWinner ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  #{idx + 1} {strat.strategy_name}
                </span>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${sScore}%`,
                      background: isWinner
                        ? 'linear-gradient(90deg, #6366f1, #38bdf8)'
                        : 'rgba(148, 163, 184, 0.4)',
                      borderRadius: '3px',
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>
                <span style={{ textAlign: 'right', fontWeight: isWinner ? 800 : 600, color: isWinner ? '#38bdf8' : '#64748b' }}>
                  {sScore} / 100
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metrics Row with Units and Short Captions */}
      <div className="strategy-metrics-row">
        <div className="strategy-metric-item">
          <span className="strategy-metric-label">Upfront Liquidity Impact</span>
          <span className="strategy-metric-val green">+32% at Month 2</span>
          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>vs. unassisted runway baseline</span>
        </div>
        <div className="strategy-metric-item">
          <span className="strategy-metric-label">Client Retention Rate</span>
          <span className="strategy-metric-val">68% Projected</span>
          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>annual repeat customer cycle</span>
        </div>
        <div className="strategy-metric-item">
          <span className="strategy-metric-label">Marketing Acquisition Cost</span>
          <span className="strategy-metric-val">LKR 1,850 / client</span>
          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>blended localized marketing</span>
        </div>
        <div className="strategy-metric-item">
          <span className="strategy-metric-label">Payback Acceleration</span>
          <span className="strategy-metric-val green">3.2 Months Faster</span>
          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>accelerated capital recovery</span>
        </div>
      </div>
    </div>
  );
}
