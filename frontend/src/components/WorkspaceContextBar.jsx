import React from 'react';
import { 
  Briefcase, 
  ShieldAlert, 
  Network, 
  CheckSquare, 
  ShieldCheck, 
  Sliders, 
  Download, 
  X,
  Building,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { downloadComponent4Report } from '../services/api';

export default function WorkspaceContextBar({
  activeAssessment,
  activeTab,
  onNavigate,
  onCloseAssessment
}) {
  if (!activeAssessment) return null;

  const businessName = activeAssessment.business_name || 
    activeAssessment.business_profile?.business_name || 
    activeAssessment.business_input?.business_name || 
    activeAssessment.business_id || 
    'Active Business';

  const businessId = activeAssessment.business_id || activeAssessment.analysis_id || 'SME-C4';
  const category = activeAssessment.business_category || activeAssessment.business_profile?.business_category || 'Enterprise';
  const stage = activeAssessment.business_stage || activeAssessment.business_profile?.business_stage || 'Operating';
  const district = activeAssessment.district || activeAssessment.business_profile?.district || 'Western Province';
  const overallRisk = String(activeAssessment.overall_risk_level || activeAssessment.overall_risk_category || 'LOW').toUpperCase();

  const handleDownloadReport = async () => {
    const analysisId = activeAssessment.analysis_id || activeAssessment.assessment_id;
    if (!analysisId) {
      alert('No assessment ID available for report download.');
      return;
    }
    try {
      await downloadComponent4Report(analysisId);
    } catch (err) {
      alert(`Could not download report: ${err.message}`);
    }
  };

  const tabs = [
    { id: 'c4_profile', label: 'Business Profile', icon: Briefcase },
    { id: 'c4_risk_results', label: 'Risk Assessment', icon: ShieldAlert },
    { id: 'c4_gnn_insights', label: 'GNN Insights', icon: Network },
    { id: 'c4_mitigation_plan', label: 'Mitigation Plan', icon: CheckSquare },
    { id: 'c4_growth_readiness', label: 'Growth Readiness', icon: ShieldCheck },
    { id: 'c4_scenarios', label: 'Scenario Analysis', icon: Sliders },
  ];

  const renderBadge = () => {
    if (overallRisk === 'LOW') {
      return (
        <span className="badge-risk-low">
          <CheckCircle2 size={12} /> Low Risk
        </span>
      );
    }
    if (overallRisk === 'MEDIUM') {
      return (
        <span className="badge-risk-medium">
          <AlertTriangle size={12} /> Medium Risk
        </span>
      );
    }
    if (overallRisk === 'HIGH') {
      return (
        <span className="badge-risk-high">
          <ShieldAlert size={12} /> High Risk
        </span>
      );
    }
    return (
      <span className="badge-risk-neutral">
        <Clock size={12} /> Evaluated
      </span>
    );
  };

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)',
      padding: '1rem 1.25rem',
      marginBottom: '1.5rem',
      boxShadow: 'var(--shadow-sm)'
    }}>
      {/* Top Details Row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
        paddingBottom: '0.85rem',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {businessName}
              </h2>
              {renderBadge()}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              <span>ID: <code style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{businessId}</code></span>
              <span>&bull;</span>
              <span>{category}</span>
              <span>&bull;</span>
              <span>{stage}</span>
              <span>&bull;</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                <MapPin size={11} /> {district}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={handleDownloadReport}
            className="btn btn-secondary"
            style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
            title="Download Risk & Mitigation Markdown Report"
          >
            <Download size={14} />
            <span>Export Report</span>
          </button>

          <button
            onClick={onCloseAssessment}
            className="btn btn-subtle"
            style={{ fontSize: '0.78rem', padding: '0.4rem 0.65rem' }}
            title="Close assessment and return to Overview"
          >
            <X size={15} />
            <span>Close</span>
          </button>
        </div>
      </div>

      {/* Contextual Navigation Tabs Row */}
      <div style={{
        display: 'flex',
        gap: '0.35rem',
        marginTop: '0.75rem',
        overflowX: 'auto',
        paddingBottom: '0.2rem'
      }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--primary-green)' : 'var(--text-secondary)',
                background: isActive ? 'var(--primary-green-subtle)' : 'transparent',
                border: isActive ? '1px solid var(--primary-green-border)' : '1px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={14} style={{ color: isActive ? 'var(--primary-green)' : 'var(--text-secondary)' }} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
