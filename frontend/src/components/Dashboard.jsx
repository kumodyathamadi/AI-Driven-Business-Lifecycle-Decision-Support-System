import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Sparkles, 
  PlusCircle, 
  X, 
  ShieldCheck, 
  Lightbulb, 
  FileText, 
  ArrowRight,
  TrendingUp,
  Layers,
  Building2
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
    // Smooth scroll to analysis area if needed
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '1100px', margin: '0 auto' }}>
      
      {/* Welcome Hero Area */}
      <div 
        className="glass-card" 
        style={{ 
          background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.45), rgba(15, 23, 42, 0.85))', 
          border: '1px solid rgba(59, 130, 246, 0.35)',
          padding: '2.25rem 2rem',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: '640px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', background: 'rgba(59, 130, 246, 0.18)', border: '1px solid rgba(59, 130, 246, 0.35)', padding: '0.3rem 0.85rem', borderRadius: '20px', fontSize: '0.78rem', color: '#60a5fa', fontWeight: 700, marginBottom: '0.75rem' }}>
              <Sparkles size={14} /> Free AI Business Plan Generator
            </div>
            
            <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.25, letterSpacing: '-0.4px', margin: '0 0 0.5rem 0' }}>
              Get your professional Business Plan ready in minutes
            </h1>
            
            <p style={{ color: '#94a3b8', fontSize: '0.92rem', lineHeight: 1.5, margin: 0 }}>
              AI-powered writing, financial forecasts, and feasibility analysis — everything you need to take your plan from idea to investor-ready.
            </p>
          </div>

          <div>
            {!showAnalysisFlow ? (
              <button 
                id="start-new-analysis-btn"
                onClick={handleStartNewAnalysis}
                className="btn btn-primary"
                style={{ 
                  padding: '0.95rem 1.85rem', 
                  fontSize: '0.95rem', 
                  fontWeight: 700,
                  boxShadow: '0 6px 20px rgba(59, 130, 246, 0.45)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  borderRadius: '10px'
                }}
              >
                <PlusCircle size={20} />
                <span>Create Business Plan</span>
              </button>
            ) : (
              <button 
                onClick={handleCloseFlow}
                className="btn btn-secondary"
                style={{ 
                  padding: '0.75rem 1.25rem', 
                  fontSize: '0.85rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  borderRadius: '10px'
                }}
              >
                <X size={16} />
                <span>Close Plan Generator</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Inline Analysis Workspace Panel */}
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
        /* Professional Feature Capabilities Highlights */
        <div 
          className="grid-3" 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '1.25rem' 
          }}
        >
          {/* Feature 1 */}
          <div 
            className="glass-card" 
            style={{ 
              padding: '1.6rem', 
              borderRadius: '14px', 
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
              <ShieldCheck size={22} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              Feasibility & Viability Analysis
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
              Evaluate business viability, operational risk, and market demand benchmarked against local industry dynamics.
            </p>
          </div>

          {/* Feature 2 */}
          <div 
            className="glass-card" 
            style={{ 
              padding: '1.6rem', 
              borderRadius: '14px', 
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(168, 85, 247, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc' }}>
              <Lightbulb size={22} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              Financial Forecasts & Insights
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
              Transparent financial modeling highlighting your key cost drivers, capital needs, and revenue potential.
            </p>
          </div>

          {/* Feature 3 */}
          <div 
            className="glass-card" 
            style={{ 
              padding: '1.6rem', 
              borderRadius: '14px', 
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(45, 212, 191, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(45, 212, 191, 0.15)', border: '1px solid rgba(45, 212, 191, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2dd4bf' }}>
              <FileText size={22} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              Investor-Ready Business Plan
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
              Complete structured plan with executive summary, market analysis, operations roadmap, and strategic recommendations.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
