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
  PieChart,
  Zap,
  Target,
  Award
} from 'lucide-react';
import { analyzeBusiness } from '../services/api';
import { useToast } from './common/Toast';
import AiIntakeAssistant from './AiIntakeAssistant';

import heroPlatformImg from '../assets/images/hero_ai_platform.jpg';
import cardFeasibilityImg from '../assets/images/card_feasibility.jpg';
import cardFinancialImg from '../assets/images/card_financial.jpg';
import cardBusinessPlanImg from '../assets/images/card_businessplan.jpg';

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
            gap: '2.5rem', 
            position: 'relative', 
            zIndex: 2 
          }}
        >
          {/* Left Content */}
          <div style={{ flex: '1 1 480px', maxWidth: '620px' }}>
            <div 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.45rem', 
                background: 'rgba(59, 130, 246, 0.15)', 
                border: '1px solid rgba(59, 130, 246, 0.35)', 
                padding: '0.35rem 0.9rem', 
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
                fontSize: '2.25rem', 
                fontWeight: 800, 
                color: 'var(--text-primary)', 
                lineHeight: 1.22, 
                letterSpacing: '-0.5px', 
                margin: '0 0 0.85rem 0' 
              }}
            >
              Get your professional Business Plan ready in minutes
            </h1>
            
            <p 
              style={{ 
                color: '#94a3b8', 
                fontSize: '0.96rem', 
                lineHeight: 1.6, 
                margin: '0 0 1.6rem 0' 
              }}
            >
              AI-powered writing, financial forecasts, and feasibility analysis — everything you need to take your plan from idea to investor-ready.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
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

            {/* Trust / Capability Highlights */}
            <div className="hero-trust-bar">
              <div className="hero-trust-item">
                <Zap size={14} style={{ color: '#38bdf8' }} />
                <span><span className="highlight">3-Min</span> Instant Intake</span>
              </div>
              <div className="hero-trust-item">
                <Target size={14} style={{ color: '#34d399' }} />
                <span><span className="highlight">90%+</span> Feasibility Accuracy</span>
              </div>
              <div className="hero-trust-item">
                <Award size={14} style={{ color: '#c084fc' }} />
                <span><span className="highlight">CBSL</span> SME Benchmarked</span>
              </div>
            </div>
          </div>

          {/* Right 3D Visual Showcase Container */}
          <div className="hero-visual-wrapper">
            {/* Ambient Background Glow Aura */}
            <div 
              style={{
                position: 'absolute',
                width: '320px',
                height: '240px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(56, 189, 248, 0.35) 0%, rgba(168, 85, 247, 0.22) 50%, transparent 75%)',
                filter: 'blur(35px)',
                zIndex: 0,
              }}
            />

            {/* 3D Visual Card */}
            <div className="hero-visual-card">
              <img 
                src={heroPlatformImg} 
                alt="SME360 AI Business Intelligence" 
              />
              <div className="hero-visual-overlay" />

              {/* Floating Glass Badge: Top Left */}
              <div className="hero-badge-float hero-badge-top-left">
                <div 
                  style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    background: '#34d399',
                    boxShadow: '0 0 8px #34d399'
                  }} 
                />
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#f8fafc' }}>
                  AI Feasibility Score
                </span>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#34d399', marginLeft: '0.15rem' }}>
                  94.2%
                </span>
              </div>

              {/* Floating Glass Badge: Bottom Right */}
              <div className="hero-badge-float hero-badge-bottom-right">
                <TrendingUp size={14} style={{ color: '#38bdf8' }} />
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Run-Rate:</span>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#38bdf8' }}>
                  LKR 1.2M/mo
                </span>
              </div>
            </div>

            {/* Corner Sparkle Accents */}
            <div 
              style={{
                position: 'absolute',
                top: '-8px',
                left: '-8px',
                zIndex: 4,
                color: '#38bdf8',
                filter: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.8))'
              }}
            >
              <Sparkles size={20} />
            </div>
            <div 
              style={{
                position: 'absolute',
                bottom: '-6px',
                right: '-6px',
                zIndex: 4,
                color: '#c084fc',
                filter: 'drop-shadow(0 0 8px rgba(192, 132, 252, 0.8))'
              }}
            >
              <Sparkles size={16} />
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
              {/* Image Banner Header */}
              <div className="cyber-card-img-wrap">
                <img src={cardFeasibilityImg} alt="Feasibility & Viability Analysis" />
                <div className="cyber-card-img-overlay" />
                <div className="cyber-card-img-badge">
                  <ShieldCheck size={13} style={{ color: '#38bdf8' }} />
                  <span>92% Viable</span>
                </div>
              </div>

              {/* Icon & Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
                <div 
                  style={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '10px', 
                    background: 'rgba(6, 182, 212, 0.15)', 
                    border: '1px solid rgba(6, 182, 212, 0.35)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: '#22d3ee',
                    boxShadow: '0 0 12px rgba(6, 182, 212, 0.25)',
                    flexShrink: 0
                  }}
                >
                  <ShieldCheck size={20} />
                </div>
                <h3 style={{ fontSize: '1.08rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.2px' }}>
                  Feasibility & Viability Analysis
                </h3>
              </div>

              <p style={{ fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.55, margin: 0 }}>
                Evaluate business viability, operational risk, and market demand benchmarked against local industry dynamics.
              </p>

              <div className="cyber-card-tag-group">
                <span className="cyber-tag-pill">Risk Radar</span>
                <span className="cyber-tag-pill">CBSL Benchmarked</span>
                <span className="cyber-tag-pill">Viability Index</span>
              </div>
            </div>

            {/* Bottom Action Link */}
            <div>
              <span className="cyber-learn-more-link">
                <span>Start Feasibility Assessment</span>
                <ArrowRight size={14} />
              </span>
            </div>
          </div>

          {/* Card 2: Financial Forecasts & Insights */}
          <div 
            className="cyber-feature-card"
            onClick={handleStartNewAnalysis}
          >
            <div>
              {/* Image Banner Header */}
              <div className="cyber-card-img-wrap" style={{ borderColor: 'rgba(168, 85, 247, 0.25)' }}>
                <img src={cardFinancialImg} alt="Financial Forecasts & Insights" />
                <div className="cyber-card-img-overlay" />
                <div className="cyber-card-img-badge" style={{ borderColor: 'rgba(168, 85, 247, 0.45)', color: '#c084fc' }}>
                  <TrendingUp size={13} style={{ color: '#c084fc' }} />
                  <span>Cashflow Model</span>
                </div>
              </div>

              {/* Icon & Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
                <div 
                  style={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '10px', 
                    background: 'rgba(168, 85, 247, 0.15)', 
                    border: '1px solid rgba(168, 85, 247, 0.35)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: '#c084fc',
                    boxShadow: '0 0 12px rgba(168, 85, 247, 0.25)',
                    flexShrink: 0
                  }}
                >
                  <Lightbulb size={20} />
                </div>
                <h3 style={{ fontSize: '1.08rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.2px' }}>
                  Financial Forecasts & Insights
                </h3>
              </div>

              <p style={{ fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.55, margin: 0 }}>
                Transparent financial modeling highlighting your key cost drivers, capital needs, and revenue potential.
              </p>

              <div className="cyber-card-tag-group">
                <span className="cyber-tag-pill" style={{ color: '#d8b4fe', borderColor: 'rgba(168, 85, 247, 0.3)', background: 'rgba(168, 85, 247, 0.1)' }}>Cashflow Simulation</span>
                <span className="cyber-tag-pill" style={{ color: '#d8b4fe', borderColor: 'rgba(168, 85, 247, 0.3)', background: 'rgba(168, 85, 247, 0.1)' }}>Break-Even Run-Rate</span>
                <span className="cyber-tag-pill" style={{ color: '#d8b4fe', borderColor: 'rgba(168, 85, 247, 0.3)', background: 'rgba(168, 85, 247, 0.1)' }}>Capex & Opex</span>
              </div>
            </div>

            {/* Bottom Action Link */}
            <div>
              <span className="cyber-learn-more-link" style={{ color: '#c084fc' }}>
                <span>Explore Financial Projections</span>
                <ArrowRight size={14} />
              </span>
            </div>
          </div>

          {/* Card 3: Investor-Ready Business Plan */}
          <div 
            className="cyber-feature-card"
            onClick={handleStartNewAnalysis}
          >
            <div>
              {/* Image Banner Header */}
              <div className="cyber-card-img-wrap" style={{ borderColor: 'rgba(45, 212, 191, 0.25)' }}>
                <img src={cardBusinessPlanImg} alt="Investor-Ready Business Plan" />
                <div className="cyber-card-img-overlay" />
                <div className="cyber-card-img-badge" style={{ borderColor: 'rgba(45, 212, 191, 0.45)', color: '#2dd4bf' }}>
                  <FileText size={13} style={{ color: '#2dd4bf' }} />
                  <span>Executive Dossier</span>
                </div>
              </div>

              {/* Icon & Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
                <div 
                  style={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '10px', 
                    background: 'rgba(45, 212, 191, 0.15)', 
                    border: '1px solid rgba(45, 212, 191, 0.35)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: '#2dd4bf',
                    boxShadow: '0 0 12px rgba(45, 212, 191, 0.25)',
                    flexShrink: 0
                  }}
                >
                  <FileText size={20} />
                </div>
                <h3 style={{ fontSize: '1.08rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.2px' }}>
                  Investor-Ready Business Plan
                </h3>
              </div>

              <p style={{ fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.55, margin: 0 }}>
                Complete structured plan with executive summary, market analysis, operations roadmap, and strategic recommendations.
              </p>

              <div className="cyber-card-tag-group">
                <span className="cyber-tag-pill" style={{ color: '#5eead4', borderColor: 'rgba(45, 212, 191, 0.3)', background: 'rgba(45, 212, 191, 0.1)' }}>Executive Summary</span>
                <span className="cyber-tag-pill" style={{ color: '#5eead4', borderColor: 'rgba(45, 212, 191, 0.3)', background: 'rgba(45, 212, 191, 0.1)' }}>Growth Strategy</span>
                <span className="cyber-tag-pill" style={{ color: '#5eead4', borderColor: 'rgba(45, 212, 191, 0.3)', background: 'rgba(45, 212, 191, 0.1)' }}>Bank & Investor PDF</span>
              </div>
            </div>

            {/* Bottom Action Link */}
            <div>
              <span className="cyber-learn-more-link" style={{ color: '#2dd4bf' }}>
                <span>Generate Business Plan</span>
                <ArrowRight size={14} />
              </span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
