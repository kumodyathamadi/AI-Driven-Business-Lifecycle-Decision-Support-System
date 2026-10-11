import React, { useEffect, useRef } from 'react';
import { AlertCircle, Save, Trash2, ArrowLeft } from 'lucide-react';

/**
 * ConfirmDiscardDialog
 * Accessible confirmation dialog shown when user attempts to close a dirty form.
 * Offers 3 actions:
 * 1. "Keep editing" (default focus)
 * 2. "Save draft & close"
 * 3. "Discard"
 */
export default function ConfirmDiscardDialog({
  isOpen,
  onKeepEditing,
  onSaveAndClose,
  onDiscard,
}) {
  const keepEditingBtnRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Default focus to "Keep editing"
    const timer = setTimeout(() => {
      if (keepEditingBtnRef.current) {
        keepEditingBtnRef.current.focus();
      }
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onKeepEditing();
        return;
      }

      // Focus trap within dialog
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onKeepEditing]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop-overlay"
      style={{
        zIndex: 10000,
        backgroundColor: 'rgba(5, 8, 15, 0.82)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="discard-dialog-title"
      aria-describedby="discard-dialog-desc"
      onClick={(e) => {
        // Prevent accidental closing by clicking outside the confirm dialog
        e.stopPropagation();
      }}
    >
      <div
        ref={dialogRef}
        className="confirm-discard-card"
        style={{
          maxWidth: '480px',
          width: '100%',
          padding: '1.75rem',
          borderRadius: '16px',
          position: 'relative',
          animation: 'modalSlideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <div
            className="confirm-discard-icon-box"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertCircle size={22} />
          </div>

          <div style={{ flex: 1 }}>
            <h3
              id="discard-dialog-title"
              className="confirm-discard-title"
              style={{
                fontSize: '1.15rem',
                fontWeight: 800,
                marginBottom: '0.4rem',
                letterSpacing: '-0.2px',
              }}
            >
              Leave this intake?
            </h3>
            <p
              id="discard-dialog-desc"
              className="confirm-discard-desc"
              style={{
                fontSize: '0.86rem',
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              You have unsaved changes in your feasibility intake. What would you like to do before leaving?
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            marginTop: '1.6rem',
          }}
        >
          {/* Action 1: Keep editing (default focus, primary) */}
          <button
            ref={keepEditingBtnRef}
            type="button"
            onClick={onKeepEditing}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
            }}
          >
            <ArrowLeft size={16} />
            <span>Keep editing</span>
          </button>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.65rem',
            }}
          >
            {/* Action 2: Save draft & close */}
            <button
              type="button"
              onClick={onSaveAndClose}
              className="btn btn-secondary"
              style={{
                padding: '0.65rem 0.85rem',
                fontSize: '0.84rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                background: 'rgba(20, 184, 166, 0.12)',
                color: '#2dd4bf',
                border: '1px solid rgba(20, 184, 166, 0.35)',
              }}
              title="Save entered fields to resume later"
            >
              <Save size={14} />
              <span>Save draft & close</span>
            </button>

            {/* Action 3: Discard changes (red outline) */}
            <button
              type="button"
              onClick={onDiscard}
              className="btn btn-secondary"
              style={{
                padding: '0.65rem 0.85rem',
                fontSize: '0.84rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                background: 'rgba(239, 68, 68, 0.08)',
                color: '#ef4444',
                border: '1px solid #ef4444',
              }}
              title="Discard all entered fields and reset form"
            >
              <Trash2 size={14} />
              <span>Discard changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
