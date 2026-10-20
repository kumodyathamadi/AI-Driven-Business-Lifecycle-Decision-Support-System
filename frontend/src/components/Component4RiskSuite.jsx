import React, { useState, useEffect } from 'react';
import './Component4RiskSuite.css';
import {
  ShieldAlert,
  UploadCloud,
  Network,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Download,
  Building,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Info,
  DollarSign,
  Users,
  CheckSquare,
  Square,
  HelpCircle,
  History,
  Plus,
  Trash2,
  Copy,
  Check,
  CheckCheck,
  ArrowUpRight,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import {
  uploadComponent4BusinessPlan,
  getComponent4Graph,
  downloadComponent4Report,
  getComponent4Candidates,
  submitComponent4IntakeAndRun,
  getComponent4BusinessHistory,
  getRecentComponent4Assessments,
  getComponent4Analysis
} from '../services/api';

/**
 * Robust helper to safely format any display value.
 * Unwraps nested {value: ...} objects, formats currency, months, and percentages.
 * NEVER renders [object Object], undefined, null, or NaN.
 */
export const formatDisplayValue = (val, fieldKey = '', unit = '') => {
  if (val === null || val === undefined || val === '') {
    return 'Not specified';
  }

  // Handle object wrappers (e.g. from dynamic intake or provenance facts)
  if (typeof val === 'object') {
    if (val.value !== undefined && val.value !== null) {
      return formatDisplayValue(val.value, fieldKey, unit || val.unit);
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return 'None';
      return val.map(item => (typeof item === 'object' ? item.name || item.title || 'Item' : String(item))).join(', ');
    }
    if (val.label || val.name) {
      return val.label || val.name;
    }
    const cleanEntries = Object.entries(val)
      .filter(([k]) => !['provenance', 'status', 'recorded_at'].includes(k));
    if (cleanEntries.length > 0) {
      return cleanEntries.map(([k, v]) => `${k.replace(/_/g, ' ')}: ${formatDisplayValue(v)}`).join('; ');
    }
    return 'Provided';
  }

  // Numeric formatting
  if (typeof val === 'number') {
    if (isNaN(val)) return 'N/A';
    const keyLower = String(fieldKey).toLowerCase();
    const isCurrency = keyLower.includes('lkr') || keyLower.includes('capital') || keyLower.includes('budget') ||
      keyLower.includes('cost') || keyLower.includes('revenue') || keyLower.includes('outlay') || keyLower.includes('loan') || unit === 'LKR';
    if (isCurrency) {
      return `LKR ${Number(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    }
    if (keyLower.includes('months') || unit === 'Months') {
      return `${Number(val).toFixed(1)} Months`;
    }
    if (keyLower.includes('score') || unit === 'Score') {
      return `${val} / 5`;
    }
    if (keyLower.includes('days') || unit === 'Days') {
      return `${val} Days`;
    }
    if (keyLower.includes('count') || keyLower.includes('staff') || keyLower.includes('customers')) {
      return Number(val).toLocaleString();
    }
    return val.toLocaleString();
  }

  // String formatting
  const str = String(val).trim();
  if (str === 'Unknown' || str === 'Not available' || str === 'N/A') {
    return 'Not available (marked unknown)';
  }
  return str;
};

export default function Component4RiskSuite({ initialPlanData = null }) {
  // Guided 5-Step Workflow: 1 = Upload, 2 = Review, 3 = Pre-Check, 4 = Results, 5 = History
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Upload & Extraction State
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedFilePath, setUploadedFilePath] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [availableFacts, setAvailableFacts] = useState({});
  const [missingFormSchema, setMissingFormSchema] = useState([]);
  const [sufficiencyStatus, setSufficiencyStatus] = useState('PARTIAL');
  const [candidateMatches, setCandidateMatches] = useState([]);
  const [confirmedBusinessId, setConfirmedBusinessId] = useState('');
  const [isReusedProfile, setIsReusedProfile] = useState(false);

  // Dynamic Intake State
  const [formData, setFormData] = useState({});
  const [unknownToggles, setUnknownToggles] = useState({});
  const [declaredRelationships, setDeclaredRelationships] = useState([]);

  // Database Records & History (Zero fake initializers)
  const [recentAssessments, setRecentAssessments] = useState([]);
  const [assessmentHistory, setAssessmentHistory] = useState([]);
  const [copiedId, setCopiedId] = useState(false);

  // Active Assessment Output
  const [analysisResult, setAnalysisResult] = useState(null);
  const [graphData, setGraphData] = useState(null);

  // Collapsible Advanced Section in Step 4
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Checklist for user-confirmed mitigation items
  const [plannedMitigations, setPlannedMitigations] = useState({});

  // On mount: Fetch actual database runs. Never auto-load dummy sample plan!
  useEffect(() => {
    loadRecentDatabaseAssessments();
  }, []);

  const loadRecentDatabaseAssessments = async () => {
    try {
      const res = await getRecentComponent4Assessments(15);
      if (res && res.success && res.assessments) {
        setRecentAssessments(res.assessments);
      }
    } catch (err) {
      console.warn('Could not fetch recent assessments:', err);
    }
  };

  const fetchBusinessHistory = async (bId) => {
    if (!bId) return;
    try {
      const hRes = await getComponent4BusinessHistory(bId);
      if (hRes && hRes.success) {
        setAssessmentHistory(hRes.history || []);
      }
    } catch (err) {
      console.warn('Could not fetch assessment history:', err);
    }
  };

  // Reopen a saved assessment from database
  const handleLoadSavedAssessment = async (analysisId, bId) => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await getComponent4Analysis(analysisId);
      const data = res?.data || res;
      if (res?.success && data) {
        setAnalysisResult(data);
        setExtractedData(data.plan_extraction || null);
        const activeId = bId || data.resolved_entity?.entity_id || data.business_id || '';
        setConfirmedBusinessId(activeId);
        setIsReusedProfile(true);

        const gRes = await getComponent4Graph(activeId);
        setGraphData(gRes);

        fetchBusinessHistory(activeId);
        setSuccessMsg(`Loaded verified assessment run [${analysisId}] from database.`);
        setCurrentStep(4); // Open Step 4: Results
      } else {
        setErrorMsg(`Unable to load analysis: ${res?.error || 'No record found'}`);
      }
    } catch (err) {
      setErrorMsg(`Failed to load assessment: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  };

  // Upload and structured extraction
  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMsg('Please select a business plan document (.json, .pdf, .docx, .txt).');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await uploadComponent4BusinessPlan(selectedFile, confirmedBusinessId);
      if (!res.success) {
        setErrorMsg(res.error || 'Validation failed for uploaded file.');
        return;
      }
      setUploadedFilePath(res.file_path);
      setExtractedData(res.extraction);
      setAvailableFacts(res.available_facts || {});
      setMissingFormSchema(res.missing_form_schema || []);
      setSufficiencyStatus(res.sufficiency_status || 'PARTIAL');
      setCandidateMatches(res.candidate_matches || []);
      setIsReusedProfile(Boolean(res.existing_business_id));

      const targetId = res.existing_business_id || res.suggested_business_id || res.resolved_entity?.entity_id || '';
      setConfirmedBusinessId(targetId);

      // Initialize form fields for missing fields
      const initialForm = {};
      const initialUnknowns = {};
      (res.missing_form_schema || []).forEach(f => {
        initialForm[f.field_key] = '';
        initialUnknowns[f.field_key] = false;
      });
      setFormData(initialForm);
      setUnknownToggles(initialUnknowns);

      if (res.existing_business_id) {
        fetchBusinessHistory(res.existing_business_id);
      }

      setSuccessMsg(`Extracted verified facts from '${res.filename}'. Please review your business details.`);
      setCurrentStep(2); // Advance to Step 2: Review Details
    } catch (err) {
      setErrorMsg(`Upload failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Import active Component 1 session plan
  const handleAnalyzeActivePlan = async () => {
    if (!initialPlanData) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const payload = {
        plan_json: initialPlanData,
        confirmed_business_id: initialPlanData.metadata?.record_id || confirmedBusinessId || null,
        completed_fields: {}
      };
      const res = await submitComponent4IntakeAndRun(payload);
      const data = res?.data || res;
      setAnalysisResult(data);
      const activeId = res.persistent_business_id || confirmedBusinessId || data.resolved_entity?.entity_id;
      setConfirmedBusinessId(activeId);
      setIsReusedProfile(res.is_reused_profile);

      const gRes = await getComponent4Graph(activeId);
      setGraphData(gRes);

      fetchBusinessHistory(activeId);
      loadRecentDatabaseAssessments();

      setSuccessMsg(`Active business plan evaluated successfully (Reference: ${activeId}).`);
      setCurrentStep(4); // Open Step 4: Results
    } catch (err) {
      setErrorMsg(`Active plan assessment failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFormFieldChange = (fieldKey, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  const handleToggleUnknown = (fieldKey) => {
    setUnknownToggles(prev => {
      const nextState = !prev[fieldKey];
      if (nextState) {
        setFormData(f => ({ ...f, [fieldKey]: 'Unknown' }));
      } else {
        setFormData(f => ({ ...f, [fieldKey]: '' }));
      }
      return { ...prev, [fieldKey]: nextState };
    });
  };

  const handleAddDeclaredRelationship = () => {
    setDeclaredRelationships(prev => [
      ...prev,
      {
        partner_name: '',
        partner_type: 'SUPPLIER',
        relationship_type: 'SUPPLIES',
        transaction_value_lkr: '',
        dependency_percentage: '',
        payment_delay_days: ''
      }
    ]);
  };

  const handleUpdateDeclaredRelationship = (index, field, value) => {
    setDeclaredRelationships(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveDeclaredRelationship = (index) => {
    setDeclaredRelationships(prev => prev.filter((_, i) => i !== index));
  };

  // Submit confirmed details and run the actual risk assessment pipeline
  const handleSubmitIntakeAndRun = async () => {
    if (!uploadedFilePath && !extractedData) {
      setErrorMsg('Please upload a business plan before running assessment.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const completedFields = {};
      missingFormSchema.forEach(f => {
        const k = f.field_key;
        if (unknownToggles[k]) {
          completedFields[k] = 'Unknown';
        } else if (formData[k] !== undefined && formData[k] !== '') {
          completedFields[k] = f.data_type === 'number' ? Number(formData[k]) : formData[k];
        }
      });

      const validRels = declaredRelationships
        .filter(r => r.partner_name && r.partner_name.trim() !== '')
        .map(r => ({
          partner_name: r.partner_name.trim(),
          partner_type: r.partner_type,
          relationship_type: r.relationship_type,
          transaction_value_lkr: r.transaction_value_lkr ? Number(r.transaction_value_lkr) : null,
          dependency_percentage: r.dependency_percentage ? Number(r.dependency_percentage) : null,
          payment_delay_days: r.payment_delay_days ? Number(r.payment_delay_days) : null
        }));

      const payload = {
        plan_file_path: uploadedFilePath,
        confirmed_business_id: confirmedBusinessId || null,
        completed_fields: completedFields,
        declared_relationships: validRels
      };

      const res = await submitComponent4IntakeAndRun(payload);
      const data = res?.data || res;
      setAnalysisResult(data);
      const activeId = res.persistent_business_id || confirmedBusinessId || data.resolved_entity?.entity_id;
      setConfirmedBusinessId(activeId);
      setIsReusedProfile(res.is_reused_profile);

      // Retrieve verified vs declared trade graph
      const gRes = await getComponent4Graph(activeId);
      setGraphData(gRes);

      // Refresh database history
      fetchBusinessHistory(activeId);
      loadRecentDatabaseAssessments();

      setSuccessMsg(`Assessment complete for business reference ${activeId}!`);
      setCurrentStep(4); // Advance to Step 4: Results
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'object' && detail?.message ? `${detail.message}: ${detail.errors?.join(', ')}` : (detail || err.message);
      setErrorMsg(`Assessment failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyBusinessId = () => {
    if (confirmedBusinessId) {
      navigator.clipboard.writeText(confirmedBusinessId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const toggleMitigationPlanned = (idx) => {
    setPlannedMitigations(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const handleDownloadReport = async () => {
    const activeAnalysisId = analysisResult?.analysis_id;
    if (!activeAnalysisId) return;
    try {
      await downloadComponent4Report(activeAnalysisId);
    } catch (err) {
      setErrorMsg(`Could not download report: ${err.message}`);
    }
  };

  const handleStartNewAssessment = () => {
    setSelectedFile(null);
    setUploadedFilePath(null);
    setExtractedData(null);
    setAvailableFacts({});
    setMissingFormSchema([]);
    setConfirmedBusinessId('');
    setIsReusedProfile(false);
    setAnalysisResult(null);
    setGraphData(null);
    setErrorMsg(null);
    setSuccessMsg(null);
    setCurrentStep(1);
  };

  // Plain English Risk Category Badge
  const getRiskCategoryBadge = (category) => {
    switch (String(category).toUpperCase()) {
      case 'LOW':
        return <span className="c4-badge c4-badge-low">LOW RISK</span>;
      case 'MEDIUM':
        return <span className="c4-badge c4-badge-medium">MODERATE RISK</span>;
      case 'HIGH':
        return <span className="c4-badge c4-badge-high">ELEVATED RISK</span>;
      default:
        return <span className="c4-badge" style={{ background: '#334155', color: '#cbd5e1' }}>{category || 'EVALUATING'}</span>;
    }
  };

  // Plain English Growth Readiness Badge
  const getReadinessBadge = (decision) => {
    switch (String(decision).toUpperCase()) {
      case 'PROCEED':
        return <span className="c4-badge c4-badge-proceed">READY TO PROCEED</span>;
      case 'MODIFY':
        return <span className="c4-badge c4-badge-modify">PROCEED WITH MODIFICATIONS</span>;
      case 'DELAY':
      case 'PAUSE':
        return <span className="c4-badge c4-badge-delay">PAUSE & MITIGATE RISKS</span>;
      case 'INSUFFICIENT_DATA':
        return <span className="c4-badge c4-badge-insufficient">MORE EVIDENCE NEEDED</span>;
      default:
        return <span className="c4-badge" style={{ background: '#334155', color: '#cbd5e1' }}>{decision || 'PENDING'}</span>;
    }
  };

  const getProvenanceBadge = (provenance) => {
    switch (provenance) {
      case 'VERIFIED_OBSERVED':
      case 'INDEPENDENTLY_VERIFIED':
        return <span className="c4-prov-verified">Independently Verified</span>;
      case 'EXTRACTED_FROM_PLAN':
        return <span className="c4-prov-verified">Extracted from Plan</span>;
      case 'USER_DECLARED':
        return <span className="c4-prov-declared">Confirmed by Owner</span>;
      case 'SIMULATED_SCENARIO':
        return <span className="c4-prov-scenario">Simulated Research Data</span>;
      default:
        return <span className="c4-prov-verified">{provenance || 'Plan Document'}</span>;
    }
  };

  // Analysis result shortcuts
  const summary = analysisResult?.summary || analysisResult?.overall_summary || {};
  const resolved = analysisResult?.resolved_entity || {};
  const stage6 = analysisResult?.stage6_risk_assessment || {};
  const stage7 = analysisResult?.stage7_gnn_inference || {};
  const readiness = analysisResult?.growth_readiness || {};
  const plan = analysisResult?.plan_extraction || extractedData || {};
  const hasActiveResult = Boolean(analysisResult);

  // Stepper steps configuration
  const stepsConfig = [
    { num: 1, title: 'Upload Plan', sub: 'Choose business plan document' },
    { num: 2, title: 'Review Details', sub: 'Confirm facts & missing info' },
    { num: 3, title: 'Pre-Assessment Check', sub: 'Verify readiness checks' },
    { num: 4, title: 'Your Results', sub: 'Risks & practical recommendations' },
    { num: 5, title: 'Track Progress', sub: 'Previous assessments & history' }
  ];

  return (
    <div className="c4-container">

      {/* Top Banner Header */}
      <div className="c4-header-banner">
        <div className="c4-header-top">
          <div>
            <div className="c4-header-badge">
              <ShieldAlert size={15} />
              SME360 AI &bull; Business Risk Assessment
            </div>
            <h1 className="c4-header-title">
              Business Risk Check & Growth Evaluation
            </h1>
            <p className="c4-header-subtitle">
              A guided, plain-language assessment for Sri Lankan SMEs. Evaluates financial runway, debt burden, operational readiness, and supply chain stability within Western Province (Colombo, Gampaha, Kalutara).
            </p>
          </div>

          <div className="c4-header-actions">
            {hasActiveResult && (
              <button
                onClick={handleDownloadReport}
                className="btn btn-primary"
                style={{ fontSize: '0.8rem', padding: '0.6rem 1.1rem' }}
                title="Download comprehensive audit report"
              >
                <Download size={15} />
                Download Report (.md)
              </button>
            )}
            <button
              onClick={handleStartNewAssessment}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.6rem 1.1rem' }}
              title="Start a fresh evaluation"
            >
              <UploadCloud size={15} />
              Start New Check
            </button>
          </div>
        </div>

        {/* Business Reference Number Sub-bar (if business identified) */}
        {confirmedBusinessId && (
          <div className="c4-id-subbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <span style={{ color: '#94a3b8' }}>Business Reference Number:</span>
              <span className="c4-id-badge" title="Permanent identifier for this business record">
                {confirmedBusinessId}
              </span>
              <button
                onClick={handleCopyBusinessId}
                title="Copy Reference Number"
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                {copiedId ? <Check size={14} style={{ color: '#34d399' }} /> : <Copy size={14} />}
              </button>
              {isReusedProfile && (
                <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                  EXISTING BUSINESS RECORD REUSED
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#94a3b8', fontSize: '0.74rem' }}>
              <span>Coverage: <strong style={{ color: '#ffffff' }}>Western Province (Colombo, Gampaha, Kalutara)</strong></span>
              <span>Past Checks: <strong style={{ color: '#818cf8' }}>{assessmentHistory.length}</strong></span>
            </div>
          </div>
        )}

        {/* Notification alerts */}
        {errorMsg && (
          <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '8px', color: '#6ee7b7', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* GUIDED 5-STEP WORKFLOW STEPPER */}
      <div className="c4-stepper-wrapper">
        <div className="c4-stepper">
          {stepsConfig.map((step, idx) => {
            const isCompleted = (step.num === 1 && Boolean(extractedData || uploadedFilePath)) ||
                                (step.num === 2 && Boolean(extractedData)) ||
                                (step.num === 3 && hasActiveResult) ||
                                (step.num === 4 && hasActiveResult);
            const isActive = currentStep === step.num;
            const isDisabled = (step.num === 2 && !extractedData && !uploadedFilePath) ||
                               (step.num === 3 && !extractedData && !uploadedFilePath) ||
                               (step.num === 4 && !hasActiveResult);

            return (
              <React.Fragment key={step.num}>
                <button
                  type="button"
                  disabled={isDisabled}
                  onClick={() => !isDisabled && setCurrentStep(step.num)}
                  className={`c4-step-item ${isActive ? 'is-active' : ''} ${isCompleted ? 'is-completed' : ''} ${isDisabled ? 'is-disabled' : ''}`}
                >
                  <div className="c4-step-badge">
                    {isCompleted && !isActive ? <Check size={16} /> : step.num}
                  </div>
                  <div className="c4-step-text">
                    <span className="c4-step-label">Step {step.num}: {step.title}</span>
                    <span className="c4-step-sub">{step.sub}</span>
                  </div>
                </button>
                {idx < stepsConfig.length - 1 && (
                  <ChevronRight size={16} className="c4-step-arrow" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: UPLOAD YOUR BUSINESS PLAN                                        */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="c4-card">
          <div className="c4-card-title">
            <UploadCloud size={19} style={{ color: '#818cf8' }} />
            Step 1: Upload Your Business Plan
          </div>
          <p className="c4-card-desc">
            Please upload the business plan generated by Component 1 (the SME360 AI Business Plan tool). The system will automatically extract available financial targets, operational requirements, and growth strategies.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
            
            {/* Upload Box */}
            <div>
              <div className="c4-dropzone">
                <input
                  type="file"
                  id="business-plan-file-input"
                  accept=".json,.pdf,.docx,.txt,.md"
                  onChange={handleFileChange}
                />
                <UploadCloud className="c4-dropzone-icon" />
                <div className="c4-dropzone-title">
                  {selectedFile ? selectedFile.name : 'Click or Drag & Drop Business Plan Document'}
                </div>
                <div className="c4-dropzone-hint">
                  Supports JSON (Recommended), PDF, Word (.docx), or Text (.txt) up to 15 MB
                </div>
              </div>

              {selectedFile && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#c7d2fe', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FileText size={15} />
                  <span>Selected: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}

              <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  id="extract-facts-btn"
                  onClick={handleUpload}
                  disabled={!selectedFile || loading}
                  className="btn btn-primary"
                  style={{ padding: '0.85rem', fontSize: '0.88rem' }}
                >
                  <UploadCloud size={16} />
                  {loading ? 'Reading Document & Extracting Facts...' : 'Extract Facts & Continue to Step 2'}
                </button>

                {initialPlanData && (
                  <button
                    onClick={handleAnalyzeActivePlan}
                    disabled={loading}
                    className="btn btn-secondary"
                    style={{ padding: '0.85rem', fontSize: '0.85rem', borderColor: '#3b82f6' }}
                  >
                    <FolderOpen size={16} style={{ color: '#60a5fa' }} />
                    Use Active Business Plan from Current Session
                  </button>
                )}
              </div>
            </div>

            {/* SME Guidance Card */}
            <div style={{ background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Info size={16} style={{ color: '#38bdf8' }} />
                  What you should know before starting:
                </div>
                <ul style={{ paddingLeft: '1.2rem', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <li>
                    <strong>Document origin:</strong> You can upload JSON, PDF, DOCX, or text generated by Component 1.
                  </li>
                  <li>
                    <strong>Geographic boundary:</strong> Sri Lanka Western Province only (Colombo, Gampaha, Kalutara). Businesses outside this boundary are flagged.
                  </li>
                  <li>
                    <strong>Missing information:</strong> If your plan doesn't have all details, Step 2 will ask only for what is missing. You can mark any unknown item as &ldquo;I don't know&rdquo;.
                  </li>
                  <li>
                    <strong>No guessed data:</strong> The system will never invent fake financial values or manufacture fictitious trading partners.
                  </li>
                </ul>
              </div>

              {recentAssessments.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.85rem' }}>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                    Looking for a previously evaluated business?
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(5)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.45rem 0.85rem', width: '100%' }}
                  >
                    <History size={14} />
                    View Previous Assessments ({recentAssessments.length} saved)
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: REVIEW YOUR BUSINESS DETAILS                                     */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Identity & Reference Header */}
          <div className="c4-card" style={{ borderColor: 'rgba(99, 102, 241, 0.35)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <div className="c4-card-title">
                  <Building size={18} style={{ color: '#818cf8' }} />
                  Business Reference & Identity Confirmation
                </div>
                <p className="c4-card-desc" style={{ marginBottom: 0 }}>
                  This unique reference keeps all your assessment history together under one persistent enterprise profile.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="c4-id-badge" style={{ fontSize: '0.8rem' }}>
                  {confirmedBusinessId || 'Pending Assignment'}
                </span>
                <button
                  onClick={handleCopyBusinessId}
                  className="btn btn-secondary"
                  style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem' }}
                >
                  {copiedId ? <Check size={14} style={{ color: '#34d399' }} /> : <Copy size={14} />}
                  Copy
                </button>
              </div>
            </div>

            {/* Candidate Match Selection if ambiguous */}
            {candidateMatches.length > 0 && (
              <div style={{ marginTop: '1rem', padding: '0.85rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                  <AlertTriangle size={15} /> Potential Registered Business Matches Found:
                </div>
                <p style={{ fontSize: '0.72rem', color: '#fde68a', marginBottom: '0.5rem' }}>
                  Please confirm if your business matches an existing record in our Western Province database:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {candidateMatches.map((c, i) => (
                    <div
                      key={i}
                      onClick={() => setConfirmedBusinessId(c.entity_id)}
                      style={{
                        padding: '0.45rem 0.75rem',
                        borderRadius: '6px',
                        border: confirmedBusinessId === c.entity_id ? '1px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.08)',
                        background: confirmedBusinessId === c.entity_id ? 'rgba(79, 70, 229, 0.25)' : 'rgba(15, 23, 42, 0.7)',
                        cursor: 'pointer',
                        fontSize: '0.74rem',
                        display: 'flex',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span style={{ fontFamily: 'monospace', color: '#c7d2fe' }}>[{c.entity_id}] {c.district} &bull; {c.business_category}</span>
                      <span style={{ color: '#94a3b8' }}>{Math.round(c.match_score * 100)}% Match</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section A: Extracted Document Facts (Pre-populated, no duplicate entry) */}
          <div className="c4-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div className="c4-card-title">
                  <CheckCheck size={18} style={{ color: '#10b981' }} />
                  Information Found in Your Plan ({Object.keys(availableFacts).length} Facts)
                </div>
                <p className="c4-card-desc" style={{ marginBottom: 0 }}>
                  We successfully extracted these details directly from your document. You do not need to re-enter them.
                </p>
              </div>
              <span style={{ fontSize: '0.74rem', color: '#34d399', background: 'rgba(16, 185, 129, 0.15)', padding: '0.25rem 0.65rem', borderRadius: '4px', fontWeight: 700 }}>
                Pre-Populated &bull; No Duplicate Entry
              </span>
            </div>

            <div className="c4-review-grid">
              {Object.entries(availableFacts).map(([k, fact]) => (
                <div key={k} className="c4-review-card">
                  <div className="c4-review-header">
                    <span className="c4-review-label">{k.replace(/_/g, ' ')}</span>
                    {getProvenanceBadge(fact.provenance)}
                  </div>
                  <div className="c4-review-value">
                    {formatDisplayValue(fact.value, k)}
                  </div>
                  <div className="c4-review-source">
                    <FileText size={12} />
                    <span>Source: {fact.source_reference || 'Uploaded Business Plan'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section B: Missing Information (Only what is needed for risk check) */}
          {missingFormSchema.length > 0 ? (
            <div className="c4-card" style={{ borderColor: 'rgba(245, 158, 11, 0.4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', paddingBottom: '0.85rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div>
                  <div className="c4-card-title" style={{ color: '#fbbf24' }}>
                    <Layers size={18} />
                    Additional Details Needed ({missingFormSchema.length} Missing Items)
                  </div>
                  <p className="c4-card-desc" style={{ marginBottom: 0 }}>
                    Why do we ask for this? The risk assessment checks financial runway, debt burden, and dependency risks. Adding these values makes your assessment much more accurate. You may mark unavailable items as &ldquo;I don't know&rdquo;.
                  </p>
                </div>
                <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '0.25rem 0.65rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                  Only Missing Fields
                </span>
              </div>

              <div className="c4-form-grid" style={{ marginTop: '1.25rem' }}>
                {missingFormSchema.map((field) => {
                  const isUnknown = Boolean(unknownToggles[field.field_key]);
                  const currentVal = formData[field.field_key] || '';

                  return (
                    <div
                      key={field.field_key}
                      className={`c4-form-card ${isUnknown ? 'is-unknown' : ''}`}
                    >
                      <div>
                        <div className="c4-form-field-header">
                          <label className="c4-form-field-label">
                            {field.label}
                            {field.required_for_full_readiness && <span style={{ color: '#f87171', marginLeft: '0.25rem' }}>*</span>}
                          </label>
                          {field.unit && <span style={{ fontSize: '0.68rem', color: '#818cf8', fontFamily: 'monospace' }}>{field.unit}</span>}
                        </div>
                        <p className="c4-form-field-desc">{field.description}</p>

                        {field.data_type === 'select' ? (
                          <select
                            disabled={isUnknown}
                            value={isUnknown ? '' : currentVal}
                            onChange={(e) => handleFormFieldChange(field.field_key, e.target.value)}
                            className="c4-input"
                          >
                            <option value="">-- Choose option --</option>
                            {field.options?.map((opt, oi) => (
                              <option key={oi} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : field.data_type === 'number' ? (
                          <input
                            type="number"
                            disabled={isUnknown}
                            min={field.min_value ?? 0}
                            max={field.max_value}
                            value={isUnknown ? '' : currentVal}
                            onChange={(e) => handleFormFieldChange(field.field_key, e.target.value)}
                            placeholder={isUnknown ? 'Marked as Unknown' : (field.unit ? `Enter amount in ${field.unit}` : 'Enter number')}
                            className="c4-input"
                            style={{ fontFamily: 'monospace' }}
                          />
                        ) : (
                          <input
                            type="text"
                            disabled={isUnknown}
                            value={isUnknown ? '' : currentVal}
                            onChange={(e) => handleFormFieldChange(field.field_key, e.target.value)}
                            placeholder={isUnknown ? 'Marked as Unknown' : 'Enter detail'}
                            className="c4-input"
                          />
                        )}
                      </div>

                      {/* Explicit Unknown Toggle */}
                      <div className="c4-unknown-toggle">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={isUnknown}
                            onChange={() => handleToggleUnknown(field.field_key)}
                          />
                          <span>I don't know / Not available</span>
                        </label>
                        {isUnknown && (
                          <span style={{ color: '#f59e0b', fontSize: '0.68rem', fontWeight: 600 }}>
                            Will evaluate with uncertainty penalty
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="c4-card" style={{ borderColor: 'rgba(16, 185, 129, 0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <CheckCircle2 size={20} style={{ color: '#34d399' }} />
                <div>
                  <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.88rem' }}>All Required Information Provided</div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Your uploaded business plan contains all the details needed for a complete assessment.</div>
                </div>
              </div>
            </div>
          )}

          {/* Section C: Suppliers & Customers (Optional, user declared) */}
          <div className="c4-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div className="c4-card-title">
                  <Network size={18} style={{ color: '#818cf8' }} />
                  Key Suppliers & Customers (Optional)
                </div>
                <p className="c4-card-desc" style={{ marginBottom: 0 }}>
                  If you have major suppliers or key business customers, list them below to evaluate supply-chain concentration. Only include relationships you actually have.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddDeclaredRelationship}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.45rem 0.85rem' }}
              >
                <Plus size={14} />
                Add Supplier or Customer
              </button>
            </div>

            {declaredRelationships.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1rem' }}>
                {declaredRelationships.map((rel, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.5fr 1fr 1fr 1fr auto',
                      gap: '0.75rem',
                      alignItems: 'center',
                      background: 'rgba(15, 23, 42, 0.6)',
                      padding: '0.85rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                  >
                    <div>
                      <label style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Partner Business Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Lanka Wholesale Ltd"
                        value={rel.partner_name}
                        onChange={(e) => handleUpdateDeclaredRelationship(idx, 'partner_name', e.target.value)}
                        className="c4-input"
                        style={{ fontSize: '0.75rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Type</label>
                      <select
                        value={rel.partner_type}
                        onChange={(e) => handleUpdateDeclaredRelationship(idx, 'partner_type', e.target.value)}
                        className="c4-input"
                        style={{ fontSize: '0.75rem' }}
                      >
                        <option value="SUPPLIER">Supplier</option>
                        <option value="BUYER">Customer / Buyer</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Monthly Value (LKR)</label>
                      <input
                        type="number"
                        placeholder="e.g. 250000"
                        value={rel.transaction_value_lkr}
                        onChange={(e) => handleUpdateDeclaredRelationship(idx, 'transaction_value_lkr', e.target.value)}
                        className="c4-input"
                        style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Payment Delay (Days)</label>
                      <input
                        type="number"
                        placeholder="e.g. 15"
                        value={rel.payment_delay_days}
                        onChange={(e) => handleUpdateDeclaredRelationship(idx, 'payment_delay_days', e.target.value)}
                        className="c4-input"
                        style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveDeclaredRelationship(idx)}
                      style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0.5rem', marginTop: '1rem' }}
                      title="Remove partner"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ marginTop: '0.85rem', padding: '0.85rem', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '8px', fontSize: '0.74rem', color: '#94a3b8' }}>
                No external suppliers or customers added. (Optional — if your business is new or independent, you can proceed without adding external partners).
              </div>
            )}
          </div>

          {/* Stepper Footer Controls */}
          <div className="c4-nav-footer">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="c4-btn-back"
            >
              <ArrowLeft size={16} />
              Back to Upload
            </button>
            <button
              id="continue-to-precheck-btn"
              type="button"
              onClick={() => setCurrentStep(3)}
              className="c4-btn-continue"
            >
              Continue to Pre-Assessment Check
              <ArrowRight size={16} />
            </button>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: PRE-ASSESSMENT READINESS CHECK                                   */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="c4-card">
            <div className="c4-card-title">
              <ShieldAlert size={19} style={{ color: '#818cf8' }} />
              Step 3: Check Your Business Risks Before Running
            </div>
            <p className="c4-card-desc">
              Here is what our assessment will check based on the information you provided. We evaluate 5 key solvency and stability factors to help you make sound business decisions.
            </p>

            <div className="c4-readiness-checklist">
              
              <div className="c4-check-item">
                <div className="c4-check-left">
                  <CheckCircle2 size={20} style={{ color: '#10b981' }} />
                  <div>
                    <div className="c4-check-title">1. Financial Stability & Cash Flow Runway</div>
                    <div className="c4-check-desc">
                      Checks whether your available capital ({formatDisplayValue(plan.available_capital_lkr || availableFacts.available_capital_lkr?.value, 'lkr')}) can support your monthly operating expenses ({formatDisplayValue(plan.monthly_budget_lkr || availableFacts.monthly_budget_lkr?.value, 'lkr')}) for at least 3 months.
                    </div>
                  </div>
                </div>
                <span className="c4-badge c4-badge-proceed">READY</span>
              </div>

              <div className="c4-check-item">
                <div className="c4-check-left">
                  <CheckCircle2 size={20} style={{ color: '#10b981' }} />
                  <div>
                    <div className="c4-check-title">2. Debt Burden & Borrowing Stress</div>
                    <div className="c4-check-desc">
                      Verifies whether monthly loan repayments are safe and sustainable compared to your projected turnover.
                    </div>
                  </div>
                </div>
                <span className="c4-badge c4-badge-proceed">READY</span>
              </div>

              <div className="c4-check-item">
                <div className="c4-check-left">
                  <CheckCircle2 size={20} style={{ color: '#10b981' }} />
                  <div>
                    <div className="c4-check-title">3. Growth Action Capital Stress</div>
                    <div className="c4-check-desc">
                      Assesses the upfront cost and recurring expenses of your proposed growth plan ({formatDisplayValue(plan.proposed_growth_action || 'Expansion')}) to prevent running out of money.
                    </div>
                  </div>
                </div>
                <span className="c4-badge c4-badge-proceed">READY</span>
              </div>

              <div className="c4-check-item">
                <div className="c4-check-left">
                  {declaredRelationships.length > 0 ? (
                    <CheckCircle2 size={20} style={{ color: '#10b981' }} />
                  ) : (
                    <Info size={20} style={{ color: '#38bdf8' }} />
                  )}
                  <div>
                    <div className="c4-check-title">4. Supplier & Customer Dependency</div>
                    <div className="c4-check-desc">
                      {declaredRelationships.length > 0
                        ? `Evaluates trade dependency across ${declaredRelationships.length} declared supply chain partners.`
                        : 'No external trade partners declared. Assessment will evaluate financial independence with standard baseline assumptions.'}
                    </div>
                  </div>
                </div>
                <span className="c4-badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                  {declaredRelationships.length > 0 ? 'PARTNERS INCLUDED' : 'STANDALONE MODE'}
                </span>
              </div>

              <div className="c4-check-item">
                <div className="c4-check-left">
                  <CheckCircle2 size={20} style={{ color: '#10b981' }} />
                  <div>
                    <div className="c4-check-title">5. Geographic Boundary Check</div>
                    <div className="c4-check-desc">
                      Confirmed in Western Province: {formatDisplayValue(plan.district || availableFacts.district?.value || 'Colombo')} District (Colombo, Gampaha, Kalutara).
                    </div>
                  </div>
                </div>
                <span className="c4-badge c4-badge-proceed">IN SCOPE</span>
              </div>

            </div>

            {/* Missing Info Warning Notice (if any items marked unknown) */}
            {Object.values(unknownToggles).some(Boolean) && (
              <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <AlertTriangle size={18} style={{ color: '#fbbf24', flexShrink: 0 }} />
                <div style={{ fontSize: '0.76rem', color: '#fde68a', lineHeight: 1.5 }}>
                  <strong>Honest Uncertainty Notice:</strong> You marked some details as &ldquo;Unknown&rdquo;. The assessment will proceed without inventing values, but will apply an uncertainty adjustment and note these information gaps in your final report.
                </div>
              </div>
            )}

            {/* Execution CTA Box */}
            <div style={{ marginTop: '2rem', textAlign: 'center', padding: '1.5rem', background: 'rgba(30, 27, 75, 0.4)', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.5rem' }}>
                Ready to evaluate your business plan?
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#c7d2fe', maxWidth: '640px', margin: '0 auto 1.25rem' }}>
                Our assessment rules and relational models will analyze your figures, identify potential pitfalls, and formulate practical risk mitigations.
              </p>
              <button
                id="run-assessment-submit-btn"
                onClick={handleSubmitIntakeAndRun}
                disabled={loading}
                className="btn btn-primary"
                style={{ padding: '0.85rem 2.25rem', fontSize: '0.95rem', fontWeight: 800, boxShadow: '0 6px 24px rgba(79, 70, 229, 0.4)' }}
              >
                <Activity size={18} />
                {loading ? 'Evaluating Risk & Calculating Readiness...' : 'Run Business Risk Assessment'}
              </button>
            </div>

          </div>

          {/* Stepper Footer Controls */}
          <div className="c4-nav-footer">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="c4-btn-back"
            >
              <ArrowLeft size={16} />
              Back to Review Details
            </button>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: UNDERSTAND YOUR RESULTS                                          */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <>
          {hasActiveResult ? (
            <div className="c4-results-container">

              {/* 1. Overall Assessment and Plain-Language Explanation */}
              <div className="c4-overall-hero-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      Overall Risk Assessment
                    </span>
                    <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ffffff', marginTop: '0.35rem' }}>
                      {resolved.business_name || plan.business_name || 'Your Enterprise'} &bull; {resolved.district || plan.district || 'Colombo'}
                    </h2>
                    <p style={{ fontSize: '0.825rem', color: '#c7d2fe', marginTop: '0.35rem', maxWidth: '720px', lineHeight: 1.5 }}>
                      {readiness.risk_adjusted_recommendation || 'Assessment completed successfully. Review your key metrics and practical recommendations below.'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    {getRiskCategoryBadge(stage6.overall_risk_category || summary.overall_risk_category)}
                    {getReadinessBadge(readiness.decision || summary.growth_readiness_decision)}
                  </div>
                </div>

                {/* Score Bar */}
                <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                    <span style={{ color: '#94a3b8' }}>
                      Overall Risk Score: <strong style={{ color: '#ffffff' }}>{(stage6.composite_risk_score || summary.composite_risk_score || 0).toFixed(2)}</strong> / 1.00
                    </span>
                    <span style={{ color: '#64748b', fontSize: '0.72rem' }}>
                      (Lower score is safer &bull; Scores below 0.35 reflect solid fundamentals)
                    </span>
                  </div>
                  <div className="c4-bar-bg" style={{ height: '10px' }}>
                    <div
                      className="c4-bar-fill"
                      style={{
                        width: `${Math.min(100, (stage6.composite_risk_score || summary.composite_risk_score || 0) * 100)}%`,
                        background: (stage6.overall_risk_category || summary.overall_risk_category) === 'HIGH' ? '#ef4444' :
                                    (stage6.overall_risk_category || summary.overall_risk_category) === 'MEDIUM' ? '#f59e0b' : '#10b981'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 2 & 3. Three Most Important Risks & Why They Were Identified */}
              <div className="c4-card">
                <div className="c4-card-title">
                  <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
                  Main Business Risks Identified ({stage6.primary_risk_drivers?.length || 0})
                </div>
                <p className="c4-card-desc">
                  Based on your uploaded financial targets and operational constraints, here are the most important risks requiring your attention:
                </p>

                {stage6.primary_risk_drivers && stage6.primary_risk_drivers.length > 0 ? (
                  <div className="c4-top-risks-list">
                    {stage6.primary_risk_drivers.slice(0, 3).map((driver, idx) => (
                      <div
                        key={idx}
                        className={`c4-risk-driver-card ${driver.severity === 'HIGH' ? 'is-high' : driver.severity === 'LOW' ? 'is-low' : ''}`}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.84rem', color: '#ffffff' }}>
                            {idx + 1}. {driver.factor?.replace(/_/g, ' ').toUpperCase() || 'Risk Hurdle'}
                          </span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: driver.severity === 'HIGH' ? '#f87171' : '#fbbf24' }}>
                            {driver.severity} PRIORITY
                          </span>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
                          {driver.description}
                        </p>
                        {driver.metric_value !== undefined && (
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                            Observed Value: <strong style={{ color: '#ffffff' }}>{formatDisplayValue(driver.metric_value, driver.factor)}</strong> &bull; Benchmark Threshold: {formatDisplayValue(driver.benchmark_threshold, driver.factor)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '1.25rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', color: '#6ee7b7', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <CheckCircle2 size={18} />
                    <span>No critical risk hurdles detected! Your cash runway, debt level, and staffing capacity satisfy all standard safety thresholds.</span>
                  </div>
                )}
              </div>

              {/* Solvency Dimensions Breakdown */}
              <div className="c4-card">
                <div className="c4-card-title">
                  <Activity size={18} style={{ color: '#818cf8' }} />
                  Solvency Dimensions Breakdown
                </div>
                <p className="c4-card-desc">
                  Scores across the 5 primary solvency factors (0.00 = safe, 1.00 = high risk):
                </p>

                <div className="c4-metrics-grid">
                  <div className="c4-metric-card">
                    <div className="c4-metric-label">
                      <span>Cash Runway (30%)</span>
                      <DollarSign size={15} style={{ color: '#10b981' }} />
                    </div>
                    <div className="c4-metric-value">
                      {(stage6.sub_scores?.liquidity_risk || 0).toFixed(2)}
                    </div>
                    <div className="c4-metric-subtext">
                      Runway: {formatDisplayValue(plan.capital_runway_months, 'months')}
                    </div>
                  </div>

                  <div className="c4-metric-card">
                    <div className="c4-metric-label">
                      <span>Debt Burden (20%)</span>
                      <ShieldAlert size={15} style={{ color: '#38bdf8' }} />
                    </div>
                    <div className="c4-metric-value">
                      {(stage6.sub_scores?.debt_burden_risk || 0).toFixed(2)}
                    </div>
                    <div className="c4-metric-subtext">
                      Debt: {formatDisplayValue(plan.outstanding_debt_lkr || 0, 'lkr')}
                    </div>
                  </div>

                  <div className="c4-metric-card">
                    <div className="c4-metric-label">
                      <span>Growth Stress (25%)</span>
                      <TrendingUp size={15} style={{ color: '#f59e0b' }} />
                    </div>
                    <div className="c4-metric-value">
                      {(stage6.sub_scores?.growth_action_stress || 0).toFixed(2)}
                    </div>
                    <div className="c4-metric-subtext">
                      Action: {formatDisplayValue(readiness.original_proposed_action || plan.proposed_growth_action || 'start')}
                    </div>
                  </div>

                  <div className="c4-metric-card">
                    <div className="c4-metric-label">
                      <span>Trade Dependencies (25%)</span>
                      <Network size={15} style={{ color: '#c084fc' }} />
                    </div>
                    <div className="c4-metric-value">
                      {(Math.max(stage6.sub_scores?.supplier_concentration_risk || 0, stage6.sub_scores?.customer_concentration_risk || 0)).toFixed(2)}
                    </div>
                    <div className="c4-metric-subtext">
                      Concentration score
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Practical Mitigation Actions */}
              <div className="c4-card">
                <div className="c4-card-title">
                  <CheckSquare size={18} style={{ color: '#10b981' }} />
                  How to Reduce Your Risks (Actionable Steps)
                </div>
                <p className="c4-card-desc">
                  Recommended practical actions to strengthen your business. Check off items as you plan or execute them:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                  {(stage6.recommended_mitigations || []).length > 0 ? (
                    stage6.recommended_mitigations.map((mit, i) => {
                      const isPlanned = Boolean(plannedMitigations[i]);
                      return (
                        <div
                          key={i}
                          onClick={() => toggleMitigationPlanned(i)}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.85rem',
                            padding: '1rem',
                            background: isPlanned ? 'rgba(16, 185, 129, 0.1)' : 'rgba(15, 23, 42, 0.6)',
                            border: isPlanned ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ marginTop: '0.15rem', color: isPlanned ? '#34d399' : '#64748b' }}>
                            {isPlanned ? <CheckSquare size={18} /> : <Square size={18} />}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: isPlanned ? '#34d399' : '#ffffff' }}>
                              {mit.action || mit.title || 'Mitigation Action'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '0.2rem' }}>
                              {mit.mechanism || mit.description}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                              Recommended timeframe: <strong>{mit.time_horizon || '1-3 months'}</strong> &bull; Targets: {mit.risk_factor?.replace(/_/g, ' ')}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', color: '#34d399', fontSize: '0.78rem' }}>
                      No urgent risk interventions required. Continue standard monthly cash tracking.
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Assessment of Proposed Growth Action */}
              <div className="c4-card">
                <div className="c4-card-title">
                  <TrendingUp size={18} style={{ color: '#38bdf8' }} />
                  Is Your Business Ready to Grow?
                </div>
                <p className="c4-card-desc">
                  Evaluation of your proposed action: <strong>{formatDisplayValue(readiness.original_proposed_action || plan.proposed_growth_action || 'start')}</strong> under strategy <strong>{formatDisplayValue(readiness.original_strategy || plan.primary_strategy || 'Hybrid Model')}</strong>.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginTop: '1rem' }}>
                  
                  <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.25rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                      Growth Strategy Decision
                    </div>
                    <div style={{ marginTop: '0.65rem' }}>
                      {getReadinessBadge(readiness.decision || summary.growth_readiness_decision)}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '0.75rem', lineHeight: 1.5 }}>
                      {readiness.decision_rationales || 'Plan demonstrates sufficient operational and capital buffers.'}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.25rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                      Cash Runway Impact
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Before Action</div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#38bdf8' }}>
                          {formatDisplayValue(readiness.capital_runway_impact?.pre_action_cash_runway_months, 'months')}
                        </div>
                      </div>
                      <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.1)', paddingLeft: '1.5rem' }}>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>After Action Buffer</div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#34d399' }}>
                          {formatDisplayValue(readiness.capital_runway_impact?.post_action_cash_runway_months, 'months')}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.65rem' }}>
                      Required initial outlay: {formatDisplayValue(readiness.capital_runway_impact?.required_initial_investment_lkr, 'lkr')}
                    </div>
                  </div>

                </div>
              </div>

              {/* 6. Recommended Next Steps & Information Gaps */}
              <div className="c4-card" style={{ background: 'rgba(30, 27, 75, 0.35)', borderColor: 'rgba(99, 102, 241, 0.3)' }}>
                <div className="c4-card-title">
                  <Info size={18} style={{ color: '#818cf8' }} />
                  Recommended Next Steps for Your Business
                </div>
                <ul style={{ paddingLeft: '1.2rem', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.6, marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <li>
                    <strong>Execute planned growth phases:</strong> Proceed step-by-step without committing all upfront capital at once.
                  </li>
                  <li>
                    <strong>Track monthly cash burn:</strong> Maintain at least 3 months of operating expenses in cash reserves.
                  </li>
                  <li>
                    <strong>Address information gaps:</strong> If you marked any fields as unknown, collect those records as operations progress to improve subsequent assessments.
                  </li>
                </ul>
              </div>

              {/* 7. Optional Collapsible Advanced Technical Section */}
              <div className="c4-advanced-accordion">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="c4-accordion-btn"
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Network size={16} style={{ color: '#818cf8' }} />
                    Advanced Technical Analysis (Relational Network & GNN Engine)
                  </span>
                  {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showAdvanced && (
                  <div className="c4-advanced-body">
                    
                    {/* Graph Canvas */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>
                          Western Province B2B Trade Network Topology
                        </span>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem' }}>
                          <span style={{ color: '#34d399' }}>&bull; Solid Line: Independently Verified</span>
                          <span style={{ color: '#f59e0b' }}>&bull; Dashed Line: Declared by Owner</span>
                        </div>
                      </div>

                      <div className="c4-network-canvas">
                        {graphData && graphData.nodes?.length > 0 ? (
                          <svg width="100%" height="100%" viewBox="0 0 800 360" style={{ overflow: 'visible' }}>
                            <defs>
                              <linearGradient id="c4TargetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#4f46e5" />
                                <stop offset="100%" stopColor="#818cf8" />
                              </linearGradient>
                            </defs>

                            {/* Center target node */}
                            <circle cx="340" cy="180" r="32" fill="url(#c4TargetGrad)" stroke="#a5b4fc" strokeWidth="2" />
                            <text x="340" y="176" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="700">
                              {resolved.business_name?.slice(0, 14) || 'Your SME'}
                            </text>
                            <text x="340" y="192" textAnchor="middle" fill="#c7d2fe" fontSize="8" fontFamily="monospace">
                              {confirmedBusinessId?.slice(0, 12)}
                            </text>

                            {/* Render connected nodes if any */}
                            {graphData.nodes.filter(n => !n.is_target).map((node, i) => {
                              const angle = (i / Math.max(1, graphData.nodes.length - 1)) * Math.PI * 1.5 - Math.PI * 0.75;
                              const nx = 340 + Math.cos(angle) * 190;
                              const ny = 180 + Math.sin(angle) * 110;
                              const isVerified = node.verified;

                              return (
                                <g key={node.id || i}>
                                  <line
                                    x1="340"
                                    y1="180"
                                    x2={nx}
                                    y2={ny}
                                    stroke={isVerified ? '#10b981' : '#f59e0b'}
                                    strokeWidth="2"
                                    strokeDasharray={isVerified ? 'none' : '4,4'}
                                  />
                                  <circle
                                    cx={nx}
                                    cy={ny}
                                    r="20"
                                    fill={isVerified ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}
                                    stroke={isVerified ? '#10b981' : '#f59e0b'}
                                    strokeWidth="2"
                                  />
                                  <text x={nx} y={ny + 3} textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="700">
                                    {node.label?.slice(0, 10)}
                                  </text>
                                  <text x={nx} y={ny + 32} textAnchor="middle" fill="#94a3b8" fontSize="8">
                                    {node.type} ({isVerified ? 'Verified' : 'Declared'})
                                  </text>
                                </g>
                              );
                            })}
                          </svg>
                        ) : (
                          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                            <Network size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                            <div>Standalone Enterprise &bull; No verified network edges in database</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem' }}>Zero artificial edges fabricated for isolated businesses.</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* GNN Inference Details */}
                    <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '1.25rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#c7d2fe' }}>
                          Stage 7 Graph Neural Network (GNN) Engine Disclosure
                        </span>
                        <span className="c4-badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
                          Status: {stage7.gnn_status || 'STANDALONE_FALLBACK'}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                        {stage7.explanation || 'Evaluates supply chain relational topology. When valid graph edges exist, GNN contextual embeddings adjust risk; otherwise falls back cleanly to deterministic Stage 6 solvency scoring.'}
                      </p>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.5rem', fontStyle: 'italic' }}>
                        Methodology disclosure: GNN predictions represent decision-support indices and are NOT real-world corporate default probabilities.
                      </div>
                    </div>

                  </div>
                )}
              </div>

              {/* Stepper Footer Controls */}
              <div className="c4-nav-footer">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="c4-btn-back"
                >
                  <ArrowLeft size={16} />
                  Back to Pre-Assessment Check
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="c4-btn-continue"
                >
                  View Assessment History & Progress
                  <ArrowRight size={16} />
                </button>
              </div>

            </div>
          ) : (
            <div className="c4-empty-state">
              <ShieldAlert className="c4-empty-icon" />
              <div className="c4-empty-title">No Assessment Results Available</div>
              <div className="c4-empty-desc">
                Please upload a business plan in Step 1 to generate an assessment.
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="btn btn-primary"
              >
                Go to Step 1: Upload Plan
              </button>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* STEP 5: TRACK YOUR PROGRESS & PREVIOUS ASSESSMENTS                      */}
      {/* ========================================================================= */}
      {currentStep === 5 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="c4-card">
            <div className="c4-card-title">
              <History size={18} style={{ color: '#818cf8' }} />
              Step 5: Track Your Business Assessments & Progress
            </div>
            <p className="c4-card-desc">
              Review previous assessment reports for your business, track improvements over time, or inspect verified runs stored in the database.
            </p>

            {/* Current Active Business Reference */}
            {confirmedBusinessId && (
              <div style={{ padding: '1rem', background: 'rgba(30, 27, 75, 0.4)', borderRadius: '10px', border: '1px solid rgba(99, 102, 241, 0.3)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Active Business Reference
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', marginTop: '0.2rem' }}>
                    {resolved.business_name || plan.business_name || 'Active Enterprise'} &bull; <span style={{ fontFamily: 'monospace', color: '#818cf8' }}>{confirmedBusinessId}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={handleCopyBusinessId}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.45rem 0.85rem' }}
                  >
                    {copiedId ? <Check size={14} style={{ color: '#34d399' }} /> : <Copy size={14} />}
                    Copy ID
                  </button>
                  {hasActiveResult && (
                    <button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      className="btn btn-primary"
                      style={{ fontSize: '0.75rem', padding: '0.45rem 0.85rem' }}
                    >
                      Return to Results
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Database Assessment Records Table */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#c7d2fe', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Saved Assessment Records ({recentAssessments.length})
                </span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  Persisted Database Records
                </span>
              </div>

              {recentAssessments.length > 0 ? (
                <div className="c4-table-wrapper">
                  <table className="c4-table">
                    <thead>
                      <tr>
                        <th>Business Name / Reference</th>
                        <th>District</th>
                        <th>Sector</th>
                        <th>Risk Level</th>
                        <th>Risk Score</th>
                        <th>Growth Decision</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentAssessments.map((rec, i) => {
                        const isActiveRun = analysisResult?.analysis_id === rec.analysis_id;
                        return (
                          <tr key={i} style={{ background: isActiveRun ? 'rgba(99, 102, 241, 0.15)' : 'transparent' }}>
                            <td style={{ fontWeight: 700, color: '#ffffff' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                {rec.business_name}
                                {isActiveRun && (
                                  <span style={{ fontSize: '0.62rem', background: '#4f46e5', color: '#ffffff', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                    CURRENT
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#818cf8', fontFamily: 'monospace' }}>
                                {rec.business_id}
                              </div>
                            </td>
                            <td>{rec.district}</td>
                            <td>{rec.business_category}</td>
                            <td>{getRiskCategoryBadge(rec.overall_risk_category)}</td>
                            <td style={{ fontFamily: 'monospace' }}>{(rec.composite_risk_score || 0).toFixed(2)}</td>
                            <td>{getReadinessBadge(rec.growth_readiness)}</td>
                            <td>
                              <button
                                type="button"
                                onClick={() => handleLoadSavedAssessment(rec.analysis_id, rec.business_id)}
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.72rem' }}
                              >
                                Reopen <ArrowUpRight size={12} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                  No saved assessments found in the database. Complete your first assessment to build history!
                </div>
              )}
            </div>

            {/* Start Fresh Action */}
            <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.85rem' }}>Want to assess a different business?</div>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Starting a new check assigns a fresh business reference without altering existing records.</div>
              </div>
              <button
                type="button"
                onClick={handleStartNewAssessment}
                className="btn btn-primary"
                style={{ fontSize: '0.825rem', padding: '0.65rem 1.25rem' }}
              >
                <Plus size={15} />
                Start Assessment for a New Business
              </button>
            </div>

          </div>

          {/* Stepper Footer Controls */}
          <div className="c4-nav-footer">
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              disabled={!hasActiveResult}
              className="c4-btn-back"
            >
              <ArrowLeft size={16} />
              Back to Results
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
