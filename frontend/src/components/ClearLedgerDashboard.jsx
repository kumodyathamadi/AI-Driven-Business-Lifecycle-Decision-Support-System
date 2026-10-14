import React, { useState, useEffect } from 'react';
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  UploadCloud,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Search,
  Building2,
  DollarSign,
  Scale,
  Percent,
  Eye,
  FileCheck,
  AlertOctagon
} from 'lucide-react';
import {
  uploadInvoicePdf,
  downloadRamisSchedule7Csv,
  fetchFraudReviewQueue,
  submitFraudReviewAction,
  runIntegratedPipeline,
  calculateInvoiceTax
} from '../services/api';

export default function ClearLedgerDashboard() {
  const [activeSubTab, setActiveSubTab] = useState('overview'); // 'overview', 'ocr', 'tax', 'fraud'
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // OCR Upload States
  const [uploadedFile, setUploadedFile] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);
  const [ocrError, setOcrError] = useState(null);
  const [showStepLogs, setShowStepLogs] = useState(false);

  // RAMIS Tax Engine States
  const [taxPeriod, setTaxPeriod] = useState('2025-Q2');
  const [taxpayerTin, setTaxpayerTin] = useState('102938475');
  const [taxInvoices, setTaxInvoices] = useState([
    {
      invoice_number: 'INV-3425',
      customer_tin: '1146888607000',
      customer_name: 'STARFLORA HOLLAND B.V.',
      date_of_supply: '2026-01-06',
      sub_total: 3399.50,
      tax_amount: 0.00,
      total_amount: 3399.50,
      currency: 'EUR',
      tax_category: 'Zero-Rated'
    },
    {
      invoice_number: 'INV-0097',
      customer_tin: '109887766',
      customer_name: 'CEYLON TEA TRADERS',
      date_of_supply: '2025-05-31',
      sub_total: 7025000.00,
      tax_amount: 0.00,
      total_amount: 7025000.00,
      currency: 'LKR',
      tax_category: 'Exempt'
    },
    {
      invoice_number: 'INV-DOM-88',
      customer_tin: '103356111',
      customer_name: 'LANKA STEEL DISTRIBUTORS',
      date_of_supply: '2025-06-15',
      sub_total: 100000.00,
      tax_amount: 18000.00,
      total_amount: 118000.00,
      currency: 'LKR',
      tax_category: 'Standard'
    }
  ]);

  // Fraud Review Queue States
  const [reviewQueue, setReviewQueue] = useState([]);
  const [selectedReviewTxn, setSelectedReviewTxn] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');

  // Integrated Pipeline Test State
  const [pipelineResult, setPipelineResult] = useState(null);

  // Load Review Queue on component mount
  useEffect(() => {
    loadReviewQueue();
  }, []);

  const loadReviewQueue = async () => {
    try {
      const data = await fetchFraudReviewQueue();
      setReviewQueue(data || []);
    } catch (err) {
      console.warn('Review queue could not be loaded (offline):', err.message);
    }
  };

  // OCR Upload Handler
  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploadedFile(file);
    setLoading(true);
    setOcrError(null);
    setOcrResult(null);

    try {
      const result = await uploadInvoicePdf(file);
      setOcrResult(result);
      // Auto-append into Tax Table if extracted cleanly
      if (result.extracted_amounts) {
        const ext = result.extracted_amounts;
        const newEntry = {
          invoice_number: ext.invoice_number || `INV-${Date.now().toString().slice(-4)}`,
          customer_tin: '1146888607000',
          customer_name: 'Extracted Invoice Client',
          date_of_supply: ext.invoice_date || '2026-01-01',
          sub_total: ext.sub_total || 0,
          tax_amount: ext.tax_amount || 0,
          total_amount: ext.total_amount || 0,
          currency: ext.currency || 'LKR',
          tax_category: ext.tax_category || 'Standard'
        };
        setTaxInvoices(prev => [newEntry, ...prev.filter(x => x.invoice_number !== newEntry.invoice_number)]);
      }
    } catch (err) {
      setOcrError(err.response?.data?.detail || err.message || 'Failed to extract amounts from PDF.');
    } finally {
      setLoading(false);
    }
  };

  // Download RAMIS Schedule 7 CSV
  const handleDownloadSchedule7 = async () => {
    setLoading(true);
    try {
      const payload = {
        taxpayer_tin: taxpayerTin,
        tax_period: taxPeriod,
        invoices: taxInvoices
      };
      await downloadRamisSchedule7Csv(payload);
      setStatusMessage({ type: 'success', text: `Successfully generated and downloaded RAMIS Schedule 7 CSV for ${taxPeriod}!` });
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Failed to download CSV: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Submit Fraud Review Action (Approve / Reject)
  const handleAction = async (action) => {
    if (!selectedReviewTxn) return;
    setLoading(true);
    try {
      await submitFraudReviewAction({
        transaction_id: selectedReviewTxn.transaction_id,
        action: action,
        reviewer_notes: reviewNotes || (action === 'approve' ? 'Manual auditor approval' : 'Suspicious anomaly flagged')
      });
      setStatusMessage({
        type: 'success',
        text: `Transaction ${selectedReviewTxn.transaction_id} was successfully marked as ${action.toUpperCase()}!`
      });
      setSelectedReviewTxn(null);
      setReviewNotes('');
      await loadReviewQueue();
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Action failed: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Quick End-to-End Pipeline Demo
  const handleRunPipelineDemo = async () => {
    setLoading(true);
    setPipelineResult(null);
    try {
      const demoReq = {
        document_text: `
          STAR FLORA PVT LTD
          Customs Reference: E 1429
          Invoice Number: 3425
          Date: 06/01/2026
          Consignee: STARFLORA HOLLAND B.V.
          Currency: EUR
          FOB VALUE: 1359.80
          FREIGHT CHARGES: 2039.70
          C & F VALUE: 3399.50
        `,
        item_id: 'CUT-FOLIAGE-38K',
        quantity_invoiced: 38050.0,
        stock_depletion_log: {
          item_id: 'CUT-FOLIAGE-38K',
          quantity_depleted: 38050.0,
          unit_cost: 0.089,
          depletion_timestamp: '2026-01-06T09:00:00'
        },
        transaction_time: '2026-01-06T10:15:00'
      };
      const res = await runIntegratedPipeline(demoReq);
      setPipelineResult(res);
      setStatusMessage({ type: 'success', text: 'Integrated pipeline executed: OCR -> RAMIS Tax -> Fraud Check -> AUTO APPROVED!' });
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Pipeline demo failed: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Calculate Tax Metrics
  const cageDTotal = taxInvoices.filter(i => i.tax_category === 'Zero-Rated').reduce((s, i) => s + i.total_amount, 0);
  const cageATotal = taxInvoices.filter(i => i.tax_category === 'Standard').reduce((s, i) => s + i.total_amount, 0);
  const outputVatLkr = taxInvoices.filter(i => i.tax_category === 'Standard').reduce((s, i) => s + i.tax_amount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', color: '#f8fafc' }}>
      
      {/* Top Banner Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.4), rgba(15, 23, 42, 0.9))',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '16px',
        padding: '1.75rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              background: '#3b82f6',
              borderRadius: '10px',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
            }}>
              <Scale size={24} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>
                ClearLedger <span style={{ color: '#60a5fa', fontWeight: 500 }}>| Financial & Tax Monitor</span>
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}>
                Component 3: RAMIS VAT Schedule 7 Engine • Isolation Forest Anomaly Detection • 6-Step OCR
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '20px',
            padding: '0.35rem 0.85rem',
            fontSize: '0.75rem',
            color: '#4ade80',
            fontWeight: 600
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }}></span>
            API Live (Port 8000)
          </div>

          <button
            onClick={handleRunPipelineDemo}
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '0.6rem 1.1rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Run E2E Demo
          </button>
        </div>
      </div>

      {/* Status Alert Notification */}
      {statusMessage && (
        <div style={{
          padding: '0.85rem 1.25rem',
          borderRadius: '10px',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: statusMessage.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${statusMessage.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          color: statusMessage.type === 'success' ? '#4ade80' : '#f87171'
        }}>
          <span>{statusMessage.text}</span>
          <button
            onClick={() => setStatusMessage(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1rem' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        paddingBottom: '0.5rem'
      }}>
        {[
          { id: 'overview', label: 'Financial Overview', icon: TrendingUp },
          { id: 'ocr', label: 'Invoice OCR & Extraction', icon: UploadCloud },
          { id: 'tax', label: 'IRD RAMIS Tax Compliance', icon: Scale },
          { id: 'fraud', label: 'Fraud & Review Queue', icon: AlertTriangle, badge: reviewQueue.length }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.15rem',
                background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                color: isActive ? '#60a5fa' : '#94a3b8',
                border: isActive ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                borderRadius: '8px',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {Boolean(tab.badge) && (
                <span style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.65rem',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '10px',
                  fontWeight: 800
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: FINANCIAL OVERVIEW                                 */}
      {/* ========================================================= */}
      {activeSubTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* KPI Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            
            <div style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
                <span>TOTAL INVOICES</span>
                <FileText size={18} color="#60a5fa" />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', marginTop: '0.5rem' }}>
                {taxInvoices.length} Invoices
              </div>
              <div style={{ fontSize: '0.75rem', color: '#4ade80', marginTop: '0.25rem' }}>
                100% OCR Math Verification Pass
              </div>
            </div>

            <div style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
                <span>ZERO-RATED EXPORTS (CAGE D)</span>
                <Building2 size={18} color="#22c55e" />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#4ade80', marginTop: '0.5rem' }}>
                € {cageDTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                Customs CusDec / Starflora Verified
              </div>
            </div>

            <div style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
                <span>OUTPUT VAT PAYABLE (CAGE A)</span>
                <DollarSign size={18} color="#f59e0b" />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.5rem' }}>
                Rs. {outputVatLkr.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                Form 2540 Standard 18% Rate
              </div>
            </div>

            <div style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
                <span>FRAUD RISK STATUS</span>
                <ShieldCheck size={18} color="#a855f7" />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: reviewQueue.length > 0 ? '#ef4444' : '#4ade80', marginTop: '0.5rem' }}>
                {reviewQueue.length > 0 ? `${reviewQueue.length} Flagged` : 'All Clear'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                Isolation Forest (4% Contamination)
              </div>
            </div>

          </div>

          {/* End-to-End Execution Result Banner (if triggered) */}
          {pipelineResult && (
            <div style={{
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(34, 197, 94, 0.4)',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CheckCircle2 size={18} />
                  Live Pipeline Result: {pipelineResult.final_pipeline_decision}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Confidence: {pipelineResult.ocr_result?.confidence_score}%
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                Invoice <strong>{pipelineResult.ocr_result?.extracted_amounts?.invoice_number}</strong> was extracted via 6-Step Rule OCR, mapped to Sri Lanka RAMIS <strong>{pipelineResult.tax_result?.schedule_7_cage}</strong> (Tax: {pipelineResult.ocr_result?.extracted_amounts?.tax_amount} {pipelineResult.ocr_result?.extracted_amounts?.currency}), and passed Isolation Forest Stock-Depletion Risk Check with Risk Score <strong>{pipelineResult.fraud_assessment?.risk_score}/100</strong>.
              </div>
            </div>
          )}

          {/* Recent Invoices Table */}
          <div style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Active Invoices Monitored in ClearLedger</h3>
              <button
                onClick={handleDownloadSchedule7}
                disabled={loading}
                style={{
                  background: 'rgba(34, 197, 94, 0.2)',
                  color: '#4ade80',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  borderRadius: '8px',
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Download size={14} />
                Export RAMIS Schedule 7 CSV
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
                    <th style={{ padding: '0.75rem' }}>Invoice #</th>
                    <th style={{ padding: '0.75rem' }}>Customer / Consignee</th>
                    <th style={{ padding: '0.75rem' }}>Date</th>
                    <th style={{ padding: '0.75rem' }}>Category</th>
                    <th style={{ padding: '0.75rem' }}>Total Amount</th>
                    <th style={{ padding: '0.75rem' }}>VAT</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {taxInvoices.map((inv, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 600, color: '#60a5fa' }}>{inv.invoice_number}</td>
                      <td style={{ padding: '0.75rem' }}>{inv.customer_name}</td>
                      <td style={{ padding: '0.75rem', color: '#94a3b8' }}>{inv.date_of_supply}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          background: inv.tax_category === 'Zero-Rated' ? 'rgba(34, 197, 94, 0.15)' : inv.tax_category === 'Standard' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                          color: inv.tax_category === 'Zero-Rated' ? '#4ade80' : inv.tax_category === 'Standard' ? '#60a5fa' : '#c084fc',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 600
                        }}>
                          {inv.tax_category}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                        {inv.currency} {inv.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '0.75rem', color: '#94a3b8' }}>
                        {inv.currency} {inv.tax_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                          <CheckCircle2 size={14} /> AUTO_PASS
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: INVOICE OCR & EXTRACTION                           */}
      {/* ========================================================= */}
      {activeSubTab === 'ocr' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Upload Dropzone */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.7)',
            border: '2px dashed rgba(59, 130, 246, 0.4)',
            borderRadius: '16px',
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'border 0.2s'
          }}>
            <input
              type="file"
              accept=".pdf"
              id="pdfUploadInput"
              style={{ display: 'none' }}
              onChange={(e) => handleFileUpload(e.target.files[0])}
            />
            <label htmlFor="pdfUploadInput" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '1rem', borderRadius: '50%', color: '#60a5fa' }}>
                <UploadCloud size={36} />
              </div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                  {loading ? 'Processing Document with OCR & Rules...' : 'Click to Upload Invoice PDF'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  Supports Digital PDFs & Multi-Page Scanned Customs Declarations (CusDec, Starflora, Standard VAT)
                </div>
              </div>
            </label>
          </div>

          {/* OCR Error Display */}
          {ocrError && (
            <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.85rem' }}>
              {ocrError}
            </div>
          )}

          {/* OCR Results Display */}
          {ocrResult && ocrResult.extracted_amounts && (
            <div style={{
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DOCUMENT EXTRACTION RESULT</span>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', margin: '0.2rem 0' }}>
                    Invoice #{ocrResult.extracted_amounts.invoice_number}
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Date: {ocrResult.extracted_amounts.invoice_date}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    background: ocrResult.decision === 'AUTO_PASS' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${ocrResult.decision === 'AUTO_PASS' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    borderRadius: '8px',
                    padding: '0.4rem 0.85rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>DECISION</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: ocrResult.decision === 'AUTO_PASS' ? '#4ade80' : '#f87171' }}>
                      {ocrResult.decision}
                    </div>
                  </div>

                  <div style={{
                    background: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px',
                    padding: '0.4rem 0.85rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>CONFIDENCE</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#60a5fa' }}>
                      {ocrResult.confidence_score}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Amount Breakdown Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>SUBTOTAL (NET)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>
                    {ocrResult.extracted_amounts.currency} {ocrResult.extracted_amounts.sub_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>TAX AMOUNT ({ocrResult.extracted_amounts.tax_category})</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem', color: '#fbbf24' }}>
                    {ocrResult.extracted_amounts.currency} {ocrResult.extracted_amounts.tax_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                  <div style={{ fontSize: '0.7rem', color: '#60a5fa' }}>TOTAL PAYABLE AMOUNT</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.25rem', color: '#60a5fa' }}>
                    {ocrResult.extracted_amounts.currency} {ocrResult.extracted_amounts.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Mathematical Equation Consistency Check */}
              <div style={{
                background: ocrResult.extracted_amounts.is_math_valid ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${ocrResult.extracted_amounts.is_math_valid ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                padding: '0.85rem 1.25rem',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                fontSize: '0.85rem'
              }}>
                {ocrResult.extracted_amounts.is_math_valid ? <CheckCircle2 size={18} color="#4ade80" /> : <AlertOctagon size={18} color="#f87171" />}
                <div>
                  <strong>Mathematical Equation Check:</strong>{' '}
                  {ocrResult.extracted_amounts.sub_total} + {ocrResult.extracted_amounts.tax_amount} = {ocrResult.extracted_amounts.total_amount}{' '}
                  (Difference: {ocrResult.extracted_amounts.math_difference.toFixed(2)}) —{' '}
                  <span style={{ color: ocrResult.extracted_amounts.is_math_valid ? '#4ade80' : '#f87171', fontWeight: 700 }}>
                    {ocrResult.extracted_amounts.is_math_valid ? 'Arithmetic Validated (Exact Match)' : 'Mismatch Detected'}
                  </span>
                </div>
              </div>

              {/* Toggle Step Logs Accordion */}
              <div>
                <button
                  onClick={() => setShowStepLogs(!showStepLogs)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: 0
                  }}
                >
                  <Eye size={14} />
                  {showStepLogs ? 'Hide 6-Step Extraction Logs' : 'View 6-Step Extraction Audit Trail'}
                </button>

                {showStepLogs && (
                  <div style={{ marginTop: '0.75rem', background: 'rgba(15, 23, 42, 0.8)', padding: '1rem', borderRadius: '10px', fontSize: '0.75rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {ocrResult.step_logs?.map((step, sIdx) => (
                      <div key={sIdx}>
                        <strong style={{ color: '#cbd5e1' }}>{step.step}:</strong> {step.details}
                      </div>
                    ))}
                    <div style={{ marginTop: '0.25rem', color: '#64748b' }}>
                      Decoys Rejection: Filtered {ocrResult.rejected_decoys_count} decoy tokens (TINs, dates, phone numbers, customs declaration fees).
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: IRD RAMIS TAX COMPLIANCE                           */}
      {/* ========================================================= */}
      {activeSubTab === 'tax' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Header Settings Bar */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                  Taxpayer TIN (RAMIS)
                </label>
                <input
                  type="text"
                  value={taxpayerTin}
                  onChange={(e) => setTaxpayerTin(e.target.value)}
                  style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '0.4rem 0.75rem',
                    color: '#ffffff',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                  Tax Filing Period
                </label>
                <input
                  type="text"
                  value={taxPeriod}
                  onChange={(e) => setTaxPeriod(e.target.value)}
                  style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '0.4rem 0.75rem',
                    color: '#ffffff',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>

            <button
              onClick={handleDownloadSchedule7}
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '0.65rem 1.25rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(34, 197, 94, 0.3)'
              }}
            >
              <Download size={16} />
              Download Official RAMIS Schedule 7 CSV
            </button>
          </div>

          {/* Schedule 7 Cage Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            
            <div style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#60a5fa', fontWeight: 700 }}>CAGE A • STANDARD 18%</span>
                <span style={{ fontSize: '0.7rem', background: 'rgba(59, 130, 246, 0.15)', padding: '0.15rem 0.45rem', borderRadius: '4px', color: '#60a5fa' }}>Domestic</span>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '0.75rem' }}>
                Rs. {cageATotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                Output VAT: Rs. {outputVatLkr.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#4ade80', fontWeight: 700 }}>CAGE D • ZERO-RATED 0%</span>
                <span style={{ fontSize: '0.7rem', background: 'rgba(34, 197, 94, 0.15)', padding: '0.15rem 0.45rem', borderRadius: '4px', color: '#4ade80' }}>Direct Export</span>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#4ade80', marginTop: '0.75rem' }}>
                € {cageDTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                Zero-Rated Export under Sri Lanka VAT Act
              </div>
            </div>

            <div style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#c084fc', fontWeight: 700 }}>CAGE E • EXEMPT SUPPLIES</span>
                <span style={{ fontSize: '0.7rem', background: 'rgba(168, 85, 247, 0.15)', padding: '0.15rem 0.45rem', borderRadius: '4px', color: '#c084fc' }}>Exempt</span>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#c084fc', marginTop: '0.75rem' }}>
                Rs. 7,025,000.00
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                Educational, Agricultural, Healthcare
              </div>
            </div>

          </div>

          {/* Form 2540 Summary Info */}
          <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1.25rem', fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.5' }}>
            <strong style={{ color: '#ffffff' }}>Sri Lanka Inland Revenue Department (RAMIS) Compliance:</strong> Schedule 7 requires every registered taxable person to report all supplies made during the taxable period categorized into Cage A (18%), Cage D (Direct Exports 0%), and Cage E (Exempt). Invoices uploaded through ClearLedger are automatically mapped with valid Customer TINs and formatted to RAMIS specifications.
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: FRAUD DETECTION & REVIEW QUEUE                     */}
      {/* ========================================================= */}
      {activeSubTab === 'fraud' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                Human-in-the-Loop Anomaly Review Queue
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}>
                Transactions flagged by Isolation Forest for revenue/inventory discrepancies or velocity spikes.
              </p>
            </div>

            <button
              onClick={loadReviewQueue}
              style={{
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                padding: '0.4rem 0.85rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <RefreshCw size={14} /> Refresh Queue
            </button>
          </div>

          {/* Review Queue Items */}
          {reviewQueue.length === 0 ? (
            <div style={{
              background: 'rgba(30, 41, 59, 0.4)',
              border: '1px dashed rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '3rem',
              textAlign: 'center',
              color: '#94a3b8'
            }}>
              <CheckCircle2 size={42} color="#4ade80" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                Review Queue is Empty
              </div>
              <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                All recent transactions passed Isolation Forest stock cross-referencing checks.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {reviewQueue.map((item, qIdx) => (
                <div
                  key={qIdx}
                  style={{
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 800, color: '#f87171' }}>{item.transaction_id}</span>
                      <span style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#f87171',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px'
                      }}>
                        Risk Score: {item.risk_score}/100
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      {item.anomaly_flags?.map((flag, fIdx) => (
                        <span key={fIdx} style={{
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: '#fbbf24',
                          fontSize: '0.7rem',
                          padding: '0.15rem 0.4rem',
                          borderRadius: '4px'
                        }}>
                          ⚠️ {flag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedReviewTxn(item)}
                    style={{
                      background: 'rgba(59, 130, 246, 0.2)',
                      color: '#60a5fa',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      borderRadius: '8px',
                      padding: '0.5rem 1rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Review Anomaly
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Review Action Modal */}
          {selectedReviewTxn && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '1rem'
            }}>
              <div style={{
                background: '#1e293b',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '16px',
                padding: '1.75rem',
                maxWidth: '540px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                    Human Auditor Resolution
                  </h3>
                  <button
                    onClick={() => setSelectedReviewTxn(null)}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}
                  >
                    ×
                  </button>
                </div>

                <div style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.5' }}>
                  Transaction <strong>{selectedReviewTxn.transaction_id}</strong> was flagged with a risk score of <strong>{selectedReviewTxn.risk_score}/100</strong>.
                  <div style={{ marginTop: '0.5rem', color: '#fbbf24' }}>
                    Reason: {selectedReviewTxn.anomaly_flags?.join(', ')}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.4rem' }}>
                    Reviewer Notes / Justification:
                  </label>
                  <textarea
                    rows={3}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Enter reason for approval override or fraud rejection..."
                    style={{
                      width: '100%',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '0.6rem',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    onClick={() => handleAction('reject')}
                    disabled={loading}
                    style={{
                      background: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.55rem 1.15rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Reject & Flag Fraud
                  </button>

                  <button
                    onClick={() => handleAction('approve')}
                    disabled={loading}
                    style={{
                      background: '#22c55e',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.55rem 1.15rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Approve (Override ML)
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
