import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div 
      style={{ 
        minHeight: '70vh', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        textAlign: 'center',
        padding: '2rem'
      }}
    >
      <div 
        style={{ 
          width: '64px', 
          height: '64px', 
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
        <FileQuestion size={32} />
      </div>

      <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.5rem' }}>
        404 - Page Not Found
      </h2>
      <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '440px', lineHeight: 1.6, marginBottom: '1.75rem' }}>
        The page URL you are attempting to visit does not exist or has been relocated.
      </p>

      <Link to="/dashboard" className="btn btn-primary" style={{ padding: '0.75rem 1.4rem' }}>
        <Home size={16} />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  );
}
