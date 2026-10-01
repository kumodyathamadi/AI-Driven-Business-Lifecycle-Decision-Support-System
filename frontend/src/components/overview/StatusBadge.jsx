import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { formatConfidence } from '../../utils/formatters';

export default function StatusBadge({ label, score, size = 'md' }) {
  const norm = String(label || '').toLowerCase();

  const isFeasible = norm.includes('feasible') && !norm.includes('infeasible') && !norm.includes('conditionally');
  const isConditional = norm.includes('conditional') || norm.includes('marginal');
  const isInfeasible = norm.includes('infeasible') || (!isFeasible && !isConditional);

  const formattedScore = formatConfidence(score);

  const statusConfig = isFeasible
    ? {
        bg: 'rgba(16, 185, 129, 0.15)',
        color: '#34d399',
        border: 'rgba(16, 185, 129, 0.35)',
        iconColor: '#10b981',
        text: 'FEASIBLE',
        Icon: CheckCircle2
      }
    : isConditional
    ? {
        bg: 'rgba(245, 158, 11, 0.15)',
        color: '#fbbf24',
        border: 'rgba(245, 158, 11, 0.35)',
        iconColor: '#f59e0b',
        text: 'CONDITIONALLY FEASIBLE',
        Icon: AlertTriangle
      }
    : {
        bg: 'rgba(239, 68, 68, 0.15)',
        color: '#f87171',
        border: 'rgba(239, 68, 68, 0.35)',
        iconColor: '#ef4444',
        text: 'INFEASIBLE',
        Icon: XCircle
      };

  const { bg, color, border, iconColor, text, Icon } = statusConfig;
  const isLarge = size === 'lg';

  return (
    <div
      role="status"
      aria-label={`Feasibility outcome: ${text} with ${formattedScore} confidence`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.45rem',
        padding: isLarge ? '0.45rem 0.95rem' : '0.35rem 0.75rem',
        borderRadius: '9999px',
        fontSize: isLarge ? '0.82rem' : '0.74rem',
        fontWeight: 800,
        letterSpacing: '0.04em',
        background: bg,
        color: color,
        border: `1px solid ${border}`,
        boxShadow: `0 0 12px ${border}40`,
        whiteSpace: 'nowrap'
      }}
    >
      <Icon size={isLarge ? 16 : 14} style={{ color: iconColor }} aria-hidden="true" />
      <span>{text}</span>
      <span style={{ opacity: 0.5, fontWeight: 400 }} aria-hidden="true">•</span>
      <span style={{ fontWeight: 700 }}>{formattedScore} CONFIDENCE</span>
    </div>
  );
}
