import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Sparkles } from 'lucide-react';

/**
 * Standard badge for Feasibility prediction results
 * Feasible (green), Conditionally Feasible (yellow/amber), Infeasible (red)
 */
export function FeasibilityBadge({ label, score, showScore = false, size = 'sm' }) {
  const norm = String(label || '').toLowerCase();
  
  let type = 'infeasible';
  let Icon = XCircle;
  let text = 'Infeasible';

  if (norm.includes('feasible') && !norm.includes('infeasible') && !norm.includes('conditionally') && !norm.includes('marginal')) {
    type = 'feasible';
    Icon = CheckCircle2;
    text = 'Feasible';
  } else if (norm.includes('conditionally') || norm.includes('marginal')) {
    type = 'conditionally';
    Icon = AlertTriangle;
    text = 'Marginal / Conditional';
  } else if (norm === 'infeasible') {
    type = 'infeasible';
    Icon = XCircle;
    text = 'Infeasible';
  } else if (!label) {
    return <span className="badge" style={{ background: 'rgba(100, 116, 139, 0.2)', color: '#94a3b8' }}>Not evaluated</span>;
  }

  const isSmall = size === 'sm';
  const iconSize = isSmall ? 14 : 16;
  const padding = isSmall ? '0.2rem 0.55rem' : '0.35rem 0.75rem';
  const fontSize = isSmall ? '0.75rem' : '0.85rem';

  return (
    <span 
      className={`badge-${type}`} 
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '0.35rem',
        padding, 
        fontSize,
        fontWeight: 600,
        borderRadius: '6px'
      }}
    >
      <Icon size={iconSize} />
      <span>{text}</span>
      {showScore && score !== undefined && score !== null && (
        <span style={{ opacity: 0.85, fontWeight: 700, marginLeft: '0.2rem' }}>
          ({Math.round(score * 100)}%)
        </span>
      )}
    </span>
  );
}

/**
 * Standard badge for Business Stage (New Startup vs Existing Business)
 */
export function StageBadge({ stage, label }) {
  const displayLabel = label || (stage === 'new_startup' ? 'New Startup' : stage === 'existing' ? 'Existing Business' : stage || 'Not provided');
  const isStartup = String(stage).toLowerCase().includes('startup') || String(stage).toLowerCase().includes('new');

  return (
    <span 
      style={{ 
        fontSize: '0.75rem', 
        color: isStartup ? '#93c5fd' : '#c084fc', 
        background: isStartup ? 'rgba(59, 130, 246, 0.15)' : 'rgba(168, 85, 247, 0.15)',
        border: `1px solid ${isStartup ? 'rgba(59, 130, 246, 0.3)' : 'rgba(168, 85, 247, 0.3)'}`,
        padding: '0.15rem 0.5rem', 
        borderRadius: '4px',
        fontWeight: 600,
        letterSpacing: '0.3px',
        display: 'inline-block'
      }}
    >
      {displayLabel}
    </span>
  );
}
