import React from 'react';
import { 
  LayoutDashboard, 
  PlusCircle,
  Building2, 
  FileText,
  Briefcase, 
  ShieldAlert, 
  Network, 
  CheckSquare, 
  ShieldCheck, 
  Sliders,
  X
} from 'lucide-react';
import Logo from './Logo';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  activeAssessment,
  onClearActiveAssessment 
}) {
  const hasActiveAssessment = Boolean(activeAssessment);

  // Four Primary Global Destinations
  const primaryNavItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'new_assessment', label: 'New Risk Assessment', icon: PlusCircle },
    { id: 'my_assessments', label: 'My Assessments', icon: Building2 },
    { id: 'reports', label: 'Reports', icon: FileText },
  ];

  // Contextual Navigation for the Active Business Assessment
  const contextualNavItems = [
    { id: 'c4_profile', label: 'Business Profile', icon: Briefcase },
    { id: 'c4_risk_results', label: 'Risk Assessment', icon: ShieldAlert },
    { id: 'c4_gnn_insights', label: 'GNN Insights', icon: Network },
    { id: 'c4_mitigation_plan', label: 'Mitigation Plan', icon: CheckSquare },
    { id: 'c4_growth_readiness', label: 'Growth Readiness', icon: ShieldCheck },
    { id: 'c4_scenarios', label: 'Scenario Analysis', icon: Sliders },
  ];

  // Derive business display name
  const businessName = activeAssessment?.business_name || 
    activeAssessment?.business_profile?.business_name || 
    activeAssessment?.business_input?.business_name || 
    activeAssessment?.business_id || 
    'Active Business';

  return (
    <aside className="sidebar" aria-label="Component 4 Navigation">
      {/* Brand Header */}
      <div 
        onClick={() => setActiveTab('overview')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveTab('overview'); }}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.65rem', 
          marginBottom: '1.5rem', 
          paddingBottom: '0.85rem', 
          borderBottom: '1px solid var(--border-color)',
          cursor: 'pointer'
        }}
      >
        <Logo variant="compact" height={32} />
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
            SME360 AI
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
            Component 4 &middot; Risk Engine
          </div>
        </div>
      </div>

      {/* Primary Navigation */}
      <div className="sidebar-heading">
        MAIN NAVIGATION
      </div>
      <nav className="nav-list" style={{ marginBottom: '1.75rem' }} aria-label="Primary Navigation">
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`nav-item-btn ${isActive ? 'active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={17} style={{ color: isActive ? 'var(--primary-green)' : 'var(--text-secondary)' }} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Contextual Navigation: Visible ONLY when an active assessment is selected */}
      {hasActiveAssessment && (
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '0.5rem',
            padding: '0 0.5rem'
          }}>
            <div className="sidebar-heading" style={{ margin: 0, padding: 0 }}>
              ACTIVE ASSESSMENT
            </div>
            {onClearActiveAssessment && (
              <button
                onClick={onClearActiveAssessment}
                title="Close active assessment"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--text-secondary)'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Active Business Summary Pill */}
          <div style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.45rem 0.65rem',
            marginBottom: '0.75rem',
            marginRight: '0.25rem',
            marginLeft: '0.25rem'
          }}>
            <div style={{ 
              fontSize: '0.8rem', 
              fontWeight: 600, 
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {businessName}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
              <span style={{ 
                width: 6, 
                height: 6, 
                borderRadius: '50%', 
                background: 'var(--primary-green)' 
              }}></span>
              Loaded in Workspace
            </div>
          </div>

          <nav className="nav-list" aria-label="Contextual Assessment Navigation">
            {contextualNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`nav-item-btn ${isActive ? 'active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={17} style={{ color: isActive ? 'var(--primary-green)' : 'var(--text-secondary)' }} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </aside>
  );
}
