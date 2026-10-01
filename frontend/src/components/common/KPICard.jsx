import React from 'react';

export function KPICard({ title, value, subtitle, icon: Icon, color = '#60a5fa', trend, onClick }) {
  return (
    <div 
      className="glass-card" 
      onClick={onClick}
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '0.5rem', 
        position: 'relative', 
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s ease, border-color 0.15s ease'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {title}
        </span>
        {Icon && (
          <div 
            style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '8px', 
              background: `${color}15`, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: color,
              border: `1px solid ${color}30`
            }}
          >
            <Icon size={18} />
          </div>
        )}
      </div>

      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px', marginTop: '0.2rem' }}>
        {value}
      </div>

      {(subtitle || trend) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
          {trend && (
            <span style={{ color: trend.positive ? '#4ade80' : '#f87171', fontWeight: 700 }}>
              {trend.positive ? '↑' : '↓'} {trend.text}
            </span>
          )}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
