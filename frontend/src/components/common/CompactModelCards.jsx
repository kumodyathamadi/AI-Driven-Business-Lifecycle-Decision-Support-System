import React from 'react';
import { Store, Truck, Building2, Award } from 'lucide-react';

const MODEL_OPTIONS_LIST = [
  {
    value: 'Direct Retail / Service',
    label: 'Direct Retail',
    subtitle: 'Storefront walk-in',
    icon: Store,
  },
  {
    value: 'Hybrid Retail + Delivery',
    label: 'Hybrid Delivery',
    subtitle: 'Store + delivery',
    icon: Truck,
  },
  {
    value: 'Wholesale & B2B Supply',
    label: 'Wholesale B2B',
    subtitle: 'Bulk orders',
    icon: Building2,
  },
  {
    value: 'Specialized Boutique Service',
    label: 'Boutique',
    subtitle: 'Curated high-touch',
    icon: Award,
  },
];

/**
 * CompactModelCards
 * 2x2 grid of selectable cards for Business Model designed to fit cleanly inside a 1-column slot in a 3-column row.
 * Strictly adheres to Section C ("Choice with 2 to 4 options: selectable cards or a segmented control. Never a dropdown.")
 */
export default function CompactModelCards({
  name = 'business_model',
  value,
  onChange,
  onBlur,
  disabled = false,
}) {
  const isSelected = (optVal) => {
    if (!value) return false;
    return String(optVal).trim().toLowerCase() === String(value).trim().toLowerCase();
  };

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
    } else if (e.key === 'ArrowRight' && index < MODEL_OPTIONS_LIST.length - 1) {
      e.preventDefault();
      handleSelect(MODEL_OPTIONS_LIST[index + 1].value);
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      handleSelect(MODEL_OPTIONS_LIST[index - 1].value);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Business Model"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '0.35rem',
        width: '100%',
      }}
    >
      {MODEL_OPTIONS_LIST.map((opt, idx) => {
        const selected = isSelected(opt.value);
        const Icon = opt.icon;

        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected || (!value && idx === 0) ? 0 : -1}
            onClick={() => handleSelect(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, opt.value, idx)}
            disabled={disabled}
            className={`compact-model-card-btn ${selected ? 'is-selected' : ''}`}
            title={`${opt.label}: ${opt.subtitle}`}
          >
            <div className={`compact-model-card-icon ${selected ? 'is-selected' : ''}`}>
              <Icon size={13} />
            </div>

            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div className={`compact-model-card-title ${selected ? 'is-selected' : ''}`}>
                {opt.label}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
