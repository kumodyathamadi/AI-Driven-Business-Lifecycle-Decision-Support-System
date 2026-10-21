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

/* ==========================================================================
   COMPONENT 4 — GNN RISK PREDICTION & GROWTH READINESS SERVICES
   ========================================================================== */

/**
 * Uploads a business plan document (PDF, DOCX, TXT, JSON) to Component 4 backend
 */
export const uploadComponent4BusinessPlan = async (file, confirmedBusinessId = '') => {
  const formData = new FormData();
  formData.append('file', file);
  if (confirmedBusinessId) {
    formData.append('confirmed_business_id', confirmedBusinessId);
  }

  const response = await apiClient.post('/component4/plan/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Executes full Component 4 Risk, GNN Inference, and Growth Readiness Pipeline
 */
export const runComponent4Analysis = async ({ planFilePath = null, confirmedBusinessId = null, planJson = null }) => {
  const response = await apiClient.post('/component4/analysis/run', {
    plan_file_path: planFilePath,
    confirmed_business_id: confirmedBusinessId,
    plan_json: planJson,
  });
  return response.data;
};

/**
 * Fetches analysis record by ID
 */
export const getComponent4Analysis = async (analysisId) => {
  const response = await apiClient.get(`/component4/analysis/${analysisId}`);
  return response.data;
};

/**
 * Fetches relationship graph data for interactive visualization
 */
export const getComponent4Graph = async (businessId) => {
  const response = await apiClient.get(`/component4/graph/${businessId}`);
  return response.data;
};

/**
 * Downloads generated Markdown report for Component 4 analysis
 */
export const downloadComponent4Report = async (analysisId) => {
  try {
    const response = await apiClient.get(`/component4/analysis/${analysisId}/report?download=true`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/markdown' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `Component4_Risk_Report_${analysisId}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error('Download Component 4 Report Error:', error);
    throw error;
  }
};

/**
 * Downloads generated professional PDF Mitigation Plan for Component 4 analysis
 */
export const downloadComponent4MitigationPlanPdf = async (analysisId) => {
  try {
    const response = await apiClient.get(`/component4/analysis/${analysisId}/mitigation-plan.pdf?download=true`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `Component4_Mitigation_Plan_${analysisId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error('Download Component 4 PDF Mitigation Plan Error:', error);
    throw error;
  }
};

/**
 * Fetches candidate Western Province businesses for entity resolution confirmation
 */
export const getComponent4Candidates = async (district = '', category = '') => {
  const params = {};
  if (district) params.district = district;
  if (category) params.category = category;
  const response = await apiClient.get('/component4/candidates', { params });
  return response.data;
};

/**
 * Submits dynamic intake form with user-completed missing fields, confirms business identity,
 * persists/reuses persistent business ID, and executes risk + GNN analysis.
 */
export const submitComponent4IntakeAndRun = async (payload) => {
  const response = await apiClient.post('/component4/intake/submit-and-run', payload);
  return response.data;
};

/**
 * Retrieves chronological assessment runs history for a persistent business ID
 */
export const getComponent4BusinessHistory = async (businessId) => {
  const response = await apiClient.get(`/component4/business/${businessId}/history`);
  return response.data;
};

/**
 * Retrieves recent assessment runs across persistent businesses for dashboard display
 */
export const getRecentComponent4Assessments = async (limit = 15) => {
  const response = await apiClient.get(`/component4/assessments/recent?limit=${limit}`);
  return response.data;
};

/**
 * Retrieves persistent registered Component 4 business profiles
 */
export const getComponent4Businesses = async (limit = 50) => {
  const response = await apiClient.get(`/component4/businesses?limit=${limit}`);
  return response.data;
};

/**
 * Retrieves GNN model status, inductive evaluation metrics, and disclosures
 */
export const getComponent4ModelStatus = async () => {
  const response = await apiClient.get('/component4/model-status');
  return response.data;
};

/**
 * Retrieves recent Component 1 generated business plans stored in database
 */
export const getComponent1Plans = async (limit = 20) => {
  const response = await apiClient.get(`/component4/component1-plans?limit=${limit}`);
  return response.data;
};

/**
 * Loads a Component 1 business plan directly into Component 4 workflow
 */
export const loadComponent1Plan = async (recordId) => {
  const response = await apiClient.post(`/component4/plan/load-component1/${recordId}`);
  return response.data;
};



