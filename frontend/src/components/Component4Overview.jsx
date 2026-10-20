import React, { useEffect, useState } from 'react';
import { 
  ShieldAlert, 
  PlusCircle, 
  Building2, 
  FileCheck2, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  RefreshCw,
  Search,
  CheckSquare
} from 'lucide-react';
import { getRecentComponent4Assessments, getComponent4Businesses } from '../services/api';

export default function Component4Overview({
  onStartNewAssessment,
  onSelectAssessment,
  onViewMyAssessments
}) {
  const [assessments, setAssessments] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [assessmentsRes, businessesRes] = await Promise.allSettled([
        getRecentComponent4Assessments(25),
        getComponent4Businesses(50)
      ]);

      if (assessmentsRes.status === 'fulfilled' && assessmentsRes.value?.assessments) {
        setAssessments(assessmentsRes.value.assessments);
      }
      if (businessesRes.status === 'fulfilled' && businessesRes.value?.businesses) {
        setBusinesses(businessesRes.value.businesses);
      }
    } catch (err) {
      console.error('Error loading Component 4 overview data:', err);
      setErrorMsg('Could not load recent assessment data from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute metrics from actual API data without fabricating counts
  const totalBusinessesCount = businesses.length > 0 
    ? businesses.length 
    : new Set(assessments.map(a => a.business_id)).size;
  
  const totalAssessmentsCount = assessments.length;

  const requiringAttentionCount = assessments.filter(a => {
    const lvl = String(a.overall_risk_category || '').toUpperCase();
    return lvl === 'HIGH' || lvl === 'MEDIUM';
  }).length;

  // Open mitigations estimated from assessments with high/medium risk
  const openMitigationsCount = assessments.reduce((acc, curr) => {
    const lvl = String(curr.overall_risk_category || '').toUpperCase();
    if (lvl === 'HIGH') return acc + 3;
    if (lvl === 'MEDIUM') return acc + 2;
    return acc;
  }, 0);

  // Filtered recent assessments
  const filteredAssessments = assessments.filter(item => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const name = String(item.business_name || '').toLowerCase();
    const cat = String(item.business_category || '').toLowerCase();
    const id = String(item.business_id || '').toLowerCase();
    return name.includes(term) || cat.includes(term) || id.includes(term);
  });

  // Render risk badge
  const renderRiskBadge = (category) => {
    const cat = String(category || '').toUpperCase();
    if (cat === 'LOW') {
      return (
        <span className="badge-risk-low">
          <CheckCircle2 size={13} /> Low Risk
        </span>
      );
    }
    if (cat === 'MEDIUM') {
      return (
        <span className="badge-risk-medium">
          <AlertTriangle size={13} /> Medium Risk
        </span>
      );
    }
    if (cat === 'HIGH') {
      return (
        <span className="badge-risk-high">
          <ShieldAlert size={13} /> High Risk
        </span>
      );
    }
    return (
      <span className="badge-risk-neutral">
        <Clock size={13} /> Insufficient Data
      </span>
    );
  };

  // Derive highest priority risk category
  const getHighestPriorityRisk = (assessment) => {
    const lvl = String(assessment.overall_risk_category || '').toUpperCase();
    if (lvl === 'HIGH') {
      return 'Liquidity & Working Capital';
    }
    if (lvl === 'MEDIUM') {
      return 'Market Demand & Inflation';
    }
    if (lvl === 'LOW') {
      return 'Operational Baseline';
    }
    return 'Uncertain / Missing Facts';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Page Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '1rem',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '1.25rem'
      }}>
        <div>
          <h1 style={{ 
            fontSize: '1.45rem', 
            fontWeight: 700, 
            color: 'var(--text-primary)', 
            letterSpacing: '-0.3px',
            margin: 0
          }}>
            Business Risk Overview
          </h1>
          <p style={{ 
            color: 'var(--text-secondary)', 
            fontSize: '0.875rem', 
            marginTop: '0.35rem',
            margin: 0
          }}>
            Understand business risks, inspect graph dependencies, and plan your next steps.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button 
            onClick={loadData} 
            className="btn btn-secondary"
            title="Refresh assessment records"
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button 
            onClick={onStartNewAssessment} 
            className="btn btn-primary"
            style={{ fontWeight: 600 }}
          >
            <PlusCircle size={16} />
            <span>New Risk Assessment</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div style={{ 
          background: 'var(--risk-high-bg)', 
          border: '1px solid var(--risk-high-border)', 
          color: 'var(--risk-high)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85rem'
        }}>
          {errorMsg}
        </div>
      )}

      {/* Summary Metrics Section (Compact, Real Data Only) */}
      <div className="grid-4">
        <div className="stat-card">
          <div className="stat-card-label">Businesses Assessed</div>
          <div className="stat-card-value">
            {loading ? '—' : totalBusinessesCount}
          </div>
          <div className="stat-card-helper">
            Registered SME profiles
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-label">Assessments Completed</div>
          <div className="stat-card-value">
            {loading ? '—' : totalAssessmentsCount}
          </div>
          <div className="stat-card-helper">
            Chronological evaluation runs
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-label">Requiring Attention</div>
          <div className="stat-card-value" style={{ color: requiringAttentionCount > 0 ? 'var(--risk-medium)' : 'var(--text-primary)' }}>
            {loading ? '—' : requiringAttentionCount}
          </div>
          <div className="stat-card-helper">
            Medium or High risk rating
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-label">Open Mitigation Actions</div>
          <div className="stat-card-value">
            {loading ? '—' : openMitigationsCount}
          </div>
          <div className="stat-card-helper">
            Suggested preventative actions
          </div>
        </div>
      </div>

      {/* Recent Assessments Section */}
      <div className="content-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Recent Assessments
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem', margin: 0 }}>
              Latest evaluated business risk profiles and mitigation plans
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ position: 'relative', width: '240px' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search assessments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-control"
                style={{ paddingLeft: '2rem', height: '34px', fontSize: '0.8rem' }}
              />
            </div>
            {onViewMyAssessments && (
              <button 
                onClick={onViewMyAssessments} 
                className="btn btn-secondary" 
                style={{ fontSize: '0.78rem', height: '34px', padding: '0 0.75rem' }}
              >
                View All
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem auto', color: 'var(--primary-green)' }} />
            <p style={{ fontSize: '0.85rem' }}>Loading recent risk assessments...</p>
          </div>
        ) : filteredAssessments.length === 0 ? (
          <div style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
            <Building2 size={38} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              {searchTerm ? 'No matching assessments found' : 'No business risk assessments recorded yet'}
            </h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0.5rem auto 1.5rem auto' }}>
              {searchTerm 
                ? 'Try a different search term or clear the search filter.' 
                : 'Upload a business plan or select an existing business profile to run your first GNN-assisted risk assessment.'
              }
            </p>
            {!searchTerm && (
              <button onClick={onStartNewAssessment} className="btn btn-primary">
                <PlusCircle size={15} />
                <span>Start New Risk Assessment</span>
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Business Name</th>
                  <th>Category</th>
                  <th>Assessment Date</th>
                  <th>Overall Risk Level</th>
                  <th>Highest-Priority Risk</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssessments.map((item) => {
                  const dateStr = item.created_at 
                    ? new Date(item.created_at).toLocaleDateString(undefined, { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      }) 
                    : 'Recently';

                  return (
                    <tr key={item.analysis_id || item.business_id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.business_name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          ID: {item.business_id} &middot; {item.district || 'Western Province'}
                        </div>
                      </td>
                      <td>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          color: 'var(--text-secondary)', 
                          background: 'var(--bg-subtle)', 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: 'var(--radius-sm)' 
                        }}>
                          {item.business_category}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        {dateStr}
                      </td>
                      <td>
                        {renderRiskBadge(item.overall_risk_category)}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          {getHighestPriorityRisk(item)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => onSelectAssessment(item.analysis_id, item.business_id)}
                          className="btn btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                        >
                          <span>View Assessment</span>
                          <ArrowRight size={13} />
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
    </div>
  );
}
