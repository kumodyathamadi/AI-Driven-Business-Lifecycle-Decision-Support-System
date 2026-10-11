import React from 'react';
import { Plus, Minus } from 'lucide-react';

/**
 * NumberStepperInput
 * Quantitative input with:
 * - Unit suffix displayed inside field (e.g. "patrons / day", "years", "staff")
 * - +/- stepper buttons for smooth adjustments
 * - Direct keyboard entry (with numeric inputMode)
 * - Raw numeric output to parent onChange
 */
export default function NumberStepperInput({
  id,
  name,
  value,
  onChange,
  onBlur,
  unit = '',
  min = 0,
  max = 999999,
  step = 1,
  placeholder = '0',
  disabled = false,
  className = '',
}) {
  const currentNum = value === '' || value === null || value === undefined ? '' : Number(value);

  const handleTextChange = (e) => {
    const raw = e.target.value;
    if (raw === '') {
      if (onChange) {
        onChange({ target: { name, value: '', type: 'number' } });
      }
      return;
    }
    const num = parseInt(raw.replace(/[^0-9-]/g, ''), 10);
    if (!isNaN(num)) {
      if (onChange) {
        onChange({ target: { name, value: num, type: 'number' } });
      }
    }
  };

  const handleStep = (direction) => {
    if (disabled) return;
    const current = currentNum === '' ? (min > 0 ? min : 0) : currentNum;
    let next = direction === 'up' ? current + step : current - step;
    if (min !== undefined && next < min) next = min;
    if (max !== undefined && next > max) next = max;

    if (onChange) {
      onChange({ target: { name, value: next, type: 'number' } });
    }
    if (onBlur) {
      onBlur(name);
    }
  };

  const handleBlur = () => {
    if (onBlur) {
      onBlur(name);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        gap: '0.4rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flex: 1,
          position: 'relative',
        }}
      >
        <input
          id={id || name}
          name={name}
          type="text"
          inputMode="numeric"
          value={value === '' || value === null || value === undefined ? '' : value}
          onChange={handleTextChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`floating-field-input ${className}`}
          style={{
            flex: 1,
            paddingRight: unit ? '5rem' : '0.5rem',
            fontVariantNumeric: 'tabular-nums',
          }}
          autoComplete="off"
        />

        {unit && (
          <span
            className="stepper-unit-badge"
            style={{
              position: 'absolute',
              right: '0.75rem',
              fontSize: '0.76rem',
              fontWeight: 600,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {unit}
          </span>
        )}
      </div>

      {/* Stepper Buttons */}
      <div
        className="stepper-controls-wrapper"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          borderRadius: '8px',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => handleStep('down')}
          disabled={disabled || (currentNum !== '' && currentNum <= min)}
          className="stepper-control-btn"
          title="Decrease"
          aria-label={`Decrease ${name}`}
        >
          <Minus size={13} />
        </button>

        <div className="stepper-divider" />

        <button
          type="button"
          onClick={() => handleStep('up')}
          disabled={disabled || (currentNum !== '' && currentNum >= max)}
          className="stepper-control-btn"
          title="Increase"
          aria-label={`Increase ${name}`}
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}
