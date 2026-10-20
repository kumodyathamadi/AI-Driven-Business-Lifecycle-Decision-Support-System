import React from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  ShieldAlert, 
  History,
  Briefcase, 
  ShieldCheck, 
  Sparkles, 
  Sliders, 
  FileText,
  Clock,
  Sparkle
} from 'lucide-react';
import Logo from './Logo';

export default function Sidebar({ activeTab, setActiveTab, activeProfile }) {
  const hasProfile = Boolean(activeProfile);

  // Four Primary Destinations as required by Section 2:
  // 1. Home
  // 2. My Businesses
  // 3. Risk Assessment
  // 4. Reports & History
  const mainNavItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'my_businesses', label: 'My Businesses', icon: Building2 },
    { id: 'component4_risk', label: 'Risk Assessment', icon: ShieldAlert },
    { id: 'reports_history', label: 'Reports & History', icon: History },
  ];

  // Workspace items organized logically for active business
  const workspaceNavItems = [
    { id: 'overview', label: 'Business Overview', icon: Briefcase, enabled: hasProfile },
    { id: 'workspace_risk', label: 'Risk Assessment', icon: ShieldAlert, enabled: hasProfile },
    { id: 'mitigation_plan', label: 'Mitigation Plan', icon: Sparkles, enabled: hasProfile },
    { id: 'growth_readiness', label: 'Growth Readiness', icon: ShieldCheck, enabled: hasProfile },
    { id: 'scenarios', label: 'Scenarios', icon: Sliders, enabled: hasProfile },
    { id: 'workspace_history', label: 'Assessment History', icon: Clock, enabled: hasProfile },
    { id: 'plan', label: 'Business Plan', icon: FileText, enabled: hasProfile },
  ];

  return (
    <aside className="sidebar" aria-label="Main Navigation">
      
      {/* Brand Header */}
      <div 
        className="sidebar-brand-header" 
        onClick={() => setActiveTab('dashboard')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveTab('dashboard'); }}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.65rem', 
          marginBottom: '1.25rem', 
          paddingBottom: '0.85rem', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          cursor: 'pointer'
        }}
      >
        <Logo variant="compact" height={34} />
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ffffff', letterSpacing: '-0.2px' }}>SME360 AI</div>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Decision Support System</div>
        </div>
      </div>

      {/* Primary Navigation Destinations */}
      <div className="sidebar-heading" style={{ color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700, marginBottom: '0.5rem' }}>
        PRIMARY NAVIGATION
      </div>
      <nav className="nav-list" style={{ marginBottom: '1.5rem' }} aria-label="Primary Navigation">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`nav-item-btn ${isActive ? 'active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={18} style={{ color: isActive ? '#60a5fa' : '#94a3b8' }} />
              <span style={{ fontWeight: isActive ? 700 : 500 }}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Selected Business Workspace Section */}
      <div className="sidebar-heading" style={{ color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>BUSINESS WORKSPACE</span>
        {hasProfile ? (
          <span style={{ fontSize: '0.6rem', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
            Active
          </span>
        ) : (
          <span style={{ fontSize: '0.6rem', color: '#64748b' }}>
            None Selected
          </span>
        )}
      </div>

      <nav className="nav-list" aria-label="Business Workspace Navigation">
        {workspaceNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id || 
            (item.id === 'growth_readiness' && (activeTab === 'feasibility' || activeTab === 'insights')) ||
            (item.id === 'mitigation_plan' && (activeTab === 'recommendations' || activeTab === 'options')) ||
            (item.id === 'scenarios' && activeTab === 'scenario');
          const isDisabled = !item.enabled;

          return (
            <button
              key={item.id}
              disabled={isDisabled}
              onClick={() => setActiveTab(item.id)}
              className={`nav-item-btn ${isActive ? 'active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              style={{ opacity: isDisabled ? 0.35 : 1, cursor: isDisabled ? 'not-allowed' : 'pointer' }}
              title={isDisabled ? 'Select or assess a business first to access this section' : item.label}
            >
              <Icon size={18} style={{ color: isActive ? '#60a5fa' : '#94a3b8' }} />
              <span style={{ fontWeight: isActive ? 700 : 400 }}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {!hasProfile && (
        <div style={{ marginTop: '1.25rem', padding: '0.85rem', background: 'rgba(30, 58, 138, 0.2)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '10px', fontSize: '0.725rem', color: '#93c5fd', lineHeight: '1.45' }}>
          Assess a business in <strong>Risk Assessment</strong> or pick an enterprise from <strong>My Businesses</strong> to unlock workspace details.
        </div>
      )}
    </aside>
  );
}
