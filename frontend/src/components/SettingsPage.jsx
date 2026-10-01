import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  User, 
  HelpCircle, 
  ShieldAlert, 
  History, 
  CheckCircle2, 
  Cpu, 
  Sliders, 
  FileText, 
  Sparkles,
  RefreshCw,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { fetchAuditLogs } from '../services/api';
import { formatDate } from '../utils/formatters';
import { FeasibilityBadge } from './common/Badge';

export default function SettingsPage() {
  const { user } = useAuth();
  const { lang, setLang, t } = useLanguage();
  
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await fetchAuditLogs(25);
      setAuditLogs(data || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const languages = [
    { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
    { code: 'si', label: 'Sinhala', native: 'සිංහල', flag: '🇱🇰' },
    { code: 'ta', label: 'Tamil', native: 'தமிழ்', flag: '🇱🇰' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1200px' }}>
      
      {/* Page Header */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.3px' }}>
          {t('settings')}
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.2rem' }}>
          Manage your localized interface language, account details, system audit logs, and explore how AI feasibility scoring works.
        </p>
      </div>

      {/* Grid: Language + User Profile */}
      <div className="grid-2" style={{ gap: '1.25rem' }}>
        
        {/* Language Selection Card */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Globe size={18} style={{ color: '#60a5fa' }} />
            {t('language')} (Interface Localization)
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Choose your preferred language for navigation, business workspace prompts, and system guidance.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {languages.map((l) => {
              const isSelected = lang === l.code;
              return (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                    border: `1px solid ${isSelected ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)'}`,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>{l.flag}</span>
                    <div>
                      <div style={{ fontWeight: isSelected ? 700 : 500, color: isSelected ? '#ffffff' : '#cbd5e1', fontSize: '0.85rem' }}>
                        {l.native}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {l.label}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle2 size={18} style={{ color: '#60a5fa' }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* User Profile Details Card */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} style={{ color: '#c084fc' }} />
            {t('profileInfo')}
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Active authenticated operator session and cryptographic identity.
          </p>

          <div style={{ background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', padding: '1rem', border: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: '#94a3b8' }}>Full Name:</span>
              <strong style={{ color: '#ffffff' }}>{user?.full_name || 'SME Business Analyst'}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: '#94a3b8' }}>Email Address:</span>
              <strong style={{ color: '#60a5fa', fontFamily: 'monospace' }}>{user?.email || 'demo@sme360.ai'}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: '#94a3b8' }}>Operator Role:</span>
              <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                {user?.role || 'SME Decision Maker'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: '#94a3b8' }}>System Currency:</span>
              <strong style={{ color: '#fde047' }}>Sri Lankan Rupee (LKR)</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: '#94a3b8' }}>Assigned Region:</span>
              <strong style={{ color: '#cbd5e1' }}>Sri Lanka (All 25 Districts)</strong>
            </div>
          </div>
        </div>

      </div>

      {/* Decision Support Disclaimer Alert Banner */}
      <div 
        className="glass-card" 
        style={{ 
          background: 'rgba(234, 179, 8, 0.08)', 
          border: '1px solid rgba(234, 179, 8, 0.35)', 
          padding: '1.25rem' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
          <ShieldAlert size={22} style={{ color: '#fde047', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fde047' }}>
              {t('disclaimerTitle')}
            </h4>
            <p style={{ fontSize: '0.825rem', color: '#e2e8f0', marginTop: '0.35rem', lineHeight: '1.6' }}>
              {t('disclaimerBody')}
            </p>
          </div>
        </div>
      </div>

      {/* "How Scoring Works" Educational Guide Section */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HelpCircle size={20} style={{ color: '#60a5fa' }} />
            {t('howScoringWorks')} (SME360 AI Methodology)
          </h3>
          <p style={{ fontSize: '0.825rem', color: '#94a3b8', marginTop: '0.25rem', lineHeight: '1.5' }}>
            Our research architecture integrates machine learning, explainable AI, and multi-criteria decision making into a 5-step decision pipeline:
          </p>
        </div>

        <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '10px', padding: '1.1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#60a5fa', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
              <Layers size={16} /> 1. Sri Lankan SME Benchmark Preprocessing
            </div>
            <p style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.5' }}>
              Converts raw natural-language intake and operational inputs (Capital in LKR, unit price, staff, daily throughput) into standardized features benchmarked against Sri Lankan micro-economic data.
            </p>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '10px', padding: '1.1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4ade80', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
              <Cpu size={16} /> 2. Random Forest Multiclass Prediction
            </div>
            <p style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.5' }}>
              Trained ensemble of decision trees computes class probability distribution across 3 outcomes: Feasible, Conditionally Feasible, and Infeasible, outputting model confidence.
            </p>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '10px', padding: '1.1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c084fc', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
              <Sparkles size={16} /> 3. SHAP TreeExplainer Attribution
            </div>
            <p style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.5' }}>
              Calculates game-theoretic Shapley values to pinpoint exact positive drivers strengthening viability and risk hurdles requiring strategic mitigation.
            </p>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '10px', padding: '1.1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fde047', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
              <Sliders size={16} /> 4. TOPSIS Strategy Recommendation
            </div>
            <p style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.5' }}>
              Technique for Order of Preference by Similarity to Ideal Solution ranks viable strategic pathways based on Euclidean distance to optimal financial and operational targets.
            </p>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '10px', padding: '1.1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
              <FileText size={16} /> 5. Tailored Business Plan & Roadmap
            </div>
            <p style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.5' }}>
              Synthesizes operational plans, marketing targets, financial counterfactuals, and a 3-phase time roadmap exportable directly to PDF and DOCX.
            </p>
          </div>

        </div>
      </div>

      {/* Audit Trail & Event History */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <History size={18} style={{ color: '#60a5fa' }} />
              {t('auditTrail')}
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              Regulatory and research event logging of all analysis creation, deletion, and restoration events.
            </p>
          </div>

          <button 
            onClick={loadLogs} 
            className="btn btn-secondary" 
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <RefreshCw size={13} className={loadingLogs ? 'spin' : ''} />
            <span>Refresh Logs</span>
          </button>
        </div>

        {loadingLogs ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
            Loading audit trail records...
          </div>
        ) : auditLogs.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
            No audit events recorded yet. Run a new analysis to populate the audit log.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table" style={{ fontSize: '0.78rem' }}>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>SME Category</th>
                  <th>District</th>
                  <th>Feasibility Result</th>
                  <th>Operator</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => {
                  const getActionColor = (action) => {
                    if (action === 'created') return '#4ade80';
                    if (action === 'deleted') return '#fca5a5';
                    if (action === 'restored') return '#60a5fa';
                    return '#e2e8f0';
                  };

                  return (
                    <tr key={log.id}>
                      <td style={{ color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {formatDate(log.created_at)}
                      </td>
                      <td>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          fontWeight: 700, 
                          textTransform: 'uppercase', 
                          padding: '0.15rem 0.5rem', 
                          borderRadius: '4px',
                          background: `${getActionColor(log.action)}20`,
                          color: getActionColor(log.action),
                          border: `1px solid ${getActionColor(log.action)}40`
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: '#ffffff' }}>
                        {log.business_category || 'N/A'}
                      </td>
                      <td style={{ color: '#cbd5e1' }}>
                        {log.district || 'N/A'}
                      </td>
                      <td>
                        {log.result_label ? (
                          <FeasibilityBadge label={log.result_label} score={log.result_score} showScore={true} size="sm" />
                        ) : (
                          <span style={{ color: '#64748b' }}>-</span>
                        )}
                      </td>
                      <td style={{ color: '#94a3b8', fontFamily: 'monospace' }}>
                        {log.user_email}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
