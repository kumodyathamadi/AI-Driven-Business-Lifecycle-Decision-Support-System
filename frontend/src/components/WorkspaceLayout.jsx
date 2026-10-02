import React, { useEffect, useState, useRef } from 'react';
import { useParams, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { fetchAnalysisRecordById, fetchAnalysisRecords } from '../services/api';
import { Skeleton } from './common/Skeleton';
import BusinessNotFound from './BusinessNotFound';
import { formatCurrency, formatCustomersPerDay, formatText } from '../utils/formatters';
import StatusBadge from './overview/StatusBadge';
import WorkspaceTabBar from './workspace/WorkspaceTabBar';
import {
  Building2,
  FileText,
  Share2,
  Download,
  Check,
  ChevronDown
} from 'lucide-react';

export default function WorkspaceLayout({ onProfileLoaded }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile] = useState(null);
  const [availableBusinesses, setAvailableBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [showSwitcherDropdown, setShowSwitcherDropdown] = useState(false);

  const dropdownRef = useRef(null);

  const loadRecord = async (recordId) => {
    setLoading(true);
    setNotFound(false);
    try {
      const data = await fetchAnalysisRecordById(recordId);
      setProfile(data);
      if (onProfileLoaded) {
        onProfileLoaded(data);
      }
    } catch (err) {
      console.error(`Failed to load business workspace ${recordId}:`, err);
      setNotFound(true);
      const detail = err.response?.data?.detail || err.message || 'Record not found';
      setErrorMessage(detail);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadRecord(id);
    }
  }, [id]);

  useEffect(() => {
    async function loadBusinesses() {
      try {
        const res = await fetchAnalysisRecords({ limit: 50 });
        if (res) {
          const list = Array.isArray(res) ? res : (res.items || []);
          setAvailableBusinesses(list);
        }
      } catch (e) {
        console.error('Failed to load business list for switcher:', e);
      }
    }
    loadBusinesses();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSwitcherDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleShare = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
  };

  if (loading) {
    return (
      <div className="workspace-container-max">
        <div className="glass-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Skeleton width="25%" height="18px" />
          <Skeleton width="55%" height="32px" />
          <Skeleton width="35%" height="16px" />
        </div>
        <div className="glass-card" style={{ padding: '2rem' }}>
          <Skeleton width="100%" height="280px" />
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="workspace-container-max">
        <BusinessNotFound message={errorMessage} onRetry={() => loadRecord(id)} />
      </div>
    );
  }

  const bizInput = profile.business_input || {};
  const feasAnalysis = profile.feasibility_analysis || {};
  const explainability = profile.explainability || {};
  const posDrivers = explainability.positive_drivers || [];
  const metricsCount = posDrivers.length > 0 ? posDrivers.length : 6;

  const stage = String(bizInput.business_stage || 'new_startup').toLowerCase();
  const stageLabel = stage.includes('new') || stage.includes('start') ? 'New Startup' : 'Existing Business';

  const businessName = bizInput.business_name || profile.business_name || '';
  const categoryName = formatText(bizInput.business_category, 'SME Enterprise');
  const districtName = formatText(bizInput.district, 'Sri Lanka');
  const bizTitle = businessName ? `${businessName} · ${districtName}` : `${categoryName} · ${districtName}`;

  return (
    <div className="workspace-container-max">

      {/* Sticky Workspace Topbar Header */}
      <header className="template-workspace-topbar sticky-header" aria-label="Business workspace topbar">
        <div className="template-workspace-topbar-header">
          <div className="template-title-area">
            <h1 className="template-main-title">
              {bizTitle}
            </h1>

            <div className="template-tags-row">
              {businessName && (
                <span className="template-badge-pill badge-pill-indigo" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                  {categoryName}
                </span>
              )}
              <span className="template-badge-pill badge-pill-emerald">
                {stageLabel}
              </span>
              <span className="template-badge-pill badge-pill-slate">
                {districtName} District
              </span>

              {/* Distinct "Switch Analysis" Dropdown Control */}
              {availableBusinesses.length > 1 && (
                <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
                  <button
                    type="button"
                    onClick={() => setShowSwitcherDropdown(!showSwitcherDropdown)}
                    className="btn-template-plan"
                    style={{
                      padding: '0.2rem 0.65rem',
                      background: 'rgba(30, 41, 59, 0.7)',
                      borderColor: 'rgba(255, 255, 255, 0.15)',
                      fontSize: '0.72rem',
                      color: '#cbd5e1',
                      borderRadius: '9999px',
                      boxShadow: 'none'
                    }}
                    aria-expanded={showSwitcherDropdown}
                    aria-haspopup="true"
                    aria-label="Switch to another analyzed business"
                  >
                    <Building2 size={12} style={{ color: '#818cf8' }} aria-hidden="true" />
                    <span>Switch Analysis</span>
                    <ChevronDown size={11} style={{ opacity: 0.7 }} aria-hidden="true" />
                  </button>

                  {showSwitcherDropdown && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '115%',
                        left: 0,
                        zIndex: 50,
                        background: '#0d131f',
                        border: '1px solid rgba(255, 255, 255, 0.16)',
                        borderRadius: '10px',
                        boxShadow: '0 16px 36px rgba(0, 0, 0, 0.85)',
                        minWidth: '280px',
                        maxWidth: '380px',
                        padding: '0.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem'
                      }}
                      role="menu"
                    >
                      <div style={{ padding: '0.35rem 0.65rem', fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Analyzed Businesses ({availableBusinesses.length})
                      </div>
                      <div style={{ maxHeight: '240px', overflowY: 'auto' }} className="no-scrollbar">
                        {availableBusinesses.map((b) => {
                          const isCurrent = b.id === id;
                          const bName = b.business_name || (b.input_profile && b.input_profile.business_name);
                          const bTitle = bName 
                            ? `${bName} (${formatText(b.business_category)})`
                            : `${formatText(b.business_category)} · ${formatText(b.district)}`;
                          const bLabel = b.predicted_label || b.feasibility_label || 'Evaluated';

                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => {
                                setShowSwitcherDropdown(false);
                                if (!isCurrent) {
                                  const subPath = location.pathname.replace(`/businesses/${id}`, '');
                                  navigate(`/businesses/${b.id}${subPath}`);
                                }
                              }}
                              style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '0.5rem 0.65rem',
                                borderRadius: '6px',
                                background: isCurrent ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                border: isCurrent ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                                color: isCurrent ? '#ffffff' : '#cbd5e1',
                                fontSize: '0.76rem',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                              role="menuitem"
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                <strong style={{ color: isCurrent ? '#a5b4fc' : '#f8fafc' }}>{bTitle}</strong>
                                <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{bLabel}</span>
                              </div>
                              {isCurrent && <span style={{ fontSize: '0.68rem', color: '#818cf8', fontWeight: 700 }}>Active</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="template-top-actions">
            {/* Feasibility Status Badge */}
            <StatusBadge
              label={feasAnalysis.predicted_label}
              score={feasAnalysis.confidence_score || feasAnalysis.probability_score}
              size="md"
            />

            {/* View Business Plan Button */}
            <Link
              to={`/businesses/${id}/plan`}
              className="btn-template-plan"
              aria-label="View generated Business Plan document"
            >
              <FileText size={15} aria-hidden="true" />
              <span>View Business Plan</span>
            </Link>

            {/* Share / Copy Link Button */}
            <button
              type="button"
              onClick={handleShare}
              className="btn-template-icon-square"
              title={copied ? 'Link copied!' : 'Copy business link'}
              aria-label={copied ? 'Link copied to clipboard' : 'Share and copy workspace link'}
            >
              {copied ? <Check size={15} style={{ color: '#34d399' }} /> : <Share2 size={15} />}
            </button>

            {/* Print / Export Button */}
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-template-icon-square"
              title="Print / Export Page"
              aria-label="Print or export current analysis page as PDF"
            >
              <Download size={15} />
            </button>
          </div>
        </div>

        {/* Accessible Workspace Tab Navigation */}
        <WorkspaceTabBar businessId={id} metricsCount={metricsCount} />
      </header>

      {/* Render Child Workspace Module Page */}
      <main id="workspace-content">
        <Outlet context={{ profile, setProfile, reloadRecord: () => loadRecord(id) }} />
      </main>

    </div>
  );
}
