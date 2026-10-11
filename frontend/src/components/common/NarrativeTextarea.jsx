import React from 'react';
import { Lightbulb } from 'lucide-react';

/**
 * NarrativeTextarea
 * Enhanced textarea for narrative & strategy inputs:
 * - Resizable textarea
 * - Live character counter
 * - 2-3 clickable example tags for inspiration / fast entry
 */
export default function NarrativeTextarea({
  id,
  name,
  value = '',
  onChange,
  onBlur,
  rows = 3,
  placeholder = '',
  examples = [],
  disabled = false,
  className = '',
}) {
  const charCount = value ? String(value).length : 0;

  const handleInsertExample = (exampleText) => {
    if (disabled) return;
    const nextVal = value ? `${value} ${exampleText}` : exampleText;
    if (onChange) {
      onChange({ target: { name, value: nextVal } });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', width: '100%' }}>
      <textarea
        id={id || name}
        name={name}
        value={value || ''}
        onChange={onChange}
        onBlur={onBlur ? () => onBlur(name) : undefined}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        className={`floating-field-textarea ${className}`}
        style={{
          resize: 'vertical',
          minHeight: '76px',
          fontFamily: 'inherit',
          lineHeight: 1.5,
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        {/* Clickable Example Prompts / Suggestions */}
        {examples && examples.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
              <Lightbulb size={11} className="text-amber-400" />
              <span>Ideas:</span>
            </span>
            {examples.map((ex, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleInsertExample(ex)}
                className="narrative-example-tag"
                title="Click to insert example"
              >
                + {ex}
              </button>
            ))}
          </div>
        ) : <div />}

        {/* Character Counter */}
        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500, marginLeft: 'auto' }}>
          {charCount} {charCount === 1 ? 'character' : 'characters'}
        </span>
      </div>
    </div>
  );
}
