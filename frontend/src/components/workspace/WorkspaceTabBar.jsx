import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Layers,
  Award,
  Sliders,
  FileText
} from 'lucide-react';

export default function WorkspaceTabBar({ businessId }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Exactly 4 structured tabs (No badges - badges moved to page section headings)
  const tabs = [
    {
      id: 'analysis',
      path: `/businesses/${businessId}`,
      label: 'Analysis',
      icon: Layers,
      match: (pathname) => {
        const p = pathname.replace(/\/+$/, '');
        const base = `/businesses/${businessId}`;
        return (
          p === base ||
          p === `${base}/analysis` ||
          p === `${base}/overview` ||
          p === `${base}/feasibility` ||
          p === `${base}/insights`
        );
      }
    },
    {
      id: 'strategies',
      path: `/businesses/${businessId}/strategies`,
      label: 'Strategies',
      icon: Award,
      match: (pathname) => {
        return (
          pathname.includes('/strategies') ||
          pathname.includes('/recommendations') ||
          pathname.includes('/options')
        );
      }
    },
    {
      id: 'scenarios',
      path: `/businesses/${businessId}/scenarios`,
      label: 'Scenarios',
      icon: Sliders,
      match: (pathname) => pathname.includes('/scenarios')
    },
    {
      id: 'plan',
      path: `/businesses/${businessId}/plan`,
      label: 'Business Plan',
      icon: FileText,
      match: (pathname) => pathname.includes('/plan')
    }
  ];

  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (index + 1) % tabs.length;
      navigate(tabs[nextIndex].path);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (index - 1 + tabs.length) % tabs.length;
      navigate(tabs[prevIndex].path);
    }
  };

  return (
    <div className="workspace-tabbar-wrapper" style={{ width: '100%', borderTop: '1px solid rgba(255, 255, 255, 0.07)' }}>
      {/* 4 Equal-width tabs without horizontal scroll arrows on desktop */}
      <div
        className="template-subnav-bar-grid"
        role="tablist"
        aria-label="Business Analysis Modules"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '0.4rem',
          width: '100%',
          padding: '0.65rem 0.25rem 0.4rem 0.25rem'
        }}
      >
        {tabs.map((tab, idx) => {
          const isActive = tab.match(location.pathname);
          const IconComponent = tab.icon;

          return (
            <Link
              key={tab.id}
              to={tab.path}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`template-tab-link ${isActive ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.55rem 0.65rem',
                borderRadius: '8px',
                textAlign: 'center',
                textDecoration: 'none',
                minWidth: 0,
                width: '100%'
              }}
            >
              {IconComponent && (
                <IconComponent
                  size={15}
                  style={{ opacity: isActive ? 1 : 0.7, flexShrink: 0 }}
                  aria-hidden="true"
                />
              )}
              <span className="tab-label-text" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tab.label}
              </span>
              {isActive && <span className="tab-active-dot" aria-hidden="true" style={{ flexShrink: 0 }} />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
