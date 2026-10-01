import React from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  PlusCircle, 
  Briefcase, 
  ShieldCheck, 
  Lightbulb, 
  Sparkles, 
  Layers, 
  Sliders, 
  FileText,
  Settings
} from 'lucide-react';
import Logo from './Logo';

export default function Sidebar({ activeProfile, activeBusinessId }) {
  const location = useLocation();

  // Determine active business ID from URL or activeProfile
  const match = location.pathname.match(/^\/businesses\/([^\/]+)/);
  const currentBusinessId = match ? match[1] : (activeBusinessId || activeProfile?.metadata?.record_id);
  const hasBusiness = Boolean(currentBusinessId);

  const mainNavItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/businesses', label: 'My Businesses', icon: Building2 },
    { to: '/analysis/new', label: 'New Analysis', icon: PlusCircle },
    { to: '/settings', label: 'Settings & Profile', icon: Settings },
  ];

  const workspaceNavItems = [
    { 
      to: hasBusiness ? `/businesses/${currentBusinessId}` : '#', 
      label: 'Overview', 
      icon: Briefcase, 
      enabled: hasBusiness,
      exact: true
    },
    { 
      to: hasBusiness ? `/businesses/${currentBusinessId}/feasibility` : '#', 
      label: 'Feasibility Assessment', 
      icon: ShieldCheck, 
      enabled: hasBusiness 
    },
    { 
      to: hasBusiness ? `/businesses/${currentBusinessId}/insights` : '#', 
      label: 'Key Insights', 
      icon: Lightbulb, 
      enabled: hasBusiness 
    },
    { 
      to: hasBusiness ? `/businesses/${currentBusinessId}/recommendations` : '#', 
      label: 'Recommendations', 
      icon: Sparkles, 
      enabled: hasBusiness 
    },
    { 
      to: hasBusiness ? `/businesses/${currentBusinessId}/options` : '#', 
      label: 'Explore Options', 
      icon: Layers, 
      enabled: hasBusiness 
    },
    { 
      to: hasBusiness ? `/businesses/${currentBusinessId}/scenarios` : '#', 
      label: 'Scenario Explorer', 
      icon: Sliders, 
      enabled: hasBusiness 
    },
    { 
      to: hasBusiness ? `/businesses/${currentBusinessId}/plan` : '#', 
      label: 'Business Plan', 
      icon: FileText, 
      enabled: hasBusiness 
    },
  ];

  return (
    <aside className="sidebar">
      
      {/* Brand Header */}
      <Link 
        to="/dashboard"
        className="sidebar-brand-header" 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.65rem', 
          marginBottom: '1.25rem', 
          paddingBottom: '0.85rem', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          cursor: 'pointer',
          textDecoration: 'none'
        }}
      >
        <Logo variant="compact" height={34} />
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ffffff', letterSpacing: '-0.2px' }}>SME360 AI</div>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Decision Support System</div>
        </div>
      </Link>

      {/* Main Navigation */}
      <div className="sidebar-heading" style={{ color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700, marginBottom: '0.5rem' }}>
        NAVIGATION
      </div>
      <nav className="nav-list" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to || (item.to === '/businesses' && location.pathname === '/businesses');

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`nav-item-btn ${isActive ? 'active' : ''}`}
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
            >
              <Icon size={18} style={{ color: isActive ? '#60a5fa' : '#94a3b8' }} />
              <span style={{ fontWeight: isActive ? 700 : 500 }}>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Active Business Workspace Navigation */}
      <div className="sidebar-heading" style={{ color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>BUSINESS WORKSPACE</span>
        {hasBusiness && (
          <span style={{ fontSize: '0.6rem', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
            Active
          </span>
        )}
      </div>

      <nav className="nav-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {workspaceNavItems.map((item) => {
          const Icon = item.icon;
          const isDisabled = !item.enabled;

          let isActive = false;
          if (hasBusiness) {
            if (item.exact) {
              isActive = location.pathname === `/businesses/${currentBusinessId}`;
            } else {
              isActive = location.pathname === item.to;
            }
          }

          if (isDisabled) {
            return (
              <div
                key={item.label}
                className="nav-item-btn"
                style={{ opacity: 0.35, cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: '0.75rem', pointerEvents: 'none' }}
                title="Select a business to unlock this workspace module"
              >
                <Icon size={18} style={{ color: '#64748b' }} />
                <span style={{ fontWeight: 400 }}>{item.label}</span>
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              to={item.to}
              className={`nav-item-btn ${isActive ? 'active' : ''}`}
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
            >
              <Icon size={18} style={{ color: isActive ? '#60a5fa' : '#94a3b8' }} />
              <span style={{ fontWeight: isActive ? 700 : 400 }}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {!hasBusiness && (
        <div style={{ marginTop: '1.5rem', padding: '0.85rem', background: 'rgba(30, 58, 138, 0.25)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '10px', fontSize: '0.725rem', color: '#93c5fd', lineHeight: '1.4' }}>
          💡 Select a business or click <strong>New Analysis</strong> to unlock workspace modules.
        </div>
      )}
    </aside>
  );
}
