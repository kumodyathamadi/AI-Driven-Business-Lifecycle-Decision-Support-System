import React, { useState } from 'react';
import { useOutletContext, useNavigate, useParams, Link } from 'react-router-dom';
import { Award, Layers, BarChart2, Cpu, ChevronDown, ChevronUp, CheckCircle2, ArrowRight, FileText } from 'lucide-react';
import StrategyCard from './StrategyCard';
import StrategyTradeoffModal from './strategy/StrategyTradeoffModal';
import { adoptStrategy } from '../services/api';
import { useToast } from './common/Toast';

export default function TopsisTable({ topsisRanking: propRanking }) {
  const ctx = useOutletContext();
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useToast();

  const profile = ctx?.profile;
  const stratRecs = profile?.strategic_recommendations || {};
  const topsisRanking = propRanking || stratRecs?.topsis_ranking || {};
  const [showTechnical, setShowTechnical] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [targetStrategy, setTargetStrategy] = useState(null);
  const [isAdopting, setIsAdopting] = useState(false);

  if (!topsisRanking) return null;

  const { ranked_strategies = [], top_recommended_strategy, top_topsis_score, evaluation_criteria = [] } = topsisRanking;
  const businessName = profile?.business_name || profile?.business_input?.business_name || ctx?.businessName;
  const district = profile?.business_input?.district || 'Colombo';

  const aiTopStrategy = ranked_strategies[0] || null;

  const activeStrategyId = stratRecs.selected_strategy_id 
    || topsisRanking.top_recommended_id 
    || profile?.personalized_business_plan?.executive_overview?.strategy_id 
    || ranked_strategies[0]?.strategy_id;

  const activeStrategy = ranked_strategies.find(s => s.strategy_id === activeStrategyId) || ranked_strategies[0];
  const isCustomAdopted = Boolean(stratRecs.selected_strategy_id && stratRecs.selected_strategy_id !== topsisRanking.top_recommended_id);

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
    navigate(`/businesses/${id}/simulator?${query}`, { state: { prefillStrategy: strategy } });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Page Title */}
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={22} style={{ color: '#60a5fa' }} />
          Explore & Compare Business Options {businessName ? `for ${businessName}` : ''}
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem', lineHeight: '1.5' }}>
          Compare strategic business directions for {businessName || 'your enterprise'} evaluated against multi-objective criteria including financial capital, operating budget, market demand, and execution feasibility.
        </p>
      </div>

      {/* Top Banner */}
      <div className="glass-card" style={{ border: '1px solid rgba(59, 130, 246, 0.4)', background: 'rgba(30, 58, 138, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
            <Award size={28} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Top Recommended Strategic Direction</span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginTop: '0.1rem' }}>{top_recommended_strategy}</h3>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Decision Support Score</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#60a5fa' }}>
            {top_topsis_score !== undefined && top_topsis_score !== null ? `${Math.round(top_topsis_score <= 1 ? top_topsis_score * 100 : top_topsis_score)}/100` : '70/100'}
          </div>
        </div>
      </div>

      {/* Strategy Cards List */}
      <div>
        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Layers size={18} style={{ color: '#60a5fa' }} />
          Evaluated Strategic Options (Ranked Order)
        </h4>

        {ranked_strategies.map((strat, idx) => (
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

      {/* Decision Criteria Breakdown */}
      {evaluation_criteria && evaluation_criteria.length > 0 && (
        <div className="glass-card">
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <BarChart2 size={18} style={{ color: '#c084fc' }} />
            Decision Matrix Evaluation Criteria & Weights
          </h4>
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Criterion</th>
                  <th>Attribute Type</th>
                  <th>Assigned Weight</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {evaluation_criteria.map((c, idx) => (
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
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#60a5fa' }}>{(c.weight * 100).toFixed(0)}%</td>
                    <td style={{ color: '#94a3b8' }}>{c.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Optional Academic / Research Technical Accordion */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
        <button 
          onClick={() => setShowTechnical(!showTechnical)}
          style={{ 
            background: 'rgba(30, 41, 59, 0.5)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '8px', 
            padding: '0.6rem 1rem', 
            color: '#94a3b8', 
            fontSize: '0.8rem', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            width: '100%',
            cursor: 'pointer'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={16} style={{ color: '#c084fc' }} />
            Academic & Research Technical Explanation (TOPSIS Vector Normalization & Relative Closeness C<sub>i</sub>*)
          </span>
          {showTechnical ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showTechnical && (
          <div style={{ marginTop: '0.75rem', padding: '1rem', background: '#0f172a', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.3)', fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.5' }}>
            <div style={{ color: '#c084fc', fontWeight: 700, marginBottom: '0.5rem' }}>
              TOPSIS (Technique for Order Preference by Similarity to Ideal Solution)
            </div>
            <p>
              The TOPSIS decision engine calculates normalized decision matrix vectors weighted by multi-objective weights (Wj). Relative closeness scores (Ci*) measure Euclidean distances to positive-ideal (S+) and negative-ideal (S-) solution vectors.
            </p>
          </div>
        )}
      </div>

      {/* Trade-Off Advisory Modal */}
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
