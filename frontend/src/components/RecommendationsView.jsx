import React, { useState } from 'react';
import { useOutletContext, useNavigate, useParams, Link } from 'react-router-dom';
import { 
  Sparkles, 
  Layers, 
  BarChart2, 
  CheckCircle2, 
  ArrowRight, 
  FileText, 
  Award, 
  Eye
} from 'lucide-react';
import SegmentedControl from './strategy/SegmentedControl';
import StrategyList from './strategy/StrategyList';
import StrategyDetail from './strategy/StrategyDetail';
import CompareTable from './strategy/CompareTable';
import CriteriaCard from './strategy/CriteriaCard';
import StrategyTradeoffModal from './strategy/StrategyTradeoffModal';
import { adoptStrategy } from '../services/api';
import { useToast } from './common/Toast';

export default function RecommendationsView({ profile: propProfile }) {
  const ctx = useOutletContext();
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useToast();

  const profile = propProfile || ctx?.profile;

  // View state: 'explore' (master-detail) vs 'compare' (side-by-side table)
  const [viewMode, setViewMode] = useState('explore');

  // Adoption modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [targetStrategy, setTargetStrategy] = useState(null);
  const [isAdopting, setIsAdopting] = useState(false);
  const [justAdopted, setJustAdopted] = useState(null);

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

  // Selected strategy for the Explore view
  const [selectedStrategyId, setSelectedStrategyId] = useState(() => {
    return activeStrategyId || strategies[0]?.strategy_id || null;
  });

  const selectedIndex = strategies.findIndex(s => (s.strategy_id || '') === selectedStrategyId);
  const currentStrategy = selectedIndex >= 0 ? strategies[selectedIndex] : strategies[0];

  const businessName = profile?.business_name || profile?.business_input?.business_name || ctx?.businessName;
  const district = profile?.business_input?.district || 'Colombo';

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
      setJustAdopted(targetStrategy.strategy_name);
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

  const handlePrevStrategy = () => {
    if (selectedIndex > 0) {
      setSelectedStrategyId(strategies[selectedIndex - 1]?.strategy_id);
    }
  };

  const handleNextStrategy = () => {
    if (selectedIndex < strategies.length - 1) {
      setSelectedStrategyId(strategies[selectedIndex + 1]?.strategy_id);
    }
  };

  const handleSelectFromCompare = (strategyId) => {
    setSelectedStrategyId(strategyId);
    setViewMode('explore');
  };

  return (
    <div className="strategies-redesign-container">
      
      {/* Page Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Sparkles size={24} style={{ color: 'var(--accent-blue, #3b82f6)' }} />
          <span>Strategic Recommendations & Evaluated Options {businessName ? `for ${businessName}` : ''}</span>
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
          Compare evaluated business directions ranked by Multi-Criteria TOPSIS analysis to maximize profitability, manage cash runway, and reduce risk.
        </p>
      </div>

      {/* Just Adopted Success Notification Banner */}
      {justAdopted && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1.5px solid #10b981',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 2px 10px rgba(16, 185, 129, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.925rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Business Plan Successfully Regenerated!
              </div>
              <div style={{ fontSize: '0.8rem', color: '#34d399', marginTop: '0.15rem' }}>
                The operational plan, financial runway, and 3-phase action roadmap are now calibrated for <strong>{justAdopted}</strong>.
              </div>
            </div>
          </div>

          <Link
            to={`/businesses/${id}/plan`}
            style={{
              padding: '0.5rem 1rem',
              background: '#059669',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 700,
              borderRadius: '8px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)'
            }}
          >
            <FileText size={15} />
            <span>Inspect Updated Plan</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* 1. Slim Recommendation Banner */}
      {aiTopStrategy && (
        <div className="strategy-slim-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#60a5fa',
              flexShrink: 0
            }}>
              <Award size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#60a5fa' }}>
                  AI-Recommended Primary Strategy
                </span>
                <span style={{
                  padding: '0.1rem 0.45rem',
                  borderRadius: '4px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#93c5fd'
                }}>
                  #1 Ranked
                </span>
              </div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.15rem 0 0.15rem 0' }}>
                {aiTopStrategy.strategy_name}
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                Strategic Focus: <strong style={{ color: 'var(--text-primary)' }}>{aiTopStrategy.strategic_focus}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Decision Score</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#3b82f6', fontFamily: 'monospace', lineHeight: 1 }}>
                {Math.round((aiTopStrategy.topsis_score <= 1 ? aiTopStrategy.topsis_score * 100 : aiTopStrategy.topsis_score) || 86)}/100
              </div>
            </div>

            <Link
              to={`/businesses/${id}/plan`}
              style={{
                padding: '0.55rem 1rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                background: 'var(--bg-card-solid)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
              }}
            >
              <FileText size={14} style={{ color: 'var(--text-muted)' }} />
              <span>View in Plan</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}

      {/* 2. View Switch: Explore One by One vs Compare All */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.5rem' }}>
        <div>
          <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Evaluated Strategic Directions
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
            Switch between in-depth exploration and side-by-side comparison.
          </p>
        </div>

        <SegmentedControl
          value={viewMode}
          onChange={setViewMode}
          options={[
            { id: 'explore', label: 'Explore one by one', icon: Eye },
            { id: 'compare', label: 'Compare all', icon: Layers }
          ]}
        />
      </div>

      {/* 3. Explore View (Master-Detail) */}
      {viewMode === 'explore' && (
        <div id="recommendations" className="strategy-explore-grid">
          {/* Left Master List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.25rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                Strategy Options ({strategies.length})
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Ranked by score
              </span>
            </div>

            <StrategyList
              strategies={strategies}
              selectedId={selectedStrategyId}
              activeStrategyId={activeStrategyId}
              onSelect={setSelectedStrategyId}
            />
          </div>

          {/* Right Detail Panel */}
          <div>
            <StrategyDetail
              strategy={currentStrategy}
              strategies={strategies}
              currentIndex={selectedIndex}
              totalCount={strategies.length}
              isActiveInPlan={currentStrategy?.strategy_id === activeStrategyId}
              isTopRanked={selectedIndex === 0}
              isAdopting={isAdopting}
              onAdopt={handleOpenAdopt}
              onSimulate={handleSimulate}
              onPrev={handlePrevStrategy}
              onNext={handleNextStrategy}
            />
          </div>
        </div>
      )}

      {/* 4. Compare View (Side-by-Side Table) */}
      {viewMode === 'compare' && (
        <div id="recommendations">
          <CompareTable
            strategies={strategies}
            activeStrategyId={activeStrategyId}
            isAdopting={isAdopting}
            onSelectStrategy={handleSelectFromCompare}
            onAdopt={handleOpenAdopt}
            onSimulate={handleSimulate}
          />
        </div>
      )}

      {/* 5. Decision Matrix Criteria Cards */}
      <div id="options" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart2 size={18} style={{ color: 'var(--accent-blue, #3b82f6)' }} />
              <span>Decision Matrix Evaluation Criteria & Weights</span>
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
              How the AI evaluates and ranks every strategic pathway for small businesses in Sri Lanka.
            </p>
          </div>

          {/* Legend */}
          <div style={{
            padding: '0.35rem 0.75rem',
            background: 'var(--bg-card-solid)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            fontWeight: 500
          }}>
            <strong style={{ color: 'var(--text-primary)' }}>Legend: </strong> Cost: lower is better. Benefit: higher is better.
          </div>
        </div>

        {/* Criteria Cards Grid */}
        <div className="strategy-criteria-grid">
          {evaluationCriteria.map((criterion, idx) => (
            <CriteriaCard key={idx} criterion={criterion} />
          ))}
        </div>
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
