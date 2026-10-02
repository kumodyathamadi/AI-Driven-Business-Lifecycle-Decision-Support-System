import React, { useState } from 'react';
import { useOutletContext, useNavigate, useParams, Link } from 'react-router-dom';
import { Sparkles, Lightbulb, CheckCircle2, ArrowRight, FileText } from 'lucide-react';
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Title & Description */}
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={22} style={{ color: '#c084fc' }} />
          Strategic Recommendations & Actions {businessName ? `for ${businessName}` : ''}
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem', lineHeight: 1.5 }}>
          Contextual strategic directions generated to improve {businessName ? `${businessName}'s` : 'business'} feasibility, profitability, and operational scale.
        </p>
      </div>

      {/* Active Strategy Status Banner */}
      {activeStrategy && (
        <div 
          className="glass-card"
          style={{
            background: isCustomAdopted 
              ? 'linear-gradient(135deg, rgba(6, 78, 59, 0.35), rgba(15, 23, 42, 0.8))'
              : 'linear-gradient(135deg, rgba(30, 58, 138, 0.35), rgba(15, 23, 42, 0.8))',
            border: isCustomAdopted 
              ? '1px solid rgba(16, 185, 129, 0.45)' 
              : '1px solid rgba(59, 130, 246, 0.45)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            padding: '1rem 1.25rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: isCustomAdopted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
              border: isCustomAdopted ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(59, 130, 246, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isCustomAdopted ? '#34d399' : '#60a5fa'
            }}>
              {isCustomAdopted ? <CheckCircle2 size={22} /> : <Sparkles size={22} />}
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: isCustomAdopted ? '#6ee7b7' : '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                {isCustomAdopted ? 'Entrepreneur-Selected Active Strategy' : 'AI-Recommended Primary Strategy'}
              </span>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', margin: '0.1rem 0 0 0' }}>
                {activeStrategy.strategy_name}
              </h4>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link
              to={`/businesses/${id}/plan`}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#e2e8f0',
                padding: '0.45rem 0.95rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <FileText size={14} />
              <span>View Updated Business Plan</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}

      {/* Strategies List */}
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
