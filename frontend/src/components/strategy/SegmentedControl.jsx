import React from 'react';

/**
 * SegmentedControl - Accessible 2-state view switch
 * Options: "Explore one by one" vs "Compare all"
 * Seamlessly follows Dark and Light modes.
 */
export default function SegmentedControl({ value, onChange, options }) {
  return (
    <div 
      role="tablist" 
      aria-label="Strategy display mode"
      className="strategy-segmented-switcher"
    >
      {options.map((opt) => {
        const isSelected = value === opt.id;
        const Icon = opt.icon;

        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-pressed={isSelected}
            onClick={() => onChange(opt.id)}
            className={`strategy-segmented-btn ${isSelected ? 'active' : ''}`}
          >
            {Icon && <Icon size={16} />}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
