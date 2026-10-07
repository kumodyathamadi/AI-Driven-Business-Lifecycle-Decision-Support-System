import React from 'react';
import { 
  Compass, 
  Sparkles, 
  Check, 
  Layers, 
  Award, 
  HelpCircle 
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export default function PlanSection03Recommendations({ profile }) {
  const strategicRecs = profile?.strategic_recommendations || {};
  const topsis = strategicRecs.topsis_ranking || {};
  const personalizedPlan = profile?.personalized_business_plan || {};
  const sec03 = personalizedPlan.section_03_strategic_recommendations || {};

  const ranking = sec03.strategy_ranking || topsis.ranked_strategies || strategicRecs.candidate_strategies || [];
  const aiTop = sec03.ai_recommended_strategy || {
    strategy_name: topsis.top_recommended_strategy || 'Lean Operational Bootstrapping Strategy',
    strategy_id: topsis.top_recommended_id || 'STRAT_01',
    topsis_score: topsis.top_topsis_score || '0.7850'
  };

  const hitl = sec03.human_in_the_loop_selection || {
    is_user_selected: Boolean(personalizedPlan.executive_overview?.is_user_selected),
    selected_strategy_id: strategicRecs.selected_strategy_id || aiTop.strategy_id,
    selected_strategy_name: strategicRecs.selected_strategy_name || personalizedPlan.executive_overview?.recommended_primary_strategy || aiTop.strategy_name,
    alignment_status: personalizedPlan.executive_overview?.is_user_selected 
      ? `The entrepreneur selected an alternative strategy (${strategicRecs.selected_strategy_name}) that was ranked differently by the AI. The business plan has been re-aligned with the entrepreneur's selected strategy.`
      : 'Selected strategy matches the AI\'s highest-ranked recommendation.'
  };

  const isUserAdopted = hitl.is_user_selected;

  const criteriaWeights = [
    { criterion: 'Financial Viability', weight: '0.25 (25%)', description: 'Working capital adequacy, capital runway, and cash burn resilience.' },
    { criterion: 'Implementation Feasibility', weight: '0.20 (20%)', description: 'Execution simplicity relative to team size and operational readiness.' },
    { criterion: 'Market Demand Alignment', weight: '0.25 (25%)', description: 'Attunement with local customer demand score and target footfall.' },
    { criterion: 'Operational Risk (Cost)', weight: '0.15 (15%)', description: 'Cost criterion: exposure to fixed burn and supply vulnerabilities.' },
    { criterion: 'Resource Efficiency', weight: '0.15 (15%)', description: 'Revenue generation efficiency per unit of equipment and staff.' }
  ];

  return (
    <div className="bp-section" id="section-03">
      {/* Section Header */}
      <div className="bp-section-header">
        <span className="bp-section-num">03</span>
        <div className="bp-section-heading-text">
          <h2 className="bp-section-title">
            <Compass size={18} style={{ color: '#38bdf8' }} />
            Strategic Recommendations & TOPSIS Ranking
          </h2>
          <div className="bp-section-subtitle">
            Multi-objective strategy generation, mathematical TOPSIS closeness ranking, and human-in-the-loop operational selection
          </div>
        </div>
      </div>

      {/* 3.5 Human-in-the-Loop Strategy Status Card */}
      <div className={`bp-strategy-callout ${isUserAdopted ? 'adopted' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ 
            width: '38px', 
            height: '38px', 
            borderRadius: '50%', 
            background: isUserAdopted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: isUserAdopted ? '#34d399' : '#60a5fa'
          }}>
            {isUserAdopted ? <Check size={20} /> : <Award size={20} />}
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', color: isUserAdopted ? '#34d399' : '#a5b4fc' }}>
              {isUserAdopted ? 'Entrepreneur Selected Operational Strategy' : 'AI Top-Ranked Strategy Recommendation'}
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
              {hitl.selected_strategy_name}
            </div>
          </div>
        </div>

        <div style={{ fontSize: '0.8rem', color: isUserAdopted ? '#a7f3d0' : '#cbd5e1', maxWidth: '420px', lineHeight: 1.45 }}>
          {hitl.alignment_status}
        </div>
      </div>

      {/* 3.3 TOPSIS Strategy Ranking Table */}
      <div className="bp-narrative-card">
        <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#60a5fa', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Award size={15} />
          <span>3.3 TOPSIS Multi-Criteria Decision Evaluation & Strategy Ranking</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'left', color: '#94a3b8' }}>
                <th style={{ padding: '0.5rem', width: '50px' }}>Rank</th>
                <th style={{ padding: '0.5rem' }}>Strategy Name</th>
                <th style={{ padding: '0.5rem' }}>Focus Area</th>
                <th style={{ padding: '0.5rem', textAlign: 'right' }}>Target Capital</th>
                <th style={{ padding: '0.5rem', textAlign: 'right' }}>TOPSIS Score</th>
                <th style={{ padding: '0.5rem', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((strat, idx) => {
                const isThisActive = strat.strategy_id === hitl.selected_strategy_id || strat.strategy_name === hitl.selected_strategy_name;
                const isAiTop = idx === 0;

                return (
                  <tr 
                    key={idx}
                    style={{ 
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      background: isThisActive ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                      transition: 'background 0.2s ease'
                    }}
                  >
                    <td style={{ padding: '0.65rem 0.5rem', fontWeight: 700, color: isAiTop ? '#38bdf8' : '#64748b' }}>
                      #{strat.rank || idx + 1}
                    </td>
                    <td style={{ padding: '0.65rem 0.5rem', fontWeight: 700, color: '#ffffff' }}>
                      {strat.strategy_name}
                    </td>
                    <td style={{ padding: '0.65rem 0.5rem', color: '#cbd5e1' }}>
                      {strat.strategic_focus || 'Operational Growth'}
                    </td>
                    <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', color: '#38bdf8' }}>
                      {formatCurrency(strat.estimated_capital_required_lkr)}
                    </td>
                    <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', fontWeight: 700, color: '#a5b4fc', fontFamily: 'monospace' }}>
                      {strat.topsis_score || 'N/A'}
                    </td>
                    <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                      {isThisActive ? (
                        <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.55rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontWeight: 700 }}>
                          Active Plan
                        </span>
                      ) : isAiTop ? (
                        <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.55rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontWeight: 700 }}>
                          AI #1
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
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
      </div>

      {/* 3.2 TOPSIS Criteria & Weights Table */}
      <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '10px', padding: '1rem' }}>
        <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#94a3b8', fontWeight: 700, marginBottom: '0.5rem' }}>
          3.2 Research Evaluation Criteria & Vector Normalization Weights
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem' }}>
          {criteriaWeights.map((cw, idx) => (
            <div key={idx} style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '0.65rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, color: '#ffffff' }}>
                <span>{cw.criterion}</span>
                <span style={{ color: '#38bdf8' }}>{cw.weight}</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem', lineHeight: 1.35 }}>
                {cw.description}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
