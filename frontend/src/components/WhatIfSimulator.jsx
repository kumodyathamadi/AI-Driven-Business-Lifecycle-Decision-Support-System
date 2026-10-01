import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { 
  Sliders, 
  RefreshCw, 
  ArrowRight, 
  ShieldAlert, 
  Sparkles, 
  RotateCcw, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  CheckCircle2,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { analyzeBusiness } from '../services/api';
import { FeasibilityBadge } from './common/Badge';
import { formatCurrency, formatCustomersPerDay } from '../utils/formatters';

export default function WhatIfSimulator({ scenarioData: propScenario, currentInput: propInput, onScenarioSuccess }) {
  const ctx = useOutletContext();
  const [searchParams] = useSearchParams();
  const profile = ctx?.profile;
  const scenarioData = propScenario || profile?.scenario_analysis;
  const currentInput = propInput || profile?.business_input;
  const baselineFeasibility = profile?.feasibility_analysis || {};

  const baselineCapital = currentInput?.available_capital_lkr || 500000;
  const baselineBudget = currentInput?.monthly_budget_lkr || 150000;
  const baselineCustomers = currentInput?.expected_customers_per_day || 40;
  const baselinePrice = currentInput?.expected_price_lkr || 350;
  const baselineScore = baselineFeasibility.confidence_score || baselineFeasibility.probability_score || 0.5;
  const baselineLabel = baselineFeasibility.predicted_label || 'Conditionally Feasible';

  const paramCapital = searchParams.get('capital');
  const parsedCapital = paramCapital ? parseFloat(paramCapital) : null;
  const initialCapital = parsedCapital && !isNaN(parsedCapital) ? parsedCapital : baselineCapital;

  // Interactive Scenario State
  const [customCapital, setCustomCapital] = useState(initialCapital);
  const [customBudget, setCustomBudget] = useState(baselineBudget);
  const [customCustomers, setCustomCustomers] = useState(baselineCustomers);
  const [customPrice, setCustomPrice] = useState(baselinePrice);
  
  const [liveScoring, setLiveScoring] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [activeCustomResult, setActiveCustomResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const debounceTimer = useRef(null);

  const runScenarioSimulation = async (capital, budget, customers, price) => {
    setSimulating(true);
    setErrorMsg(null);
    try {
      const modifiedInput = {
        ...currentInput,
        available_capital_lkr: parseFloat(capital),
        monthly_budget_lkr: parseFloat(budget),
        expected_customers_per_day: parseInt(customers, 10),
        expected_price_lkr: parseFloat(price),
      };
      
      const newResult = await analyzeBusiness(modifiedInput);
      setActiveCustomResult(newResult);
      if (onScenarioSuccess) onScenarioSuccess(newResult);
    } catch (err) {
      console.error('Scenario simulation failed:', err);
      setErrorMsg(err.message);
    } finally {
      setSimulating(false);
    }
  };

  // Live Debounced Re-scoring
  useEffect(() => {
    if (!liveScoring) return;

    // Check if values have actually changed from baseline or previous
    const isDifferent = 
      customCapital !== baselineCapital ||
      customBudget !== baselineBudget ||
      customCustomers !== baselineCustomers ||
      customPrice !== baselinePrice;

    if (!isDifferent && !activeCustomResult) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      runScenarioSimulation(customCapital, customBudget, customCustomers, customPrice);
    }, 600);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [customCapital, customBudget, customCustomers, customPrice, liveScoring]);

  const handleResetToBaseline = () => {
    setCustomCapital(baselineCapital);
    setCustomBudget(baselineBudget);
    setCustomCustomers(baselineCustomers);
    setCustomPrice(baselinePrice);
    setActiveCustomResult(null);
    setErrorMsg(null);
  };

  const scenarioFeasibility = activeCustomResult?.feasibility_analysis || null;
  const scenarioLabel = scenarioFeasibility?.predicted_label || baselineLabel;
  const scenarioScore = scenarioFeasibility 
    ? (scenarioFeasibility.confidence_score || scenarioFeasibility.probability_score || 0)
    : baselineScore;

  const scoreDelta = scenarioFeasibility ? (scenarioScore - baselineScore) : 0;
  const scoreDeltaPct = (scoreDelta * 100).toFixed(1);

  const what_if_simulations = scenarioData?.what_if_simulations || [];
  const counterfactual_boundary = scenarioData?.counterfactual_boundary || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sliders size={22} style={{ color: '#60a5fa' }} />
          Scenario Explorer & Live What-If Simulator
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem' }}>
          Adjust financial capital, unit pricing, and customer demand with live interactive sliders. Evaluate real-time ML re-scoring against your baseline project.
        </p>
      </div>

      {/* Side-by-Side Change Versus Baseline Comparison Card */}
      <div 
        className="glass-card" 
        style={{ 
          border: '1px solid rgba(59, 130, 246, 0.4)', 
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.95))',
          padding: '1.5rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Real-Time Model Comparison
            </span>
            <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', marginTop: '0.15rem' }}>
              Baseline vs. Modified Scenario
            </h4>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Live Re-scoring Toggle */}
            <button
              onClick={() => setLiveScoring(!liveScoring)}
              style={{
                background: liveScoring ? 'rgba(34, 197, 94, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                border: `1px solid ${liveScoring ? 'rgba(34, 197, 94, 0.4)' : 'rgba(100, 116, 139, 0.3)'}`,
                color: liveScoring ? '#4ade80' : '#94a3b8',
                padding: '0.35rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer'
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: liveScoring ? '#22c55e' : '#64748b' }}></span>
              Live Auto-Score: {liveScoring ? 'ON' : 'OFF'}
            </button>

            {/* Reset to Baseline Button */}
            <button
              onClick={handleResetToBaseline}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              title="Reset all sliders back to baseline inputs"
            >
              <RotateCcw size={13} />
              Reset Baseline
            </button>
          </div>
        </div>

        {/* Comparison Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', alignItems: 'center' }}>
          
          {/* Baseline Column */}
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '1.1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                Original Baseline
              </span>
              <FeasibilityBadge label={baselineLabel} showScore={false} size="sm" />
            </div>

            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.5rem' }}>
              {(baselineScore * 100).toFixed(1)}% <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>Confidence</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.78rem', color: '#cbd5e1', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div>Capital: <strong style={{ color: '#ffffff' }}>{formatCurrency(baselineCapital)}</strong></div>
              <div>Demand: <strong style={{ color: '#ffffff' }}>{formatCustomersPerDay(baselineCustomers)}</strong></div>
              <div>Unit Price: <strong style={{ color: '#ffffff' }}>LKR {baselinePrice}</strong></div>
            </div>
          </div>

          {/* Delta Shift Indicator */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0.5rem' }}>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '0.35rem',
              background: scoreDelta > 0.01 
                ? 'rgba(34, 197, 94, 0.15)' 
                : scoreDelta < -0.01 
                  ? 'rgba(239, 68, 68, 0.15)' 
                  : 'rgba(59, 130, 246, 0.15)',
              border: `1px solid ${scoreDelta > 0.01 ? 'rgba(34, 197, 94, 0.3)' : scoreDelta < -0.01 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
              padding: '0.75rem 1.25rem',
              borderRadius: '12px'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                Score Impact
              </div>
              <div style={{ 
                fontSize: '1.3rem', 
                fontWeight: 900, 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.35rem',
                color: scoreDelta > 0.01 ? '#4ade80' : scoreDelta < -0.01 ? '#fca5a5' : '#60a5fa'
              }}>
                {scoreDelta > 0.01 && <TrendingUp size={20} />}
                {scoreDelta < -0.01 && <TrendingDown size={20} />}
                {Math.abs(scoreDelta) <= 0.01 && <Minus size={20} />}
                <span>{scoreDelta > 0 ? `+${scoreDeltaPct}%` : `${scoreDeltaPct}%`}</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#cbd5e1', textAlign: 'center' }}>
                {scoreDelta > 0.01 ? 'Viability Enhanced' : scoreDelta < -0.01 ? 'Risk Increased' : 'Unchanged'}
              </span>
            </div>
          </div>

          {/* Modified Scenario Column */}
          <div style={{ 
            background: 'rgba(15, 23, 42, 0.9)', 
            border: `1px solid ${scenarioFeasibility ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`, 
            borderRadius: '10px', 
            padding: '1.1rem',
            position: 'relative'
          }}>
            {simulating && (
              <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: '#60a5fa' }}>
                <RefreshCw size={12} className="spin" /> Re-scoring...
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>
                Modified Scenario
              </span>
              <FeasibilityBadge label={scenarioLabel} showScore={false} size="sm" />
            </div>

            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.5rem' }}>
              {(scenarioScore * 100).toFixed(1)}% <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>Live Score</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.78rem', color: '#cbd5e1', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Capital: <strong style={{ color: '#4ade80' }}>{formatCurrency(customCapital)}</strong></span>
                {customCapital !== baselineCapital && (
                  <span style={{ fontSize: '0.7rem', color: customCapital > baselineCapital ? '#4ade80' : '#fca5a5' }}>
                    {customCapital > baselineCapital ? `+${formatCurrency(customCapital - baselineCapital)}` : `-${formatCurrency(baselineCapital - customCapital)}`}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Demand: <strong style={{ color: '#c084fc' }}>{formatCustomersPerDay(customCustomers)}</strong></span>
                {customCustomers !== baselineCustomers && (
                  <span style={{ fontSize: '0.7rem', color: customCustomers > baselineCustomers ? '#4ade80' : '#fca5a5' }}>
                    {customCustomers > baselineCustomers ? `+${customCustomers - baselineCustomers}/day` : `${customCustomers - baselineCustomers}/day`}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Unit Price: <strong style={{ color: '#fde047' }}>LKR {customPrice}</strong></span>
                {customPrice !== baselinePrice && (
                  <span style={{ fontSize: '0.7rem', color: customPrice > baselinePrice ? '#4ade80' : '#fca5a5' }}>
                    {customPrice > baselinePrice ? `+LKR ${customPrice - baselinePrice}` : `-LKR ${baselinePrice - customPrice}`}
                  </span>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Interactive Sliders Panel */}
      <div className="glass-card" style={{ border: '1px solid rgba(59, 130, 246, 0.35)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} style={{ color: '#60a5fa' }} />
            Dynamic Scenario Sliders
          </h4>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Move sliders to test resilience under different market conditions
          </span>
        </div>

        <div className="grid-2" style={{ gap: '1.25rem', marginBottom: '1.25rem' }}>
          
          {/* Slider 1: Capital */}
          <div className="form-group" style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ marginBottom: 0, fontWeight: 600 }}>
                Available Capital
              </label>
              <strong style={{ color: '#60a5fa', fontSize: '0.95rem' }}>{formatCurrency(customCapital)}</strong>
            </div>
            <input
              type="range"
              min="100000"
              max="5000000"
              step="50000"
              value={customCapital}
              onChange={(e) => setCustomCapital(parseFloat(e.target.value))}
              style={{ width: '100%', cursor: 'pointer', accentColor: '#3b82f6' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>
              <span>LKR 100K</span>
              <span>Baseline: {formatCurrency(baselineCapital)}</span>
              <span>LKR 5.0M</span>
            </div>
          </div>

          {/* Slider 2: Customers */}
          <div className="form-group" style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ marginBottom: 0, fontWeight: 600 }}>
                Expected Customers / Day
              </label>
              <strong style={{ color: '#c084fc', fontSize: '0.95rem' }}>{customCustomers} customers/day</strong>
            </div>
            <input
              type="range"
              min="5"
              max="250"
              step="5"
              value={customCustomers}
              onChange={(e) => setCustomCustomers(parseInt(e.target.value, 10))}
              style={{ width: '100%', cursor: 'pointer', accentColor: '#a855f7' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>
              <span>5 / day</span>
              <span>Baseline: {baselineCustomers} / day</span>
              <span>250 / day</span>
            </div>
          </div>

          {/* Slider 3: Price */}
          <div className="form-group" style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ marginBottom: 0, fontWeight: 600 }}>
                Expected Unit Price
              </label>
              <strong style={{ color: '#4ade80', fontSize: '0.95rem' }}>LKR {customPrice}</strong>
            </div>
            <input
              type="range"
              min="50"
              max="3500"
              step="25"
              value={customPrice}
              onChange={(e) => setCustomPrice(parseFloat(e.target.value))}
              style={{ width: '100%', cursor: 'pointer', accentColor: '#22c55e' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>
              <span>LKR 50</span>
              <span>Baseline: LKR {baselinePrice}</span>
              <span>LKR 3,500</span>
            </div>
          </div>

          {/* Slider 4: Monthly Operating Budget */}
          <div className="form-group" style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ marginBottom: 0, fontWeight: 600 }}>
                Monthly Operating Budget
              </label>
              <strong style={{ color: '#818cf8', fontSize: '0.95rem' }}>{formatCurrency(customBudget)}</strong>
            </div>
            <input
              type="range"
              min="30000"
              max="1500000"
              step="20000"
              value={customBudget}
              onChange={(e) => setCustomBudget(parseFloat(e.target.value))}
              style={{ width: '100%', cursor: 'pointer', accentColor: '#6366f1' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>
              <span>LKR 30K</span>
              <span>Baseline: {formatCurrency(baselineBudget)}</span>
              <span>LKR 1.5M</span>
            </div>
          </div>

        </div>

        {/* Action & Manual Trigger Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.85rem', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            * Evaluates updated inputs through trained Random Forest ML pipeline in real-time.
          </span>
          
          <button
            onClick={() => runScenarioSimulation(customCapital, customBudget, customCustomers, customPrice)}
            disabled={simulating}
            className="btn btn-primary"
            style={{ padding: '0.55rem 1.25rem', fontSize: '0.825rem' }}
          >
            <RefreshCw size={15} className={simulating ? 'spin' : ''} />
            <span>{simulating ? 'Re-scoring Model...' : 'Calculate Scenario'}</span>
          </button>
        </div>

        {errorMsg && (
          <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#fca5a5', fontSize: '0.8rem' }}>
            Simulation error: {errorMsg}
          </div>
        )}
      </div>

      {/* Pre-calculated Research Scenarios */}
      {what_if_simulations.length > 0 && (
        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.75rem' }}>
            Pre-Evaluated Stress-Test Scenarios
          </h4>
          <div className="grid-2" style={{ gap: '1rem' }}>
            {what_if_simulations.map((sim, idx) => (
              <div key={idx} className="glass-card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  <span style={{ color: '#ffffff' }}>{sim.title}</span>
                  <span style={{ 
                    padding: '0.2rem 0.5rem', 
                    borderRadius: '4px', 
                    fontSize: '0.725rem', 
                    fontFamily: 'monospace',
                    background: sim.feasibility_probability_delta >= 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: sim.feasibility_probability_delta >= 0 ? '#4ade80' : '#fca5a5'
                  }}>
                    Delta: {(sim.feasibility_probability_delta * 100).toFixed(1)}%
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>{sim.impact_summary}</p>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                  Predicted: <strong style={{ color: '#60a5fa' }}>{sim.new_prediction}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Counterfactual Boundary Guidance */}
      {counterfactual_boundary && counterfactual_boundary.recommendation && (
        <div className="glass-card" style={{ border: '1px solid rgba(99, 102, 241, 0.4)', background: 'rgba(49, 46, 129, 0.25)' }}>
          <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <ShieldAlert size={18} />
            Counterfactual Minimum Viability Boundary
          </h4>
          <p style={{ fontSize: '0.825rem', color: '#e2e8f0', lineHeight: '1.6' }}>
            {counterfactual_boundary.recommendation}
          </p>
        </div>
      )}

    </div>
  );
}
