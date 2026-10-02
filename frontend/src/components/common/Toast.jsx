import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ message, type = 'info', duration = 4000, action }) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 5);
    setToasts((prev) => [...prev, { id, message, type, action }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div 
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 99999,
          maxWidth: '380px'
        }}
      >
        {toasts.map((toast) => {
          let bg = 'rgba(15, 23, 42, 0.95)';
          let border = 'rgba(59, 130, 246, 0.4)';
          let Icon = Info;
          let iconColor = '#60a5fa';

          if (toast.type === 'success') {
            border = 'rgba(34, 197, 94, 0.5)';
            Icon = CheckCircle2;
            iconColor = '#4ade80';
          } else if (toast.type === 'error') {
            border = 'rgba(239, 68, 68, 0.5)';
            Icon = AlertCircle;
            iconColor = '#f87171';
          }

          return (
            <div 
              key={toast.id}
              className="glass-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '0.75rem 1rem',
                border: `1px solid ${border}`,
                background: bg,
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                fontSize: '0.85rem',
                color: '#ffffff'
              }}
            >
              <Icon size={18} style={{ color: iconColor, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>{toast.message}</div>
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action.onClick();
                    removeToast(toast.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#60a5fa',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    textDecoration: 'underline'
                  }}
                >
                  {toast.action.label}
                </button>
              )}
              <button 
                onClick={() => removeToast(toast.id)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      addToast: () => {},
      removeToast: () => {},
      showToast: () => {},
      success: () => {},
      error: () => {},
      info: () => {}
    };
  }
  const showToast = (message, type = 'info', duration, action) => {
    return context.addToast({ message, type, duration, action });
  };
  return {
    ...context,
    showToast,
    success: (msg, duration, action) => showToast(msg, 'success', duration, action),
    error: (msg, duration, action) => showToast(msg, 'error', duration, action),
    info: (msg, duration, action) => showToast(msg, 'info', duration, action),
  };
}
