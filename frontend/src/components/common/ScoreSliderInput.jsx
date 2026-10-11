import React from 'react';

/**
 * ScoreSliderInput
 * Synchronized numeric input + range slider with unit suffix (e.g. /100).
 */
export default function ScoreSliderInput({
  id,
  name,
  value,
  onChange,
  onBlur,
  min = 1,
  max = 100,
  suffix = '/100',
  placeholder = '50',
  disabled = false,
}) {
  const currentVal = value === '' || value === null || value === undefined ? '' : Number(value);
  const sliderVal = currentVal === '' ? 50 : currentVal;

  const handleInputChange = (e) => {
    const raw = e.target.value;
    if (raw === '') {
      if (onChange) onChange({ target: { name, value: '', type: 'number' } });
      return;
    }
    const num = parseInt(raw.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(num)) {
      const clamped = Math.min(max, Math.max(min, num));
      if (onChange) onChange({ target: { name, value: clamped, type: 'number' } });
    }
  };

  const handleSliderChange = (e) => {
    const num = parseInt(e.target.value, 10);
    if (onChange) onChange({ target: { name, value: num, type: 'number' } });
    if (onBlur) onBlur(name);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
        <input
          id={id || name}
          name={name}
          type="text"
          inputMode="numeric"
          value={value === '' || value === null || value === undefined ? '' : value}
          onChange={handleInputChange}
          onBlur={onBlur ? () => onBlur(name) : undefined}
          placeholder={placeholder}
          disabled={disabled}
          className="floating-field-input"
          style={{
            flex: 1,
            paddingRight: '3.5rem',
            fontVariantNumeric: 'tabular-nums',
          }}
          autoComplete="off"
        />

        <span
          style={{
            position: 'absolute',
            right: '0.75rem',
            color: '#38bdf8',
            fontSize: '0.76rem',
            fontWeight: 700,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {suffix}
        </span>
      </div>

      {/* Range Slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0 0.2rem' }}>
        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{min}</span>
        <input
          type="range"
          min={min}
          max={max}
          value={sliderVal}
          onChange={handleSliderChange}
          disabled={disabled}
          style={{
            flex: 1,
            accentColor: '#14b8a6',
            cursor: disabled ? 'not-allowed' : 'pointer',
            height: '4px',
          }}
        />
        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{max}</span>
      </div>
    </div>
  );
}
