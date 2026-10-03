import React, { useState } from 'react';
import { useOutletContext, useNavigate, useParams, Link } from 'react-router-dom';
import { 
  Sparkles, 
  Layers, 
  BarChart2, 
  Cpu, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  ArrowRight, 
  FileText, 
  Lightbulb, 
  Award, 
  Info 
} from 'lucide-react';
import StrategyCard from './StrategyCard';
import StrategyTradeoffModal from './strategy/StrategyTradeoffModal';
import { EmptyState } from './common/EmptyState';
import { adoptStrategy } from '../services/api';
import { useToast } from './common/Toast';

export default function RecommendationsView({ profile: propProfile }) {
  const ctx = useOutletContext();
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useToast();

  const profile = propProfile || ctx?.profile;

  const [modalOpen, setModalOpen] = useState(false);
  const [targetStrategy, setTargetStrategy] = useState(null);
  const [isAdopting, setIsAdopting] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);

  if (!profile) return null;

  const stratRecs = profile.strategic_recommendations || {};
  const topsisRanking = stratRecs.topsis_ranking || {};
  const strategies = topsisRanking.ranked_strategies || stratRecs.candidate_strategies || [];
  const aiTopStrategy = strategies[0] || null;

  const activeStrategyId = stratRecs.selected_strategy_id 
    || topsisRanking.top_recommended_id 
    || profile.personalized_business_plan?.executive_overview?.strategy_id 
    || strategies[0]?.strategy_id;

  const activeStrategy = strategies.find(s => s.strategy_id === activeStrategyId) || strategies[0];
  const isCustomAdopted = Boolean(stratRecs.selected_strategy_id && stratRecs.selected_strategy_id !== topsisRanking.top_recommended_id);

  const businessName = profile?.business_name || profile?.business_input?.business_name || ctx?.businessName;
  const district = profile?.business_input?.district || 'Colombo';

  // TOPSIS Score
  const rawScore = topsisRanking.top_topsis_score ?? activeStrategy?.topsis_score ?? 0.70;
  const formattedScore = Math.round(rawScore <= 1 ? rawScore * 100 : rawScore);

  // Decision Criteria
  const evaluationCriteria = (topsisRanking.evaluation_criteria && topsisRanking.evaluation_criteria.length > 0)
    ? topsisRanking.evaluation_criteria
    : [
        { criterion: 'Available Capital Requirement', type: 'Cost', weight: 0.25, description: 'Scale of capital required for operational setup and working buffer.' },
        { criterion: 'Monthly Operating Budget', type: 'Cost', weight: 0.20, description: 'Recurring monthly expenditure and operating cash-flow requirements.' },
        { criterion: 'Expected Daily Customer Demand', type: 'Benefit', weight: 0.20, description: 'Target volume of customers and sales reach capability.' },
        { criterion: 'Operational Risk Exposure', type: 'Cost', weight: 0.20, description: 'Execution complexity, overhead volatility, and supply dependence.' },
        { criterion: 'Strategic Feasibility Alignment', type: 'Benefit', weight: 0.15, description: 'Alignment with district SME environment and model feasibility.' }
      ];

  const handleOpenAdopt = (strategy) => {
    setTargetStrategy(strategy);
    setModalOpen(true);
  };

  const handleConfirmAdopt = async () => {
    if (!targetStrategy || !id) return;
    setIsAdopting(true);
    try {
      const res = await adoptStrategy(id, targetStrategy.strategy_id);
      if (res?.structured_profile && ctx?.setProfile) {
        ctx.setProfile(res.structured_profile);
      } else if (ctx?.reloadRecord) {
        ctx.reloadRecord();
      }
      const msg = `Adopted "${targetStrategy.strategy_name}". Business Plan & Action Roadmap updated!`;
      if (toast?.success) toast.success(msg);
      else if (toast?.showToast) toast.showToast(msg, 'success');
      setModalOpen(false);
    } catch (err) {
      console.error('Failed to adopt strategy:', err);
      const errMsg = `Failed to adopt strategy: ${err.message}`;
      if (toast?.error) toast.error(errMsg);
      else if (toast?.showToast) toast.showToast(errMsg, 'error');
    } finally {
      setIsAdopting(false);
    }
  };

  const handleSimulate = (strategy) => {
    if (!id) return;
    const query = new URLSearchParams({
      capital: strategy.estimated_capital_required_lkr || '',
      budget: strategy.estimated_monthly_budget_lkr || '',
      customers: strategy.target_daily_customers || '',
      strategyName: strategy.strategy_name || ''
    }).toString();
    navigate(`/businesses/${id}/scenarios?${query}`, { state: { prefillStrategy: strategy } });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Page Header */}
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={22} style={{ color: '#c084fc' }} />
          Strategic Recommendations & Evaluated Options {businessName ? `for ${businessName}` : ''}
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem', lineHeight: 1.5 }}>
          Contextual strategic directions evaluated via Multi-Criteria TOPSIS decision analysis to optimize feasibility, profitability, and operational scale.
        </p>
      </div>

      {/* Active Strategic Pathway Banner */}
      {activeStrategy && (
        <div 
          className="glass-card"
          style={{
            background: isCustomAdopted 
              ? 'linear-gradient(135deg, rgba(6, 78, 59, 0.4), rgba(15, 23, 42, 0.85))'
              : 'linear-gradient(135deg, rgba(30, 58, 138, 0.4), rgba(15, 23, 42, 0.85))',
            border: isCustomAdopted 
              ? '1px solid rgba(16, 185, 129, 0.5)' 
              : '1px solid rgba(59, 130, 246, 0.5)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.25rem',
            padding: '1.25rem 1.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: isCustomAdopted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
              border: isCustomAdopted ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(59, 130, 246, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isCustomAdopted ? '#34d399' : '#60a5fa'
            }}>
              {isCustomAdopted ? <CheckCircle2 size={24} /> : <Award size={24} />}
            </div>
            <div>
              <span style={{ 
                fontSize: '0.72rem', 
                color: isCustomAdopted ? '#6ee7b7' : '#93c5fd', 
                textTransform: 'uppercase', 
                letterSpacing: '0.6px', 
                fontWeight: 700 
              }}>
                {isCustomAdopted ? 'Entrepreneur-Selected Active Strategy' : 'AI-Recommended Primary Strategy'}
              </span>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: '0.15rem 0 0.15rem 0' }}>
                {activeStrategy.strategy_name}
              </h4>
              <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                Strategic Focus: <strong style={{ color: '#93c5fd' }}>{activeStrategy.strategic_focus}</strong>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Decision Score
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: isCustomAdopted ? '#34d399' : '#60a5fa', fontFamily: 'monospace' }}>
                {formattedScore}/100
              </div>
            </div>

            <Link
              to={`/businesses/${id}/plan`}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#e2e8f0',
                padding: '0.55rem 1.1rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s ease'
              }}
            >
              <FileText size={15} />
              <span>View Business Plan</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* Section 1: Evaluated Strategic Options (Ranked Order) */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Layers size={18} style={{ color: '#60a5fa' }} />
              Evaluated Strategic Pathways (TOPSIS Ranked)
            </h4>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
              Review evaluated candidate pathways below. Click <strong>Adopt This Strategy</strong> to adapt your business plan, or <strong>Simulate in What-If</strong> to test parameters.
            </p>
          </div>
        </div>

        {strategies.length === 0 ? (
          <EmptyState 
            icon={Lightbulb}
            title="No Specific Recommendations Available"
            description="The AI recommendation engine did not find specific strategy candidates for this profile configuration."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {strategies.map((strat, idx) => (
              <StrategyCard 
                key={strat.strategy_id || idx} 
                strategy={strat} 
                rank={strat.rank || idx + 1}
                isActive={strat.strategy_id === activeStrategyId || strat.strategy_name === activeStrategy?.strategy_name}
                onAdopt={handleOpenAdopt}
                onSimulate={handleSimulate}
                isAdopting={isAdopting}
              />
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Decision Matrix Evaluation Criteria & Weights */}
      <div className="glass-card">
        <div style={{ marginBottom: '1rem' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <BarChart2 size={18} style={{ color: '#c084fc' }} />
            Decision Matrix Evaluation Criteria & Model Weights
          </h4>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
            The TOPSIS multi-criteria algorithm evaluates each operational pathway across these weighted objectives:
          </p>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Criterion</th>
                <th>Attribute Type</th>
                <th>Assigned Weight</th>
                <th>Evaluation Impact</th>
              </tr>
            </thead>
            <tbody>
              {evaluationCriteria.map((c, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 700, color: '#ffffff' }}>{c.criterion}</td>
                  <td>
                    <span style={{ 
                      padding: '0.2rem 0.6rem', 
                      borderRadius: '4px', 
                      fontSize: '0.725rem', 
                      fontWeight: 700,
                      background: c.type === 'Benefit' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: c.type === 'Benefit' ? '#4ade80' : '#fca5a5'
                    }}>
                      {c.type}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#60a5fa' }}>
                    {(c.weight * 100).toFixed(0)}%
                  </td>
                  <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{c.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Academic & Research Technical Methodology Accordion */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
        <button 
          onClick={() => setShowTechnical(!showTechnical)}
          style={{ 
            background: 'rgba(30, 41, 59, 0.5)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '8px', 
            padding: '0.65rem 1rem', 
            color: '#cbd5e1', 
            fontSize: '0.8rem', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            width: '100%',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
            <Cpu size={16} style={{ color: '#c084fc' }} />
            Academic & Research Methodology: TOPSIS Multi-Criteria Decision Science
          </span>
          {showTechnical ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showTechnical && (
          <div style={{ 
            marginTop: '0.75rem', 
            padding: '1.25rem', 
            background: '#0f172a', 
            borderRadius: '8px', 
            border: '1px solid rgba(168, 85, 247, 0.3)', 
            fontSize: '0.8rem', 
            color: '#cbd5e1', 
            lineHeight: '1.6' 
          }}>
            <div style={{ color: '#c084fc', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              TOPSIS (Technique for Order Preference by Similarity to Ideal Solution)
            </div>
            <p style={{ margin: '0 0 0.75rem 0' }}>
              The recommendation engine uses the TOPSIS algorithm to rank candidate operational business models for Sri Lankan SMEs. It avoids subjective cognitive bias by assessing multiple conflicting objectives simultaneously (cost minimization vs. revenue and demand maximization).
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
              <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '0.75rem', borderRadius: '6px' }}>
                <strong style={{ color: '#60a5fa' }}>1. Vector Normalization</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                  Raw metrics (capital, budget, customers, risk) are normalized onto a uniform Euclidean dimensionless scale: <code>r_ij = x_ij / √(∑ x_kj²)</code>.
                </p>
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '0.75rem', borderRadius: '6px' }}>
                <strong style={{ color: '#60a5fa' }}>2. Objective Weighting</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                  Weighted normalized decision matrix: <code>v_ij = w_j · r_ij</code>, reflecting economic importance (e.g. 25% capital, 20% risk).
                </p>
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '0.75rem', borderRadius: '6px' }}>
                <strong style={{ color: '#60a5fa' }}>3. Ideal Solution Distances</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                  Calculates Euclidean geometric distances to the Positive-Ideal Solution (S⁺) and Negative-Ideal Solution (S⁻).
                </p>
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '0.75rem', borderRadius: '6px' }}>
                <strong style={{ color: '#60a5fa' }}>4. Relative Closeness Score</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                  Relative closeness index: <code>C_i* = S_i⁻ / (S_i⁺ + S_i⁻)</code>. The strategy closest to ideal receives Rank #1.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Trade-Off & Risk Advisory Modal */}
      <StrategyTradeoffModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmAdopt}
        isAdopting={isAdopting}
        targetStrategy={targetStrategy}
        aiTopStrategy={aiTopStrategy}
        businessName={businessName}
        district={district}
      />
    </div>
  );
}
