import React from 'react';

/**
 * SectionHeader - Standard header for pages and major sections
 * @param {string} title - Section title (sentence case)
 * @param {string} subtitle - Explanatory plain-English helper
 * @param {React.ReactNode} icon - Lucide icon component
 * @param {React.ReactNode} action - Optional action button or badge
 */
export default function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  action,
  className = ''
}) {
  return (
    <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2 ${className}`}>
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 flex-shrink-0 mt-0.5">
            <Icon size={20} />
          </div>
        )}
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="flex-shrink-0 self-start sm:self-auto">{action}</div>}
    </div>
  );
}

export { SectionHeader };
