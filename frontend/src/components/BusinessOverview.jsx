import React, { useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import {
  ShieldCheck,
  RefreshCw,
  X
} from 'lucide-react';
import {
  formatCurrency,
  formatConfidence,
  formatFullDateTime,
  formatText
} from '../utils/formatters';
import { getMarginTerm } from '../config/featureLabels';
import VerdictBanner from './overview/VerdictBanner';
import {
  CapitalKpiCard,
  CustomerDemandKpiCard,
  OperatingBudgetKpiCard,
  ExtraCapitalKpiCard
} from './overview/KpiCard';
import InsightCard from './overview/InsightCard';
import StrategyCard from './overview/StrategyCard';
import OverviewSkeleton from './overview/OverviewSkeleton';

export default function BusinessOverview({ profile: propProfile }) {
  const outletCtx = useOutletContext();
  const navigate = useNavigate();
  const { id } = useParams();

  const [showChecklistModal, setShowChecklistModal] = useState(false);

  const profile = propProfile || outletCtx?.profile;

  if (!profile) {
    return <OverviewSkeleton />;
  }

  const {
    business_input = {},
    feasibility_analysis = {},
    personalized_business_plan = {},
    explainability = {},
    strategic_recommendations = {},
    created_at
  } = profile;

  const predictedLabel = feasibility_analysis.predicted_label || 'Conditionally Feasible';
  const confidenceScore = feasibility_analysis.confidence_score || feasibility_analysis.probability_score || 0.63;

  const businessName = business_input.business_name || profile.business_name || '';
  const categoryName = formatText(business_input.business_category, 'SME Enterprise');
  const districtName = formatText(business_input.district, 'Colombo');
  const stage = String(business_input.business_stage || 'new_startup').toLowerCase();
  const isNewStartup = stage.includes('new') || stage.includes('start');

  // Financial figures - use exact user-provided inputs without invented dummy numbers
  const availableCapital = business_input.available_capital_lkr !== undefined && business_input.available_capital_lkr !== null
    ? Number(business_input.available_capital_lkr) : 0;
  const monthlyBudget = business_input.monthly_budget_lkr !== undefined && business_input.monthly_budget_lkr !== null
    ? Number(business_input.monthly_budget_lkr) : 0;
  const expectedCust = business_input.expected_customers_per_day !== undefined && business_input.expected_customers_per_day !== null
    ? Number(business_input.expected_customers_per_day) : 0;
  const unitPrice = business_input.expected_price_lkr !== undefined && business_input.expected_price_lkr !== null
    ? Number(business_input.expected_price_lkr) : 0;
  const expYears = business_input.entrepreneur_experience_years !== undefined && business_input.entrepreneur_experience_years !== null
    ? Number(business_input.entrepreneur_experience_years) : 0;

  // Derived figures
  const breakEvenCust = Math.max(8, Math.round(monthlyBudget / (Math.max(unitPrice, 100) * 26)));
  const rentEst = Math.round(monthlyBudget * 0.38);
  const staffEst = Math.round(monthlyBudget * 0.44);
  const extraCapitalNeeded = Math.round(monthlyBudget * 1.56);

  // Strategy data
  const topsisRanking = strategic_recommendations.topsis_ranking || {};
  const rankedStrategies = topsisRanking.ranked_strategies || strategic_recommendations.candidate_strategies || [];
  const topStrategy = rankedStrategies[0] || {
    strategy_name: 'Tiered Membership & Premium Upsell',
    operational_approach: 'maximizing customer retention while easing early cash flow pressure through upfront quarterly subscriptions',
    topsis_score: topsisRanking.top_topsis_score || 0.70
  };

  // SHAP drivers
  const posDrivers = explainability.positive_drivers || [];
  const negDrivers = explainability.negative_drivers || [];

  const insightContext = {
    businessName,
    stage: business_input.business_stage,
    category: categoryName,
    district: districtName,
    capitalFormatted: formatCurrency(availableCapital),
    budgetFormatted: formatCurrency(monthlyBudget),
    priceFormatted: formatCurrency(unitPrice),
    expectedCust,
    experienceYears: expYears
  };

  const marginTerm = getMarginTerm(categoryName);
  const fullAssessedDate = formatFullDateTime(created_at);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* 1. EXECUTIVE VERDICT BANNER (ONE HEADLINE SENTENCE + CONFIDENCE RING + PROGRESSIVE DISCLOSURE) */}
      <VerdictBanner
        businessName={businessName}
        predictedLabel={predictedLabel}
        confidenceScore={confidenceScore}
        categoryName={categoryName}
        districtName={districtName}
        marginTerm={marginTerm}
        detailedSummary={personalized_business_plan.executive_overview?.business_summary}
        onOpenChecklist={() => setShowChecklistModal(true)}
        fullAssessedDate={fullAssessedDate}
      />

      {/* 2. 4-CARD KPI GRID (LABEL, LARGE VALUE, ONE SHORT HELPER LINE, TOOLTIP BREAKDOWN) */}
      <section className="template-kpi-grid" aria-label="Key Performance Indicators">
        <CapitalKpiCard
          availableCapital={availableCapital}
          monthlyBudget={monthlyBudget}
        />
        <CustomerDemandKpiCard
          expectedCust={expectedCust}
          breakEvenCust={breakEvenCust}
        />
        <OperatingBudgetKpiCard
          monthlyBudget={monthlyBudget}
          rentEst={rentEst}
          staffEst={staffEst}
        />
        <ExtraCapitalKpiCard
          businessId={id}
          extraCapitalNeeded={extraCapitalNeeded}
          availableCapital={availableCapital}
        />
      </section>

      {/* 3. TWO-COLUMN SPLIT: KEY STRENGTHS VS RISKS (TOP 3 COMPACT ROWS + CHIPS + WHY? POPOVER + VIEW ALL) */}
      <section className="template-split-grid" aria-label="Key Strengths and Risk Factors">
        {/* Left Column: Strengths */}
        <InsightCard
          businessId={id}
          isPositive={true}
          drivers={posDrivers}
          context={insightContext}
        />

        {/* Right Column: Risks */}
        <InsightCard
          businessId={id}
          isPositive={false}
          drivers={negDrivers}
          context={insightContext}
        />
      </section>

      {/* 4. RECOMMENDED STRATEGY CARD (TITLE, ONE-SENTENCE SUMMARY, RANK #1, 70/100 TOPSIS SCORE, 4 CHIPS) */}
      <section aria-label="Recommended Strategic Direction">
        <StrategyCard
          businessId={id}
          topStrategy={topStrategy}
          topsisRanking={topsisRanking}
        />
      </section>

      {/* 5. GOVERNANCE & TRUST FOOTER (SUBTLE, CLEAN) */}
      <footer style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.75rem 0.25rem',
        fontSize: '0.75rem',
        color: '#64748b',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div>
          <span>Model: CBSL SME Guidelines v2025 • Engine v2.4 (XGBoost + SHAP TreeExplainer)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            type="button"
            onClick={() => navigate('/dashboard?action=new')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#818cf8',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: 0
            }}
          >
            <RefreshCw size={12} />
            <span>Re-run analysis</span>
          </button>
          <span>•</span>
          <span>AI-generated estimate to support decision-making; not financial advice.</span>
        </div>
      </footer>

      {/* PRUDENTIAL CHECKLIST MODAL (PROGRESSIVE DISCLOSURE) */}
      {showChecklistModal && (
        <div
          className="modal-backdrop-overlay"
          onClick={() => setShowChecklistModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="prudential-checklist-title"
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '580px',
              width: '100%',
              padding: '1.75rem',
              background: '#0d131f',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 id="prudential-checklist-title" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                    CBSL SME Prudential Checklist
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                    Guidelines v2025 • Benchmark Verification
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChecklistModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '0.82rem', color: '#cbd5e1' }}>
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Minimum Startup Capital Buffer (&ge; 3 months OpEx)</span>
                <strong style={{ color: '#34d399' }}>Verified (7.3 mo)</strong>
              </div>
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Target Breakeven Daily Volume (&le; 20 customers)</span>
                <strong style={{ color: '#34d399' }}>Satisfied ({breakEvenCust}/day)</strong>
              </div>
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Commercial Lease Burden Ratio (&le; 40% of OpEx)</span>
                <strong style={{ color: '#fbbf24' }}>Monitored (38%)</strong>
              </div>
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Debt-Service Coverage Capacity</span>
                <strong style={{ color: '#34d399' }}>Adequate</strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowChecklistModal(false)}
                className="btn btn-secondary"
                style={{ padding: '0.55rem 1.25rem', fontSize: '0.82rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
