import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  Search, 
  Filter, 
  PlusCircle, 
  ArrowRight, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Clock, 
  History,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar
} from 'lucide-react';
import { getComponent4Businesses, getRecentComponent4Assessments, getComponent4BusinessHistory } from '../services/api';

export default function MyAssessments({
  onSelectAssessment,
  onStartNewForBusiness,
  onStartNewAssessment
}) {
  const [businesses, setBusinesses] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [expandedBizId, setExpandedBizId] = useState(null);
  const [bizHistory, setBizHistory] = useState({});
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bizRes, assessRes] = await Promise.allSettled([
        getComponent4Businesses(100),
        getRecentComponent4Assessments(50)
      ]);

      if (bizRes.status === 'fulfilled' && bizRes.value?.businesses) {
        setBusinesses(bizRes.value.businesses);
      }
      if (assessRes.status === 'fulfilled' && assessRes.value?.assessments) {
        setAssessments(assessRes.value.assessments);
      }
    } catch (err) {
      console.error('Failed to load businesses and assessments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleHistory = async (businessId) => {
    if (expandedBizId === businessId) {
      setExpandedBizId(null);
      return;
    }
    setExpandedBizId(businessId);
    if (!bizHistory[businessId]) {
      setLoadingHistory(true);
      try {
        const histRes = await getComponent4BusinessHistory(businessId);
        if (histRes && histRes.history) {
          setBizHistory(prev => ({ ...prev, [businessId]: histRes.history }));
        }
      } catch (err) {
        console.warn('Could not load history for business:', businessId, err);
      } finally {
        setLoadingHistory(false);
      }
    }
  };

  // Filter businesses
  const filteredBusinesses = businesses.filter(b => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = !term || 
      String(b.business_name || '').toLowerCase().includes(term) ||
      String(b.business_category || '').toLowerCase().includes(term) ||
      String(b.id || '').toLowerCase().includes(term);

    const risk = String(b.latest_risk_category || '').toUpperCase();
    const matchesRisk = riskFilter === 'ALL' || risk === riskFilter;

    return matchesSearch && matchesRisk;
  });

  const renderRiskBadge = (category) => {
    const cat = String(category || '').toUpperCase();
    if (cat === 'LOW') {
      return (
        <span className="badge-risk-low">
          <CheckCircle2 size={12} /> Low Risk
        </span>
      );
    }
    if (cat === 'MEDIUM') {
      return (
        <span className="badge-risk-medium">
          <AlertTriangle size={12} /> Medium Risk
        </span>
      );
    }
    if (cat === 'HIGH') {
      return (
        <span className="badge-risk-high">
          <ShieldAlert size={12} /> High Risk
        </span>
      );
    }
    return (
      <span className="badge-risk-neutral">
        <Clock size={12} /> Pending Run
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
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
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px', margin: 0 }}>
            My Business Assessments
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.35rem', margin: 0 }}>
            Directory of registered enterprises, latest risk evaluations, and historical run tracking.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={loadData} className="btn btn-secondary" disabled={loading} title="Refresh records">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button onClick={onStartNewAssessment} className="btn btn-primary">
            <PlusCircle size={16} />
            <span>New Risk Assessment</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '420px' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by business name, category, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-control"
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Risk Level:
          </span>
          {['ALL', 'LOW', 'MEDIUM', 'HIGH'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setRiskFilter(lvl)}
              style={{
                background: riskFilter === lvl ? 'var(--primary-green-subtle)' : 'var(--bg-surface)',
                border: riskFilter === lvl ? '1px solid var(--primary-green-border)' : '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.35rem 0.65rem',
                fontSize: '0.75rem',
                fontWeight: riskFilter === lvl ? 700 : 500,
                color: riskFilter === lvl ? 'var(--primary-green)' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              {lvl === 'ALL' ? 'All Risks' : lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Businesses List */}
      {loading ? (
        <div style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <RefreshCw size={26} className="animate-spin" style={{ margin: '0 auto 0.75rem auto', color: 'var(--primary-green)' }} />
          <p style={{ fontSize: '0.875rem' }}>Loading assessed enterprises...</p>
        </div>
      ) : filteredBusinesses.length === 0 ? (
        <div className="content-card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
          <Building2 size={38} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            No matching businesses found
          </h3>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0.5rem auto 1.5rem auto' }}>
            {searchTerm || riskFilter !== 'ALL' 
              ? 'No businesses match the selected filters. Try broadening your criteria.'
              : 'Start your first assessment by uploading a business plan.'}
          </p>
          <button onClick={onStartNewAssessment} className="btn btn-primary">
            <PlusCircle size={15} />
            <span>Assess a Business</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredBusinesses.map((b) => {
            const isExpanded = expandedBizId === b.id;
            const historyList = bizHistory[b.id] || [];

            return (
              <div 
                key={b.id} 
                className="content-card"
                style={{ padding: 0, overflow: 'hidden', margin: 0 }}
              >
                {/* Main Business Summary Row */}
                <div style={{ 
                  padding: '1.25rem 1.5rem', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  background: isExpanded ? 'var(--bg-subtle)' : 'var(--bg-surface)'
                }}>
                  <div style={{ flex: '1 1 300px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        {b.business_name}
                      </h3>
                      {renderRiskBadge(b.latest_risk_category)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                      <span>ID: <code style={{ color: 'var(--text-primary)' }}>{b.id}</code></span>
                      <span>&bull;</span>
                      <span>{b.business_category}</span>
                      <span>&bull;</span>
                      <span>{b.business_stage}</span>
                      <span>&bull;</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        <MapPin size={11} /> {b.district}, {b.province}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <button
                      onClick={() => handleToggleHistory(b.id)}
                      className="btn btn-subtle"
                      style={{ fontSize: '0.78rem', padding: '0.45rem 0.75rem' }}
                      title="View historical evaluation runs"
                    >
                      <History size={14} />
                      <span>{b.assessment_count || 1} Run(s)</span>
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>

                    <button
                      onClick={() => onStartNewForBusiness && onStartNewForBusiness(b)}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.45rem 0.75rem' }}
                      title="Run a new assessment on this business"
                    >
                      <PlusCircle size={14} />
                      <span>Re-assess</span>
                    </button>

                    <button
                      onClick={() => onSelectAssessment(b.latest_assessment_id, b.id)}
                      className="btn btn-primary"
                      style={{ fontSize: '0.78rem', padding: '0.45rem 0.85rem' }}
                    >
                      <span>View Assessment</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>

                {/* Expanded Historical Assessment Runs */}
                {isExpanded && (
                  <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
                    <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>
                      Chronological Assessment Runs
                    </h4>

                    {loadingHistory ? (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0.5rem 0' }}>
                        Loading run history...
                      </div>
                    ) : historyList.length === 0 ? (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>
                        No secondary historical runs recorded.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {historyList.map((run) => (
                          <div 
                            key={run.analysis_id}
                            style={{
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '0.65rem 1rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '0.8rem'
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                Run ID: <code>{run.analysis_id}</code>
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                                Evaluated: {run.created_at ? new Date(run.created_at).toLocaleString() : 'N/A'}
                                {run.plan_filename && ` &middot; Plan: ${run.plan_filename}`}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                              {renderRiskBadge(run.overall_risk_category)}
                              <button
                                onClick={() => onSelectAssessment(run.analysis_id, b.id)}
                                className="btn btn-secondary"
                                style={{ fontSize: '0.72rem', padding: '0.25rem 0.65rem' }}
                              >
                                View Run
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
