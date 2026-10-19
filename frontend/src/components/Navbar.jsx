import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { checkHealth } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import Logo from './Logo';
import { User, Sun, Moon, ChevronDown, Check, Shield } from 'lucide-react';

export default function Navbar({ currentProfile }) {
  const [apiStatus, setApiStatus] = useState({ online: false, loading: true });
  const { isDarkMode, toggleTheme, setDarkMode, setLightMode } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);
  const userName = 'Kumodya';

  const handleSetLight = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      document.documentElement.setAttribute('data-theme', 'light');
      document.body.setAttribute('data-theme', 'light');
      document.documentElement.style.colorScheme = 'light';
      document.documentElement.classList.remove('theme-dark', 'dark');
      document.documentElement.classList.add('theme-light', 'light');
      document.body.classList.remove('theme-dark', 'dark');
      document.body.classList.add('theme-light', 'light');
      localStorage.setItem('sme360_theme', 'light');
    } catch (err) {}
    if (typeof setLightMode === 'function') setLightMode();
    else if (typeof toggleTheme === 'function' && isDarkMode) toggleTheme();
  };

  const handleSetDark = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.setAttribute('data-theme', 'dark');
      document.documentElement.style.colorScheme = 'dark';
      document.documentElement.classList.remove('theme-light', 'light');
      document.documentElement.classList.add('theme-dark', 'dark');
      document.body.classList.remove('theme-light', 'light');
      document.body.classList.add('theme-dark', 'dark');
      localStorage.setItem('sme360_theme', 'dark');
    } catch (err) {}
    if (typeof setDarkMode === 'function') setDarkMode();
    else if (typeof toggleTheme === 'function' && !isDarkMode) toggleTheme();
  };

  const handleToggle = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const current = document.documentElement.getAttribute('data-theme') || (isDarkMode ? 'dark' : 'light');
    if (current === 'dark') {
      handleSetLight(e);
    } else {
      handleSetDark(e);
    }
  };

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

  return (
    <header className="navbar">
      <Link to="/dashboard" className="brand-section" style={{ textDecoration: 'none' }}>
        <Logo variant="header" height={40} />
        <div className="brand-title-group">
          <h1>
            <span>SME360 AI</span>
            {/* <span className="tag-component">
              AI Business Plan Generator
            </span> */}
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

        {/* Segmented Dark/Light Theme Switcher */}
        <div
          className="theme-switcher-group"
          role="radiogroup"
          aria-label="Theme mode selector"
          onClick={handleToggle}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: isDarkMode ? 'rgba(15, 23, 42, 0.9)' : '#f1f5f9',
            border: isDarkMode ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid #cbd5e1',
            borderRadius: '24px',
            padding: '2px',
            cursor: 'pointer',
            boxShadow: isDarkMode
              ? '0 2px 8px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(0, 0, 0, 0.3)'
              : '0 2px 8px rgba(0, 0, 0, 0.06), inset 0 1px 2px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.2s ease',
          }}
        >
          {/* Explicit Light Mode Trigger */}
          <button
            type="button"
            onClick={handleSetLight}
            title="Switch to Light mode"
            aria-label="Light mode"
            aria-checked={!isDarkMode}
            role="radio"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px 6px',
              borderRadius: '20px',
              border: 'none',
              cursor: 'pointer',
              background: !isDarkMode ? '#ffffff' : 'transparent',
              color: !isDarkMode ? '#d97706' : '#64748b',
              boxShadow: !isDarkMode ? '0 1px 4px rgba(0, 0, 0, 0.12)' : 'none',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <Sun size={14} style={{ color: !isDarkMode ? '#f59e0b' : '#64748b', transition: 'color 0.2s' }} />
          </button>

          {/* Interactive Switch Pill */}
          <button
            type="button"
            onClick={handleToggle}
            className="theme-toggle-pill"
            title={isDarkMode ? 'Currently Dark. Click to switch to Light mode' : 'Currently Light. Click to switch to Dark mode'}
            aria-label="Toggle theme mode"
            style={{
              width: '32px',
              height: '18px',
              borderRadius: '12px',
              background: isDarkMode ? '#1e293b' : '#3b82f6',
              border: isDarkMode ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid #2563eb',
              position: 'relative',
              cursor: 'pointer',
              padding: 0,
              margin: '0 2px',
              boxShadow: isDarkMode ? 'inset 0 1px 3px rgba(0, 0, 0, 0.5)' : 'inset 0 1px 3px rgba(0, 0, 0, 0.2)',
              transition: 'all 0.25s ease',
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#ffffff',
                position: 'absolute',
                top: '2px',
                left: isDarkMode ? '16px' : '2px',
                transition: 'left 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 1px 4px rgba(0, 0, 0, 0.35)',
              }}
            />
          </button>

          {/* Explicit Dark Mode Trigger */}
          <button
            type="button"
            onClick={handleSetDark}
            title="Switch to Dark mode"
            aria-label="Dark mode"
            aria-checked={isDarkMode}
            role="radio"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px 6px',
              borderRadius: '20px',
              border: 'none',
              cursor: 'pointer',
              background: isDarkMode ? '#1e293b' : 'transparent',
              color: isDarkMode ? '#38bdf8' : '#94a3b8',
              boxShadow: isDarkMode ? '0 1px 4px rgba(0, 0, 0, 0.3)' : 'none',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <Moon size={14} style={{ color: isDarkMode ? '#38bdf8' : '#94a3b8', transition: 'color 0.2s' }} />
          </button>
        </div>

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
              background: isDarkMode ? 'rgba(15, 23, 42, 0.85)' : '#ffffff',
              border: isDarkMode ? '1px solid rgba(59, 130, 246, 0.28)' : '1px solid #cbd5e1',
              padding: '0.35rem 0.75rem',
              borderRadius: '24px',
              cursor: 'pointer',
              color: isDarkMode ? '#f8fafc' : '#0f172a',
              fontSize: '0.82rem',
              fontWeight: 600,
              boxShadow: isDarkMode ? '0 2px 10px rgba(0, 0, 0, 0.25)' : '0 2px 10px rgba(0, 0, 0, 0.06)',
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
            <span>{userName}</span>
            <ChevronDown size={14} style={{ color: isDarkMode ? '#94a3b8' : '#64748b', transform: showProfileMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {/* Profile Menu Popup */}
          {showProfileMenu && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '220px',
                background: isDarkMode ? '#0b1329' : '#ffffff',
                border: isDarkMode ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '0.5rem',
                boxShadow: isDarkMode ? '0 12px 36px rgba(0, 0, 0, 0.55), 0 0 20px rgba(59, 130, 246, 0.15)' : '0 12px 36px rgba(0, 0, 0, 0.12), 0 2px 10px rgba(0, 0, 0, 0.05)',
                zIndex: 150,
                backdropFilter: 'blur(16px)',
                animation: 'fadeIn 0.15s ease-out',
              }}
            >
              <div style={{ padding: '0.5rem 0.65rem', borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
                  {userName}
                </div>
                <div style={{ fontSize: '0.72rem', color: isDarkMode ? '#64748b' : '#64748b' }}>
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
                  <span>Home Page</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
