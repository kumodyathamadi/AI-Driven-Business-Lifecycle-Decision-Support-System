import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export function ConfirmDialog({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isDestructive = true,
  onConfirm,
  onCancel
}) {
  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem'
      }}
      onClick={onCancel}
    >
      <div 
        className="glass-card"
        style={{
          maxWidth: '440px',
          width: '100%',
          padding: '1.75rem',
          border: isDestructive ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-color)',
          background: 'rgba(15, 23, 42, 0.95)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <div 
            style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              background: isDestructive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDestructive ? '#f87171' : '#60a5fa',
              flexShrink: 0
            }}
          >
            {isDestructive ? <AlertTriangle size={20} /> : <Trash2 size={20} />}
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.4rem' }}>
              {title}
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5 }}>
              {message}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button 
            type="button" 
            onClick={onCancel} 
            className="btn btn-secondary" 
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            {cancelLabel}
          </button>
          <button 
            type="button" 
            onClick={onConfirm} 
            className="btn" 
            style={{ 
              fontSize: '0.85rem', 
              padding: '0.5rem 1rem', 
              background: isDestructive ? '#ef4444' : '#3b82f6',
              color: '#ffffff',
              border: 'none',
              fontWeight: 600,
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
