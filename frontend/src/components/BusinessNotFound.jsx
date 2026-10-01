import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, ArrowLeft, RefreshCw } from 'lucide-react';

export default function BusinessNotFound({
  message = "Business analysis record was not found or you do not have permission to view it.",
  onRetry
}) {
  return (
    <div 
      className="glass-card"
      style={{ 
        maxWidth: '540px',
        margin: '3rem auto',
        padding: '3rem 2rem', 
        textAlign: 'center', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.7)'
      }}
      role="alert"
    >
      <div 
        style={{ 
          width: '60px', 
          height: '60px', 
          borderRadius: '50%', 
          background: 'rgba(239, 68, 68, 0.15)', 
          border: '1px solid rgba(239, 68, 68, 0.3)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          color: '#f87171', 
          marginBottom: '1.25rem' 
        }}
        aria-hidden="true"
      >
        <Building2 size={30} />
      </div>

      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
        Business Not Found
      </h3>
      <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
        {message}
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="btn"
            style={{
              background: 'rgba(99, 102, 241, 0.2)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              color: '#a5b4fc',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <RefreshCw size={15} />
            <span>Retry Loading</span>
          </button>
        )}
        <Link to="/dashboard" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <ArrowLeft size={16} />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}

