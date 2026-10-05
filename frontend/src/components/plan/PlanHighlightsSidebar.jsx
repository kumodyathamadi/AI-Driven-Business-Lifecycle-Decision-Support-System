import React from 'react';
import { 
  Sparkles, 
  Download, 
  FileText, 
  Share2, 
  Printer, 
  Loader2, 
  Check, 
  Compass, 
  ShieldCheck, 
  DollarSign, 
  Target, 
  Clock 
} from 'lucide-react';
import { formatCurrency, formatCustomersPerDay, formatConfidence } from '../../utils/formatters';

export default function PlanHighlightsSidebar({
  profile,
  executiveOverview = {},
  financialPlan = {},
  marketingPlan = {},
  downloadingPdf,
  downloadingDocx,
  copiedLink,
  onDownloadPdf,
  onDownloadDocx,
  onShareLink,
  onPrint
}) {
  const businessInput = profile?.business_input || {};
  const feasibility = profile?.feasibility_analysis || {};

  const isAdopted = executiveOverview.is_user_selected;
  const activeStrategy = executiveOverview.recommended_primary_strategy || 'Lean Bootstrapped Launch';
  const label = feasibility.predicted_label || 'Conditionally Feasible';
  const confidence = feasibility.confidence_score || feasibility.probability_score || 0.6;

  const targetCapital = financialPlan.available_capital_lkr ?? businessInput.available_capital_lkr ?? 0;
  const monthlyBudget = financialPlan.monthly_operating_budget_lkr ?? businessInput.monthly_budget_lkr ?? 0;
  const capitalRunway = financialPlan.capital_runway_months ?? 0;
  const targetCustomers = marketingPlan.target_daily_customers ?? businessInput.expected_customers_per_day ?? 0;

  return (
    <aside className="bp-sidebar">
      <div className="bp-sidebar-card">
        
        {/* Title */}
        <div className="bp-sidebar-title">
          <span>Key Plan Highlights</span>
          <Sparkles size={15} style={{ color: '#38bdf8' }} />
        </div>

        {/* Highlights List */}
        <div className="bp-sidebar-list">
          
          {/* Feasibility */}
          <div className="bp-sidebar-item">
            <span className="bp-sidebar-item-label">Feasibility Outcome</span>
            <div className="bp-sidebar-item-value" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#60a5fa' }}>{label}</span>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{formatConfidence(confidence)}</span>
            </div>
          </div>

          {/* Strategy */}
          <div className="bp-sidebar-item">
            <span className="bp-sidebar-item-label">Guiding Strategy</span>
            <div className="bp-sidebar-item-value" style={{ fontSize: '0.88rem', color: isAdopted ? '#34d399' : '#ffffff', lineHeight: 1.35 }}>
              {activeStrategy}
              {isAdopted && (
                <div style={{ fontSize: '0.68rem', color: '#34d399', fontWeight: 600, marginTop: '0.15rem' }}>
                  ✓ Selected by Entrepreneur
                </div>
              )}
            </div>
          </div>

          {/* Capital Required */}
          <div className="bp-sidebar-item">
            <span className="bp-sidebar-item-label">Target Capital Required</span>
            <div className="bp-sidebar-item-value" style={{ color: '#38bdf8' }}>
              {formatCurrency(targetCapital)}
            </div>
          </div>

          {/* Monthly Budget */}
          <div className="bp-sidebar-item">
            <span className="bp-sidebar-item-label">Monthly Operating Budget</span>
            <div className="bp-sidebar-item-value" style={{ color: '#a5b4fc' }}>
              {formatCurrency(monthlyBudget)}
            </div>
          </div>

          {/* Target Customers */}
          <div className="bp-sidebar-item">
            <span className="bp-sidebar-item-label">Target Daily Customers</span>
            <div className="bp-sidebar-item-value" style={{ color: '#e879f9' }}>
              {formatCustomersPerDay(targetCustomers)}
            </div>
          </div>

          {/* Capital Runway */}
          <div className="bp-sidebar-item">
            <span className="bp-sidebar-item-label">Capital Runway</span>
            <div className="bp-sidebar-item-value" style={{ color: '#fbbf24' }}>
              {capitalRunway} <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Months</span>
            </div>
          </div>

        </div>

        {/* Quick Document CTAs */}
        <div className="bp-sidebar-actions">
          <button
            onClick={onDownloadPdf}
            disabled={downloadingPdf}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '0.65rem', fontSize: '0.825rem' }}
          >
            {downloadingPdf ? (
              <>
                <Loader2 size={15} className="spin" />
                <span>Exporting PDF...</span>
              </>
            ) : (
              <>
                <Download size={15} />
                <span>Download PDF Plan</span>
              </>
            )}
          </button>

          <button
            onClick={onDownloadDocx}
            disabled={downloadingDocx}
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'center', padding: '0.65rem', fontSize: '0.825rem', background: 'rgba(30, 41, 59, 0.8)' }}
          >
            {downloadingDocx ? (
              <>
                <Loader2 size={15} className="spin" />
                <span>Exporting Word...</span>
              </>
            ) : (
              <>
                <FileText size={15} style={{ color: '#60a5fa' }} />
                <span>Export Word (.docx)</span>
              </>
            )}
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
            <button
              onClick={onShareLink}
              className="btn btn-secondary"
              style={{ justifyContent: 'center', padding: '0.5rem', fontSize: '0.78rem' }}
              title="Copy shareable link"
            >
              {copiedLink ? <Check size={14} style={{ color: '#4ade80' }} /> : <Share2 size={14} />}
              <span>{copiedLink ? 'Copied' : 'Share'}</span>
            </button>

            <button
              onClick={onPrint}
              className="btn btn-secondary"
              style={{ justifyContent: 'center', padding: '0.5rem', fontSize: '0.78rem' }}
              title="Print document"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>
          </div>
        </div>

      </div>
    </aside>
  );
}
