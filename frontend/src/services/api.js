import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 45000,
});

/**
 * Checks API server health and model status
 */
export const checkHealth = async () => {
  try {
    const response = await apiClient.get('/health');
    return response.data;
  } catch (error) {
    console.error('API Health Check Error:', error);
    return { status: 'offline', model_loaded: false, error: error.message };
  }
};

/**
 * Retrieves available Business Stages and Context-Specific Business Goals
 */
export const getStagesAndGoals = async () => {
  try {
    const response = await apiClient.get('/business/intake/stages-and-goals');
    return response.data;
  } catch (error) {
    console.error('Fetch Stages & Goals Error:', error);
    return { stages: [], goals: {} };
  }
};

/**
 * Retrieves Dynamic Context-Aware Field Requirements (Required, Optional, Hidden)
 */
export const getFieldConfiguration = async (stage, goal, category) => {
  try {
    const response = await apiClient.post('/business/intake/config', {
      business_stage: stage,
      business_goal: goal,
      business_category: category
    });
    return response.data;
  } catch (error) {
    console.error('Fetch Field Config Error:', error);
    return { field_config: {} };
  }
};

/**
 * Calls AI Business Intake Assistant NLP Extraction API
 * Parses free text (English, Singlish) and returns mapped context-aware schema fields and states
 */
export const extractIntakeInformation = async (text, stage = '', goal = '') => {
  try {
    const response = await apiClient.post('/business/intake/extract', { 
      text, 
      business_stage: stage, 
      business_goal: goal 
    });
    return response.data;
  } catch (error) {
    console.error('AI Intake Extraction Error:', error);
    const errorMessage = error.response?.data?.detail || error.message || 'Information extraction failed';
    throw new Error(errorMessage);
  }
};

/**
 * Executes complete Component 1 End-to-End Business Analysis
 * @param {Object} businessInput Raw SME parameters dictionary
 */
export const analyzeBusiness = async (businessInput) => {
  try {
    const response = await apiClient.post('/business/analyze', businessInput);
    return response.data;
  } catch (error) {
    console.error('API Business Analysis Error:', error);
    const errorMessage = error.response?.data?.detail || error.message || 'Analysis failed';
    throw new Error(errorMessage);
  }
};

/**
 * Retrieves recent analysis runs from Database
 */
export const fetchAnalysisRecords = async (limit = 10) => {
  try {
    const response = await apiClient.get(`/business/records?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('Fetch Records Error:', error);
    return [];
  }
};

/**
 * Fetches single full structured profile by record ID
 */
export const fetchAnalysisRecordById = async (recordId) => {
  try {
    const response = await apiClient.get(`/business/record/${recordId}`);
    return response.data;
  } catch (error) {
    console.error(`Fetch Record ${recordId} Error:`, error);
    throw error;
  }
};

/**
 * Triggers PDF Business Plan document generation & download from backend
 */
export const downloadBusinessPlanPdf = async (profile) => {
  try {
    const response = await apiClient.post('/business/plan/generate-pdf', profile, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const bizName = profile.business_input?.business_name || profile.business_input?.business_category || 'Business';
    const cleanName = bizName.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `SME360_AI_Business_Plan_${cleanName}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error('PDF Business Plan Generation Error:', error);
    throw error;
  }
};

/**
 * Triggers Word (.docx) Business Plan document generation & download from backend
 */
export const downloadBusinessPlanDocx = async (profile) => {
  try {
    const response = await apiClient.post('/business/plan/generate-docx', profile, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    });
    const bizName = profile.business_input?.business_name || profile.business_input?.business_category || 'Business';
    const cleanName = bizName.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `SME360_AI_Business_Plan_${cleanName}.docx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error('DOCX Business Plan Generation Error:', error);
    throw error;
  }
};

// =============================================================
// COMPONENT 3: CLEARLEDGER FINANCIAL, TAX & FRAUD API CLIENT
// =============================================================

export const uploadInvoicePdf = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axios.post('http://127.0.0.1:8000/api/v1/ocr/upload-pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  return response.data;
};

export const extractAmountsFromText = async (documentText) => {
  const response = await axios.post('http://127.0.0.1:8000/api/v1/ocr/extract-amounts', {
    document_text: documentText,
  });
  return response.data;
};

export const calculateInvoiceTax = async (invoiceData) => {
  const response = await axios.post('http://127.0.0.1:8000/api/v1/tax/process-invoice', invoiceData);
  return response.data;
};

export const processBatchTax = async (batchRequest) => {
  const response = await axios.post('http://127.0.0.1:8000/api/v1/tax/batch-process', batchRequest);
  return response.data;
};

/**
 * Global RAMIS Tax Configuration API
 */
export const fetchCompanyTaxConfig = async () => {
  const response = await axios.get('http://127.0.0.1:8000/api/v1/tax/config');
  return response.data;
};

export const saveCompanyTaxConfig = async (config) => {
  const response = await axios.post('http://127.0.0.1:8000/api/v1/tax/config', config);
  return response.data;
};

export const getRamisPeriodCode = (periodStr) => {
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

export const downloadRamisSchedule7Csv = async (batchRequest) => {
  const req = { ...batchRequest, schedule_type: 'Schedule 7' };
  return downloadScheduleCsv(req);
};

export const downloadScheduleCsv = async (scheduleRequest) => {
  const response = await axios.post('http://127.0.0.1:8000/api/v1/tax/export-schedule-csv', scheduleRequest, {
    responseType: 'blob',
  });
  const blob = new Blob([response.data], { type: 'text/csv' });
  let filename = '';
  const disposition = response.headers && (response.headers['content-disposition'] || response.headers['Content-Disposition']);
  if (disposition && disposition.indexOf('filename=') !== -1) {
    const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1].trim();
    }
  }
  if (!filename) {
    const tin = scheduleRequest.company_tin || scheduleRequest.taxpayer_tin || '102938475';
    const schedNum = (scheduleRequest.schedule_type || '1').match(/\d+/)?.[0] || '1';
    const schedCode = `SCHEDULE0${schedNum}`;
    const pCode = getRamisPeriodCode(scheduleRequest.tax_period);
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    filename = `${tin}_VAT_${schedCode}_${pCode}_${today}_ORIGINAL_V1.csv`;
  }
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  return { success: true, filename };
};

export const downloadRamisSchedule1Csv = async (batchRequest) => {
  const req = { ...batchRequest, schedule_type: 'Schedule 1' };
  return downloadScheduleCsv(req);
};


export const checkTransactionFraud = async (fraudRequest) => {
  const response = await axios.post('http://127.0.0.1:8000/api/v1/fraud/check-transaction', fraudRequest);
  return response.data;
};

export const fetchFraudReviewQueue = async () => {
  const response = await axios.get('http://127.0.0.1:8000/api/v1/fraud/review-queue');
  return response.data;
};

export const submitFraudReviewAction = async (actionRequest) => {
  const response = await axios.post('http://127.0.0.1:8000/api/v1/fraud/review-action', actionRequest);
  return response.data;
};

export const runIntegratedPipeline = async (pipelineRequest) => {
  const response = await axios.post('http://127.0.0.1:8000/api/v1/pipeline/process-transaction', pipelineRequest);
  return response.data;
};
