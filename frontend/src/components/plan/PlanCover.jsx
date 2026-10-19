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

export default function PlanCover({
  profile,
  executiveOverview = {},
  downloadingPdf,
  downloadingDocx,
  copiedLink,
  coverImage,
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
  const isNewStartup = stage.toLowerCase().includes('new') || stage.toLowerCase().includes('start');
  const planTypeTitle = isNewStartup ? 'Strategic Business Plan' : 'Personalized Business Growth Plan';
  const district = businessInput.district || 'Sri Lanka';
  const address = businessInput.address ? `${businessInput.address}, ` : '';
  const isAdopted = executiveOverview.is_user_selected;
  const activeStrategy = executiveOverview.recommended_primary_strategy || 'Low-Cost, Low-Risk Start';
  const confidence = feasibility.confidence_score || feasibility.probability_score || 0.6;
  const label = feasibility.predicted_label || 'Conditionally Feasible';

  return (
    <div className="bp-hero">
      <div className="bp-hero-top">
        <div className="bp-hero-title-area">
          {/* Status Badges */}
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

            {coverImage && (
              <span className="bp-badge-pill adopted" style={{ background: 'rgba(56, 189, 248, 0.15)', borderColor: 'rgba(56, 189, 248, 0.35)', color: '#38bdf8' }}>
                <Sparkles size={13} />
                <span>Page 1 Cover Attached</span>
              </span>
            )}

            <FeasibilityBadge label={label} size="small" />

            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', marginLeft: '0.25rem' }}>
              Confidence: <strong className="bp-hero-strong">{formatConfidence(confidence)}</strong>
            </span>
          </div>

          {/* Plan Name & Subtitle */}
          <h1 className="bp-hero-title">
            {businessName}
          </h1>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#3b82f6', marginTop: '0.15rem' }}>
            {planTypeTitle}
          </div>

          {isAdopted && (
            <p className="bp-hero-subtitle">
              Personalized strategic roadmap tailored specifically to your chosen operational strategy: {activeStrategy}. Resource setup, marketing targets, and financial runway reflect this execution path.
            </p>
          )}

          {/* Meta Line */}
          <div className="bp-hero-meta-strip">
            <div className="bp-hero-meta-item">
              <Building2 size={14} style={{ color: '#3b82f6' }} />
              <span>Category: <strong>{category}</strong></span>
            </div>
            <div className="bp-hero-meta-item">
              <Layers size={14} style={{ color: '#6366f1' }} />
              <span>Stage: <strong>{stage}</strong></span>
            </div>
            <div className="bp-hero-meta-item">
              <MapPin size={14} style={{ color: '#10b981' }} />
              <span>Location: <strong>{address}{district}</strong></span>
            </div>
            <div className="bp-hero-meta-item">
              <Compass size={14} style={{ color: isAdopted ? '#10b981' : '#8b5cf6' }} />
              <span>Strategy: <strong>{activeStrategy}</strong></span>
            </div>
          </div>
        </div>

        {/* 4 Primary Action Controls */}
        <div className="bp-hero-actions">
          <button 
            type="button"
            onClick={onDownloadPdf}
            disabled={downloadingPdf}
            className="btn btn-primary"
            style={{ 
              padding: '0.7rem 1.25rem', 
              fontSize: '0.85rem', 
              fontWeight: 700, 
              background: '#2563eb', 
              color: '#ffffff', 
              border: 'none', 
              borderRadius: '8px', 
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              cursor: downloadingPdf ? 'not-allowed' : 'pointer'
            }}
            title="Download formal colorful PDF Business Plan report"
          >
            {downloadingPdf ? (
              <>
                <Loader2 size={16} className="spin" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>Download PDF</span>
              </>
            )}
          </button>

          <button 
            type="button"
            onClick={onDownloadDocx}
            disabled={downloadingDocx}
            className="btn btn-secondary"
            style={{ 
              padding: '0.7rem 1.15rem', 
              fontSize: '0.85rem', 
              fontWeight: 600,
              background: 'var(--bg-card-solid, #ffffff)',
              color: 'var(--text-primary, #0f172a)',
              border: '1px solid var(--border-color, #cbd5e1)',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              cursor: downloadingDocx ? 'not-allowed' : 'pointer'
            }}
            title="Export editable Word (.docx) Business Plan"
          >
            {downloadingDocx ? (
              <>
                <Loader2 size={16} className="spin" />
                <span>Exporting Word...</span>
              </>
            ) : (
              <>
                <FileText size={16} style={{ color: '#3b82f6' }} />
                <span>Download Word</span>
              </>
            )}
          </button>

          <button 
            type="button"
            onClick={onShareLink}
            className="btn btn-secondary"
            style={{ 
              padding: '0.7rem 0.95rem', 
              fontSize: '0.85rem',
              fontWeight: 600,
              background: 'var(--bg-card-solid, #ffffff)',
              color: 'var(--text-primary, #0f172a)',
              border: '1px solid var(--border-color, #cbd5e1)',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer'
            }}
            title="Copy shareable link to clipboard"
          >
            {copiedLink ? <Check size={16} style={{ color: '#10b981' }} /> : <Share2 size={16} />}
            <span>{copiedLink ? 'Copied' : 'Share'}</span>
          </button>

          <button 
            type="button"
            onClick={onPrint}
            className="btn btn-secondary"
            style={{ 
              padding: '0.7rem 0.95rem', 
              fontSize: '0.85rem',
              fontWeight: 600,
              background: 'var(--bg-card-solid, #ffffff)',
              color: 'var(--text-primary, #0f172a)',
              border: '1px solid var(--border-color, #cbd5e1)',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer'
            }}
            title="Print or Save as PDF"
          >
            <Printer size={16} />
            <span>Print</span>
          </button>
        </div>
      </div>
    </div>
  );
}
