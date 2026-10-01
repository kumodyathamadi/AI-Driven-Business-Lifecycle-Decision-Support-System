import React, { useEffect, useState } from 'react';
import { 
  PlusCircle, 
  Building2, 
  ArrowRight, 
  Clock, 
  Sparkles,
  TrendingUp,
  PieChart as PieIcon,
  BarChart3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import { fetchAnalysisRecords, fetchDashboardSummary } from '../services/api';
import { FeasibilityBadge, StageBadge } from './common/Badge';
import { KPICard } from './common/KPICard';
import { TableSkeleton, CardSkeleton } from './common/Skeleton';
import { EmptyState } from './common/EmptyState';
import { formatCurrency, formatCustomersPerDay, formatDate, formatText } from '../utils/formatters';

const OUTCOME_COLORS = {
  'Feasible': '#22c55e',
  'Conditional': '#eab308',
  'Infeasible': '#ef4444'
};

export default function Dashboard({ activeProfile, onStartNew, onViewMyBusinesses, onSelectRecord }) {
  const navigate = useNavigate();
  const handleStartNew = onStartNew || (() => navigate('/analysis/new'));
  const handleViewMyBusinesses = onViewMyBusinesses || (() => navigate('/businesses'));
  const handleSelectRecord = onSelectRecord || ((id) => navigate(`/businesses/${id}`));

  const [recentRecords, setRecentRecords] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [summaryMetrics, setSummaryMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

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
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const latestRecord = summaryMetrics?.latest_record || (recentRecords.length > 0 ? recentRecords[0] : null);

  const pieData = summaryMetrics?.feasibility_distribution?.filter(d => d.value > 0) || [];
  const timelineData = summaryMetrics?.timeline_data || [];

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
              Sri Lankan SME Business Feasibility Prediction, SHAP Explainability & Business Plan Recommendation
            </p>
          </div>

          <div>
            <button 
              onClick={handleStartNew}
              className="btn btn-primary"
              style={{ padding: '0.85rem 1.6rem', fontSize: '0.9rem', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)' }}
            >
              <PlusCircle size={18} />
              <span>Start New Analysis</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 KPI Cards */}
      {summaryMetrics && (
        <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <KPICard 
            title="Total Analyses" 
            value={summaryMetrics.total_analyses ?? totalCount} 
            subtitle="Recorded evaluations"
            icon={Building2}
            color="#60a5fa"
          />
          <KPICard 
            title="Feasible Rate" 
            value={`${Math.round(summaryMetrics.feasible_rate_pct || 0)}%`} 
            subtitle={`${summaryMetrics.feasible_count || 0} viable projects`}
            icon={Sparkles}
            color="#4ade80"
          />
          <KPICard 
            title="Average Capital" 
            value={formatCurrency(summaryMetrics.avg_capital_lkr)} 
            subtitle="SME project budget"
            icon={TrendingUp}
            color="#c084fc"
          />
          <KPICard 
            title="Top Sector" 
            value={formatText(summaryMetrics.top_sector, 'Bakery / Food')} 
            subtitle="Most evaluated industry"
            icon={Building2}
            color="#fde047"
          />
        </div>
      )}

      {/* "Continue Where You Left Off" Latest Analysis Card */}
      {latestRecord && (
        <div className="glass-card" style={{ border: '1px solid rgba(59, 130, 246, 0.35)', background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.25), rgba(15, 23, 42, 0.7))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Continue Where You Left Off
                </span>
                <span style={{ color: '#475569' }}>•</span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  {formatDate(latestRecord.created_at)}
                </span>
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
                {formatText(latestRecord.business_category, 'SME Enterprise')} · {formatText(latestRecord.district, 'Sri Lanka')}
              </h3>

              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.35rem', display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                <span>Stage: <strong style={{ color: '#cbd5e1' }}>{latestRecord.stage_label || latestRecord.business_stage}</strong></span>
                <span>Capital: <strong style={{ color: '#4ade80' }}>{formatCurrency(latestRecord.available_capital_lkr)}</strong></span>
                <span>Expected: <strong style={{ color: '#cbd5e1' }}>{formatCustomersPerDay(latestRecord.expected_customers_per_day)}</strong></span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <FeasibilityBadge 
                label={latestRecord.predicted_label || latestRecord.feasibility_label} 
                score={latestRecord.probability_score || latestRecord.confidence_score}
                showScore={true}
                size="md"
              />
              <button 
                onClick={() => handleSelectRecord(latestRecord.id, 'overview')} 
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem', padding: '0.55rem 1rem' }}
              >
                <span>Open Workspace</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visual Analytics Charts Section */}
      {summaryMetrics && (totalCount > 0) && (
        <div className="grid-2" style={{ gap: '1.25rem' }}>
          
          {/* Chart 1: Feasibility Split Donut */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <PieIcon size={16} style={{ color: '#60a5fa' }} />
                  Feasibility Outcome Distribution
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                  Outcome breakdown across evaluated SME profiles.
                </p>
              </div>
            </div>

            <div style={{ height: '220px', width: '100%', position: 'relative' }}>
              {pieData.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                  No outcome distribution data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={OUTCOME_COLORS[entry.name] || '#3b82f6'} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid #334155', borderRadius: '8px', fontSize: '0.8rem' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.25rem', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }}></span>
                <span>Feasible ({summaryMetrics.feasible_count || 0})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#eab308' }}></span>
                <span>Conditional ({summaryMetrics.conditionally_feasible_count || 0})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></span>
                <span>Infeasible ({summaryMetrics.infeasible_count || 0})</span>
              </div>
            </div>
          </div>

          {/* Chart 2: Analyses Activity Timeline */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <BarChart3 size={16} style={{ color: '#c084fc' }} />
                  Analyses Activity & Timeline
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                  Volume of feasibility runs evaluated over time.
                </p>
              </div>
            </div>

            <div style={{ height: '220px', width: '100%' }}>
              {timelineData.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                  No timeline data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid #334155', borderRadius: '8px', fontSize: '0.8rem' }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Analyses" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
              Total of <strong>{totalCount}</strong> business profiles evaluated
            </div>
          </div>

        </div>
      )}

      {/* Recent Business Analyses Table Section */}
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
            <button onClick={handleViewMyBusinesses} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
              View All ({totalCount})
            </button>
          )}
        </div>

        {loading ? (
          <TableSkeleton rows={4} cols={7} />
        ) : recentRecords.length === 0 ? (
          <EmptyState 
            icon={Building2}
            title="No Business Analyses Yet"
            description="Start your first SME business feasibility evaluation with our AI Assistant to see recommendations and predictions."
            actionLabel="Start First Analysis"
            onAction={handleStartNew}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Stage</th>
                  <th>District</th>
                  <th>Feasibility Result & Score</th>
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
                        score={rec.probability_score || rec.confidence_score}
                        showScore={true}
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
                        onClick={() => handleSelectRecord(rec.id, 'overview')} 
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
