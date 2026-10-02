import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 45000,
});

// Attach Bearer token from localStorage automatically
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('sme360_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

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
    let errorMessage = 'Analysis failed';
    if (typeof error.response?.data?.detail === 'string') {
      errorMessage = error.response.data.detail;
    } else if (Array.isArray(error.response?.data?.detail)) {
      errorMessage = error.response.data.detail
        .map(d => `${d.loc?.slice(-1)[0] || 'Field'}: ${d.msg}`)
        .join(', ');
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Retrieves paginated SME business analysis runs with total counts and numeric attributes
 */
export const fetchAnalysisRecords = async (params = 10) => {
  try {
    const queryParams = typeof params === 'number' ? { limit: params } : params;
    const response = await apiClient.get('/business/records', { params: queryParams });
    return response.data;
  } catch (error) {
    console.error('Fetch Records Error:', error);
    return { total_count: 0, items: [], page: 1, page_size: 10 };
  }
};

/**
 * Retrieves Dashboard aggregate summary metrics (total analyses, feasible rate, avg capital, etc.)
 */
export const fetchDashboardSummary = async () => {
  try {
    const response = await apiClient.get('/business/summary');
    return response.data;
  } catch (error) {
    console.error('Fetch Dashboard Summary Error:', error);
    return null;
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
    const bizName = profile.business_input?.business_name || profile.business_name || profile.business_input?.business_category || 'Business';
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
    const bizName = profile.business_input?.business_name || profile.business_name || profile.business_input?.business_category || 'Business';
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

/**
 * Logs in user with email and password
 */
export const loginUser = async (email, password) => {
  const response = await apiClient.post('/auth/login', { email, password });
  return response.data;
};

/**
 * Registers new user
 */
export const registerUser = async (email, password, full_name) => {
  const response = await apiClient.post('/auth/register', { email, password, full_name });
  return response.data;
};

/**
 * Fetches authenticated user info
 */
export const getCurrentUser = async () => {
  const response = await apiClient.get('/auth/me');
  return response.data;
};

/**
 * Soft deletes an analysis record
 */
export const deleteAnalysisRecord = async (recordId) => {
  const response = await apiClient.delete(`/business/record/${recordId}`);
  return response.data;
};

/**
 * Restores a soft-deleted analysis record
 */
export const restoreAnalysisRecord = async (recordId) => {
  const response = await apiClient.post(`/business/record/${recordId}/restore`);
  return response.data;
};

/**
 * Retrieves chronological audit trail logs
 */
export const fetchAuditLogs = async (limit = 50) => {
  try {
    const response = await apiClient.get('/business/audit-logs', { params: { limit } });
    return response.data;
  } catch (error) {
    console.error('Fetch Audit Logs Error:', error);
    return [];
  }
};

