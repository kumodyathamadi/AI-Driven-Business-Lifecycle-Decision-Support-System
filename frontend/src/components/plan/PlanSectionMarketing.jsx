import React from 'react';
import { 
  Target, 
  TrendingUp, 
  Tag, 
  Megaphone, 
  ShieldAlert, 
  Check 
} from 'lucide-react';
import { formatCustomersPerDay, formatCurrency } from '../../utils/formatters';

export default function PlanSectionMarketing({ profile, marketingPlan = {} }) {
  const businessInput = profile?.business_input || {};
  const targetCustomers = marketingPlan.target_daily_customers ?? businessInput.expected_customers_per_day ?? 0;
  const unitPrice = businessInput.expected_price_lkr;
  const tactics = marketingPlan.promotional_tactics || [];

  let demandText = marketingPlan.demand_score || `Customer Demand Index: ${businessInput.customer_demand_score || 50}/100`;

  return (
    <div className="bp-section" id="section-marketing">
      
      {/* Section Header */}
      <div className="bp-section-header">
        <span className="bp-section-num">03</span>
        <div className="bp-section-heading-text">
          <h2 className="bp-section-title">
            <Target size={18} style={{ color: '#c084fc' }} />
            Marketing & Customer Demand Acquisition
          </h2>
          <div className="bp-section-subtitle">
            Local market demand score, daily customer targets, pricing model, and customer acquisition tactics
          </div>
        </div>
      </div>

      {/* Market Indicators Grid */}
      <div className="bp-ops-grid">
        
        {/* Tile 1: Demand Index */}
        <div className="bp-ops-tile">
          <div className="bp-ops-tile-title">
            <TrendingUp size={14} style={{ color: '#c084fc' }} />
            <span>Demand Evaluation</span>
          </div>
          <div className="bp-ops-tile-val" style={{ color: '#e879f9' }}>
            {demandText}
          </div>
          <div className="bp-ops-tile-desc">
            Market opportunity index derived from local catchment population, sector competition, and consumer trends.
          </div>
        </div>

        {/* Tile 2: Target Daily Volume */}
        <div className="bp-ops-tile">
          <div className="bp-ops-tile-title">
            <Target size={14} style={{ color: '#38bdf8' }} />
            <span>Daily Footfall Target</span>
          </div>
          <div className="bp-ops-tile-val" style={{ color: '#38bdf8' }}>
            {formatCustomersPerDay(targetCustomers)}
          </div>
          <div className="bp-ops-tile-desc">
            Calibrated daily customer volume required to meet monthly revenue and operating targets.
          </div>
        </div>

        {/* Tile 3: Pricing Structure */}
        <div className="bp-ops-tile">
          <div className="bp-ops-tile-title">
            <Tag size={14} style={{ color: '#34d399' }} />
            <span>Unit Price Structure</span>
          </div>
          <div className="bp-ops-tile-val" style={{ color: '#34d399' }}>
            {marketingPlan.pricing_structure || (unitPrice ? `${formatCurrency(unitPrice)} per unit / basket` : 'Market Standard')}
          </div>
          <div className="bp-ops-tile-desc">
            Pricing positioning benchmarked against district competitive landscape.
          </div>
        </div>

      </div>

      {/* Promotional Tactics List */}
      {tactics.length > 0 && (
        <div className="bp-narrative-card" style={{ marginTop: '0.25rem' }}>
          <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#c084fc', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <Megaphone size={14} />
            <span>Strategic Customer Acquisition Tactics</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {tactics.map((tactic, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.84rem', color: '#cbd5e1' }}>
                <span style={{ 
                  width: '18px', 
                  height: '18px', 
                  borderRadius: '50%', 
                  background: 'rgba(192, 132, 252, 0.15)', 
                  color: '#c084fc', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '0.7rem', 
                  fontWeight: 700, 
                  flexShrink: 0,
                  marginTop: '0.15rem' 
                }}>
                  {idx + 1}
                </span>
                <span style={{ lineHeight: 1.45 }}>{tactic}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entrepreneur Input: Marketing Strategy & Competitor Info */}
      {(businessInput.marketing_details || businessInput.competitor_information) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem', marginTop: '0.25rem' }}>
          {businessInput.marketing_details && (
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px', borderLeft: '3px solid #c084fc' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#c084fc', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Recorded Marketing Details:
              </div>
              <p style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: 0, lineHeight: 1.5 }}>
                {businessInput.marketing_details}
              </p>
            </div>
          )}

          {businessInput.competitor_information && (
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px', borderLeft: '3px solid #f59e0b' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Competitor Intelligence:
              </div>
              <p style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: 0, lineHeight: 1.5 }}>
                {businessInput.competitor_information}
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
