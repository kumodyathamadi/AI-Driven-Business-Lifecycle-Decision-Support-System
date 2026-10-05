import React from 'react';
import { 
  Sparkles, 
  Check, 
  Download, 
  FileText, 
  Share2, 
  Printer, 
  Loader2, 
  Building2, 
  MapPin, 
  Layers, 
  Compass 
} from 'lucide-react';
import { FeasibilityBadge } from '../common/Badge';
import { formatConfidence } from '../../utils/formatters';

export default function PlanHeader({
  profile,
  executiveOverview = {},
  downloadingPdf,
  downloadingDocx,
  copiedLink,
  onDownloadPdf,
  onDownloadDocx,
  onShareLink,
  onPrint
}) {
  const businessInput = profile?.business_input || {};
  const feasibility = profile?.feasibility_analysis || {};
  const businessName = businessInput.business_name || 'Your Business';
  const category = businessInput.business_category || 'SME Business';
  const stage = businessInput.business_stage || 'Startup';
  const district = businessInput.district || 'Sri Lanka';
  const address = businessInput.address ? `${businessInput.address}, ` : '';
  const isAdopted = executiveOverview.is_user_selected;
  const activeStrategy = executiveOverview.recommended_primary_strategy || 'Lean Bootstrapped Launch';
  const confidence = feasibility.confidence_score || feasibility.probability_score || 0.6;
  const label = feasibility.predicted_label || 'Conditionally Feasible';

  return (
    <div className="bp-hero">
      <div className="bp-hero-top">
        <div className="bp-hero-title-area">
          <div className="bp-hero-badges">
            <span className="bp-badge-pill official">
              <Sparkles size={13} />
              <span>Official AI Decision Plan</span>
            </span>

            {isAdopted ? (
              <span className="bp-badge-pill adopted">
                <Check size={13} />
                <span>Adopted Strategy</span>
              </span>
            ) : (
              <span className="bp-badge-pill stage">
                <Compass size={13} />
                <span>AI Recommended</span>
              </span>
            )}

            <FeasibilityBadge label={label} size="small" />

            <span style={{ fontSize: '0.74rem', color: '#94a3b8', marginLeft: '0.25rem' }}>
              Confidence: <strong style={{ color: '#ffffff' }}>{formatConfidence(confidence)}</strong>
            </span>
          </div>

          <h1 className="bp-hero-title">
            {businessName}
          </h1>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#38bdf8', marginTop: '0.15rem' }}>
            Strategic Business Plan
          </div>

          <p className="bp-hero-subtitle">
            {isAdopted 
              ? `Personalized strategic roadmap tailored specifically to your chosen operational strategy: ${activeStrategy}. Resource setup, marketing targets, and financial runway reflect this execution path.`
              : `Comprehensive AI-generated business plan synthesized from your operational inputs, machine learning feasibility drivers, and multi-criteria TOPSIS strategic evaluations.`}
          </p>

          <div className="bp-hero-meta-strip">
            <div className="bp-hero-meta-item">
              <Building2 size={14} style={{ color: '#60a5fa' }} />
              <span>Category: <strong>{category}</strong></span>
            </div>
            <div className="bp-hero-meta-item">
              <Layers size={14} style={{ color: '#818cf8' }} />
              <span>Stage: <strong>{stage}</strong></span>
            </div>
            <div className="bp-hero-meta-item">
              <MapPin size={14} style={{ color: '#34d399' }} />
              <span>Location: <strong>{address}{district}</strong></span>
            </div>
            <div className="bp-hero-meta-item">
              <Compass size={14} style={{ color: isAdopted ? '#34d399' : '#c084fc' }} />
              <span>Strategy: <strong>{activeStrategy}</strong></span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="bp-hero-actions">
          <button 
            onClick={onDownloadPdf}
            disabled={downloadingPdf}
            className="btn btn-primary"
            style={{ padding: '0.65rem 1.15rem', fontSize: '0.825rem', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)' }}
            title="Download formal colorful PDF Business Plan report"
          >
            {downloadingPdf ? (
              <>
                <Loader2 size={15} className="spin" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <Download size={15} />
                <span>Download PDF</span>
              </>
            )}
          </button>

          <button 
            onClick={onDownloadDocx}
            disabled={downloadingDocx}
            className="btn btn-secondary"
            style={{ padding: '0.65rem 1.15rem', fontSize: '0.825rem', background: 'rgba(30, 41, 59, 0.85)' }}
            title="Export editable Word (.docx) Business Plan"
          >
            {downloadingDocx ? (
              <>
                <Loader2 size={15} className="spin" />
                <span>Exporting Word...</span>
              </>
            ) : (
              <>
                <FileText size={15} style={{ color: '#60a5fa' }} />
                <span>Download Word</span>
              </>
            )}
          </button>

          <button 
            onClick={onShareLink}
            className="btn btn-secondary"
            style={{ padding: '0.65rem 0.85rem', fontSize: '0.825rem' }}
            title="Copy shareable link to clipboard"
          >
            {copiedLink ? <Check size={15} style={{ color: '#4ade80' }} /> : <Share2 size={15} />}
            <span>{copiedLink ? 'Copied' : 'Share'}</span>
          </button>

          <button 
            onClick={onPrint}
            className="btn btn-secondary"
            style={{ padding: '0.65rem 0.85rem', fontSize: '0.825rem' }}
            title="Print or Save as PDF"
          >
            <Printer size={15} />
            <span>Print</span>
          </button>
        </div>
      </div>
    </div>
  );
}
