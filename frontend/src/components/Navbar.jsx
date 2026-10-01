import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { checkHealth } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';
import { LogOut, User, Sparkles } from 'lucide-react';

export default function Navbar({ currentProfile }) {
  const [apiStatus, setApiStatus] = useState({ online: false, loading: true });
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <Link to="/dashboard" className="brand-section" style={{ textDecoration: 'none' }}>
        <Logo variant="header" height={42} />
        <div className="brand-title-group">
          <h1>
            SME360 AI
            <span className="tag-component">Feasibility & Growth Engine</span>
          </h1>
          <div className="brand-subtitle">
            AI-Driven SME Business Lifecycle Decision Support System
          </div>
        </div>
      </Link>

      <div className="navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div className="status-indicator">
          <span className={`status-dot ${apiStatus.online ? 'online' : 'offline'}`}></span>
          <span style={{ color: apiStatus.online ? '#4ade80' : '#fca5a5', fontSize: '0.78rem' }}>
            {apiStatus.loading ? 'Checking API...' : apiStatus.online ? 'Backend Connected' : 'API Offline'}
          </span>
        </div>

        {isAuthenticated && user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                <User size={15} />
              </div>
              <span style={{ fontWeight: 600 }}>{user.full_name || user.email.split('@')[0]}</span>
            </div>

            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              title="Sign out of SME360 AI"
            >
              <LogOut size={13} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
