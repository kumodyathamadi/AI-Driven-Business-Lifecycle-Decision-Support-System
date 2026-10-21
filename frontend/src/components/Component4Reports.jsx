import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  Download, 
  Search, 
  Printer, 
  Eye, 
  RefreshCw, 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Clock,
  ExternalLink
} from 'lucide-react';
import { getRecentComponent4Assessments, downloadComponent4Report, downloadComponent4MitigationPlanPdf } from '../services/api';

export default function Component4Reports({
  onSelectAssessment
}) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState(null);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await getRecentComponent4Assessments(50);
      if (res && res.assessments) {
        setReports(res.assessments);
      }
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleDownload = async (analysisId) => {
    setDownloadingId(analysisId);
    try {
      await downloadComponent4Report(analysisId);
    } catch (err) {
      alert(`Could not download report: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadPdf = async (analysisId) => {
    setDownloadingPdfId(analysisId);
    try {
      await downloadComponent4MitigationPlanPdf(analysisId);
    } catch (err) {
      alert(`Could not download PDF Mitigation Plan: ${err.message}`);
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const filteredReports = reports.filter(r => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return String(r.business_name || '').toLowerCase().includes(term) ||
      String(r.analysis_id || '').toLowerCase().includes(term) ||
      String(r.business_category || '').toLowerCase().includes(term);
  });

  const renderBadge = (category) => {
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
        <Clock size={12} /> Assessed
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
            Assessment Reports &amp; Downloads
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.35rem', margin: 0 }}>
            Download complete risk evaluation summaries, mitigation action checklists, and GNN relationship reports.
          </p>
        </div>

        <button onClick={loadReports} className="btn btn-secondary" disabled={loading} title="Refresh reports list">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: '380px' }}>
        <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Search reports by business or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-control"
          style={{ paddingLeft: '2.25rem' }}
        />
      </div>

      {/* Reports Table / Card */}
      <div className="content-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <RefreshCw size={26} className="animate-spin" style={{ margin: '0 auto 0.75rem auto', color: 'var(--primary-green)' }} />
            <p style={{ fontSize: '0.875rem' }}>Loading reports directory...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
            <FileText size={38} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              {searchTerm ? 'No matching reports found' : 'No assessment reports generated yet'}
            </h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0.5rem auto 1.5rem auto' }}>
              Complete a risk assessment to generate downloadable mitigation roadmaps and analysis reports.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Business / Report Name</th>
                  <th>Assessment Reference</th>
                  <th>Date Evaluated</th>
                  <th>Risk Rating</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((r) => {
                  const dateStr = r.created_at
                    ? new Date(r.created_at).toLocaleDateString(undefined, { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })
                    : 'Recently';

                  return (
                    <tr key={r.analysis_id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FileText size={16} style={{ color: 'var(--primary-green)', flexShrink: 0 }} />
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {r.business_name || 'Business Risk Assessment'}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                              {r.business_category} &middot; {r.district || 'Western Province'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <code style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                          {r.analysis_id}
                        </code>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {dateStr}
                      </td>
                      <td>
                        {renderBadge(r.overall_risk_category)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.45rem', alignItems: 'center' }}>
                          <button
                            onClick={() => onSelectAssessment(r.analysis_id, r.business_id)}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                            title="View assessment in active workspace"
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>

                          <button
                            onClick={() => handleDownloadPdf(r.analysis_id)}
                            disabled={downloadingPdfId === r.analysis_id}
                            className="btn btn-primary"
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.35rem 0.75rem',
                              background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                              color: '#fff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                            title="Download professional PDF Mitigation Plan"
                          >
                            <FileText size={13} />
                            <span>{downloadingPdfId === r.analysis_id ? 'Generating...' : 'PDF Plan'}</span>
                          </button>

                          <button
                            onClick={() => handleDownload(r.analysis_id)}
                            disabled={downloadingId === r.analysis_id}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                            title="Download Markdown technical audit report"
                          >
                            <Download size={13} />
                            <span>{downloadingId === r.analysis_id ? '...' : '.MD'}</span>
                          </button>
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
