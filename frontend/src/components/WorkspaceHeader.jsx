import React from 'react';
import { 
  Building2, 
  MapPin, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Briefcase, 
  ShieldAlert, 
  Sparkles, 
  ShieldCheck, 
  Sliders, 
  Clock, 
  FileText 
} from 'lucide-react';
import { formatLKR } from './Dashboard';

export default function WorkspaceHeader({ profile, activeTab, onNavigate }) {
  if (!profile) return null;

  const input = profile.business_input || {};
  const metadata = profile.metadata || {};
  const feasibility = profile.feasibility_analysis || {};

  const businessName = input.business_name || profile.business_name || `${input.business_category || 'SME'} Enterprise`;
  const recordId = metadata.record_id || profile.id || 'N/A';
  const shortId = String(recordId).length > 12 ? String(recordId).slice(0, 8) : recordId;
  const stage = input.business_stage || profile.business_stage || 'Operating';
  const district = input.district || profile.district || 'Western Province';
  const capital = input.available_capital_lkr;
  const evalDate = metadata.generated_at || profile.created_at || new Date().toISOString();

  const getFeasibilityBadge = (label) => {
    if (!label) return null;
    const clean = String(label).trim();
    if (clean === 'Feasible') {
      return (
        <span className="badge-feasible" style={{ padding: '0.25rem 0.65rem', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
          <CheckCircle2 size={13} /> Feasible
        </span>
      );
    }
    if (clean === 'Conditionally Feasible') {
      return (
        <span className="badge-conditionally" style={{ padding: '0.25rem 0.65rem', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
          <AlertTriangle size={13} /> Conditionally Feasible
        </span>
      );
    }
    return (
      <span className="badge-infeasible" style={{ padding: '0.25rem 0.65rem', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
        <XCircle size={13} /> Infeasible
      </span>
    );
  };

  const workspaceTabs = [
    { id: 'overview', label: 'Business Overview', icon: Briefcase },
    { id: 'workspace_risk', label: 'Risk Assessment', icon: ShieldAlert },
    { id: 'mitigation_plan', label: 'Mitigation Plan', icon: Sparkles },
    { id: 'growth_readiness', label: 'Growth Readiness', icon: ShieldCheck },
    { id: 'scenarios', label: 'Scenarios', icon: Sliders },
    { id: 'workspace_history', label: 'Assessment History', icon: Clock },
    { id: 'plan', label: 'Business Plan', icon: FileText },
  ];

  return (
    <div 
      className="glass-card" 
      style={{ 
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)', 
        border: '1px solid rgba(59, 130, 246, 0.25)', 
        borderRadius: '14px', 
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem'
      }}
    >
      {/* Header Info Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.68rem', color: '#60a5fa', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              BUSINESS WORKSPACE
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#c7d2fe', background: 'rgba(99, 102, 241, 0.25)', padding: '0.15rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(99, 102, 241, 0.4)' }}>
              Ref #{shortId}
            </span>
            <span style={{ fontSize: '0.68rem', color: '#93c5fd', background: 'rgba(59, 130, 246, 0.15)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
              {stage}
            </span>
          </div>

          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff', margin: '0.35rem 0 0 0' }}>
            {businessName}
          </h2>

          <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.45rem', fontSize: '0.78rem', color: '#cbd5e1', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <MapPin size={13} style={{ color: '#60a5fa' }} />
              Location: <strong style={{ color: '#ffffff' }}>{district}</strong>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <DollarSign size={13} style={{ color: '#4ade80' }} />
              Capital: <strong style={{ color: '#ffffff' }}>{formatLKR(capital)}</strong>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Calendar size={13} style={{ color: '#c084fc' }} />
              Assessment Date: <strong style={{ color: '#ffffff' }}>{new Date(evalDate).toLocaleDateString()}</strong>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
          {getFeasibilityBadge(feasibility.predicted_label)}
        </div>
      </div>

      {/* Workspace Sub-Navigation Pills */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingTop: '0.85rem' }}>
        {workspaceTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id ||
            (tab.id === 'growth_readiness' && (activeTab === 'feasibility' || activeTab === 'insights')) ||
            (tab.id === 'mitigation_plan' && (activeTab === 'recommendations' || activeTab === 'options')) ||
            (tab.id === 'scenarios' && activeTab === 'scenario') ||
            (tab.id === 'workspace_history' && activeTab === 'history');

          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.75rem',
                fontWeight: isActive ? 700 : 500,
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                border: isActive ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
                background: isActive ? 'rgba(59, 130, 246, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                color: isActive ? '#93c5fd' : '#cbd5e1',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={14} style={{ color: isActive ? '#60a5fa' : '#94a3b8' }} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
