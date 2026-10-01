import React, { useEffect, useState, useMemo } from 'react';
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
  ChevronRight,
  LayoutGrid,
  Table as TableIcon,
  Trash2,
  Copy,
  AlertTriangle,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchAnalysisRecords, deleteAnalysisRecord, restoreAnalysisRecord } from '../services/api';
import { FeasibilityBadge, StageBadge } from './common/Badge';
import { CardSkeleton, TableSkeleton } from './common/Skeleton';
import { EmptyState } from './common/EmptyState';
import { ConfirmDialog } from './common/ConfirmDialog';
import { useToast } from './common/Toast';
import { formatCurrency, formatCustomersPerDay, formatDate, formatText } from '../utils/formatters';

const SRI_LANKA_DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
  'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
  'Monaragala', 'Ratnapura', 'Kegalle'
];

export default function MyBusinesses({ onSelectRecord, onStartNew }) {
  const navigate = useNavigate();
  const toast = useToast();

  const handleStartNew = onStartNew || (() => navigate('/analysis/new'));
  const handleSelectRecord = onSelectRecord || ((id) => navigate(`/businesses/${id}`));

  const [records, setRecords] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters & Controls State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState('All');
  const [filterSector, setFilterSector] = useState('All');
  const [filterDistrict, setFilterDistrict] = useState('All');
  const [filterResult, setFilterResult] = useState('All');
  const [sortOrder, setSortOrder] = useState('newest');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Delete Dialog State
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Near-duplicate grouping filter
  const [groupByDuplicates, setGroupByDuplicates] = useState(false);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
      };
      if (filterStage !== 'All') params.stage = filterStage;
      if (filterSector !== 'All') params.category = filterSector;
      if (filterDistrict !== 'All') params.district = filterDistrict;
      if (filterResult !== 'All') params.result = filterResult;
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (sortOrder) params.sort = sortOrder;

      const data = await fetchAnalysisRecords(params);
      if (data) {
        const list = Array.isArray(data) ? data : (data.items || []);
        const total = data.total_count !== undefined ? data.total_count : list.length;
        setRecords(list);
        setTotalCount(total);
      }
    } catch (err) {
      console.error('Failed to load business records:', err);
      toast.error('Failed to load business records. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [page, pageSize, filterStage, filterSector, filterDistrict, filterResult, sortOrder, searchTerm]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Detect near-duplicate analyses (same category & district)
  const duplicateGroups = useMemo(() => {
    const map = {};
    records.forEach(rec => {
      const key = `${rec.business_category}__${rec.district}`.toLowerCase();
      if (!map[key]) map[key] = [];
      map[key].push(rec);
    });
    return Object.values(map).filter(group => group.length > 1);
  }, [records]);

  // Soft Delete Handler with Undo
  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    setDeleting(true);
    const id = recordToDelete.id;
    const title = `${recordToDelete.business_category} · ${recordToDelete.district}`;

    try {
      await deleteAnalysisRecord(id);
      setRecordToDelete(null);
      
      // Optimistically remove from list
      setRecords(prev => prev.filter(r => r.id !== id));
      setTotalCount(prev => Math.max(0, prev - 1));

      // Trigger undo toast
      toast.success(
        `Deleted analysis for ${title}`,
        7000,
        {
          label: 'Undo',
          onClick: async () => {
            try {
              await restoreAnalysisRecord(id);
              toast.info(`Restored analysis for ${title}`);
              loadRecords();
            } catch (err) {
              toast.error('Failed to restore record');
            }
          }
        }
      );
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete analysis record.');
    } finally {
      setDeleting(false);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterStage('All');
    setFilterSector('All');
    setFilterDistrict('All');
    setFilterResult('All');
    setSortOrder('newest');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    searchTerm.trim() || 
    filterStage !== 'All' || 
    filterSector !== 'All' || 
    filterDistrict !== 'All' || 
    filterResult !== 'All'
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={24} style={{ color: '#60a5fa' }} />
            My Businesses ({totalCount})
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Manage, review, and compare your saved SME business feasibility evaluations.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Card / Table Toggle */}
          <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '2px' }}>
            <button
              onClick={() => setViewMode('cards')}
              style={{
                background: viewMode === 'cards' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                color: viewMode === 'cards' ? '#60a5fa' : '#94a3b8',
                border: 'none',
                padding: '0.4rem 0.65rem',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem',
                fontWeight: 600
              }}
              title="Card Grid View"
            >
              <LayoutGrid size={15} />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                background: viewMode === 'table' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                color: viewMode === 'table' ? '#60a5fa' : '#94a3b8',
                border: 'none',
                padding: '0.4rem 0.65rem',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem',
                fontWeight: 600
              }}
              title="Data Table View"
            >
              <TableIcon size={15} />
              <span>Table</span>
            </button>
          </div>

          <button onClick={handleStartNew} className="btn btn-primary" style={{ padding: '0.55rem 1.15rem', fontSize: '0.85rem' }}>
            <PlusCircle size={16} />
            <span>New Analysis</span>
          </button>
        </div>
      </div>

      {/* Near-Duplicate Analyses Alert Banner */}
      {duplicateGroups.length > 0 && (
        <div 
          style={{ 
            background: 'rgba(59, 130, 246, 0.1)', 
            border: '1px solid rgba(59, 130, 246, 0.3)', 
            padding: '0.75rem 1rem', 
            borderRadius: '8px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            fontSize: '0.82rem',
            color: '#cbd5e1'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Copy size={16} style={{ color: '#60a5fa' }} />
            <span>
              <strong>{duplicateGroups.length} near-duplicate group(s)</strong> detected (same business category and district).
            </span>
          </div>

          <button
            onClick={() => setGroupByDuplicates(prev => !prev)}
            className="btn btn-secondary"
            style={{ fontSize: '0.72rem', padding: '0.25rem 0.65rem' }}
          >
            {groupByDuplicates ? 'Show All Runs' : 'Filter Duplicate Runs'}
          </button>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search Input */}
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search category, district, description..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="form-control"
            style={{ paddingLeft: '2.2rem', fontSize: '0.82rem' }}
          />
        </div>

        {/* Stage Filter */}
        <select
          value={filterStage}
          onChange={(e) => {
            setFilterStage(e.target.value);
            setPage(1);
          }}
          className="form-control"
          style={{ width: 'auto', fontSize: '0.82rem', padding: '0.45rem 0.8rem' }}
        >
          <option value="All">All Stages</option>
          <option value="new_startup">New Startup</option>
          <option value="existing">Existing Business</option>
        </select>

        {/* Sector Filter */}
        <select
          value={filterSector}
          onChange={(e) => {
            setFilterSector(e.target.value);
            setPage(1);
          }}
          className="form-control"
          style={{ width: 'auto', fontSize: '0.82rem', padding: '0.45rem 0.8rem' }}
        >
          <option value="All">All Sectors</option>
          <option value="Grocery / Mini-Mart">Grocery / Mini-Mart</option>
          <option value="Clothing / Garment">Clothing / Garment</option>
          <option value="Beauty Salon">Beauty Salon</option>
          <option value="Bakery / Food / Grocery">Bakery / Food / Grocery</option>
        </select>

        {/* District Filter */}
        <select
          value={filterDistrict}
          onChange={(e) => {
            setFilterDistrict(e.target.value);
            setPage(1);
          }}
          className="form-control"
          style={{ width: 'auto', fontSize: '0.82rem', padding: '0.45rem 0.8rem' }}
        >
          <option value="All">All Districts</option>
          {SRI_LANKA_DISTRICTS.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        {/* Feasibility Result Filter */}
        <select
          value={filterResult}
          onChange={(e) => {
            setFilterResult(e.target.value);
            setPage(1);
          }}
          className="form-control"
          style={{ width: 'auto', fontSize: '0.82rem', padding: '0.45rem 0.8rem' }}
        >
          <option value="All">All Results</option>
          <option value="Feasible">Feasible</option>
          <option value="Conditionally Feasible">Marginal / Conditional</option>
          <option value="Infeasible">Infeasible</option>
        </select>

        {/* Sorting Dropdown */}
        <select
          value={sortOrder}
          onChange={(e) => {
            setSortOrder(e.target.value);
            setPage(1);
          }}
          className="form-control"
          style={{ width: 'auto', fontSize: '0.82rem', padding: '0.45rem 0.8rem' }}
        >
          <option value="newest">Newest First</option>
          <option value="highest_score">Highest Score</option>
          <option value="lowest_score">Lowest Score</option>
          <option value="oldest">Oldest First</option>
        </select>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.45rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            title="Reset Filters"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Content Rendering: Loading / Empty / Data */}
      {loading ? (
        viewMode === 'cards' ? <CardSkeleton count={pageSize} /> : <TableSkeleton rows={pageSize} cols={7} />
      ) : records.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState 
            icon={Search}
            title="No Matching Business Records Found"
            description="No analyses matched the selected search keyword or filter options. Try adjusting or clearing your filters."
            actionLabel="Reset All Filters"
            onAction={resetFilters}
          />
        ) : (
          <EmptyState 
            icon={Building2}
            title="No Business Analyses Saved Yet"
            description="Run your first SME feasibility evaluation with our AI Assistant to see recommendations, scores, and business plans."
            actionLabel="Start New Analysis"
            onAction={handleStartNew}
          />
        )
      ) : viewMode === 'cards' ? (
        /* ================= CARD VIEW ================= */
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
                      score={rec.probability_score || rec.confidence_score}
                      showScore={true}
                    />
                  </div>

                  <div className="grid-2" style={{ fontSize: '0.8rem', color: '#cbd5e1', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.5)', padding: '0.75rem', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <MapPin size={14} style={{ color: '#60a5fa' }} />
                      <span>District: <strong>{formatText(rec.district)}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <DollarSign size={14} style={{ color: '#4ade80' }} />
                      <span>Capital: <strong>{formatCurrency(rec.available_capital_lkr)}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Calendar size={14} style={{ color: '#c084fc' }} />
                      <span>Date: <strong>{formatDate(rec.created_at)}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Sliders size={14} style={{ color: '#fde047' }} />
                      <span>Customers: <strong>{formatCustomersPerDay(rec.expected_customers_per_day)}</strong></span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    ID: <code>{rec.id ? `${rec.id.substring(0, 8)}...` : 'N/A'}</code>
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRecordToDelete(rec);
                      }}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.72rem', padding: '0.35rem 0.6rem', color: '#f87171' }}
                      title="Delete Record"
                    >
                      <Trash2 size={13} />
                    </button>

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
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= TABLE VIEW ================= */
        <div className="glass-card" style={{ padding: '0', overflowX: 'auto' }}>
          <table className="custom-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Business Title</th>
                <th>Stage</th>
                <th>District</th>
                <th>Feasibility Score & Result</th>
                <th>Capital</th>
                <th>Customers</th>
                <th>Analyzed Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => {
                const recordTitle = `${formatText(rec.business_category, 'SME Business')} · ${formatText(rec.district, 'Sri Lanka')}`;

                return (
                  <tr 
                    key={rec.id}
                    onClick={() => handleSelectRecord(rec.id, 'overview')}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div style={{ fontWeight: 700, color: '#ffffff' }}>{recordTitle}</div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'monospace' }}>
                        ID: {rec.id ? rec.id.substring(0, 8) : 'N/A'}
                      </div>
                    </td>
                    <td>
                      <StageBadge stage={rec.business_stage} label={rec.stage_label} />
                    </td>
                    <td>{formatText(rec.district)}</td>
                    <td>
                      <FeasibilityBadge 
                        label={rec.predicted_label || rec.feasibility_label} 
                        score={rec.probability_score || rec.confidence_score}
                        showScore={true}
                      />
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {formatCurrency(rec.available_capital_lkr)}
                    </td>
                    <td>{formatCustomersPerDay(rec.expected_customers_per_day)}</td>
                    <td style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{formatDate(rec.created_at)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRecordToDelete(rec);
                          }}
                          className="btn btn-secondary"
                          style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', color: '#f87171' }}
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectRecord(rec.id, 'overview');
                          }}
                          className="btn btn-secondary"
                          style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem' }}
                        >
                          Workspace
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

      {/* Server-Side Pagination Bar */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="form-control"
              style={{ width: 'auto', fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', opacity: page <= 1 ? 0.5 : 1 }}
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} total)
            </span>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', opacity: page >= totalPages ? 0.5 : 1 }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(recordToDelete)}
        title="Delete Business Analysis?"
        message={`Are you sure you want to delete "${recordToDelete?.business_category} · ${recordToDelete?.district}"? You can undo this action immediately after deletion.`}
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setRecordToDelete(null)}
      />

    </div>
  );
}
