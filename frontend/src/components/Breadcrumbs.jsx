import React from 'react';
import { ChevronRight, Home, Building2, ShieldAlert, History } from 'lucide-react';

export default function Breadcrumbs({ activeTab, activeProfile, onNavigate }) {
  const getTabLabel = (tab) => {
    switch (tab) {
      case 'dashboard': return 'Home';
      case 'component4_risk': return 'Risk Assessment';
      case 'my_businesses': return 'My Businesses';
      case 'reports_history': return 'Reports & History';
      case 'new_analysis': return 'New Feasibility Check';
      case 'overview': return 'Business Overview';
      case 'workspace_risk': return 'Risk Dimensions';
      case 'mitigation_plan': return 'Mitigation Plan';
      case 'growth_readiness': return 'Growth Readiness';
      case 'scenarios': 
      case 'scenario': return 'Scenarios';
      case 'workspace_history':
      case 'history': return 'Assessment History';
      case 'plan': return 'Business Plan';
      case 'profile': return 'Business Profile';
      case 'feasibility': return 'Feasibility Assessment';
      case 'insights': return 'Key Drivers & SHAP';
      case 'recommendations': return 'Strategic Recommendations';
      case 'options': return 'TOPSIS Options';
      default: return 'Home';
    }
  };

  const isWorkspaceTab = [
    'overview', 'workspace_risk', 'mitigation_plan', 'growth_readiness', 'scenarios', 'workspace_history',
    'feasibility', 'insights', 'recommendations', 'options', 'scenario', 'plan', 'profile'
  ].includes(activeTab);

  const businessDisplayName = 
    activeProfile?.business_input?.business_name || 
    activeProfile?.business_name || 
    (activeProfile?.business_input?.business_category ? `${activeProfile.business_input.business_category} Enterprise` : null);

  return (
    <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.25rem', userSelect: 'none' }}>
      <button 
        onClick={() => onNavigate('dashboard')}
        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
      >
        <Home size={14} />
        <span>SME360 AI</span>
      </button>

      {isWorkspaceTab && activeProfile && (
        <>
          <ChevronRight size={14} style={{ color: '#64748b' }} />
          <button 
            onClick={() => onNavigate('my_businesses')}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Building2 size={14} />
            <span>My Businesses</span>
          </button>
          
          <ChevronRight size={14} style={{ color: '#64748b' }} />
          <span style={{ color: '#cbd5e1', fontWeight: 600 }}>
            {businessDisplayName || 'Active Business Workspace'}
          </span>
        </>
      )}

      <ChevronRight size={14} style={{ color: '#64748b' }} />
      <span style={{ color: '#60a5fa', fontWeight: 600 }}>
        {getTabLabel(activeTab)}
      </span>
    </nav>
  );
}
