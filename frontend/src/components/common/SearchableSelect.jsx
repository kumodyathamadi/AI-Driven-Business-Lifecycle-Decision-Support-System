import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, X, Sparkles, AlertCircle, Info, MapPin } from 'lucide-react';

/**
 * SearchableSelect
 * Smooth, rock-solid combobox with live text search and zero layout shifting or jitter.
 */
export default function SearchableSelect({
  label,
  name,
  isRequired = false,
  helperText,
  value,
  options = [],
  placeholder = 'Select district...',
  onChange,
  onBlur,
  error,
  isAi = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Normalize options to [{ value, label }]
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'string') return { value: opt, label: opt };
    return opt;
  });

  const filteredOptions = normalizedOptions.filter((opt) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    const l = opt.label.toLowerCase();
    if (l.includes(term)) return true;
    if ((term.includes('kalut') || term.includes('kaluth')) && (l.includes('kalut') || l.includes('kaluth'))) {
      return true;
    }
    return false;
  });

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        if (isOpen) {
          setIsOpen(false);
          setSearchTerm('');
          if (onBlur) onBlur(name);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, name, onBlur]);

  // Keep highlighted index within bounds
  useEffect(() => {
    if (highlightedIndex >= filteredOptions.length) {
      setHighlightedIndex(Math.max(0, filteredOptions.length - 1));
    }
  }, [filteredOptions.length, highlightedIndex]);

  // Scroll ONLY the internal list when using keyboard navigation (never the window or modal)
  const scrollItemIntoView = (index) => {
    if (!listRef.current) return;
    const listEl = listRef.current;
    const itemEl = listEl.children[index];
    if (!itemEl) return;

    const listTop = listEl.scrollTop;
    const listBottom = listTop + listEl.clientHeight;
    const itemTop = itemEl.offsetTop;
    const itemBottom = itemTop + itemEl.offsetHeight;

    if (itemTop < listTop) {
      listEl.scrollTop = itemTop;
    } else if (itemBottom > listBottom) {
      listEl.scrollTop = itemBottom - listEl.clientHeight;
    }
  };

  const handleSelectOption = (optVal) => {
    if (onChange) {
      onChange({ target: { name, value: optVal } });
    }
    setIsOpen(false);
    setSearchTerm('');
    if (onBlur) onBlur(name);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onChange) {
      onChange({ target: { name, value: '' } });
    }
    setSearchTerm('');
    if (inputRef.current) {
      inputRef.current.focus({ preventScroll: true });
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = highlightedIndex + 1 < filteredOptions.length ? highlightedIndex + 1 : 0;
      setHighlightedIndex(nextIdx);
      scrollItemIntoView(nextIdx);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx = highlightedIndex - 1 >= 0 ? highlightedIndex - 1 : filteredOptions.length - 1;
      setHighlightedIndex(prevIdx);
      scrollItemIntoView(prevIdx);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        handleSelectOption(filteredOptions[highlightedIndex].value);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const selectedOption = normalizedOptions.find((opt) => {
    if (opt.value === value) return true;
    const v = String(value || '').trim().toLowerCase();
    const ov = String(opt.value || '').trim().toLowerCase();
    if (v === ov) return true;
    if ((v === 'kalutara' || v === 'kaluthara') && (ov === 'kalutara' || ov === 'kaluthara')) {
      return true;
    }
    return false;
  });

  return (
    <div className="floating-field-wrapper" ref={containerRef} style={{ position: 'relative' }}>
      <div 
        className={`floating-field-container ${isOpen ? 'is-open' : ''} ${error ? 'has-error' : ''}`}
        style={{
          cursor: 'pointer',
        }}
        onClick={() => {
          if (!isOpen) {
            setIsOpen(true);
            if (inputRef.current) {
              inputRef.current.focus({ preventScroll: true });
            }
          } else {
            setIsOpen(false);
          }
        }}
      >
        <div className="floating-field-top-row">
          <label className="floating-field-label" htmlFor={name}>
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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flex: 1, minWidth: 0 }}>
            <MapPin size={14} className="searchable-select-pin" style={{ flexShrink: 0 }} />
            
            <input
              ref={inputRef}
              id={name}
              type="text"
              value={isOpen ? searchTerm : (selectedOption ? selectedOption.label : '')}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setHighlightedIndex(0);
                if (!isOpen) setIsOpen(true);
              }}
              onFocus={() => {
                if (!isOpen) setIsOpen(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder={selectedOption ? selectedOption.label : placeholder}
              className="floating-field-input"
              style={{
                cursor: 'pointer',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                width: '100%',
                padding: 0,
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!isOpen) setIsOpen(true);
              }}
              autoComplete="off"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
            {value && (
              <button
                type="button"
                onClick={handleClear}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Clear selection"
              >
                <X size={14} />
              </button>
            )}
            <ChevronDown
              size={16}
              style={{
                color: '#94a3b8',
                transition: 'transform 0.18s ease',
                transform: isOpen ? 'rotate(180deg)' : 'none',
              }}
            />
          </div>
        </div>
      </div>

      {/* Floating Dropdown List */}
      {isOpen && (
        <div
          className="searchable-select-menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 1000,
            borderRadius: '12px',
            overflow: 'hidden',
            maxHeight: '180px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            ref={listRef}
            style={{
              overflowY: 'auto',
              flex: 1,
              padding: '0.35rem',
              scrollbarWidth: 'thin',
            }}
          >
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '0.75rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                No matching districts found
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isItemActive = opt.value === value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={opt.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectOption(opt.value);
                    }}
                    onMouseEnter={() => {
                      if (highlightedIndex !== idx) {
                        setHighlightedIndex(idx);
                      }
                    }}
                    className={`searchable-select-item ${isItemActive ? 'is-active' : ''} ${isHighlighted ? 'is-highlighted' : ''}`}
                    style={{
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.86rem',
                      transition: 'background 0.08s ease',
                    }}
                  >
                    <span>{opt.label}</span>
                    {isItemActive && <Check size={14} className="text-sky-400" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {helperText && !error && (
        <div className="floating-field-helper-hint">
          <Info size={11} style={{ flexShrink: 0 }} />
          <span>{helperText}</span>
        </div>
      )}

      {error && (
        <div className="floating-field-error-text">
          <AlertCircle size={12} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
