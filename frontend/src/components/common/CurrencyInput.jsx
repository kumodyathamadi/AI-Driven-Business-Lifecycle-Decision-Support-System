import React, { useState, useEffect } from 'react';

/**
 * Format a number or numeric string with thousand commas.
 * e.g. 1000000 -> "1,000,000"
 */
function formatWithCommas(val) {
  if (val === null || val === undefined || val === '') return '';
  const cleaned = String(val).replace(/,/g, '').trim();
  if (!cleaned || isNaN(Number(cleaned))) return cleaned;
  const parts = cleaned.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

/**
 * Strip commas to return a clean numeric value.
 */
function parseRawNumber(str) {
  if (str === null || str === undefined || str === '') return '';
  const cleaned = String(str).replace(/,/g, '').trim();
  if (cleaned === '') return '';
  const num = parseFloat(cleaned);
  return isNaN(num) ? '' : num;
}

/**
 * CurrencyInput
 * Specialized Sri Lankan Rupee (LKR) input field with:
 * - "LKR" prefix badge
 * - Thousands separator formatting while typing
 * - inputMode="numeric"
 * - No spinner arrows
 * - Emits clean raw numbers to parent onChange exactly as expected
 */
export default function CurrencyInput({
  id,
  name,
  value,
  onChange,
  onBlur,
  placeholder = 'e.g. 1,000,000',
  disabled = false,
  autoFocus = false,
  className = '',
  style = {},
}) {
  const [displayValue, setDisplayValue] = useState(() => formatWithCommas(value));

  // Sync display value when incoming raw prop value changes externally
  useEffect(() => {
    setDisplayValue(formatWithCommas(value));
  }, [value]);

  const handleInputChange = (e) => {
    const rawInput = e.target.value;

    // Filter out everything except digits and a single optional decimal point
    const sanitized = rawInput.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimals
    const parts = sanitized.split('.');
    const cleanNumberString = parts.length > 2 
      ? `${parts[0]}.${parts.slice(1).join('')}` 
      : sanitized;

    const formatted = formatWithCommas(cleanNumberString);
    setDisplayValue(formatted);

    const rawNum = parseRawNumber(cleanNumberString);

    if (onChange) {
      onChange({
        target: {
          name,
          value: rawNum,
          type: 'number',
        },
      });
    }
  };

  const handleBlur = (e) => {
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
        position: 'relative'
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.2rem 0.55rem',
          marginRight: '0.5rem',
          borderRadius: '6px',
          background: 'rgba(56, 189, 248, 0.12)',
          border: '1px solid rgba(56, 189, 248, 0.28)',
          color: '#38bdf8',
          fontSize: '0.74rem',
          fontWeight: 800,
          letterSpacing: '0.5px',
          userSelect: 'none',
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        LKR
      </div>

      <input
        id={id || name}
        name={name}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={`floating-field-input ${className}`}
        style={{
          flex: 1,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.2px',
          ...style,
        }}
        autoComplete="off"
      />
    </div>
  );
}
