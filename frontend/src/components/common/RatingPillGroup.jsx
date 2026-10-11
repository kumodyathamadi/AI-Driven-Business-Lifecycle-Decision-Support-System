import React from 'react';

/**
 * RatingPillGroup
 * 1 to 5 compact rating segmented bar with descriptive labels.
 * Replaces dense dropdowns for rating scores with an intuitive, 1-click selector.
 */
export default function RatingPillGroup({
  name,
  value,
  onChange,
  onBlur,
  descriptors = {},
  disabled = false,
}) {
  const currentVal = value !== '' && value !== null && value !== undefined ? Number(value) : null;

  const handleSelect = (rating) => {
    if (disabled) return;
    if (onChange) {
      onChange({ target: { name, value: rating, type: 'number' } });
    }
    if (onBlur) {
      onBlur(name);
    }
  };

  const handleKeyDown = (e, rating) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleSelect(rating);
    } else if (e.key === 'ArrowRight' && rating < 5) {
      e.preventDefault();
      handleSelect(rating + 1);
    } else if (e.key === 'ArrowLeft' && rating > 1) {
      e.preventDefault();
      handleSelect(rating - 1);
    }
  };

  const activeDescriptor = currentVal && descriptors[currentVal] ? descriptors[currentVal] : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%' }}>
      <div
        role="radiogroup"
        aria-label={name}
        className="rating-pill-track"
      >
        {[1, 2, 3, 4, 5].map((num) => {
          const isSelected = currentVal === num;
          return (
            <button
              key={num}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected || (!currentVal && num === 1) ? 0 : -1}
              onClick={() => handleSelect(num)}
              onKeyDown={(e) => handleKeyDown(e, num)}
              disabled={disabled}
              className={`rating-pill-btn ${isSelected ? 'is-selected' : ''}`}
              title={descriptors[num] ? `${num} - ${descriptors[num]}` : String(num)}
            >
              {num}
            </button>
          );
        })}
      </div>

      {activeDescriptor && (
        <div className="rating-pill-descriptor">
          <span className="rating-pill-level-prefix">Level {currentVal}:</span>
          <span>{activeDescriptor}</span>
        </div>
      )}
    </div>
  );
}
