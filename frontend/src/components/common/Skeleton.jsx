import React from 'react';

export function Skeleton({ width = '100%', height = '20px', borderRadius = '6px', style = {} }) {
  return (
    <div 
      style={{ 
        width, 
        height, 
        borderRadius, 
        background: 'linear-gradient(90deg, rgba(30, 41, 59, 0.6) 25%, rgba(51, 65, 85, 0.6) 50%, rgba(30, 41, 59, 0.6) 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-pulse 1.5s infinite ease-in-out',
        ...style
      }} 
    />
  );
}

export function TableSkeleton({ rows = 5, cols = 6 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem 0' }}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} height="28px" width={c === 0 ? '25%' : '15%'} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid-2" style={{ gap: '1rem' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Skeleton width="40%" height="16px" />
          <Skeleton width="70%" height="24px" />
          <Skeleton width="100%" height="40px" />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <Skeleton width="30%" height="14px" />
            <Skeleton width="25%" height="28px" />
          </div>
        </div>
      ))}
    </div>
  );
}
