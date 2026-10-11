import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Sparkles, 
  Plus, 
  X, 
  ShieldCheck, 
  Lightbulb, 
  FileText, 
  ArrowRight,
  TrendingUp,
  Layers,
  BarChart3,
  CheckCircle2,
  PieChart
} from 'lucide-react';
import { analyzeBusiness } from '../services/api';
import { useToast } from './common/Toast';
import AiIntakeAssistant from './AiIntakeAssistant';

export default function Dashboard({ activeProfile, onAnalysisComplete }) {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [showAnalysisFlow, setShowAnalysisFlow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Automatically open analysis flow if navigated with ?action=new
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'new') {
      setShowAnalysisFlow(true);
    }
  }, [location.search]);

  const handleStartNewAnalysis = () => {
    setShowAnalysisFlow(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseFlow = () => {
    setShowAnalysisFlow(false);
  };

  const handleAnalysisSubmit = async (formData) => {
    setSubmitting(true);
    try {
      const profileResult = await analyzeBusiness(formData);
      const recordId = profileResult?.metadata?.record_id;

      if (onAnalysisComplete) {
        onAnalysisComplete(profileResult);
      }

      toast.success('Business feasibility analysis completed successfully!');

      if (recordId) {
        navigate(`/businesses/${recordId}/feasibility`);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      const msg = typeof err === 'string' ? err : (err?.message || 'Unknown error occurred');
      toast.error(`Analysis failed: ${msg}`);
      alert(`Error running AI Business Analysis: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1160px', margin: '0 auto', width: '100%' }}>
      
      {/* HERO SECTION / ACTION CARD */}
      <div className="dashboard-hero-cyber">
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: '2rem', 
            position: 'relative', 
            zIndex: 2 
          }}
        >
          {/* Left Content */}
          <div style={{ maxWidth: '620px' }}>
            <div 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.45rem', 
                background: 'rgba(59, 130, 246, 0.15)', 
                border: '1px solid rgba(59, 130, 246, 0.35)', 
                padding: '0.3rem 0.85rem', 
                borderRadius: '24px', 
                fontSize: '0.78rem', 
                color: '#60a5fa', 
                fontWeight: 700, 
                marginBottom: '1rem',
                boxShadow: '0 0 16px rgba(59, 130, 246, 0.2)'
              }}
            >
              <Sparkles size={14} style={{ color: '#38bdf8' }} /> 
              <span>Free AI Business Plan Generator</span>
            </div>
            
            <h1 
              style={{ 
                fontSize: '2.15rem', 
                fontWeight: 800, 
                color: '#ffffff', 
                lineHeight: 1.22, 
                letterSpacing: '-0.5px', 
                margin: '0 0 0.75rem 0' 
              }}
            >
              Get your professional Business Plan ready in minutes
            </h1>
            
            <p 
              style={{ 
                color: '#94a3b8', 
                fontSize: '0.94rem', 
                lineHeight: 1.6, 
                margin: '0 0 1.5rem 0' 
              }}
            >
              AI-powered writing, financial forecasts, and feasibility analysis — everything you need to take your plan from idea to investor-ready.
            </p>

            <div>
              {!showAnalysisFlow ? (
                <button 
                  id="start-new-analysis-btn"
                  onClick={handleStartNewAnalysis}
                  className="btn-cyber-primary"
                >
                  <Plus size={18} strokeWidth={2.5} />
                  <span>Create Business Plan</span>
                </button>
              ) : (
                <button 
                  onClick={handleCloseFlow}
                  className="btn btn-secondary"
                  style={{ 
                    padding: '0.8rem 1.4rem', 
                    fontSize: '0.88rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    borderRadius: '10px',
                    background: 'rgba(30, 41, 59, 0.75)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#cbd5e1'
                  }}
                >
                  <X size={16} />
                  <span>Close Plan Generator</span>
                </button>
              )}
            </div>
          </div>

          {/* Right 3D Layered Glassmorphic Illustration */}
          <div 
            style={{ 
              position: 'relative', 
              width: '280px', 
              height: '190px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}
          >
            {/* Ambient Background Aura */}
            <div 
              style={{
                position: 'absolute',
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(56, 189, 248, 0.28) 0%, rgba(168, 85, 247, 0.2) 50%, transparent 75%)',
                filter: 'blur(28px)',
                zIndex: 0,
              }}
            />

            {/* Back Card (Faded Document) */}
            <div 
              style={{
                position: 'absolute',
                width: '160px',
                height: '130px',
                right: '15px',
                top: '10px',
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(168, 85, 247, 0.35)',
                borderRadius: '14px',
                transform: 'rotate(8deg)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                padding: '0.85rem',
                zIndex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem'
              }}
            >
              <div style={{ width: '40px', height: '6px', borderRadius: '3px', background: 'rgba(168, 85, 247, 0.5)' }} />
              <div style={{ width: '90px', height: '4px', borderRadius: '2px', background: 'rgba(255, 255, 255, 0.12)' }} />
              <div style={{ width: '70px', height: '4px', borderRadius: '2px', background: 'rgba(255, 255, 255, 0.08)' }} />
              <div style={{ marginTop: 'auto', display: 'flex', gap: '3px', alignItems: 'flex-end', height: '35px' }}>
                <div style={{ width: '12px', height: '14px', borderRadius: '2px', background: 'rgba(168, 85, 247, 0.4)' }} />
                <div style={{ width: '12px', height: '22px', borderRadius: '2px', background: 'rgba(168, 85, 247, 0.6)' }} />
                <div style={{ width: '12px', height: '32px', borderRadius: '2px', background: 'rgba(168, 85, 247, 0.85)' }} />
              </div>
            </div>

            {/* Front Card (Active Financial Chart Card) */}
            <div 
              style={{
                position: 'absolute',
                width: '180px',
                height: '140px',
                left: '20px',
                bottom: '10px',
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
                border: '1px solid rgba(56, 189, 248, 0.45)',
                borderRadius: '16px',
                transform: 'rotate(-4deg)',
                backdropFilter: 'blur(14px)',
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(56, 189, 248, 0.25)',
                padding: '0.95rem',
                zIndex: 2,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f8fafc' }}>AI Projections</span>
                </div>
                <span style={{ fontSize: '0.68rem', color: '#4ade80', fontWeight: 700 }}>+94.2%</span>
              </div>

              {/* Upward Curved Graph SVG */}
              <svg width="100%" height="45" viewBox="0 0 150 45" fill="none">
                <defs>
                  <linearGradient id="cyberGraphGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d="M0,38 Q40,32 75,20 T150,6 L150,45 L0,45 Z" fill="url(#cyberGraphGrad)" />
                <path d="M0,38 Q40,32 75,20 T150,6" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="150" cy="6" r="3.5" fill="#38bdf8" />
              </svg>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.65rem', color: '#94a3b8' }}>
                <span>Feasible</span>
                <span style={{ color: '#38bdf8', fontWeight: 600 }}>LKR 1.2M Mo.</span>
              </div>
            </div>

            {/* Floating Sparkle Accents */}
            <div 
              style={{
                position: 'absolute',
                top: '0px',
                left: '25px',
                zIndex: 3,
                animation: 'pulse 2s infinite',
                color: '#38bdf8',
                filter: 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.8))'
              }}
            >
              <Sparkles size={18} />
            </div>

            <div 
              style={{
                position: 'absolute',
                bottom: '15px',
                right: '5px',
                zIndex: 3,
                color: '#c084fc',
                filter: 'drop-shadow(0 0 6px rgba(192, 132, 252, 0.8))'
              }}
            >
              <Sparkles size={14} />
            </div>
          </div>
        </div>
      </div>

      {/* Inline Analysis Workspace Panel OR 3-Column Service Cards */}
      {showAnalysisFlow ? (
        <div 
          id="analysis-flow-container"
          style={{ 
            animation: 'fadeIn 0.25s ease-in-out',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}
        >
          <AiIntakeAssistant
            onCompleteIntake={handleAnalysisSubmit}
            loading={submitting}
          />
        </div>
      ) : (
        /* FEATURE / SERVICE CARDS - 3-COLUMNS GRID */
        <div className="cyber-cards-grid">
          
          {/* Card 1: Feasibility & Viability Analysis */}
          <div 
            className="cyber-feature-card"
            onClick={handleStartNewAnalysis}
          >
            <div>
              {/* Glowing Icon Header */}
              <div 
                style={{ 
                  width: '46px', 
                  height: '46px', 
                  borderRadius: '12px', 
                  background: 'rgba(6, 182, 212, 0.15)', 
                  border: '1px solid rgba(6, 182, 212, 0.35)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: '#22d3ee',
                  boxShadow: '0 0 16px rgba(6, 182, 212, 0.25)',
                  marginBottom: '1rem'
                }}
              >
                <ShieldCheck size={24} />
              </div>

              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', margin: '0 0 0.5rem 0', letterSpacing: '-0.2px' }}>
                Feasibility & Viability Analysis
              </h3>

              <p style={{ fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.55, margin: 0 }}>
                Evaluate business viability, operational risk, and market demand benchmarked against local industry dynamics.
              </p>
            </div>

            {/* Bottom Action Link */}
            <div>
              <span className="cyber-learn-more-link">
                <span>Learn more</span>
                <ArrowRight size={14} />
              </span>
            </div>

            {/* Radar / Matrix Curves Background SVG */}
            <svg className="cyber-card-backdrop-svg" viewBox="0 0 100 100" fill="none">
              <circle cx="80" cy="80" r="30" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="3 3" />
              <circle cx="80" cy="80" r="50" stroke="#06b6d4" strokeWidth="1.2" />
              <circle cx="80" cy="80" r="70" stroke="#06b6d4" strokeWidth="0.8" />
              <line x1="10" y1="80" x2="80" y2="80" stroke="#06b6d4" strokeWidth="1" />
              <line x1="80" y1="10" x2="80" y2="80" stroke="#06b6d4" strokeWidth="1" />
            </svg>
          </div>

          {/* Card 2: Financial Forecasts & Insights */}
          <div 
            className="cyber-feature-card"
            onClick={handleStartNewAnalysis}
          >
            <div>
              {/* Glowing Icon Header */}
              <div 
                style={{ 
                  width: '46px', 
                  height: '46px', 
                  borderRadius: '12px', 
                  background: 'rgba(168, 85, 247, 0.15)', 
                  border: '1px solid rgba(168, 85, 247, 0.35)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: '#c084fc',
                  boxShadow: '0 0 16px rgba(168, 85, 247, 0.25)',
                  marginBottom: '1rem'
                }}
              >
                <Lightbulb size={24} />
              </div>

              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', margin: '0 0 0.5rem 0', letterSpacing: '-0.2px' }}>
                Financial Forecasts & Insights
              </h3>

              <p style={{ fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.55, margin: 0 }}>
                Transparent financial modeling highlighting your key cost drivers, capital needs, and revenue potential.
              </p>
            </div>

            {/* Bottom Action Link */}
            <div>
              <span className="cyber-learn-more-link" style={{ color: '#c084fc' }}>
                <span>Learn more</span>
                <ArrowRight size={14} />
              </span>
            </div>

            {/* Grid Lines & Slanted Bar Charts SVG */}
            <svg className="cyber-card-backdrop-svg" viewBox="0 0 100 100" fill="none">
              <line x1="0" y1="80" x2="100" y2="80" stroke="#a855f7" strokeWidth="1" />
              <rect x="25" y="55" width="12" height="25" rx="2" fill="#a855f7" fillOpacity="0.4" />
              <rect x="45" y="40" width="12" height="40" rx="2" fill="#a855f7" fillOpacity="0.6" />
              <rect x="65" y="20" width="12" height="60" rx="2" fill="#a855f7" fillOpacity="0.8" />
              <path d="M25,50 L51,35 L71,15" stroke="#c084fc" strokeWidth="1.5" strokeDasharray="2 2" />
            </svg>
          </div>

          {/* Card 3: Investor-Ready Business Plan */}
          <div 
            className="cyber-feature-card"
            onClick={handleStartNewAnalysis}
          >
            <div>
              {/* Glowing Icon Header */}
              <div 
                style={{ 
                  width: '46px', 
                  height: '46px', 
                  borderRadius: '12px', 
                  background: 'rgba(45, 212, 191, 0.15)', 
                  border: '1px solid rgba(45, 212, 191, 0.35)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: '#2dd4bf',
                  boxShadow: '0 0 16px rgba(45, 212, 191, 0.25)',
                  marginBottom: '1rem'
                }}
              >
                <FileText size={24} />
              </div>

              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', margin: '0 0 0.5rem 0', letterSpacing: '-0.2px' }}>
                Investor-Ready Business Plan
              </h3>

              <p style={{ fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.55, margin: 0 }}>
                Complete structured plan with executive summary, market analysis, operations roadmap, and strategic recommendations.
              </p>
            </div>

            {/* Bottom Action Link */}
            <div>
              <span className="cyber-learn-more-link" style={{ color: '#2dd4bf' }}>
                <span>Learn more</span>
                <ArrowRight size={14} />
              </span>
            </div>

            {/* Faded Document & Ascending Charts SVG */}
            <svg className="cyber-card-backdrop-svg" viewBox="0 0 100 100" fill="none">
              <rect x="25" y="20" width="45" height="60" rx="4" stroke="#2dd4bf" strokeWidth="1.2" />
              <line x1="33" y1="35" x2="55" y2="35" stroke="#2dd4bf" strokeWidth="1" />
              <line x1="33" y1="45" x2="62" y2="45" stroke="#2dd4bf" strokeWidth="1" />
              <line x1="33" y1="55" x2="50" y2="55" stroke="#2dd4bf" strokeWidth="1" />
              <circle cx="58" cy="65" r="7" stroke="#2dd4bf" strokeWidth="1" />
              <polyline points="55,65 57,67 62,62" stroke="#2dd4bf" strokeWidth="1" fill="none" />
            </svg>
          </div>

        </div>
      )}

    </div>
  );
}
