import React, { useEffect, useState } from 'react';
import { 
  ShieldAlert,
  Building2, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Sparkles,
  Layers,
  FileText,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  PlusCircle,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { fetchAnalysisRecords, getRecentComponent4Assessments } from '../services/api';

/**
 * Robust currency formatter for non-technical SME owners.
 * Guaranteed to never output "LKR NaN" or convert missing/null to zero.
 */
export const formatLKR = (val) => {
  if (val === null || val === undefined || val === '') {
    return 'Not provided';
  }
  const num = Number(val);
  if (isNaN(num)) {
    return 'Not available';
  }
  return `LKR ${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export default function Dashboard({ 
  activeProfile, 
  onStartNew, 
  onViewMyBusinesses, 
  onSelectRecord,
  onNavigateToRiskAssessment,
  onNavigateToReports
}) {
  const [component1Records, setComponent1Records] = useState([]);
  const [component4Runs, setComponent4Runs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAllRecentData = async () => {
    setLoading(true);
    try {
      const [c1Data, c4Data] = await Promise.allSettled([
        fetchAnalysisRecords(6),
        getRecentComponent4Assessments(6)
      ]);

      if (c1Data.status === 'fulfilled' && Array.isArray(c1Data.value)) {
        setComponent1Records(c1Data.value);
      }
      if (c4Data.status === 'fulfilled' && c4Data.value?.assessments) {
        setComponent4Runs(c4Data.value.assessments);
      }
    } catch (err) {
      console.error('Failed to load dashboard records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllRecentData();
  }, []);

  // Safe feasibility badge generator
  const getFeasibilityBadge = (label) => {
    if (!label) {
      return (
        <span style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'rgba(148, 163, 184, 0.1)', padding: '0.2rem 0.55rem', borderRadius: '4px', border: '1px solid rgba(148, 163, 184, 0.25)' }}>
          Pending Check
        </span>
      );
    }
    const clean = String(label).trim();
    if (clean === 'Feasible') {
      return (
        <span className="badge-feasible" style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
          <CheckCircle2 size={13} /> Feasible
        </span>
      );
    }
    if (clean === 'Conditionally Feasible') {
      return (
        <span className="badge-conditionally" style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
          <AlertTriangle size={13} /> Conditionally Feasible
        </span>
      );
    }
    return (
      <span className="badge-infeasible" style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
        <XCircle size={13} /> Infeasible
      </span>
    );
  };

  // Safe Component 4 Risk badge generator
  const getRiskBadge = (category) => {
    if (!category) {
      return (
        <span style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'rgba(148, 163, 184, 0.15)', padding: '0.2rem 0.55rem', borderRadius: '4px' }}>
          Not Assessed
        </span>
      );
    }
    const c = String(category).toLowerCase();
    if (c.includes('low')) {
      return (
        <span style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.35)', borderRadius: '4px', fontWeight: 700 }}>
          <CheckCircle2 size={13} /> Low Risk
        </span>
      );
    }
    if (c.includes('med')) {
      return (
        <span style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: '4px', fontWeight: 700 }}>
          <AlertTriangle size={13} /> Medium Risk
        </span>
      );
    }
    return (
      <span style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: '4px', fontWeight: 700 }}>
        <XCircle size={13} /> Higher Risk
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* 1. Hero Card with Prominent "Assess a Business" CTA */}
      <div 
        className="glass-card" 
        style={{ 
          background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.45) 0%, rgba(15, 23, 42, 0.85) 100%)', 
          border: '1px solid rgba(59, 130, 246, 0.35)',
          padding: '2rem',
          borderRadius: '14px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ maxWidth: '640px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.35)', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', color: '#60a5fa', fontWeight: 700, marginBottom: '0.65rem' }}>
              <ShieldAlert size={14} /> SME360 AI &bull; Lifecycle Decision Support
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.25, letterSpacing: '-0.3px', margin: 0 }}>
              SME Decision Support &amp; Risk Intelligence
            </h1>
            <p style={{ color: '#cbd5e1', fontSize: '0.88rem', marginTop: '0.65rem', lineHeight: '1.55' }}>
              Evaluate business runway, debt safety, operational vulnerabilities, and supplier concentration. Built specifically for Sri Lankan small business owners in Western Province.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', minWidth: '220px' }}>
            {/* Primary Action Button: Assess a Business */}
            <button 
              id="assess-business-primary-btn"
              onClick={onNavigateToRiskAssessment}
              className="btn btn-primary"
              style={{ 
                padding: '0.9rem 1.6rem', 
                fontSize: '0.95rem', 
                fontWeight: 700,
                boxShadow: '0 4px 16px rgba(59, 130, 246, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                borderRadius: '8px'
              }}
            >
              <ShieldAlert size={20} />
              <span>Assess a Business</span>
              <ArrowRight size={17} />
            </button>

            {/* Secondary Action: Component 1 Feasibility */}
            <button 
              onClick={onStartNew}
              className="btn btn-secondary"
              style={{ 
                padding: '0.65rem 1.2rem', 
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <PlusCircle size={15} />
              <span>New Feasibility Study</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Component 4 Clear Explanation Card */}
      <div 
        className="glass-card" 
        style={{ 
          background: 'rgba(15, 23, 42, 0.65)', 
          border: '1px solid rgba(99, 102, 241, 0.25)', 
          padding: '1.35rem 1.5rem',
          borderRadius: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '10px', padding: '0.75rem', color: '#818cf8' }}>
            <Layers size={24} />
          </div>
          <div style={{ flex: 1, minWidth: '280px' }}>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              How Component 4 Protects Your Enterprise
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: '0.45rem 0 0.85rem 0', lineHeight: '1.5' }}>
              While initial feasibility tells you whether a business idea can launch, <strong>Component 4</strong> evaluates what happens after startup: cash burn runway, debt repayment exposure, customer demand swings, and supplier dependency risks across <strong>Colombo, Gampaha, and Kalutara</strong>.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.75rem', color: '#cbd5e1' }}>
                <strong style={{ color: '#60a5fa', display: 'block', marginBottom: '0.15rem' }}>1. Financial Runway</strong>
                Calculates how many months of operational costs your cash reserves can support.
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.75rem', color: '#cbd5e1' }}>
                <strong style={{ color: '#a78bfa', display: 'block', marginBottom: '0.15rem' }}>2. Debt Burden</strong>
                Verifies loan obligations against expected cash flow before you over-leverage.
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.75rem', color: '#cbd5e1' }}>
                <strong style={{ color: '#34d399', display: 'block', marginBottom: '0.15rem' }}>3. Counterparty Network</strong>
                Evaluates supplier reliability and customer dependency using Graph AI.
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.75rem', color: '#cbd5e1' }}>
                <strong style={{ color: '#fbbf24', display: 'block', marginBottom: '0.15rem' }}>4. Plain Actions</strong>
                Delivers prioritized mitigations with cost estimates and timeline steps.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Pending Information-Confirmation Tasks Widget */}
      <div 
        className="glass-card" 
        style={{ 
          background: 'rgba(245, 158, 11, 0.08)', 
          border: '1px solid rgba(245, 158, 11, 0.25)', 
          padding: '1.25rem',
          borderRadius: '12px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '0.5rem', borderRadius: '8px', color: '#fbbf24' }}>
              <AlertCircle size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fef3c7' }}>
                Pending Review &amp; Confirmation Tasks
              </div>
              <p style={{ color: '#fde68a', fontSize: '0.78rem', margin: '0.2rem 0 0 0' }}>
                Have you recently uploaded a plan with conflicting numbers? Resolve differences in Step 2 of Risk Assessment to ensure your evaluation reflects your true numbers.
              </p>
            </div>
          </div>

          <button 
            onClick={onNavigateToRiskAssessment}
            className="btn btn-secondary"
            style={{ fontSize: '0.78rem', padding: '0.45rem 0.85rem', borderColor: 'rgba(245, 158, 11, 0.4)', color: '#fbbf24' }}
          >
            Review Pending Assessments &rarr;
          </button>
        </div>
      </div>

      {/* 4. Active Business Workspace Snapshot (if an assessment is currently loaded) */}
      {activeProfile && (
        <div 
          className="glass-card" 
          style={{ 
            border: '1px solid rgba(34, 197, 94, 0.35)', 
            background: 'rgba(6, 78, 59, 0.18)',
            padding: '1.25rem 1.5rem',
            borderRadius: '12px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  ACTIVE WORKSPACE ENTERPRISE
                </span>
                {activeProfile.metadata?.record_id && (
                  <span style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: '#86efac', background: 'rgba(34, 197, 94, 0.2)', padding: '0.1rem 0.4rem', borderRadius: '3px' }}>
                    ID: {activeProfile.metadata.record_id.slice(0, 8)}
                  </span>
                )}
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                {activeProfile.business_input?.business_name || `${activeProfile.business_input?.business_category || 'SME'} Venture`}
              </h3>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.3rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <span>Category: <strong style={{ color: '#ffffff' }}>{activeProfile.business_input?.business_category || 'General'}</strong></span>
                <span>Stage: <strong style={{ color: '#ffffff' }}>{activeProfile.business_input?.business_stage || 'Operating'}</strong></span>
                <span>District: <strong style={{ color: '#ffffff' }}>{activeProfile.business_input?.district || 'Western Province'}</strong></span>
                <span>Capital: <strong style={{ color: '#60a5fa' }}>{formatLKR(activeProfile.business_input?.available_capital_lkr)}</strong></span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div>
                {getFeasibilityBadge(activeProfile.feasibility_analysis?.predicted_label)}
              </div>
              <button 
                onClick={() => onSelectRecord(activeProfile.metadata?.record_id, 'overview')} 
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.55rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <span>Open Workspace</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Recent Business Risk & Feasibility Assessments */}
      <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} style={{ color: '#60a5fa' }} />
              Recent Business Assessments
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.25rem 0 0 0' }}>
              Recorded evaluation runs stored in your persistent database. Each entry is a distinct historical assessment with an immutable record ID.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={loadAllRecentData} 
              className="btn btn-secondary" 
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
              title="Refresh database records"
            >
              <RefreshCw size={13} />
            </button>
            <button 
              onClick={onViewMyBusinesses} 
              className="btn btn-secondary" 
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
            >
              View My Businesses
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
            Loading recent business assessments from database...
          </div>
        ) : component1Records.length === 0 && component4Runs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '10px' }}>
            <Building2 size={38} style={{ color: '#64748b', marginBottom: '0.75rem' }} />
            <h4 style={{ color: '#ffffff', fontSize: '1rem', fontWeight: 600, margin: 0 }}>No Business Assessments Found</h4>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.35rem', marginBottom: '1.25rem' }}>
              Run your first SME business assessment to evaluate feasibility, runway, and operating risks.
            </p>
            <button onClick={onNavigateToRiskAssessment} className="btn btn-primary" style={{ fontSize: '0.82rem' }}>
              <ShieldAlert size={16} />
              Assess a Business Now
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Business / Assessment ID</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Sector &amp; Stage</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>District</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Assessment Status</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Available Capital</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Assessment Date</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {component1Records.map((rec) => {
                  const shortId = rec.id ? rec.id.slice(0, 8) : 'Unknown';
                  const displayName = rec.business_name 
                    ? rec.business_name 
                    : `${rec.business_category} Assessment`;

                  return (
                    <tr key={rec.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ fontWeight: 700, color: '#ffffff' }}>{displayName}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: '#94a3b8' }}>
                          Ref #{shortId}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div>{rec.business_category}</div>
                        <span style={{ fontSize: '0.68rem', color: '#93c5fd', background: 'rgba(59, 130, 246, 0.12)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                          {rec.business_stage || 'Operating'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', color: '#cbd5e1' }}>
                        {rec.district || 'Western Province'}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        {getFeasibilityBadge(rec.feasibility_label || rec.predicted_label)}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'monospace', fontWeight: 600, color: rec.available_capital_lkr ? '#e2e8f0' : '#64748b' }}>
                        {formatLKR(rec.available_capital_lkr)}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                        {rec.created_at ? new Date(rec.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                        <button 
                          onClick={() => onSelectRecord(rec.id, 'overview')} 
                          className="btn btn-secondary"
                          style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}
                        >
                          Open Workspace
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Quick Navigation Shortcuts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        <div 
          onClick={onViewMyBusinesses}
          className="glass-card" 
          style={{ padding: '1.25rem', cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid rgba(255, 255, 255, 0.08)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <Building2 size={22} style={{ color: '#60a5fa' }} />
            <ChevronRight size={16} style={{ color: '#64748b' }} />
          </div>
          <h4 style={{ color: '#ffffff', fontSize: '0.92rem', fontWeight: 700, margin: 0 }}>My Businesses</h4>
          <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
            Access all saved enterprise profiles, trade counterparties, and past evaluations.
          </p>
        </div>

        <div 
          onClick={onNavigateToRiskAssessment}
          className="glass-card" 
          style={{ padding: '1.25rem', cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid rgba(255, 255, 255, 0.08)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <ShieldAlert size={22} style={{ color: '#818cf8' }} />
            <ChevronRight size={16} style={{ color: '#64748b' }} />
          </div>
          <h4 style={{ color: '#ffffff', fontSize: '0.92rem', fontWeight: 700, margin: 0 }}>Guided Risk Assessment</h4>
          <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
            Upload a business plan or select an existing entity for a 5-step risk analysis.
          </p>
        </div>

        <div 
          onClick={onNavigateToReports}
          className="glass-card" 
          style={{ padding: '1.25rem', cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid rgba(255, 255, 255, 0.08)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <FileText size={22} style={{ color: '#34d399' }} />
            <ChevronRight size={16} style={{ color: '#64748b' }} />
          </div>
          <h4 style={{ color: '#ffffff', fontSize: '0.92rem', fontWeight: 700, margin: 0 }}>Reports &amp; Downloads</h4>
          <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
            Download verified audit summaries, business plans in PDF/Word, and action plans.
          </p>
        </div>
      </div>

    </div>
  );
}
