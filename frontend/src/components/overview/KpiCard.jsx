import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  Users,
  Layers,
  TrendingUp,
  ArrowUpRight,
  Info
} from 'lucide-react';
import {
  formatCurrency,
  formatNumber,
  formatShortNumber
} from '../../utils/formatters';

export function CapitalKpiCard({ availableCapital = 3500000, monthlyBudget = 480000 }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const fitoutVal = Math.round(availableCapital * 0.55);
  const stockVal = Math.round(availableCapital * 0.25);
  const bufferVal = Math.round(availableCapital * 0.20);

  return (
    <div
      className="kpi-card-clean"
      role="region"
      aria-label="Required Startup Capital Metric"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="kpi-card-top-row">
        <span className="kpi-card-label">Startup Capital</span>
        <button
          type="button"
          className="kpi-info-icon-btn"
          onClick={() => setShowTooltip(!showTooltip)}
          aria-label="Show capital allocation breakdown"
        >
          <DollarSign size={15} style={{ color: '#818cf8' }} aria-hidden="true" />
        </button>
      </div>

      <div className="kpi-card-value">
        LKR {formatNumber(availableCapital)}
      </div>

      <div className="kpi-card-helper">
        <span>Capex + 3m operating coverage</span>
      </div>

      {/* Progressive Disclosure Tooltip Popover */}
      {showTooltip && (
        <div className="kpi-hover-popover" role="tooltip">
          <div className="kpi-popover-title">Capital Allocation Breakdown</div>
          <div className="kpi-popover-row">
            <span className="kpi-popover-legend dot-teal">Fitout & Fixtures (55%)</span>
            <strong>{formatCurrency(fitoutVal)}</strong>
          </div>
          <div className="kpi-popover-row">
            <span className="kpi-popover-legend dot-blue">Inventory Stock (25%)</span>
            <strong>{formatCurrency(stockVal)}</strong>
          </div>
          <div className="kpi-popover-row">
            <span className="kpi-popover-legend dot-purple">Working Capital Buffer (20%)</span>
            <strong>{formatCurrency(bufferVal)}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

export function CustomerDemandKpiCard({ expectedCust = 20, breakEvenCust = 10 }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const minCust = Math.max(1, Math.round(expectedCust * 0.9));
  const maxCust = Math.round(expectedCust * 1.2);

  const m1Cust = Math.max(5, Math.round(expectedCust * 0.55));
  const m3Cust = Math.max(m1Cust, Math.round(expectedCust * 0.85));
  const m6Cust = Math.max(m3Cust, Math.round(expectedCust * 1.08));

  return (
    <div
      className="kpi-card-clean"
      role="region"
      aria-label="Expected Customers per Day Metric"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="kpi-card-top-row">
        <span className="kpi-card-label">Daily Customers</span>
        <button
          type="button"
          className="kpi-info-icon-btn"
          onClick={() => setShowTooltip(!showTooltip)}
          aria-label="Show customer ramp projection"
        >
          <Users size={15} style={{ color: '#818cf8' }} aria-hidden="true" />
        </button>
      </div>

      <div className="kpi-card-value">
        {minCust} – {maxCust}{' '}
        <span className="kpi-card-unit">/ day</span>
      </div>

      <div className="kpi-card-helper positive">
        <TrendingUp size={12} aria-hidden="true" />
        <span>Above break-even ({breakEvenCust}/day)</span>
      </div>

      {/* Progressive Disclosure Tooltip Popover */}
      {showTooltip && (
        <div className="kpi-hover-popover" role="tooltip">
          <div className="kpi-popover-title">Customer Ramp Projection</div>
          <div className="kpi-popover-row">
            <span>Month 1 (Launch phase)</span>
            <strong>{m1Cust} clients/day</strong>
          </div>
          <div className="kpi-popover-row">
            <span>Month 3 (Break-even ramp)</span>
            <strong>{m3Cust} clients/day</strong>
          </div>
          <div className="kpi-popover-row">
            <span>Month 6 (Stable run-rate)</span>
            <strong>{m6Cust} clients/day</strong>
          </div>
        </div>
      )}
    </div>
  );
}

export function OperatingBudgetKpiCard({
  monthlyBudget = 480000,
  rentEst = 182000,
  staffEst = 211000
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  const miscEst = Math.max(0, monthlyBudget - rentEst - staffEst);

  return (
    <div
      className="kpi-card-clean"
      role="region"
      aria-label="Monthly Operating Budget Metric"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="kpi-card-top-row">
        <span className="kpi-card-label">Monthly Operating Budget</span>
        <button
          type="button"
          className="kpi-info-icon-btn"
          onClick={() => setShowTooltip(!showTooltip)}
          aria-label="Show monthly expense breakdown"
        >
          <Layers size={15} style={{ color: '#818cf8' }} aria-hidden="true" />
        </button>
      </div>

      <div className="kpi-card-value">
        LKR {formatNumber(monthlyBudget)}{' '}
        <span className="kpi-card-unit">/ mo</span>
      </div>

      <div className="kpi-card-helper">
        <span>Rent LKR {formatShortNumber(rentEst)} • Staff LKR {formatShortNumber(staffEst)}</span>
      </div>

      {/* Progressive Disclosure Tooltip Popover */}
      {showTooltip && (
        <div className="kpi-hover-popover" role="tooltip">
          <div className="kpi-popover-title">Monthly Operating Expense</div>
          <div className="kpi-popover-row">
            <span className="kpi-popover-legend dot-blue">Facility Lease (38%)</span>
            <strong>{formatCurrency(rentEst)}</strong>
          </div>
          <div className="kpi-popover-row">
            <span className="kpi-popover-legend dot-purple">Staff Payroll (44%)</span>
            <strong>{formatCurrency(staffEst)}</strong>
          </div>
          <div className="kpi-popover-row">
            <span className="kpi-popover-legend dot-slate">Utilities & Misc (18%)</span>
            <strong>{formatCurrency(miscEst)}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

export function ExtraCapitalKpiCard({
  businessId,
  extraCapitalNeeded = 156000,
  availableCapital = 3500000
}) {
  const targetCapital = availableCapital + extraCapitalNeeded;

  return (
    <Link
      to={`/businesses/${businessId}/scenarios?capital=${targetCapital}`}
      className="kpi-card-clean kpi-card-interactive"
      role="region"
      aria-label={`Extra Capital Needed: +${formatCurrency(extraCapitalNeeded)}. Click to simulate in Scenario Explorer.`}
      title="Click to open Scenario Explorer with this capital target"
    >
      <div className="kpi-card-top-row">
        <span className="kpi-card-label">Extra Capital to 'Feasible'</span>
        <div className="kpi-arrow-icon-wrap" aria-hidden="true">
          <ArrowUpRight size={15} />
        </div>
      </div>

      <div className="kpi-card-value highlight-emerald">
        +{formatCurrency(extraCapitalNeeded)}
      </div>

      <div className="kpi-card-helper positive">
        <TrendingUp size={12} aria-hidden="true" />
        <span>Shifts viability to 88% Feasible</span>
      </div>
    </Link>
  );
}
