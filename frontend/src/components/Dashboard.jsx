import React, { useEffect, useState } from 'react';
import { 
  PlusCircle, 
  Building2, 
  ArrowRight, 
  Clock, 
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { fetchAnalysisRecords, fetchDashboardSummary } from '../services/api';
import { FeasibilityBadge, StageBadge } from './common/Badge';
import { KPICard } from './common/KPICard';
import { TableSkeleton } from './common/Skeleton';
import { EmptyState } from './common/EmptyState';
import { formatCurrency, formatCustomersPerDay, formatDate, formatText } from '../utils/formatters';

export default function Dashboard({ activeProfile, onStartNew, onViewMyBusinesses, onSelectRecord }) {
  const [recentRecords, setRecentRecords] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [summaryMetrics, setSummaryMetrics] = useState(null);
  const [loadingRecords, setLoadingRecords] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [recordsData, summaryData] = await Promise.all([
          fetchAnalysisRecords({ limit: 5 }),
          fetchDashboardSummary()
        ]);

        if (recordsData) {
          const list = Array.isArray(recordsData) ? recordsData : (recordsData.items || []);
          const total = recordsData.total_count !== undefined ? recordsData.total_count : list.length;
          setRecentRecords(list);
          setTotalCount(total);
        }

        if (summaryData) {
          setSummaryMetrics(summaryData);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoadingRecords(false);
      }
    }
    loadData();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Welcome Hero Card */}
      <div 
        className="glass-card" 
        style={{ 
          background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.4), rgba(15, 23, 42, 0.8))', 
          border: '1px solid rgba(59, 130, 246, 0.3)',
          padding: '1.75rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', color: '#60a5fa', fontWeight: 600, marginBottom: '0.5rem' }}>
              <Sparkles size={14} /> AI Decision Support Engine
            </div>
            <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
              Welcome to SME360 AI
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.4rem' }}>
              Sri Lanka SME Business Lifecycle Decision Support & Feasibility Assessment System
            </p>
          </div>

          <div>
            <button 
              onClick={onStartNew}
              className="btn btn-primary"
              style={{ padding: '0.85rem 1.6rem', fontSize: '0.9rem', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)' }}
            >
              <PlusCircle size={18} />
              <span>Start New Analysis</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards (Summary from backend) */}
      {summaryMetrics && (
        <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <KPICard 
            title="Total Analyses" 
            value={summaryMetrics.total_analyses ?? totalCount} 
            subtitle="Saved in database"
            icon={Building2}
            color="#60a5fa"
          />
          <KPICard 
            title="Feasible Rate" 
            value={`${Math.round(summaryMetrics.feasible_rate_pct || 0)}%`} 
            subtitle={`${summaryMetrics.feasible_count || 0} viable profiles`}
            icon={Sparkles}
            color="#4ade80"
          />
          <KPICard 
            title="Avg Capital" 
            value={formatCurrency(summaryMetrics.avg_capital_lkr)} 
            subtitle="SME project budget"
            icon={TrendingUp}
            color="#c084fc"
          />
          <KPICard 
            title="Top Sector" 
            value={formatText(summaryMetrics.top_sector, 'Bakery / Food')} 
            subtitle="Most frequent evaluation"
            icon={Building2}
            color="#fde047"
          />
        </div>
      )}

      {/* Active Business Snapshot (If an analysis is currently loaded in active workspace) */}
      {activeProfile && (
        <div className="glass-card" style={{ border: '1px solid rgba(34, 197, 94, 0.3)', background: 'rgba(6, 78, 59, 0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Continue Where You Left Off
              </span>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginTop: '0.25rem' }}>
                {formatText(activeProfile.business_input?.business_category, 'SME Enterprise')} · {formatText(activeProfile.business_input?.district)}
              </h3>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <span>Stage: <strong>{formatText(activeProfile.business_input?.business_stage)}</strong></span>
                <span>Capital: <strong>{formatCurrency(activeProfile.business_input?.available_capital_lkr)}</strong></span>
                <span>Expected: <strong>{formatCustomersPerDay(activeProfile.business_input?.expected_customers_per_day)}</strong></span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <FeasibilityBadge 
                label={activeProfile.feasibility_analysis?.predicted_label} 
                score={activeProfile.feasibility_analysis?.probability_score}
                showScore={true}
                size="md"
              />
              <button 
                onClick={() => onSelectRecord(activeProfile.metadata?.record_id, 'overview')} 
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
              >
                <span>Open Workspace</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Business Analyses Section */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} style={{ color: '#60a5fa' }} />
              Recent Business Analyses
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              Recently analyzed SME business profiles.
            </p>
          </div>

          {totalCount > 0 && (
            <button onClick={onViewMyBusinesses} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
              View All ({totalCount})
            </button>
          )}
        </div>

        {loadingRecords ? (
          <TableSkeleton rows={4} cols={6} />
        ) : recentRecords.length === 0 ? (
          <EmptyState 
            icon={Building2}
            title="No Business Analyses Yet"
            description="Start your first SME business feasibility evaluation with our AI Assistant to see recommendations and predictions."
            actionLabel="Start First Analysis"
            onAction={onStartNew}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Stage</th>
                  <th>District</th>
                  <th>Feasibility Result</th>
                  <th>Capital</th>
                  <th>Customers</th>
                  <th>Analyzed Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentRecords.map((rec) => (
                  <tr key={rec.id}>
                    <td style={{ fontWeight: 700, color: '#ffffff' }}>
                      {formatText(rec.business_category)}
                    </td>
                    <td>
                      <StageBadge stage={rec.business_stage} label={rec.stage_label} />
                    </td>
                    <td>{formatText(rec.district)}</td>
                    <td>
                      <FeasibilityBadge 
                        label={rec.predicted_label || rec.feasibility_label} 
                        score={rec.probability_score}
                        showScore={rec.probability_score !== undefined}
                      />
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {formatCurrency(rec.available_capital_lkr)}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                      {formatCustomersPerDay(rec.expected_customers_per_day)}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {formatDate(rec.created_at)}
                    </td>
                    <td>
                      <button 
                        onClick={() => onSelectRecord(rec.id, 'overview')} 
                        className="btn btn-secondary"
                        style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem' }}
                      >
                        Open Workspace
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
