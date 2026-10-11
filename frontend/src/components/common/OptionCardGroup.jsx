import React from 'react';
import { Sparkles, AlertCircle, Info, Check } from 'lucide-react';

/**
 * OptionCardGroup
 * Replaces dense dropdowns with touch-friendly, keyboard-accessible selectable cards.
 */
export default function OptionCardGroup({
  label,
  name,
  isRequired = false,
  helperText,
  value,
  options = [],
  onChange,
  onBlur,
  error,
  isAi = false,
  matchFn = null,
  columns = 4, // 2 or 4
}) {
  const isSelected = (optVal) => {
    if (matchFn) return matchFn(optVal, value);
    if (!value) return false;
    return String(optVal).trim().toLowerCase() === String(value).trim().toLowerCase();
  };

  const handleSelect = (optVal) => {
    if (onChange) {
      onChange({ target: { name, value: optVal } });
    }
    if (onBlur) {
      onBlur(name);
    }
  };

  const handleKeyDown = (e, optVal) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleSelect(optVal);
    }
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: columns === 2 
      ? 'repeat(auto-fit, minmax(200px, 1fr))' 
      : 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '0.65rem',
  };

  return (
    <div className="floating-field-wrapper" style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
        <label 
          className={`floating-field-label ${error ? 'has-error' : ''}`} 
          id={`${name}-label`}
          style={{ fontSize: '0.78rem', fontWeight: 700, ...(error ? { color: '#f87171' } : {}) }}
        >
          {label}
          {isRequired && <span className="req-asterisk" title="Required field">*</span>}
        </label>

        {isAi && (
          <span className="floating-field-ai-badge" title="Populated automatically by AI">
            <Sparkles size={10} />
            <span>AI-filled</span>
          </span>
        )}
      </div>

      <div 
        role="radiogroup" 
        aria-labelledby={`${name}-label`}
        style={gridStyle}
      >
        {options.map((opt) => {
          const selected = isSelected(opt.value);
          const Icon = opt.icon;

          return (
            <div
              key={opt.value}
              role="radio"
              aria-checked={selected}
              tabIndex={0}
              onClick={() => handleSelect(opt.value)}
              onKeyDown={(e) => handleKeyDown(e, opt.value)}
              id={`${name}-option-${opt.value.replace(/[^a-zA-Z0-9]/g, '-')}`}
              className={`option-card-group-item ${selected ? 'is-selected' : ''} ${error ? 'has-error' : ''}`}
            >
              {/* Top Row: Icon + Selection Indicator */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                <div className={`option-card-icon-wrap ${selected ? 'is-selected' : ''}`}>
                  {Icon && <Icon size={16} />}
                </div>

                <div className={`option-card-check-ring ${selected ? 'is-selected' : ''}`}>
                  {selected && <Check size={11} strokeWidth={3} />}
                </div>
              </div>

              {/* Bottom: Label & Subtitle */}
              <div>
                <div className={`option-card-label ${selected ? 'is-selected' : ''}`}>
                  {opt.label}
                </div>
                {opt.subtitle && (
                  <div className={`option-card-subtitle ${selected ? 'is-selected' : ''}`}>
                    {opt.subtitle}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {helperText && !error && (
        <div className="floating-field-helper-hint" style={{ marginTop: '0.4rem', marginBottom: 0 }}>
          <Info size={11} style={{ flexShrink: 0 }} />
          <span>{helperText}</span>
        </div>
      )}

      {error && (
        <div className="floating-field-error-text" style={{ marginTop: '0.4rem', marginBottom: 0 }}>
          <AlertCircle size={12} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
