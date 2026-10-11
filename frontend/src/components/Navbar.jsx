import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { checkHealth } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Logo from './Logo';
import { LogOut, User, Sun, Moon, ChevronDown, Check, Shield } from 'lucide-react';

export default function Navbar({ currentProfile }) {
  const [apiStatus, setApiStatus] = useState({ online: false, loading: true });
  const { isDarkMode, toggleTheme } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);
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

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <Link to="/dashboard" className="brand-section" style={{ textDecoration: 'none' }}>
        <Logo variant="header" height={40} />
        <div className="brand-title-group">
          <h1>
            <span>SME360 AI</span>
            <span className="tag-component">
              AI Business Plan Generator
            </span>
          </h1>
          <div className="brand-subtitle">
            From idea to investor-ready plan in minutes
          </div>
        </div>
      </Link>

      <div className="navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Backend Connectivity Status Indicator */}
        {(!apiStatus.online || apiStatus.loading) && (
          <div className="status-indicator" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className={`status-dot ${apiStatus.online ? 'online' : 'offline'}`} />
            <span style={{ color: apiStatus.online ? '#4ade80' : '#fca5a5', fontSize: '0.74rem' }}>
              {apiStatus.loading ? 'Checking API...' : 'Offline'}
            </span>
            {!apiStatus.online && !apiStatus.loading && (
              <button
                onClick={async () => {
                  setApiStatus(prev => ({ ...prev, loading: true }));
                  const data = await checkHealth();
                  setApiStatus({
                    online: data.status === 'healthy',
                    modelLoaded: data.model_loaded,
                    loading: false,
                  });
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#fca5a5',
                  borderRadius: '4px',
                  padding: '0.1rem 0.4rem',
                  fontSize: '0.68rem',
                  cursor: 'pointer'
                }}
                title="Retry connecting to backend"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* Pill-shaped Dark/Light Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="theme-toggle-pill"
          title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} mode`}
          aria-label="Toggle theme mode"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '24px',
            padding: '0.28rem 0.55rem',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.2s ease',
          }}
        >
          <Sun size={13} style={{ color: isDarkMode ? '#64748b' : '#f59e0b', transition: 'color 0.2s' }} />
          <div
            style={{
              width: '26px',
              height: '14px',
              borderRadius: '10px',
              background: isDarkMode ? '#1e293b' : '#3b82f6',
              position: 'relative',
              transition: 'background 0.2s',
            }}
          >
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#ffffff',
                position: 'absolute',
                top: '2px',
                left: isDarkMode ? '14px' : '2px',
                transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
              }}
            />
          </div>
          <Moon size={13} style={{ color: isDarkMode ? '#38bdf8' : '#64748b', transition: 'color 0.2s' }} />
        </button>

        {/* User Profile Dropdown */}
        <div ref={profileMenuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowProfileMenu((prev) => !prev)}
            className="user-profile-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(59, 130, 246, 0.28)',
              padding: '0.35rem 0.75rem',
              borderRadius: '24px',
              cursor: 'pointer',
              color: '#f8fafc',
              fontSize: '0.82rem',
              fontWeight: 600,
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.25)',
              transition: 'all 0.2s ease',
            }}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 0 8px rgba(6, 182, 212, 0.5)',
              }}
            >
              <User size={13} />
            </div>
            <span>{user?.full_name || 'SME Decision Maker'}</span>
            <ChevronDown size={14} style={{ color: '#94a3b8', transform: showProfileMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {/* Profile Menu Popup */}
          {showProfileMenu && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '220px',
                background: '#0b1329',
                border: '1px solid rgba(59, 130, 246, 0.35)',
                borderRadius: '12px',
                padding: '0.5rem',
                boxShadow: '0 12px 36px rgba(0, 0, 0, 0.55), 0 0 20px rgba(59, 130, 246, 0.15)',
                zIndex: 150,
                backdropFilter: 'blur(16px)',
                animation: 'fadeIn 0.15s ease-out',
              }}
            >
              <div style={{ padding: '0.5rem 0.65rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
                  {user?.full_name || 'SME Decision Maker'}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Enterprise Plan · Active
                </div>
              </div>

              <div style={{ padding: '0.35rem 0' }}>
                <Link
                  to="/dashboard"
                  onClick={() => setShowProfileMenu(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.65rem',
                    fontSize: '0.78rem',
                    color: '#94a3b8',
                    textDecoration: 'none',
                    borderRadius: '6px',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#38bdf8';
                    e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#94a3b8';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Shield size={14} />
                  <span>SaaS Workspace</span>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.65rem',
                    fontSize: '0.78rem',
                    color: '#f87171',
                    background: 'none',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <LogOut size={14} />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
