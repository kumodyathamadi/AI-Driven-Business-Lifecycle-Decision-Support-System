import React from 'react';
import { ListOrdered, ChevronRight, CheckCircle2, ChevronDown } from 'lucide-react';

export default function PlanContents({
  activeSection,
  openSections = {},
  onSelectSection
}) {
  const sections = [
    {
      id: 'section-01',
      num: '01',
      title: 'Business & Market Overview',
      desc: 'Enterprise profile, market catchment & location dynamics'
    },
    {
      id: 'section-02',
      num: '02',
      title: 'AI Feasibility & Key Insights',
      desc: 'Random Forest prediction, SHAP enablers & constraints'
    },
    {
      id: 'section-03',
      num: '03',
      title: 'Strategic Recommendations & TOPSIS',
      desc: 'Multi-criteria ranking & entrepreneur strategy alignment'
    },
    {
      id: 'section-04',
      num: '04',
      title: 'Financial & Operational Plan',
      desc: 'Revenue model, capital allocation, staffing & equipment'
    },
    {
      id: 'section-05',
      num: '05',
      title: 'Scenario Analysis & Action Roadmap',
      desc: 'What-If simulations, 4-phase timeline & measurable KPIs'
    }
  ];

  const handleLinkClick = (e, sectionId, numKey) => {
    e.preventDefault();
    if (onSelectSection) {
      onSelectSection(numKey, sectionId);
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <nav className="bp-contents-nav" aria-label="Plan contents">
      <div className="bp-contents-header">
        <div className="bp-contents-header-title">
          <ListOrdered size={16} className="bp-contents-header-icon" />
          <span>Plan Contents</span>
        </div>
        <span className="bp-contents-count">5 Sections</span>
      </div>

      <div className="bp-contents-list" role="list">
        {sections.map((sec, idx) => {
          const numKey = idx + 1;
          const isOpen = Boolean(openSections[numKey]);
          const isActive = activeSection === sec.id;

          return (
            <a
              key={sec.id}
              href={`#${sec.id}`}
              onClick={(e) => handleLinkClick(e, sec.id, numKey)}
              className={`bp-contents-item ${isOpen ? 'is-open' : ''} ${isActive ? 'is-active' : ''}`}
              role="listitem"
              aria-current={isActive ? 'true' : undefined}
            >
              <span className="bp-contents-num">{sec.num}</span>
              <div className="bp-contents-info">
                <span className="bp-contents-item-title">{sec.title}</span>
                <span className="bp-contents-item-desc">{sec.desc}</span>
              </div>
              <span className="bp-contents-state" title={isOpen ? 'Section open' : 'Section collapsed'}>
                {isOpen ? (
                  <span className="bp-contents-pill open">Open</span>
                ) : (
                  <span className="bp-contents-pill">View</span>
                )}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
