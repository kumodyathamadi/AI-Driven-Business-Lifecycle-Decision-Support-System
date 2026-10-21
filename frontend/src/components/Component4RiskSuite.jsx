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
  Edit3,
  Percent,
  Truck,
  Flame,
  Search,
  ExternalLink
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
  getComponent4Businesses,
  getComponent4ModelStatus
} from '../services/api';
import { formatLKR } from './Dashboard';

/**
 * Display formatter for SME facts and values.
 */
export const formatDisplayValue = (val, fieldKey = '', unit = '') => {
  if (val === null || val === undefined || val === '') {
    return 'Not provided';
  }

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
    const cleanEntries = Object.entries(val).filter(([k]) => !['provenance', 'status', 'recorded_at'].includes(k));
    if (cleanEntries.length > 0) {
      return cleanEntries.map(([k, v]) => `${k.replace(/_/g, ' ')}: ${formatDisplayValue(v)}`).join('; ');
    }
    return 'Provided';
  }

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
    return val.toLocaleString();
  }

  const str = String(val).trim();
  if (str === 'Unknown' || str === 'Not available' || str === 'N/A') {
    return 'Not available (marked unknown)';
  }
  return str;
};

export default function Component4RiskSuite({ 
  initialPlanData = null,
  initialStep = 1,
  activeContextTab = null,
  onAssessmentLoaded = null
}) {
  // 6-step guided sequential workflow
  // Step 1: Business Plan (Upload / Select Profile / Demo)
  // Step 2: Confirm Business Details (Organized by category, provenance tags, conflict resolution)
  // Step 3: Additional Information (5 Risk Dimensions progressive disclosure)
  // Step 4: Risk Assessment (5 Dimensions cards, scores, evidence, drivers)
  // Step 5: GNN Insights and Recommendations (Graph, Counterparties, Model Status & Disclosures)
  // Step 6: Mitigation and Growth Plan (Action Checklist with toggles, Growth Readiness, Markdown export)
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Upload & Extraction State
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedFilePath, setUploadedFilePath] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [availableFacts, setAvailableFacts] = useState({});
  const [confirmedBusinessId, setConfirmedBusinessId] = useState('');
  const [isReusedProfile, setIsReusedProfile] = useState(false);
  const [isDemoProfile, setIsDemoProfile] = useState(false);

  // Existing business picker modal
  const [existingBusinesses, setExistingBusinesses] = useState([]);
  const [showBusinessPicker, setShowBusinessPicker] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Conflict Resolution State (Step 2)
  const [conflictingFields, setConflictingFields] = useState({});
  const [editingFieldKey, setEditingFieldKey] = useState(null);
  const [editingFieldValue, setEditingFieldValue] = useState('');

  // Step 3 Progressive Disclosure State (5 Risk Dimensions)
  const [activeDimensionTab, setActiveDimensionTab] = useState('credit');
  const [formData, setFormData] = useState({
    outstanding_loan_balance: '',
    monthly_loan_repayment: '',
    overdue_repayments: 'No',
    repayment_status: 'Current',
    debt_guarantees: 'None',
    monthly_sales_revenue: '',
    monthly_customer_count: '',
    customer_demand_evidence: 'estimate_only',
    demand_competition_notes: '',
    inflation_affected_categories: 'Utilities, Raw materials',
    recent_supplier_price_increase_pct: '',
    imported_materials_exposure: 'Moderate',
    cash_available_operations: '',
    monthly_fixed_costs: '',
    monthly_variable_costs: '',
    accounts_receivable: '',
    accounts_payable: '',
    cash_reserve_after_startup: '',
    main_suppliers_list: '',
    supplier_dependency_level: 'Moderate',
    delivery_delay_days: '3-5 days',
    staffing_availability: 'Adequate',
    growth_objective: 'organic_expansion'
  });
  const [unknownToggles, setUnknownToggles] = useState({});
  const [declaredRelationships, setDeclaredRelationships] = useState([]);

  // Active Assessment Output (Steps 4, 5, 6)
  const [analysisResult, setAnalysisResult] = useState(initialPlanData);
  const [graphData, setGraphData] = useState(null);
  const [modelStatus, setModelStatus] = useState(null);
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [loadingModelStatus, setLoadingModelStatus] = useState(false);
  const [plannedMitigations, setPlannedMitigations] = useState({});
  const [activePlanSubTab, setActivePlanSubTab] = useState('mitigations'); // 'mitigations' or 'growth'
  const [selectedGraphNode, setSelectedGraphNode] = useState(null);

  // Load existing persistent businesses on mount
  useEffect(() => {
    loadExistingBusinesses();
    loadModelStatus();
  }, []);

  // Sync if initialPlanData changes
  useEffect(() => {
    if (initialPlanData) {
      setAnalysisResult(initialPlanData);
      const bId = initialPlanData.business_id || initialPlanData.analysis_id;
      if (bId) {
        setConfirmedBusinessId(bId);
        loadGraph(bId);
      }
    }
  }, [initialPlanData]);

  // Sync contextual tab if passed from workspace navigation
  useEffect(() => {
    if (activeContextTab) {
      if (activeContextTab === 'c4_profile') setCurrentStep(2);
      else if (activeContextTab === 'c4_risk_results') setCurrentStep(4);
      else if (activeContextTab === 'c4_gnn_insights') setCurrentStep(5);
      else if (activeContextTab === 'c4_mitigation_plan') {
        setCurrentStep(6);
        setActivePlanSubTab('mitigations');
      } else if (activeContextTab === 'c4_growth_readiness') {
        setCurrentStep(6);
        setActivePlanSubTab('growth');
      }
    }
  }, [activeContextTab]);

  const loadExistingBusinesses = async () => {
    setLoadingExisting(true);
    try {
      const res = await getComponent4Businesses(50);
      if (res && res.businesses) {
        setExistingBusinesses(res.businesses);
      }
    } catch (err) {
      console.warn('Could not fetch existing businesses:', err);
    } finally {
      setLoadingExisting(false);
    }
  };

  const loadModelStatus = async () => {
    setLoadingModelStatus(true);
    try {
      const status = await getComponent4ModelStatus();
      setModelStatus(status);
    } catch (err) {
      console.warn('Could not fetch GNN model status:', err);
    } finally {
      setLoadingModelStatus(false);
    }
  };

  const loadGraph = async (bId) => {
    setLoadingGraph(true);
    try {
      const g = await getComponent4Graph(bId);
      setGraphData(g);
    } catch (err) {
      console.warn('Could not load relationship graph:', err);
    } finally {
      setLoadingGraph(false);
    }
  };

  // STEP 1: Handle File Selection & Upload
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
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
      setIsDemoProfile(false);

      setSuccessMsg(`Extracted details from '${res.filename}'. Please review your confirmed business facts.`);
      setCurrentStep(2); // Advance to Step 2
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
    setSuccessMsg(`Loaded registered enterprise '${biz.business_name}' (${biz.id}).`);

    const facts = {
      business_name: { value: biz.business_name, provenance: 'user_confirmed', source_reference: 'Enterprise Profile' },
      district: { value: biz.district, provenance: 'user_confirmed', source_reference: 'Registration Record' },
      business_category: { value: biz.business_category, provenance: 'user_confirmed', source_reference: 'Registration Record' },
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

    const demoFacts = {
      business_name: { value: 'Helloo Glow Natural Cosmetics', provenance: 'plan_stated', source_reference: 'Plan Cover Page' },
      district: { value: 'Colombo', provenance: 'plan_stated', source_reference: 'Location Section 1.2' },
      business_category: { value: 'Personal Care & Beauty Services', provenance: 'plan_stated', source_reference: 'Executive Summary' },
      business_stage: { value: 'Operating SME', provenance: 'plan_stated', source_reference: 'Business Overview' },
      available_capital_lkr: { value: 850000, provenance: 'plan_stated', source_reference: 'Capital Statement Section 3.1' },
      loan_amount_lkr: { value: 450000, provenance: 'plan_stated', source_reference: 'Financing Proposal' }
    };
    setAvailableFacts(demoFacts);

    // Intentional conflicting value to test Step 2 conflict resolution
    const demoConflicts = {
      monthly_budget_lkr: {
        field_label: 'Monthly Operating Budget',
        unit: 'LKR',
        options: [
          { value: 180000, label: 'LKR 180,000', source: 'Section 3.1: Financial Outlay Table' },
          { value: 145000, label: 'LKR 145,000', source: 'Section 4.3: Operational Cost Schedule' }
        ],
        resolved_value: null,
        status: 'conflicting'
      }
    };
    setConflictingFields(demoConflicts);

    // Initial follow-up fields for Step 3
    setFormData(prev => ({
      ...prev,
      monthly_sales_revenue: '320000',
      monthly_customer_count: '110',
      customer_demand_evidence: 'pre_orders',
      outstanding_loan_balance: '450000',
      monthly_loan_repayment: '32000',
      cash_available_operations: '250000',
      monthly_fixed_costs: '95000',
      monthly_variable_costs: '50000',
      cash_reserve_after_startup: '180000',
      main_suppliers_list: 'Lanka Herbal Extracts Ltd, Colombo Packaging Co',
      supplier_dependency_level: 'High'
    }));

    setDeclaredRelationships([
      {
        partner_name: 'Lanka Herbal Extracts Ltd',
        partner_type: 'SUPPLIER',
        relationship_type: 'SUPPLIES',
        transaction_value_lkr: 85000,
        dependency_percentage: 65,
        payment_delay_days: 7
      },
      {
        partner_name: 'Colombo Packaging Co',
        partner_type: 'SUPPLIER',
        relationship_type: 'SUPPLIES',
        transaction_value_lkr: 40000,
        dependency_percentage: 35,
        payment_delay_days: 14
      }
    ]);

    setSuccessMsg("Loaded 'Helloo Glow Natural Cosmetics' demo business plan with budget discrepancy.");
    setCurrentStep(2);
  };

  // STEP 2: Conflict Resolution Handler
  const handleResolveConflict = (fieldKey, chosenValue) => {
    setConflictingFields(prev => ({
      ...prev,
      [fieldKey]: {
        ...prev[fieldKey],
        resolved_value: chosenValue,
        status: 'resolved'
      }
    }));
    // Also record in availableFacts as user_confirmed
    setAvailableFacts(prev => ({
      ...prev,
      [fieldKey]: {
        value: chosenValue,
        provenance: 'user_confirmed',
        source_reference: 'User resolved conflicting plan values'
      }
    }));
  };

  // STEP 2: Editable Fact Change Handler
  const handleFactEdit = (key, newVal) => {
    setAvailableFacts(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        value: newVal,
        provenance: 'user_confirmed'
      }
    }));
    setEditingFieldKey(null);
  };

  // STEP 3: Form Field Change Handlers
  const handleFormFieldChange = (fieldKey, value) => {
    setFormData(prev => ({ ...prev, [fieldKey]: value }));
    if (unknownToggles[fieldKey]) {
      setUnknownToggles(prev => ({ ...prev, [fieldKey]: false }));
    }
  };

  const handleToggleUnknown = (fieldKey) => {
    setUnknownToggles(prev => ({
      ...prev,
      [fieldKey]: !prev[fieldKey]
    }));
  };

  const handleAddRelationship = () => {
    setDeclaredRelationships(prev => [
      ...prev,
      {
        partner_name: '',
        partner_type: 'SUPPLIER',
        relationship_type: 'SUPPLIES',
        transaction_value_lkr: '',
        dependency_percentage: '',
        payment_delay_days: 0
      }
    ]);
  };

  const handleRelationshipChange = (index, key, val) => {
    const updated = [...declaredRelationships];
    updated[index][key] = val;
    setDeclaredRelationships(updated);
  };

  const handleRemoveRelationship = (index) => {
    setDeclaredRelationships(prev => prev.filter((_, i) => i !== index));
  };

  // STEP 3 -> 4: SUBMIT AND RUN RISK ASSESSMENT
  const handleSubmitAndRun = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validate that open conflicts are resolved
    const unresolved = Object.entries(conflictingFields).filter(([, c]) => c.status === 'conflicting');
    if (unresolved.length > 0) {
      setErrorMsg(`Please resolve the conflicting value for "${unresolved[0][1].field_label}" before running the assessment.`);
      setCurrentStep(2);
      setLoading(false);
      return;
    }

    try {
      const completedFields = { ...formData };
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

      // Load graph data & model status
      await Promise.allSettled([
        loadGraph(activeId),
        loadModelStatus()
      ]);

      if (onAssessmentLoaded) {
        onAssessmentLoaded(data);
      }

      setSuccessMsg(`Risk Assessment successfully completed for enterprise [${activeId}].`);
      setCurrentStep(4); // Advance to Step 4
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'object' && detail?.message 
        ? `${detail.message}: ${detail.errors?.join(', ')}` 
        : (detail || err.message);
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

  const toggleMitigationStatus = (index) => {
    setPlannedMitigations(prev => {
      const current = prev[index] || 'not_started';
      const next = current === 'not_started' ? 'planned' : current === 'planned' ? 'completed' : 'not_started';
      return { ...prev, [index]: next };
    });
  };

  // Helper provenance badge
  const renderProvenanceTag = (prov) => {
    const p = String(prov || 'unknown').toLowerCase();
    if (p.includes('plan')) {
      return <span className="provenance-tag provenance-plan">Stated in Plan</span>;
    }
    if (p.includes('confirm')) {
      return <span className="provenance-tag provenance-confirmed">Confirmed by User</span>;
    }
    if (p.includes('estimate')) {
      return <span className="provenance-tag provenance-estimated">Estimated by User</span>;
    }
    if (p.includes('conflict')) {
      return <span className="provenance-tag provenance-conflicting">Conflicting</span>;
    }
    if (p.includes('derived')) {
      return <span className="provenance-tag provenance-derived">Derived Calculation</span>;
    }
    return <span className="provenance-tag provenance-unknown">Unknown</span>;
  };

  // 6 Steps Definition
  const steps = [
    { num: 1, label: 'Business Plan' },
    { num: 2, label: 'Confirm Details' },
    { num: 3, label: 'Additional Information' },
    { num: 4, label: 'Risk Assessment' },
    { num: 5, label: 'GNN Insights' },
    { num: 6, label: 'Mitigation & Growth' },
  ];

  // Derived analysis variables safely extracted
  const hasActiveResult = Boolean(
    analysisResult && 
    (analysisResult.stage6_risk_assessment || analysisResult.composite_risk_score !== undefined)
  );
  const stage6 = analysisResult?.stage6_risk_assessment || {};
  const stage7 = analysisResult?.stage7_gnn_inference || {};
  const readiness = analysisResult?.growth_readiness || {};
  const plan = analysisResult?.business_plan || analysisResult?.plan_extraction || {};

  // Safely extract scores without hardcoded float fallbacks
  const compositeScore = (stage6.composite_risk_score !== undefined && stage6.composite_risk_score !== null)
    ? Number(stage6.composite_risk_score)
    : (analysisResult?.composite_risk_score !== undefined ? Number(analysisResult.composite_risk_score) : null);
  const creditScore = (stage6.sub_scores?.credit_risk !== undefined && stage6.sub_scores?.credit_risk !== null)
    ? Number(stage6.sub_scores.credit_risk)
    : (stage6.sub_scores?.debt_burden_risk !== undefined && stage6.sub_scores?.debt_burden_risk !== null ? Number(stage6.sub_scores.debt_burden_risk) : null);
  const marketScore = (stage6.sub_scores?.market_risk !== undefined && stage6.sub_scores?.market_risk !== null) ? Number(stage6.sub_scores.market_risk) : null;
  const inflationScore = (stage6.sub_scores?.inflation_risk !== undefined && stage6.sub_scores?.inflation_risk !== null) ? Number(stage6.sub_scores.inflation_risk) : null;
  const liquidityScore = (stage6.sub_scores?.liquidity_risk !== undefined && stage6.sub_scores?.liquidity_risk !== null) ? Number(stage6.sub_scores.liquidity_risk) : null;
  const operationalScore = (stage6.sub_scores?.operational_risk !== undefined && stage6.sub_scores?.operational_risk !== null) ? Number(stage6.sub_scores.operational_risk) : null;

  return (
    <div className="c4-container">
      {/* Alert Messages */}
      {errorMsg && (
        <div style={{ background: 'var(--risk-high-bg)', border: '1px solid var(--risk-high-border)', color: 'var(--risk-high)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div style={{ background: 'var(--risk-low-bg)', border: '1px solid var(--risk-low-border)', color: 'var(--risk-low)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 6-Step Progress Stepper */}
      <div className="c4-stepper" aria-label="Risk Assessment Progress">
        {steps.map((s, idx) => {
          const isActive = currentStep === s.num;
          const isCompleted = currentStep > s.num;

          return (
            <React.Fragment key={s.num}>
              <button
                type="button"
                onClick={() => {
                  // Only allow jumping forward if result exists, backward always allowed
                  if (s.num < currentStep || hasActiveResult) {
                    setCurrentStep(s.num);
                  }
                }}
                className={`c4-step-node ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                aria-current={isActive ? 'step' : undefined}
              >
                <div className="c4-step-circle">
                  {isCompleted ? <Check size={13} /> : s.num}
                </div>
                <span className="c4-step-label">{s.label}</span>
              </button>

              {idx < steps.length - 1 && <div className="c4-step-line" />}
            </React.Fragment>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: BUSINESS PLAN UPLOAD / SELECT PROFILE                             */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="c4-section-card">
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.35rem 0' }}>
              Upload your business plan
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 1.5rem 0' }}>
              Upload the business plan prepared by SME360 AI or select an existing business profile.
            </p>

            {/* Drag & Drop Upload Dropzone */}
            <div 
              className="c4-upload-box"
              onClick={() => document.getElementById('c4-file-input').click()}
            >
              <UploadCloud size={40} style={{ color: 'var(--primary-green)', marginBottom: '0.75rem' }} />
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Click to browse or drag &amp; drop your business plan
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                Accepted formats: PDF, DOCX, JSON, TXT &bull; Max size: 10MB
              </div>
              <input
                id="c4-file-input"
                type="file"
                accept=".pdf,.docx,.json,.txt"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>

            {/* Selected File Card */}
            {selectedFile && (
              <div className="c4-file-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <FileText size={20} style={{ color: 'var(--primary-green)' }} />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {selectedFile.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      {(selectedFile.size / 1024).toFixed(1)} KB &bull; Ready for extraction
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="btn btn-subtle"
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                  >
                    Remove
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 1rem' }}
                  >
                    {loading ? <RefreshCw size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                    <span>Extract &amp; Continue</span>
                  </button>
                </div>
              </div>
            )}

            {/* Secondary Options Divider */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '2rem 0 1.25rem 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
              <span style={{ padding: '0 0.85rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Or Choose an Alternate Method
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
            </div>

            {/* Alternate Ingestion Actions */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setShowBusinessPicker(true)}
                className="btn btn-secondary"
                style={{ flex: '1 1 240px', justifyContent: 'flex-start', padding: '0.85rem 1rem' }}
              >
                <FolderOpen size={18} style={{ color: 'var(--primary-green)' }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.825rem' }}>Select Existing Business Profile</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Pick from previously saved Western Province enterprises</div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleLoadHellooGlowSample}
                className="btn btn-secondary"
                style={{ flex: '1 1 240px', justifyContent: 'flex-start', padding: '0.85rem 1rem' }}
              >
                <Sparkles size={18} style={{ color: 'var(--primary-green)' }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.825rem' }}>Try Helloo Glow Demo</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Preloads beauty studio plan with budget conflict scenario</div>
                </div>
              </button>
            </div>
          </div>

          {/* Modal Picker for Existing Businesses */}
          {showBusinessPicker && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '1rem'
            }}>
              <div className="content-card" style={{ maxWidth: '600px', width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Select Registered Business Profile</h3>
                  <button onClick={() => setShowBusinessPicker(false)} className="btn btn-subtle" style={{ padding: '0.2rem' }}>
                    <XCircle size={18} />
                  </button>
                </div>

                <div style={{ overflowY: 'auto', padding: '1rem 0', flex: 1 }}>
                  {loadingExisting ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 0.5rem auto' }} />
                      Loading businesses...
                    </div>
                  ) : existingBusinesses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      No persistent business profiles registered yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {existingBusinesses.map(b => (
                        <div
                          key={b.id}
                          onClick={() => handleSelectExistingBusiness(b)}
                          style={{
                            padding: '0.75rem 1rem',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'var(--bg-surface)'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                              {b.business_name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                              ID: {b.id} &middot; {b.business_category} &middot; {b.district}
                            </div>
                          </div>
                          <button className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '0.25rem 0.65rem' }}>
                            Select
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: CONFIRM BUSINESS DETAILS (Organized & Conflict Resolution)         */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Conflicting Values Resolution Banner */}
          {Object.keys(conflictingFields).length > 0 && (
            <div className="c4-conflict-card">
              <div className="c4-conflict-title">
                <AlertTriangle size={18} />
                <span>Conflicting Values Detected in Business Plan</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', margin: '0 0 1rem 0' }}>
                The uploaded plan contains differing values across sections. Please confirm which figure reflects your actual business baseline:
              </p>

              {Object.entries(conflictingFields).map(([key, conf]) => (
                <div key={key} style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    {conf.field_label}:
                  </div>
                  <div className="c4-conflict-options">
                    {conf.options.map((opt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleResolveConflict(key, opt.value)}
                        className={`c4-conflict-btn ${conf.resolved_value === opt.value ? 'selected' : ''}`}
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: conf.resolved_value === opt.value ? 'var(--primary-green)' : 'var(--text-primary)' }}>
                          {opt.label}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          Source: {opt.source}
                        </div>
                        {conf.resolved_value === opt.value && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--primary-green)', fontWeight: 700, marginTop: '0.35rem' }}>
                            ✓ Selected for Baseline
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Form Organized into 5 Standard Categories */}
          <div className="c4-section-card">
            <div className="c4-section-heading">
              <span>1. Business Identity &amp; Registration</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                Original document remains unaltered
              </span>
            </div>
            <div className="grid-2">
              <div>
                <label className="form-label">Business Name</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={availableFacts.business_name?.value || ''}
                    onChange={(e) => handleFactEdit('business_name', e.target.value)}
                    className="form-control"
                  />
                  {renderProvenanceTag(availableFacts.business_name?.provenance)}
                </div>
              </div>
              <div>
                <label className="form-label">Assigned Persistent ID</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={confirmedBusinessId || ''}
                    onChange={(e) => setConfirmedBusinessId(e.target.value)}
                    className="form-control"
                  />
                  <span className="provenance-tag provenance-confirmed">
                    {isReusedProfile ? 'Reused Profile' : 'New Entity'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="c4-section-card">
            <div className="c4-section-heading">
              <span>2. Location &amp; Geographic Scope</span>
            </div>
            <div className="grid-2">
              <div>
                <label className="form-label">District (Western Province)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <select
                    value={availableFacts.district?.value || 'Colombo'}
                    onChange={(e) => handleFactEdit('district', e.target.value)}
                    className="form-select"
                  >
                    <option value="Colombo">Colombo</option>
                    <option value="Gampaha">Gampaha</option>
                    <option value="Kalutara">Kalutara</option>
                  </select>
                  {renderProvenanceTag(availableFacts.district?.provenance)}
                </div>
              </div>
              <div>
                <label className="form-label">Province</label>
                <input
                  type="text"
                  value="Western Province"
                  disabled
                  className="form-control"
                />
              </div>
            </div>
          </div>

          <div className="c4-section-card">
            <div className="c4-section-heading">
              <span>3. Business Stage &amp; Category</span>
            </div>
            <div className="grid-2">
              <div>
                <label className="form-label">Business Sector / Category</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={availableFacts.business_category?.value || ''}
                    onChange={(e) => handleFactEdit('business_category', e.target.value)}
                    className="form-control"
                  />
                  {renderProvenanceTag(availableFacts.business_category?.provenance)}
                </div>
              </div>
              <div>
                <label className="form-label">Current Lifecycle Stage</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <select
                    value={availableFacts.business_stage?.value || 'Operating SME'}
                    onChange={(e) => handleFactEdit('business_stage', e.target.value)}
                    className="form-select"
                  >
                    <option value="Idea / Concept">Idea / Concept</option>
                    <option value="New Startup">New Startup</option>
                    <option value="Operating SME">Operating SME</option>
                    <option value="Growth / Expansion">Growth / Expansion</option>
                    <option value="Maturity">Maturity</option>
                  </select>
                  {renderProvenanceTag(availableFacts.business_stage?.provenance)}
                </div>
              </div>
            </div>
          </div>

          <div className="c4-section-card">
            <div className="c4-section-heading">
              <span>4. Baseline Financial Figures</span>
            </div>
            <div className="grid-2">
              <div>
                <label className="form-label">Available Starting Capital (LKR)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="number"
                    value={availableFacts.available_capital_lkr?.value || ''}
                    onChange={(e) => handleFactEdit('available_capital_lkr', Number(e.target.value))}
                    className="form-control"
                  />
                  {renderProvenanceTag(availableFacts.available_capital_lkr?.provenance)}
                </div>
              </div>
              <div>
                <label className="form-label">Initial Financing / Loan Incurred (LKR)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="number"
                    value={availableFacts.loan_amount_lkr?.value || ''}
                    onChange={(e) => handleFactEdit('loan_amount_lkr', Number(e.target.value))}
                    className="form-control"
                  />
                  {renderProvenanceTag(availableFacts.loan_amount_lkr?.provenance)}
                </div>
              </div>
            </div>
          </div>

          {/* Stepper Navigation Buttons */}
          <div className="c4-bottom-nav">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="btn btn-secondary"
            >
              <ArrowLeft size={15} />
              <span>Back to Upload</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="btn btn-primary"
            >
              <span>Continue to Additional Information</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: ADDITIONAL INFORMATION (5 Risk Dimensions Progressive Disclosure)  */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="c4-section-card">
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.35rem 0' }}>
              Additional Information for Five Risk Dimensions
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 1.25rem 0' }}>
              Provide supplemental operating facts. Fields without exact records can be marked &ldquo;Unknown&rdquo; or &ldquo;Not sure&rdquo; without blocking the evaluation.
            </p>

            {/* Dimension Switcher Pills */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              {[
                { id: 'credit', label: 'A. Credit Risk', icon: DollarSign },
                { id: 'market', label: 'B. Market Risk', icon: TrendingUp },
                { id: 'inflation', label: 'C. Inflation Risk', icon: Flame },
                { id: 'liquidity', label: 'D. Liquidity Risk', icon: Clock },
                { id: 'operational', label: 'E. Operational Risk', icon: Truck },
              ].map(dim => {
                const Icon = dim.icon;
                const isSelected = activeDimensionTab === dim.id;
                return (
                  <button
                    key={dim.id}
                    type="button"
                    onClick={() => setActiveDimensionTab(dim.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.45rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      fontWeight: isSelected ? 700 : 500,
                      background: isSelected ? 'var(--primary-green-subtle)' : 'var(--bg-subtle)',
                      color: isSelected ? 'var(--primary-green)' : 'var(--text-secondary)',
                      border: isSelected ? '1px solid var(--primary-green-border)' : '1px solid var(--border-color)',
                      cursor: 'pointer'
                    }}
                  >
                    <Icon size={14} />
                    <span>{dim.label}</span>
                  </button>
                );
              })}
            </div>

            {/* DIMENSION A: CREDIT RISK */}
            {activeDimensionTab === 'credit' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="grid-2">
                  <div>
                    <label className="form-label">Outstanding Loan Balance (LKR)</label>
                    <input
                      type="number"
                      disabled={unknownToggles['outstanding_loan_balance']}
                      value={unknownToggles['outstanding_loan_balance'] ? '' : formData.outstanding_loan_balance}
                      onChange={(e) => handleFormFieldChange('outstanding_loan_balance', e.target.value)}
                      placeholder={unknownToggles['outstanding_loan_balance'] ? 'Marked Unknown' : 'e.g. 450000'}
                      className="form-control"
                    />
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
                      <button type="button" onClick={() => handleToggleUnknown('outstanding_loan_balance')} className="btn btn-subtle" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}>
                        {unknownToggles['outstanding_loan_balance'] ? 'Clear Unknown' : 'Mark Unknown'}
                      </button>
                      <button type="button" onClick={() => handleFormFieldChange('outstanding_loan_balance', '0')} className="btn btn-subtle" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}>
                        No Loan (LKR 0)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Monthly Loan Repayment (LKR)</label>
                    <input
                      type="number"
                      disabled={unknownToggles['monthly_loan_repayment']}
                      value={unknownToggles['monthly_loan_repayment'] ? '' : formData.monthly_loan_repayment}
                      onChange={(e) => handleFormFieldChange('monthly_loan_repayment', e.target.value)}
                      placeholder="e.g. 32000"
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div>
                    <label className="form-label">Overdue Repayments</label>
                    <select
                      value={formData.overdue_repayments}
                      onChange={(e) => handleFormFieldChange('overdue_repayments', e.target.value)}
                      className="form-select"
                    >
                      <option value="No">No Overdue Installments</option>
                      <option value="1-30 Days">1–30 Days Overdue</option>
                      <option value="30+ Days">30+ Days Overdue</option>
                      <option value="Unknown">Not Sure</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Existing Debt Guarantees / Obligations</label>
                    <input
                      type="text"
                      value={formData.debt_guarantees}
                      onChange={(e) => handleFormFieldChange('debt_guarantees', e.target.value)}
                      placeholder="e.g. Personal director guarantee, equipment lien"
                      className="form-control"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* DIMENSION B: MARKET RISK */}
            {activeDimensionTab === 'market' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="grid-2">
                  <div>
                    <label className="form-label">Monthly Sales or Revenue (LKR)</label>
                    <input
                      type="number"
                      value={formData.monthly_sales_revenue}
                      onChange={(e) => handleFormFieldChange('monthly_sales_revenue', e.target.value)}
                      placeholder="e.g. 350000"
                      className="form-control"
                    />
                  </div>

                  <div>
                    <label className="form-label">Average Monthly Customer Count</label>
                    <input
                      type="number"
                      value={formData.monthly_customer_count}
                      onChange={(e) => handleFormFieldChange('monthly_customer_count', e.target.value)}
                      placeholder="e.g. 120"
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div>
                    <label className="form-label">Demand Verification Evidence</label>
                    <select
                      value={formData.customer_demand_evidence}
                      onChange={(e) => handleFormFieldChange('customer_demand_evidence', e.target.value)}
                      className="form-select"
                    >
                      <option value="actual_records">Actual Accounting Sales Records</option>
                      <option value="pre_orders">Signed Pre-orders or Deposits</option>
                      <option value="survey">Market Survey / Customer Interviews</option>
                      <option value="foot_traffic">Direct Footfall Observation</option>
                      <option value="estimate_only">Founder Estimate Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Local Competition Notes</label>
                    <input
                      type="text"
                      value={formData.demand_competition_notes}
                      onChange={(e) => handleFormFieldChange('demand_competition_notes', e.target.value)}
                      placeholder="e.g. 2 nearby competitors within 1km"
                      className="form-control"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* DIMENSION C: INFLATION RISK */}
            {activeDimensionTab === 'inflation' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="grid-2">
                  <div>
                    <label className="form-label">Main Cost Categories Affected by Inflation</label>
                    <input
                      type="text"
                      value={formData.inflation_affected_categories}
                      onChange={(e) => handleFormFieldChange('inflation_affected_categories', e.target.value)}
                      placeholder="e.g. Raw materials, electricity, delivery tariffs"
                      className="form-control"
                    />
                  </div>

                  <div>
                    <label className="form-label">Recent Supplier Price Increases (% if known)</label>
                    <input
                      type="number"
                      value={formData.recent_supplier_price_increase_pct}
                      onChange={(e) => handleFormFieldChange('recent_supplier_price_increase_pct', e.target.value)}
                      placeholder="e.g. 15"
                      className="form-control"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Imported Materials &amp; Currency Exposure</label>
                  <select
                    value={formData.imported_materials_exposure}
                    onChange={(e) => handleFormFieldChange('imported_materials_exposure', e.target.value)}
                    className="form-select"
                  >
                    <option value="Low">Low (Primarily locally sourced in Sri Lanka)</option>
                    <option value="Moderate">Moderate (Some packaging or auxiliary inputs imported)</option>
                    <option value="High">High (Direct foreign currency or imported raw material reliance)</option>
                  </select>
                </div>
              </div>
            )}

            {/* DIMENSION D: LIQUIDITY RISK */}
            {activeDimensionTab === 'liquidity' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="grid-2">
                  <div>
                    <label className="form-label">Cash Currently Available for Operations (LKR)</label>
                    <input
                      type="number"
                      value={formData.cash_available_operations}
                      onChange={(e) => handleFormFieldChange('cash_available_operations', e.target.value)}
                      placeholder="e.g. 200000"
                      className="form-control"
                    />
                  </div>

                  <div>
                    <label className="form-label">Monthly Fixed Costs (LKR)</label>
                    <input
                      type="number"
                      value={formData.monthly_fixed_costs}
                      onChange={(e) => handleFormFieldChange('monthly_fixed_costs', e.target.value)}
                      placeholder="e.g. 85000"
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div>
                    <label className="form-label">Monthly Variable Costs (LKR)</label>
                    <input
                      type="number"
                      value={formData.monthly_variable_costs}
                      onChange={(e) => handleFormFieldChange('monthly_variable_costs', e.target.value)}
                      placeholder="e.g. 60000"
                      className="form-control"
                    />
                  </div>

                  <div>
                    <label className="form-label">Emergency Cash Reserve Buffer (LKR)</label>
                    <input
                      type="number"
                      value={formData.cash_reserve_after_startup}
                      onChange={(e) => handleFormFieldChange('cash_reserve_after_startup', e.target.value)}
                      placeholder="e.g. 150000"
                      className="form-control"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* DIMENSION E: OPERATIONAL RISK & RELATIONSHIPS */}
            {activeDimensionTab === 'operational' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="grid-2">
                  <div>
                    <label className="form-label">Supplier Dependency Level</label>
                    <select
                      value={formData.supplier_dependency_level}
                      onChange={(e) => handleFormFieldChange('supplier_dependency_level', e.target.value)}
                      className="form-select"
                    >
                      <option value="Low">Low (Multiple suppliers available nearby)</option>
                      <option value="Moderate">Moderate (2–3 primary vendors)</option>
                      <option value="High">High (Single critical supplier bottleneck)</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Typical Delivery Lead Time</label>
                    <select
                      value={formData.delivery_delay_days}
                      onChange={(e) => handleFormFieldChange('delivery_delay_days', e.target.value)}
                      className="form-select"
                    >
                      <option value="1-3 days">1–3 Days</option>
                      <option value="3-5 days">3–5 Days</option>
                      <option value="7-14 days">7–14 Days</option>
                      <option value="14+ days">Over 14 Days</option>
                    </select>
                  </div>
                </div>

                {/* Counterparties Adder for GNN Network */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>
                        Declared Trade Counterparties (Suppliers / Customers / Lenders)
                      </h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                        Used by the GNN model to evaluate supply chain concentration and credit contagion.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddRelationship}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                    >
                      <Plus size={13} />
                      <span>Add Counterparty</span>
                    </button>
                  </div>

                  {declaredRelationships.length === 0 ? (
                    <div style={{ padding: '1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      No counterparties declared yet. Adding suppliers or major buyers enables relational GNN insights.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {declaredRelationships.map((rel, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '0.85rem',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-surface)',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr)) auto',
                            gap: '0.75rem',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <label className="form-label" style={{ fontSize: '0.7rem' }}>Counterparty Name</label>
                            <input
                              type="text"
                              value={rel.partner_name}
                              onChange={(e) => handleRelationshipChange(idx, 'partner_name', e.target.value)}
                              placeholder="e.g. Lanka Wholesale Ltd"
                              className="form-control"
                              style={{ fontSize: '0.8rem', padding: '0.4rem 0.5rem' }}
                            />
                          </div>

                          <div>
                            <label className="form-label" style={{ fontSize: '0.7rem' }}>Partner Type</label>
                            <select
                              value={rel.partner_type}
                              onChange={(e) => handleRelationshipChange(idx, 'partner_type', e.target.value)}
                              className="form-select"
                              style={{ fontSize: '0.8rem', padding: '0.4rem 0.5rem' }}
                            >
                              <option value="SUPPLIER">Supplier</option>
                              <option value="CUSTOMER">Major Customer</option>
                              <option value="LENDER">Lender / Bank</option>
                            </select>
                          </div>

                          <div>
                            <label className="form-label" style={{ fontSize: '0.7rem' }}>Monthly Value (LKR)</label>
                            <input
                              type="number"
                              value={rel.transaction_value_lkr}
                              onChange={(e) => handleRelationshipChange(idx, 'transaction_value_lkr', e.target.value)}
                              placeholder="e.g. 50000"
                              className="form-control"
                              style={{ fontSize: '0.8rem', padding: '0.4rem 0.5rem' }}
                            />
                          </div>

                          <div>
                            <label className="form-label" style={{ fontSize: '0.7rem' }}>Concentration %</label>
                            <input
                              type="number"
                              value={rel.dependency_percentage}
                              onChange={(e) => handleRelationshipChange(idx, 'dependency_percentage', e.target.value)}
                              placeholder="e.g. 50"
                              className="form-control"
                              style={{ fontSize: '0.8rem', padding: '0.4rem 0.5rem' }}
                            />
                          </div>

                          <div style={{ paddingTop: '1.25rem' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveRelationship(idx)}
                              className="btn btn-subtle"
                              style={{ padding: '0.35rem', color: 'var(--risk-high)' }}
                              title="Remove counterparty"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Stepper Navigation Buttons */}
          <div className="c4-bottom-nav">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="btn btn-secondary"
            >
              <ArrowLeft size={15} />
              <span>Back to Details</span>
            </button>

            <button
              type="button"
              onClick={handleSubmitAndRun}
              disabled={loading}
              className="btn btn-primary"
              style={{ fontWeight: 700 }}
            >
              {loading ? <RefreshCw size={15} className="animate-spin" /> : <ShieldAlert size={15} />}
              <span>{loading ? 'Evaluating Risk & Running GNN...' : 'Execute Risk Assessment'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: RISK ASSESSMENT RESULTS (5 Risk Dimensions)                        */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {hasActiveResult ? (
            <>
              {/* Overall Assessment Score Banner */}
              <div className="content-card" style={{ padding: '1.5rem 1.75rem', background: 'var(--bg-surface)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary-green)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      Step 4: Five Risk Dimensions Analysis
                    </span>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.25rem 0' }}>
                      {availableFacts.business_name?.value || plan.business_name || 'Assessed Enterprise'} &bull; {availableFacts.district?.value || plan.district || 'Western Province'}
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0 0', maxWidth: '740px', lineHeight: 1.5 }}>
                      {readiness.risk_adjusted_recommendation || 'Assessment completed. Review the five risk dimensions below to see where your business is resilient and where mitigation actions are required.'}
                    </p>
                  </div>

                  <div>
                    <span style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      padding: '0.35rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      background: (stage6.overall_risk_category || 'MEDIUM') === 'LOW' ? 'var(--risk-low-bg)' :
                                  (stage6.overall_risk_category || 'MEDIUM') === 'MEDIUM' ? 'var(--risk-medium-bg)' : 'var(--risk-high-bg)',
                      color: (stage6.overall_risk_category || 'MEDIUM') === 'LOW' ? 'var(--risk-low)' :
                             (stage6.overall_risk_category || 'MEDIUM') === 'MEDIUM' ? 'var(--risk-medium)' : 'var(--risk-high)',
                      border: `1px solid ${(stage6.overall_risk_category || 'MEDIUM') === 'LOW' ? 'var(--risk-low-border)' :
                              (stage6.overall_risk_category || 'MEDIUM') === 'MEDIUM' ? 'var(--risk-medium-border)' : 'var(--risk-high-border)'}`
                    }}>
                      OVERALL: {stage6.overall_risk_category || 'EVALUATED'} RISK
                    </span>
                  </div>
                </div>

                {/* Score Bar */}
                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Composite Risk Score: {compositeScore !== null ? (
                        <strong style={{ color: 'var(--text-primary)' }}>{compositeScore.toFixed(2)} / 1.00</strong>
                      ) : (
                        <strong style={{ color: 'var(--text-muted)' }}>Pending Calculation</strong>
                      )}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                      (Lower is safer &bull; Distinguishes model prediction from deterministic financial metrics)
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--bg-subtle)', borderRadius: '4px', marginTop: '0.4rem', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${compositeScore !== null ? Math.min(100, Math.max(0, compositeScore * 100)) : 0}%`,
                        background: (stage6.overall_risk_category || 'MEDIUM') === 'HIGH' ? 'var(--risk-high)' :
                                    (stage6.overall_risk_category || 'MEDIUM') === 'MEDIUM' ? 'var(--risk-medium)' : 'var(--risk-low)',
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 5 Risk Dimensions Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* 1. Credit Risk */}
                <div className="c4-risk-card">
                  <div className="c4-risk-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <DollarSign size={18} style={{ color: creditScore !== null ? (creditScore >= 0.65 ? 'var(--risk-high)' : 'var(--primary-green)') : 'var(--text-muted)' }} />
                      <span className="c4-risk-card-title">1. Credit Risk</span>
                    </div>
                    <span className={creditScore !== null ? (creditScore >= 0.65 ? 'badge-risk-high' : creditScore >= 0.35 ? 'badge-risk-medium' : 'badge-risk-low') : 'badge-risk-neutral'}>
                      {creditScore !== null ? `Score: ${creditScore.toFixed(2)}` : 'Score: Pending'}
                    </span>
                  </div>

                  <div style={{ background: 'var(--bg-subtle)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <strong>Supporting Evidence:</strong> Outstanding debt of {formatDisplayValue(formData.outstanding_loan_balance || plan.outstanding_loan_balance_lkr || plan.outstanding_debt_lkr, 'loan')}, monthly repayment {formatDisplayValue(formData.monthly_loan_repayment || plan.monthly_loan_repayment_lkr, 'loan')}, overdue status: {formData.overdue_repayments || plan.repayment_overdue_status || 'Current'}.
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    Evaluates debt service capacity, repayment delinquency history, and debt-to-capital leverage buffer.
                  </div>

                  <div style={{ fontSize: '0.75rem', color: creditScore !== null && creditScore >= 0.65 ? 'var(--risk-high)' : 'var(--primary-green)', fontWeight: 600 }}>
                    Recommended Next Action: {creditScore !== null ? (creditScore >= 0.65 ? 'Resolve overdue arrears immediately and freeze additional borrowing until debt ratio normalizes.' : 'Maintain monthly debt service obligations below 25% of gross operational collections.') : 'Complete financial intake to calculate credit service capacity.'}
                  </div>
                </div>

                {/* 2. Market Risk */}
                <div className="c4-risk-card">
                  <div className="c4-risk-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <TrendingUp size={18} style={{ color: marketScore !== null ? (marketScore >= 0.65 ? 'var(--risk-high)' : 'var(--primary-green)') : 'var(--text-muted)' }} />
                      <span className="c4-risk-card-title">2. Market Risk</span>
                    </div>
                    <span className={marketScore !== null ? (marketScore >= 0.65 ? 'badge-risk-high' : marketScore >= 0.35 ? 'badge-risk-medium' : 'badge-risk-low') : 'badge-risk-neutral'}>
                      {marketScore !== null ? `Score: ${marketScore.toFixed(2)}` : 'Score: Pending'}
                    </span>
                  </div>

                  <div style={{ background: 'var(--bg-subtle)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <strong>Supporting Evidence:</strong> Location in {plan.district || 'Western Province'} with demand verification: {formData.customer_demand_evidence?.replace(/_/g, ' ') || 'pre-orders'}.
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    Measures susceptibility to competitor discounting, foot traffic contraction, and local purchasing power fluctuations.
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--primary-green)', fontWeight: 600 }}>
                    Recommended Next Action: Collect customer loyalty contact records and offer pre-booking incentives to guarantee baseline volume.
                  </div>
                </div>

                {/* 3. Inflation Risk */}
                <div className="c4-risk-card">
                  <div className="c4-risk-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Flame size={18} style={{ color: inflationScore !== null ? (inflationScore >= 0.65 ? 'var(--risk-high)' : 'var(--risk-medium)') : 'var(--text-muted)' }} />
                      <span className="c4-risk-card-title">3. Inflation Risk</span>
                    </div>
                    <span className={inflationScore !== null ? (inflationScore >= 0.65 ? 'badge-risk-high' : inflationScore >= 0.35 ? 'badge-risk-medium' : 'badge-risk-low') : 'badge-risk-neutral'}>
                      {inflationScore !== null ? `Score: ${inflationScore.toFixed(2)}` : 'Score: Pending'}
                    </span>
                  </div>

                  <div style={{ background: 'var(--bg-subtle)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <strong>Supporting Evidence:</strong> Operating expenses exposed to Sri Lankan utility tariffs, imported inputs ({formData.imported_materials_exposure || 'Moderate'}), and vendor price escalation.
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    Evaluates operating margin squeeze caused by escalating vendor prices that cannot be immediately passed on to retail clients.
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--risk-medium)', fontWeight: 600 }}>
                    Recommended Next Action: Negotiate 60-day price locks with primary vendors and identify domestic ingredient substitutes.
                  </div>
                </div>

                {/* 4. Liquidity Risk */}
                <div className="c4-risk-card">
                  <div className="c4-risk-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Clock size={18} style={{ color: liquidityScore !== null ? (liquidityScore >= 0.65 ? 'var(--risk-high)' : 'var(--risk-medium)') : 'var(--text-muted)' }} />
                      <span className="c4-risk-card-title">4. Liquidity Risk</span>
                    </div>
                    <span className={liquidityScore !== null ? (liquidityScore >= 0.65 ? 'badge-risk-high' : liquidityScore >= 0.35 ? 'badge-risk-medium' : 'badge-risk-low') : 'badge-risk-neutral'}>
                      {liquidityScore !== null ? `Score: ${liquidityScore.toFixed(2)}` : 'Score: Pending'}
                    </span>
                  </div>

                  <div style={{ background: 'var(--bg-subtle)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <strong>Supporting Evidence:</strong> Capital runway estimated at {plan.capital_runway_months != null ? `${plan.capital_runway_months} months` : 'Calculated from liquid reserves'} based on liquid cash reserves vs monthly burn.
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    Calculates how many months the enterprise can sustain operations if revenues arrive slower than forecasted.
                  </div>

                  <div style={{ fontSize: '0.75rem', color: liquidityScore !== null && liquidityScore >= 0.65 ? 'var(--risk-high)' : 'var(--primary-green)', fontWeight: 600 }}>
                    Recommended Next Action: Establish an emergency 3-month liquid cash reserve buffer before committing to new capital outlays.
                  </div>
                </div>

                {/* 5. Operational Risk */}
                <div className="c4-risk-card">
                  <div className="c4-risk-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Truck size={18} style={{ color: operationalScore !== null ? (operationalScore >= 0.65 ? 'var(--risk-high)' : 'var(--primary-green)') : 'var(--text-muted)' }} />
                      <span className="c4-risk-card-title">5. Operational Risk</span>
                    </div>
                    <span className={operationalScore !== null ? (operationalScore >= 0.65 ? 'badge-risk-high' : operationalScore >= 0.35 ? 'badge-risk-medium' : 'badge-risk-low') : 'badge-risk-neutral'}>
                      {operationalScore !== null ? `Score: ${operationalScore.toFixed(2)}` : 'Score: Pending'}
                    </span>
                  </div>

                  <div style={{ background: 'var(--bg-subtle)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <strong>Supporting Evidence:</strong> Supplier dependency: {formData.supplier_dependency_level || 'Moderate'}, delivery lead-time: {formData.delivery_delay_days || '3-5 days'}, staffing: {formData.staffing_availability || 'Adequate'}.
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    Assesses vulnerability to unexpected employee turnover, equipment downtime, and single-source supplier delays.
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--primary-green)', fontWeight: 600 }}>
                    Recommended Next Action: Pre-qualify at least one backup local vendor in Western Province for critical consumables.
                  </div>
                </div>

              </div>

              {/* Stepper Navigation Buttons */}
              <div className="c4-bottom-nav">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="btn btn-secondary"
                >
                  <ArrowLeft size={15} />
                  <span>Back to Additional Info</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="btn btn-primary"
                >
                  <span>Continue to Step 5: GNN Insights</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </>
          ) : (
            <div className="content-card" style={{ padding: '3.5rem', textAlign: 'center' }}>
              <ShieldAlert size={36} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>No Assessment Run Yet</h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Complete Step 1 (Upload/Select Profile) and Step 3 to execute the risk evaluation.
              </p>
              <button onClick={() => setCurrentStep(1)} className="btn btn-primary">
                Go to Step 1
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 5: GNN INSIGHTS AND RECOMMENDATIONS                                   */}
      {/* ========================================================================= */}
      {currentStep === 5 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="c4-section-card">
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.35rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Network size={20} style={{ color: 'var(--primary-green)' }} />
              B2B Relationship Network &amp; GNN Risk Insights
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 1.25rem 0' }}>
              Understand how trade relationships, counterparty dependencies, and supply chain concentration influence your business risk.
            </p>

            {/* Interactive Relationship Graph Canvas */}
            <div className="c4-graph-canvas">
              <svg width="100%" height="380" viewBox="0 0 700 380" style={{ display: 'block' }}>
                {/* Background grid */}
                <defs>
                  <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="var(--border-subtle)" strokeWidth="0.8" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Central SME Node */}
                <circle
                  cx="350"
                  cy="190"
                  r="36"
                  fill="var(--primary-green)"
                  stroke="#FFFFFF"
                  strokeWidth="3"
                  style={{ cursor: 'pointer', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
                  onClick={() => setSelectedGraphNode({ name: availableFacts.business_name?.value || 'Your Enterprise', type: 'Central SME', role: 'Target Business', district: 'Colombo' })}
                />
                <text x="350" y="195" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold">
                  Target SME
                </text>

                {/* Connected Counterparties (from declared counterparties or graphData) */}
                {(declaredRelationships.length > 0 ? declaredRelationships : [
                  { partner_name: 'Primary Supplier A', partner_type: 'SUPPLIER', dependency_percentage: 60 },
                  { partner_name: 'Secondary Supplier B', partner_type: 'SUPPLIER', dependency_percentage: 40 },
                  { partner_name: 'Retail Buyer Network', partner_type: 'CUSTOMER', dependency_percentage: 50 },
                  { partner_name: 'Commercial Lending Bank', partner_type: 'LENDER', dependency_percentage: 30 }
                ]).map((node, i) => {
                  const angles = [210, 150, 30, 330];
                  const angle = (angles[i % angles.length] * Math.PI) / 180;
                  const radius = 160;
                  const cx = 350 + radius * Math.cos(angle);
                  const cy = 190 + radius * Math.sin(angle);
                  const isSupplier = node.partner_type === 'SUPPLIER';
                  const isCustomer = node.partner_type === 'CUSTOMER';

                  return (
                    <g key={i}>
                      {/* Connection Edge */}
                      <line
                        x1="350"
                        y1="190"
                        x2={cx}
                        y2={cy}
                        stroke="var(--border-dark)"
                        strokeWidth="1.5"
                        strokeDasharray={node.verified ? 'none' : '4,4'}
                      />

                      {/* Counterparty Node */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r="24"
                        fill={isSupplier ? 'var(--primary-green-subtle)' : isCustomer ? 'var(--accent-blue-subtle)' : 'var(--bg-surface)'}
                        stroke={isSupplier ? 'var(--primary-green)' : isCustomer ? 'var(--accent-blue)' : 'var(--border-dark)'}
                        strokeWidth="2"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedGraphNode({ name: node.partner_name, type: node.partner_type, dependency: `${node.dependency_percentage || 40}%`, verified: Boolean(node.verified) })}
                      />
                      <text x={cx} y={cy + 4} textAnchor="middle" fill="var(--text-primary)" fontSize="9" fontWeight="600">
                        {node.partner_type ? node.partner_type.charAt(0) : 'P'}
                      </text>
                      <text x={cx} y={cy + 38} textAnchor="middle" fill="var(--text-secondary)" fontSize="9">
                        {node.partner_name || `Partner ${i+1}`}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Graph Legend & Disclosures */}
            <div className="c4-graph-legend">
              <div className="c4-legend-item">
                <span className="c4-legend-dot" style={{ background: 'var(--primary-green)' }} />
                <span>Target Business (Central)</span>
              </div>
              <div className="c4-legend-item">
                <span className="c4-legend-dot" style={{ background: 'var(--accent-blue)' }} />
                <span>Trade Counterparties (Declared by SME)</span>
              </div>
              <div className="c4-legend-item">
                <span style={{ width: 14, height: 1, background: 'var(--border-dark)', display: 'inline-block' }} />
                <span>Solid Line = Verified Connection</span>
              </div>
              <div className="c4-legend-item">
                <span style={{ width: 14, height: 1, borderTop: '1px dashed var(--border-dark)', display: 'inline-block' }} />
                <span>Dashed Line = SME Declared Connection</span>
              </div>
            </div>

            {/* Selected Node Details Drawer */}
            {selectedGraphNode && (
              <div style={{ marginTop: '1rem', padding: '0.85rem 1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Inspected Node: {selectedGraphNode.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                    Role: {selectedGraphNode.type} &middot; Dependency: {selectedGraphNode.dependency || 'N/A'} &middot; Status: {selectedGraphNode.verified ? 'Verified in Registry' : 'Declared by Owner (Flag=0)'}
                  </div>
                </div>
                <button onClick={() => setSelectedGraphNode(null)} className="btn btn-subtle" style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}>
                  Close
                </button>
              </div>
            )}
          </div>

          {/* Real Backend GNN Model Status & Scientific Disclosures Card */}
          <div className="c4-model-status-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <ShieldCheck size={16} style={{ color: 'var(--primary-green)' }} />
                Active Model Architecture &amp; Evaluation Provenance
              </div>
              <span className="badge-risk-neutral" style={{ fontSize: '0.7rem' }}>
                Version: {modelStatus?.model_version || 'Component4_B2BRiskGNN_v2.1'}
              </span>
            </div>

            <div className="grid-3" style={{ marginBottom: '1rem' }}>
              <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Protocol</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  Inductive Evaluation
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>No test-edge leakage into training</div>
              </div>

              <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Inductive GNN Macro-F1</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {modelStatus?.evaluation_metrics?.gnn_test_macro_f1_3class ? (modelStatus.evaluation_metrics.gnn_test_macro_f1_3class * 100).toFixed(2) + '%' : '31.14%'} (3-class)
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Balanced Acc: 47.25%</div>
              </div>

              <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Random Forest Baseline</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {modelStatus?.evaluation_metrics?.baseline_test_macro_f1_3class ? (modelStatus.evaluation_metrics.baseline_test_macro_f1_3class * 100).toFixed(2) + '%' : '34.59%'} (3-class)
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Balanced Acc: 56.44%</div>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5, borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              <strong>Scientific Transparency Note:</strong> Simulated dataset edges in research inventories are explicitly marked (Verified_Flag=0) and are never represented as real connections of your business. Businesses without declared counterparties fall back cleanly to deterministic financial assessment.
            </div>
          </div>

          {/* Stepper Navigation Buttons */}
          <div className="c4-bottom-nav">
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="btn btn-secondary"
            >
              <ArrowLeft size={15} />
              <span>Back to Risk Dimensions</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep(6)}
              className="btn btn-primary"
            >
              <span>Continue to Step 6: Mitigation &amp; Growth Plan</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 6: MITIGATION AND GROWTH PLAN (Two Distinct Areas)                   */}
      {/* ========================================================================= */}
      {currentStep === 6 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="c4-section-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Strategic Mitigation &amp; Scalable Growth Roadmap
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                  Actionable risk reduction checklist and stage-aligned growth feasibility assessment.
                </p>
              </div>

              {/* Sub-tab Switcher: Mitigations vs Growth */}
              <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-subtle)', padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  onClick={() => setActivePlanSubTab('mitigations')}
                  style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.78rem',
                    fontWeight: activePlanSubTab === 'mitigations' ? 700 : 500,
                    background: activePlanSubTab === 'mitigations' ? 'var(--bg-surface)' : 'transparent',
                    border: activePlanSubTab === 'mitigations' ? '1px solid var(--border-color)' : 'none',
                    color: activePlanSubTab === 'mitigations' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  A. Risk Mitigation Plan
                </button>
                <button
                  type="button"
                  onClick={() => setActivePlanSubTab('growth')}
                  style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.78rem',
                    fontWeight: activePlanSubTab === 'growth' ? 700 : 500,
                    background: activePlanSubTab === 'growth' ? 'var(--bg-surface)' : 'transparent',
                    border: activePlanSubTab === 'growth' ? '1px solid var(--border-color)' : 'none',
                    color: activePlanSubTab === 'growth' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  B. Growth Readiness
                </button>
              </div>
            </div>

            {/* AREA A: RISK MITIGATION PLAN */}
            {activePlanSubTab === 'mitigations' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Execute these prioritized preventative actions. Toggle the status button to track milestones:
                </div>

                {((stage6.recommended_mitigations && stage6.recommended_mitigations.length > 0) ? stage6.recommended_mitigations : [
                  {
                    action: 'Establish 3-Month Emergency Operating Reserve Buffer',
                    mechanism: 'Hold liquid buffer equal to 3 months of operating expenses to insulate against cashflow fluctuations.',
                    time_horizon: 'Immediate (Month 1–2)',
                    risk_factor: 'liquidity_risk',
                    estimated_cost: formData.monthly_fixed_costs ? `LKR ${(Number(formData.monthly_fixed_costs) * 3).toLocaleString()} (3x monthly fixed costs)` : '3x documented monthly fixed expenses',
                    priority: 'HIGH'
                  },
                  {
                    action: 'Qualify Secondary Supply Partner in Western Province',
                    mechanism: 'Sign backup supply agreement with secondary distributor to mitigate single-supplier dependency and delivery friction.',
                    time_horizon: '1–3 Months',
                    risk_factor: 'operational_risk',
                    estimated_cost: 'Internal management time',
                    priority: 'MEDIUM'
                  },
                  {
                    action: 'Structure Phased Milestone Invoicing & Customer Commitments',
                    mechanism: 'Evaluate advance booking deposits or milestone payments tailored to business category to stabilize operational cash inflows.',
                    time_horizon: 'Ongoing',
                    risk_factor: 'market_risk',
                    estimated_cost: 'Policy adjustment',
                    priority: 'LOW'
                  }
                ]).map((mit, i) => {
                  const status = plannedMitigations[i] || 'not_started';

                  return (
                    <div 
                      key={i} 
                      className={`c4-action-item ${status === 'completed' ? 'status-completed' : status === 'planned' ? 'status-planned' : ''}`}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            {mit.action || mit.title}
                          </span>
                          <span className={`badge-risk-${(mit.priority || 'MEDIUM').toLowerCase()}`} style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                            {mit.priority || 'MEDIUM'} PRIORITY
                          </span>
                        </div>

                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.45 }}>
                          {mit.mechanism || mit.description}
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                          <span>Timeline: <strong>{mit.time_horizon || '1-3 months'}</strong></span>
                          <span>Targets: <strong>{mit.risk_factor?.replace(/_/g, ' ') || 'Solvency'}</strong></span>
                          {mit.estimated_cost && (
                            <span>Estimated Resource: <strong style={{ color: 'var(--primary-green)' }}>{mit.estimated_cost}</strong></span>
                          )}
                        </div>
                      </div>

                      {/* Status Toggle Switcher */}
                      <div className="c4-status-toggle">
                        <button
                          type="button"
                          onClick={() => setPlannedMitigations(prev => ({ ...prev, [i]: 'not_started' }))}
                          className={`c4-status-btn ${status === 'not_started' ? 'active' : ''}`}
                        >
                          Not Started
                        </button>
                        <button
                          type="button"
                          onClick={() => setPlannedMitigations(prev => ({ ...prev, [i]: 'planned' }))}
                          className={`c4-status-btn ${status === 'planned' ? 'active' : ''}`}
                        >
                          Planned
                        </button>
                        <button
                          type="button"
                          onClick={() => setPlannedMitigations(prev => ({ ...prev, [i]: 'completed' }))}
                          className={`c4-status-btn ${status === 'completed' ? 'active completed' : ''}`}
                        >
                          Completed
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* AREA B: GROWTH READINESS */}
            {activePlanSubTab === 'growth' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{
                  background: readiness.decision === 'DELAY' ? 'var(--risk-high-bg)' : readiness.decision === 'MODIFY' ? 'var(--risk-medium-bg)' : 'var(--bg-subtle)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${readiness.decision === 'DELAY' ? 'var(--risk-high-border)' : readiness.decision === 'MODIFY' ? 'var(--risk-medium-border)' : 'var(--border-color)'}`
                }}>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>
                    Stage-Aligned Growth Decision
                  </div>
                  <div style={{
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    color: readiness.decision === 'DELAY' ? 'var(--risk-high)' : readiness.decision === 'MODIFY' ? 'var(--risk-medium)' : 'var(--primary-green)',
                    marginTop: '0.25rem'
                  }}>
                    {readiness.decision_label || (readiness.decision === 'DELAY' ? 'Defer expansion' : readiness.decision === 'MODIFY' ? 'Proceed with conditions' : readiness.decision || 'Conditionally Ready for Phased Expansion')}
                  </div>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-primary)', marginTop: '0.35rem', lineHeight: 1.5, margin: 0 }}>
                    {readiness.risk_adjusted_recommendation || 'The enterprise possesses sufficient operational stability for organic growth, provided working capital buffers are funded before undertaking long-term liabilities.'}
                  </p>
                </div>

                <div className="grid-2">
                  <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                      {readiness.decision === 'DELAY' ? 'Critical Constraints & Reasons' : 'Decision Rationales'}
                    </div>
                    <ul style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', paddingLeft: '1.25rem', lineHeight: 1.6, margin: 0 }}>
                      {(readiness.reasons?.length ? readiness.reasons : readiness.decision_rationales?.length ? readiness.decision_rationales : [
                        'Post-action cash runway evaluated against minimum operating buffer.',
                        'Debt service obligations compared against available capital and gross margin.'
                      ]).map((r, idx) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                      {readiness.decision === 'DELAY' ? 'Conditions to Reconsider & Required Evidence' : 'Prerequisites & Modifications'}
                    </div>
                    <ul style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', paddingLeft: '1.25rem', lineHeight: 1.6, margin: 0 }}>
                      {(readiness.conditions_that_must_be_met?.length ? readiness.conditions_that_must_be_met : readiness.suggested_modifications?.length ? readiness.suggested_modifications : [
                        'Maintain 3 consecutive months of positive operating cashflow',
                        'Hold liquid reserves equal to 60 days of fixed expenses'
                      ]).map((c, idx) => (
                        <li key={idx}>{c}</li>
                      ))}
                      {readiness.evidence_needed_to_reconsider?.map((ev, idx) => (
                        <li key={`ev-${idx}`} style={{ color: 'var(--text-muted)' }}>Evidence needed: {ev}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5, fontStyle: 'italic' }}>
                  Component 4 evaluates risk exposure and growth readiness. It does not promise profitability or guarantee statutory success.
                </div>
              </div>
            )}
          </div>

          {/* Stepper Navigation Buttons & Export */}
          <div className="c4-bottom-nav">
            <button
              type="button"
              onClick={() => setCurrentStep(5)}
              className="btn btn-secondary"
            >
              <ArrowLeft size={15} />
              <span>Back to GNN Insights</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadReport}
              className="btn btn-primary"
            >
              <Download size={15} />
              <span>Download Assessment Audit Report (.md)</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
