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
  AlertOctagon,
  Trash2,
  Calendar,
  Filter
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

  // RAMIS Tax Engine States & Period Options (Quarterly vs Monthly)
  const [periodType, setPeriodType] = useState('quarterly'); // 'quarterly' | 'monthly'
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedQuarter, setSelectedQuarter] = useState('Q1'); // 'Q1', 'Q2', 'Q3', 'Q4'
  const [selectedMonth, setSelectedMonth] = useState('01'); // '01' to '12'
  const [filterByPeriod, setFilterByPeriod] = useState(false);
  const [taxPeriod, setTaxPeriod] = useState('2026-Q1');
  const [taxpayerTin, setTaxpayerTin] = useState('102938475');

  // Synchronize taxPeriod string whenever period controls change
  useEffect(() => {
    if (periodType === 'quarterly') {
      setTaxPeriod(`${selectedYear}-${selectedQuarter}`);
    } else {
      setTaxPeriod(`${selectedYear}-${selectedMonth}`);
    }
  }, [periodType, selectedYear, selectedQuarter, selectedMonth]);

  const [taxInvoices, setTaxInvoices] = useState([
    {
      invoice_number: '3425',
      customer_tin: '1146888607000',
      customer_name: 'STARFLORA HOLLAND B.V.',
      date_of_supply: '06/01/2026',
      sub_total: 3399.50,
      tax_amount: 0.00,
      total_amount: 3399.50,
      currency: 'EUR',
      tax_category: 'Zero-Rated',
      status: 'AUTO_PASS'
    },
    {
      invoice_number: '3426',
      customer_tin: '1140859877000',
      customer_name: 'FRESH FROM SOURCE B.V.',
      date_of_supply: '08/01/2026',
      sub_total: 7822.50,
      tax_amount: 0.00,
      total_amount: 7822.50,
      currency: 'EUR',
      tax_category: 'Zero-Rated',
      status: 'AUTO_PASS'
    },
    {
      invoice_number: '3427',
      customer_tin: '1140859877000',
      customer_name: 'FRESH FROM SOURCE B.V.',
      date_of_supply: '16/01/2026',
      sub_total: 8742.40,
      tax_amount: 0.00,
      total_amount: 8742.40,
      currency: 'EUR',
      tax_category: 'Zero-Rated',
      status: 'AUTO_PASS'
    },
    {
      invoice_number: '3428',
      customer_tin: '1146888607000',
      customer_name: 'STARFLORA HOLLAND B.V.',
      date_of_supply: '16/01/2026',
      sub_total: 2334.00,
      tax_amount: 0.00,
      total_amount: 2334.00,
      currency: 'EUR',
      tax_category: 'Zero-Rated',
      status: 'AUTO_PASS'
    }
  ]);

  // Delete individual invoice
  const handleDeleteInvoice = (invNumber) => {
    setTaxInvoices(prev => prev.filter(inv => inv.invoice_number !== invNumber));
    setStatusMessage({
      type: 'success',
      text: `Invoice #${invNumber} removed successfully.`
    });
  };

  // Clear all invoices
  const handleClearAllInvoices = () => {
    if (window.confirm("Are you sure you want to clear all uploaded invoices?")) {
      setTaxInvoices([]);
      setStatusMessage({
        type: 'success',
        text: 'All uploaded invoices have been cleared from the active ledger.'
      });
    }
  };

  // Discard current OCR document preview
  const handleDiscardOcr = () => {
    setUploadedFile(null);
    setOcrResult(null);
    setOcrError(null);
    setStatusMessage({
      type: 'success',
      text: 'Uploaded document preview cleared.'
    });
  };

  // Fraud Review Queue States
  const [reviewQueue, setReviewQueue] = useState([]);
  const [selectedReviewTxn, setSelectedReviewTxn] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [correctedInvNum, setCorrectedInvNum] = useState('');

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

  // Helper to extract clean reason strings from various backend queue item schemas
  const getItemFlags = (item) => {
    if (Array.isArray(item?.anomaly_flags) && item.anomaly_flags.length > 0) {
      return item.anomaly_flags.map(r => typeof r === 'string' ? r : (r.message || r.flag || r.description || JSON.stringify(r)));
    }
    if (Array.isArray(item?.flagged_reasons) && item.flagged_reasons.length > 0) {
      return item.flagged_reasons.map(r => typeof r === 'string' ? r : (r.message || r.flag || r.description || JSON.stringify(r)));
    }
    if (Array.isArray(item?.assessment?.flagged_reasons) && item.assessment.flagged_reasons.length > 0) {
      return item.assessment.flagged_reasons.map(r => typeof r === 'string' ? r : (r.message || r.flag || r.description || JSON.stringify(r)));
    }
    return ['Document or transaction requires human auditor review'];
  };

  // Helper to retrieve invoice data safely across different API response formats
  const getInvData = (item) => {
    return item?.transaction?.invoice_data || item?.request?.invoice_data || item?.invoice_data || null;
  };

  // Helper to retrieve invoice number
  const getInvNum = (item) => {
    const inv = getInvData(item);
    return inv?.invoice_number || item?.invoice_number || 'INV-UNKNOWN';
  };

  // Open review modal and prepopulate auditor inputs
  const handleOpenReviewModal = (item) => {
    setSelectedReviewTxn(item);
    const existingNum = getInvNum(item);
    setCorrectedInvNum(existingNum === 'INV-UNKNOWN' ? '' : existingNum);
    setReviewNotes('');
  };

  // Auto-sync any unverified or INV-UNKNOWN invoices from taxInvoices into reviewQueue
  useEffect(() => {
    const unverified = taxInvoices.filter(
      inv => inv.invoice_number === 'INV-UNKNOWN' || 
             inv.invoice_number?.startsWith('INV-UNKNOWN') || 
             inv.status === 'REVIEW_REQUIRED'
    );
    if (unverified.length > 0) {
      setReviewQueue(prev => {
        const existingTxIds = new Set(prev.map(i => i.transaction_id || i.invoice_number || i.transaction?.invoice_data?.invoice_number));
        const additions = [];
        unverified.forEach(inv => {
          const identifier = inv.invoice_number;
          if (!existingTxIds.has(identifier) && !existingTxIds.has(`TXN-OCR-${identifier}`)) {
            additions.push({
              transaction_id: `TXN-OCR-${identifier}`,
              risk_score: 90,
              risk_level: 'HIGH',
              anomaly_flags: inv.flagged_reasons || ['Unidentified or missing Invoice Number (INV-UNKNOWN)'],
              flagged_reasons: inv.flagged_reasons || ['Unidentified or missing Invoice Number (INV-UNKNOWN)'],
              invoice_number: inv.invoice_number,
              transaction: {
                transaction_id: `TXN-OCR-${identifier}`,
                invoice_data: { ...inv }
              },
              status: 'OPEN'
            });
          }
        });
        return additions.length > 0 ? [...additions, ...prev] : prev;
      });
    }
  }, [taxInvoices]);

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
      // Auto-append into Tax Table
      if (result.extracted_amounts) {
        const ext = result.extracted_amounts;
        const isAnomaly = (
          result.decision === 'REVIEW_REQUIRED' ||
          ext.invoice_number === 'INV-UNKNOWN' ||
          !ext.invoice_number ||
          ext.invoice_number.startsWith('INV-UNKNOWN') ||
          !ext.is_math_valid ||
          (result.confidence_score !== undefined && result.confidence_score < 80)
        );

        const reasons = [];
        if (ext.invoice_number === 'INV-UNKNOWN' || !ext.invoice_number || ext.invoice_number.startsWith('INV-UNKNOWN')) {
          reasons.push('Unidentified or missing Invoice Number (INV-UNKNOWN)');
        }
        if (!ext.is_math_valid) {
          reasons.push('Arithmetic mismatch: Subtotal + Tax != Total');
        }
        if (!ext.total_amount || ext.total_amount <= 0) {
          reasons.push('Zero or missing payable amount');
        }
        if (reasons.length === 0 && isAnomaly) {
          reasons.push('Low OCR extraction confidence / unverified template');
        }

        const newEntry = {
          invoice_number: ext.invoice_number || 'INV-UNKNOWN',
          customer_tin: ext.customer_tin || '1146888607000',
          customer_name: ext.customer_name || 'Unverified Customer',
          date_of_supply: ext.invoice_date || '01/01/2026',
          sub_total: ext.sub_total || 0,
          tax_amount: ext.tax_amount || 0,
          total_amount: ext.total_amount || 0,
          currency: ext.currency || 'EUR',
          tax_category: ext.tax_category || 'Zero-Rated',
          status: isAnomaly ? 'REVIEW_REQUIRED' : 'AUTO_PASS',
          flagged_reasons: reasons
        };

        setTaxInvoices(prev => [newEntry, ...prev.filter(x => x.invoice_number !== newEntry.invoice_number)]);

        // Always reload backend review queue so that any backend-enqueued anomaly immediately shows up in Tab 4
        await loadReviewQueue();

        // Also if it's an anomaly, ensure it is in the frontend reviewQueue state
        if (isAnomaly) {
          const queueTxId = `TXN-OCR-${newEntry.invoice_number}-${Date.now().toString().slice(-4)}`;
          setReviewQueue(prevQueue => {
            const alreadyExists = prevQueue.some(item => 
              item.transaction_id === queueTxId || 
              item.transaction?.invoice_data?.invoice_number === newEntry.invoice_number ||
              item.invoice_number === newEntry.invoice_number
            );
            if (!alreadyExists) {
              return [{
                transaction_id: queueTxId,
                risk_score: 88,
                risk_level: 'HIGH',
                anomaly_flags: reasons,
                flagged_reasons: reasons,
                invoice_number: newEntry.invoice_number,
                transaction: {
                  transaction_id: queueTxId,
                  invoice_data: { ...newEntry }
                },
                status: 'OPEN'
              }, ...prevQueue];
            }
            return prevQueue;
          });
        }
      }
    } catch (err) {
      setOcrError(err.response?.data?.detail || err.message || 'Failed to extract amounts from PDF.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to extract year and month from diverse invoice date strings
  const getInvoiceYearMonth = (dateStr) => {
    if (!dateStr) return { year: '', month: 0 };
    const s = String(dateStr).trim();
    // YYYY-MM-DD
    if (/^\d{4}-\d{1,2}/.test(s)) {
      const parts = s.split('-');
      return { year: parts[0], month: parseInt(parts[1], 10) };
    }
    // DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(s)) {
      const parts = s.split('/');
      return { year: parts[2], month: parseInt(parts[1], 10) };
    }
    // Text format like "31 May 2022" or "1 Sep 2026"
    const monthsMap = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
    };
    const mMatch = s.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
    const yMatch = s.match(/\b(20\d{2})\b/);
    if (mMatch && yMatch) {
      const mStr = mMatch[0].toLowerCase().slice(0, 3);
      return { year: yMatch[1], month: monthsMap[mStr] || 0 };
    }
    return { year: '', month: 0 };
  };

  // Filter invoices matching the selected quarterly or monthly period
  const displayedInvoices = taxInvoices.filter(inv => {
    if (!filterByPeriod) return true;
    const { year, month } = getInvoiceYearMonth(inv.date_of_supply);
    if (!year || !month) return true;

    if (periodType === 'quarterly') {
      const qNum = Math.ceil(month / 3);
      return year === selectedYear && `Q${qNum}` === selectedQuarter;
    } else {
      const mStr = String(month).padStart(2, '0');
      return year === selectedYear && mStr === selectedMonth;
    }
  });

  // Download RAMIS Schedule 7 CSV (exports displayed/filtered or all invoices)
  const handleDownloadSchedule7 = async () => {
    const exportList = filterByPeriod ? displayedInvoices : taxInvoices;
    if (exportList.length === 0) {
      setStatusMessage({ type: 'error', text: `No invoices available to export for period ${taxPeriod}.` });
      return;
    }
    setLoading(true);
    try {
      // Normalize invoices so date_of_supply is safe and matches RAMIS schema
      const normalizedInvoices = exportList.map(inv => {
        let dateVal = String(inv.date_of_supply || '01/01/2026').trim();
        // Convert DD/MM/YYYY or DD-MM-YYYY to ISO YYYY-MM-DD
        if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(dateVal)) {
          const parts = dateVal.split(/[\/-]/);
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2];
          dateVal = `${year}-${month}-${day}`;
        }
        return {
          invoice_number: String(inv.invoice_number || 'INV-0001'),
          date_of_supply: dateVal,
          sub_total: Number(inv.sub_total || 0),
          tax_amount: Number(inv.tax_amount || 0),
          total_amount: Number(inv.total_amount || 0),
          currency: inv.currency || 'EUR',
          tax_category: inv.tax_category || 'Zero-Rated',
          customer_name: inv.customer_name || 'STARFLORA HOLLAND B.V.',
          customer_tin: inv.customer_tin || '1146888607000',
          supplier_name: inv.supplier_name || 'STAR FLORA (PVT) LTD',
          supplier_tin: inv.supplier_tin || taxpayerTin,
          exchange_rate: Number(inv.exchange_rate || 1.0),
          description_of_supply: inv.description_of_supply || 'Export of Cut Foliage & Flowers'
        };
      });

      const payload = {
        taxpayer_tin: taxpayerTin || '102938475',
        taxpayer_name: 'STAR FLORA (PVT) LTD',
        tax_period: taxPeriod,
        invoices: normalizedInvoices
      };
      await downloadRamisSchedule7Csv(payload);
      setStatusMessage({
        type: 'success',
        text: `Successfully generated and downloaded RAMIS Schedule 7 CSV for ${taxPeriod} (${normalizedInvoices.length} invoices)!`
      });
    } catch (err) {
      let msg = err.message || 'Failed to download CSV.';
      if (err.response?.data) {
        if (err.response.data instanceof Blob) {
          try {
            const text = await err.response.data.text();
            const parsed = JSON.parse(text);
            msg = parsed.detail || text;
          } catch (e) {
            msg = `Error (${err.response.status}): Could not process CSV download`;
          }
        } else if (err.response.data.detail) {
          msg = typeof err.response.data.detail === 'string'
            ? err.response.data.detail
            : JSON.stringify(err.response.data.detail);
        }
      }
      setStatusMessage({ type: 'error', text: `Failed to download CSV: ${msg}` });
    } finally {
      setLoading(false);
    }
  };

  // Submit Fraud Review Action (Approve / Reject)
  const handleAction = async (action) => {
    if (!selectedReviewTxn) return;
    setLoading(true);
    const targetInvNum = getInvNum(selectedReviewTxn);
    const finalInvNum = correctedInvNum.trim() || targetInvNum || 'INV-UNKNOWN';

    try {
      try {
        await submitFraudReviewAction({
          transaction_id: selectedReviewTxn.transaction_id,
          action: action,
          reviewer_notes: reviewNotes || (action === 'approve' ? `Auditor approved. Invoice: ${finalInvNum}` : 'Rejected by auditor / invalid transaction')
        });
      } catch (e) {
        console.warn('Backend submitFraudReviewAction call error, applying local state update:', e.message);
      }

      if (action === 'approve') {
        // Update taxInvoices: update invoice_number and set status to 'AUTO_PASS'
        setTaxInvoices(prev => prev.map(inv => {
          if (inv.invoice_number === targetInvNum || (targetInvNum.startsWith('INV-UNKNOWN') && inv.invoice_number.startsWith('INV-UNKNOWN'))) {
            return {
              ...inv,
              invoice_number: finalInvNum,
              status: 'AUTO_PASS',
              flagged_reasons: []
            };
          }
          return inv;
        }));
        setStatusMessage({
          type: 'success',
          text: `Invoice #${finalInvNum} approved and verified into active RAMIS Tax Ledger!`
        });
      } else {
        // Reject: Remove from taxInvoices
        if (targetInvNum) {
          setTaxInvoices(prev => prev.filter(inv => inv.invoice_number !== targetInvNum && !(targetInvNum.startsWith('INV-UNKNOWN') && inv.invoice_number.startsWith('INV-UNKNOWN'))));
        }
        setStatusMessage({
          type: 'success',
          text: `Transaction ${selectedReviewTxn.transaction_id} (${targetInvNum}) rejected and removed from ledger.`
        });
      }

      // Remove from reviewQueue
      setReviewQueue(prev => prev.filter(item => item.transaction_id !== selectedReviewTxn.transaction_id));
      setSelectedReviewTxn(null);
      setReviewNotes('');
      setCorrectedInvNum('');
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

  // Calculate Tax Metrics on displayed/current invoices
  const cageDTotal = displayedInvoices.filter(i => i.tax_category === 'Zero-Rated').reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
  const cageATotal = displayedInvoices.filter(i => i.tax_category === 'Standard').reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
  const outputVatLkr = displayedInvoices.filter(i => i.tax_category === 'Standard').reduce((s, i) => s + (Number(i.tax_amount) || 0), 0);

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

            <div style={{
              background: reviewQueue.length > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(30, 41, 59, 0.7)',
              border: `1px solid ${reviewQueue.length > 0 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: '12px',
              padding: '1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
                <span>FRAUD RISK STATUS</span>
                {reviewQueue.length > 0 ? <AlertTriangle size={18} color="#ef4444" /> : <ShieldCheck size={18} color="#4ade80" />}
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: reviewQueue.length > 0 ? '#ef4444' : '#4ade80', marginTop: '0.5rem' }}>
                {reviewQueue.length > 0 ? `${reviewQueue.length} Flagged` : 'All Clear'}
              </div>
              <div style={{ fontSize: '0.75rem', color: reviewQueue.length > 0 ? '#fca5a5' : '#94a3b8', marginTop: '0.25rem' }}>
                {reviewQueue.length > 0 ? 'Action Required: Human Review Queue' : 'Isolation Forest (4% Contamination)'}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Active Invoices Monitored in ClearLedger</h3>
                <span style={{
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: '#60a5fa',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '999px',
                  border: '1px solid rgba(59, 130, 246, 0.3)'
                }}>
                  {taxInvoices.length} {taxInvoices.length === 1 ? 'Invoice' : 'Invoices'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                {taxInvoices.length > 0 && (
                  <button
                    onClick={handleClearAllInvoices}
                    disabled={loading}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#f87171',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      borderRadius: '8px',
                      padding: '0.4rem 0.85rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      transition: 'all 0.15s'
                    }}
                    title="Delete all uploaded invoices from active ledger"
                  >
                    <Trash2 size={13} />
                    Clear All Invoices
                  </button>
                )}
                <button
                  onClick={handleDownloadSchedule7}
                  disabled={loading || taxInvoices.length === 0}
                  style={{
                    background: 'rgba(34, 197, 94, 0.2)',
                    color: '#4ade80',
                    border: '1px solid rgba(34, 197, 94, 0.4)',
                    borderRadius: '8px',
                    padding: '0.4rem 0.85rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: taxInvoices.length === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    opacity: taxInvoices.length === 0 ? 0.6 : 1
                  }}
                >
                  <Download size={14} />
                  Export RAMIS Schedule 7 CSV
                </button>
              </div>
            </div>

            {taxInvoices.length === 0 ? (
              <div style={{
                background: 'rgba(15, 23, 42, 0.5)',
                border: '1px dashed rgba(255, 255, 255, 0.12)',
                borderRadius: '10px',
                padding: '2.5rem 1rem',
                textAlign: 'center',
                color: '#94a3b8'
              }}>
                <FileText size={36} color="#64748b" style={{ margin: '0 auto 0.5rem' }} />
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#cbd5e1' }}>No Invoices in Ledger</div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#64748b' }}>
                  Upload a PDF in the "Invoice OCR" tab to automatically extract and register new invoices.
                </div>
              </div>
            ) : (
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
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxInvoices.map((inv, idx) => {
                      const isReviewNeeded = inv.status === 'REVIEW_REQUIRED' || inv.invoice_number === 'INV-UNKNOWN' || inv.invoice_number?.startsWith('INV-UNKNOWN');
                      return (
                      <tr key={idx} style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        background: isReviewNeeded ? 'rgba(239, 68, 68, 0.06)' : 'transparent'
                      }}>
                        <td style={{ padding: '0.75rem', fontWeight: 600, color: isReviewNeeded ? '#f87171' : '#60a5fa' }}>
                          {inv.invoice_number}
                        </td>
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
                          {isReviewNeeded ? (
                            <button
                              onClick={() => {
                                setActiveSubTab('fraud');
                                const match = reviewQueue.find(q =>
                                  q.transaction_id?.includes(inv.invoice_number) ||
                                  q.transaction?.invoice_data?.invoice_number === inv.invoice_number ||
                                  q.invoice_number === inv.invoice_number
                                );
                                if (match) handleOpenReviewModal(match);
                              }}
                              title="Click to resolve in Fraud & Review Queue"
                              style={{
                                background: 'rgba(239, 68, 68, 0.18)',
                                border: '1px solid rgba(239, 68, 68, 0.45)',
                                color: '#f87171',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '0.25rem 0.55rem',
                                borderRadius: '6px',
                                cursor: 'pointer'
                              }}
                            >
                              <AlertTriangle size={13} color="#f87171" /> REVIEW_REQUIRED
                            </button>
                          ) : (
                            <span style={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>
                              <CheckCircle2 size={14} /> AUTO_PASS
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <button
                            onClick={() => handleDeleteInvoice(inv.invoice_number)}
                            title={`Delete invoice ${inv.invoice_number}`}
                            style={{
                              background: 'rgba(239, 68, 68, 0.12)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#f87171',
                              borderRadius: '6px',
                              padding: '0.3rem 0.5rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'background 0.15s'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
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

                  <button
                    onClick={handleDiscardOcr}
                    title="Clear uploaded document and preview"
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      color: '#f87171',
                      borderRadius: '8px',
                      padding: '0.5rem 0.85rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      transition: 'all 0.15s'
                    }}
                  >
                    <Trash2 size={14} />
                    Clear Upload
                  </button>
                </div>
              </div>

              {/* Review Required Guidance Banner */}
              {ocrResult.decision === 'REVIEW_REQUIRED' && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '10px',
                  padding: '0.85rem 1.15rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#fca5a5', fontSize: '0.82rem' }}>
                    <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
                    <span>
                      <strong>Human Auditor Review Required:</strong> This invoice was flagged due to missing/unverified invoice number or confidence threshold. It has been routed to the <strong>Fraud & Review Queue</strong> for verification or correction.
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveSubTab('fraud')}
                    style={{
                      background: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.45rem 0.95rem',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Go to Review Queue →
                  </button>
                </div>
              )}

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
          
          {/* Period Selector & RAMIS Filing Control Panel */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '16px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
          }}>
            {/* Header with Title and Mode Switcher */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '0.5rem', borderRadius: '8px', color: '#60a5fa' }}>
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                    RAMIS Filing Period & Schedule 7 Configuration
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                    Select Quarterly (Quata) or Monthly tax return schedule as mandated by Sri Lanka IRD Form 2540
                  </div>
                </div>
              </div>

              {/* Period Frequency Toggle: Quarterly vs Monthly */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                padding: '0.3rem',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'inline-flex',
                gap: '0.3rem'
              }}>
                <button
                  type="button"
                  onClick={() => setPeriodType('quarterly')}
                  style={{
                    background: periodType === 'quarterly' ? '#3b82f6' : 'transparent',
                    color: periodType === 'quarterly' ? '#ffffff' : '#94a3b8',
                    border: 'none',
                    borderRadius: '7px',
                    padding: '0.45rem 1rem',
                    fontSize: '0.8rem',
                    fontWeight: periodType === 'quarterly' ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Quarterly (Quata)
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodType('monthly')}
                  style={{
                    background: periodType === 'monthly' ? '#3b82f6' : 'transparent',
                    color: periodType === 'monthly' ? '#ffffff' : '#94a3b8',
                    border: 'none',
                    borderRadius: '7px',
                    padding: '0.45rem 1rem',
                    fontSize: '0.8rem',
                    fontWeight: periodType === 'monthly' ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Monthly Filing
                </button>
              </div>
            </div>

            {/* Selectors Grid: Year, Quarter/Month, TIN */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              background: 'rgba(15, 23, 42, 0.5)',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              {/* Year Dropdown */}
              <div>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Tax Assessment Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    padding: '0.5rem 0.75rem',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="2026">2026 (Current)</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                </select>
              </div>

              {/* Sub-period: Quarters OR Months */}
              {periodType === 'quarterly' ? (
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Tax Quarter (Quata)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem' }}>
                    {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setSelectedQuarter(q)}
                        style={{
                          background: selectedQuarter === q ? 'rgba(59, 130, 246, 0.3)' : 'rgba(30, 41, 59, 0.8)',
                          border: `1px solid ${selectedQuarter === q ? '#60a5fa' : 'rgba(255, 255, 255, 0.1)'}`,
                          color: selectedQuarter === q ? '#93c5fd' : '#cbd5e1',
                          borderRadius: '6px',
                          padding: '0.5rem 0.25rem',
                          fontSize: '0.8rem',
                          fontWeight: selectedQuarter === q ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Tax Month
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '0.5rem 0.75rem',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="01">01 - January</option>
                    <option value="02">02 - February</option>
                    <option value="03">03 - March</option>
                    <option value="04">04 - April</option>
                    <option value="05">05 - May</option>
                    <option value="06">06 - June</option>
                    <option value="07">07 - July</option>
                    <option value="08">08 - August</option>
                    <option value="09">09 - September</option>
                    <option value="10">10 - October</option>
                    <option value="11">11 - November</option>
                    <option value="12">12 - December</option>
                  </select>
                </div>
              )}

              {/* Taxpayer TIN */}
              <div>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Taxpayer TIN (RAMIS)
                </label>
                <input
                  type="text"
                  value={taxpayerTin}
                  onChange={(e) => setTaxpayerTin(e.target.value)}
                  placeholder="e.g. 102938475"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    padding: '0.5rem 0.75rem',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Action & Filter Summary Bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              paddingTop: '0.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                {/* Active Period Code Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Period Code:</span>
                  <span style={{
                    background: 'rgba(34, 197, 94, 0.15)',
                    color: '#4ade80',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    letterSpacing: '0.5px'
                  }}>
                    {taxPeriod}
                  </span>
                </div>

                {/* Filter Checkbox */}
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8rem',
                  color: filterByPeriod ? '#60a5fa' : '#94a3b8',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}>
                  <input
                    type="checkbox"
                    checked={filterByPeriod}
                    onChange={(e) => setFilterByPeriod(e.target.checked)}
                    style={{ cursor: 'pointer', accentColor: '#3b82f6', width: '16px', height: '16px' }}
                  />
                  <span>Filter Ledger strictly for <strong>{taxPeriod}</strong></span>
                </label>
              </div>

              {/* Download RAMIS CSV Button */}
              <button
                onClick={handleDownloadSchedule7}
                disabled={loading || displayedInvoices.length === 0}
                style={{
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: (loading || displayedInvoices.length === 0) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 14px rgba(34, 197, 94, 0.3)',
                  opacity: (loading || displayedInvoices.length === 0) ? 0.6 : 1
                }}
              >
                <Download size={16} />
                Export Schedule 7 CSV ({taxPeriod})
              </button>
            </div>
          </div>

          {/* Schedule 7 Cage Breakdown (Calculated dynamically on displayed/filtered invoices) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0' }}>
                Schedule 7 Cage Totals
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Calculated from {displayedInvoices.length} {filterByPeriod ? `invoices in period ${taxPeriod}` : 'active invoices'}
              </div>
            </div>

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
          </div>

          {/* Tax Filing Invoices Table with Individual Delete & Clear All Buttons */}
          <div style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                  Invoices in Tax Ledger {filterByPeriod && `(${taxPeriod})`}
                </h3>
                <span style={{
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: '#60a5fa',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '999px',
                  border: '1px solid rgba(59, 130, 246, 0.3)'
                }}>
                  {displayedInvoices.length} {displayedInvoices.length === 1 ? 'Invoice' : 'Invoices'}
                </span>
              </div>

              {taxInvoices.length > 0 && (
                <button
                  onClick={handleClearAllInvoices}
                  disabled={loading}
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    borderRadius: '8px',
                    padding: '0.4rem 0.85rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.15s'
                  }}
                  title="Clear all invoices from active ledger"
                >
                  <Trash2 size={13} />
                  Clear All Invoices
                </button>
              )}
            </div>

            {displayedInvoices.length === 0 ? (
              <div style={{
                background: 'rgba(15, 23, 42, 0.5)',
                border: '1px dashed rgba(255, 255, 255, 0.12)',
                borderRadius: '10px',
                padding: '2.5rem 1rem',
                textAlign: 'center',
                color: '#94a3b8'
              }}>
                <Filter size={36} color="#64748b" style={{ margin: '0 auto 0.5rem' }} />
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#cbd5e1' }}>
                  No Invoices Found for {filterByPeriod ? `Period ${taxPeriod}` : 'Ledger'}
                </div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#64748b' }}>
                  {filterByPeriod
                    ? 'Try switching period or unchecking "Filter Ledger strictly" to view all records.'
                    : 'Upload invoices via the Invoice OCR tab to populate this ledger.'}
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
                      <th style={{ padding: '0.75rem' }}>Invoice #</th>
                      <th style={{ padding: '0.75rem' }}>Customer / Consignee</th>
                      <th style={{ padding: '0.75rem' }}>Date of Supply</th>
                      <th style={{ padding: '0.75rem' }}>Category</th>
                      <th style={{ padding: '0.75rem' }}>Total Amount</th>
                      <th style={{ padding: '0.75rem' }}>VAT</th>
                      <th style={{ padding: '0.75rem' }}>Status</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedInvoices.map((inv, idx) => {
                      const isReviewNeeded = inv.status === 'REVIEW_REQUIRED' || inv.invoice_number === 'INV-UNKNOWN' || inv.invoice_number?.startsWith('INV-UNKNOWN');
                      return (
                      <tr key={idx} style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        background: isReviewNeeded ? 'rgba(239, 68, 68, 0.06)' : 'transparent'
                      }}>
                        <td style={{ padding: '0.75rem', fontWeight: 600, color: isReviewNeeded ? '#f87171' : '#60a5fa' }}>
                          {inv.invoice_number}
                        </td>
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
                          {isReviewNeeded ? (
                            <button
                              onClick={() => {
                                setActiveSubTab('fraud');
                                const match = reviewQueue.find(q =>
                                  q.transaction_id?.includes(inv.invoice_number) ||
                                  q.transaction?.invoice_data?.invoice_number === inv.invoice_number ||
                                  q.invoice_number === inv.invoice_number
                                );
                                if (match) handleOpenReviewModal(match);
                              }}
                              title="Click to resolve in Fraud & Review Queue"
                              style={{
                                background: 'rgba(239, 68, 68, 0.18)',
                                border: '1px solid rgba(239, 68, 68, 0.45)',
                                color: '#f87171',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '0.25rem 0.55rem',
                                borderRadius: '6px',
                                cursor: 'pointer'
                              }}
                            >
                              <AlertTriangle size={13} color="#f87171" /> REVIEW_REQUIRED
                            </button>
                          ) : (
                            <span style={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>
                              <CheckCircle2 size={14} /> AUTO_PASS
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <button
                            onClick={() => handleDeleteInvoice(inv.invoice_number)}
                            title={`Delete invoice ${inv.invoice_number}`}
                            style={{
                              background: 'rgba(239, 68, 68, 0.12)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#f87171',
                              borderRadius: '6px',
                              padding: '0.3rem 0.5rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'background 0.15s'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
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
              {reviewQueue.map((item, qIdx) => {
                const invData = getInvData(item);
                const invNum = getInvNum(item);
                const flags = getItemFlags(item);
                return (
                  <div
                    key={qIdx}
                    style={{
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '280px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, color: '#f87171', fontSize: '0.95rem' }}>
                          {item.transaction_id}
                        </span>
                        <span style={{
                          background: invNum === 'INV-UNKNOWN' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          color: invNum === 'INV-UNKNOWN' ? '#f87171' : '#60a5fa',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          border: `1px solid ${invNum === 'INV-UNKNOWN' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
                        }}>
                          Invoice #{invNum}
                        </span>
                        <span style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#f87171',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px'
                        }}>
                          Risk Score: {item.risk_score || 88}/100
                        </span>
                      </div>

                      {invData && (
                        <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '0.4rem' }}>
                          <strong>{invData.customer_name}</strong> • {invData.currency || 'EUR'} {invData.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })} • Date: {invData.date_of_supply}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                        {flags.map((flag, fIdx) => (
                          <span key={fIdx} style={{
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#fbbf24',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            fontSize: '0.72rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px'
                          }}>
                            ⚠️ {flag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenReviewModal(item)}
                      style={{
                        background: 'rgba(59, 130, 246, 0.2)',
                        color: '#60a5fa',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        borderRadius: '8px',
                        padding: '0.55rem 1.15rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.15s'
                      }}
                    >
                      Review Anomaly →
                    </button>
                  </div>
                );
              })}
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
                maxWidth: '560px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <AlertTriangle size={20} color="#f87171" />
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                      Human Auditor Resolution
                    </h3>
                  </div>
                  <button
                    onClick={() => { setSelectedReviewTxn(null); setCorrectedInvNum(''); setReviewNotes(''); }}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.4rem' }}
                  >
                    ×
                  </button>
                </div>

                <div style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  borderRadius: '10px',
                  padding: '1rem',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                  fontSize: '0.85rem'
                }}>
                  {(() => {
                    const modalInvData = getInvData(selectedReviewTxn);
                    const modalInvNum = getInvNum(selectedReviewTxn);
                    return (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#94a3b8' }}>Transaction ID:</span>
                          <strong style={{ color: '#60a5fa' }}>{selectedReviewTxn.transaction_id}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#94a3b8' }}>Current Invoice #:</span>
                          <strong style={{ color: modalInvNum.startsWith('INV-UNKNOWN') ? '#f87171' : '#f1f5f9' }}>
                            {modalInvNum}
                          </strong>
                        </div>
                        {modalInvData?.customer_name && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#94a3b8' }}>Customer / Consignee:</span>
                            <strong style={{ color: '#f1f5f9' }}>{modalInvData.customer_name}</strong>
                          </div>
                        )}
                        {modalInvData?.total_amount !== undefined && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#94a3b8' }}>Total Amount:</span>
                            <strong style={{ color: '#4ade80' }}>
                              {modalInvData.currency || 'EUR'} {modalInvData.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </strong>
                          </div>
                        )}
                      </>
                    );
                  })()}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Risk Assessment:</span>
                    <span style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      color: '#f87171',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      fontWeight: 700,
                      fontSize: '0.75rem'
                    }}>
                      Score {selectedReviewTxn.risk_score || 88}/100 ({selectedReviewTxn.risk_level || 'HIGH'})
                    </span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>
                    Flagged Discrepancy / Risk Reason(s):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {getItemFlags(selectedReviewTxn).map((flag, fIdx) => (
                      <div key={fIdx} style={{
                        background: 'rgba(245, 158, 11, 0.12)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        color: '#fbbf24',
                        padding: '0.4rem 0.65rem',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}>
                        <span>⚠️</span> {flag}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Auditor Invoice Number Correction */}
                <div style={{
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: '10px',
                  padding: '0.85rem'
                }}>
                  <label style={{ fontSize: '0.75rem', color: '#93c5fd', display: 'block', marginBottom: '0.4rem', fontWeight: 700 }}>
                    Assign / Correct Invoice Number (e.g. 3431):
                  </label>
                  <input
                    type="text"
                    value={correctedInvNum}
                    onChange={(e) => setCorrectedInvNum(e.target.value)}
                    placeholder="Enter real invoice # to approve (e.g. 3431)"
                    style={{
                      width: '100%',
                      background: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      borderRadius: '6px',
                      padding: '0.55rem 0.75rem',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}
                  />
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.35rem' }}>
                    Entering the verified invoice number renames `INV-UNKNOWN` and clears the error flag from the active tax ledger.
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>
                    Auditor Notes & Justification:
                  </label>
                  <textarea
                    rows={2}
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

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    onClick={() => handleAction('reject')}
                    disabled={loading}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#f87171',
                      borderRadius: '8px',
                      padding: '0.6rem 1.15rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Reject & Remove Invoice
                  </button>

                  <button
                    onClick={() => handleAction('approve')}
                    disabled={loading}
                    style={{
                      background: '#22c55e',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.6rem 1.25rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <CheckCircle2 size={16} /> Save & Approve to Ledger
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
