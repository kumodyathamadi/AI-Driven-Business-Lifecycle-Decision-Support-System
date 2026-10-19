import React from 'react';
import { Target, BarChart2 } from 'lucide-react';

export default function KpiTable({ kpis = [] }) {
  if (!kpis || kpis.length === 0) {
    return (
      <div className="bp-empty-state">
        No KPI monitoring benchmarks configured.
      </div>
    );
  }

  const getCategoryClass = (type = '') => {
    const t = type.toLowerCase();
    if (t.includes('finan') || t.includes('liquidity')) return 'cat-financial';
    if (t.includes('cost') || t.includes('burn')) return 'cat-cost';
    if (t.includes('cust') || t.includes('market')) return 'cat-customer';
    return 'cat-operational';
  };

  return (
    <div className="bp-kpi-table-wrapper">
      <div className="bp-table-scroll-container">
        <table className="bp-kpi-table" aria-label="Measurable Management KPIs">
          <thead>
            <tr>
              <th scope="col">KPI Metric</th>
              <th scope="col">Category</th>
              <th scope="col">Operational Target</th>
              <th scope="col">Review Frequency</th>
            </tr>
          </thead>
          <tbody>
            {kpis.map((kpi, idx) => (
              <tr key={idx} className={`bp-kpi-row ${idx % 2 === 0 ? 'even' : 'odd'}`}>
                <th scope="row" className="bp-kpi-name">
                  <div className="bp-kpi-name-cell">
                    <Target size={14} className="bp-kpi-icon" aria-hidden="true" />
                    <span>{kpi.kpi_name}</span>
                  </div>
                </th>
                <td>
                  <span className={`bp-kpi-badge ${getCategoryClass(kpi.type)}`}>
                    {kpi.type || 'Operational'}
                  </span>
                </td>
                <td className="bp-kpi-target">
                  {kpi.target}
                </td>
                <td className="bp-kpi-freq">
                  <span className="bp-freq-pill">{kpi.frequency}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bp-table-helper-note">
        <strong>Monitoring Guide:</strong> Establish monthly reviews against these quantitative benchmarks to identify variances early.
      </div>
    </div>
  );
}
