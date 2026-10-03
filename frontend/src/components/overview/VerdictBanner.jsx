import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Shield,
  Info,
  Sparkles
} from 'lucide-react';
import { formatConfidence, cleanDoublePunctuation } from '../../utils/formatters';

export default function VerdictBanner({
  businessName = '',
  predictedLabel = 'Conditionally Feasible',
  confidenceScore = 0.63,
  categoryName = 'SME Business',
  districtName = 'Colombo',
  marginTerm = 'product gross margin',
  detailedSummary = '',
  onOpenChecklist,
  fullAssessedDate = 'Today'
}) {
  const [showInfoPopover, setShowInfoPopover] = useState(false);

  const norm = String(predictedLabel || '').toLowerCase();
  const isFeasible = norm.includes('feasible') && !norm.includes('infeasible') && !norm.includes('conditionally');
  const isConditional = norm.includes('conditional') || norm.includes('marginal');

  const rawConf = (Number(confidenceScore) <= 1 ? Number(confidenceScore) * 100 : Number(confidenceScore)) || 63;
  const confPercent = Math.round(rawConf);
  const confDisplay = formatConfidence(confidenceScore);

  // Circular gauge SVG calculations
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (rawConf / 100) * circumference;

  const statusColor = isFeasible ? '#10b981' : isConditional ? '#f59e0b' : '#ef4444';
  const statusBg = isFeasible
    ? 'rgba(16, 185, 129, 0.12)'
    : isConditional
    ? 'rgba(245, 158, 11, 0.12)'
    : 'rgba(239, 68, 68, 0.12)';
  const statusBorder = isFeasible
    ? 'rgba(16, 185, 129, 0.35)'
    : isConditional
    ? 'rgba(245, 158, 11, 0.35)'
    : 'rgba(239, 68, 68, 0.35)';

  const StatusIcon = isFeasible ? CheckCircle2 : isConditional ? AlertTriangle : XCircle;

  const displayBizName = businessName ? businessName.trim() : '';

  const summaryText = detailedSummary
    ? cleanDoublePunctuation(detailedSummary)
    : isConditional
    ? `While projected daily customer volume meets operational break-even, working capital runway and fixed commitments during months 1–4 require disciplined cost conservation.`
    : isFeasible
    ? `Strong commercial fundamentals, favorable local demographics, and resilient ${marginTerm}s support sustainable operating viability.`
    : `Substantial capital structure or cost-model restructuring is recommended prior to signing commercial lease agreements.`;

  return (
    <section className="verdict-banner-root" role="region" aria-label="Executive Viability Verdict">
      <div className="verdict-banner-inner">
        {/* Left: Confidence Ring Gauge with status icon */}
        <div
          className="verdict-gauge-wrapper"
          title={`${confPercent}% Confidence (${predictedLabel})`}
          aria-hidden="true"
        >
          <svg width="58" height="58" viewBox="0 0 58 58" className="verdict-gauge-svg">
            <circle
              cx="29"
              cy="29"
              r={radius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="4"
            />
            <circle
              cx="29"
              cy="29"
              r={radius}
              fill="none"
              stroke={statusColor}
              strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 29 29)"
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div className="verdict-gauge-content">
            <span
              className="verdict-gauge-percent"
              style={{
                color: statusColor,
                fontSize: confDisplay.length > 3 ? '0.72rem' : '0.82rem'
              }}
            >
              {confDisplay}
            </span>
          </div>
        </div>

        {/* Center: Single Headline & Progressive Disclosure Info Tooltip */}
        <div className="verdict-headline-container">
          <div className="verdict-eyebrow-row">
            <span
              className="verdict-eyebrow-badge"
              style={{ background: statusBg, color: statusColor, border: `1px solid ${statusBorder}` }}
            >
              <StatusIcon size={12} aria-hidden="true" />
              <span>{predictedLabel.toUpperCase()}</span>
            </span>
            <span className="verdict-eyebrow-meta">
              CBSL Guidelines v2025 • Assessed {fullAssessedDate}
            </span>
          </div>

          <h2 className="verdict-single-headline">
            {displayBizName ? (
              <>
                <strong style={{ color: '#ffffff', fontWeight: 800 }}>{displayBizName}</strong> in {districtName} is{' '}
              </>
            ) : (
              <>Your {categoryName} in {districtName} is{' '}</>
            )}
            <span style={{ color: statusColor, fontWeight: 800 }}>
              {predictedLabel}
            </span>
            .
            {/* Popover trigger */}
            <span className="verdict-info-trigger-wrap">
              <button
                type="button"
                className="verdict-info-btn"
                onClick={() => setShowInfoPopover(!showInfoPopover)}
                onMouseEnter={() => setShowInfoPopover(true)}
                onMouseLeave={() => setShowInfoPopover(false)}
                aria-label="View detailed viability analysis explanation"
                aria-expanded={showInfoPopover}
              >
                <Info size={15} />
              </button>

              {showInfoPopover && (
                <div
                  className="verdict-popover-box"
                  role="tooltip"
                  onMouseEnter={() => setShowInfoPopover(true)}
                  onMouseLeave={() => setShowInfoPopover(false)}
                >
                  <div className="verdict-popover-header">
                    <Sparkles size={13} style={{ color: '#818cf8' }} aria-hidden="true" />
                    <strong>Viability Assessment Context</strong>
                  </div>
                  <p className="verdict-popover-text">
                    {summaryText}
                  </p>
                  <div className="verdict-popover-footer">
                    Evaluated against Western Province CBSL SME retail & commercial benchmarks
                  </div>
                </div>
              )}
            </span>
          </h2>
        </div>

        {/* Right: Quick Action (Prudential Checklist) */}
        <div className="verdict-action-area">
          <button
            type="button"
            onClick={onOpenChecklist}
            className="btn-verdict-checklist"
            aria-label="Open CBSL Prudential Checklist"
          >
            <Shield size={14} style={{ color: '#818cf8' }} aria-hidden="true" />
            <span>Checklist</span>
          </button>
        </div>
      </div>
    </section>
  );
}
