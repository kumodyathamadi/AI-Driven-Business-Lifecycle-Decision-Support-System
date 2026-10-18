import React, { useEffect } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom';
import { Layers, CheckCircle2, TrendingUp } from 'lucide-react';
import SubNavPills from './SubNavPills';
import BusinessOverview from '../BusinessOverview';
import FeasibilityCard from '../FeasibilityCard';
import ShapExplanation from '../ShapExplanation';

/**
 * AnalysisPage - Merged Tab 1 composing:
 * 1. Business Overview (#overview)
 * 2. Feasibility Assessment (#feasibility)
 * 3. Key Insights & Model Drivers (#key-insights)
 * Includes sticky pill sub-navigation and deep link support.
 */
export default function AnalysisPage({ initialSection = 'overview' }) {
  const ctx = useOutletContext();
  const location = useLocation();
  const profile = ctx?.profile;

  const explainability = profile?.explainability || {};
  const posDrivers = explainability.positive_drivers || [];
  const metricsCount = posDrivers.length > 0 ? posDrivers.length : 6;

  const subNavItems = [
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'feasibility', label: 'Feasibility Assessment', icon: CheckCircle2 },
    { id: 'key-insights', label: 'Key Insights', icon: TrendingUp }
  ];

  // Auto-scroll to section on initial mount if hash or initialSection specified
  useEffect(() => {
    const hash = location.hash.replace('#', '') || initialSection;
    if (hash && hash !== 'overview') {
      const targetId = hash === 'insights' ? 'key-insights' : hash;
      const el = document.getElementById(targetId);
      if (el) {
        setTimeout(() => {
          const offset = 145;
          const elementPosition = el.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - offset;
          window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }, 150);
      }
    }
  }, [location.pathname, location.hash, initialSection]);

  return (
    <div className="workspace-analysis-merged-page" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Sticky Sub-Navigation Pills */}
      <SubNavPills items={subNavItems} activeSection={initialSection} />

      {/* 1. Overview Section */}
      <section id="overview" className="workspace-scroll-section" style={{ scrollMarginTop: '150px' }}>
        <div 
          className="workspace-section-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            marginBottom: '1rem',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid var(--border-color)'
          }}
        >
          <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
            <Layers size={16} />
          </div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Business Overview
          </h2>
        </div>
        <BusinessOverview profile={profile} />
      </section>

      {/* 2. Feasibility Assessment Section */}
      <section id="feasibility" className="workspace-scroll-section" style={{ scrollMarginTop: '150px' }}>
        <div 
          className="workspace-section-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            marginBottom: '1rem',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid var(--border-color)'
          }}
        >
          <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
            <CheckCircle2 size={16} />
          </div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Feasibility Assessment
          </h2>
        </div>
        <FeasibilityCard />
      </section>

      {/* 3. Key Insights & Factor Attribution Section */}
      <section id="key-insights" className="workspace-scroll-section" style={{ scrollMarginTop: '150px' }}>
        <div 
          className="workspace-section-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.6rem',
            marginBottom: '1rem',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid var(--border-color)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
              <TrendingUp size={16} />
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Key Insights & Attribution Factors
            </h2>
          </div>

          {/* Badge moved from Tab Bar to Section Heading */}
          <span 
            className="tab-pill-badge tab-pill-emerald"
            style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem' }}
          >
            {metricsCount} Metrics
          </span>
        </div>
        <ShapExplanation />
      </section>

    </div>
  );
}
