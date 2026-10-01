import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Sparkles, Lightbulb } from 'lucide-react';
import StrategyCard from './StrategyCard';
import { EmptyState } from './common/EmptyState';

export default function RecommendationsView({ profile: propProfile }) {
  const ctx = useOutletContext();
  const profile = propProfile || ctx?.profile;

  if (!profile) return null;

  const strategies = profile.strategic_recommendations?.candidate_strategies || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={22} style={{ color: '#c084fc' }} />
          Strategic Recommendations & Actions
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem' }}>
          Contextual strategic directions generated to improve business feasibility, profitability, and operational scale.
        </p>
      </div>

      {strategies.length === 0 ? (
        <EmptyState 
          icon={Lightbulb}
          title="No Specific Recommendations Available"
          description="The AI recommendation engine did not find specific strategy candidates for this profile configuration."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {strategies.map((strat, idx) => (
            <StrategyCard key={idx} strategy={strat} rank={idx + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
