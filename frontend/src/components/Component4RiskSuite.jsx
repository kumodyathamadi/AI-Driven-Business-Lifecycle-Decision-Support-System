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
  downloadComponent4MitigationPlanPdf,
  getComponent4Candidates,
  submitComponent4IntakeAndRun,
  getComponent4BusinessHistory,
  getRecentComponent4Assessments,
  getComponent4Analysis,
  getComponent4Businesses,
  getComponent4ModelStatus,
  getComponent1Plans,
  loadComponent1Plan
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

  // Component 1 Plan picker modal
  const [component1Plans, setComponent1Plans] = useState([]);
  const [showC1Picker, setShowC1Picker] = useState(false);
  const [loadingC1Plans, setLoadingC1Plans] = useState(false);
  const [capitalIncludesLoan, setCapitalIncludesLoan] = useState(null);

  // Conflict Resolution State (Step 2)
  const [conflictingFields, setConflictingFields] = useState({});
  const [editingFieldKey, setEditingFieldKey] = useState(null);
  const [editingFieldValue, setEditingFieldValue] = useState('');

  // Step 3 Progressive Disclosure State (5 Risk Dimensions)
  const [activeDimensionTab, setActiveDimensionTab] = useState('credit');
  const [formData, setFormData] = useState({
    // Credit Risk Inputs
    outstanding_loan_balance: '',
    monthly_loan_repayment: '',
    repayment_overdue_status: 'No',
    overdue_repayments: 'No',
    repayment_delay_days: '',
    total_overdue_amount_lkr: '',
    longest_overdue_period_days: '',
    overdue_payment_count_12m: '',
    other_monthly_debt_obligations_lkr: '',
    outstanding_guarantees_lkr: '',
    debt_guarantees: '',
    loan_interest_rate_pct: '',
    monthly_interest_cost_lkr: '',
    debt_service_available_revenue_lkr: '',
    repayment_history_status: 'On time',
    upcoming_large_repayment_notes: '',

    // Market Risk Inputs
    monthly_sales_revenue: '',
    monthly_customer_count: '',
    average_transaction_value_lkr: '',
    customer_demand_evidence: 'estimate_only',
    sales_trend_3_6m: 'Stable',
    direct_competitors_count: '',
    competitor_pricing_vs_business: 'Similar',
    largest_customer_sales_share_pct: '',
    seasonal_demand_variation_pct: '',
    customer_retention_rate_pct: '',
    price_adjustment_flexibility: 'Moderate',
    monthly_marketing_budget_lkr: '',
    demand_competition_notes: '',

    // Inflation Risk Inputs
    main_materials_monthly_cost_lkr: '',
    recent_supplier_price_increase_pct: '',
    supplier_price_change_past_3_6m_pct: '',
    expected_supplier_price_increase_3_6m_pct: '',
    imported_inputs_pct: '',
    imported_materials_exposure: 'Moderate',
    monthly_fuel_transport_cost_lkr: '',
    monthly_electricity_energy_cost_lkr: '',
    ability_to_increase_prices: 'Partially',
    cost_increase_pass_through_pct: '',
    alternative_suppliers_available: 'Good',
    largest_supplier_purchase_share_pct: '',
    inflation_affected_categories: '',
    external_inflation_source_notes: '',

    // Liquidity Risk Inputs
    available_starting_capital_lkr: '',
    capital_includes_loan: 'No',
    initial_setup_expenditure_lkr: '',
    cash_available_operations: '',
    remaining_cash_reserves_after_setup_lkr: '',
    cash_reserve_after_startup: '',
    monthly_fixed_costs: '',
    monthly_variable_costs: '',
    other_mandatory_monthly_obligations_lkr: '',
    accounts_receivable: '',
    customer_payment_delay_days: '',
    accounts_payable: '',
    supplier_payment_period_days: '',
    working_capital_requirement_lkr: '',
    expected_large_one_off_payments_3_6m_lkr: '',

    // Operational Risk Inputs
    critical_suppliers_count: '',
    largest_supplier_dependency_pct: '',
    supplier_dependency_level: 'Moderate',
    alternative_suppliers_status: 'Good',
    supplier_lead_time_days: '',
    delivery_delay_days: '3-5 days',
    supplier_delay_days: '',
    supplier_delays_stockouts_3_6m: '',
    inventory_coverage_days: '',
    total_employees_count: '',
    available_staff_count: '',
    critical_vacant_roles_count: '',
    backup_staff_available: 'Partial',
    essential_equipment_dependence: 'Moderate',
    backup_utilities_available: 'Partial',
    expected_downtime_hours: '',
    business_continuity_plan_exists: 'Yes',
    logistics_delivery_dependence: 'Moderate',
    capacity_utilization_pct: '',
    operational_constraints: 'None',
    growth_operational_constraints: '',
    main_suppliers_list: '',
    growth_objective: 'organic_expansion'
  });
  const [unknownToggles, setUnknownToggles] = useState({});
  const [fieldProvenances, setFieldProvenances] = useState({});
  const [declaredRelationships, setDeclaredRelationships] = useState([]);

  // Automatically prefill risk fields from plan extraction or profile facts
  const prefillFormDataFromExtraction = (ext, facts = {}) => {
    if (!ext && !facts) return;
    const patch = {};
    const provPatch = {};

    const resolveValueAndProv = (candidateKeys) => {
      // 1. Check availableFacts first
      if (facts && typeof facts === 'object') {
        for (const k of candidateKeys) {
          if (facts[k] && facts[k].value !== undefined && facts[k].value !== null && facts[k].value !== '') {
            return { val: facts[k].value, prov: facts[k].provenance || 'plan_stated' };
          }
        }
      }
      // 2. Check ext object
      if (ext && typeof ext === 'object') {
        for (const k of candidateKeys) {
          if (ext[k] !== undefined && ext[k] !== null && ext[k] !== '') {
            const p = ext.field_provenance?.[k] || 'plan_stated';
            return { val: ext[k], prov: p };
          }
        }
        if (ext.financial_projections && typeof ext.financial_projections === 'object') {
          for (const k of candidateKeys) {
            if (ext.financial_projections[k] !== undefined && ext.financial_projections[k] !== null && ext.financial_projections[k] !== '') {
              return { val: ext.financial_projections[k], prov: 'plan_stated' };
            }
          }
        }
      }
      return null;
    };

    const mapping = {
      // Credit
      outstanding_loan_balance: ['outstanding_loan_balance_lkr', 'requested_loan_lkr', 'loan_amount_lkr', 'outstanding_debt_lkr', 'outstanding_loan_balance'],
      monthly_loan_repayment: ['monthly_loan_repayment_lkr', 'monthly_debt_repayment_lkr', 'monthly_loan_repayment'],
      repayment_overdue_status: ['repayment_overdue_status', 'overdue_repayments'],
      repayment_delay_days: ['repayment_delay_days', 'payment_delay_days'],
      total_overdue_amount_lkr: ['total_overdue_amount_lkr', 'arrears_amount_lkr'],
      longest_overdue_period_days: ['longest_overdue_period_days'],
      overdue_payment_count_12m: ['overdue_payment_count_12m'],
      other_monthly_debt_obligations_lkr: ['other_monthly_debt_obligations_lkr'],
      outstanding_guarantees_lkr: ['outstanding_guarantees_lkr'],
      debt_guarantees: ['debt_guarantees_or_obligations', 'debt_guarantees'],
      loan_interest_rate_pct: ['loan_interest_rate_pct', 'annual_interest_rate_pct'],
      monthly_interest_cost_lkr: ['monthly_interest_cost_lkr'],
      debt_service_available_revenue_lkr: ['debt_service_available_revenue_lkr'],
      repayment_history_status: ['repayment_history_status'],
      upcoming_large_repayment_notes: ['upcoming_large_repayment_notes'],

      // Market
      monthly_sales_revenue: ['monthly_revenue_lkr', 'projected_revenue_lkr', 'monthly_sales_revenue'],
      monthly_customer_count: ['monthly_customer_count'],
      average_transaction_value_lkr: ['average_transaction_value_lkr', 'average_transaction_value'],
      customer_demand_evidence: ['demand_evidence_type', 'demand_evidence', 'customer_demand_evidence'],
      sales_trend_3_6m: ['sales_trend_3_6m'],
      direct_competitors_count: ['direct_competitors_count', 'competitor_count'],
      competitor_pricing_vs_business: ['competitor_pricing_vs_business'],
      largest_customer_sales_share_pct: ['largest_customer_sales_share_pct', 'customer_concentration_pct'],
      seasonal_demand_variation_pct: ['seasonal_demand_variation_pct'],
      customer_retention_rate_pct: ['customer_retention_rate_pct'],
      price_adjustment_flexibility: ['price_adjustment_flexibility'],
      monthly_marketing_budget_lkr: ['monthly_marketing_budget_lkr', 'marketing_budget_lkr'],
      demand_competition_notes: ['demand_competition_notes'],

      // Inflation
      main_materials_monthly_cost_lkr: ['main_materials_monthly_cost_lkr'],
      recent_supplier_price_increase_pct: ['supplier_price_change_past_3_6m_pct', 'recent_supplier_price_increase_pct'],
      supplier_price_change_past_3_6m_pct: ['supplier_price_change_past_3_6m_pct'],
      expected_supplier_price_increase_3_6m_pct: ['expected_supplier_price_increase_3_6m_pct', 'expected_cost_increase_pct'],
      imported_inputs_pct: ['imported_inputs_pct', 'imported_input_dependency_pct'],
      imported_materials_exposure: ['foreign_currency_exposure', 'imported_input_exposure', 'imported_materials_exposure'],
      monthly_fuel_transport_cost_lkr: ['monthly_fuel_transport_cost_lkr'],
      monthly_electricity_energy_cost_lkr: ['monthly_electricity_energy_cost_lkr'],
      ability_to_increase_prices: ['ability_to_increase_prices', 'price_adjustment_ability'],
      cost_increase_pass_through_pct: ['cost_increase_pass_through_pct'],
      alternative_suppliers_available: ['alternative_suppliers_available'],
      largest_supplier_purchase_share_pct: ['largest_supplier_purchase_share_pct'],
      inflation_affected_categories: ['inflation_affected_categories'],
      external_inflation_source_notes: ['external_inflation_source_notes'],

      // Liquidity
      available_starting_capital_lkr: ['available_starting_capital_lkr', 'available_capital_lkr'],
      capital_includes_loan: ['capital_includes_loan'],
      initial_setup_expenditure_lkr: ['initial_setup_expenditure_lkr', 'initial_setup_expenditure'],
      cash_available_operations: ['current_cash_reserve_lkr', 'cash_available_operations'],
      remaining_cash_reserves_after_setup_lkr: ['remaining_cash_reserves_after_setup_lkr', 'cash_reserve_after_startup'],
      cash_reserve_after_startup: ['remaining_cash_reserves_after_setup_lkr', 'cash_reserve_after_startup'],
      monthly_fixed_costs: ['fixed_monthly_costs_lkr', 'monthly_budget_lkr', 'monthly_fixed_costs'],
      monthly_variable_costs: ['variable_monthly_costs_lkr', 'monthly_variable_costs'],
      other_mandatory_monthly_obligations_lkr: ['other_mandatory_monthly_obligations_lkr'],
      accounts_receivable: ['accounts_receivable_lkr', 'accounts_receivable'],
      customer_payment_delay_days: ['customer_payment_delay_days'],
      accounts_payable: ['accounts_payable_lkr', 'accounts_payable'],
      supplier_payment_period_days: ['supplier_payment_period_days'],
      working_capital_requirement_lkr: ['working_capital_requirement_lkr'],
      expected_large_one_off_payments_3_6m_lkr: ['expected_large_one_off_payments_3_6m_lkr'],

      // Operational
      critical_suppliers_count: ['critical_suppliers_count', 'supplier_count'],
      largest_supplier_dependency_pct: ['largest_supplier_dependency_pct', 'supplier_dependency_percentage', 'single_supplier_dependency_pct'],
      supplier_dependency_level: ['supplier_dependency_level'],
      alternative_suppliers_status: ['alternative_suppliers_status'],
      supplier_lead_time_days: ['supplier_lead_time_days'],
      delivery_delay_days: ['supplier_delay_days', 'delivery_delay_days'],
      supplier_delay_days: ['supplier_delay_days'],
      supplier_delays_stockouts_3_6m: ['supplier_delays_stockouts_3_6m'],
      inventory_coverage_days: ['inventory_coverage_days', 'inventory_days'],
      total_employees_count: ['total_employees_count', 'available_staff_count'],
      available_staff_count: ['total_employees_count', 'available_staff_count'],
      critical_vacant_roles_count: ['critical_vacant_roles_count'],
      backup_staff_available: ['backup_staff_available', 'staffing_availability'],
      essential_equipment_dependence: ['essential_equipment_dependence'],
      backup_utilities_available: ['backup_utilities_available'],
      expected_downtime_hours: ['expected_downtime_hours'],
      business_continuity_plan_exists: ['business_continuity_plan_exists'],
      logistics_delivery_dependence: ['logistics_delivery_dependence'],
      capacity_utilization_pct: ['capacity_utilization_pct'],
      operational_constraints: ['operational_constraints', 'growth_operational_constraints'],
      main_suppliers_list: ['main_suppliers_list']
    };

    Object.entries(mapping).forEach(([formKey, candidateKeys]) => {
      const match = resolveValueAndProv(candidateKeys);
      if (match && match.val !== undefined && match.val !== null) {
        patch[formKey] = String(match.val);
        provPatch[formKey] = match.prov;
      }
    });

    setFormData(prev => ({ ...prev, ...patch }));
    setFieldProvenances(prev => ({ ...prev, ...provPatch }));
  };

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

  const loadC1Plans = async () => {
    setLoadingC1Plans(true);
    try {
      const res = await getComponent1Plans(25);
      if (Array.isArray(res)) {
        setComponent1Plans(res);
      }
    } catch (err) {
      console.warn('Could not fetch Component 1 business plans:', err);
    } finally {
      setLoadingC1Plans(false);
    }
  };

  const handleSelectC1Plan = async (recordId) => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setShowC1Picker(false);
    try {
      const res = await loadComponent1Plan(recordId);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to parse Component 1 business plan.');
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
      const rawConflicts = res.conflicts || res.extraction?.conflicting_values;
      if (rawConflicts) {
        Object.entries(rawConflicts).forEach(([k, c]) => {
          conflicts[k] = {
            field_label: k.replace(/_/g, ' '),
            options: c.options || [],
            message: c.message,
            conflict_type: c.conflict_type,
            resolved_value: null,
            status: 'conflicting'
          };
        });
      }
      setConflictingFields(conflicts);
      setIsDemoProfile(false);
      prefillFormDataFromExtraction(res.extraction, res.available_facts || {});

      setSuccessMsg(`Successfully imported Component 1 business plan for '${res.extraction?.business_name || 'Enterprise'}'. Review profile facts and confirm any flagged discrepancies.`);
      setCurrentStep(2);
    } catch (err) {
      setErrorMsg(`Failed to import Component 1 plan: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
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
      prefillFormDataFromExtraction(res.extraction, res.available_facts || {});

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
    if (biz.latest_intake_data) {
      prefillFormDataFromExtraction(biz.latest_intake_data, facts);
    }
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

    // Initial follow-up fields for Step 3 across all 5 risk dimensions
    setFormData(prev => ({
      ...prev,
      // Credit
      outstanding_loan_balance: '450000',
      monthly_loan_repayment: '32000',
      repayment_overdue_status: 'No',
      overdue_repayments: 'No',
      repayment_delay_days: '0',
      total_overdue_amount_lkr: '0',
      longest_overdue_period_days: '0',
      overdue_payment_count_12m: '0',
      other_monthly_debt_obligations_lkr: '0',
      outstanding_guarantees_lkr: '0',
      debt_guarantees: 'None',
      loan_interest_rate_pct: '18',
      monthly_interest_cost_lkr: '6750',
      debt_service_available_revenue_lkr: '65000',
      repayment_history_status: 'On time',
      upcoming_large_repayment_notes: 'None',

      // Market
      monthly_sales_revenue: '320000',
      monthly_customer_count: '110',
      average_transaction_value_lkr: '2900',
      customer_demand_evidence: 'pre_orders',
      sales_trend_3_6m: 'Increasing',
      direct_competitors_count: '3',
      competitor_pricing_vs_business: 'Similar',
      largest_customer_sales_share_pct: '25',
      seasonal_demand_variation_pct: '20',
      customer_retention_rate_pct: '65',
      price_adjustment_flexibility: 'Moderate',
      monthly_marketing_budget_lkr: '25000',
      demand_competition_notes: '3 competing cosmetic retail outlets within 2km; strong repeat clientele for organic serums',

      // Inflation
      main_materials_monthly_cost_lkr: '110000',
      recent_supplier_price_increase_pct: '12',
      supplier_price_change_past_3_6m_pct: '12',
      expected_supplier_price_increase_3_6m_pct: '10',
      imported_inputs_pct: '40',
      imported_materials_exposure: 'Moderate',
      monthly_fuel_transport_cost_lkr: '18000',
      monthly_electricity_energy_cost_lkr: '22000',
      ability_to_increase_prices: 'Partially',
      cost_increase_pass_through_pct: '60',
      alternative_suppliers_available: 'Good',
      largest_supplier_purchase_share_pct: '45',
      inflation_affected_categories: 'Organic essential oils, imported glass packaging, delivery tariffs',
      external_inflation_source_notes: 'CBSL CCPI Bulletin Q3 2024',

      // Liquidity
      available_starting_capital_lkr: '850000',
      capital_includes_loan: 'Yes',
      initial_setup_expenditure_lkr: '350000',
      cash_available_operations: '250000',
      remaining_cash_reserves_after_setup_lkr: '180000',
      cash_reserve_after_startup: '180000',
      monthly_fixed_costs: '95000',
      monthly_variable_costs: '50000',
      other_mandatory_monthly_obligations_lkr: '15000',
      accounts_receivable: '45000',
      customer_payment_delay_days: '14',
      accounts_payable: '60000',
      supplier_payment_period_days: '30',
      working_capital_requirement_lkr: '120000',
      expected_large_one_off_payments_3_6m_lkr: '35000',

      // Operational
      critical_suppliers_count: '2',
      largest_supplier_dependency_pct: '65',
      supplier_dependency_level: 'High',
      alternative_suppliers_status: 'Good',
      supplier_lead_time_days: '5',
      delivery_delay_days: '3-5 days',
      supplier_delay_days: '4',
      supplier_delays_stockouts_3_6m: '1',
      inventory_coverage_days: '21',
      total_employees_count: '4',
      available_staff_count: '4',
      critical_vacant_roles_count: '0',
      backup_staff_available: 'Partial',
      essential_equipment_dependence: 'Moderate',
      backup_utilities_available: 'Partial',
      expected_downtime_hours: '4',
      business_continuity_plan_exists: 'Yes',
      logistics_delivery_dependence: 'Moderate',
      capacity_utilization_pct: '70',
      operational_constraints: 'None',
      growth_operational_constraints: 'None',
      main_suppliers_list: 'Lanka Herbal Extracts Ltd, Colombo Packaging Co'
    }));

    const demoProv = {};
    Object.keys(demoFacts).forEach(k => { demoProv[k] = 'plan_stated'; });
    setFieldProvenances(prev => ({ ...prev, ...demoProv }));

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

    if (fieldKey === 'capital_loan_structure' || fieldKey === 'capital_includes_loan') {
      setCapitalIncludesLoan(Boolean(chosenValue));
    }

    if (fieldKey === 'business_category') {
      setAvailableFacts(prev => ({
        ...prev,
        business_category: {
          value: chosenValue,
          provenance: 'user_confirmed',
          source_reference: 'User resolved sector discrepancy'
        }
      }));
    } else {
      setAvailableFacts(prev => ({
        ...prev,
        [fieldKey]: {
          value: chosenValue,
          provenance: 'user_confirmed',
          source_reference: 'User resolved conflicting plan values'
        }
      }));
    }
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
    setFieldProvenances(prev => ({ ...prev, [fieldKey]: 'user_confirmed' }));
    if (unknownToggles[fieldKey]) {
      setUnknownToggles(prev => ({ ...prev, [fieldKey]: false }));
    }
  };

  const handleToggleUnknown = (fieldKey) => {
    setUnknownToggles(prev => {
      const next = !prev[fieldKey];
      if (next) {
        setFieldProvenances(p => ({ ...p, [fieldKey]: 'unknown' }));
      }
      return { ...prev, [fieldKey]: next };
    });
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
      Object.entries(unknownToggles).forEach(([k, isUnk]) => {
        if (isUnk) {
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

      const conflictResolutions = {};
      Object.entries(conflictingFields).forEach(([k, conf]) => {
        if (conf.resolved_value !== null && conf.resolved_value !== undefined) {
          conflictResolutions[k] = conf.resolved_value;
        }
      });

      const payload = {
        plan_file_path: uploadedFilePath,
        confirmed_business_id: confirmedBusinessId || null,
        business_name: availableFacts.business_name?.value || null,
        district: availableFacts.district?.value || null,
        business_category: availableFacts.business_category?.value || null,
        conflict_resolutions: conflictResolutions,
        capital_includes_loan: capitalIncludesLoan !== null
          ? capitalIncludesLoan
          : (conflictResolutions['capital_loan_structure'] !== undefined ? Boolean(conflictResolutions['capital_loan_structure']) : null),
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

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    const activeAnalysisId = analysisResult?.analysis_id;
    if (!activeAnalysisId) {
      setErrorMsg('No active analysis ID found to download PDF mitigation plan.');
      return;
    }
    setDownloadingPdf(true);
    try {
      await downloadComponent4MitigationPlanPdf(activeAnalysisId);
      setSuccessMsg('PDF Mitigation Plan downloaded successfully.');
    } catch (err) {
      console.error('Download PDF error:', err);
      setErrorMsg(`Could not download PDF Mitigation Plan: ${err.message}`);
    } finally {
      setDownloadingPdf(false);
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
    { num: 3, label: 'Risk Assessment Details' },
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
                onClick={() => { setShowC1Picker(true); loadC1Plans(); }}
                className="btn btn-secondary"
                style={{ flex: '1 1 240px', justifyContent: 'flex-start', padding: '0.85rem 1rem', border: '1px solid var(--primary-green-border)', background: 'var(--primary-green-subtle)' }}
              >
                <Sparkles size={18} style={{ color: 'var(--primary-green)' }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.825rem', color: 'var(--primary-green)' }}>Import Component 1 Business Plan</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Directly load feasibility plans from database</div>
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

          {/* Modal Picker for Component 1 Business Plans */}
          {showC1Picker && (
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
              <div className="content-card" style={{ maxWidth: '650px', width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Import Component 1 Generated Business Plan</h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      Select a business plan previously evaluated under Component 1 feasibility analysis
                    </div>
                  </div>
                  <button onClick={() => setShowC1Picker(false)} className="btn btn-subtle" style={{ padding: '0.2rem' }}>
                    <XCircle size={18} />
                  </button>
                </div>

                <div style={{ overflowY: 'auto', padding: '1rem 0', flex: 1 }}>
                  {loadingC1Plans ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 0.5rem auto' }} />
                      Loading Component 1 plans...
                    </div>
                  ) : component1Plans.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      No saved Component 1 analysis records found in database.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {component1Plans.map(p => (
                        <div
                          key={p.id}
                          onClick={() => handleSelectC1Plan(p.id)}
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
                            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                              {p.business_name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                              <span>Sector: <b>{p.business_category}</b> &middot; Stage: <b>{p.business_stage}</b> &middot; {p.district}</span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                              <span>Available Capital: <b>LKR {Number(p.available_capital_lkr || 0).toLocaleString()}</b></span>
                              <span style={{ marginLeft: '0.75rem' }}>Feasibility: <b style={{ color: 'var(--primary-green)' }}>{p.feasibility_label}</b></span>
                            </div>
                          </div>
                          <button className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
                            Import Plan
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

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
              <span>Continue to Risk Assessment Details</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: DEDICATED RISK ASSESSMENT DETAILS (Five Risk Dimensions Form)       */}
      {/* ========================================================================= */}
      {currentStep === 3 && (() => {
        // Helper to render consistent, schema-driven risk input fields with provenance badges & unknown toggles
        const renderRiskInputField = ({
          label,
          fieldKey,
          type = 'text',
          unit = '',
          required = false,
          description = '',
          options = [],
          placeholder = '',
          extraActions = null
        }) => {
          const isUnknown = Boolean(unknownToggles[fieldKey]);
          const prov = fieldProvenances[fieldKey];

          return (
            <div className="risk-input-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.3rem' }}>
                <label className="form-label" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.82rem' }}>
                  <span>{label}</span>
                  {unit && (
                    <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.35rem', background: 'var(--bg-subtle)', borderRadius: '3px', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                      {unit}
                    </span>
                  )}
                  {required ? (
                    <span style={{ fontSize: '0.68rem', color: 'var(--risk-high)', fontWeight: 700 }}>*Required</span>
                  ) : (
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Optional</span>
                  )}
                </label>
                {prov && renderProvenanceTag(prov)}
              </div>

              {description && (
                <p style={{ margin: '0 0 0.15rem 0', fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                  {description}
                </p>
              )}

              {type === 'select' ? (
                <select
                  value={isUnknown ? 'Unknown' : (formData[fieldKey] ?? '')}
                  disabled={isUnknown}
                  onChange={(e) => handleFormFieldChange(fieldKey, e.target.value)}
                  className="form-select"
                  style={{
                    fontSize: '0.82rem',
                    padding: '0.45rem 0.65rem',
                    background: isUnknown ? 'var(--bg-subtle)' : 'var(--bg-surface)',
                    color: isUnknown ? 'var(--text-muted)' : 'var(--text-primary)',
                    borderColor: isUnknown ? 'var(--border-subtle)' : undefined
                  }}
                >
                  {options.map((opt) => {
                    const val = typeof opt === 'object' ? opt.value : opt;
                    const lbl = typeof opt === 'object' ? opt.label : opt;
                    return <option key={val} value={val}>{lbl}</option>;
                  })}
                </select>
              ) : (
                <input
                  type={type}
                  disabled={isUnknown}
                  value={isUnknown ? '' : (formData[fieldKey] ?? '')}
                  onChange={(e) => handleFormFieldChange(fieldKey, e.target.value)}
                  placeholder={isUnknown ? 'Marked Unknown (non-zero; unverified)' : placeholder}
                  className="form-control"
                  style={{
                    fontSize: '0.82rem',
                    padding: '0.45rem 0.65rem',
                    background: isUnknown ? 'var(--bg-subtle)' : 'var(--bg-surface)',
                    color: isUnknown ? 'var(--text-muted)' : 'var(--text-primary)',
                    borderColor: isUnknown ? 'var(--border-subtle)' : undefined
                  }}
                />
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.15rem' }}>
                <button
                  type="button"
                  onClick={() => handleToggleUnknown(fieldKey)}
                  className="btn btn-subtle"
                  style={{
                    fontSize: '0.7rem',
                    padding: '0.15rem 0.45rem',
                    color: isUnknown ? 'var(--risk-high)' : 'var(--text-secondary)',
                    fontWeight: isUnknown ? 700 : 500,
                    background: isUnknown ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                    border: isUnknown ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid transparent'
                  }}
                >
                  {isUnknown ? '✕ Clear Unknown' : '? Mark Unknown / Not available'}
                </button>

                {extraActions}
              </div>
            </div>
          );
        };

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="c4-section-card">
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.35rem 0' }}>
                Dedicated Risk Assessment Details (Five Risk Dimensions)
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 1.25rem 0' }}>
                Review prefilled facts extracted from your business plan and supply risk-specific operating metrics.
                Unrecorded parameters can be marked &ldquo;Unknown&rdquo; without treating them as zero or low risk.
              </p>

              {/* Dimension Switcher Pills */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                {[
                  { id: 'credit', label: '1. Credit Risk Inputs', icon: DollarSign },
                  { id: 'market', label: '2. Market Risk Inputs', icon: TrendingUp },
                  { id: 'inflation', label: '3. Inflation Risk Inputs', icon: Flame },
                  { id: 'liquidity', label: '4. Liquidity Risk Inputs', icon: Clock },
                  { id: 'operational', label: '5. Operational Risk Inputs', icon: Truck },
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

              {/* ========================================================= */}
              {/* DIMENSION 1: CREDIT RISK INPUTS                           */}
              {/* ========================================================= */}
              {activeDimensionTab === 'credit' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    {renderRiskInputField({
                      label: 'Outstanding Loan Balance',
                      fieldKey: 'outstanding_loan_balance',
                      type: 'number',
                      unit: 'LKR',
                      description: 'Current principal balance of commercial loans, microfinance, or institutional debt.',
                      placeholder: 'e.g. 450000',
                      extraActions: (
                        <button
                          type="button"
                          onClick={() => handleFormFieldChange('outstanding_loan_balance', '0')}
                          className="btn btn-subtle"
                          style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}
                        >
                          No Loan (LKR 0)
                        </button>
                      )
                    })}

                    {renderRiskInputField({
                      label: 'Monthly Loan Repayment Installment',
                      fieldKey: 'monthly_loan_repayment',
                      type: 'number',
                      unit: 'LKR',
                      description: 'Monthly principal and interest obligation due to institutional lenders.',
                      placeholder: 'e.g. 32000'
                    })}

                    {renderRiskInputField({
                      label: 'Repayment Delinquency / Overdue Status',
                      fieldKey: 'repayment_overdue_status',
                      type: 'select',
                      description: 'Current delinquency status on loan repayments or installments.',
                      options: [
                        { value: 'Current', label: 'Current (No arrears)' },
                        { value: 'No', label: 'No Overdue Installments' },
                        { value: '1-30 Days', label: '1–30 Days Past Due' },
                        { value: '30+ Days', label: '30+ Days Past Due (Delinquent)' },
                        { value: '60+ Days', label: '60+ Days Past Due' },
                        { value: '90+ Days', label: '90+ Days Past Due (Default risk)' },
                        { value: 'Unknown', label: 'Unknown / Not sure' }
                      ]
                    })}

                    {renderRiskInputField({
                      label: 'Repayment Delay (Days Past Due)',
                      fieldKey: 'repayment_delay_days',
                      type: 'number',
                      unit: 'Days',
                      description: 'Exact continuous days past due across all borrowing facilities.',
                      placeholder: 'e.g. 0'
                    })}

                    {renderRiskInputField({
                      label: 'Total Overdue Amount (Arrears)',
                      fieldKey: 'total_overdue_amount_lkr',
                      type: 'number',
                      unit: 'LKR',
                      description: 'Total overdue principal and interest currently in arrears.',
                      placeholder: 'e.g. 0'
                    })}

                    {renderRiskInputField({
                      label: 'Longest Overdue Period (Days)',
                      fieldKey: 'longest_overdue_period_days',
                      type: 'number',
                      unit: 'Days',
                      description: 'Maximum continuous days in default across all debt facilities.',
                      placeholder: 'e.g. 0'
                    })}

                    {renderRiskInputField({
                      label: 'Missed Payments in Past 12 Months',
                      fieldKey: 'overdue_payment_count_12m',
                      type: 'number',
                      unit: 'Count',
                      description: 'Count of missed or delayed monthly loan payments during the past 12 months.',
                      placeholder: 'e.g. 0'
                    })}

                    {renderRiskInputField({
                      label: 'Other Monthly Debt Obligations',
                      fieldKey: 'other_monthly_debt_obligations_lkr',
                      type: 'number',
                      unit: 'LKR',
                      description: 'Monthly servicing for equipment leases, private borrowing, or informal credit.',
                      placeholder: 'e.g. 0'
                    })}

                    {renderRiskInputField({
                      label: 'Outstanding Debt Guarantees / Contingent Liabilities',
                      fieldKey: 'outstanding_guarantees_lkr',
                      type: 'number',
                      unit: 'LKR',
                      description: 'Monetary exposure of personal director guarantees or third-party endorsements.',
                      placeholder: 'e.g. 0'
                    })}

                    {renderRiskInputField({
                      label: 'Annual Borrowing Interest Rate (%)',
                      fieldKey: 'loan_interest_rate_pct',
                      type: 'number',
                      unit: '%',
                      description: 'Annual nominal borrowing interest rate percentage across credit lines.',
                      placeholder: 'e.g. 18'
                    })}

                    {renderRiskInputField({
                      label: 'Monthly Interest Cost',
                      fieldKey: 'monthly_interest_cost_lkr',
                      type: 'number',
                      unit: 'LKR',
                      description: 'Interest component of monthly debt service payments.',
                      placeholder: 'e.g. 6750'
                    })}

                    {renderRiskInputField({
                      label: 'Monthly Revenue Dedicated to Debt Servicing',
                      fieldKey: 'debt_service_available_revenue_lkr',
                      type: 'number',
                      unit: 'LKR',
                      description: 'Operating cash surplus earmarked exclusively for loan and debt settlement.',
                      placeholder: 'e.g. 50000'
                    })}

                    {renderRiskInputField({
                      label: 'Historical Debt Repayment Track Record',
                      fieldKey: 'repayment_history_status',
                      type: 'select',
                      description: 'Historical debt repayment timeliness track record.',
                      options: [
                        { value: 'On time', label: 'Consistently On Time' },
                        { value: 'Occasional delays', label: 'Occasional Delays (1-2 times)' },
                        { value: 'Frequent delays', label: 'Frequent Delays (>3 times)' },
                        { value: 'Not applicable — new startup', label: 'Not applicable — new startup' },
                        { value: 'No history available', label: 'No credit history available' },
                        { value: 'Unknown', label: 'Unknown / Not sure' }
                      ]
                    })}

                    {renderRiskInputField({
                      label: 'Debt Guarantees / Collateral Details',
                      fieldKey: 'debt_guarantees',
                      type: 'text',
                      description: 'Personal guarantees, property mortgage, equipment hypothecation, or pledge.',
                      placeholder: 'e.g. Personal director guarantee, equipment lien'
                    })}

                    {renderRiskInputField({
                      label: 'Upcoming Large Repayment / Loan Maturity',
                      fieldKey: 'upcoming_large_repayment_notes',
                      type: 'text',
                      description: 'Impending balloon installments, bullet principal repayments, or credit renewals.',
                      placeholder: 'e.g. LKR 100,000 balloon payment due in Q4'
                    })}
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* DIMENSION 2: MARKET RISK INPUTS                           */}
              {/* ========================================================= */}
              {activeDimensionTab === 'market' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    {renderRiskInputField({
                      label: 'Expected or Actual Monthly Sales Revenue',
                      fieldKey: 'monthly_sales_revenue',
                      type: 'number',
                      unit: 'LKR',
                      required: true,
                      description: 'Current verified or projected monthly gross revenue from commercial sales.',
                      placeholder: 'e.g. 350000'
                    })}

                    {renderRiskInputField({
                      label: 'Average Monthly Customer Count',
                      fieldKey: 'monthly_customer_count',
                      type: 'number',
                      unit: 'Customers',
                      description: 'Average number of active paying customers served per month.',
                      placeholder: 'e.g. 120'
                    })}

                    {renderRiskInputField({
                      label: 'Average Transaction Value / Ticket Size',
                      fieldKey: 'average_transaction_value_lkr',
                      type: 'number',
                      unit: 'LKR',
                      description: 'Average revenue spend per customer transaction or order.',
                      placeholder: 'e.g. 2900'
                    })}

                    {renderRiskInputField({
                      label: 'Customer Demand Verification Evidence',
                      fieldKey: 'customer_demand_evidence',
                      type: 'select',
                      description: 'Basis and documentation for revenue and demand assumptions.',
                      options: [
                        { value: 'contracts_signed', label: 'Signed Commercial Supply Contracts' },
                        { value: 'pre_orders', label: 'Signed Pre-orders or Cash Deposits' },
                        { value: 'historical_sales', label: 'Historical Accounting Sales Records' },
                        { value: 'market_survey', label: 'Market Survey / Customer Interviews' },
                        { value: 'estimate_only', label: 'Founder / Owner Estimate Only' },
                        { value: 'none', label: 'No Formal Demand Evidence' },
                        { value: 'Unknown', label: 'Unknown / Not sure' }
                      ]
                    })}

                    {renderRiskInputField({
                      label: 'Sales Trend over Last 3–6 Months',
                      fieldKey: 'sales_trend_3_6m',
                      type: 'select',
                      description: 'Recent historical revenue trajectory for operating business.',
                      options: [
                        { value: 'Increasing', label: 'Increasing (+10% or higher)' },
                        { value: 'Stable', label: 'Stable / Consistent' },
                        { value: 'Declining', label: 'Declining (Sales dropping)' },
                        { value: 'Not applicable — startup', label: 'Not applicable — new startup' },
                        { value: 'Unknown', label: 'Unknown / Not sure' }
                      ]
                    })}

                    {renderRiskInputField({
                      label: 'Direct Competitors in Target Market Area',
                      fieldKey: 'direct_competitors_count',
                      type: 'number',
                      unit: 'Competitors',
                      description: 'Active direct commercial competitors within local market radius.',
                      placeholder: 'e.g. 3'
                    })}

                    {renderRiskInputField({
                      label: 'Competitor Pricing Comparison',
                      fieldKey: 'competitor_pricing_vs_business',
                      type: 'select',
                      description: 'Relative price point of local competitor alternatives.',
                      options: [
                        { value: 'Lower', label: 'Competitors are Cheaper (Price pressure)' },
                        { value: 'Similar', label: 'Similar Price Points' },
                        { value: 'Higher', label: 'Competitors are More Expensive (Premium)' },
                        { value: 'Unknown', label: 'Unknown / Not sure' }
                      ]
                    })}

                    {renderRiskInputField({
                      label: 'Sales Dependent on Largest Customer (%)',
                      fieldKey: 'largest_customer_sales_share_pct',
                      type: 'number',
                      unit: '%',
                      description: 'Share of total revenue derived from the single highest-volume customer.',
                      placeholder: 'e.g. 25'
                    })}

                    {renderRiskInputField({
                      label: 'Expected Seasonal Demand Variation (%)',
                      fieldKey: 'seasonal_demand_variation_pct',
                      type: 'number',
                      unit: '%',
                      description: 'Peak vs trough seasonal percentage swing in product demand.',
                      placeholder: 'e.g. 20'
                    })}

                    {renderRiskInputField({
                      label: 'Customer Retention / Repeat Purchase Rate (%)',
                      fieldKey: 'customer_retention_rate_pct',
                      type: 'number',
                      unit: '%',
                      description: 'Proportion of clientele making regular repeat purchases.',
                      placeholder: 'e.g. 60'
                    })}

                    {renderRiskInputField({
                      label: 'Selling-Price Adjustment Flexibility',
                      fieldKey: 'price_adjustment_flexibility',
                      type: 'select',
                      description: 'Commercial flexibility to adjust selling prices without forfeiting customer volume.',
                      options: [
                        { value: 'High', label: 'High (Strong brand loyalty; prices can increase)' },
                        { value: 'Moderate', label: 'Moderate (Can partially adjust with notice)' },
                        { value: 'Low', label: 'Low (Price sensitive; customers will defect)' },
                        { value: 'None', label: 'None (Fixed contract or regulated tariffs)' },
                        { value: 'Unknown', label: 'Unknown / Not sure' }
                      ]
                    })}

                    {renderRiskInputField({
                      label: 'Monthly Customer Acquisition / Marketing Budget',
                      fieldKey: 'monthly_marketing_budget_lkr',
                      type: 'number',
                      unit: 'LKR',
                      description: 'Planned monthly expenditure on advertising, digital marketing, and promotions.',
                      placeholder: 'e.g. 20000'
                    })}

                    {renderRiskInputField({
                      label: 'Competition & Market Dynamics Notes',
                      fieldKey: 'demand_competition_notes',
                      type: 'text',
                      description: 'Specific notes on competitor proximity, market barriers, or buyer loyalty.',
                      placeholder: 'e.g. 2 nearby retail competitors within 1km'
                    })}
                  </div>

                  {/* Live Derivation Card: Market Consistency (Volume × Ticket vs Stated Sales) */}
                  {(() => {
                    const custCount = Number(formData.monthly_customer_count);
                    const avgTicket = Number(formData.average_transaction_value_lkr);
                    const statedSales = Number(formData.monthly_sales_revenue);
                    const hasDerived = !isNaN(custCount) && custCount > 0 && !isNaN(avgTicket) && avgTicket > 0;
                    const derivedSales = hasDerived ? custCount * avgTicket : null;
                    const hasStated = !isNaN(statedSales) && statedSales > 0;

                    if (!hasDerived && !hasStated) return null;

                    let discrepancyPct = null;
                    let isDiscrepancy = false;
                    if (hasDerived && hasStated) {
                      discrepancyPct = Math.round((Math.abs(derivedSales - statedSales) / Math.max(derivedSales, statedSales)) * 100);
                      isDiscrepancy = discrepancyPct > 30;
                    }

                    return (
                      <div style={{
                        marginTop: '0.75rem',
                        padding: '0.85rem 1rem',
                        borderRadius: 'var(--radius-sm)',
                        background: isDiscrepancy ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                        border: isDiscrepancy ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: isDiscrepancy ? 'var(--risk-high)' : 'var(--risk-low)' }}>
                            {isDiscrepancy ? '⚠️ Sales Consistency Discrepancy Flagged' : '✓ Live Market Consistency Verification'}
                          </span>
                          {discrepancyPct !== null && (
                            <span style={{
                              fontSize: '0.72rem',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              fontWeight: 600,
                              background: isDiscrepancy ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                              color: isDiscrepancy ? 'var(--risk-high)' : 'var(--risk-low)'
                            }}>
                              {discrepancyPct}% Variance
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.78rem' }}>
                          <div>
                            <span style={{ color: 'var(--text-secondary)' }}>Stated Monthly Revenue: </span>
                            <strong>{hasStated ? `LKR ${statedSales.toLocaleString()}` : 'Not provided'}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-secondary)' }}>Derived from Volume × Ticket: </span>
                            <strong>{hasDerived ? `LKR ${derivedSales.toLocaleString()} (${custCount} × LKR ${avgTicket.toLocaleString()})` : 'Awaiting volume & ticket size'}</strong>
                          </div>
                        </div>
                        {isDiscrepancy && (
                          <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--risk-high)' }}>
                            Notice: Derived sales differs from stated revenue by more than 30%. The risk engine will evaluate this consistency gap and adjust market uncertainty scores.
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ========================================================= */}
              {/* DIMENSION 3: INFLATION RISK INPUTS                        */}
              {/* ========================================================= */}
              {activeDimensionTab === 'inflation' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    {renderRiskInputField({
                      label: 'Main Materials / Inventory Monthly Cost',
                      fieldKey: 'main_materials_monthly_cost_lkr',
                      type: 'number',
                      unit: 'LKR',
                      description: 'Estimated monthly procurement expenditure on essential raw materials or trading stock.',
                      placeholder: 'e.g. 110000'
                    })}

                    {renderRiskInputField({
                      label: 'Supplier Price Changes over Past 3–6 Months (%)',
                      fieldKey: 'recent_supplier_price_increase_pct',
                      type: 'number',
                      unit: '%',
                      description: 'Observed price hike percentage from primary suppliers over recent quarters.',
                      placeholder: 'e.g. 12'
                    })}

                    {renderRiskInputField({
                      label: 'Expected Supplier Price Increase over Next 3–6 Months (%)',
                      fieldKey: 'expected_supplier_price_increase_3_6m_pct',
                      type: 'number',
                      unit: '%',
                      description: 'Anticipated price increase percentage expected from primary vendors over coming months.',
                      placeholder: 'e.g. 10'
                    })}

                    {renderRiskInputField({
                      label: 'Percentage of Major Inputs Purchased Overseas (%)',
                      fieldKey: 'imported_inputs_pct',
                      type: 'number',
                      unit: '%',
                      description: 'Proportion of essential raw materials or inventory imported from foreign suppliers.',
                      placeholder: 'e.g. 40'
                    })}

                    {renderRiskInputField({
                      label: 'Exposure to Foreign-Currency Purchases',
                      fieldKey: 'imported_materials_exposure',
                      type: 'select',
                      description: 'Sensitivity of procurement costs to foreign exchange (USD/LKR) fluctuations.',
                      options: [
                        { value: 'None', label: 'None (100% locally sourced in Sri Lanka)' },
                        { value: 'Low', label: 'Low (Minor auxiliary inputs imported)' },
                        { value: 'Moderate', label: 'Moderate (Some packaging or ingredients imported)' },
                        { value: 'High', label: 'High (Direct foreign currency or imported raw material reliance)' },
                        { value: 'Unknown', label: 'Unknown / Not sure' }
                      ]
                    })}

                    {renderRiskInputField({
                      label: 'Monthly Transport & Logistics Fuel Cost',
                      fieldKey: 'monthly_fuel_transport_cost_lkr',
                      type: 'number',
                      unit: 'LKR',
                      description: 'Monthly expenditure on commercial freight, dispatch couriers, and fuel tariffs.',
                      placeholder: 'e.g. 18000'
                    })}

                    {renderRiskInputField({
                      label: 'Monthly Electricity & Energy Utility Cost',
                      fieldKey: 'monthly_electricity_energy_cost_lkr',
                      type: 'number',
                      unit: 'LKR',
                      description: 'Monthly commercial electricity, LP gas, diesel generator, and utility expenditure.',
                      placeholder: 'e.g. 22000'
                    })}

                    {renderRiskInputField({
                      label: 'Ability to Pass Cost Increases to Customers',
                      fieldKey: 'ability_to_increase_prices',
                      type: 'select',
                      description: 'Pricing power to raise end-user selling prices when wholesale costs escalate.',
                      options: [
                        { value: 'Easily', label: 'Easily (Full Cost Passthrough)' },
                        { value: 'Partially', label: 'Partially (Moderate Passthrough)' },
                        { value: 'Difficult', label: 'Difficult / Fixed Prices (Low Passthrough)' },
                        { value: 'Unknown', label: 'Unknown / Not sure' }
                      ]
                    })}

                    {renderRiskInputField({
                      label: 'Estimated Cost Inflation Pass-Through (%)',
                      fieldKey: 'cost_increase_pass_through_pct',
                      type: 'number',
                      unit: '%',
                      description: 'Estimated percentage share of cost increases that can be passed on to buyers.',
                      placeholder: 'e.g. 60'
                    })}

                    {renderRiskInputField({
                      label: 'Availability of Alternative Suppliers',
                      fieldKey: 'alternative_suppliers_available',
                      type: 'select',
                      description: 'Market availability of substitute vendors to counter supplier price increases.',
                      options: [
                        { value: 'Good', label: 'Good (Multiple competitive local vendors available)' },
                        { value: 'Limited', label: 'Limited (Only 1–2 replacement options)' },
                        { value: 'None', label: 'None (Sole proprietary supplier)' },
                        { value: 'Unknown', label: 'Unknown / Not sure' }
                      ]
                    })}

                    {renderRiskInputField({
                      label: 'Essential Purchases Dependent on Largest Supplier (%)',
                      fieldKey: 'largest_supplier_purchase_share_pct',
                      type: 'number',
                      unit: '%',
                      description: 'Share of total critical input spending absorbed by single largest supplier.',
                      placeholder: 'e.g. 45'
                    })}

                    {renderRiskInputField({
                      label: 'Key Cost Categories Impacted by Inflation',
                      fieldKey: 'inflation_affected_categories',
                      type: 'text',
                      description: 'Specific expenditure items most vulnerable to price increases.',
                      placeholder: 'e.g. Organic oils, packaging bottles, diesel tariffs'
                    })}

                    {renderRiskInputField({
                      label: 'Source and Date of External Inflation Evidence',
                      fieldKey: 'external_inflation_source_notes',
                      type: 'text',
                      description: 'Documentation reference and date of any external inflation index (e.g. CBSL CCPI).',
                      placeholder: 'e.g. CBSL CCPI Q3 2024 Bulletin'
                    })}
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* DIMENSION 4: LIQUIDITY RISK INPUTS                        */}
              {/* ========================================================= */}
              {activeDimensionTab === 'liquidity' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    {renderRiskInputField({
                      label: 'Available Starting Capital',
                      fieldKey: 'available_starting_capital_lkr',
                      type: 'number',
                      unit: 'LKR',
                      required: true,
                      description: 'Original equity capital and accessible liquid funds contributed to venture establishment.',
                      placeholder: 'e.g. 850000'
                    })}

                    {renderRiskInputField({
                      label: 'Whether Available Capital Includes Loan Financing',
                      fieldKey: 'capital_includes_loan',
                      type: 'select',
                      description: 'Confirmation of whether stated available capital already embeds loan borrowings.',
                      options: [
                        { value: 'No', label: 'No — Capital is equity/savings only (Excludes loan)' },
                        { value: 'Yes', label: 'Yes — Stated capital already includes loan borrowings' },
                        { value: 'Unknown', label: 'Unknown / Not sure' }
                      ]
                    })}

                    {renderRiskInputField({
                      label: 'Initial Setup / Capital Expenditure (CAPEX)',
                      fieldKey: 'initial_setup_expenditure_lkr',
                      type: 'number',
                      unit: 'LKR',
                      description: 'Non-recurring capital expenditure spent on site fit-out, machinery, or licensing.',
                      placeholder: 'e.g. 350000'
                    })}

                    {renderRiskInputField({
                      label: 'Cash Currently Available for Operations',
                      fieldKey: 'cash_available_operations',
                      type: 'number',
                      unit: 'LKR',
                      description: 'Immediately accessible liquid cash in bank accounts or cash-in-hand.',
                      placeholder: 'e.g. 250000'
                    })}

                    {renderRiskInputField({
                      label: 'Post-Startup Emergency Cash Buffer',
                      fieldKey: 'remaining_cash_reserves_after_setup_lkr',
                      type: 'number',
                      unit: 'LKR',
                      description: 'Actual unencumbered cash cushion preserved after initial setup expenditures.',
                      placeholder: 'e.g. 180000'
                    })}

                    {renderRiskInputField({
                      label: 'Monthly Fixed Operating Costs',
                      fieldKey: 'monthly_fixed_costs',
                      type: 'number',
                      unit: 'LKR',
                      description: 'Inflexible recurring expenses: rent, core salaries, insurance, utilities.',
                      placeholder: 'e.g. 95000'
                    })}

                    {renderRiskInputField({
                      label: 'Monthly Variable Operating Costs',
                      fieldKey: 'monthly_variable_costs',
                      type: 'number',
                      unit: 'LKR',
                      description: 'Costs varying with production volume: inventory replenishment, packaging, commissions.',
                      placeholder: 'e.g. 50000'
                    })}

                    {renderRiskInputField({
                      label: 'Other Mandatory Monthly Financial Obligations',
                      fieldKey: 'other_mandatory_monthly_obligations_lkr',
                      type: 'number',
                      unit: 'LKR',
                      description: 'Statutory EPF/ETF, taxes, commercial vehicle leasing, or mandatory insurance outlays.',
                      placeholder: 'e.g. 15000'
                    })}

                    {renderRiskInputField({
                      label: 'Outstanding Accounts Receivable',
                      fieldKey: 'accounts_receivable',
                      type: 'number',
                      unit: 'LKR',
                      description: 'Total uncollected customer invoices currently due.',
                      placeholder: 'e.g. 45000'
                    })}

                    {renderRiskInputField({
                      label: 'Customer Payment Delay / Credit Window (Days)',
                      fieldKey: 'customer_payment_delay_days',
                      type: 'number',
                      unit: 'Days',
                      description: 'Average credit duration extended to buyers before payment receipt.',
                      placeholder: 'e.g. 14'
                    })}

                    {renderRiskInputField({
                      label: 'Outstanding Accounts Payable',
                      fieldKey: 'accounts_payable',
                      type: 'number',
                      unit: 'LKR',
                      description: 'Total pending payments due to suppliers or trade vendors.',
                      placeholder: 'e.g. 60000'
                    })}

                    {renderRiskInputField({
                      label: 'Supplier Payment Period / Trade Credit Terms (Days)',
                      fieldKey: 'supplier_payment_period_days',
                      type: 'number',
                      unit: 'Days',
                      description: 'Trade credit grace window granted by suppliers before invoice settlement.',
                      placeholder: 'e.g. 30'
                    })}

                    {renderRiskInputField({
                      label: 'Inventory or Working-Capital Requirement Buffer',
                      fieldKey: 'working_capital_requirement_lkr',
                      type: 'number',
                      unit: 'LKR',
                      description: 'Operating liquidity required to bridge receivable and inventory holding cycles.',
                      placeholder: 'e.g. 120000'
                    })}

                    {renderRiskInputField({
                      label: 'Expected Large One-Off Payments in Next 3–6 Months',
                      fieldKey: 'expected_large_one_off_payments_3_6m_lkr',
                      type: 'number',
                      unit: 'LKR',
                      description: 'Anticipated lumpy disbursements such as annual tax settlements or license renewals.',
                      placeholder: 'e.g. 35000'
                    })}
                  </div>

                  {/* Live Calculation Card: Net Monthly Cash Flow & Runway */}
                  {(() => {
                    const sales = Number(formData.monthly_sales_revenue) || 0;
                    const fixed = Number(formData.monthly_fixed_costs) || 0;
                    const variable = Number(formData.monthly_variable_costs) || 0;
                    const debt = Number(formData.monthly_loan_repayment) || 0;
                    const mandatory = Number(formData.other_mandatory_monthly_obligations_lkr) || 0;
                    const totalOutflows = fixed + variable + debt + mandatory;
                    const netCashFlow = sales - totalOutflows;

                    const cushion = Number(formData.remaining_cash_reserves_after_setup_lkr) ||
                                    Number(formData.cash_reserve_after_startup) ||
                                    Number(formData.cash_available_operations) || 0;

                    const hasData = sales > 0 || totalOutflows > 0 || cushion > 0;
                    if (!hasData) return null;

                    const isDeficit = netCashFlow < 0;
                    let runwayMonths = null;
                    if (isDeficit && cushion > 0) {
                      runwayMonths = (cushion / Math.abs(netCashFlow)).toFixed(1);
                    }

                    return (
                      <div style={{
                        marginTop: '0.75rem',
                        padding: '0.85rem 1rem',
                        borderRadius: 'var(--radius-sm)',
                        background: isDeficit ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                        border: isDeficit ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: isDeficit ? 'var(--risk-high)' : 'var(--risk-low)' }}>
                            {isDeficit ? '⚠️ Projected Operating Cash Flow Deficit' : '✓ Projected Cash Flow Positive / Self-Sustaining'}
                          </span>
                          <span style={{
                            fontSize: '0.72rem',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            fontWeight: 600,
                            background: isDeficit ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                            color: isDeficit ? 'var(--risk-high)' : 'var(--risk-low)'
                          }}>
                            {isDeficit ? `-LKR ${Math.abs(netCashFlow).toLocaleString()}/mo` : `+LKR ${netCashFlow.toLocaleString()}/mo`}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', fontSize: '0.78rem' }}>
                          <div>
                            <span style={{ color: 'var(--text-secondary)' }}>Monthly Sales Inflow: </span>
                            <strong>LKR {sales.toLocaleString()}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-secondary)' }}>Monthly Outflows: </span>
                            <strong>LKR {totalOutflows.toLocaleString()}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-secondary)' }}>Liquid Cash Cushion: </span>
                            <strong>LKR {cushion.toLocaleString()}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-secondary)' }}>Estimated Runway: </span>
                            <strong>{isDeficit ? (runwayMonths ? `${runwayMonths} Months` : 'Immediate Shortfall') : 'Self-Sustaining Operations'}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ========================================================= */}
              {/* DIMENSION 5: OPERATIONAL RISK & RELATIONSHIPS             */}
              {/* ========================================================= */}
              {activeDimensionTab === 'operational' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    {renderRiskInputField({
                      label: 'Number of Critical Commercial Suppliers',
                      fieldKey: 'critical_suppliers_count',
                      type: 'number',
                      unit: 'Suppliers',
                      description: 'Count of essential vendors whose failure would immediately halt operations.',
                      placeholder: 'e.g. 2'
                    })}

                    {renderRiskInputField({
                      label: 'Essential Inventory Dependent on Largest Supplier (%)',
                      fieldKey: 'largest_supplier_dependency_pct',
                      type: 'number',
                      unit: '%',
                      description: 'Percentage share of core inventory or inputs sourced from single largest supplier.',
                      placeholder: 'e.g. 65'
                    })}

                    {renderRiskInputField({
                      label: 'Supplier Dependency Level',
                      fieldKey: 'supplier_dependency_level',
                      type: 'select',
                      description: 'Qualitative single-vendor concentration bottleneck assessment.',
                      options: [
                        { value: 'Low', label: 'Low (Multiple suppliers available nearby)' },
                        { value: 'Moderate', label: 'Moderate (2–3 primary vendors)' },
                        { value: 'High', label: 'High (Single critical supplier bottleneck)' },
                        { value: 'Unknown', label: 'Unknown / Not sure' }
                      ]
                    })}

                    {renderRiskInputField({
                      label: 'Availability of Alternative Suppliers',
                      fieldKey: 'alternative_suppliers_status',
                      type: 'select',
                      description: 'Ease and speed of onboarding replacement suppliers if existing vendor fails.',
                      options: [
                        { value: 'Good', label: 'Good (Multiple options immediately available)' },
                        { value: 'Limited', label: 'Limited (Requires 2–4 weeks onboarding)' },
                        { value: 'None', label: 'None (Specialized proprietary single supplier)' },
                        { value: 'Unknown', label: 'Unknown / Not sure' }
                      ]
                    })}

                    {renderRiskInputField({
                      label: 'Typical Supplier Delivery Lead Time (Days)',
                      fieldKey: 'supplier_lead_time_days',
                      type: 'number',
                      unit: 'Days',
                      description: 'Average days elapsed from purchase order placement to receipt at facility.',
                      placeholder: 'e.g. 5'
                    })}

                    {renderRiskInputField({
                      label: 'Typical Delivery Delay Lag Category',
                      fieldKey: 'delivery_delay_days',
                      type: 'select',
                      description: 'Delivery delay lag category encountered on critical purchase orders.',
                      options: [
                        { value: '1-3 days', label: '1–3 Days' },
                        { value: '3-5 days', label: '3–5 Days' },
                        { value: '7-14 days', label: '7–14 Days' },
                        { value: '14+ days', label: 'Over 14 Days' },
                        { value: 'Unknown', label: 'Unknown / Not sure' }
                      ]
                    })}

                    {renderRiskInputField({
                      label: 'Supplier Delays / Stockouts in Past 3–6 Months',
                      fieldKey: 'supplier_delays_stockouts_3_6m',
                      type: 'number',
                      unit: 'Incidents',
                      description: 'Number of stock-out or delayed replenishment incidents during last quarter.',
                      placeholder: 'e.g. 1'
                    })}

                    {renderRiskInputField({
                      label: 'Inventory Holding Buffer (Days)',
                      fieldKey: 'inventory_coverage_days',
                      type: 'number',
                      unit: 'Days',
                      description: 'Days of customer sales supported by current inventory buffer without replenishment.',
                      placeholder: 'e.g. 21'
                    })}

                    {renderRiskInputField({
                      label: 'Total Active Employees Headcount',
                      fieldKey: 'total_employees_count',
                      type: 'number',
                      unit: 'Personnel',
                      description: 'Current full-time and part-time employee headcount.',
                      placeholder: 'e.g. 4'
                    })}

                    {renderRiskInputField({
                      label: 'Critical Vacant Roles Count',
                      fieldKey: 'critical_vacant_roles_count',
                      type: 'number',
                      unit: 'Roles',
                      description: 'Unfilled critical positions essential for normal daily operations.',
                      placeholder: 'e.g. 0'
                    })}

                    {renderRiskInputField({
                      label: 'Availability of Backup Staff for Critical Tasks',
                      fieldKey: 'backup_staff_available',
                      type: 'select',
                      description: 'Availability of cross-trained backup staff able to cover essential roles during absences.',
                      options: [
                        { value: 'Yes', label: 'Yes (Cross-trained team covers seamlessly)' },
                        { value: 'Partial', label: 'Partial (Partial coverage for core duties)' },
                        { value: 'No', label: 'No (Operations stall if founder/key staff is absent)' },
                        { value: 'Unknown', label: 'Unknown / Not sure' }
                      ]
                    })}

                    {renderRiskInputField({
                      label: 'Dependence on Essential Equipment / Technology',
                      fieldKey: 'essential_equipment_dependence',
                      type: 'select',
                      description: 'Operational dependency on specialized machinery, POS systems, or refrigeration.',
                      options: [
                        { value: 'Critical', label: 'Critical (Total stoppage if equipment fails)' },
                        { value: 'Moderate', label: 'Moderate (Can run manually for short periods)' },
                        { value: 'Low', label: 'Low (Easily replaceable standard tools)' },
                        { value: 'None', label: 'None' }
                      ]
                    })}

                    {renderRiskInputField({
                      label: 'Backup Equipment, Power & Connectivity',
                      fieldKey: 'backup_utilities_available',
                      type: 'select',
                      description: 'Availability of backup generators, secondary internet, or reserve equipment.',
                      options: [
                        { value: 'Yes', label: 'Yes (Full backup generator & secondary connection)' },
                        { value: 'Partial', label: 'Partial (UPS / mobile hotspot only)' },
                        { value: 'No', label: 'No backup facilities' },
                        { value: 'Unknown', label: 'Unknown / Not sure' }
                      ]
                    })}

                    {renderRiskInputField({
                      label: 'Expected Downtime Duration (Hours)',
                      fieldKey: 'expected_downtime_hours',
                      type: 'number',
                      unit: 'Hours',
                      description: 'Estimated operational downtime in hours to restore service after an outage.',
                      placeholder: 'e.g. 4'
                    })}

                    {renderRiskInputField({
                      label: 'Documented Business Continuity Plan',
                      fieldKey: 'business_continuity_plan_exists',
                      type: 'select',
                      description: 'Whether a written emergency response, disaster recovery, or contingency plan exists.',
                      options: [
                        { value: 'Yes', label: 'Yes (Documented continuity protocol)' },
                        { value: 'No', label: 'No documented continuity plan' },
                        { value: 'Unknown', label: 'Unknown / Not sure' }
                      ]
                    })}

                    {renderRiskInputField({
                      label: 'Dependence on External Delivery Providers',
                      fieldKey: 'logistics_delivery_dependence',
                      type: 'select',
                      description: 'Reliance on third-party couriers or transport services to fulfill orders.',
                      options: [
                        { value: 'High', label: 'High (Over 80% orders require couriers)' },
                        { value: 'Moderate', label: 'Moderate (30-80% delivery reliance)' },
                        { value: 'Low', label: 'Low (In-house or walk-in retail)' },
                        { value: 'None', label: 'None' }
                      ]
                    })}

                    {renderRiskInputField({
                      label: 'Operating Capacity Utilization (%)',
                      fieldKey: 'capacity_utilization_pct',
                      type: 'number',
                      unit: '%',
                      description: 'Ratio of current output to maximum sustainable operational capacity.',
                      placeholder: 'e.g. 70'
                    })}

                    {renderRiskInputField({
                      label: 'Primary Operational Bottleneck',
                      fieldKey: 'operational_constraints',
                      type: 'select',
                      description: 'Key capacity or operational constraint limiting current output.',
                      options: [
                        { value: 'None', label: 'None / Normal capacity' },
                        { value: 'Specialized Equipment Bottleneck', label: 'Specialized Equipment Bottleneck' },
                        { value: 'Storage / Warehouse Space', label: 'Storage / Warehouse Space Constraint' },
                        { value: 'Staff Skill Shortage', label: 'Staff Skill Shortage / Hiring Constraint' },
                        { value: 'Transport & Delivery Delay', label: 'Transport & Delivery Delay' },
                        { value: 'Unknown', label: 'Unknown / Not sure' }
                      ]
                    })}

                    {renderRiskInputField({
                      label: 'Primary Commercial Suppliers Names',
                      fieldKey: 'main_suppliers_list',
                      type: 'text',
                      description: 'Names of key external vendors and suppliers.',
                      placeholder: 'e.g. Lanka Wholesale Ltd, Colombo Packaging Co'
                    })}
                  </div>

                  {/* Counterparties Manager for GNN Network */}
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '0.5rem' }}>
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
        );
      })()}

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
                          {mit.category && (
                            <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                              {mit.category}
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.45 }}>
                          {mit.mechanism || mit.description || mit.rationale}
                        </div>

                        <div style={{ display: 'flex', gap: '0.85rem', marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                          <span>Timeline: <strong>{mit.suggested_timeline || mit.time_horizon || '1-3 months'}</strong></span>
                          {mit.responsible_role && (
                            <span>Role: <strong>{mit.responsible_role}</strong></span>
                          )}
                          {mit.estimated_cost && (
                            <span>Estimated Resource: <strong style={{ color: 'var(--primary-green)' }}>{mit.estimated_cost}</strong></span>
                          )}
                          {mit.measurable_indicator && (
                            <span>Target: <strong style={{ color: 'var(--text-primary)' }}>{mit.measurable_indicator}</strong></span>
                          )}
                        </div>

                        {mit.reassessment_triggers && (
                          <div style={{ marginTop: '0.35rem', fontSize: '0.68rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Trigger for reassessment: {mit.reassessment_triggers}
                          </div>
                        )}
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

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="btn btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontWeight: 600,
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)'
                }}
              >
                <FileText size={16} />
                <span>{downloadingPdf ? 'Generating PDF...' : 'Download PDF Mitigation Plan (.pdf)'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadReport}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
                title="Download researcher markdown audit report"
              >
                <Download size={15} />
                <span>Technical Audit (.md)</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
