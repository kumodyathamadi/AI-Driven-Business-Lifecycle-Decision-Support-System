import React from 'react';
import { 
  Building2, 
  MapPin, 
  Briefcase, 
  Target, 
  TrendingUp, 
  Users, 
  Compass, 
  Tag, 
  AlertCircle 
} from 'lucide-react';
import { formatCurrency, formatCustomersPerDay } from '../../utils/formatters';

export default function PlanSection01Overview({ profile }) {
  const businessInput = profile?.business_input || {};
  const personalizedPlan = profile?.personalized_business_plan || {};
  const sec01 = personalizedPlan.section_01_business_market_overview || {};

  const summary = sec01.business_summary || {
    business_name: businessInput.business_name || 'Information not provided',
    business_category: businessInput.business_category || 'SME Business',
    business_stage: businessInput.business_stage || 'New Startup',
    business_model: businessInput.business_model || 'Direct Retail / Service',
    district: businessInput.district || 'Colombo',
    province: businessInput.province || 'Western',
    location_address: businessInput.address || 'Information not provided',
    proposed_action: businessInput.proposed_action || 'Launch Operations',
    business_description: businessInput.additional_description || 'Information not provided'
  };

  const concept = sec01.business_concept || {
    concept_overview: personalizedPlan.executive_overview?.business_summary || `Strategic plan for a ${summary.business_category} in ${summary.district}.`,
    products_services: `Products and commercial offerings in ${summary.business_category}`,
    target_customers: businessInput.target_age_group || `Local consumers in ${summary.district}`,
    business_objectives: businessInput.additional_description || `Establish a sustainable ${summary.business_category} in ${summary.district}.`
  };

  const market = sec01.market_overview || {
    target_market: `${summary.district} (${businessInput.location_type || 'Commercial'} Catchment)`,
    customer_profile: businessInput.target_age_group || 'Information not provided',
    expected_customers_per_day: businessInput.expected_customers_per_day || 0,
    expected_selling_price_lkr: businessInput.expected_price_lkr || 0.0,
    operating_days_per_month: businessInput.expected_operating_days_per_month || 26,
    customer_demand_score: `${businessInput.customer_demand_score || 50}/100`
  };

  const competition = sec01.competition || {
    competition_level: businessInput.competition_level || 'Moderate',
    competitor_count_nearby: businessInput.competitor_count_nearby || 0,
    competitor_information: businessInput.competitor_information || 'Information not provided',
    competitive_positioning: 'Localized customer service and active operational differentiation.'
  };

  const location = sec01.location || {
    district: summary.district,
    province: summary.province,
    location_type: businessInput.location_type || 'Commercial Hub',
    location_suitability_score: `${businessInput.location_suitability_score || 3}/5`,
    location_considerations: `Commercial density and consumer foot traffic in ${summary.district}.`
  };

  return (
    <div className="bp-section" id="section-01">
      {/* Section Header */}
      <div className="bp-section-header">
        <span className="bp-section-num">01</span>
        <div className="bp-section-heading-text">
          <h2 className="bp-section-title">
            <Building2 size={18} style={{ color: '#38bdf8' }} />
            Business & Market Overview
          </h2>
          <div className="bp-section-subtitle">
            Enterprise profile, concept definition, market catchment, competitive positioning, and location dynamics
          </div>
        </div>
      </div>

      {/* 1.1 Business Identity & Summary Grid */}
      <div className="bp-narrative-card">
        <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#38bdf8', fontWeight: 700, marginBottom: '0.65rem' }}>
          1.1 Business Identity & Profile Summary
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.75rem' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Business Name</span>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff', marginTop: '0.15rem' }}>
              {summary.business_name}
            </div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Category & Stage</span>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#60a5fa', marginTop: '0.15rem' }}>
              {summary.business_category} • {summary.business_stage}
            </div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Operating Location</span>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#34d399', marginTop: '0.15rem' }}>
              {summary.district}, {summary.province} Province
            </div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Operating Model</span>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#cbd5e1', marginTop: '0.15rem' }}>
              {summary.business_model}
            </div>
          </div>
        </div>

        {summary.business_description !== 'Information not provided' && (
          <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.85rem', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '6px', borderLeft: '3px solid #38bdf8' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
              Recorded Entrepreneur Description / Objectives:
            </div>
            <p style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: 0, lineHeight: 1.5 }}>
              {summary.business_description}
            </p>
          </div>
        )}
      </div>

      {/* 1.2 Market Overview, Competition & Location Grid */}
      <div className="bp-ops-grid">
        
        {/* Tile 1: Market & Demand */}
        <div className="bp-ops-tile">
          <div className="bp-ops-tile-title">
            <Target size={14} style={{ color: '#c084fc' }} />
            <span>Target Market Catchment</span>
          </div>
          <div className="bp-ops-tile-val" style={{ color: '#e879f9' }}>
            {market.customer_demand_score}
          </div>
          <div className="bp-ops-tile-desc">
            Catchment: {market.target_market}. Target customer profile: {market.customer_profile}.
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.35rem' }}>
            Target: <strong style={{ color: '#ffffff' }}>{formatCustomersPerDay(market.expected_customers_per_day)}</strong> @ <strong style={{ color: '#34d399' }}>{formatCurrency(market.expected_selling_price_lkr)}</strong>
          </div>
        </div>

        {/* Tile 2: Competitive Positioning */}
        <div className="bp-ops-tile">
          <div className="bp-ops-tile-title">
            <Users size={14} style={{ color: '#f59e0b' }} />
            <span>Competitive Landscape</span>
          </div>
          <div className="bp-ops-tile-val" style={{ color: '#fbbf24' }}>
            {competition.competition_level} Competition
          </div>
          <div className="bp-ops-tile-desc">
            {competition.competitor_count_nearby > 0 
              ? `${competition.competitor_count_nearby} direct competitors mapped in local radius.`
              : 'Direct competitor count not specifically recorded.'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.35rem' }}>
            Positioning: <strong style={{ color: '#cbd5e1' }}>{competition.competitive_positioning}</strong>
          </div>
        </div>

        {/* Tile 3: Location Dynamics */}
        <div className="bp-ops-tile">
          <div className="bp-ops-tile-title">
            <MapPin size={14} style={{ color: '#34d399' }} />
            <span>Location Dynamics</span>
          </div>
          <div className="bp-ops-tile-val" style={{ color: '#34d399' }}>
            Suitability: {location.location_suitability_score}
          </div>
          <div className="bp-ops-tile-desc">
            Type: {location.location_type}. Situated in {location.district}, {location.province} Province.
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.35rem' }}>
            Factors: <strong style={{ color: '#cbd5e1' }}>{location.location_considerations}</strong>
          </div>
        </div>

      </div>
    </div>
  );
}
