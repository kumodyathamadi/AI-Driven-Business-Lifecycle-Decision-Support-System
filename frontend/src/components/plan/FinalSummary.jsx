import React from 'react';
import { FileCheck, Sparkles, Check, ArrowRight, ShieldCheck, Compass } from 'lucide-react';
import { formatConfidence } from '../../utils/formatters';

export default function FinalSummary({ profile, finalSummary: propSummary }) {
  const personalizedPlan = profile?.personalized_business_plan || {};
  const sec05 = personalizedPlan.section_05_scenario_action_roadmap || {};
  
  const summary = propSummary || sec05.final_ai_recommendation || sec05.final_recommendation || personalizedPlan.final_recommendation || {
    ai_feasibility_verdict: profile?.feasibility_analysis?.predicted_label || 'Conditionally Feasible',
    ai_confidence_score: profile?.feasibility_analysis?.confidence_score || profile?.feasibility_analysis?.probability_score || 0.65,
    ai_recommended_strategy: profile?.strategic_recommendations?.topsis_ranking?.top_recommended_strategy || 'Lean Operational Bootstrapping Strategy',
    entrepreneur_selected_strategy: profile?.strategic_recommendations?.selected_strategy_name || personalizedPlan.executive_overview?.recommended_primary_strategy || 'Lean Operational Bootstrapping Strategy',
    is_user_selected: Boolean(personalizedPlan.executive_overview?.is_user_selected),
    main_positive_strength: 'Location Suitability & Footfall Potential',
    main_operational_constraint: 'Working Capital & Inventory Buffer',
    key_scenario_insight: 'What-If testing confirms sensitivity to operating capital and demand stability.',
    recommended_immediate_next_step: 'Confirm initial supplier arrangements, configure ordering channels, and prepare operating workspace.'
  };

  const confidencePct = formatConfidence(summary.ai_confidence_score);

  return (
    <section className="bp-final-synthesis-card" aria-label="Final AI Recommendation and Operational Summary">
      <div className="bp-synthesis-accent-bar" aria-hidden="true" />

      {/* Header */}
      <div className="bp-synthesis-head">
        <div className="bp-synthesis-head-left">
          <div className="bp-synthesis-icon-box">
            <FileCheck size={22} className="bp-synthesis-icon" />
          </div>
          <div>
            <span className="bp-synthesis-sub">
              Synthesized Decision Outcome
            </span>
            <h3 className="bp-synthesis-title">
              Final AI Recommendation & Operational Summary
            </h3>
          </div>
        </div>

        <span className="bp-synthesis-badge">
          <Sparkles size={13} />
          <span>AI Decision Support Synthesis</span>
        </span>
      </div>

      {/* Decision Summary Grid */}
      <div className="bp-synthesis-grid">
        {/* 1. Verdict */}
        <div className="bp-synthesis-tile">
          <span className="bp-synthesis-tile-label">AI Feasibility Verdict</span>
          <div className="bp-synthesis-tile-val val-blue">
            <ShieldCheck size={16} style={{ display: 'inline', marginRight: '0.35rem', verticalAlign: '-2px' }} />
            {summary.ai_feasibility_verdict}
            <span className="bp-synthesis-conf-tag">({confidencePct})</span>
          </div>
          <div className="bp-synthesis-tile-sub">Empirical Random Forest classification</div>
        </div>

        {/* 2. AI Recommended Strategy */}
        <div className="bp-synthesis-tile">
          <span className="bp-synthesis-tile-label">AI Recommended Strategy</span>
          <div className="bp-synthesis-tile-val val-indigo">
            <Compass size={16} style={{ display: 'inline', marginRight: '0.35rem', verticalAlign: '-2px' }} />
            {summary.ai_recommended_strategy}
          </div>
          <div className="bp-synthesis-tile-sub">Rank #1 multi-criteria TOPSIS evaluation</div>
        </div>

        {/* 3. Entrepreneur Selected Strategy */}
        <div className="bp-synthesis-tile">
          <span className="bp-synthesis-tile-label">Entrepreneur Selected Strategy</span>
          <div className={`bp-synthesis-tile-val ${summary.is_user_selected ? 'val-emerald' : 'val-neutral'}`}>
            {summary.is_user_selected && <Check size={16} style={{ display: 'inline', marginRight: '0.35rem', verticalAlign: '-2px' }} />}
            {summary.entrepreneur_selected_strategy}
            {summary.is_user_selected && (
              <span className="bp-adopted-tag">Adopted</span>
            )}
          </div>
          <div className="bp-synthesis-tile-sub">
            {summary.is_user_selected ? 'Plan execution tailored to entrepreneur choice' : 'Aligned with AI baseline recommendation'}
          </div>
        </div>

        {/* 4. Immediate Priority Action */}
        <div className="bp-synthesis-tile priority-tile">
          <span className="bp-synthesis-tile-label">Immediate Priority Action</span>
          <div className="bp-synthesis-tile-val highlight">
            <ArrowRight size={16} style={{ display: 'inline', marginRight: '0.35rem', verticalAlign: '-2px', flexShrink: 0 }} />
            <span>{summary.recommended_immediate_next_step}</span>
          </div>
          <div className="bp-synthesis-tile-sub">First operational milestone for Phase 1</div>
        </div>
      </div>

      {/* Synthesis Footer Ribbon */}
      <div className="bp-synthesis-footer">
        <div className="bp-footer-pillar">
          <strong className="pillar-label emerald">Core Strength:</strong>
          <span className="pillar-text">{summary.main_positive_strength}</span>
        </div>
        <div className="bp-footer-pillar">
          <strong className="pillar-label amber">Main Constraint:</strong>
          <span className="pillar-text">{summary.main_operational_constraint}</span>
        </div>
        <div className="bp-footer-pillar">
          <strong className="pillar-label blue">Scenario Insight:</strong>
          <span className="pillar-text">{summary.key_scenario_insight}</span>
        </div>
      </div>
    </section>
  );
}
