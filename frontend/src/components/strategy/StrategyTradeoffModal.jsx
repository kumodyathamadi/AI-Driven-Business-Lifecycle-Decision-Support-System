import React from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  ShieldAlert, 
  TrendingUp, 
  Sparkles, 
  X, 
  DollarSign, 
  Layers, 
  Clock 
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export default function StrategyTradeoffModal({
  isOpen,
  onClose,
  onConfirm,
  isAdopting,
  targetStrategy,
  aiTopStrategy,
  businessName,
  district
}) {
  if (!isOpen || !targetStrategy) return null;

  const targetId = targetStrategy.strategy_id;
  const isTargetAiTop = targetStrategy.strategy_id === aiTopStrategy?.strategy_id;

  // Custom trade-off data by strategy
  const tradeOffData = {
    STRAT_01: {
      gains: [
        'Lowest upfront capital exposure (-40% of standard setup cost).',
        'Conserves working capital cushion for emergency cash runway.',
        'Reduces reliance on hiring full-time staff immediately.'
      ],
      risks: [
        'Slower initial revenue acceleration and market presence.',
        'Target daily customer volume is scaled down (-20%).'
      ],
      advisory: 'Ideal if your cash reserve is limited. Focus on organic word-of-mouth and reinvest early cash flow before expanding operations.'
    },
    STRAT_02: {
      gains: [
        'Aggressive customer acquisition (+30% daily customer reach).',
        'Dominant storefront visibility and local market share capture.',
        'Fastest path to scale if market demand is high.'
      ],
      risks: [
        'Higher capital commitment (+10% capital, +25% operating budget).',
        'Higher operational risk score (6.5 vs baseline 3.0-4.2).',
        'Requires an approved micro-loan buffer to absorb early promotional burn.'
      ],
      advisory: 'Ensure you have access to a contingency credit facility or working capital loan before signing long-term commercial lease agreements.'
    },
    STRAT_03: {
      gains: [
        'Bypasses expensive high-street commercial rent via small operational hub.',
        'Widens geographic reach across district through online & delivery channels.',
        'Balanced operating expenditure with +32% liquidity retention by Month 2.'
      ],
      risks: [
        'Dependent on reliable third-party local delivery partners.',
        'Requires active daily digital communication (WhatsApp, social inquiries).'
      ],
      advisory: `Form delivery partnership agreements with local courier or dispatch riders in ${district || 'your area'} prior to launch.`
    },
    STRAT_04: {
      gains: [
        'High gross profit margins per service/product unit.',
        'Profitable at 30% lower customer footfall compared to standard retail.',
        'Builds loyal, high-lifetime-value VIP clientele.'
      ],
      risks: [
        'Requires superior craftsmanship and specialized premium equipment.',
        'Longer sales cycle to build affluent customer trust.'
      ],
      advisory: 'Invest in premium packaging, bespoke customer consultation, and high-end salon/store ambiance to justify premium unit pricing.'
    }
  };

  const currentTradeOff = tradeOffData[targetId] || {
    gains: ['Customized strategic execution aligned with your business vision.'],
    risks: ['Requires careful monitoring of operating cash flow and working capital.'],
    advisory: 'Review What-If scenarios regularly to optimize operational metrics.'
  };

  return (
    <div 
      className="modal-backdrop-custom"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 10, 20, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem'
      }}
      onClick={onClose}
    >
      <div 
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '680px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(24, 38, 70, 0.95))',
          border: '1px solid rgba(99, 102, 241, 0.4)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 35px rgba(99, 102, 241, 0.25)',
          borderRadius: '16px',
          padding: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.5px', background: 'rgba(99, 102, 241, 0.15)', padding: '0.2rem 0.6rem', borderRadius: '6px', marginBottom: '0.5rem' }}>
              <Sparkles size={13} />
              <span>Human-in-the-Loop Decision Override</span>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.3 }}>
              Adopt Strategy: {targetStrategy.strategy_name}
            </h3>
            <p style={{ fontSize: '0.825rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              Updating primary strategic roadmap for <strong style={{ color: '#e2e8f0' }}>{businessName || 'your business'}</strong>.
            </p>
          </div>

          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Comparative Sizing Box */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(15, 23, 42, 0.7)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ paddingRight: '0.75rem', borderRight: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>AI Baseline (#1)</span>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#93c5fd', marginTop: '0.2rem' }}>
              {aiTopStrategy?.strategy_name || 'Lean Bootstrapped Launch'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '0.4rem' }}>
              Capital: <strong>LKR {Number(aiTopStrategy?.estimated_capital_required_lkr || 0).toLocaleString()}</strong>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
              Op. Risk Score: <strong>{aiTopStrategy?.criteria_scores?.operational_risk || '3.0'}/10</strong>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', color: '#34d399', textTransform: 'uppercase', fontWeight: 700 }}>Your Selected Strategy</span>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', marginTop: '0.2rem' }}>
              {targetStrategy.strategy_name}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '0.4rem' }}>
              Capital: <strong style={{ color: '#34d399' }}>LKR {Number(targetStrategy.estimated_capital_required_lkr || 0).toLocaleString()}</strong>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
              Op. Risk Score: <strong>{targetStrategy.criteria_scores?.operational_risk || '4.5'}/10</strong>
            </div>
          </div>
        </div>

        {/* Trade-Off Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Gains */}
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
            <h5 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
              <CheckCircle2 size={15} />
              Strategic Advantages Gained (+)
            </h5>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.78rem', color: '#e2e8f0', lineHeight: 1.5 }}>
              {currentTradeOff.gains.map((g, idx) => (
                <li key={idx}>{g}</li>
              ))}
            </ul>
          </div>

          {/* Risks / Trade-offs */}
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
            <h5 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
              <AlertTriangle size={15} />
              Operational Trade-Offs & Constraints (-)
            </h5>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.78rem', color: '#e2e8f0', lineHeight: 1.5 }}>
              {currentTradeOff.risks.map((r, idx) => (
                <li key={idx}>{r}</li>
              ))}
            </ul>
          </div>

          {/* Actionable Advisory */}
          <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#c7d2fe', lineHeight: 1.5 }}>
            <strong style={{ color: '#ffffff' }}>AI Advisory: </strong> {currentTradeOff.advisory}
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isAdopting}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#cbd5e1',
              padding: '0.55rem 1.15rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Keep AI Default (#1)
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isAdopting}
            style={{
              background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
              border: 'none',
              color: '#ffffff',
              padding: '0.55rem 1.35rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: isAdopting ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)'
            }}
          >
            {isAdopting ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <span>Recalculating Plan...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>Confirm & Update Business Plan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
