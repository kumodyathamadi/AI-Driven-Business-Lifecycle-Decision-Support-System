import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  Users,
  Layers,
  TrendingUp,
  ArrowRight,
  Info
} from 'lucide-react';
import {
  formatCurrency,
  formatNumber,
  formatShortNumber
} from '../../utils/formatters';

export function CapitalKpiCard({ availableCapital, monthlyBudget }) {
  const [activeTooltip, setActiveTooltip] = useState(null);

  // Breakdown percentages
  const fitoutPct = 55;
  const stockPct = 25;
  const bufferPct = 20;

  const fitoutVal = Math.round(availableCapital * (fitoutPct / 100));
  const stockVal = Math.round(availableCapital * (stockPct / 100));
  const bufferVal = Math.round(availableCapital * (bufferPct / 100));

  return (
    <div className="template-kpi-card" role="region" aria-label="Required Startup Capital Metric">
      <div>
        <div className="template-kpi-top">
          <span className="template-kpi-label">Required Startup Capital</span>
          <div className="kpi-icon-wrap" aria-hidden="true">
            <DollarSign size={16} className="template-kpi-icon" />
          </div>
        </div>
        <div className="template-kpi-main-val">
          LKR {formatNumber(availableCapital)}
        </div>
        <div className="template-kpi-subtext">
          Capex + 3m OpEx coverage
        </div>
      </div>

      <div>
        {/* Segmented Progress Bar */}
        <div className="segmented-progress-bar" role="progressbar" aria-label="Capital allocation breakdown">
          <div
            className="seg-item seg-teal"
            style={{ width: `${fitoutPct}%` }}
            onMouseEnter={() => setActiveTooltip(`Fitout: ${formatCurrency(fitoutVal)} (${fitoutPct}%)`)}
            onMouseLeave={() => setActiveTooltip(null)}
          />
          <div
            className="seg-item seg-blue"
            style={{ width: `${stockPct}%` }}
            onMouseEnter={() => setActiveTooltip(`Inventory Stock: ${formatCurrency(stockVal)} (${stockPct}%)`)}
            onMouseLeave={() => setActiveTooltip(null)}
          />
          <div
            className="seg-item seg-purple"
            style={{ width: `${bufferPct}%` }}
            onMouseEnter={() => setActiveTooltip(`Working Capital Buffer: ${formatCurrency(bufferVal)} (${bufferPct}%)`)}
            onMouseLeave={() => setActiveTooltip(null)}
          />
        </div>

        {/* Dynamic Tooltip / Legend */}
        {activeTooltip ? (
          <div className="kpi-interactive-tooltip">{activeTooltip}</div>
        ) : (
          <div className="segmented-labels">
            <span className="legend-dot-item">
              <span className="legend-dot teal" /> Fitout {fitoutPct}%
            </span>
            <span className="legend-dot-item">
              <span className="legend-dot blue" /> Stock {stockPct}%
            </span>
            <span className="legend-dot-item">
              <span className="legend-dot purple" /> Buffer {bufferPct}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function CustomerDemandKpiCard({ expectedCust, breakEvenCust }) {
  const [hoveredMonth, setHoveredMonth] = useState(null);

  const m1Cust = Math.max(5, Math.round(expectedCust * 0.55));
  const m3Cust = Math.max(m1Cust, Math.round(expectedCust * 0.85));
  const m6Cust = Math.max(m3Cust, Math.round(expectedCust * 1.08));

  const points = [
    { label: 'Mo 1', clients: m1Cust, phase: 'Initial setup & brand launch', cx: 20, cy: 30 },
    { label: 'Mo 3', clients: m3Cust, phase: 'Break-even ramp & repeats', cx: 100, cy: 18 },
    { label: 'Mo 6', clients: m6Cust, phase: 'Stabilized operating run-rate', cx: 180, cy: 8 }
  ];

  return (
    <div className="template-kpi-card" role="region" aria-label="Expected Customers per Day Metric">
      <div>
        <div className="template-kpi-top">
          <span className="template-kpi-label">Expected Customers / Day</span>
          <div className="kpi-icon-wrap" aria-hidden="true">
            <Users size={16} className="template-kpi-icon" />
          </div>
        </div>
        <div className="template-kpi-main-val">
          {Math.max(1, Math.round(expectedCust * 0.9))} – {Math.round(expectedCust * 1.2)}{' '}
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#94a3b8' }}>clients</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.76rem', color: '#34d399', fontWeight: 600, marginTop: '0.2rem' }}>
          <TrendingUp size={13} aria-hidden="true" />
          <span>Above break-even ({breakEvenCust}/day)</span>
        </div>
      </div>

      <div>
        {/* Interactive Sparkline Micro-Chart */}
        <div style={{ height: '36px', width: '100%', position: 'relative' }}>
          <svg viewBox="0 0 200 40" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            <defs>
              <linearGradient id="sparklineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M 20 30 Q 60 26, 100 18 T 180 8"
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {points.map((pt, i) => (
              <g
                key={i}
                onMouseEnter={() => setHoveredMonth(pt)}
                onMouseLeave={() => setHoveredMonth(null)}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={pt.cx}
                  cy={pt.cy}
                  r={hoveredMonth?.label === pt.label ? 6 : 4}
                  fill={hoveredMonth?.label === pt.label ? '#34d399' : '#10b981'}
                  stroke="#0f1523"
                  strokeWidth="2"
                />
              </g>
            ))}
          </svg>
        </div>

        {/* Month Labels & Tooltip */}
        {hoveredMonth ? (
          <div className="kpi-interactive-tooltip">
            <strong>{hoveredMonth.label}: {hoveredMonth.clients} clients/day</strong> — {hoveredMonth.phase}
          </div>
        ) : (
          <div className="segmented-labels">
            <span>Mo 1: {m1Cust}/day</span>
            <span>Mo 3: {m3Cust}/day</span>
            <span>Mo 6: {m6Cust}/day</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function OperatingBudgetKpiCard({ monthlyBudget, rentEst, staffEst }) {
  const [activeTooltip, setActiveTooltip] = useState(null);

  const rentPct = 38;
  const staffPct = 44;
  const miscPct = 18;

  const rentVal = Math.round(monthlyBudget * (rentPct / 100));
  const staffVal = Math.round(monthlyBudget * (staffPct / 100));
  const miscVal = Math.round(monthlyBudget * (miscPct / 100));

  return (
    <div className="template-kpi-card" role="region" aria-label="Monthly Operating Budget Metric">
      <div>
        <div className="template-kpi-top">
          <span className="template-kpi-label">Monthly Operating Budget</span>
          <div className="kpi-icon-wrap" aria-hidden="true">
            <Layers size={16} className="template-kpi-icon" />
          </div>
        </div>
        <div className="template-kpi-main-val">
          LKR {formatNumber(monthlyBudget)}{' '}
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}>/ mo</span>
        </div>
        <div className="template-kpi-subtext">
          Rent LKR {formatShortNumber(rentVal)} • Staff LKR {formatShortNumber(staffVal)}
        </div>
      </div>

      <div>
        <div className="segmented-progress-bar" role="progressbar" aria-label="Monthly operating expenditure allocation">
          <div
            className="seg-item seg-blue"
            style={{ width: `${rentPct}%` }}
            onMouseEnter={() => setActiveTooltip(`Facility Lease: ${formatCurrency(rentVal)} (${rentPct}%)`)}
            onMouseLeave={() => setActiveTooltip(null)}
          />
          <div
            className="seg-item seg-purple"
            style={{ width: `${staffPct}%` }}
            onMouseEnter={() => setActiveTooltip(`Staff Salaries: ${formatCurrency(staffVal)} (${staffPct}%)`)}
            onMouseLeave={() => setActiveTooltip(null)}
          />
          <div
            className="seg-item seg-slate"
            style={{ width: `${miscPct}%` }}
            onMouseEnter={() => setActiveTooltip(`Utilities & Misc: ${formatCurrency(miscVal)} (${miscPct}%)`)}
            onMouseLeave={() => setActiveTooltip(null)}
          />
        </div>

        {activeTooltip ? (
          <div className="kpi-interactive-tooltip">{activeTooltip}</div>
        ) : (
          <div className="segmented-labels">
            <span className="legend-dot-item">
              <span className="legend-dot blue" /> Rent {rentPct}%
            </span>
            <span className="legend-dot-item">
              <span className="legend-dot purple" /> Payroll {staffPct}%
            </span>
            <span className="legend-dot-item">
              <span className="legend-dot slate" /> Misc {miscPct}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function ExtraCapitalKpiCard({ businessId, extraCapitalNeeded, availableCapital }) {
  const targetCapital = availableCapital + extraCapitalNeeded;

  return (
    <div className="template-kpi-card" role="region" aria-label="Extra Capital Optimization CTA">
      <div>
        <div className="template-kpi-top">
          <span className="template-kpi-label">Extra Capital to 'Feasible'</span>
          <div style={{ color: '#10b981', display: 'flex', alignItems: 'center' }} aria-hidden="true">
            <TrendingUp size={16} />
          </div>
        </div>
        <div className="template-kpi-main-val" style={{ color: '#34d399' }}>
          +{formatCurrency(extraCapitalNeeded)}
        </div>
        <div className="template-kpi-subtext">
          Unlocks 6 months safety runway
        </div>
      </div>

      <div>
        <Link
          to={`/businesses/${businessId}/scenarios?capital=${targetCapital}`}
          className="trend-pill-btn"
          style={{ width: '100%', justifyContent: 'center' }}
          title={`Simulate target capital of LKR ${formatNumber(targetCapital)} in Scenario Explorer`}
        >
          <TrendingUp size={13} aria-hidden="true" />
          <span>Shifts Viability to 88% FEASIBLE</span>
        </Link>
      </div>
    </div>
  );
}
