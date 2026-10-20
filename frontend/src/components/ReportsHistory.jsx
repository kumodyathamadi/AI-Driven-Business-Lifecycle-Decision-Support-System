import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Clock, 
  Building2, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { 
  fetchAnalysisRecords, 
  getRecentComponent4Assessments,
  downloadComponent4Report,
  downloadBusinessPlanPdf,
  downloadBusinessPlanDocx,
  fetchAnalysisRecordById
} from '../services/api';

export default function ReportsHistory({ onSelectRecord, onOpenComponent4Assessment }) {
  const [loading, setLoading] = useState(true);
  const [component1Records, setComponent1Records] = useState([]);
  const [component4Assessments, setComponent4Assessments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'risk', 'feasibility'
  const [downloadingId, setDownloadingId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [c1Res, c4Res] = await Promise.allSettled([
        fetchAnalysisRecords(50),
        getRecentComponent4Assessments(50)
      ]);

      if (c1Res.status === 'fulfilled' && Array.isArray(c1Res.value)) {
        setComponent1Records(c1Res.value);
      }
      if (c4Res.status === 'fulfilled' && c4Res.value?.assessments) {
        setComponent4Assessments(c4Res.value.assessments);
      }
    } catch (err) {
      console.error('Failed to load reports and history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDownloadC4Report = async (analysisId) => {
    setDownloadingId(analysisId);
    try {
      await downloadComponent4Report(analysisId);
    } catch (err) {
      alert(`Could not download report: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadPlanPdf = async (recordId) => {
    setDownloadingId(recordId);
    try {
      const fullRecord = await fetchAnalysisRecordById(recordId);
      await downloadBusinessPlanPdf(fullRecord);
    } catch (err) {
      alert(`Could not download PDF plan: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  // Combine and format records
  const combinedList = [
    ...component4Assessments.map(c4 => ({
      type: 'COMPONENT_4_RISK',
      id: c4.analysis_id,
      businessId: c4.business_id,
      businessName: c4.business_name || `Business ${c4.business_id}`,
      district: c4.district || 'Western Province',
      category: c4.business_category || 'Enterprise',
      status: c4.overall_risk_category || 'Assessed',
      date: c4.created_at,
      score: c4.composite_risk_score,
      raw: c4
    })),
    ...component1Records.map(c1 => ({
      type: 'COMPONENT_1_FEASIBILITY',
      id: c1.id,
      businessId: c1.id,
      businessName: c1.business_name || `${c1.business_category} Assessment`,
      district: c1.district || 'Western Province',
      category: c1.business_category || 'Enterprise',
      status: c1.feasibility_label || c1.predicted_label || 'Evaluated',
      date: c1.created_at,
      score: c1.confidence_score,
      raw: c1
    }))
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const filteredList = combinedList.filter(item => {
    if (activeFilter === 'risk' && item.type !== 'COMPONENT_4_RISK') return false;
    if (activeFilter === 'feasibility' && item.type !== 'COMPONENT_1_FEASIBILITY') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = String(item.businessName).toLowerCase().includes(q);
      const matchId = String(item.businessId).toLowerCase().includes(q) || String(item.id).toLowerCase().includes(q);
      const matchCat = String(item.category).toLowerCase().includes(q);
      const matchDist = String(item.district).toLowerCase().includes(q);
      return matchName || matchId || matchCat || matchDist;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Banner */}
      <div 
        className="glass-card"
        style={{ 
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)', 
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '1.75rem',
          borderRadius: '12px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#60a5fa', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.4rem' }}>
              <Clock size={15} /> Historical Archives &amp; Audit Exports
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
              Reports &amp; Assessment History
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.35rem', margin: 0 }}>
              Review past risk evaluations, audit disclosures, and export formatted reports in Markdown, PDF, or Word formats.
            </p>
          </div>

          <button 
            onClick={loadData}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.5rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={14} />
            <span>Refresh Archives</span>
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveFilter('all')}
              className={`btn ${activeFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
            >
              All Records ({combinedList.length})
            </button>
            <button
              onClick={() => setActiveFilter('risk')}
              className={`btn ${activeFilter === 'risk' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
            >
              Risk Assessments ({component4Assessments.length})
            </button>
            <button
              onClick={() => setActiveFilter('feasibility')}
              className={`btn ${activeFilter === 'feasibility' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
            >
              Feasibility Studies ({component1Records.length})
            </button>
          </div>

          <div style={{ position: 'relative', minWidth: '240px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748b' }} />
            <input 
              type="text"
              placeholder="Search by name, ID, sector..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ 
                width: '100%', 
                background: 'rgba(15, 23, 42, 0.8)', 
                border: '1px solid rgba(255, 255, 255, 0.15)', 
                borderRadius: '6px', 
                padding: '0.4rem 0.75rem 0.4rem 2rem', 
                color: '#ffffff', 
                fontSize: '0.78rem' 
              }}
            />
          </div>
        </div>
      </div>

      {/* Reports Table Card */}
      <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '12px' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
            Loading archived reports and assessment records...
          </div>
        ) : filteredList.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <FileText size={36} style={{ color: '#475569', marginBottom: '0.5rem' }} />
            <h4 style={{ color: '#ffffff', fontSize: '1rem', margin: 0 }}>No Assessment Records Found</h4>
            <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
              {searchQuery ? 'Try adjusting your search query or filter.' : 'Run a business assessment to generate historical reports.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Report / Enterprise</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Type</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>District &amp; Category</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Status / Score</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Recorded Date</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item, idx) => {
                  const isC4 = item.type === 'COMPONENT_4_RISK';
                  const shortId = item.id ? item.id.slice(0, 8) : 'Unknown';

                  return (
                    <tr key={`${item.type}_${item.id}_${idx}`} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ fontWeight: 700, color: '#ffffff' }}>{item.businessName}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: '#818cf8' }}>
                          Ref #{shortId}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        {isC4 ? (
                          <span style={{ fontSize: '0.68rem', color: '#c084fc', background: 'rgba(192, 132, 252, 0.12)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                            Risk Assessment
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.68rem', color: '#60a5fa', background: 'rgba(59, 130, 246, 0.12)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                            Feasibility Study
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div>{item.category}</div>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{item.district}</span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span style={{ 
                          fontSize: '0.72rem', 
                          padding: '0.15rem 0.5rem', 
                          borderRadius: '4px', 
                          fontWeight: 700,
                          background: item.status?.toLowerCase().includes('low') || item.status === 'Feasible'
                            ? 'rgba(34, 197, 94, 0.15)'
                            : item.status?.toLowerCase().includes('med') || item.status === 'Conditionally Feasible'
                            ? 'rgba(245, 158, 11, 0.15)'
                            : 'rgba(239, 68, 68, 0.15)',
                          color: item.status?.toLowerCase().includes('low') || item.status === 'Feasible'
                            ? '#4ade80'
                            : item.status?.toLowerCase().includes('med') || item.status === 'Conditionally Feasible'
                            ? '#fbbf24'
                            : '#f87171'
                        }}>
                          {item.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                        {item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          {isC4 ? (
                            <>
                              <button
                                onClick={() => handleDownloadC4Report(item.id)}
                                disabled={downloadingId === item.id}
                                className="btn btn-secondary"
                                style={{ fontSize: '0.7rem', padding: '0.25rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                title="Download Markdown audit report"
                              >
                                <Download size={12} />
                                <span>{downloadingId === item.id ? 'Saving...' : 'Report (.md)'}</span>
                              </button>
                              <button
                                onClick={() => onOpenComponent4Assessment && onOpenComponent4Assessment(item.id, item.businessId)}
                                className="btn btn-primary"
                                style={{ fontSize: '0.7rem', padding: '0.25rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                              >
                                <span>View Results</span>
                                <ArrowRight size={12} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleDownloadPlanPdf(item.id)}
                                disabled={downloadingId === item.id}
                                className="btn btn-secondary"
                                style={{ fontSize: '0.7rem', padding: '0.25rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                title="Download PDF business plan"
                              >
                                <Download size={12} />
                                <span>PDF Plan</span>
                              </button>
                              <button
                                onClick={() => onSelectRecord(item.id, 'overview')}
                                className="btn btn-primary"
                                style={{ fontSize: '0.7rem', padding: '0.25rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                              >
                                <span>Open Workspace</span>
                                <ArrowRight size={12} />
                              </button>
                            </>
                          )}
                        </div>
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
