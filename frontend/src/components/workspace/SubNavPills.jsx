import React, { useEffect, useState } from 'react';

/**
 * SubNavPills - Sticky sub-navigation pill component for merged tabs.
 * Smoothly scrolls to section anchors and highlights the section currently in view using IntersectionObserver.
 */
export default function SubNavPills({ items = [], activeSection, onSelectSection }) {
  const [currentId, setCurrentId] = useState(activeSection || (items[0] && items[0].id) || '');

  // Observe intersecting sections to update active pill
  useEffect(() => {
    if (!items || items.length === 0) return;

    const ids = items.map((item) => item.id);
    const observer = new IntersectionObserver(
      (entries) => {
        // Find visible section with highest intersection ratio or first visible entry
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length > 0) {
          // Sort by top boundary
          visible.sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
          setCurrentId(visible[0].target.id);
        }
      },
      {
        rootMargin: '-90px 0px -55% 0px',
        threshold: [0, 0.2, 0.5]
      }
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items]);

  // Initial scroll if URL contains a hash matching one of the items
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && items.some((item) => item.id === hash)) {
      setTimeout(() => {
        scrollToSection(hash);
      }, 150);
    }
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (!el) return;

    setCurrentId(id);
    if (onSelectSection) onSelectSection(id);

    // Smooth scroll with offset for sticky header + subnav
    const offset = 145;
    const elementPosition = el.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });

    try {
      window.history.replaceState(null, '', `#${id}`);
    } catch (e) {
      // Ignore in restricted environments
    }
  };

  return (
    <nav 
      className="workspace-subnav-sticky" 
      aria-label="Section quick navigation"
      style={{
        position: 'sticky',
        top: '64px',
        zIndex: 25,
        display: 'flex',
        alignItems: 'center',
        gap: '0.45rem',
        padding: '0.5rem 0.65rem',
        margin: '-0.5rem 0 1.5rem 0',
        borderRadius: '9999px',
        background: 'rgba(11, 19, 41, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
        overflowX: 'auto',
        scrollbarWidth: 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', width: '100%' }}>
        {items.map((item, idx) => {
          const isActive = currentId === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(item.id)}
              className={`subnav-pill-btn ${isActive ? 'active' : ''}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#ffffff' : '#94a3b8',
                background: isActive ? 'rgba(99, 102, 241, 0.22)' : 'transparent',
                border: isActive ? '1px solid rgba(99, 102, 241, 0.45)' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                whiteSpace: 'nowrap'
              }}
              aria-current={isActive ? 'true' : undefined}
            >
              {Icon && <Icon size={13} style={{ color: isActive ? '#818cf8' : 'currentColor', opacity: isActive ? 1 : 0.7 }} />}
              <span>{item.label}</span>
              {isActive && (
                <span 
                  style={{ 
                    width: '5px', 
                    height: '5px', 
                    borderRadius: '50%', 
                    background: '#10b981',
                    boxShadow: '0 0 6px #10b981'
                  }} 
                  aria-hidden="true" 
                />
              )}
              {item.badge && (
                <span 
                  className={`tab-pill-badge ${item.badgeClass || 'tab-pill-emerald'}`}
                  style={{ fontSize: '0.66rem', padding: '0.1rem 0.4rem' }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
