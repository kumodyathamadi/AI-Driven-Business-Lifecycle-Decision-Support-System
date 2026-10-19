import React from 'react';

/**
 * Universal Card component following the user-friendly design system:
 * - White background (#ffffff)
 * - Thin slate-200 border (#e2e8f0)
 * - Dark slate text (slate-900 heading, slate-700 body)
 * - Accessible contrast & generous padding
 */
export default function Card({
  children,
  title,
  subtitle,
  action,
  footer,
  className = '',
  style = {},
  id,
  role,
  ariaLabel
}) {
  return (
    <div
      id={id}
      role={role}
      aria-label={ariaLabel}
      className={`bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6 text-slate-800 ${className}`}
      style={style}
    >
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between gap-4 pb-4 mb-4 border-b border-slate-100">
          <div>
            {title && (
              <h3 className="text-lg font-bold text-slate-900 leading-snug">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}

      <div className="w-full">
        {children}
      </div>

      {footer && (
        <div className="pt-4 mt-4 border-t border-slate-100">
          {footer}
        </div>
      )}
    </div>
  );
}

export { Card };
