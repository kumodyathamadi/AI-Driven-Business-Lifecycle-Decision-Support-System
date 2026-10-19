import React from 'react';
import { 
  Compass, 
  Sparkles, 
  Check, 
  Layers, 
  Award, 
  HelpCircle 
} from 'lucide-react';
import PlanSection from './PlanSection';
import RankingTable from './RankingTable';
import { formatCurrency } from '../../utils/formatters';

export default function PlanSection03Recommendations({ 
  profile, 
  isOpen = false, 
  onToggle 
}) {
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
    <PlanSection
      id="section-03"
      number="03"
      title="Strategic Recommendations & TOPSIS Ranking"
      icon={Compass}
      description="Multi-objective strategy generation, mathematical TOPSIS closeness ranking, and human-in-the-loop operational selection"
      isOpen={isOpen}
      onToggle={onToggle}
    >
      {/* 3.1 Strategy Callout (AI Top / Entrepreneur Adopted) */}
      <div className={`bp-strategy-callout ${isUserAdopted ? 'adopted' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ 
            width: '38px', 
            height: '38px', 
            borderRadius: '50%', 
            background: isUserAdopted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: isUserAdopted ? '#059669' : '#2563eb',
            flexShrink: 0
          }}>
            {isUserAdopted ? <Check size={20} /> : <Award size={20} />}
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', color: isUserAdopted ? '#059669' : '#2563eb' }}>
              {isUserAdopted ? 'Entrepreneur Selected Operational Strategy' : 'AI Top-Ranked Strategy Recommendation'}
            </div>
            <div className="bp-strategy-selected-title" style={{ fontSize: '1.05rem', fontWeight: 800 }}>
              {hitl.selected_strategy_name}
            </div>
          </div>
        </div>

        <div className="bp-strategy-alignment-desc" style={{ fontSize: '0.8rem', maxWidth: '420px', lineHeight: 1.45 }}>
          {hitl.alignment_status}
        </div>
      </div>

      {/* 3.3 TOPSIS Strategy Ranking Table with Highlighted Top Row */}
      <div className="bp-narrative-card">
        <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#0284c7', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Award size={15} />
          <span>3.3 TOPSIS Multi-Criteria Decision Evaluation & Strategy Ranking</span>
        </div>

        <RankingTable
          ranking={ranking}
          selectedStrategyId={hitl.selected_strategy_id}
          selectedStrategyName={hitl.selected_strategy_name}
        />
      </div>

      {/* 3.2 Research Evaluation Criteria & Weights Cards */}
      <div className="bp-criteria-container">
        <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted, #64748b)', fontWeight: 700, marginBottom: '0.5rem' }}>
          3.2 Research Evaluation Criteria & Vector Normalization Weights
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem' }}>
          {criteriaWeights.map((cw, idx) => (
            <div key={idx} className="bp-criteria-card">
              <div className="bp-criteria-card-head">
                <span>{cw.criterion}</span>
                <span style={{ color: '#0284c7', fontWeight: 700 }}>{cw.weight}</span>
              </div>
              <div className="bp-criteria-card-desc">
                {cw.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PlanSection>
  );
}
