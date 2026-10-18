import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { TrendingUp, AlertOctagon, HelpCircle } from 'lucide-react';
import { resolveDriverValue } from '../utils/formatters';

export default function ShapExplanation({ shapData: propData }) {
  const ctx = useOutletContext();
  const shapData = propData || ctx?.profile?.explainability;

  if (!shapData) return null;

  const { positive_drivers = [], negative_drivers = [] } = shapData;

  // Helper to convert feature technical identifiers into clean human business labels
  const formatFeatureLabel = (featureStr) => {
    if (!featureStr) return 'Business Factor';
    return featureStr
      .replace(/_/g, ' ')
      .replace(/\blkr\b/i, '(LKR)')
      .replace(/\bper day\b/i, '/ Day')
      .replace(/\bcount\b/i, 'Count')
      .replace(/\bscore\b/i, 'Index')
      .replace(/\b(\w)/g, (c) => c.toUpperCase());
  };

  const businessName = ctx?.profile?.business_name || ctx?.profile?.business_input?.business_name || ctx?.businessName;
  const businessInput = ctx?.profile?.business_input || ctx?.profile?.input_profile || {};

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <HelpCircle size={22} style={{ color: '#60a5fa' }} />
          Key Insights — What Is Influencing {businessName ? `${businessName}'s` : 'Your'} Business Feasibility?
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem', lineHeight: '1.5' }}>
          Our AI model analyzes {businessName ? `${businessName}'s` : 'your'} operational, financial, and market inputs to identify the primary drivers strengthening feasibility as well as key risk hurdles requiring strategic attention.
        </p>
      </div>

      <div className="grid-2">
        
        {/* Supporting Factors */}
        <div style={{ background: 'rgba(6, 78, 59, 0.2)', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '1.25rem', borderRadius: '12px' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(34, 197, 94, 0.3)' }}>
            <TrendingUp size={18} />
            Top Supporting Business Factors (+)
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {positive_drivers.map((driver, idx) => (
              <div key={idx} className="shap-driver-item positive" style={{ padding: '0.85rem', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', fontWeight: 600 }}>
                  <span style={{ color: 'var(--text-primary)' }}>{formatFeatureLabel(driver.feature)}</span>
                  <span style={{ color: '#4ade80', fontWeight: 700, background: 'rgba(34, 197, 94, 0.15)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                    Strong Positive Impact
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                  Recorded Value: <strong style={{ color: 'var(--text-primary)' }}>{resolveDriverValue(driver, businessInput)}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Areas Needing Mitigation */}
        <div style={{ background: 'rgba(127, 29, 29, 0.2)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '1.25rem', borderRadius: '12px' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <AlertOctagon size={18} />
            Areas Needing Mitigation (-)
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {negative_drivers.map((driver, idx) => (
              <div key={idx} className="shap-driver-item negative" style={{ padding: '0.85rem', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', fontWeight: 600 }}>
                  <span style={{ color: 'var(--text-primary)' }}>{formatFeatureLabel(driver.feature)}</span>
                  <span style={{ color: '#fca5a5', fontWeight: 700, background: 'rgba(239, 68, 68, 0.15)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                    Risk Hurdle
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                  Recorded Value: <strong style={{ color: 'var(--text-primary)' }}>{resolveDriverValue(driver, businessInput)}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
