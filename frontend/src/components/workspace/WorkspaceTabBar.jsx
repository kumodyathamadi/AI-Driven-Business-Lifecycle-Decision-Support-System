import React, { useRef, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Layers,
  CheckCircle2,
  TrendingUp,
  Award,
  Compass,
  Sliders,
  FileText,
  ChevronLeft,
  ChevronRight,
  Briefcase
} from 'lucide-react';

export default function WorkspaceTabBar({ businessId, metricsCount = 6 }) {
  const location = useLocation();
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);
  const activeTabRef = useRef(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const tabs = [
    {
      path: `/businesses/${businessId}`,
      label: 'Overview',
      match: `/businesses/${businessId}`,
      icon: Layers,
      showDot: true
    },
    {
      path: `/businesses/${businessId}/feasibility`,
      label: 'Feasibility Assessment',
      match: 'feasibility',
      icon: CheckCircle2
    },
    {
      path: `/businesses/${businessId}/insights`,
      label: 'Key Insights',
      match: 'insights',
      icon: TrendingUp,
      badge: `${metricsCount} Metrics`,
      badgeClass: 'tab-pill-emerald'
    },
    {
      path: `/businesses/${businessId}/recommendations`,
      label: 'Recommendations',
      match: 'recommendations',
      icon: Award
    },
    {
      path: `/businesses/${businessId}/options`,
      label: 'Explore Options',
      match: 'options',
      icon: Compass
    },
    {
      path: `/businesses/${businessId}/scenarios`,
      label: 'Scenario Explorer',
      match: 'scenarios',
      icon: Sliders,
      badge: 'Interactive',
      badgeClass: 'tab-pill-purple'
    },
    {
      path: `/businesses/${businessId}/plan`,
      label: 'Business Plan',
      match: 'plan',
      icon: FileText,
      badge: '5 Sections',
      badgeClass: 'tab-pill-slate'
    }
  ];

  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  // Auto-scroll active tab into view
  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    }
    setTimeout(checkScroll, 300);
  }, [location.pathname]);

  const scroll = (direction) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const amount = direction === 'left' ? -220 : 220;
    el.scrollBy({ left: amount, behavior: 'smooth' });
    setTimeout(checkScroll, 350);
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (index + 1) % tabs.length;
      navigate(tabs[nextIndex].path);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (index - 1 + tabs.length) % tabs.length;
      navigate(tabs[prevIndex].path);
    }
  };

  return (
    <div className="workspace-tabbar-wrapper" style={{ position: 'relative', width: '100%' }}>
      {/* Left Scroll Button */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll('left')}
          className="tabbar-scroll-arrow left"
          aria-label="Scroll tabs left"
        >
          <ChevronLeft size={16} />
        </button>
      )}

      {/* Left Edge Gradient Fade */}
      {canScrollLeft && <div className="tabbar-fade-edge left" />}

      {/* Scrollable Tabs Track */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="template-subnav-bar no-scrollbar"
        role="tablist"
        aria-label="Business Analysis Modules"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          overflowX: 'auto',
          scrollBehavior: 'smooth',
          padding: '0.75rem 0.5rem 0.5rem 0.5rem',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {tabs.map((tab, idx) => {
          const isActive =
            tab.match === `/businesses/${businessId}`
              ? location.pathname === `/businesses/${businessId}` ||
                location.pathname === `/businesses/${businessId}/`
              : location.pathname.includes(tab.match);

          const IconComponent = tab.icon;

          return (
            <Link
              key={tab.path}
              to={tab.path}
              ref={isActive ? activeTabRef : null}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`template-tab-link ${isActive ? 'active' : ''}`}
            >
              {IconComponent && (
                <IconComponent
                  size={14}
                  style={{ opacity: isActive ? 1 : 0.7 }}
                  aria-hidden="true"
                />
              )}
              <span>{tab.label}</span>
              {isActive && tab.showDot && <span className="tab-active-dot" aria-hidden="true" />}
              {tab.badge && (
                <span className={`tab-pill-badge ${tab.badgeClass || ''}`}>
                  {tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Right Edge Gradient Fade */}
      {canScrollRight && <div className="tabbar-fade-edge right" />}

      {/* Right Scroll Button */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scroll('right')}
          className="tabbar-scroll-arrow right"
          aria-label="Scroll tabs right"
        >
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
