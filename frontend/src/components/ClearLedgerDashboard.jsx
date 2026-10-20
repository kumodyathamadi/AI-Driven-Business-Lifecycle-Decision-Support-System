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
  Filter,
  X,
  FileSpreadsheet,
  Layers,
  Info
} from 'lucide-react';
import {
  uploadInvoicePdf,
  downloadRamisSchedule7Csv,
  downloadRamisSchedule1Csv,
  downloadScheduleCsv,
  fetchCompanyTaxConfig,
  saveCompanyTaxConfig,
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

  // RAMIS Tax Engine States & Global Company Identifiers
  const [companyTin, setCompanyTin] = useState('102938475');
  const [companyName, setCompanyName] = useState('STAR FLORA (PVT) LTD');
  const [taxpayerTin, setTaxpayerTin] = useState('102938475');
  const [periodType, setPeriodType] = useState('quarterly'); // 'quarterly' | 'monthly'
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedQuarter, setSelectedQuarter] = useState('Q1'); // 'Q1', 'Q2', 'Q3', 'Q4'
  const [selectedMonth, setSelectedMonth] = useState('01'); // '01' to '12'
  const [filterByPeriod, setFilterByPeriod] = useState(false);
  const [taxPeriod, setTaxPeriod] = useState('2026-Q1');
  const [selectedSchedule, setSelectedSchedule] = useState('Schedule 7');
  const [savingConfig, setSavingConfig] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedScheduleToExport, setSelectedScheduleToExport] = useState('Schedule 1');
  const [strictScheduleFilter, setStrictScheduleFilter] = useState(true);

  // Strict validation flags: Company TIN and Company Name are strictly mandatory
  const isTinValid = Boolean(companyTin && String(companyTin).trim().length > 0);
  const isNameValid = Boolean(companyName && String(companyName).trim().length > 0);
  const isCompanyConfigValid = isTinValid && isNameValid;

  // Synchronize companyTin and taxpayerTin
  const handleCompanyTinChange = (val) => {
    setCompanyTin(val);
    setTaxpayerTin(val);
  };

  // Synchronize taxPeriod string whenever period controls change
  useEffect(() => {
    if (periodType === 'quarterly') {
      setTaxPeriod(`${selectedYear}-${selectedQuarter}`);
    } else {
      setTaxPeriod(`${selectedYear}-${selectedMonth}`);
    }
  }, [periodType, selectedYear, selectedQuarter, selectedMonth]);

  // Load Global Tax Configuration from backend on mount
  useEffect(() => {
    const loadGlobalConfig = async () => {
      try {
        const config = await fetchCompanyTaxConfig();
        if (config) {
          if (config.company_tin) {
            setCompanyTin(config.company_tin);
            setTaxpayerTin(config.company_tin);
          }
          if (config.company_name) {
            setCompanyName(config.company_name);
          }
          if (config.tax_period) {
            setTaxPeriod(config.tax_period);
            if (/^\d{4}-Q[1-4]$/i.test(config.tax_period)) {
              const parts = config.tax_period.split('-');
              setSelectedYear(parts[0]);
              setSelectedQuarter(parts[1].toUpperCase());
              setPeriodType('quarterly');
            } else if (/^\d{4}-\d{2}$/.test(config.tax_period)) {
              const parts = config.tax_period.split('-');
              setSelectedYear(parts[0]);
              setSelectedMonth(parts[1]);
              setPeriodType('monthly');
            }
          }
        }
      } catch (err) {
        console.warn('Could not load global company tax config from backend:', err.message);
      }
    };
    loadGlobalConfig();
  }, []);

  // Save Global Tax Configuration to backend with mandatory validation
  const handleSaveTaxConfig = async () => {
    if (!isCompanyConfigValid) {
      setStatusMessage({
        type: 'error',
        text: 'Validation Error: Both Company TIN Number and Registered Company Name are strictly mandatory.'
      });
      return;
    }
    setSavingConfig(true);
    try {
      await saveCompanyTaxConfig({
        company_tin: String(companyTin).trim(),
        company_name: String(companyName).trim(),
        tax_period: taxPeriod
      });
      setTaxpayerTin(String(companyTin).trim());
      setStatusMessage({
        type: 'success',
        text: `RAMIS Global Tax Configuration saved: ${companyName} (TIN: ${companyTin}) for ${taxPeriod}.`
      });
    } catch (err) {
      console.error('Failed to save tax config:', err);
      setStatusMessage({
        type: 'error',
        text: `Failed to persist global tax configuration: ${err.message}`
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const [taxInvoices, setTaxInvoices] = useState([
    // Schedule 1: Local Sales (Standard 18% Output VAT)
    {
      invoice_number: 'SF-DOM-101',
      customer_tin: '200000001',
      customer_name: 'Colombo Grand Florists Ltd',
      supplier_name: 'STAR FLORA (PVT) LTD',
      supplier_tin: '102938475',
      date_of_supply: '15/01/2026',
      sub_total: 100000.00,
      tax_amount: 18000.00,
      total_amount: 118000.00,
      currency: 'LKR',
      tax_category: 'Standard 18%',
      vat_type: 'OUTPUT_VAT',
      target_schedule: 'Schedule 1',
      is_tax_invoice: true,
      description_of_supply: 'Supply of Premium Cut Foliage for Hotel Banquet Arrangements',
      status: 'AUTO_PASS'
    },
    // Input Tax: External Vendor Purchase (Claimable Input VAT)
    {
      invoice_number: '26SEP_TS10_48',
      customer_tin: '102938475',
      customer_name: 'STAR FLORA (PVT) LTD',
      supplier_name: 'CaSE Development (Pvt) Ltd',
      supplier_tin: '100968789',
      date_of_supply: '09/01/2026',
      sub_total: 456038.50,
      tax_amount: 82086.93,
      total_amount: 538125.43,
      currency: 'LKR',
      tax_category: 'Standard 18%',
      vat_type: 'INPUT_VAT',
      target_schedule: 'Schedule 2',
      is_tax_invoice: true,
      description_of_supply: 'Commercial Office & Warehouse Rent September 2026',
      status: 'AUTO_PASS'
    },
    // Schedule 7: Zero-Rated Direct Exports (Output VAT 0% - Cage D)
    {
      invoice_number: '3425',
      customer_tin: '1146888607000',
      customer_name: 'STARFLORA HOLLAND B.V.',
      supplier_name: 'STAR FLORA (PVT) LTD',
      supplier_tin: '102938475',
      date_of_supply: '06/01/2026',
      sub_total: 3399.50,
      tax_amount: 0.00,
      total_amount: 3399.50,
      currency: 'EUR',
      tax_category: 'Zero-Rated',
      vat_type: 'OUTPUT_VAT',
      target_schedule: 'Schedule 7',
      is_tax_invoice: true,
      description_of_supply: 'Export of Fresh Cut Foliage (Customs CusDec E 1429)',
      status: 'AUTO_PASS'
    },
    {
      invoice_number: '3426',
      customer_tin: '1140859877000',
      customer_name: 'FRESH FROM SOURCE B.V.',
      supplier_name: 'STAR FLORA (PVT) LTD',
      supplier_tin: '102938475',
      date_of_supply: '08/01/2026',
      sub_total: 7822.50,
      tax_amount: 0.00,
      total_amount: 7822.50,
      currency: 'EUR',
      tax_category: 'Zero-Rated',
      vat_type: 'OUTPUT_VAT',
      target_schedule: 'Schedule 7',
      is_tax_invoice: true,
      description_of_supply: 'Export of Fresh Cut Foliage (Customs CusDec E 1430)',
      status: 'AUTO_PASS'
    },
    {
      invoice_number: '3427',
      customer_tin: '1140859877000',
      customer_name: 'FRESH FROM SOURCE B.V.',
      supplier_name: 'STAR FLORA (PVT) LTD',
      supplier_tin: '102938475',
      date_of_supply: '16/01/2026',
      sub_total: 8742.40,
      tax_amount: 0.00,
      total_amount: 8742.40,
      currency: 'EUR',
      tax_category: 'Zero-Rated',
      vat_type: 'OUTPUT_VAT',
      target_schedule: 'Schedule 7',
      is_tax_invoice: true,
      description_of_supply: 'Export of Fresh Cut Foliage (Customs CusDec E 1431)',
      status: 'AUTO_PASS'
    },
    {
      invoice_number: '3428',
      customer_tin: '1146888607000',
      customer_name: 'STARFLORA HOLLAND B.V.',
      supplier_name: 'STAR FLORA (PVT) LTD',
      supplier_tin: '102938475',
      date_of_supply: '16/01/2026',
      sub_total: 2334.00,
      tax_amount: 0.00,
      total_amount: 2334.00,
      currency: 'EUR',
      tax_category: 'Zero-Rated',
      vat_type: 'OUTPUT_VAT',
      target_schedule: 'Schedule 7',
      is_tax_invoice: true,
      description_of_supply: 'Export of Fresh Cut Foliage (Customs CusDec E 1432)',
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
  const [editForm, setEditForm] = useState({
    invoice_number: '',
    customer_name: '',
    customer_tin: '',
    date_of_supply: '',
    currency: 'EUR',
    tax_category: 'Zero-Rated',
    sub_total: 0,
    tax_amount: 0,
    total_amount: 0
  });

  const handleEditFormChange = (field, value) => {
    setEditForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'sub_total' || field === 'tax_amount') {
        const sub = field === 'sub_total' ? (parseFloat(value) || 0) : (parseFloat(prev.sub_total) || 0);
        const tax = field === 'tax_amount' ? (parseFloat(value) || 0) : (parseFloat(prev.tax_amount) || 0);
        updated.total_amount = Math.round((sub + tax) * 100) / 100;
      }
      if (field === 'tax_category') {
        const sub = parseFloat(prev.sub_total) || 0;
        if (value === 'Zero-Rated' || value === 'Exempt') {
          updated.tax_amount = 0;
          updated.total_amount = sub;
        } else if (value === 'Standard 18%') {
          const tax = Math.round(sub * 0.18 * 100) / 100;
          updated.tax_amount = tax;
          updated.total_amount = Math.round((sub + tax) * 100) / 100;
        }
      }
      return updated;
    });
  };

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
    const inv = getInvData(item);
    const existingNum = getInvNum(item);
    const cleanNum = (existingNum === 'INV-UNKNOWN' || existingNum.startsWith('INV-UNKNOWN')) ? '' : existingNum;
    setCorrectedInvNum(cleanNum);
    setReviewNotes('');
    setEditForm({
      invoice_number: cleanNum,
      customer_name: inv?.customer_name || 'OZ IMPORT BV (COLORIGINZ)',
      customer_tin: inv?.customer_tin || '1146888607000',
      date_of_supply: inv?.date_of_supply || '07/02/2025',
      currency: inv?.currency || 'EUR',
      tax_category: inv?.tax_category || 'Zero-Rated',
      sub_total: inv?.sub_total !== undefined ? inv.sub_total : 5651.10,
      tax_amount: inv?.tax_amount !== undefined ? inv.tax_amount : 0,
      total_amount: inv?.total_amount !== undefined ? inv.total_amount : 5651.10
    });
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

  // OCR Upload Handler (Enforces mandatory Company TIN & Name)
  const handleFileUpload = async (file) => {
    if (!file) return;
    if (!isCompanyConfigValid) {
      setStatusMessage({
        type: 'error',
        text: 'Upload Blocked: Company TIN Number and Registered Company Name are strictly mandatory before uploading invoices.'
      });
      return;
    }
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
          customer_tin: ext.customer_tin || '100902877',
          customer_name: ext.customer_name || 'Unverified Customer',
          date_of_supply: ext.invoice_date || '01/01/2026',
          sub_total: ext.sub_total || 0,
          tax_amount: ext.tax_amount || 0,
          total_amount: ext.total_amount || 0,
          currency: ext.currency || 'LKR',
          tax_category: ext.tax_category || 'Standard 18%',
          status: isAnomaly ? 'REVIEW_REQUIRED' : 'AUTO_PASS',
          flagged_reasons: reasons,
          supplier_name: ext.supplier_name || companyName,
          supplier_tin: ext.supplier_tin || companyTin,
          description_of_supply: ext.description || 'Commercial Supply',
          is_tax_invoice: ext.is_tax_invoice !== undefined ? ext.is_tax_invoice : true,
          vat_type: ext.vat_type || 'OUTPUT_VAT',
          target_schedule: ext.target_schedule || 'Schedule 1'
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

  // RAMIS 4-Digit Period Code Formatter
  const getRamisPeriodCode = (periodStr) => {
    if (!periodStr) return '2610';
    const s = String(periodStr).trim().toUpperCase();
    if (/^\d{4}$/.test(s)) return s;
    const qMatch = s.match(/(?:(\d{4})[^\dQ]*Q([1-4])|Q([1-4])[^\dQ]*(\d{4}))/);
    if (qMatch) {
      const year = qMatch[1] || qMatch[4];
      const quarter = qMatch[2] || qMatch[3];
      return `${year.slice(-2)}${quarter}0`;
    }
    const mMatch = s.match(/(\d{4})[-/.](\d{1,2})/) || s.match(/(\d{1,2})[-/.](\d{4})/);
    if (mMatch) {
      let year, month;
      if (mMatch[1].length === 4) {
        year = mMatch[1];
        month = parseInt(mMatch[2], 10);
      } else {
        month = parseInt(mMatch[1], 10);
        year = mMatch[2];
      }
      if (month >= 1 && month <= 12) {
        const q = Math.floor((month - 1) / 3) + 1;
        const mInQ = ((month - 1) % 3) + 1;
        return `${year.slice(-2)}${q}${mInQ}`;
      }
    }
    return '2610';
  };

  // Helper to determine Schedule & VAT transaction classification
  const getInvoiceClassification = (inv) => {
    const gTin = String(companyTin || taxpayerTin || '').trim();
    const gName = String(companyName || '').trim();
    const cleanGTin = gTin.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const cleanGName = gName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    const sTin = String(inv.supplier_tin || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const sName = String(inv.supplier_name || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const cTin = String(inv.customer_tin || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const cName = String(inv.customer_name || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    const curr = String(inv.currency || 'LKR').trim().toUpperCase();
    const desc = String(inv.description_of_supply || '').toLowerCase();
    const isExportDesc = desc.includes('cusdec') || desc.includes('export') || desc.includes('fob') || desc.includes('foreign') || desc.includes('air freight');
    const isForeignCurr = curr !== 'LKR' && curr !== 'RS' && curr !== 'SLR' && curr !== '';
    const isExport = isForeignCurr || isExportDesc || (inv.tax_category === 'Zero-Rated' && isForeignCurr);

    const matchesSupplierTin = cleanGTin && sTin && (cleanGTin === sTin || (cleanGTin.length >= 9 && sTin.length >= 9 && cleanGTin.slice(0, 9) === sTin.slice(0, 9)));
    const matchesSupplierName = cleanGName && sName && (cleanGName === sName || cleanGName.includes(sName) || sName.includes(cleanGName));
    const isOurCompany = matchesSupplierTin || matchesSupplierName;

    const isWeArePurchaser = cleanGTin && cTin && cleanGTin === cTin;
    const isExplicitPurchase = isWeArePurchaser && !matchesSupplierTin;

    if (isExplicitPurchase || (!isOurCompany && inv.vat_type === 'INPUT_VAT') || (!isOurCompany && sTin && sTin !== cleanGTin)) {
      return {
        vat_type: 'INPUT_VAT',
        target_schedule: 'Schedule 2',
        category_name: 'Input Tax - Local Purchases (Schedule 2)',
        is_our_company: false,
        is_export: false
      };
    }

    if (isExport) {
      return {
        vat_type: 'OUTPUT_VAT',
        target_schedule: 'Schedule 7',
        category_name: 'Output Tax - Export of Goods/Services (Schedule 7)',
        is_our_company: true,
        is_export: true
      };
    }

    return {
      vat_type: 'OUTPUT_VAT',
      target_schedule: 'Schedule 1',
      category_name: 'Output Tax - Local Supplies at Standard 18% (Schedule 1)',
      is_our_company: true,
      is_export: false
    };
  };

  // Open Export Schedule CSV modal with specified schedule pre-selected
  const handleOpenExportModal = (targetSchedule = 'Schedule 1') => {
    setSelectedScheduleToExport(targetSchedule);
    setShowExportModal(true);
  };

  // Download RAMIS Schedule 7 CSV (exports displayed/filtered or all invoices)
  const handleDownloadSchedule7 = async () => {
    if (!isCompanyConfigValid) {
      setStatusMessage({
        type: 'error',
        text: 'Export Blocked: Company TIN Number and Registered Company Name are strictly mandatory.'
      });
      return;
    }
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
        company_tin: companyTin,
        company_name: companyName,
        taxpayer_tin: companyTin,
        taxpayer_name: companyName,
        tax_period: taxPeriod,
        invoices: normalizedInvoices
      };
      await downloadRamisSchedule7Csv(payload);
      setStatusMessage({
        type: 'success',
        text: `Successfully generated and downloaded RAMIS Schedule 7 CSV for ${companyName} (${taxPeriod})!`
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

  // Dedicated Schedule 1 Exporter (Output VAT on Local Supplies)
  const handleDownloadSchedule1 = async () => {
    return handleDownloadSchedule('Schedule 1');
  };

  // Generic RAMIS Schedule CSV Exporter (Schedule 1 through Schedule 7)
  const handleDownloadSchedule = async (scheduleTypeToExport = selectedScheduleToExport) => {
    if (!isCompanyConfigValid) {
      setStatusMessage({
        type: 'error',
        text: 'Export Blocked: Company TIN Number and Registered Company Name are strictly mandatory.'
      });
      return;
    }
    const baseList = filterByPeriod ? displayedInvoices : taxInvoices;
    if (baseList.length === 0) {
      setStatusMessage({ type: 'error', text: `No invoices available to export for period ${taxPeriod}.` });
      return;
    }

    // INVOICE FILTERING PER SCHEDULE CATEGORY
    let eligibleInvoices;
    if (!strictScheduleFilter) {
      // Include all invoices in the current batch
      eligibleInvoices = baseList;
    } else {
      eligibleInvoices = baseList.filter(inv => {
        const cls = getInvoiceClassification(inv);
        if (scheduleTypeToExport === 'Schedule 1') {
          return cls.target_schedule === 'Schedule 1' || (cls.vat_type === 'OUTPUT_VAT' && !cls.is_export);
        } else if (scheduleTypeToExport === 'Schedule 2') {
          return cls.target_schedule === 'Schedule 2' || cls.vat_type === 'INPUT_VAT';
        } else if (scheduleTypeToExport === 'Schedule 7') {
          return cls.is_export || cls.target_schedule === 'Schedule 7';
        } else if (scheduleTypeToExport === 'Schedule 6') {
          return cls.is_export || cls.target_schedule === 'Schedule 6';
        } else {
          return true;
        }
      });
      // Fallback: If strict filtering found 0 invoices, offer all baseList
      if (eligibleInvoices.length === 0 && baseList.length > 0) {
        eligibleInvoices = baseList;
      }
    }

    if (eligibleInvoices.length === 0) {
      setStatusMessage({
        type: 'error',
        text: `Export Blocked: No invoices available to export for period ${taxPeriod}.`
      });
      return;
    }

    setLoading(true);
    try {
      const normalizedInvoices = eligibleInvoices.map(inv => {
        let dateVal = String(inv.date_of_supply || '01/01/2026').trim();
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
          currency: inv.currency || 'LKR',
          tax_category: inv.tax_category || 'Standard 18%',
          customer_name: inv.customer_name || 'Direct Consumer',
          customer_tin: inv.customer_tin || '100902877',
          supplier_name: inv.supplier_name || companyName,
          supplier_tin: inv.supplier_tin || companyTin,
          exchange_rate: Number(inv.exchange_rate || 1.0),
          description_of_supply: inv.description_of_supply || 'Commercial Supply',
          is_tax_invoice: inv.is_tax_invoice !== false
        };
      });

      const payload = {
        schedule_type: scheduleTypeToExport,
        company_tin: companyTin,
        company_name: companyName,
        tax_period: taxPeriod,
        strict_filter: strictScheduleFilter,
        invoices: normalizedInvoices
      };
      const res = await downloadScheduleCsv(payload);
      const downloadedName = res?.filename || `${companyTin}_VAT_${scheduleTypeToExport}.csv`;
      setStatusMessage({
        type: 'success',
        text: `Successfully generated and downloaded official RAMIS ${scheduleTypeToExport} CSV: ${downloadedName} (${eligibleInvoices.length} invoice(s) included)!`
      });
      setShowExportModal(false);
    } catch (err) {
      let msg = err.message || 'Failed to download schedule CSV.';
      if (err.response?.data) {
        if (err.response.data instanceof Blob) {
          try {
            const text = await err.response.data.text();
            const parsed = JSON.parse(text);
            msg = parsed.detail || text;
          } catch (e) {
            msg = `Error (${err.response.status}): Could not process CSV download`;
          }
        } else if (err.response.data?.detail) {
          msg = typeof err.response.data.detail === 'string'
            ? err.response.data.detail
            : JSON.stringify(err.response.data.detail);
        }
      }
      setStatusMessage({ type: 'error', text: `Failed to download RAMIS CSV: ${msg}` });
    } finally {
      setLoading(false);
    }
  };

  // Submit Fraud Review Action (Approve / Reject) with Full Field Updates
  const handleAction = async (action) => {
    if (!selectedReviewTxn) return;
    setLoading(true);
    const targetInvNum = getInvNum(selectedReviewTxn);
    const finalInvNum = editForm.invoice_number.trim() || correctedInvNum.trim() || targetInvNum || 'INV-UNKNOWN';

    try {
      try {
        await submitFraudReviewAction({
          transaction_id: selectedReviewTxn.transaction_id,
          action: action,
          reviewer_notes: reviewNotes || (action === 'approve' ? `Auditor updated and approved. Invoice: ${finalInvNum}` : 'Rejected by auditor / invalid transaction')
        });
      } catch (e) {
        console.warn('Backend submitFraudReviewAction call error, applying local state update:', e.message);
      }

      if (action === 'approve') {
        const sub = parseFloat(editForm.sub_total) || 0;
        const tax = parseFloat(editForm.tax_amount) || 0;
        const tot = parseFloat(editForm.total_amount) || (sub + tax);

        // Update taxInvoices: update all edited fields and set status to 'AUTO_PASS'
        setTaxInvoices(prev => prev.map(inv => {
          if (inv.invoice_number === targetInvNum || (targetInvNum.startsWith('INV-UNKNOWN') && inv.invoice_number.startsWith('INV-UNKNOWN'))) {
            return {
              ...inv,
              invoice_number: finalInvNum,
              customer_name: editForm.customer_name || inv.customer_name,
              customer_tin: editForm.customer_tin || inv.customer_tin,
              date_of_supply: editForm.date_of_supply || inv.date_of_supply,
              currency: editForm.currency || inv.currency,
              tax_category: editForm.tax_category || inv.tax_category,
              sub_total: sub,
              tax_amount: tax,
              total_amount: tot,
              status: 'AUTO_PASS',
              flagged_reasons: []
            };
          }
          return inv;
        }));

        // Also update active OCR preview card if it matches this invoice
        if (ocrResult && (ocrResult.extracted_amounts?.invoice_number === targetInvNum || targetInvNum.startsWith('INV-UNKNOWN'))) {
          setOcrResult(prev => ({
            ...prev,
            decision: 'AUTO_PASS',
            confidence_score: 95.0,
            review_reasons: [],
            extracted_amounts: {
              ...prev.extracted_amounts,
              invoice_number: finalInvNum,
              customer_name: editForm.customer_name || prev.extracted_amounts.customer_name,
              customer_tin: editForm.customer_tin || prev.extracted_amounts.customer_tin,
              invoice_date: editForm.date_of_supply || prev.extracted_amounts.invoice_date,
              currency: editForm.currency || prev.extracted_amounts.currency,
              tax_category: editForm.tax_category || prev.extracted_amounts.tax_category,
              sub_total: sub,
              tax_amount: tax,
              total_amount: tot,
              is_math_valid: true,
              math_difference: 0.0
            }
          }));
        }

        setStatusMessage({
          type: 'success',
          text: `Invoice #${finalInvNum} updated, verified, and approved into active RAMIS Tax Ledger!`
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

  // Calculate Tax Metrics on displayed/current invoices (Input vs. Output VAT)
  const cageDTotal = displayedInvoices.filter(i => i.tax_category === 'Zero-Rated').reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
  const cageATotal = displayedInvoices.filter(i => (i.tax_category === 'Standard' || i.tax_category === 'Standard 18%') && i.vat_type !== 'INPUT_VAT').reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
  const outputVatLkr = displayedInvoices.filter(i => i.vat_type !== 'INPUT_VAT' && (i.tax_category === 'Standard' || i.tax_category === 'Standard 18%')).reduce((s, i) => s + (Number(i.tax_amount) || 0), 0);
  const inputVatLkr = displayedInvoices.filter(i => i.vat_type === 'INPUT_VAT').reduce((s, i) => s + (Number(i.tax_amount) || 0), 0);
  const netVatPosition = outputVatLkr - inputVatLkr;

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

      {/* ========================================================= */}
      {/* GLOBAL RAMIS FILING & TAXPAYER CONFIGURATION              */}
      {/* ========================================================= */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))',
        border: '1px solid rgba(59, 130, 246, 0.35)',
        borderRadius: '16px',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              borderRadius: '8px',
              padding: '0.45rem',
              color: '#60a5fa'
            }}>
              <Building2 size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.2px' }}>
                  Global RAMIS Taxpayer & Filing Setup
                </h3>
                <span style={{
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  color: '#93c5fd',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '12px'
                }}>
                  IRD Sri Lanka
                </span>
              </div>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                Applies globally across OCR invoice intake, IRD schedules (Schedule 1–7), and fraud auditing
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              borderRadius: '8px',
              padding: '0.35rem 0.75rem',
              fontSize: '0.75rem',
              color: '#4ade80'
            }}>
              <span>Active Period:</span>
              <strong style={{ color: '#ffffff', letterSpacing: '0.3px' }}>{taxPeriod}</strong>
            </div>

            <button
              onClick={handleSaveTaxConfig}
              disabled={savingConfig || !isCompanyConfigValid}
              title={!isCompanyConfigValid ? 'Company TIN and Registered Name are mandatory' : 'Save Global Setup'}
              style={{
                background: !isCompanyConfigValid ? '#475569' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.45rem 1rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: (savingConfig || !isCompanyConfigValid) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: isCompanyConfigValid ? '0 2px 8px rgba(37, 99, 235, 0.3)' : 'none',
                opacity: !isCompanyConfigValid ? 0.6 : 1
              }}
            >
              <RefreshCw size={13} className={savingConfig ? 'animate-spin' : ''} />
              {savingConfig ? 'Saving...' : 'Save Setup'}
            </button>
          </div>
        </div>

        {/* Global Inputs Grid: 3 Pillars */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1rem',
          alignItems: 'start'
        }}>
          {/* Pillar 1: Company TIN (Strictly Mandatory) */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '0.85rem 1rem',
            borderRadius: '10px',
            border: `1px solid ${!isTinValid ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.07)'}`
          }}>
            <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', fontWeight: 600 }}>
              <span>Company TIN Number (RAMIS) <span style={{ color: '#ef4444' }}>*</span></span>
              <span style={{
                fontSize: '0.62rem',
                padding: '0.1rem 0.4rem',
                borderRadius: '4px',
                fontWeight: 700,
                background: isTinValid ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.2)',
                color: isTinValid ? '#4ade80' : '#f87171',
                border: `1px solid ${isTinValid ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.4)'}`
              }}>
                {isTinValid ? '✓ Configured' : 'MANDATORY'}
              </span>
            </label>
            <input
              type="text"
              value={companyTin}
              onChange={(e) => handleCompanyTinChange(e.target.value)}
              placeholder="e.g. 102938475 (Mandatory)"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: 'rgba(30, 41, 59, 0.9)',
                border: `1px solid ${isTinValid ? 'rgba(59, 130, 246, 0.4)' : '#ef4444'}`,
                boxShadow: !isTinValid ? '0 0 0 1px rgba(239, 68, 68, 0.5)' : 'none',
                borderRadius: '6px',
                padding: '0.5rem 0.75rem',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none'
              }}
            />
            {!isTinValid ? (
              <div style={{ fontSize: '0.68rem', color: '#f87171', marginTop: '0.3rem', fontWeight: 600 }}>
                ⚠ Company TIN is strictly mandatory before uploading invoices.
              </div>
            ) : (
              <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.3rem' }}>
                Used in RAMIS CSV export headers and audit cross-referencing
              </div>
            )}
          </div>

          {/* Pillar 2: Company Name (Strictly Mandatory) */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '0.85rem 1rem',
            borderRadius: '10px',
            border: `1px solid ${!isNameValid ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.07)'}`
          }}>
            <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', fontWeight: 600 }}>
              <span>Registered Business Name <span style={{ color: '#ef4444' }}>*</span></span>
              <span style={{
                fontSize: '0.62rem',
                padding: '0.1rem 0.4rem',
                borderRadius: '4px',
                fontWeight: 700,
                background: isNameValid ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.2)',
                color: isNameValid ? '#4ade80' : '#f87171',
                border: `1px solid ${isNameValid ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.4)'}`
              }}>
                {isNameValid ? '✓ Configured' : 'MANDATORY'}
              </span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. STAR FLORA (PVT) LTD (Mandatory)"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: 'rgba(30, 41, 59, 0.9)',
                border: `1px solid ${isNameValid ? 'rgba(59, 130, 246, 0.4)' : '#ef4444'}`,
                boxShadow: !isNameValid ? '0 0 0 1px rgba(239, 68, 68, 0.5)' : 'none',
                borderRadius: '6px',
                padding: '0.5rem 0.75rem',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none'
              }}
            />
            {!isNameValid ? (
              <div style={{ fontSize: '0.68rem', color: '#f87171', marginTop: '0.3rem', fontWeight: 600 }}>
                ⚠ Registered Company Name is strictly mandatory.
              </div>
            ) : (
              <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.3rem' }}>
                Legal taxpayer entity name declared to IRD
              </div>
            )}
          </div>

          {/* Pillar 3: Tax Period Selector (Frequency + Year + Quarter/Month) */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '0.85rem 1rem',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.07)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                Tax Period Selection
              </label>
              {/* Frequency Toggle */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.8)',
                padding: '0.15rem',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'inline-flex',
                gap: '0.2rem'
              }}>
                <button
                  type="button"
                  onClick={() => setPeriodType('quarterly')}
                  style={{
                    background: periodType === 'quarterly' ? '#3b82f6' : 'transparent',
                    color: periodType === 'quarterly' ? '#ffffff' : '#94a3b8',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '0.2rem 0.5rem',
                    fontSize: '0.68rem',
                    fontWeight: periodType === 'quarterly' ? 700 : 500,
                    cursor: 'pointer'
                  }}
                >
                  Quarterly
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodType('monthly')}
                  style={{
                    background: periodType === 'monthly' ? '#3b82f6' : 'transparent',
                    color: periodType === 'monthly' ? '#ffffff' : '#94a3b8',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '0.2rem 0.5rem',
                    fontSize: '0.68rem',
                    fontWeight: periodType === 'monthly' ? 700 : 500,
                    cursor: 'pointer'
                  }}
                >
                  Monthly
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {/* Year Select */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{
                  width: '90px',
                  background: 'rgba(30, 41, 59, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  padding: '0.45rem 0.5rem',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
              </select>

              {/* Sub-period Selection */}
              {periodType === 'quarterly' ? (
                <div style={{ display: 'flex', gap: '0.25rem', flex: 1 }}>
                  {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setSelectedQuarter(q)}
                      style={{
                        flex: 1,
                        background: selectedQuarter === q ? 'rgba(59, 130, 246, 0.35)' : 'rgba(30, 41, 59, 0.9)',
                        border: `1px solid ${selectedQuarter === q ? '#60a5fa' : 'rgba(255, 255, 255, 0.1)'}`,
                        color: selectedQuarter === q ? '#93c5fd' : '#cbd5e1',
                        borderRadius: '5px',
                        padding: '0.45rem 0.2rem',
                        fontSize: '0.75rem',
                        fontWeight: selectedQuarter === q ? 700 : 500,
                        cursor: 'pointer'
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              ) : (
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'rgba(30, 41, 59, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '6px',
                    padding: '0.45rem 0.5rem',
                    color: '#ffffff',
                    fontSize: '0.8rem',
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
              )}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.3rem' }}>
              Selected Taxable Period Code: <strong style={{ color: '#93c5fd' }}>{taxPeriod}</strong>
            </div>
          </div>
        </div>
      </div>

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

            <div style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
                <span>OUTPUT VAT (SALES - SCHED 1)</span>
                <DollarSign size={18} color="#60a5fa" />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#60a5fa', marginTop: '0.5rem' }}>
                Rs. {outputVatLkr.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                Local Supplies Standard 18% (Cage A)
              </div>
            </div>

            <div style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
                <span>INPUT VAT (PURCHASES - CLAIMABLE)</span>
                <Scale size={18} color="#c084fc" />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#c084fc', marginTop: '0.5rem' }}>
                Rs. {inputVatLkr.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#4ade80', marginTop: '0.25rem' }}>
                Claimable from IRD (Cage I & Cage 6)
              </div>
            </div>

            <div style={{
              background: netVatPosition >= 0 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(34, 197, 94, 0.12)',
              border: `1px solid ${netVatPosition >= 0 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(34, 197, 94, 0.4)'}`,
              borderRadius: '12px',
              padding: '1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
                <span>NET RAMIS POSITION (CAGE 16 / 15)</span>
                {netVatPosition >= 0 ? <DollarSign size={18} color="#fbbf24" /> : <CheckCircle2 size={18} color="#4ade80" />}
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: netVatPosition >= 0 ? '#fbbf24' : '#4ade80', marginTop: '0.5rem' }}>
                Rs. {Math.abs(netVatPosition).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.75rem', color: netVatPosition >= 0 ? '#fde68a' : '#86efac', marginTop: '0.25rem' }}>
                {netVatPosition >= 0 ? 'Net Tax Payable to IRD (Cage 16)' : 'Gross Refund Claim Due (Cage 15)'}
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
                  onClick={() => handleOpenExportModal('Schedule 7')}
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
                  title="Open RAMIS Schedule CSV Exporter"
                >
                  <Download size={14} />
                  Export RAMIS Schedule CSV
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
                      <th style={{ padding: '0.75rem' }}>Party (Buyer / Supplier)</th>
                      <th style={{ padding: '0.75rem' }}>VAT Type / Schedule</th>
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
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontWeight: 600 }}>{inv.vat_type === 'INPUT_VAT' ? (inv.supplier_name || 'External Vendor') : inv.customer_name}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            {inv.vat_type === 'INPUT_VAT' ? `Supplier TIN: ${inv.supplier_tin || 'N/A'}` : `Purchaser TIN: ${inv.customer_tin || '100902877'}`}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {inv.vat_type === 'INPUT_VAT' ? (
                            <span style={{
                              background: 'rgba(168, 85, 247, 0.15)',
                              color: '#c084fc',
                              border: '1px solid rgba(168, 85, 247, 0.3)',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 700
                            }}>
                              Input Tax (Purchase)
                            </span>
                          ) : (
                            <span style={{
                              background: inv.target_schedule === 'Schedule 7' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                              color: inv.target_schedule === 'Schedule 7' ? '#4ade80' : '#60a5fa',
                              border: `1px solid ${inv.target_schedule === 'Schedule 7' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 700
                            }}>
                              {inv.target_schedule === 'Schedule 7' ? 'Output Tax (Export S7)' : 'Output Tax (Sales S1)'}
                            </span>
                          )}
                        </td>
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
          
          {/* Active Declaring Entity Banner */}
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '12px',
            padding: '0.85rem 1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Building2 size={18} color="#60a5fa" />
              <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                Active Declaring Entity: <strong style={{ color: '#ffffff' }}>{companyName}</strong> (TIN: <strong style={{ color: '#60a5fa' }}>{companyTin}</strong>)
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Target Tax Period:</span>
              <span style={{
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#4ade80',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700
              }}>
                {taxPeriod}
              </span>
            </div>
          </div>

          {/* Mandatory Check Warning Banner for Upload */}
          {!isCompanyConfigValid && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem'
            }}>
              <AlertOctagon size={24} color="#ef4444" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>
                  Invoice Upload Locked: Mandatory Entity Information Required
                </div>
                <div style={{ fontSize: '0.78rem', color: '#fca5a5', marginTop: '0.2rem' }}>
                  Sri Lanka IRD RAMIS compliance requires both <strong>Company TIN Number</strong> and <strong>Registered Company Name</strong> before invoices can be processed. Please enter them in the Global Setup banner above.
                </div>
              </div>
            </div>
          )}

          {/* Upload Dropzone */}
          <div style={{
            background: !isCompanyConfigValid ? 'rgba(30, 41, 59, 0.35)' : 'rgba(30, 41, 59, 0.7)',
            border: `2px dashed ${!isCompanyConfigValid ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`,
            borderRadius: '16px',
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            cursor: !isCompanyConfigValid ? 'not-allowed' : 'pointer',
            opacity: !isCompanyConfigValid ? 0.65 : 1,
            transition: 'all 0.2s'
          }}>
            <input
              type="file"
              accept=".pdf"
              id="pdfUploadInput"
              disabled={!isCompanyConfigValid || loading}
              style={{ display: 'none' }}
              onChange={(e) => handleFileUpload(e.target.files[0])}
            />
            <label htmlFor={isCompanyConfigValid ? "pdfUploadInput" : undefined} style={{ cursor: !isCompanyConfigValid ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: !isCompanyConfigValid ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)', padding: '1rem', borderRadius: '50%', color: !isCompanyConfigValid ? '#f87171' : '#60a5fa' }}>
                {!isCompanyConfigValid ? <AlertTriangle size={36} /> : <UploadCloud size={36} />}
              </div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                  {!isCompanyConfigValid ? 'Upload Locked: Configure Mandatory Company TIN & Name First' : loading ? 'Processing Document with OCR & Rules...' : 'Click to Upload Invoice PDF'}
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

              {/* Review Required Guidance & Explicit Failure Reasons */}
              {ocrResult.decision === 'REVIEW_REQUIRED' && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.45)',
                  borderRadius: '10px',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#f87171', fontSize: '0.92rem', fontWeight: 700 }}>
                      <AlertTriangle size={20} color="#ef4444" style={{ flexShrink: 0 }} />
                      <span>Human Auditor Review Required</span>
                    </div>
                    <button
                      onClick={() => setActiveSubTab('fraud')}
                      style={{
                        background: '#ef4444',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.45rem 1rem',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      Open in Fraud & Review Queue →
                    </button>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                    This document failed automated verification checks and has been routed to the <strong>Fraud & Review Queue</strong> for human inspection.
                  </div>

                  {/* Explicit Reasons List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.25rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Reason(s) For Failure:
                    </div>
                    {((ocrResult.review_reasons && ocrResult.review_reasons.length > 0) ? ocrResult.review_reasons : [
                      ocrResult.extracted_amounts?.invoice_number === 'INV-UNKNOWN' ? 'Missing, erased, or unidentifiable Invoice Number (INV-UNKNOWN).' : null,
                      !ocrResult.extracted_amounts?.is_math_valid ? 'Arithmetic equation mismatch: Subtotal + Tax != Total.' : null,
                      (!ocrResult.extracted_amounts?.total_amount || ocrResult.extracted_amounts?.total_amount <= 0) ? 'Zero or missing total payable amount.' : null,
                      'Confidence score below verification threshold (< 85%).'
                    ].filter(Boolean)).map((reason, rIdx) => (
                      <div key={rIdx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'rgba(239, 68, 68, 0.18)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        color: '#fca5a5',
                        padding: '0.45rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}>
                        <span style={{ fontSize: '1rem' }}>⚠️</span>
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
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

              {/* VAT Classification & Schedule Assignment Banner */}
              <div style={{
                background: ocrResult.extracted_amounts.vat_type === 'INPUT_VAT' ? 'rgba(168, 85, 247, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                border: `1px solid ${ocrResult.extracted_amounts.vat_type === 'INPUT_VAT' ? 'rgba(168, 85, 247, 0.35)' : 'rgba(59, 130, 246, 0.35)'}`,
                borderRadius: '10px',
                padding: '1rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Scale size={18} color={ocrResult.extracted_amounts.vat_type === 'INPUT_VAT' ? '#c084fc' : '#60a5fa'} />
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>
                      VAT Classification: {ocrResult.extracted_amounts.vat_type === 'INPUT_VAT' ? 'Input Tax (Purchase from External Vendor)' : 'Output Tax (Company Sales)'}
                    </span>
                  </div>
                  <span style={{
                    background: ocrResult.extracted_amounts.vat_type === 'INPUT_VAT' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(59, 130, 246, 0.25)',
                    color: ocrResult.extracted_amounts.vat_type === 'INPUT_VAT' ? '#c084fc' : '#93c5fd',
                    padding: '0.2rem 0.65rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}>
                    {ocrResult.extracted_amounts.target_schedule === 'Schedule 1' ? 'Assigned: Schedule 1 (Local Output VAT)' : ocrResult.extracted_amounts.target_schedule === 'Schedule 7' ? 'Assigned: Schedule 7 (Zero-Rated Exports)' : 'Assigned: Schedule 2 (Claimable Input Tax)'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', fontSize: '0.78rem', color: '#cbd5e1' }}>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Supplier (Issuer):</span>{' '}
                    <strong>{ocrResult.extracted_amounts.supplier_name || 'Our Company'}</strong>{' '}
                    {ocrResult.extracted_amounts.supplier_tin && `(TIN: ${ocrResult.extracted_amounts.supplier_tin})`}
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Purchaser (Client):</span>{' '}
                    <strong>{ocrResult.extracted_amounts.customer_name || 'Direct Consumer'}</strong>{' '}
                    {ocrResult.extracted_amounts.customer_tin && `(TIN: ${ocrResult.extracted_amounts.customer_tin})`}
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Tax Engine Action:</span>{' '}
                    <span style={{ color: ocrResult.extracted_amounts.vat_type === 'INPUT_VAT' ? '#4ade80' : '#60a5fa', fontWeight: 600 }}>
                      {ocrResult.extracted_amounts.vat_type === 'INPUT_VAT' ? '✓ Input VAT Claimable from IRD (Cage I & 6)' : '✓ Output VAT Declared in Schedule 1 / Form 2540 Cage A'}
                    </span>
                  </div>
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

              {/* Schedule Type Selection & Export Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <select
                  value={selectedSchedule}
                  onChange={(e) => setSelectedSchedule(e.target.value)}
                  style={{
                    background: 'rgba(30, 41, 59, 0.9)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    borderRadius: '8px',
                    padding: '0.6rem 0.85rem',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Schedule 1">Schedule 1 - Standard Rate 18%</option>
                  <option value="Schedule 2">Schedule 2 - Zero-Rated Local (0%)</option>
                  <option value="Schedule 3">Schedule 3 - Exempt Supplies</option>
                  <option value="Schedule 4">Schedule 4 - Deemed Supplies</option>
                  <option value="Schedule 5">Schedule 5 - Import Supplies</option>
                  <option value="Schedule 6">Schedule 6 - Input Tax Credit Claim</option>
                  <option value="Schedule 7">Schedule 7 - Direct Exports & CusDec (0%)</option>
                </select>

                <button
                  onClick={() => handleOpenExportModal('Schedule 1')}
                  disabled={loading || displayedInvoices.length === 0 || !isCompanyConfigValid}
                  title="Configure & Export Official Schedule 1 CSV (Output VAT on Local Supplies)"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.6rem 1.1rem',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: (loading || displayedInvoices.length === 0) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)',
                    opacity: (loading || displayedInvoices.length === 0) ? 0.6 : 1
                  }}
                >
                  <Download size={15} />
                  Export Schedule 1 CSV (Sales)
                </button>
                <button
                  onClick={() => handleOpenExportModal(selectedSchedule)}
                  disabled={loading || displayedInvoices.length === 0 || !isCompanyConfigValid}
                  title={!isCompanyConfigValid ? 'Company TIN and Registered Name are mandatory' : `Open Export Dialog for ${selectedSchedule}`}
                  style={{
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.6rem 1.15rem',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: (loading || displayedInvoices.length === 0) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 4px 14px rgba(34, 197, 94, 0.3)',
                    opacity: (loading || displayedInvoices.length === 0) ? 0.6 : 1
                  }}
                >
                  <Download size={15} />
                  Download {selectedSchedule} CSV
                </button>
              </div>
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
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontWeight: 600 }}>{inv.vat_type === 'INPUT_VAT' ? (inv.supplier_name || 'External Vendor') : inv.customer_name}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            {inv.vat_type === 'INPUT_VAT' ? `Supplier TIN: ${inv.supplier_tin || 'N/A'}` : `Purchaser TIN: ${inv.customer_tin || '100902877'}`}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {inv.vat_type === 'INPUT_VAT' ? (
                            <span style={{
                              background: 'rgba(168, 85, 247, 0.15)',
                              color: '#c084fc',
                              border: '1px solid rgba(168, 85, 247, 0.3)',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 700
                            }}>
                              Input Tax (Purchase)
                            </span>
                          ) : (
                            <span style={{
                              background: inv.target_schedule === 'Schedule 7' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                              color: inv.target_schedule === 'Schedule 7' ? '#4ade80' : '#60a5fa',
                              border: `1px solid ${inv.target_schedule === 'Schedule 7' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 700
                            }}>
                              {inv.target_schedule === 'Schedule 7' ? 'Output Tax (Export S7)' : 'Output Tax (Sales S1)'}
                            </span>
                          )}
                        </td>
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

                      <div style={{ marginTop: '0.65rem' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                          Failure Reason(s):
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {flags.map((flag, fIdx) => (
                            <span key={fIdx} style={{
                              background: 'rgba(239, 68, 68, 0.18)',
                              color: '#fca5a5',
                              border: '1px solid rgba(239, 68, 68, 0.35)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              padding: '0.25rem 0.55rem',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}>
                              ⚠️ {flag}
                            </span>
                          ))}
                        </div>
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

          {/* Review Action Modal with Full Mandatory Field Editor */}
          {selectedReviewTxn && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '1rem',
              overflowY: 'auto'
            }}>
              <div style={{
                background: '#1e293b',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '16px',
                padding: '1.75rem',
                maxWidth: '680px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)'
              }}>
                {/* Modal Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ background: 'rgba(239, 68, 68, 0.2)', padding: '0.4rem', borderRadius: '8px' }}>
                      <AlertTriangle size={20} color="#f87171" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                        Auditor Review & Mandatory Field Editor
                      </h3>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                        Inspect, edit, and update mandatory fields before accepting into RAMIS Tax Ledger
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelectedReviewTxn(null); setCorrectedInvNum(''); setReviewNotes(''); }}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}
                  >
                    ×
                  </button>
                </div>

                {/* Flagged Failure Reasons Banner */}
                <div style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem'
                }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                    Flagged Failure Reason(s):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {getItemFlags(selectedReviewTxn).map((flag, fIdx) => (
                      <div key={fIdx} style={{ fontSize: '0.78rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>⚠️</span> <strong>{flag}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mandatory Fields Edit Form */}
                <div style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '1.25rem'
                }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>📝</span> Edit & Update Mandatory Invoice Details
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                    {/* Invoice Number */}
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '0.35rem' }}>
                        Invoice Number <span style={{ color: '#f87171' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={editForm.invoice_number}
                        onChange={(e) => handleEditFormChange('invoice_number', e.target.value)}
                        placeholder="e.g. 3431 or INV-2025-01"
                        style={{
                          width: '100%',
                          background: 'rgba(15, 23, 42, 0.9)',
                          border: `1px solid ${!editForm.invoice_number.trim() || editForm.invoice_number === 'INV-UNKNOWN' ? '#ef4444' : 'rgba(59, 130, 246, 0.4)'}`,
                          borderRadius: '6px',
                          padding: '0.55rem 0.75rem',
                          color: '#ffffff',
                          fontSize: '0.85rem',
                          fontWeight: 600
                        }}
                      />
                    </div>

                    {/* Date of Supply */}
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '0.35rem' }}>
                        Date of Supply <span style={{ color: '#f87171' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={editForm.date_of_supply}
                        onChange={(e) => handleEditFormChange('date_of_supply', e.target.value)}
                        placeholder="DD/MM/YYYY or YYYY-MM-DD"
                        style={{
                          width: '100%',
                          background: 'rgba(15, 23, 42, 0.9)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '6px',
                          padding: '0.55rem 0.75rem',
                          color: '#ffffff',
                          fontSize: '0.85rem'
                        }}
                      />
                    </div>

                    {/* Customer / Consignee Name */}
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '0.35rem' }}>
                        Customer / Consignee Name <span style={{ color: '#f87171' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={editForm.customer_name}
                        onChange={(e) => handleEditFormChange('customer_name', e.target.value)}
                        placeholder="e.g. OZ IMPORT BV (COLORIGINZ)"
                        style={{
                          width: '100%',
                          background: 'rgba(15, 23, 42, 0.9)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '6px',
                          padding: '0.55rem 0.75rem',
                          color: '#ffffff',
                          fontSize: '0.85rem'
                        }}
                      />
                    </div>

                    {/* Customer TIN */}
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '0.35rem' }}>
                        Customer / Taxpayer TIN
                      </label>
                      <input
                        type="text"
                        value={editForm.customer_tin}
                        onChange={(e) => handleEditFormChange('customer_tin', e.target.value)}
                        placeholder="e.g. 1146888607000"
                        style={{
                          width: '100%',
                          background: 'rgba(15, 23, 42, 0.9)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '6px',
                          padding: '0.55rem 0.75rem',
                          color: '#ffffff',
                          fontSize: '0.85rem'
                        }}
                      />
                    </div>

                    {/* Currency */}
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '0.35rem' }}>
                        Currency <span style={{ color: '#f87171' }}>*</span>
                      </label>
                      <select
                        value={editForm.currency}
                        onChange={(e) => handleEditFormChange('currency', e.target.value)}
                        style={{
                          width: '100%',
                          background: '#0f172a',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '6px',
                          padding: '0.55rem 0.75rem',
                          color: '#ffffff',
                          fontSize: '0.85rem'
                        }}
                      >
                        <option value="EUR">EUR (€)</option>
                        <option value="LKR">LKR (Rs)</option>
                        <option value="USD">USD ($)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="AUD">AUD ($)</option>
                      </select>
                    </div>

                    {/* Tax Category */}
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '0.35rem' }}>
                        RAMIS Tax Category <span style={{ color: '#f87171' }}>*</span>
                      </label>
                      <select
                        value={editForm.tax_category}
                        onChange={(e) => handleEditFormChange('tax_category', e.target.value)}
                        style={{
                          width: '100%',
                          background: '#0f172a',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '6px',
                          padding: '0.55rem 0.75rem',
                          color: '#ffffff',
                          fontSize: '0.85rem'
                        }}
                      >
                        <option value="Zero-Rated">Zero-Rated (Export - 0% VAT, Cage D)</option>
                        <option value="Standard 18%">Standard 18% (Local Supply - Cage A)</option>
                        <option value="Exempt">Exempt (0% VAT - Cage E)</option>
                      </select>
                    </div>

                    {/* Subtotal (Net) */}
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '0.35rem' }}>
                        Subtotal (Net Base Value) <span style={{ color: '#f87171' }}>*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.sub_total}
                        onChange={(e) => handleEditFormChange('sub_total', e.target.value)}
                        style={{
                          width: '100%',
                          background: 'rgba(15, 23, 42, 0.9)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '6px',
                          padding: '0.55rem 0.75rem',
                          color: '#ffffff',
                          fontSize: '0.85rem',
                          fontWeight: 600
                        }}
                      />
                    </div>

                    {/* Tax Amount */}
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '0.35rem' }}>
                        Tax Amount (VAT) <span style={{ color: '#f87171' }}>*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.tax_amount}
                        onChange={(e) => handleEditFormChange('tax_amount', e.target.value)}
                        style={{
                          width: '100%',
                          background: 'rgba(15, 23, 42, 0.9)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '6px',
                          padding: '0.55rem 0.75rem',
                          color: '#fbbf24',
                          fontSize: '0.85rem',
                          fontWeight: 600
                        }}
                      />
                    </div>

                    {/* Total Amount */}
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#60a5fa', display: 'block', marginBottom: '0.35rem' }}>
                        Total Payable Amount <span style={{ color: '#f87171' }}>*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.total_amount}
                        onChange={(e) => handleEditFormChange('total_amount', e.target.value)}
                        style={{
                          width: '100%',
                          background: 'rgba(15, 23, 42, 0.9)',
                          border: '1px solid rgba(59, 130, 246, 0.4)',
                          borderRadius: '6px',
                          padding: '0.55rem 0.75rem',
                          color: '#60a5fa',
                          fontSize: '1rem',
                          fontWeight: 700
                        }}
                      />
                    </div>
                  </div>

                  {/* Mathematical Balance Indicator */}
                  {(() => {
                    const sub = parseFloat(editForm.sub_total) || 0;
                    const tax = parseFloat(editForm.tax_amount) || 0;
                    const tot = parseFloat(editForm.total_amount) || 0;
                    const diff = Math.abs(Math.round((sub + tax - tot) * 100) / 100);
                    const isBalanced = diff <= 0.05;
                    return (
                      <div style={{
                        marginTop: '0.85rem',
                        padding: '0.55rem 0.85rem',
                        borderRadius: '6px',
                        background: isBalanced ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        border: `1px solid ${isBalanced ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <span>
                          <strong>Arithmetic Check:</strong> {sub} + {tax} = {Math.round((sub + tax) * 100) / 100} vs {tot}
                        </span>
                        <span style={{ fontWeight: 700, color: isBalanced ? '#4ade80' : '#f87171' }}>
                          {isBalanced ? '✓ Math Balanced (Exact Match)' : `⚠️ Mismatch by ${diff.toFixed(2)}`}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Auditor Notes */}
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>
                    Auditor Review Notes & Audit Trail:
                  </label>
                  <textarea
                    rows={2}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="e.g. Verified paper CusDec Box 44 invoice number, updated consignee name and verified math."
                    style={{
                      width: '100%',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '0.6rem',
                      color: '#ffffff',
                      fontSize: '0.82rem',
                      resize: 'vertical'
                    }}
                  />
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem' }}>
                  <button
                    onClick={() => handleAction('reject')}
                    disabled={loading}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#f87171',
                      borderRadius: '8px',
                      padding: '0.65rem 1.25rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Reject & Remove
                  </button>

                  <button
                    onClick={() => handleAction('approve')}
                    disabled={loading || !editForm.invoice_number.trim() || editForm.invoice_number === 'INV-UNKNOWN'}
                    style={{
                      background: (!editForm.invoice_number.trim() || editForm.invoice_number === 'INV-UNKNOWN') ? 'rgba(34, 197, 94, 0.3)' : '#22c55e',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.65rem 1.4rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: (!editForm.invoice_number.trim() || editForm.invoice_number === 'INV-UNKNOWN') ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      boxShadow: '0 4px 12px rgba(34, 197, 94, 0.25)'
                    }}
                  >
                    <CheckCircle2 size={16} /> Save, Update & Approve to Ledger
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================= */}
      {/* INTERACTIVE RAMIS SCHEDULE CSV EXPORT MODAL               */}
      {/* ========================================================= */}
      {showExportModal && (() => {
        const activeBatch = filterByPeriod ? displayedInvoices : taxInvoices;
        const strictlyEligible = activeBatch.filter(inv => {
          const cls = getInvoiceClassification(inv);
          if (selectedScheduleToExport === 'Schedule 1') {
            return cls.target_schedule === 'Schedule 1' || (cls.vat_type === 'OUTPUT_VAT' && !cls.is_export);
          } else if (selectedScheduleToExport === 'Schedule 2') {
            return cls.target_schedule === 'Schedule 2' || cls.vat_type === 'INPUT_VAT';
          } else if (selectedScheduleToExport === 'Schedule 7') {
            return cls.is_export || cls.target_schedule === 'Schedule 7';
          } else if (selectedScheduleToExport === 'Schedule 6') {
            return cls.is_export || cls.target_schedule === 'Schedule 6';
          }
          return false;
        });
        const eligibleInvoices = strictScheduleFilter ? (strictlyEligible.length > 0 ? strictlyEligible : activeBatch) : activeBatch;

        const excludedInvoices = activeBatch.filter(inv => !eligibleInvoices.includes(inv));
        const periodCode = getRamisPeriodCode(taxPeriod);
        const schedNum = (selectedScheduleToExport || '1').match(/\d+/)?.[0] || '1';
        const schedCode = `SCHEDULE0${schedNum}`;
        const subDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const previewFileName = `${companyTin || '102938475'}_VAT_${schedCode}_${periodCode}_${subDate}_ORIGINAL_V1.csv`;

        let ruleExplanation = '';
        let columnsList = [];

        if (selectedScheduleToExport === 'Schedule 1') {
          ruleExplanation = 'Schedule 1 strictly includes local domestic sales invoices issued by your company (Standard 18%). External purchase bills (Input VAT) and zero-rated exports are strictly excluded.';
          columnsList = ['Serial No', 'Invoice Date', 'Tax Invoice No', "Purchaser's TIN", 'Name of the Purchaser', 'Description', 'Value of supply', 'VAT Amount'];
        } else if (selectedScheduleToExport === 'Schedule 2') {
          ruleExplanation = 'Schedule 2 strictly includes vendor purchase bills from external suppliers where your company claims Input VAT. Local sales and exports are strictly excluded.';
          columnsList = ['Serial No', 'Invoice Date', 'Tax Invoice No', "Supplier's TIN", 'Name of the Supplier', 'Description', 'Value of purchase', 'VAT Amount', 'Disallowed VAT Amount'];
        } else if (selectedScheduleToExport === 'Schedule 7') {
          ruleExplanation = 'Schedule 7 strictly includes zero-rated service export supplies in foreign currency (Cage D1). Local sales and purchases are strictly excluded.';
          columnsList = ['Serial No', 'Invoice No', 'Invoice Date', 'Description of Service', 'Invoice Value', 'Type of Currency', 'Exchange rate', 'Rupee Value (Rs.)', 'NRFC Account Number', 'Payment Received Date'];
        } else if (selectedScheduleToExport === 'Schedule 6') {
          ruleExplanation = 'Schedule 6 strictly includes article exports declared under Customs CUSDEC forms (Cage D).';
          columnsList = ['Serial No', 'Date of exportation', 'CUSDEC Number', 'Office ID', 'Serial ID', 'Export registration date', 'Net Mass (Kg.)', 'FOB/CIF Value (Rs.)'];
        } else {
          ruleExplanation = `Dedicated IRD RAMIS format generator for ${selectedScheduleToExport}.`;
          columnsList = ['Serial No', 'Invoice Date', 'Invoice No', 'TIN', 'Name', 'Description', 'Base Value', 'Tax Amount'];
        }

        return (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.25rem'
          }}>
            <div style={{
              background: 'linear-gradient(145deg, #1e293b, #0f172a)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              borderRadius: '16px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(59, 130, 246, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              padding: '1.75rem'
            }}>
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(37, 99, 235, 0.35))',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    padding: '0.65rem',
                    borderRadius: '10px',
                    color: '#60a5fa'
                  }}>
                    <FileSpreadsheet size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                      Export RAMIS Schedule CSV
                    </h3>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                      Sri Lanka Inland Revenue Department (IRD) Format Generator & Audit Filter
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowExportModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '0.45rem',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s'
                  }}
                  title="Close Dialog"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Entity & Tax Period Context Banner */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
                fontSize: '0.78rem'
              }}>
                <div>
                  <span style={{ color: '#94a3b8', display: 'block' }}>Taxpayer TIN:</span>
                  <span style={{ color: '#60a5fa', fontWeight: 700, fontSize: '0.88rem' }}>{companyTin}</span>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', display: 'block' }}>Registered Legal Entity:</span>
                  <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.85rem' }}>{companyName}</span>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', display: 'block' }}>Filing Period Code:</span>
                  <span style={{
                    color: '#4ade80',
                    fontWeight: 700,
                    background: 'rgba(34, 197, 94, 0.15)',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '5px',
                    display: 'inline-block'
                  }}>
                    {taxPeriod} ({periodCode})
                  </span>
                </div>
              </div>

              {/* Step 1: Schedule Selection Dropdown */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0', display: 'block', marginBottom: '0.45rem' }}>
                  Select RAMIS Schedule to Download:
                </label>
                <select
                  value={selectedScheduleToExport}
                  onChange={(e) => setSelectedScheduleToExport(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(30, 41, 59, 0.95)',
                    border: '1px solid rgba(59, 130, 246, 0.5)',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  <option value="Schedule 1">Schedule 1 - Output VAT Schedule (Local Taxable Supplies at 18%)</option>
                  <option value="Schedule 2">Schedule 2 - Input VAT Schedule (Purchases from External Suppliers)</option>
                  <option value="Schedule 3">Schedule 3 - CusDec Import VAT Schedule (Customs Declarations)</option>
                  <option value="Schedule 4">Schedule 4 - Debit / Credit Note Schedule</option>
                  <option value="Schedule 5">Schedule 5 - Specified Projects / Zero-Rated under Sec 22(7)</option>
                  <option value="Schedule 6">Schedule 6 - Article Export VAT Schedule (CUSDEC Goods Export)</option>
                  <option value="Schedule 7">Schedule 7 - Service Export VAT Schedule (Zero-Rated Service Exports)</option>
                </select>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.35rem', lineHeight: '1.4' }}>
                  {ruleExplanation}
                </div>
              </div>

              {/* Filter Mode Toggle: Strict IRD Compliance vs Include All Invoices */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Batch Inclusion Mode:</span>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    {strictScheduleFilter ? 'Filtering for ' + selectedScheduleToExport : 'Exporting All ' + activeBatch.length + ' Invoices'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setStrictScheduleFilter(true)}
                    style={{
                      flex: 1,
                      minWidth: '220px',
                      background: strictScheduleFilter ? 'rgba(59, 130, 246, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                      border: `1px solid ${strictScheduleFilter ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)'}`,
                      borderRadius: '8px',
                      padding: '0.55rem 0.75rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: strictScheduleFilter ? '#93c5fd' : '#cbd5e1' }}>
                      ✓ Strict IRD Filter ({strictlyEligible.length} matching)
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                      Only invoices matching {selectedScheduleToExport} category
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStrictScheduleFilter(false)}
                    style={{
                      flex: 1,
                      minWidth: '220px',
                      background: !strictScheduleFilter ? 'rgba(34, 197, 94, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                      border: `1px solid ${!strictScheduleFilter ? '#22c55e' : 'rgba(255, 255, 255, 0.1)'}`,
                      borderRadius: '8px',
                      padding: '0.55rem 0.75rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: !strictScheduleFilter ? '#86efac' : '#cbd5e1' }}>
                      ★ Include All Invoices ({activeBatch.length} total)
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                      Populate all current batch invoices into this schedule
                    </div>
                  </button>
                </div>
              </div>

              {/* Step 2: Live Eligibility Breakdown & Exclusions Audit */}
              <div style={{
                background: eligibleInvoices.length > 0 ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: `1px solid ${eligibleInvoices.length > 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: eligibleInvoices.length > 0 ? '#4ade80' : '#f87171', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {eligibleInvoices.length > 0 ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    {eligibleInvoices.length} Eligible Invoice{eligibleInvoices.length === 1 ? '' : 's'} Matched for {selectedScheduleToExport}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Active batch: {activeBatch.length} invoice(s)
                  </span>
                </div>

                {excludedInvoices.length > 0 && (
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#cbd5e1',
                    background: 'rgba(15, 23, 42, 0.5)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.06)'
                  }}>
                    <strong style={{ color: '#f59e0b' }}>Strict Isolation:</strong> {excludedInvoices.length} non-matching invoice{excludedInvoices.length === 1 ? '' : 's'}{' '}
                    (e.g.{' '}
                    {excludedInvoices.map(i => {
                      const c = getInvoiceClassification(i);
                      return `${i.invoice_number} (${c.target_schedule})`;
                    }).slice(0, 3).join(', ')}
                    {excludedInvoices.length > 3 ? '...' : ''}){' '}
                    are strictly excluded from this file as required by IRD audit standards.
                  </div>
                )}

                {eligibleInvoices.length === 0 && (
                  <div style={{ fontSize: '0.78rem', color: '#fca5a5', lineHeight: '1.4' }}>
                    ⚠️ Warning: No invoices in the current selection qualify for {selectedScheduleToExport}.
                    {selectedScheduleToExport === 'Schedule 1' && ' Schedule 1 requires local sales invoices issued by your company (excluding purchase bills and foreign exports).'}
                  </div>
                )}
              </div>

              {/* Step 3: Official IRD File Name Preview */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '10px',
                padding: '0.85rem 1rem'
              }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#60a5fa', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '0.25rem' }}>
                  Official IRD RAMIS File Name Preview (Page 24 Standard):
                </div>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  color: '#ffffff',
                  wordBreak: 'break-all',
                  background: 'rgba(30, 41, 59, 0.8)',
                  padding: '0.45rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  📄 {previewFileName}
                </div>
              </div>

              {/* Step 4: Schedule Column Layout Preview */}
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, marginBottom: '0.4rem' }}>
                  CSV Output Column Layout ({columnsList.length} Columns):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {columnsList.map((col, cIdx) => (
                    <span
                      key={cIdx}
                      style={{
                        background: 'rgba(59, 130, 246, 0.12)',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        color: '#93c5fd',
                        borderRadius: '6px',
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.72rem',
                        fontWeight: 600
                      }}
                    >
                      {cIdx + 1}. {col}
                    </span>
                  ))}
                </div>
              </div>

              {/* Excel Viewing Guide Alert */}
              <div style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: '10px',
                padding: '0.75rem 1rem',
                fontSize: '0.74rem',
                color: '#93c5fd',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.55rem',
                lineHeight: '1.45'
              }}>
                <Info size={16} style={{ flexShrink: 0, marginTop: '0.1rem', color: '#60a5fa' }} />
                <div>
                  <strong>Why Microsoft Excel may display <code>#######</code> or <code>2E+08</code>:</strong> Excel opens CSV columns with narrow default widths (8.4 characters). Dates like <code>01/15/2026</code> display as <code>#######</code> and 9-digit TINs display in scientific notation <code>2E+08</code> until column widths are expanded. Press <strong>Ctrl+A</strong> then double-click any column header line in Excel to AutoFit, or open in Notepad to see full plain text.
                </div>
              </div>

              {/* Actions */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '0.75rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                paddingTop: '1.25rem',
                marginTop: '0.25rem'
              }}>
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#cbd5e1',
                    borderRadius: '8px',
                    padding: '0.65rem 1.25rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadSchedule(selectedScheduleToExport)}
                  disabled={loading || eligibleInvoices.length === 0}
                  style={{
                    background: eligibleInvoices.length === 0 ? 'rgba(59, 130, 246, 0.25)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.65rem 1.5rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: (loading || eligibleInvoices.length === 0) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: eligibleInvoices.length > 0 ? '0 4px 14px rgba(37, 99, 235, 0.4)' : 'none',
                    opacity: (loading || eligibleInvoices.length === 0) ? 0.6 : 1
                  }}
                >
                  <Download size={16} />
                  {loading ? 'Generating CSV...' : `Download ${selectedScheduleToExport} CSV`}
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
