import React from 'react';
import { Skeleton } from '../common/Skeleton';

export default function OverviewSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Verdict Hero Banner Skeleton */}
      <div className="glass-card" style={{ padding: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem', flex: 1 }}>
          <Skeleton width="40px" height="40px" borderRadius="8px" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '80%' }}>
            <Skeleton width="35%" height="16px" />
            <Skeleton width="75%" height="28px" />
            <Skeleton width="90%" height="18px" />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <Skeleton width="130px" height="36px" borderRadius="8px" />
          <Skeleton width="90px" height="14px" />
        </div>
      </div>

      {/* 4 KPI Cards Skeleton */}
      <div className="template-kpi-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="template-kpi-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Skeleton width="60%" height="14px" />
              <Skeleton width="18px" height="18px" borderRadius="4px" />
            </div>
            <Skeleton width="80%" height="32px" />
            <Skeleton width="100%" height="8px" borderRadius="4px" />
            <Skeleton width="50%" height="12px" />
          </div>
        ))}
      </div>

      {/* 2-Column Split Skeleton */}
      <div className="template-split-grid">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="template-pillar-card" style={{ padding: '1.5rem', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Skeleton width="45%" height="20px" />
              <Skeleton width="25%" height="18px" borderRadius="9999px" />
            </div>
            <Skeleton width="90%" height="14px" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
                  <Skeleton width="34px" height="34px" borderRadius="8px" />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <Skeleton width="50%" height="16px" />
                    <Skeleton width="85%" height="12px" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Strategy Banner Skeleton */}
      <div className="template-strategy-banner" style={{ padding: '1.5rem', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Skeleton width="30%" height="24px" />
          <Skeleton width="20%" height="30px" borderRadius="8px" />
        </div>
        <Skeleton width="60%" height="24px" />
        <Skeleton width="90%" height="16px" />
        <Skeleton width="100%" height="60px" borderRadius="8px" />
      </div>
    </div>
  );
}
