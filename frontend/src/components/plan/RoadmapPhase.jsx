import React from 'react';
import { Calendar, CheckCircle2, ArrowRight } from 'lucide-react';

export default function RoadmapPhase({
  phaseNumber,
  phaseTitle,
  phaseFocus,
  actions = [],
  variant = 'blue'
}) {
  return (
    <div className={`bp-timeline-phase phase-${variant}`}>
      <div className={`bp-timeline-node node-${variant}`} aria-hidden="true">
        {phaseNumber}
      </div>

      <div className="bp-timeline-content">
        <div className="bp-timeline-phase-header">
          <span className={`bp-phase-badge badge-${variant}`}>
            <Calendar size={13} aria-hidden="true" />
            <span>{phaseTitle}</span>
          </span>
          {phaseFocus && (
            <span className="bp-phase-focus">{phaseFocus}</span>
          )}
        </div>

        <div className="bp-phase-card">
          <ul className="bp-action-list" role="list">
            {actions.map((item, idx) => (
              <li key={idx} className="bp-action-item" role="listitem">
                <span className={`bp-action-bullet bullet-${variant}`} aria-hidden="true" />
                <span className="bp-action-text">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
