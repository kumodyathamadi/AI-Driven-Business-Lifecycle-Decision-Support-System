import React, { useEffect, useState } from 'react';
import { checkHealth } from '../services/api';
import Logo from './Logo';

export default function Navbar() {
  const [apiStatus, setApiStatus] = useState({ online: false, loading: true });

  useEffect(() => {
    async function verifyHealth() {
      const data = await checkHealth();
      setApiStatus({
        online: data.status === 'healthy',
        modelLoaded: data.model_loaded,
        loading: false,
      });
    }
    verifyHealth();
    const interval = setInterval(verifyHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="navbar">
      <div className="brand-section">
        <Logo variant="header" height={36} />
        <div className="brand-title-group">
          <h1>
            SME360 AI
            <span className="tag-component">Component 4 &middot; Risk &amp; Mitigation</span>
          </h1>
          <div className="brand-subtitle">
            GNN-Based Risk Prediction, Mitigation and Scalable Growth Recommendation
          </div>
        </div>
      </div>

      <div className="navbar-actions">
        <div className="status-indicator">
          <span className={`status-dot ${apiStatus.online ? 'online' : 'offline'}`}></span>
          <span style={{ color: apiStatus.online ? 'var(--risk-low)' : 'var(--risk-high)', fontWeight: 600 }}>
            {apiStatus.loading ? 'Checking Engine...' : apiStatus.online ? 'Risk Engine Active' : 'API Offline'}
          </span>
        </div>
      </div>
    </header>
  );
}
