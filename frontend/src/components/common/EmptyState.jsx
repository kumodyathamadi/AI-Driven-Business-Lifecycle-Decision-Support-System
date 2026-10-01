import React from 'react';
import { PlusCircle, Search } from 'lucide-react';

export function EmptyState({ 
  icon: Icon = Search, 
  title = 'No records found', 
  description = 'No data matches your criteria.',
  actionLabel, 
  onAction,
  secondaryActionLabel,
  onSecondaryAction
}) {
  return (
    <div 
      className="glass-card" 
      style={{ 
        padding: '3rem 2rem', 
        textAlign: 'center', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.4)'
      }}
    >
      <div 
        style={{ 
          width: '56px', 
          height: '56px', 
          borderRadius: '50%', 
          background: 'rgba(59, 130, 246, 0.1)', 
          border: '1px solid rgba(59, 130, 246, 0.2)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          color: '#60a5fa', 
          marginBottom: '1rem' 
        }}
      >
        <Icon size={28} />
      </div>

      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.4rem' }}>
        {title}
      </h3>
      <p style={{ color: '#94a3b8', fontSize: '0.85rem', maxWidth: '420px', lineHeight: 1.5, marginBottom: actionLabel ? '1.5rem' : '0' }}>
        {description}
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        {actionLabel && onAction && (
          <button onClick={onAction} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
            <PlusCircle size={16} />
            <span>{actionLabel}</span>
          </button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <button onClick={onSecondaryAction} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
            <span>{secondaryActionLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
}
