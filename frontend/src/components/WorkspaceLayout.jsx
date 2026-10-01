import React, { useEffect, useState } from 'react';
import { useParams, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { fetchAnalysisRecordById } from '../services/api';
import { FeasibilityBadge, StageBadge } from './common/Badge';
import { Skeleton } from './common/Skeleton';
import BusinessNotFound from './BusinessNotFound';
import { formatCurrency, formatCustomersPerDay, formatText } from '../utils/formatters';
import { Briefcase, ArrowLeft, RefreshCw, Layers } from 'lucide-react';

export default function WorkspaceLayout({ onProfileLoaded }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Skeleton width="30%" height="20px" />
          <Skeleton width="60%" height="28px" />
          <Skeleton width="40%" height="16px" />
        </div>
        <div className="glass-card" style={{ padding: '2rem' }}>
          <Skeleton width="100%" height="200px" />
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return <BusinessNotFound message={errorMessage} />;
  }

  const bizInput = profile.business_input || {};
  const feasAnalysis = profile.feasibility_analysis || {};
  const bizTitle = `${formatText(bizInput.business_category, 'SME Enterprise')} · ${formatText(bizInput.district, 'Sri Lanka')}`;

  const currentTab = location.pathname.split('/').pop();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Workspace Header Strip */}
      <div 
        className="glass-card"
        style={{
          padding: '1.25rem 1.5rem',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <Link to="/businesses" style={{ color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', textDecoration: 'none' }}>
                <ArrowLeft size={13} /> All Businesses
              </Link>
              <span style={{ color: '#475569' }}>•</span>
              <StageBadge stage={bizInput.business_stage} />
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.3px' }}>
              {bizTitle}
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.35rem', fontSize: '0.8rem', color: '#94a3b8', flexWrap: 'wrap' }}>
              <span>Capital: <strong style={{ color: '#cbd5e1' }}>{formatCurrency(bizInput.available_capital_lkr)}</strong></span>
              <span>Expected: <strong style={{ color: '#cbd5e1' }}>{formatCustomersPerDay(bizInput.expected_customers_per_day)}</strong></span>
              <span>District: <strong style={{ color: '#cbd5e1' }}>{formatText(bizInput.district)}</strong></span>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                ID: <code>{id.substring(0, 8)}</code>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FeasibilityBadge 
              label={feasAnalysis.predicted_label} 
              score={feasAnalysis.probability_score}
              showScore={true}
              size="md"
            />
          </div>
        </div>

        {/* Workspace In-Page Sub-Navigation Tabs */}
        <div 
          style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            marginTop: '1.25rem', 
            borderTop: '1px solid rgba(255, 255, 255, 0.08)', 
            paddingTop: '0.75rem',
            overflowX: 'auto'
          }}
        >
          {[
            { path: `/businesses/${id}`, label: 'Overview', match: `/businesses/${id}` },
            { path: `/businesses/${id}/feasibility`, label: 'Feasibility Assessment', match: 'feasibility' },
            { path: `/businesses/${id}/insights`, label: 'Key Insights', match: 'insights' },
            { path: `/businesses/${id}/recommendations`, label: 'Recommendations', match: 'recommendations' },
            { path: `/businesses/${id}/options`, label: 'Explore Options', match: 'options' },
            { path: `/businesses/${id}/scenarios`, label: 'Scenario Explorer', match: 'scenarios' },
            { path: `/businesses/${id}/plan`, label: 'Business Plan', match: 'plan' },
          ].map((tab) => {
            const isActive = tab.match === `/businesses/${id}` 
              ? location.pathname === `/businesses/${id}`
              : location.pathname.includes(tab.match);

            return (
              <Link
                key={tab.path}
                to={tab.path}
                style={{
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#60a5fa' : '#94a3b8',
                  background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  border: `1px solid ${isActive ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}`,
                  borderRadius: '6px',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Render Child Workspace Module Page */}
      <Outlet context={{ profile, setProfile, reloadRecord: () => loadRecord(id) }} />

    </div>
  );
}
