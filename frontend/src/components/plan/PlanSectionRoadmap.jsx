import React from 'react';
import { 
  Calendar, 
  Rocket, 
  TrendingUp, 
  Globe, 
  Check, 
  Clock 
} from 'lucide-react';

export default function PlanSectionRoadmap({ actionRoadmap = {} }) {
  const phase1Actions = actionRoadmap.phase_1_immediate_0_to_3_months || actionRoadmap.phase_1 || [];
  const phase2Actions = actionRoadmap.phase_2_growth_3_to_12_months 
    || actionRoadmap.phase_2_stabilization_3_to_12_months 
    || actionRoadmap.phase_2_medium_term_3_to_12_months 
    || actionRoadmap.phase_2 
    || [];
  const phase3Actions = actionRoadmap.phase_3_scale_1_year_plus 
    || actionRoadmap.phase_3_growth_1_year_plus 
    || actionRoadmap.phase_3_long_term_1_year_plus 
    || actionRoadmap.phase_3 
    || [];

  return (
    <div className="bp-section" id="section-roadmap">
      
      {/* Section Header */}
      <div className="bp-section-header">
        <span className="bp-section-num">05</span>
        <div className="bp-section-heading-text">
          <h2 className="bp-section-title">
            <Calendar size={18} style={{ color: '#fbbf24' }} />
            Time-Phased Action Roadmap & Execution Milestones
          </h2>
          <div className="bp-section-subtitle">
            Phased tactical execution plan spanning immediate launch, medium-term stabilization, and multi-year scale
          </div>
        </div>
      </div>

      {/* Visual Connected Timeline */}
      <div className="bp-roadmap-timeline">
        
        {/* Phase 1: 0 - 3 Months */}
        <div className="bp-timeline-phase phase-1">
          <div className="bp-timeline-node">
            <Rocket size={13} />
          </div>

          <div className="bp-timeline-phase-header">
            <span className="bp-phase-badge phase-1">
              <Clock size={12} />
              <span>Phase 1: Immediate Launch (0 – 3 Months)</span>
            </span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Execution Priority: High
            </span>
          </div>

          <div className="bp-phase-card">
            <ul className="bp-action-list">
              {phase1Actions.map((action, idx) => (
                <li key={idx} className="bp-action-item">
                  <div className="bp-action-bullet" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Phase 2: 3 - 12 Months */}
        <div className="bp-timeline-phase phase-2">
          <div className="bp-timeline-node">
            <TrendingUp size={13} />
          </div>

          <div className="bp-timeline-phase-header">
            <span className="bp-phase-badge phase-2">
              <Clock size={12} />
              <span>Phase 2: Operational Stabilization & Growth (3 – 12 Months)</span>
            </span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Execution Priority: Medium
            </span>
          </div>

          <div className="bp-phase-card">
            <ul className="bp-action-list">
              {phase2Actions.map((action, idx) => (
                <li key={idx} className="bp-action-item">
                  <div className="bp-action-bullet" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Phase 3: 1 Year+ */}
        <div className="bp-timeline-phase phase-3">
          <div className="bp-timeline-node">
            <Globe size={13} />
          </div>

          <div className="bp-timeline-phase-header">
            <span className="bp-phase-badge phase-3">
              <Clock size={12} />
              <span>Phase 3: Business Scale & Regional Expansion (1 Year+)</span>
            </span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Execution Priority: Long-Term
            </span>
          </div>

          <div className="bp-phase-card">
            <ul className="bp-action-list">
              {phase3Actions.map((action, idx) => (
                <li key={idx} className="bp-action-item">
                  <div className="bp-action-bullet" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>

    </div>
  );
}
