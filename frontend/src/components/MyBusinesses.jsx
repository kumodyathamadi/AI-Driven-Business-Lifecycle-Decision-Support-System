import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  Search, 
  PlusCircle, 
  ArrowRight, 
  Sliders, 
  MapPin, 
  DollarSign, 
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchAnalysisRecords } from '../services/api';
import { FeasibilityBadge, StageBadge } from './common/Badge';
import { CardSkeleton } from './common/Skeleton';
import { EmptyState } from './common/EmptyState';
import { formatCurrency, formatCustomersPerDay, formatDate, formatText } from '../utils/formatters';

export default function MyBusinesses({ onSelectRecord, onStartNew }) {
  const navigate = useNavigate();
  const handleStartNew = onStartNew || (() => navigate('/analysis/new'));
  const handleSelectRecord = onSelectRecord || ((id) => navigate(`/businesses/${id}`));

  const [records, setRecords] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState('All');
  const [filterSector, setFilterSector] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  useEffect(() => {
    async function loadRecords() {
      setLoading(true);
      try {
        const params = {
          limit: pageSize,
          offset: (page - 1) * pageSize,
        };
        if (filterStage !== 'All') params.stage = filterStage;
        if (filterSector !== 'All') params.sector = filterSector;
        if (searchTerm.trim()) params.search = searchTerm.trim();

        const data = await fetchAnalysisRecords(params);
        if (data) {
          const list = Array.isArray(data) ? data : (data.items || []);
          const total = data.total_count !== undefined ? data.total_count : list.length;
          setRecords(list);
          setTotalCount(total);
        }
      } catch (err) {
        console.error('Failed to load business records:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRecords();
  }, [page, pageSize, filterStage, filterSector, searchTerm]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={24} style={{ color: '#60a5fa' }} />
            My Saved Businesses & Analyses ({totalCount})
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Manage, review, and track your SME business feasibility evaluations stored in PostgreSQL database.
          </p>
        </div>

        <button onClick={handleStartNew} className="btn btn-primary" style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem' }}>
          <PlusCircle size={16} />
          New Business Analysis
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search by category, district, or result..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="form-control"
            style={{ paddingLeft: '2.3rem', fontSize: '0.85rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Stage:</span>
          <select
            value={filterStage}
            onChange={(e) => {
              setFilterStage(e.target.value);
              setPage(1);
            }}
            className="form-control"
            style={{ width: 'auto', fontSize: '0.85rem', padding: '0.45rem 1rem' }}
          >
            <option value="All">All Stages</option>
            <option value="new_startup">New Startup</option>
            <option value="existing">Existing Business</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Sector:</span>
          <select
            value={filterSector}
            onChange={(e) => {
              setFilterSector(e.target.value);
              setPage(1);
            }}
            className="form-control"
            style={{ width: 'auto', fontSize: '0.85rem', padding: '0.45rem 1rem' }}
          >
            <option value="All">All Sectors</option>
            <option value="Grocery / Mini-Mart">Grocery / Mini-Mart</option>
            <option value="Clothing / Garment">Clothing / Garment</option>
            <option value="Beauty Salon">Beauty Salon</option>
            <option value="Bakery / Food / Grocery">Bakery / Food / Grocery</option>
          </select>
        </div>
      </div>

      {/* Loading & Empty States */}
      {loading ? (
        <CardSkeleton count={6} />
      ) : records.length === 0 ? (
        <EmptyState 
          icon={Building2}
          title="No Matching Business Records Found"
          description={searchTerm || filterStage !== 'All' || filterSector !== 'All' 
            ? "No analyses match the current search filters. Try clearing filters or searching another keyword."
            : "No saved business analyses yet. Create your first evaluation to start building your SME portfolio."
          }
          actionLabel="Start New Analysis"
          onAction={handleStartNew}
        />
      ) : (
        <>
          <div className="grid-2">
            {records.map((rec) => {
              const recordTitle = `${formatText(rec.business_category, 'SME Business')} · ${formatText(rec.district, 'Sri Lanka')}`;
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
                    transition: 'transform 0.2s, border-color 0.2s',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleSelectRecord(rec.id, 'overview')}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <StageBadge stage={rec.business_stage} label={rec.stage_label} />
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginTop: '0.35rem' }}>
                          {recordTitle}
                        </h3>
                      </div>

                      <FeasibilityBadge 
                        label={rec.predicted_label || rec.feasibility_label} 
                        score={rec.probability_score}
                        showScore={rec.probability_score !== undefined}
                      />
                    </div>

                    <div className="grid-2" style={{ fontSize: '0.8rem', color: '#cbd5e1', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.5)', padding: '0.75rem', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <MapPin size={14} style={{ color: '#60a5fa' }} />
                        <span>Location: <strong>{formatText(rec.district)}</strong></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <DollarSign size={14} style={{ color: '#4ade80' }} />
                        <span>Capital: <strong>{formatCurrency(rec.available_capital_lkr)}</strong></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Calendar size={14} style={{ color: '#c084fc' }} />
                        <span>Analyzed: <strong>{formatDate(rec.created_at)}</strong></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Sliders size={14} style={{ color: '#fde047' }} />
                        <span>Customers: <strong>{formatCustomersPerDay(rec.expected_customers_per_day)}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.75rem' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      ID: <code style={{ fontFamily: 'monospace' }}>{rec.id ? `${rec.id.substring(0, 8)}...` : 'N/A'}</code>
                    </span>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectRecord(rec.id, 'overview');
                      }}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.85rem' }}
                    >
                      <span>Open Workspace</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
              <button 
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', opacity: page <= 1 ? 0.5 : 1 }}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} total)
              </span>
              <button 
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', opacity: page >= totalPages ? 0.5 : 1 }}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

    </div>
  );
}
