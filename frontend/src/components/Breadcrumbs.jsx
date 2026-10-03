import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home, Building2, Briefcase } from 'lucide-react';
import { formatText } from '../utils/formatters';

export default function Breadcrumbs({ activeProfile }) {
  const location = useLocation();
  const path = location.pathname;

  // Root crumb
  const crumbs = [
    { label: 'SME360 AI', to: '/dashboard', icon: Home }
  ];

  if (path.startsWith('/dashboard')) {
    crumbs.push({ label: 'Dashboard', to: '/dashboard' });
  } else if (path.startsWith('/businesses')) {
    const parts = path.split('/').filter(Boolean); // ['businesses', ':id', 'feasibility'?]
    if (parts.length >= 2) {
      const bizId = parts[1];
      const bName = activeProfile?.business_input?.business_name || activeProfile?.business_name;
      const bizName = bName
        ? bName
        : activeProfile?.business_input?.business_category 
        ? `${activeProfile.business_input.business_category} · ${activeProfile.business_input.district || 'Colombo'}`
        : 'Business Workspace';

      crumbs.push({ label: bizName, to: `/businesses/${bizId}` });

      if (parts.length >= 3) {
        const sub = parts[2];
        const labels = {
          feasibility: 'Feasibility Assessment',
          insights: 'Key Insights',
          recommendations: 'Recommendations & Options',
          options: 'Recommendations & Options',
          scenarios: 'Scenario Explorer',
          plan: 'Business Plan'
        };
        crumbs.push({ label: labels[sub] || sub, to: path });
      } else {
        crumbs.push({ label: 'Overview', to: `/businesses/${bizId}` });
      }
    }
  }

  return (
    <nav 
      aria-label="Breadcrumb"
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.45rem', 
        fontSize: '0.8rem', 
        color: '#94a3b8', 
        marginBottom: '1.25rem', 
        userSelect: 'none',
        flexWrap: 'wrap'
      }}
    >
      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1;
        const Icon = crumb.icon;

        return (
          <React.Fragment key={crumb.to + idx}>
            {idx > 0 && <ChevronRight size={13} style={{ color: '#475569' }} />}
            {isLast ? (
              <span style={{ color: '#60a5fa', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                {Icon && <Icon size={14} />}
                <span>{crumb.label}</span>
              </span>
            ) : (
              <Link
                to={crumb.to}
                style={{ 
                  color: '#94a3b8', 
                  textDecoration: 'none', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.35rem',
                  transition: 'color 0.15s ease'
                }}
              >
                {Icon && <Icon size={14} />}
                <span>{crumb.label}</span>
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
