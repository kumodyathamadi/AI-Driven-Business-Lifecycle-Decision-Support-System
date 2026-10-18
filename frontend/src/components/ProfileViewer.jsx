import React, { useState } from 'react';
import { 
  UserCheck, 
  Copy, 
  Download, 
  Check, 
  Code, 
  ChevronDown, 
  ChevronUp, 
  Building, 
  DollarSign, 
  Users, 
  MapPin 
} from 'lucide-react';

export default function ProfileViewer({ profile, onExportJson }) {
  const [showRawJson, setShowRawJson] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!profile) return null;

  const { business_input = {}, metadata = {} } = profile;

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(JSON.stringify(profile, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
  };

  const handleExport = () => {
    if (onExportJson) {
      onExportJson();
    } else {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(profile, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `business_profile_${profile.id || 'export'}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header Bar */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '0.75rem', 
        borderBottom: '1px solid var(--border-color)', 
        paddingBottom: '1rem' 
      }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <UserCheck size={20} style={{ color: '#38bdf8' }} />
            <span>Business Profile & Record</span>
          </h3>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.25rem 0 0 0' }}>
            ID: <span style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>{metadata.record_id || profile.id || 'N/A'}</span> | Schema: <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: 700 }}>{metadata.schema_version || '1.0.0'}</span>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button 
            type="button" 
            onClick={handleCopy} 
            className="btn btn-secondary" 
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.74rem' }}
          >
            {copied ? <Check size={13} style={{ color: '#4ade80' }} /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button 
            type="button" 
            onClick={handleExport} 
            className="btn btn-primary" 
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.74rem' }}
          >
            <Download size={13} />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Structured Info Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
        
        {/* Card 1: Business Overview */}
        <div style={{ background: 'var(--bg-card-solid)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#60a5fa', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.45rem', margin: '0 0 0.65rem 0' }}>
            <Building size={15} />
            <span>Business Information</span>
          </h4>
          <div style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div>Category: <strong style={{ color: 'var(--text-primary)' }}>{business_input.business_category || 'N/A'}</strong></div>
            <div>Stage: <strong style={{ color: 'var(--text-primary)' }}>{business_input.business_stage || 'N/A'}</strong></div>
            <div>District: <strong style={{ color: 'var(--text-primary)' }}>{business_input.district || 'Colombo'}</strong></div>
            <div>Structure: <strong style={{ color: 'var(--text-primary)' }}>Sole Proprietorship / SME</strong></div>
          </div>
        </div>

        {/* Card 2: Financial Information */}
        <div style={{ background: 'var(--bg-card-solid)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4ade80', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.45rem', margin: '0 0 0.65rem 0' }}>
            <DollarSign size={15} />
            <span>Financial Parameters</span>
          </h4>
          <div style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div>Capital: <strong style={{ color: '#4ade80' }}>LKR {Number(business_input.available_capital_lkr || 0).toLocaleString()}</strong></div>
            <div>Budget: <strong style={{ color: 'var(--text-primary)' }}>LKR {Number(business_input.monthly_budget_lkr || 0).toLocaleString()}</strong></div>
            <div>Unit Price: <strong style={{ color: 'var(--text-primary)' }}>LKR {Number(business_input.expected_price_lkr || 0).toLocaleString()}</strong></div>
            <div>Loan Amount: <strong style={{ color: 'var(--text-primary)' }}>{Number(business_input.loan_amount_lkr || 0) > 0 ? `LKR ${Number(business_input.loan_amount_lkr).toLocaleString()}` : 'None'}</strong></div>
          </div>
        </div>

        {/* Card 3: Market Parameters */}
        <div style={{ background: 'var(--bg-card-solid)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c084fc', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.45rem', margin: '0 0 0.65rem 0' }}>
            <MapPin size={15} />
            <span>Market & Demand</span>
          </h4>
          <div style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div>Expected Customers: <strong style={{ color: 'var(--text-primary)' }}>{business_input.expected_customers_per_day || 0} / Day</strong></div>
            <div>Demand Score: <strong style={{ color: 'var(--text-primary)' }}>{business_input.customer_demand_score || 'N/A'}/100</strong></div>
            <div>Competition Level: <strong style={{ color: 'var(--text-primary)' }}>{business_input.competition_level || 'Moderate'}</strong></div>
            <div>Operating Days: <strong style={{ color: 'var(--text-primary)' }}>{business_input.expected_operating_days_per_month || 26} Days/Mo</strong></div>
          </div>
        </div>

        {/* Card 4: Operational Readiness */}
        <div style={{ background: 'var(--bg-card-solid)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fde047', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.45rem', margin: '0 0 0.65rem 0' }}>
            <Users size={15} />
            <span>Operational Setup</span>
          </h4>
          <div style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div>Experience: <strong style={{ color: 'var(--text-primary)' }}>{business_input.entrepreneur_experience_years || 0} Years</strong></div>
            <div>Staffing: <strong style={{ color: 'var(--text-primary)' }}>{business_input.available_staff_count || 1} Person(s)</strong></div>
            <div>Equipment Score: <strong style={{ color: 'var(--text-primary)' }}>{business_input.available_equipment_score || 3}/5</strong></div>
            <div>Supplier Score: <strong style={{ color: 'var(--text-primary)' }}>{business_input.supplier_availability_score || 3}/5</strong></div>
          </div>
        </div>

      </div>

      {/* Developer / Academic Raw JSON Accordion */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
        <button 
          type="button"
          onClick={() => setShowRawJson(!showRawJson)}
          style={{ 
            background: 'rgba(30, 41, 59, 0.5)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '8px', 
            padding: '0.55rem 0.85rem', 
            color: '#94a3b8', 
            fontSize: '0.76rem', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            width: '100%',
            cursor: 'pointer'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Code size={15} style={{ color: '#60a5fa' }} />
            <span>Developer & Research Raw JSON Schema Data</span>
          </span>
          {showRawJson ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>

        {showRawJson && (
          <div style={{ marginTop: '0.75rem', maxHeight: '320px', overflowY: 'auto' }}>
            <pre className="json-viewer" style={{ fontSize: '0.72rem', padding: '0.75rem' }}>
              {JSON.stringify(profile, null, 2)}
            </pre>
          </div>
        )}
      </div>

    </div>
  );
}
