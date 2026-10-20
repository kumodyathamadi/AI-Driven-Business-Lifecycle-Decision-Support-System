import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  Search, 
  PlusCircle, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowRight, 
  MapPin, 
  DollarSign, 
  Calendar,
  ShieldAlert,
  Layers,
  RefreshCw
} from 'lucide-react';
import { fetchAnalysisRecords, getComponent4Businesses } from '../services/api';
import { formatLKR } from './Dashboard';

export default function MyBusinesses({ onSelectRecord, onStartNew, onAssessBusiness }) {
  const [c1Records, setC1Records] = useState([]);
  const [persistentBusinesses, setPersistentBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState('All');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'persistent', 'evaluations'

  const loadBusinesses = async () => {
    setLoading(true);
    try {
      const [recData, bizData] = await Promise.allSettled([
        fetchAnalysisRecords(50),
        getComponent4Businesses(50)
      ]);

      if (recData.status === 'fulfilled' && Array.isArray(recData.value)) {
        setC1Records(recData.value);
      }
      if (bizData.status === 'fulfilled' && bizData.value?.businesses) {
        setPersistentBusinesses(bizData.value.businesses);
      }
    } catch (err) {
      console.error('Failed to load business records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusinesses();
  }, []);

  const getFeasibilityBadge = (label) => {
    if (!label) {
      return (
        <span style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'rgba(148, 163, 184, 0.1)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
          Unchecked
        </span>
      );
    }
    const clean = String(label).trim();
    if (clean === 'Feasible') {
      return (
        <span className="badge-feasible" style={{ padding: '0.15rem 0.55rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
          <CheckCircle2 size={13} /> Feasible
        </span>
      );
    }
    if (clean === 'Conditionally Feasible') {
      return (
        <span className="badge-conditionally" style={{ padding: '0.15rem 0.55rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
          <AlertTriangle size={13} /> Conditionally Feasible
        </span>
      );
    }
    return (
      <span className="badge-infeasible" style={{ padding: '0.15rem 0.55rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
        <XCircle size={13} /> Infeasible
      </span>
    );
  };

  const getRiskBadge = (category) => {
    if (!category) return null;
    const cat = String(category).toLowerCase();
    if (cat.includes('low')) {
      return (
        <span style={{ fontSize: '0.72rem', color: '#4ade80', background: 'rgba(34, 197, 94, 0.15)', padding: '0.15rem 0.55rem', borderRadius: '4px', fontWeight: 700 }}>
          Low Risk
        </span>
      );
    }
    if (cat.includes('med')) {
      return (
        <span style={{ fontSize: '0.72rem', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.15)', padding: '0.15rem 0.55rem', borderRadius: '4px', fontWeight: 700 }}>
          Medium Risk
        </span>
      );
    }
    return (
      <span style={{ fontSize: '0.72rem', color: '#f87171', background: 'rgba(239, 68, 68, 0.15)', padding: '0.15rem 0.55rem', borderRadius: '4px', fontWeight: 700 }}>
        Higher Risk
      </span>
    );
  };

  const filteredRecords = c1Records.filter((rec) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = 
      (rec.business_name && rec.business_name.toLowerCase().includes(q)) ||
      (rec.business_category && rec.business_category.toLowerCase().includes(q)) ||
      (rec.district && rec.district.toLowerCase().includes(q)) ||
      (rec.id && rec.id.toLowerCase().includes(q));
    const matchesStage = filterStage === 'All' || rec.business_stage === filterStage;
    return matchesSearch && matchesStage;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Building2 size={24} style={{ color: '#60a5fa' }} />
            My Businesses &amp; Registered Profiles
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '0.3rem', margin: 0 }}>
            Manage enterprise records, review persistent profile details, and jump directly into specific business workspaces.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={loadBusinesses} 
            className="btn btn-secondary" 
            style={{ fontSize: '0.8rem', padding: '0.55rem 0.8rem' }}
            title="Refresh business records"
          >
            <RefreshCw size={14} />
          </button>
          <button 
            onClick={onStartNew} 
            className="btn btn-primary" 
            style={{ padding: '0.55rem 1.15rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <PlusCircle size={15} />
            New Assessment
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search by enterprise name, ID, sector, or district..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-control"
            style={{ paddingLeft: '2.3rem', fontSize: '0.82rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Stage:</span>
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="form-control"
            style={{ width: 'auto', fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
          >
            <option value="All">All Stages</option>
            <option value="New">New / Startup</option>
            <option value="New Startup">New Startup</option>
            <option value="Existing">Existing Enterprise</option>
            <option value="Existing Business">Existing Business</option>
          </select>
        </div>
      </div>

      {/* Loading & Empty States */}
      {loading ? (
        <div style={{ padding: '3.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
          Loading saved business profiles from database...
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', borderRadius: '12px' }}>
          <Building2 size={40} style={{ color: '#64748b', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>No Matching Business Records</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '0.35rem', marginBottom: '1.25rem' }}>
            {searchTerm || filterStage !== 'All' ? 'Try adjusting your search query or stage filter.' : 'Run your first assessment to create a business record.'}
          </p>
          <button onClick={onStartNew} className="btn btn-primary" style={{ margin: '0 auto', fontSize: '0.82rem' }}>
            <PlusCircle size={15} />
            Assess a Business
          </button>
        </div>
      ) : (
        <div className="grid-2">
          {filteredRecords.map((rec) => {
            const shortId = rec.id ? rec.id.slice(0, 8) : 'Unknown';
            const displayName = rec.business_name 
              ? rec.business_name 
              : `${rec.business_category} Assessment`;

            return (
              <div 
                key={rec.id} 
                className="glass-card"
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between',
                  gap: '1rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  transition: 'border-color 0.2s',
                  cursor: 'pointer'
                }}
                onClick={() => onSelectRecord(rec.id, 'overview')}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#60a5fa', fontWeight: 700 }}>
                        {rec.business_stage || 'Operating'} Stage
                      </span>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', marginTop: '0.15rem', margin: 0 }}>
                        {displayName}
                      </h3>
                      <div style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                        Record ID: #{shortId}
                      </div>
                    </div>

                    <div>
                      {getFeasibilityBadge(rec.feasibility_label || rec.predicted_label)}
                    </div>
                  </div>

                  <div className="grid-2" style={{ fontSize: '0.78rem', color: '#cbd5e1', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.55)', padding: '0.75rem', borderRadius: '8px', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <MapPin size={14} style={{ color: '#60a5fa' }} />
                      <span>District: <strong>{rec.district || 'Western Province'}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <DollarSign size={14} style={{ color: '#4ade80' }} />
                      <span>Capital: <strong>{formatLKR(rec.available_capital_lkr)}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Calendar size={14} style={{ color: '#c084fc' }} />
                      <span>Analyzed: <strong>{rec.created_at ? new Date(rec.created_at).toLocaleDateString() : 'N/A'}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Layers size={14} style={{ color: '#fde047' }} />
                      <span>Category: <strong>{rec.business_category}</strong></span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Confidence: <strong>{Math.round((rec.confidence_score || 0.5) * 100)}%</strong>
                  </span>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectRecord(rec.id, 'overview');
                    }}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <span>Open Workspace</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
