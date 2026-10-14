import React, { useEffect } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom';
import { Award, BarChart2 } from 'lucide-react';
import SubNavPills from './SubNavPills';
import RecommendationsView from '../RecommendationsView';

/**
 * StrategiesPage - Merged Tab 2 composing:
 * 1. Strategic Recommendations & TOPSIS Ranking (#recommendations)
 * 2. Decision Matrix & Evaluated Options (#options)
 * Includes sticky pill sub-navigation and deep link support.
 */
export default function StrategiesPage({ initialSection = 'recommendations' }) {
  const ctx = useOutletContext();
  const location = useLocation();
  const profile = ctx?.profile;

  const subNavItems = [
    { id: 'recommendations', label: 'Recommendations (TOPSIS)', icon: Award, badge: 'TOPSIS', badgeClass: 'tab-pill-blue' },
    { id: 'options', label: 'Decision Matrix & Options', icon: BarChart2 }
  ];

  // Auto-scroll on mount if hash or initialSection specified
  useEffect(() => {
    const hash = location.hash.replace('#', '') || initialSection;
    if (hash) {
      const targetId = hash === 'ranking' ? 'recommendations' : hash;
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
    <div className="workspace-strategies-merged-page" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Sticky Sub-Navigation Pills */}
      <SubNavPills items={subNavItems} activeSection={initialSection} />

      {/* Strategies Component Rendering Recommendations & Options */}
      <RecommendationsView profile={profile} />

    </div>
  );
}
