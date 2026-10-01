import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';
import { Lock, Mail, User, ArrowRight, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (isRegister) {
        await register(email, password, fullName);
      } else {
        await login(email, password);
      }
      navigate(redirectPath, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Authentication failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUseDemo = () => {
    setEmail('demo@sme360.ai');
    setPassword('password123');
    setIsRegister(false);
    setError('');
  };

  return (
    <div 
      style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '1.5rem',
        background: 'radial-gradient(ellipse at top, #1e293b 0%, #090d16 100%)'
      }}
    >
      <div 
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '2.5rem 2rem',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          background: 'rgba(15, 23, 42, 0.85)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <Logo variant="compact" height={48} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff' }}>
            SME360 AI
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            AI-Driven SME Business Lifecycle Decision Support System
          </p>
        </div>

        {/* Demo Credentials Quick Fill Banner */}
        <div 
          onClick={handleUseDemo}
          style={{
            background: 'rgba(59, 130, 246, 0.12)',
            border: '1px dashed rgba(59, 130, 246, 0.4)',
            borderRadius: '8px',
            padding: '0.75rem',
            marginBottom: '1.5rem',
            cursor: 'pointer',
            transition: 'background 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#60a5fa', fontWeight: 700 }}>
              <Sparkles size={14} /> Quick Demo Access
            </div>
            <div style={{ fontSize: '0.72rem', color: '#cbd5e1', marginTop: '0.15rem' }}>
              <code>demo@sme360.ai</code> • <code>password123</code>
            </div>
          </div>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem' }}
          >
            Auto-fill
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              fontSize: '0.8rem',
              marginBottom: '1.25rem'
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {isRegister && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.35rem', fontWeight: 600 }}>
                Full Name / Business Name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  required
                  placeholder="e.g. Ruwan Perera"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="form-control"
                  style={{ paddingLeft: '2.4rem', fontSize: '0.85rem' }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.35rem', fontWeight: 600 }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="email"
                required
                placeholder="name@business.lk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-control"
                style={{ paddingLeft: '2.4rem', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.35rem', fontWeight: 600 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-control"
                style={{ paddingLeft: '2.4rem', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ 
              marginTop: '0.5rem', 
              padding: '0.85rem', 
              fontSize: '0.9rem', 
              fontWeight: 700, 
              width: '100%',
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
            }}
          >
            {submitting ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In'}
            <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
          {isRegister ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(false); setError(''); }}
                style={{ background: 'none', border: 'none', color: '#60a5fa', fontWeight: 600, cursor: 'pointer' }}
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(true); setError(''); }}
                style={{ background: 'none', border: 'none', color: '#60a5fa', fontWeight: 600, cursor: 'pointer' }}
              >
                Create Account
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
