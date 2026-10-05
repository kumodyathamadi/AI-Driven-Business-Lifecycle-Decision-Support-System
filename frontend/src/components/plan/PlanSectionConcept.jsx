import React from 'react';
import { 
  Briefcase, 
  Sparkles, 
  Check, 
  TrendingUp, 
  AlertTriangle, 
  Info,
  Compass
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export default function PlanSectionConcept({ profile, executiveOverview = {}, financialPlan = {} }) {
  const businessInput = profile?.business_input || {};
  const isAdopted = executiveOverview.is_user_selected;
  const strategyName = executiveOverview.recommended_primary_strategy || 'Lean Bootstrapped Launch';
  const strategicFocus = executiveOverview.strategic_focus;
  const enablers = executiveOverview.key_enablers || [];
  const hurdles = executiveOverview.key_risk_hurdles || [];
  const capital = financialPlan.available_capital_lkr ?? businessInput.available_capital_lkr ?? 0;

  return (
    <div className="bp-section" id="section-concept">
      
      {/* Section Header */}
      <div className="bp-section-header">
        <span className="bp-section-num">01</span>
        <div className="bp-section-heading-text">
          <h2 className="bp-section-title">
            <Briefcase size={18} style={{ color: '#38bdf8' }} />
            Business Concept & Strategic Feasibility
          </h2>
          <div className="bp-section-subtitle">
            Executive business model evaluation, AI feasibility drivers, and human-in-the-loop operational path
          </div>
        </div>
      </div>

      {/* Narrative Card */}
      <div className="bp-narrative-card">
        <p className="bp-narrative-text">
          {executiveOverview.business_summary}
        </p>

        {/* Strategy Callout */}
        <div className={`bp-strategy-callout ${isAdopted ? 'adopted' : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ 
              width: '34px', 
              height: '34px', 
              borderRadius: '8px', 
              background: isAdopted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: isAdopted ? '#34d399' : '#818cf8'
            }}>
              {isAdopted ? <Check size={18} /> : <Compass size={18} />}
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', color: isAdopted ? '#34d399' : '#a5b4fc' }}>
                {isAdopted ? 'Adopted Operational Strategy' : 'Recommended Primary Strategy'}
              </div>
              <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#ffffff' }}>
                {strategyName}
              </div>
            </div>
          </div>

          {strategicFocus && (
            <div style={{ fontSize: '0.78rem', color: '#cbd5e1', background: 'rgba(0, 0, 0, 0.3)', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              Focus: <strong style={{ color: '#f1f5f9' }}>{strategicFocus}</strong>
            </div>
          )}
        </div>

        {/* Human-in-the-Loop Callout */}
        {isAdopted && (
          <div style={{ 
            marginTop: '0.85rem', 
            padding: '0.75rem 1rem', 
            background: 'rgba(16, 185, 129, 0.08)', 
            borderRadius: '8px', 
            borderLeft: '3px solid #10b981', 
            fontSize: '0.825rem', 
            color: '#e2e8f0', 
            lineHeight: 1.55 
          }}>
            <strong style={{ color: '#34d399' }}>Human-in-the-Loop Decision Confirmed: </strong>
            You deliberately selected <strong>{strategyName}</strong> as your guiding operational framework. This Business Plan has dynamically calibrated its target capital ({formatCurrency(capital)}), monthly operating budget, customer volume targets, and 3-phase milestones specifically to this strategy.
          </div>
        )}

        {/* Machine Learning Feasibility Drivers */}
        {(enablers.length > 0 || hurdles.length > 0) && (
          <div style={{ marginTop: '1.1rem', paddingTop: '0.9rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#94a3b8', fontWeight: 700, marginBottom: '0.5rem' }}>
              Key AI Feasibility Drivers (SHAP Feature Importance)
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
              {/* Positive Drivers */}
              {enablers.length > 0 && (
                <div style={{ background: 'rgba(34, 197, 94, 0.06)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '8px', padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                    <TrendingUp size={13} />
                    <span>Top Positive Enablers</span>
                  </div>
                  <div className="bp-driver-group">
                    {enablers.map((driver, idx) => (
                      <span key={idx} className="bp-driver-tag enabler">
                        + {driver}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Hurdle Drivers */}
              {hurdles.length > 0 && (
                <div style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                    <AlertTriangle size={13} />
                    <span>Key Risk Hurdles to Mitigate</span>
                  </div>
                  <div className="bp-driver-group">
                    {hurdles.map((driver, idx) => (
                      <span key={idx} className="bp-driver-tag hurdle">
                        - {driver}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Detailed Objective if provided */}
        {businessInput.additional_description && (
          <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '8px', borderLeft: '3px solid #60a5fa' }}>
            <div style={{ fontSize: '0.73rem', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>
              Entrepreneur Objective:
            </div>
            <p style={{ fontSize: '0.825rem', color: '#cbd5e1', margin: 0, lineHeight: 1.5 }}>
              {businessInput.additional_description}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
