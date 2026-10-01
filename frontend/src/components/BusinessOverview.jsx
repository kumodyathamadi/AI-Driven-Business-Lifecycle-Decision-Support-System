import React from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { 
  Briefcase, 
  MapPin, 
  DollarSign, 
  Users, 
  Clock, 
  Award, 
  TrendingUp, 
  ArrowRight, 
  Lightbulb, 
  Sliders, 
  FileText 
} from 'lucide-react';
import { FeasibilityBadge, StageBadge } from './common/Badge';
import { formatCurrency, formatCustomersPerDay, formatNumber, formatText } from '../utils/formatters';

export default function BusinessOverview({ profile: propProfile, onNavigate }) {
  const outletCtx = useOutletContext();
  const navigate = useNavigate();
  const { id } = useParams();

  const profile = propProfile || outletCtx?.profile;
  if (!profile) return null;

  const { business_input = {}, feasibility_analysis = {}, personalized_business_plan = {} } = profile;
  const { predicted_label, confidence_score, probability_score } = feasibility_analysis;

  const handleNav = (tab) => {
    if (onNavigate) {
      onNavigate(tab);
    } else if (id) {
      if (tab === 'overview') navigate(`/businesses/${id}`);
      else if (tab === 'scenario') navigate(`/businesses/${id}/scenarios`);
      else navigate(`/businesses/${id}/${tab}`);
    }
  };

  const bizTitle = `${formatText(business_input.business_category, 'SME Business')} · ${formatText(business_input.district, 'Sri Lanka')}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Overview Banner */}
      <div 
        className="glass-card" 
        style={{ 
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))', 
          border: '1px solid var(--border-accent)',
          padding: '1.75rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <StageBadge stage={business_input.business_stage} />
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <MapPin size={14} /> {formatText(business_input.district)} District
              </span>
            </div>

            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>
              {bizTitle}
            </h2>
            
            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '0.5rem', maxWidth: '750px', lineHeight: '1.5' }}>
              {formatText(personalized_business_plan.executive_overview?.business_summary, 'Comprehensive SME business profile overview and feasibility evaluation.')}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
            <FeasibilityBadge 
              label={predicted_label} 
              score={probability_score || confidence_score}
              showScore={true}
              size="md"
            />
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Confidence: <strong style={{ color: '#ffffff' }}>{confidence_score ? `${(confidence_score * 100).toFixed(1)}%` : 'Not provided'}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid-3">
        <div className="glass-card">
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Financial Capital</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#4ade80', marginTop: '0.25rem' }}>
            {formatCurrency(business_input.available_capital_lkr)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
            Monthly Budget: {formatCurrency(business_input.monthly_budget_lkr)}
          </div>
        </div>

        <div className="glass-card">
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Target Customer Demand</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#60a5fa', marginTop: '0.25rem' }}>
            {formatCustomersPerDay(business_input.expected_customers_per_day)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
            Expected Unit Price: {formatCurrency(business_input.expected_price_lkr)}
          </div>
        </div>

        <div className="glass-card">
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Entrepreneur Experience</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#c084fc', marginTop: '0.25rem' }}>
            {business_input.entrepreneur_experience_years !== undefined ? `${business_input.entrepreneur_experience_years} Years` : 'Not provided'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
            Location Type: {formatText(business_input.location_type)}
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div style={{ marginTop: '0.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '1rem' }}>
          Explore Analysis & Research Modules
        </h3>

        <div className="grid-2">
          <div 
            className="glass-card" 
            style={{ cursor: 'pointer', transition: 'transform 0.2s, border-color 0.2s' }}
            onClick={() => handleNav('feasibility')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                <TrendingUp size={20} />
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>1. Feasibility Assessment</h4>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.5' }}>
              Detailed viability scoring breakdown, probability distribution across viability classes.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#60a5fa', fontWeight: 600, marginTop: '0.75rem' }}>
              <span>View Assessment</span> <ArrowRight size={14} />
            </div>
          </div>

          <div 
            className="glass-card" 
            style={{ cursor: 'pointer', transition: 'transform 0.2s, border-color 0.2s' }}
            onClick={() => handleNav('insights')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80' }}>
                <Award size={20} />
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>2. Key Explainability Drivers (SHAP)</h4>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.5' }}>
              Discover the top positive supporting factors and risk hurdles influencing your prediction.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#4ade80', fontWeight: 600, marginTop: '0.75rem' }}>
              <span>View Key Insights</span> <ArrowRight size={14} />
            </div>
          </div>

          <div 
            className="glass-card" 
            style={{ cursor: 'pointer', transition: 'transform 0.2s, border-color 0.2s' }}
            onClick={() => handleNav('recommendations')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc' }}>
                <Lightbulb size={20} />
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>3. Strategic Recommendations</h4>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.5' }}>
              Actionable business advice tailored to your market situation and resource availability.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#c084fc', fontWeight: 600, marginTop: '0.75rem' }}>
              <span>View Recommendations</span> <ArrowRight size={14} />
            </div>
          </div>

          <div 
            className="glass-card" 
            style={{ cursor: 'pointer', transition: 'transform 0.2s, border-color 0.2s' }}
            onClick={() => handleNav('scenario')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(234, 179, 8, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fde047' }}>
                <Sliders size={20} />
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>4. Scenario Explorer</h4>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.5' }}>
              Simulate variations in capital, pricing, and budget to see how outcomes change.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#fde047', fontWeight: 600, marginTop: '0.75rem' }}>
              <span>Open Scenario Explorer</span> <ArrowRight size={14} />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
