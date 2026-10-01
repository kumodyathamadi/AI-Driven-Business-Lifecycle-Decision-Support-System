import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, ArrowLeft } from 'lucide-react';

export default function BusinessNotFound({ message = "Business analysis record was not found or you do not have permission to view it." }) {
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
      >
        <Building2 size={30} />
      </div>

      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
        Business Not Found
      </h3>
      <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
        {message}
      </p>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <Link to="/businesses" className="btn btn-secondary">
          <ArrowLeft size={16} />
          <span>My Businesses</span>
        </Link>
        <Link to="/analysis/new" className="btn btn-primary">
          <span>Start New Analysis</span>
        </Link>
      </div>
    </div>
  );
}
