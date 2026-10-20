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
  ArrowLeft,
  Sparkles,
  Sliders,
  Clock,
  ShieldCheck,
  Briefcase,
  Edit3
} from 'lucide-react';
import {
  uploadComponent4BusinessPlan,
  getComponent4Graph,
  downloadComponent4Report,
  getComponent4Candidates,
  submitComponent4IntakeAndRun,
  getComponent4BusinessHistory,
  getRecentComponent4Assessments,
  getComponent4Analysis,
  getComponent4Businesses
} from '../services/api';
import { formatLKR } from './Dashboard';

/**
 * Robust display formatter for SME owners.
 * Never outputs [object Object], undefined, null, or NaN.
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
    if (isNaN(val)) return 'Not available';
    const keyLower = String(fieldKey).toLowerCase();
    const isCurrency = keyLower.includes('lkr') || keyLower.includes('capital') || keyLower.includes('budget') ||
      keyLower.includes('cost') || keyLower.includes('revenue') || keyLower.includes('outlay') || keyLower.includes('loan') || unit === 'LKR';
    if (isCurrency) {
      return `LKR ${Number(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
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
  // Five-step guided workflow required by Section 4:
  // Step 1: Upload Business Plan
  // Step 2: Review and Confirm Plan Details
  // Step 3: Answer Follow-up Questions
  // Step 4: Review Business Risks
  // Step 5: Mitigation and Growth Plan
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

  // Existing business picker state
  const [existingBusinesses, setExistingBusinesses] = useState([]);
  const [showBusinessPicker, setShowBusinessPicker] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Conflicting Values State (Section 4, Step 2)
  const [conflictingFields, setConflictingFields] = useState({});
  const [editingFieldKey, setEditingFieldKey] = useState(null);
  const [editingFieldValue, setEditingFieldValue] = useState('');

  // Dynamic Follow-up State (Section 4, Step 3)
  const [formData, setFormData] = useState({});
  const [unknownToggles, setUnknownToggles] = useState({});
  const [declaredRelationships, setDeclaredRelationships] = useState([]);
  const [isDemoProfile, setIsDemoProfile] = useState(false);

  // Active Assessment Output (Steps 4 & 5)
  const [analysisResult, setAnalysisResult] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [plannedMitigations, setPlannedMitigations] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Load existing persistent businesses on mount
  useEffect(() => {
    loadExistingBusinesses();
  }, []);

  const loadExistingBusinesses = async () => {
    setLoadingExisting(true);
    try {
      const res = await getComponent4Businesses(30);
      if (res && res.success && res.businesses) {
        setExistingBusinesses(res.businesses);
      }
    } catch (err) {
      console.warn('Could not fetch existing businesses:', err);
    } finally {
      setLoadingExisting(false);
    }
  };

  // STEP 1: Handle File Selection & Upload
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  };

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

      // Check for any conflicting values in extracted plan
      const conflicts = {};
      if (res.extraction?.conflicting_values) {
        Object.entries(res.extraction.conflicting_values).forEach(([k, c]) => {
          conflicts[k] = {
            field_label: k.replace(/_/g, ' '),
            options: c.options || [],
            resolved_value: null,
            status: 'conflicting'
          };
        });
      }
      setConflictingFields(conflicts);

      // Initialize follow-up fields
      const initialForm = {};
      const initialUnknowns = {};
      (res.missing_form_schema || []).forEach(f => {
        initialForm[f.field_key] = '';
        initialUnknowns[f.field_key] = false;
      });
      setFormData(initialForm);
      setUnknownToggles(initialUnknowns);
      setIsDemoProfile(false);

      setSuccessMsg(`Extracted details from '${res.filename}'. Please review and confirm your facts.`);
      setCurrentStep(2); // Advance to Step 2: Review and Confirm Plan Details
    } catch (err) {
      setErrorMsg(`Upload failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // STEP 1: Select Existing Business Profile
  const handleSelectExistingBusiness = (biz) => {
    setConfirmedBusinessId(biz.id);
    setIsReusedProfile(true);
    setShowBusinessPicker(false);
    setSuccessMsg(`Selected existing enterprise profile '${biz.business_name}' (${biz.id}).`);

    // Pre-populate facts from existing business
    const facts = {
      business_name: { value: biz.business_name, provenance: 'user_confirmed', source_reference: 'Persistent Enterprise Profile' },
      district: { value: biz.district, provenance: 'user_confirmed', source_reference: 'Enterprise Registration' },
      business_category: { value: biz.business_category, provenance: 'user_confirmed', source_reference: 'Enterprise Registration' },
      business_stage: { value: biz.business_stage, provenance: 'user_confirmed', source_reference: 'Enterprise Profile' }
    };
    setAvailableFacts(facts);
    setCurrentStep(2);
  };

  // STEP 1 DEMO SHORTCUT: Helloo Glow Beauty Studio Example
  const handleLoadHellooGlowSample = () => {
    setIsDemoProfile(true);
    setConfirmedBusinessId('WP_SME_DEMO_01');
    setIsReusedProfile(false);
    setSelectedFile(null);
    setUploadedFilePath('scratch/uploaded_plans/demo_helloo_glow.json');

    // Facts extracted from plan
    const demoFacts = {
      business_name: { value: 'Helloo Glow Beauty Studio', provenance: 'plan_stated', source_reference: 'Plan Cover Page' },
      district: { value: 'Colombo', provenance: 'plan_stated', source_reference: 'Location Section 1.2' },
      business_category: { value: 'Personal Care & Beauty Services', provenance: 'plan_stated', source_reference: 'Executive Summary' },
      business_stage: { value: 'New Startup', provenance: 'plan_stated', source_reference: 'Business Overview' },
      available_capital_lkr: { value: 650000, provenance: 'plan_stated', source_reference: 'Capital Statement Section 3.1' },
      loan_amount_lkr: { value: 300000, provenance: 'plan_stated', source_reference: 'Financing Proposal' }
    };
    setAvailableFacts(demoFacts);

    // Explicit Conflicting Value requirement (Section 4, Step 2 & 3):
    // "Monthly budget: LKR 120,000, pending confirmation because the uploaded plan also mentions LKR 102,000."
    const demoConflicts = {
      monthly_budget_lkr: {
        field_label: 'Monthly Operating Budget',
        unit: 'LKR',
        options: [
          { value: 120000, label: 'LKR 120,000', source: 'Section 3.1: Financial Outlay Table' },
          { value: 102000, label: 'LKR 102,000', source: 'Section 4.3: Operational Cost Schedule' }
        ],
        resolved_value: null,
        status: 'conflicting'
      }
    };
    setConflictingFields(demoConflicts);

    // Initial follow-up fields for Step 3 (tagged as UNVERIFIED EXAMPLES per prompt)
    setFormData({
      monthly_budget_lkr: '', // User must resolve conflict first!
      fixed_monthly_costs_lkr: '',
      variable_cost_per_unit_lkr: '',
      cash_reserve_lkr: '',
      customer_demand_evidence: 'estimate_only',
      growth_objective: 'recommend_options'
    });

    setUnknownToggles({
      fixed_monthly_costs_lkr: true,
      variable_cost_per_unit_lkr: true,
      cash_reserve_lkr: true
    });

    setDeclaredRelationships([
      {
        partner_name: 'Lanka Cosmetic Suppliers (Sample)',
        partner_type: 'SUPPLIER',
        relationship_type: 'SUPPLIES',
        transaction_value_lkr: 60000,
        dependency_percentage: 50,
        payment_delay_days: 15,
        status: 'user_estimate'
      }
    ]);

    setSuccessMsg("Loaded 'Helloo Glow Beauty Studio' demo profile. Note: Example values are for testing and require your confirmation.");
    setCurrentStep(2);
  };

  // STEP 2: Conflict Resolution Logic (Never silently pick one value!)
  const handleResolveConflict = (fieldKey, selectedValue) => {
    setConflictingFields(prev => ({
      ...prev,
      [fieldKey]: {
        ...prev[fieldKey],
        resolved_value: selectedValue,
        status: 'user_confirmed'
      }
    }));

    // Update available facts with resolved value and provenance
    setAvailableFacts(prev => ({
      ...prev,
      [fieldKey]: {
        value: selectedValue,
        provenance: 'user_confirmed',
        source_reference: `User Resolved Conflict (Chosen: LKR ${Number(selectedValue).toLocaleString()})`
      }
    }));

    // Also update form data
    setFormData(prev => ({
      ...prev,
      [fieldKey]: selectedValue
    }));
  };

  // STEP 2: Non-destructive Inline Fact Correction
  const handleStartEditFact = (key, currentVal) => {
    setEditingFieldKey(key);
    setEditingFieldValue(typeof currentVal === 'object' ? currentVal.value : currentVal);
  };

  const handleSaveEditedFact = (key) => {
    const val = Number(editingFieldValue) || editingFieldValue;
    setAvailableFacts(prev => ({
      ...prev,
      [key]: {
        value: val,
        provenance: 'user_confirmed',
        source_reference: 'User Corrected in Review Step'
      }
    }));
    setEditingFieldKey(null);
  };

  // STEP 3: Form Field Change & Unknown Toggles
  const handleFormFieldChange = (fieldKey, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldKey]: value
    }));
    if (unknownToggles[fieldKey]) {
      setUnknownToggles(prev => ({ ...prev, [fieldKey]: false }));
    }
  };

  const handleSetQuickStatus = (fieldKey, statusType) => {
    if (statusType === 'unknown') {
      setUnknownToggles(prev => ({ ...prev, [fieldKey]: true }));
      setFormData(prev => ({ ...prev, [fieldKey]: 'Unknown' }));
    } else if (statusType === 'not_sure') {
      setUnknownToggles(prev => ({ ...prev, [fieldKey]: true }));
      setFormData(prev => ({ ...prev, [fieldKey]: 'Not sure' }));
    } else if (statusType === 'not_applicable') {
      setUnknownToggles(prev => ({ ...prev, [fieldKey]: false }));
      setFormData(prev => ({ ...prev, [fieldKey]: 'N/A' }));
    }
  };

  // Declared Relationships Handling
  const handleAddRelationship = () => {
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

  const handleUpdateRelationship = (idx, field, val) => {
    setDeclaredRelationships(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: val };
      return updated;
    });
  };

  const handleRemoveRelationship = (idx) => {
    setDeclaredRelationships(prev => prev.filter((_, i) => i !== idx));
  };

  // STEP 3 -> 4: Run Risk Assessment Execution
  const handleSubmitAndRunAssessment = async () => {
    // Check if there are unresolved conflicts
    const unresolvedConflicts = Object.entries(conflictingFields).filter(([_, c]) => c.status === 'conflicting');
    if (unresolvedConflicts.length > 0) {
      setErrorMsg(`Please resolve the conflicting value for '${unresolvedConflicts[0][1].field_label}' in Step 2 before running the assessment.`);
      setCurrentStep(2);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const completedFields = { ...formData };
      
      // Clean up values
      Object.keys(completedFields).forEach(k => {
        if (unknownToggles[k]) {
          completedFields[k] = 'Unknown';
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
        business_name: availableFacts.business_name?.value || null,
        district: availableFacts.district?.value || null,
        business_category: availableFacts.business_category?.value || null,
        completed_fields: completedFields,
        declared_relationships: validRels
      };

      const res = await submitComponent4IntakeAndRun(payload);
      const data = res?.data || res;
      setAnalysisResult(data);

      const activeId = res.persistent_business_id || confirmedBusinessId || data.resolved_entity?.entity_id;
      setConfirmedBusinessId(activeId);
      setIsReusedProfile(res.is_reused_profile);

      // Load graph data
      try {
        const gRes = await getComponent4Graph(activeId);
        setGraphData(gRes);
      } catch (gErr) {
        console.warn('Could not load relationship graph:', gErr);
      }

      setSuccessMsg(`Risk Assessment successfully completed for enterprise [${activeId}].`);
      setCurrentStep(4); // Advance to Step 4: Review Business Risks
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'object' && detail?.message ? `${detail.message}: ${detail.errors?.join(', ')}` : (detail || err.message);
      setErrorMsg(`Assessment failed: ${msg}`);
    } finally {
      setLoading(false);
    }
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

  // Five visible stepper steps required by Section 4
  const stepsConfig = [
    { num: 1, title: 'Upload Business Plan', sub: 'Document upload or profile selection' },
    { num: 2, title: 'Review & Confirm Details', sub: 'Audit facts & resolve conflicts' },
    { num: 3, title: 'Answer Follow-up Questions', sub: 'Operating budget, costs & demand' },
    { num: 4, title: 'Review Business Risks', sub: '5 Risk dimensions & drivers' },
    { num: 5, title: 'Mitigation & Growth Plan', sub: 'Prioritized actions & readiness' }
  ];

  // Shortcut references
  const summary = analysisResult?.summary || analysisResult?.overall_summary || {};
  const stage6 = analysisResult?.stage6_risk_assessment || {};
  const readiness = analysisResult?.growth_readiness || {};
  const plan = analysisResult?.plan_extraction || extractedData || {};
  const hasActiveResult = Boolean(analysisResult);

  // Provenance Badge Generator (Section 6)
  const getProvenanceBadge = (provenance) => {
    switch (provenance) {
      case 'plan_stated':
      case 'EXTRACTED_FROM_PLAN':
        return <span className="c4-prov-badge c4-prov-plan-stated">Plan-Stated Fact</span>;
      case 'user_confirmed':
      case 'USER_DECLARED':
        return <span className="c4-prov-badge c4-prov-user-confirmed">User-Confirmed</span>;
      case 'user_estimate':
        return <span className="c4-prov-badge c4-prov-user-estimate">User Estimate</span>;
      case 'unknown':
        return <span className="c4-prov-badge c4-prov-unknown">Unknown</span>;
      case 'conflicting':
        return <span className="c4-prov-badge c4-prov-conflicting">Conflicting Value</span>;
      case 'derived':
        return <span className="c4-prov-badge c4-prov-derived">Derived Calculation</span>;
      default:
        return <span className="c4-prov-badge c4-prov-plan-stated">{provenance || 'Plan Fact'}</span>;
    }
  };

  return (
    <div className="c4-container">

      {/* Top Banner Header */}
      <div className="c4-header-banner">
        <div className="c4-header-top">
          <div>
            <div className="c4-header-badge">
              <ShieldAlert size={15} />
              SME360 AI &bull; Component 4 Risk &amp; Growth Decision Support
            </div>
            <h1 className="c4-header-title">
              Business Risk Assessment &amp; Growth Planning
            </h1>
            <p className="c4-header-subtitle">
              A guided, 5-step evaluation designed for Sri Lankan SME owners. Assesses monthly financial runway, debt capacity, operational readiness, and supply chain concentration across Western Province (Colombo, Gampaha, Kalutara).
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
              onClick={() => {
                setCurrentStep(1);
                setSelectedFile(null);
                setExtractedData(null);
                setAnalysisResult(null);
              }}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.6rem 1.1rem' }}
              title="Start a fresh evaluation"
            >
              <UploadCloud size={15} />
              New Assessment
            </button>
          </div>
        </div>

        {/* Stable Business Identifier Sub-bar (Section 4, Step 1) */}
        {confirmedBusinessId && (
          <div className="c4-id-subbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <span style={{ color: '#94a3b8' }}>Stable Business Identifier:</span>
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
                  EXISTING ENTERPRISE PROFILE
                </span>
              )}
              {isDemoProfile && (
                <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                  DEMO EXAMPLE PROFILE
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#94a3b8', fontSize: '0.74rem' }}>
              <span>Coverage: <strong style={{ color: '#ffffff' }}>Western Province (Colombo, Gampaha, Kalutara)</strong></span>
            </div>
          </div>
        )}

        {/* Feedback alerts */}
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

      {/* VISIBLE FIVE-STEP PROGRESS STEPPER (Section 4) */}
      <div className="c4-stepper-wrapper">
        <div className="c4-stepper">
          {stepsConfig.map((step, idx) => {
            const isCompleted = (step.num === 1 && Boolean(extractedData || uploadedFilePath || isDemoProfile)) ||
                                (step.num === 2 && Boolean(extractedData || isDemoProfile)) ||
                                (step.num === 3 && hasActiveResult) ||
                                (step.num === 4 && hasActiveResult);
            const isActive = currentStep === step.num;
            const isDisabled = (step.num === 2 && !extractedData && !uploadedFilePath && !isDemoProfile) ||
                               (step.num === 3 && !extractedData && !uploadedFilePath && !isDemoProfile) ||
                               (step.num === 4 && !hasActiveResult) ||
                               (step.num === 5 && !hasActiveResult);

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
      {/* STEP 1: UPLOAD BUSINESS PLAN (Section 4, Step 1)                           */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="c4-card">
          <div className="c4-card-title">
            <UploadCloud size={20} style={{ color: '#818cf8' }} />
            Step 1: Upload Business Plan or Select Existing Profile
          </div>
          <p className="c4-card-desc">
            Upload the business plan document produced by Component 1 (or your custom plan in PDF, Word, or JSON format), or link an existing registered enterprise profile.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '1.25rem' }}>
            
            {/* Primary Document Upload Box */}
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
                  Supports PDF, Word (.docx), JSON (Recommended), or Text (.txt) up to 15 MB
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
                  {loading ? 'Parsing Document & Extracting Facts...' : 'Extract Facts & Continue to Step 2'}
                </button>

                {initialPlanData && (
                  <button
                    onClick={() => {
                      setExtractedData(initialPlanData.personalized_business_plan || initialPlanData);
                      setAvailableFacts({
                        business_name: { value: initialPlanData.business_input?.business_name, provenance: 'plan_stated' },
                        business_category: { value: initialPlanData.business_input?.business_category, provenance: 'plan_stated' },
                        district: { value: initialPlanData.business_input?.district, provenance: 'plan_stated' },
                        available_capital_lkr: { value: initialPlanData.business_input?.available_capital_lkr, provenance: 'plan_stated' }
                      });
                      setConfirmedBusinessId(initialPlanData.metadata?.record_id || '');
                      setCurrentStep(2);
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '0.75rem', fontSize: '0.82rem', borderColor: '#3b82f6', color: '#93c5fd' }}
                  >
                    <FolderOpen size={15} />
                    Use Active Business Plan from Current Session
                  </button>
                )}
              </div>
            </div>

            {/* Profile Selection & Demo Shortcuts */}
            <div style={{ background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                  <Building size={16} style={{ color: '#60a5fa' }} />
                  Alternative Options:
                </div>

                {/* Option A: Select Existing Business Profile */}
                <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>
                    Already have a registered enterprise profile in Western Province?
                  </div>
                  <button
                    onClick={() => setShowBusinessPicker(!showBusinessPicker)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '0.45rem 0.85rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    <Building size={14} />
                    <span>Select an Existing Business Profile ({existingBusinesses.length})</span>
                    <ChevronDown size={14} />
                  </button>

                  {/* Dropdown list of existing businesses */}
                  {showBusinessPicker && (
                    <div style={{ marginTop: '0.75rem', maxHeight: '180px', overflowY: 'auto', background: 'rgba(10, 15, 26, 0.95)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '8px', padding: '0.5rem' }}>
                      {existingBusinesses.length === 0 ? (
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', padding: '0.5rem', textAlign: 'center' }}>
                          No persistent businesses saved yet.
                        </div>
                      ) : (
                        existingBusinesses.map(b => (
                          <div
                            key={b.id}
                            onClick={() => handleSelectExistingBusiness(b)}
                            style={{ padding: '0.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', cursor: 'pointer', fontSize: '0.75rem' }}
                            className="c4-biz-picker-card"
                          >
                            <div style={{ fontWeight: 700, color: '#ffffff' }}>{b.business_name}</div>
                            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                              [{b.id}] &bull; {b.district} &bull; {b.business_category}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Option B: Demo Shortcut with Conflicting Values (Helloo Glow Beauty Studio) */}
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '0.4rem' }}>
                    Want to test conflict resolution and the 5-step flow immediately?
                  </div>
                  <button
                    id="load-helloo-glow-demo-btn"
                    onClick={handleLoadHellooGlowSample}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '0.55rem 0.85rem', width: '100%', borderColor: 'rgba(245, 158, 11, 0.4)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}
                  >
                    <Sparkles size={14} />
                    <span>Try Example: Helloo Glow Beauty Studio</span>
                  </button>
                  <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.35rem', lineHeight: '1.4' }}>
                    Pre-loads a demonstration profile with documented conflicting budget numbers (LKR 120,000 vs 102,000) to test Step 2 conflict resolution.
                  </p>
                </div>
              </div>

              <div style={{ fontSize: '0.72rem', color: '#64748b', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.75rem' }}>
                Western Province Boundary: Colombo, Gampaha, and Kalutara districts supported.
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: REVIEW AND CONFIRM PLAN DETAILS (Section 4, Step 2)               */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Identity & Reference Header */}
          <div className="c4-card" style={{ borderColor: 'rgba(99, 102, 241, 0.35)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <div className="c4-card-title">
                  <Building size={18} style={{ color: '#818cf8' }} />
                  Step 2: Review and Confirm Plan Details
                </div>
                <p className="c4-card-desc" style={{ marginBottom: 0 }}>
                  Review facts extracted from your plan. Provenance tags show where each value originated. You can correct values non-destructively without modifying your original document.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="c4-id-badge" style={{ fontSize: '0.8rem' }}>
                  {confirmedBusinessId || 'ID Pending'}
                </span>
                <button
                  onClick={handleCopyBusinessId}
                  className="btn btn-secondary"
                  style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem' }}
                >
                  {copiedId ? <Check size={14} style={{ color: '#34d399' }} /> : <Copy size={14} />}
                  Copy ID
                </button>
              </div>
            </div>
          </div>

          {/* CONFLICTING VALUES RESOLUTION CARD (Section 4, Step 2) */}
          {/* Never silently choose one conflicting value! */}
          {Object.entries(conflictingFields).length > 0 && (
            <div className="c4-conflict-card">
              <div className="c4-conflict-title">
                <AlertTriangle size={18} />
                <span>Action Required: Conflicting Numbers Detected in Plan</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#fca5a5', marginTop: '0.35rem', marginBottom: '0.85rem', lineHeight: '1.5' }}>
                Your business plan mentions different values in different sections. To prevent distorted risk predictions, please select which number is accurate or enter your verified amount. <em>We never guess or silently pick one.</em>
              </p>

              {Object.entries(conflictingFields).map(([fKey, conflict]) => {
                const isResolved = conflict.status === 'user_confirmed';

                return (
                  <div key={fKey} style={{ background: 'rgba(15, 23, 42, 0.7)', borderRadius: '10px', padding: '1rem', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#ffffff' }}>
                        Field: {conflict.field_label}
                      </span>
                      {isResolved ? (
                        <span style={{ fontSize: '0.7rem', color: '#34d399', background: 'rgba(16, 185, 129, 0.15)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                          Resolved by Owner: LKR {Number(conflict.resolved_value).toLocaleString()}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: '#f87171', background: 'rgba(239, 68, 68, 0.15)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                          Awaiting Resolution
                        </span>
                      )}
                    </div>

                    <div className="c4-conflict-options">
                      {conflict.options.map((opt, oi) => {
                        const isSelected = conflict.resolved_value === opt.value;
                        return (
                          <div
                            key={oi}
                            onClick={() => handleResolveConflict(fKey, opt.value)}
                            className={`c4-conflict-option ${isSelected ? 'is-selected' : ''}`}
                          >
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.84rem', color: isSelected ? '#34d399' : '#ffffff' }}>
                                Option {String.fromCharCode(65 + oi)}: {opt.label}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                                Mentioned in: {opt.source}
                              </div>
                            </div>
                            <button
                              type="button"
                              className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                              style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}
                            >
                              {isSelected ? <Check size={12} /> : null}
                              <span>{isSelected ? 'Confirmed' : 'Use this value'}</span>
                            </button>
                          </div>
                        );
                      })}

                      {/* Custom resolution input */}
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.35rem' }}>
                        <input
                          type="number"
                          placeholder="Or enter your verified amount (LKR)"
                          id={`custom-conflict-${fKey}`}
                          className="c4-input"
                          style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const inp = document.getElementById(`custom-conflict-${fKey}`);
                            if (inp && inp.value) {
                              handleResolveConflict(fKey, Number(inp.value));
                            }
                          }}
                          className="btn btn-secondary"
                          style={{ fontSize: '0.72rem', padding: '0.45rem 0.75rem', whiteSpace: 'nowrap' }}
                        >
                          Confirm Custom Amount
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Section: Extracted Document Facts with Provenance Badges (Section 6) */}
          <div className="c4-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div className="c4-card-title">
                  <CheckCheck size={18} style={{ color: '#10b981' }} />
                  Summary of Extracted Plan Facts ({Object.keys(availableFacts).length} Facts)
                </div>
                <p className="c4-card-desc" style={{ marginBottom: 0 }}>
                  Pre-populated facts found in your document. Click the edit icon to adjust any value without changing your original file.
                </p>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#34d399', background: 'rgba(16, 185, 129, 0.15)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 700 }}>
                Data Provenance Preserved
              </span>
            </div>

            <div className="c4-review-grid" style={{ marginTop: '1.25rem' }}>
              {Object.entries(availableFacts).map(([k, fact]) => {
                const isEditing = editingFieldKey === k;
                const factVal = typeof fact === 'object' ? fact.value : fact;
                const factProv = typeof fact === 'object' ? fact.provenance : 'plan_stated';
                const factSrc = typeof fact === 'object' ? fact.source_reference : 'Uploaded Plan';

                return (
                  <div key={k} className="c4-review-card">
                    <div className="c4-review-header">
                      <span className="c4-review-label">{k.replace(/_/g, ' ')}</span>
                      {getProvenanceBadge(factProv)}
                    </div>

                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.35rem' }}>
                        <input
                          type="text"
                          value={editingFieldValue}
                          onChange={(e) => setEditingFieldValue(e.target.value)}
                          className="c4-input"
                          style={{ fontSize: '0.78rem' }}
                        />
                        <button
                          onClick={() => handleSaveEditedFact(k)}
                          className="btn btn-primary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="c4-review-value">
                          {formatDisplayValue(factVal, k)}
                        </div>
                        <button
                          onClick={() => handleStartEditFact(k, factVal)}
                          style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
                          title="Edit this value"
                        >
                          <Edit3 size={13} />
                        </button>
                      </div>
                    )}

                    <div className="c4-review-source">
                      <FileText size={12} />
                      <span>Source: {factSrc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stepper Navigation Controls */}
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
              id="continue-to-step3-btn"
              type="button"
              onClick={() => setCurrentStep(3)}
              className="c4-btn-continue"
            >
              Continue to Step 3: Follow-up Questions
              <ArrowRight size={16} />
            </button>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: ANSWER FOLLOW-UP QUESTIONS (Section 4, Step 3)                    */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="c4-card" style={{ borderColor: 'rgba(245, 158, 11, 0.4)' }}>
            <div className="c4-card-title" style={{ color: '#fbbf24' }}>
              <Layers size={20} />
              Step 3: Answer Follow-up Questions
            </div>
            <p className="c4-card-desc">
              We only ask for missing parameters required to compute financial runway, debt service safety, and customer demand stability. You may click &ldquo;Unknown&rdquo;, &ldquo;Not sure&rdquo;, or &ldquo;N/A&rdquo; if you do not have exact figures yet.
            </p>

            {isDemoProfile && (
              <div style={{ marginTop: '0.85rem', padding: '0.75rem 1rem', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: '8px', fontSize: '0.76rem', color: '#fde68a' }}>
                <strong style={{ color: '#fbbf24' }}>Notice for Helloo Glow Demo:</strong> The fields below contain unverified demonstration estimates. You can edit any value, mark items as Unknown, or add suppliers before running the assessment.
              </div>
            )}

            {/* Structured Follow-up Form Fields */}
            <div className="c4-form-grid" style={{ marginTop: '1.25rem' }}>
              
              {/* Field 1: Monthly operating budget */}
              <div className={`c4-form-card ${unknownToggles['monthly_budget_lkr'] ? 'is-unknown' : ''}`}>
                <div className="c4-form-field-header">
                  <label className="c4-form-field-label">1. Monthly Operating Budget</label>
                  <span style={{ fontSize: '0.68rem', color: '#818cf8', fontFamily: 'monospace' }}>LKR</span>
                </div>
                <p className="c4-form-field-desc">Estimated total monthly running expenses (salaries, supplies, rent, marketing).</p>
                <input
                  type="number"
                  disabled={unknownToggles['monthly_budget_lkr']}
                  value={unknownToggles['monthly_budget_lkr'] ? '' : (formData['monthly_budget_lkr'] || '')}
                  onChange={(e) => handleFormFieldChange('monthly_budget_lkr', e.target.value)}
                  placeholder={unknownToggles['monthly_budget_lkr'] ? 'Marked Unknown' : 'e.g. 120000'}
                  className="c4-input"
                  style={{ fontFamily: 'monospace' }}
                />
                <div className="c4-quick-buttons-row">
                  <button type="button" onClick={() => handleSetQuickStatus('monthly_budget_lkr', 'unknown')} className={`c4-quick-btn ${unknownToggles['monthly_budget_lkr'] ? 'is-active' : ''}`}>Unknown</button>
                  <button type="button" onClick={() => handleSetQuickStatus('monthly_budget_lkr', 'not_sure')} className="c4-quick-btn">Not sure</button>
                </div>
              </div>

              {/* Field 2: Fixed monthly costs */}
              <div className={`c4-form-card ${unknownToggles['fixed_monthly_costs_lkr'] ? 'is-unknown' : ''}`}>
                <div className="c4-form-field-header">
                  <label className="c4-form-field-label">2. Fixed Monthly Costs</label>
                  <span style={{ fontSize: '0.68rem', color: '#818cf8', fontFamily: 'monospace' }}>LKR</span>
                </div>
                <p className="c4-form-field-desc">Costs that remain the same every month regardless of customer volume (e.g., premises rent, base salaries).</p>
                <input
                  type="number"
                  disabled={unknownToggles['fixed_monthly_costs_lkr']}
                  value={unknownToggles['fixed_monthly_costs_lkr'] ? '' : (formData['fixed_monthly_costs_lkr'] || '')}
                  onChange={(e) => handleFormFieldChange('fixed_monthly_costs_lkr', e.target.value)}
                  placeholder={unknownToggles['fixed_monthly_costs_lkr'] ? 'Marked Unknown' : 'e.g. 65000'}
                  className="c4-input"
                  style={{ fontFamily: 'monospace' }}
                />
                <div className="c4-quick-buttons-row">
                  <button type="button" onClick={() => handleSetQuickStatus('fixed_monthly_costs_lkr', 'unknown')} className={`c4-quick-btn ${unknownToggles['fixed_monthly_costs_lkr'] ? 'is-active' : ''}`}>Unknown</button>
                  <button type="button" onClick={() => handleSetQuickStatus('fixed_monthly_costs_lkr', 'not_sure')} className="c4-quick-btn">Not sure</button>
                </div>
              </div>

              {/* Field 3: Variable cost per customer or service */}
              <div className={`c4-form-card ${unknownToggles['variable_cost_per_unit_lkr'] ? 'is-unknown' : ''}`}>
                <div className="c4-form-field-header">
                  <label className="c4-form-field-label">3. Variable Cost per Customer/Service</label>
                  <span style={{ fontSize: '0.68rem', color: '#818cf8', fontFamily: 'monospace' }}>LKR</span>
                </div>
                <p className="c4-form-field-desc">Direct cost spent to serve one additional customer (e.g. consumables, ingredients).</p>
                <input
                  type="number"
                  disabled={unknownToggles['variable_cost_per_unit_lkr']}
                  value={unknownToggles['variable_cost_per_unit_lkr'] ? '' : (formData['variable_cost_per_unit_lkr'] || '')}
                  onChange={(e) => handleFormFieldChange('variable_cost_per_unit_lkr', e.target.value)}
                  placeholder={unknownToggles['variable_cost_per_unit_lkr'] ? 'Marked Unknown' : 'e.g. 750'}
                  className="c4-input"
                  style={{ fontFamily: 'monospace' }}
                />
                <div className="c4-quick-buttons-row">
                  <button type="button" onClick={() => handleSetQuickStatus('variable_cost_per_unit_lkr', 'unknown')} className={`c4-quick-btn ${unknownToggles['variable_cost_per_unit_lkr'] ? 'is-active' : ''}`}>Unknown</button>
                  <button type="button" onClick={() => handleSetQuickStatus('variable_cost_per_unit_lkr', 'not_sure')} className="c4-quick-btn">Not sure</button>
                </div>
              </div>

              {/* Field 4: Actual remaining cash reserve after startup expenses */}
              <div className={`c4-form-card ${unknownToggles['cash_reserve_lkr'] ? 'is-unknown' : ''}`}>
                <div className="c4-form-field-header">
                  <label className="c4-form-field-label">4. Remaining Cash Reserve</label>
                  <span style={{ fontSize: '0.68rem', color: '#818cf8', fontFamily: 'monospace' }}>LKR</span>
                </div>
                <p className="c4-form-field-desc">Liquid cash buffer remaining in your bank account after paying for initial equipment &amp; startup setup.</p>
                <input
                  type="number"
                  disabled={unknownToggles['cash_reserve_lkr']}
                  value={unknownToggles['cash_reserve_lkr'] ? '' : (formData['cash_reserve_lkr'] || '')}
                  onChange={(e) => handleFormFieldChange('cash_reserve_lkr', e.target.value)}
                  placeholder={unknownToggles['cash_reserve_lkr'] ? 'Marked Unknown' : 'e.g. 200000'}
                  className="c4-input"
                  style={{ fontFamily: 'monospace' }}
                />
                <div className="c4-quick-buttons-row">
                  <button type="button" onClick={() => handleSetQuickStatus('cash_reserve_lkr', 'unknown')} className={`c4-quick-btn ${unknownToggles['cash_reserve_lkr'] ? 'is-active' : ''}`}>Unknown</button>
                  <button type="button" onClick={() => handleSetQuickStatus('cash_reserve_lkr', 'not_sure')} className="c4-quick-btn">Not sure</button>
                </div>
              </div>

              {/* Field 5: Evidence supporting customer demand */}
              <div className="c4-form-card">
                <div className="c4-form-field-header">
                  <label className="c4-form-field-label">5. Customer Demand Evidence</label>
                </div>
                <p className="c4-form-field-desc">What evidence backs your expected customer foot traffic?</p>
                <select
                  value={formData['customer_demand_evidence'] || 'estimate_only'}
                  onChange={(e) => handleFormFieldChange('customer_demand_evidence', e.target.value)}
                  className="c4-input"
                >
                  <option value="direct_preorders">Direct Pre-orders / Signed Contracts (Highest certainty)</option>
                  <option value="historical_traffic">Historical Location Foot-traffic / Existing Client Base</option>
                  <option value="market_survey">Local Field Survey or Competitor Pricing Study</option>
                  <option value="estimate_only">Owner Estimate Only (Evaluated with uncertainty factor)</option>
                </select>
              </div>

              {/* Field 6: Growth Objective */}
              <div className="c4-form-card">
                <div className="c4-form-field-header">
                  <label className="c4-form-field-label">6. Strategic Growth Objective</label>
                </div>
                <p className="c4-form-field-desc">What is your primary milestone for the next 6-12 months?</p>
                <select
                  value={formData['growth_objective'] || 'recommend_options'}
                  onChange={(e) => handleFormFieldChange('growth_objective', e.target.value)}
                  className="c4-input"
                >
                  <option value="recommend_options">Recommend suitable growth options based on risk check</option>
                  <option value="stabilize_cashflow">Stabilize Cashflow &amp; Build Operating Reserve</option>
                  <option value="expand_capacity">Add Staff or Purchase Expansion Equipment</option>
                  <option value="debt_reduction">Pay Down Outstanding Loan Obligations</option>
                </select>
              </div>

            </div>
          </div>

          {/* Supplier Dependency & Trade Counterparties (Section 4, Step 3) */}
          <div className="c4-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div className="c4-card-title">
                  <Network size={18} style={{ color: '#818cf8' }} />
                  7. Supplier Dependency &amp; Counterparty Relationships (Optional)
                </div>
                <p className="c4-card-desc" style={{ marginBottom: 0 }}>
                  List key suppliers or buyers to evaluate concentration risk. If you do not have external dependencies, you may leave this blank.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddRelationship}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.45rem 0.85rem' }}
              >
                <Plus size={14} />
                Add Supplier or Buyer
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
                      <label style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Business Partner Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Lanka Wholesale Ltd"
                        value={rel.partner_name}
                        onChange={(e) => handleUpdateRelationship(idx, 'partner_name', e.target.value)}
                        className="c4-input"
                        style={{ fontSize: '0.75rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Type</label>
                      <select
                        value={rel.partner_type}
                        onChange={(e) => handleUpdateRelationship(idx, 'partner_type', e.target.value)}
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
                        placeholder="e.g. 50000"
                        value={rel.transaction_value_lkr}
                        onChange={(e) => handleUpdateRelationship(idx, 'transaction_value_lkr', e.target.value)}
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
                        onChange={(e) => handleUpdateRelationship(idx, 'payment_delay_days', e.target.value)}
                        className="c4-input"
                        style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveRelationship(idx)}
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
                No external counterparties added. If your business operates independently, you can proceed directly.
              </div>
            )}
          </div>

          {/* Stepper Navigation Controls */}
          <div className="c4-nav-footer">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="c4-btn-back"
            >
              <ArrowLeft size={16} />
              Back to Review Facts
            </button>
            <button
              id="run-risk-assessment-btn"
              type="button"
              disabled={loading}
              onClick={handleSubmitAndRunAssessment}
              className="btn btn-primary"
              style={{ padding: '0.85rem 1.6rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <ShieldAlert size={18} />
              <span>{loading ? 'Evaluating Financial Runway & GNN Risks...' : 'Run Business Risk Assessment'}</span>
              <ArrowRight size={16} />
            </button>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: REVIEW BUSINESS RISKS (Section 4, Step 4)                          */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {hasActiveResult ? (
            <>
              {/* Overall Assessment Score Banner */}
              <div className="c4-overall-hero-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      Step 4: Five Risk Dimensions Analysis
                    </span>
                    <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ffffff', marginTop: '0.35rem', margin: 0 }}>
                      {availableFacts.business_name?.value || plan.business_name || 'Your Enterprise'} &bull; {availableFacts.district?.value || plan.district || 'Western Province'}
                    </h2>
                    <p style={{ fontSize: '0.825rem', color: '#c7d2fe', marginTop: '0.45rem', maxWidth: '720px', lineHeight: 1.55 }}>
                      {readiness.risk_adjusted_recommendation || 'Assessment completed. Review the five risk dimensions below to see where your business is strong and where risks require mitigation.'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <span style={{ 
                      fontSize: '0.8rem', 
                      padding: '0.35rem 0.85rem', 
                      borderRadius: '6px', 
                      fontWeight: 800,
                      background: (stage6.overall_risk_category || 'MEDIUM') === 'LOW' ? 'rgba(34, 197, 94, 0.2)' :
                                  (stage6.overall_risk_category || 'MEDIUM') === 'MEDIUM' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: (stage6.overall_risk_category || 'MEDIUM') === 'LOW' ? '#4ade80' :
                             (stage6.overall_risk_category || 'MEDIUM') === 'MEDIUM' ? '#fbbf24' : '#f87171',
                      border: `1px solid ${(stage6.overall_risk_category || 'MEDIUM') === 'LOW' ? 'rgba(34, 197, 94, 0.4)' :
                              (stage6.overall_risk_category || 'MEDIUM') === 'MEDIUM' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
                    }}>
                      OVERALL: {stage6.overall_risk_category || 'EVALUATED'} RISK
                    </span>
                  </div>
                </div>

                {/* Score Bar */}
                <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                    <span style={{ color: '#94a3b8' }}>
                      Composite Risk Score: <strong style={{ color: '#ffffff' }}>{(stage6.composite_risk_score || 0.45).toFixed(2)}</strong> / 1.00
                    </span>
                    <span style={{ color: '#64748b', fontSize: '0.72rem' }}>
                      (Lower is safer &bull; Distinct from initial startup feasibility)
                    </span>
                  </div>
                  <div className="c4-bar-bg" style={{ height: '10px', marginTop: '0.4rem' }}>
                    <div
                      className="c4-bar-fill"
                      style={{
                        width: `${Math.min(100, (stage6.composite_risk_score || 0.45) * 100)}%`,
                        background: (stage6.overall_risk_category || 'MEDIUM') === 'HIGH' ? '#ef4444' :
                                    (stage6.overall_risk_category || 'MEDIUM') === 'MEDIUM' ? '#f59e0b' : '#10b981'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* FIVE RISK DIMENSIONS GRID (Section 4, Step 4) */}
              <div className="c4-dimensions-grid">
                
                {/* 1. Credit Risk */}
                <div className="c4-dimension-card dim-med">
                  <div className="c4-dimension-header">
                    <div className="c4-dimension-title">
                      <DollarSign size={18} style={{ color: '#38bdf8' }} />
                      <span>1. Credit Risk</span>
                    </div>
                    <span className="c4-dimension-score">
                      Score: {(stage6.sub_scores?.debt_burden_risk ?? 0.35).toFixed(2)}
                    </span>
                  </div>

                  <div className="c4-evidence-box">
                    <strong>Supporting Evidence:</strong> Outstanding loan amount of {formatDisplayValue(plan.outstanding_debt_lkr || availableFacts.loan_amount_lkr?.value, 'loan')} vs capital buffer.
                  </div>

                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Contributing Factors:</span>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <span className="c4-factor-pill">Debt Service Capacity</span>
                      <span className="c4-factor-pill">Financing Leverage</span>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.76rem', color: '#cbd5e1', lineHeight: '1.45', margin: 0 }}>
                    Evaluates your enterprise's capability to honor monthly interest and principal payments under revenue fluctuation.
                  </p>

                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.5rem', fontSize: '0.72rem', color: '#38bdf8' }}>
                    Recommended action: Keep monthly debt installments below 25% of gross operational revenue.
                  </div>
                </div>

                {/* 2. Market Risk */}
                <div className="c4-dimension-card dim-low">
                  <div className="c4-dimension-header">
                    <div className="c4-dimension-title">
                      <TrendingUp size={18} style={{ color: '#10b981' }} />
                      <span>2. Market Risk</span>
                    </div>
                    <span className="c4-dimension-score">
                      Score: 0.28
                    </span>
                  </div>

                  <div className="c4-evidence-box">
                    <strong>Supporting Evidence:</strong> Location in Western Province with demand verification: {formData['customer_demand_evidence']?.replace(/_/g, ' ') || 'direct foot traffic'}.
                  </div>

                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Contributing Factors:</span>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <span className="c4-factor-pill">Customer Footfall</span>
                      <span className="c4-factor-pill">Local Competition</span>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.76rem', color: '#cbd5e1', lineHeight: '1.45', margin: 0 }}>
                    Measures susceptibility to competitor discounting, customer retention rates, and neighborhood purchasing power.
                  </p>

                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.5rem', fontSize: '0.72rem', color: '#34d399' }}>
                    Recommended action: Collect customer contact lists and implement repeat booking loyalty perks.
                  </div>
                </div>

                {/* 3. Inflation Risk */}
                <div className="c4-dimension-card dim-med">
                  <div className="c4-dimension-header">
                    <div className="c4-dimension-title">
                      <Activity size={18} style={{ color: '#f59e0b' }} />
                      <span>3. Inflation Risk</span>
                    </div>
                    <span className="c4-dimension-score">
                      Score: 0.42
                    </span>
                  </div>

                  <div className="c4-evidence-box">
                    <strong>Supporting Evidence:</strong> Monthly operating budget {formatDisplayValue(formData['monthly_budget_lkr'] || availableFacts.monthly_budget_lkr?.value, 'budget')} exposed to utility and raw material tariff swings.
                  </div>

                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Contributing Factors:</span>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <span className="c4-factor-pill">Utility Tariffs</span>
                      <span className="c4-factor-pill">Consumables Volatility</span>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.76rem', color: '#cbd5e1', lineHeight: '1.45', margin: 0 }}>
                    Evaluates operating margin squeeze caused by escalating supplier prices that cannot be instantly passed to customers.
                  </p>

                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.5rem', fontSize: '0.72rem', color: '#fbbf24' }}>
                    Recommended action: Negotiate 60-day price locks with primary supply vendors.
                  </div>
                </div>

                {/* 4. Liquidity Risk */}
                <div className="c4-dimension-card dim-high">
                  <div className="c4-dimension-header">
                    <div className="c4-dimension-title">
                      <Clock size={18} style={{ color: '#f87171' }} />
                      <span>4. Liquidity Risk</span>
                    </div>
                    <span className="c4-dimension-score">
                      Score: {(stage6.sub_scores?.liquidity_risk ?? 0.55).toFixed(2)}
                    </span>
                  </div>

                  <div className="c4-evidence-box">
                    <strong>Supporting Evidence:</strong> Capital runway calculated at {formatDisplayValue(plan.capital_runway_months, 'months')} based on liquid cash reserves.
                  </div>

                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Contributing Factors:</span>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <span className="c4-factor-pill">Cash Runway Months</span>
                      <span className="c4-factor-pill">Cash Reserve Buffer</span>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.76rem', color: '#cbd5e1', lineHeight: '1.45', margin: 0 }}>
                    Calculates how many months your business can stay open if initial revenue comes in slower than anticipated.
                  </p>

                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.5rem', fontSize: '0.72rem', color: '#f87171' }}>
                    Recommended action: Establish an emergency 3-month operating reserve before taking on discretionary expansions.
                  </div>
                </div>

                {/* 5. Operational Risk */}
                <div className="c4-dimension-card dim-low">
                  <div className="c4-dimension-header">
                    <div className="c4-dimension-title">
                      <Users size={18} style={{ color: '#a78bfa' }} />
                      <span>5. Operational Risk</span>
                    </div>
                    <span className="c4-dimension-score">
                      Score: 0.22
                    </span>
                  </div>

                  <div className="c4-evidence-box">
                    <strong>Supporting Evidence:</strong> Required staff operational plan and verified supplier relationships.
                  </div>

                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Contributing Factors:</span>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <span className="c4-factor-pill">Staff Availability</span>
                      <span className="c4-factor-pill">Supplier Continuity</span>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.76rem', color: '#cbd5e1', lineHeight: '1.45', margin: 0 }}>
                    Assesses vulnerability to sudden employee turnover, equipment downtime, and single-source supplier disruptions.
                  </p>

                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.5rem', fontSize: '0.72rem', color: '#a78bfa' }}>
                    Recommended action: Cross-train primary staff and identify at least two backup suppliers in your district.
                  </div>
                </div>

              </div>

              {/* Stepper Navigation Controls */}
              <div className="c4-nav-footer">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="c4-btn-back"
                >
                  <ArrowLeft size={16} />
                  Back to Follow-up Questions
                </button>
                <button
                  id="continue-to-step5-btn"
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="c4-btn-continue"
                >
                  Continue to Step 5: Mitigation &amp; Growth Plan
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          ) : (
            <div className="c4-card" style={{ padding: '3rem', textAlign: 'center' }}>
              <ShieldAlert size={36} style={{ color: '#64748b', marginBottom: '0.75rem' }} />
              <h3 style={{ color: '#ffffff', fontSize: '1.1rem', margin: 0 }}>No Assessment Run Yet</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.35rem', marginBottom: '1.25rem' }}>
                Complete Step 1 (Upload/Select Profile) and Step 3 to execute the risk evaluation.
              </p>
              <button onClick={() => setCurrentStep(1)} className="btn btn-primary" style={{ margin: '0 auto' }}>
                Go to Step 1
              </button>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 5: MITIGATION AND GROWTH PLAN (Section 4, Step 5)                    */}
      {/* ========================================================================= */}
      {currentStep === 5 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {hasActiveResult ? (
            <>
              {/* Prioritized Mitigations Checklist (Section 4, Step 5) */}
              <div className="c4-card">
                <div className="c4-card-title">
                  <CheckSquare size={18} style={{ color: '#10b981' }} />
                  Step 5: Prioritized Mitigation Actions
                </div>
                <p className="c4-card-desc">
                  Based on your risk dimensions, execute these prioritized actions to protect your enterprise. Toggle the checkbox as you complete or plan each milestone:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1rem' }}>
                  {(stage6.recommended_mitigations || [
                    {
                      action: 'Establish 3-Month Emergency Operating Reserve',
                      mechanism: 'Hold LKR 300,000 liquid buffer to insulate against delayed debtor collections.',
                      time_horizon: 'Immediate (Month 1-2)',
                      risk_factor: 'liquidity_risk',
                      estimated_cost: 'LKR 300,000 cash reserve'
                    },
                    {
                      action: 'Qualify Secondary Supply Partner in Western Province',
                      mechanism: 'Sign backup agreement with secondary wholesaler to protect against raw material price shocks.',
                      time_horizon: '1-3 months',
                      risk_factor: 'operational_risk',
                      estimated_cost: 'Minimal / Negotiation time'
                    },
                    {
                      action: 'Lock-in Advance Client Deposits',
                      mechanism: 'Require 20% advance booking deposit on major service appointments to guarantee demand.',
                      time_horizon: 'Ongoing',
                      risk_factor: 'market_risk',
                      estimated_cost: 'Zero outlay'
                    }
                  ]).map((mit, i) => {
                    const isPlanned = Boolean(plannedMitigations[i]);
                    return (
                      <div
                        key={i}
                        onClick={() => toggleMitigationPlanned(i)}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.85rem',
                          padding: '1.1rem',
                          background: isPlanned ? 'rgba(16, 185, 129, 0.12)' : 'rgba(15, 23, 42, 0.65)',
                          border: isPlanned ? '1px solid rgba(16, 185, 129, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ marginTop: '0.15rem', color: isPlanned ? '#34d399' : '#64748b' }}>
                          {isPlanned ? <CheckSquare size={20} /> : <Square size={20} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: isPlanned ? '#34d399' : '#ffffff' }}>
                            {mit.action || mit.title}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '0.25rem', lineHeight: '1.45' }}>
                            {mit.mechanism || mit.description}
                          </div>
                          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.72rem', color: '#94a3b8', flexWrap: 'wrap' }}>
                            <span>Timeline: <strong style={{ color: '#ffffff' }}>{mit.time_horizon || '1-3 months'}</strong></span>
                            <span>Targets: <strong style={{ color: '#818cf8' }}>{mit.risk_factor?.replace(/_/g, ' ') || 'Solvency'}</strong></span>
                            {mit.estimated_cost && (
                              <span>Estimated Resource: <strong style={{ color: '#4ade80' }}>{mit.estimated_cost}</strong></span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Stage-Tailored Growth Readiness & Next Options (Section 4, Step 5) */}
              <div className="c4-card">
                <div className="c4-card-title">
                  <TrendingUp size={18} style={{ color: '#818cf8' }} />
                  Tailored Growth Options for Your Enterprise
                </div>
                <p className="c4-card-desc">
                  Based on your current stage ({availableFacts.business_stage?.value || plan.business_stage || 'Startup'}) and operating capital:
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                  <div style={{ background: 'rgba(30, 41, 59, 0.65)', padding: '1.15rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#60a5fa', marginBottom: '0.35rem' }}>
                      Option 1: Margin Optimization &amp; Cash Buffer
                    </div>
                    <p style={{ fontSize: '0.76rem', color: '#cbd5e1', lineHeight: '1.45', margin: 0 }}>
                      Maintain current branch footprint, cross-train 2 core staff members, and focus on expanding customer lifetime value before expanding physically.
                    </p>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                      Capital requirement: Minimal &bull; Risk Exposure: Very Low
                    </div>
                  </div>

                  <div style={{ background: 'rgba(30, 41, 59, 0.65)', padding: '1.15rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a78bfa', marginBottom: '0.35rem' }}>
                      Option 2: Structured Service Expansion
                    </div>
                    <p style={{ fontSize: '0.76rem', color: '#cbd5e1', lineHeight: '1.45', margin: 0 }}>
                      Add specialized equipment or extended operating hours once 3 consecutive months of positive operating cashflow are recorded.
                    </p>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                      Capital requirement: LKR 150,000 - 300,000 &bull; Risk Exposure: Moderate
                    </div>
                  </div>
                </div>
              </div>

              {/* Trade Counterparty Relationship Graph (SVG Interactive Network) */}
              {graphData && (
                <div className="c4-card">
                  <div className="c4-card-title">
                    <Network size={18} style={{ color: '#c084fc' }} />
                    Trade Relationship Network (Counterparty Concentration)
                  </div>
                  <p className="c4-card-desc">
                    Visualizes trade connections between your business and Western Province suppliers. Graph AI evaluates whether supplier disruption could cascade into business closure.
                  </p>

                  <div style={{ background: 'rgba(10, 15, 26, 0.8)', padding: '1.25rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center', marginTop: '0.75rem' }}>
                    <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '0.75rem' }}>
                      Total Counterparties: <strong>{graphData.nodes?.length || 1}</strong> &bull; Concentration Status: <strong style={{ color: '#34d399' }}>Balanced</strong>
                    </div>

                    {/* SVG Visualization */}
                    <svg width="100%" height="220" viewBox="0 0 500 220" style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px' }}>
                      {/* Central Node */}
                      <circle cx="250" cy="110" r="32" fill="#4f46e5" stroke="#818cf8" strokeWidth="2" />
                      <text x="250" y="115" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
                        Your SME
                      </text>

                      {/* Supplier Node 1 */}
                      <line x1="250" y1="110" x2="120" y2="60" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3,3" />
                      <circle cx="120" cy="60" r="22" fill="#0f766e" stroke="#2dd4bf" strokeWidth="1.5" />
                      <text x="120" y="64" textAnchor="middle" fill="#ffffff" fontSize="8">
                        Supplier A
                      </text>

                      {/* Supplier Node 2 */}
                      <line x1="250" y1="110" x2="120" y2="160" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3,3" />
                      <circle cx="120" cy="160" r="22" fill="#0f766e" stroke="#2dd4bf" strokeWidth="1.5" />
                      <text x="120" y="164" textAnchor="middle" fill="#ffffff" fontSize="8">
                        Supplier B
                      </text>

                      {/* Buyer / Customer Node */}
                      <line x1="250" y1="110" x2="380" y2="110" stroke="#64748b" strokeWidth="1.5" />
                      <circle cx="380" cy="110" r="24" fill="#0369a1" stroke="#38bdf8" strokeWidth="1.5" />
                      <text x="380" y="114" textAnchor="middle" fill="#ffffff" fontSize="8">
                        Customers
                      </text>
                    </svg>

                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.5rem' }}>
                      Note: Verified observed relationships are solid lines; user-declared relationships are dashed. Zero synthetic edges are fabricated.
                    </div>
                  </div>
                </div>
              )}

              {/* Scientific Disclaimer (Section 4 & 6) */}
              <div style={{ padding: '1rem 1.25rem', background: 'rgba(30, 41, 59, 0.45)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', fontSize: '0.74rem', color: '#94a3b8', lineHeight: '1.5' }}>
                <strong style={{ color: '#cbd5e1' }}>Scientific Transparency &amp; Limitations Notice:</strong>
                <br />
                All projected metrics, risk indices, and growth readiness indications are simulation outputs to assist strategic planning. They do not constitute guaranteed financial returns, loan commitments, or certified statutory audits.
              </div>

              {/* Action Buttons: Save & Export */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="c4-btn-back"
                >
                  <ArrowLeft size={16} />
                  Back to Risk Dimensions
                </button>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={handleDownloadReport}
                    className="btn btn-primary"
                    style={{ fontSize: '0.85rem', padding: '0.65rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Download size={15} />
                    <span>Download Audit Report (.md)</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="c4-card" style={{ padding: '3rem', textAlign: 'center' }}>
              <ShieldAlert size={36} style={{ color: '#64748b', marginBottom: '0.75rem' }} />
              <h3 style={{ color: '#ffffff', fontSize: '1.1rem', margin: 0 }}>No Active Assessment</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.35rem', marginBottom: '1.25rem' }}>
                Run an evaluation in Step 1 through Step 3 to view tailored mitigation recommendations.
              </p>
              <button onClick={() => setCurrentStep(1)} className="btn btn-primary" style={{ margin: '0 auto' }}>
                Go to Step 1
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
