import React from 'react';

/**
 * SegmentedPills
 * Segmented control for choices with 2 to 4 options (e.g. Market Competition Level).
 * Replaces dropdowns with sleek, modern pills.
 */
export default function SegmentedPills({
  name,
  value,
  options = [],
  onChange,
  onBlur,
  disabled = false,
}) {
  const handleSelect = (optVal) => {
    if (disabled) return;
    if (onChange) {
      onChange({ target: { name, value: optVal } });
    }
    if (onBlur) {
      onBlur(name);
    }
  };

  const handleKeyDown = (e, optVal, index) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleSelect(optVal);
    } else if (e.key === 'ArrowRight' && index < options.length - 1) {
      e.preventDefault();
      handleSelect(options[index + 1].value);
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      handleSelect(options[index - 1].value);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={name}
      className="segmented-pills-track"
      style={{
        gridTemplateColumns: `repeat(${options.length}, 1fr)`,
      }}
    >
      {options.map((opt, idx) => {
        const isSelected = String(value).trim().toLowerCase() === String(opt.value).trim().toLowerCase();
        const dotColor = opt.color || (isSelected ? '#38bdf8' : '#64748b');

        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected || (!value && idx === 0) ? 0 : -1}
            onClick={() => handleSelect(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, opt.value, idx)}
            disabled={disabled}
            className={`segmented-pill-btn ${isSelected ? 'is-selected' : ''}`}
            title={opt.subtitle || opt.label}
          >
            {opt.color && (
              <span
                className="segmented-pill-dot"
                style={{
                  background: dotColor,
                  boxShadow: isSelected ? `0 0 8px ${dotColor}` : 'none',
                }}
              />
            )}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
