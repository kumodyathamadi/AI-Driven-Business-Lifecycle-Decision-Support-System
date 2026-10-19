import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function PlanSection({
  id,
  number,
  title,
  icon: Icon,
  description,
  isOpen = false,
  onToggle,
  badge,
  children
}) {
  return (
    <section 
      id={id} 
      className={`bp-section ${isOpen ? 'is-expanded' : 'is-collapsed'}`}
      aria-labelledby={`${id}-heading`}
    >
      {/* Section Header Accordion Toggle */}
      <div 
        className="bp-section-header"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle && onToggle();
          }
        }}
        aria-expanded={isOpen}
        aria-controls={`${id}-content`}
      >
        <span className="bp-section-num" aria-hidden="true">{number}</span>
        
        <div className="bp-section-heading-text">
          <div className="bp-section-title-row">
            <h2 id={`${id}-heading`} className="bp-section-title">
              {Icon && <Icon size={20} className="bp-section-icon" aria-hidden="true" />}
              <span>{title}</span>
            </h2>
            {badge && <span className="bp-section-badge-wrapper">{badge}</span>}
          </div>
          {description && (
            <p className="bp-section-subtitle">{description}</p>
          )}
        </div>

        <button 
          type="button" 
          className="bp-section-toggle"
          aria-label={isOpen ? `Collapse section ${number}` : `Expand section ${number}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggle && onToggle();
          }}
        >
          <span className="bp-section-toggle-text">
            {isOpen ? 'Hide Section' : 'Show Section'}
          </span>
          {isOpen ? (
            <ChevronUp size={18} className="bp-section-toggle-icon" />
          ) : (
            <ChevronDown size={18} className="bp-section-toggle-icon" />
          )}
        </button>
      </div>

      {/* Section Collapsible Body */}
      {isOpen && (
        <div id={`${id}-content`} className="bp-section-body" role="region" aria-labelledby={`${id}-heading`}>
          {children}
        </div>
      )}
    </section>
  );
}
