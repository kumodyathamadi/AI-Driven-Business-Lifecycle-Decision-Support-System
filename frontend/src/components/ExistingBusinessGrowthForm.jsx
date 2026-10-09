import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Building, 
  DollarSign, 
  Users, 
  TrendingUp, 
  Sparkles, 
  AlertCircle, 
  Info, 
  ArrowLeft, 
  ArrowRight, 
  X, 
  ChevronDown, 
  Loader2, 
  FileText,
  Check,
  Briefcase,
  PieChart
} from 'lucide-react';

const SRI_LANKA_DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
  'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
  'Monaragala', 'Ratnapura', 'Kegalle'
];

const DISTRICT_TO_PROVINCE = {
  'colombo': 'Western', 'gampaha': 'Western', 'kalutara': 'Western',
  'kandy': 'Central', 'matale': 'Central', 'nuwara eliya': 'Central',
  'galle': 'Southern', 'matara': 'Southern', 'hambantota': 'Southern',
  'jaffna': 'Northern', 'kilinochchi': 'Northern', 'mannar': 'Northern',
  'vavuniya': 'Northern', 'mullaitivu': 'Northern',
  'batticaloa': 'Eastern', 'ampara': 'Eastern', 'trincomalee': 'Eastern',
  'kurunegala': 'North Western', 'puttalam': 'North Western',
  'anuradhapura': 'North Central', 'polonnaruwa': 'North Central',
  'badulla': 'Uva', 'monaragala': 'Uva',
  'ratnapura': 'Sabaragamuwa', 'kegalle': 'Sabaragamuwa'
};

const GROWTH_ACTIONS = [
  'Expand Current Branch Capacity & Volume',
  'Open Additional Branch / Outlet',
  'Introduce New Product / Service Line',
  'Expand Digital Ordering & Delivery Channels',
  'Upgrade Equipment & Operational Efficiency',
  'Improve Current Operations Without New Branch'
];

const EXPANSION_TYPES = [
  'Physical Branch Expansion',
  'Product/Service-Line Extension',
  'Equipment or Capacity Upgrade',
  'Digital/Delivery Channel Expansion',
  'Operational Efficiency Improvement',
  'Other Staged Growth'
];

const EMPTY_GROWTH_STATE = {
  business_name: '',
  business_stage: 'Existing Business',
  business_category: '',
  business_model: '',
  district: '',
  address: '',
  location_type: '',
  proposed_action: '',
  additional_description: '',
  marketing_details: '',
  competitor_information: '',
  financial_overview: '',
  
  // Core Feasibility Features (Stage-Specific Growth Interpretation)
  available_capital_lkr: '',
  loan_amount_lkr: '',
  monthly_budget_lkr: '',
  initial_inventory_cost_lkr: '',
  expected_price_lkr: '',
  expected_customers_per_day: '',
  competition_level: '',
  customer_demand_score: '',
  entrepreneur_experience_years: '',
  available_staff_count: '',
  location_suitability_score: '',
  available_equipment_score: '',
  required_equipment_score: '',
  supplier_availability_score: '',

  // Optional Supplementary Growth Planning Fields (Preserved outside ML vector)
  current_monthly_revenue_lkr: '',
  current_monthly_net_profit_lkr: '',
  existing_monthly_debt_obligations_lkr: '',
  business_age_years: '',
  expansion_capex_lkr: '',
  target_payback_months: '',
  current_capacity_utilization_pct: '',
  expansion_type: ''
};

const isFieldMissing = (val) => {
  if (val === undefined || val === null) return true;
  if (typeof val === 'string' && val.trim() === '') return true;
  if (typeof val === 'number' && isNaN(val)) return true;
  return false;
};

const REQUIRED_SECTION_1_KEYS = [
  'business_category',
  'business_model',
  'district',
  'location_type'
];

const REQUIRED_SECTION_2_KEYS = [
  'available_capital_lkr',
  'monthly_budget_lkr',
  'expected_price_lkr',
  'expected_customers_per_day',
  'competition_level',
  'customer_demand_score',
  'entrepreneur_experience_years',
  'available_staff_count',
  'location_suitability_score',
  'available_equipment_score',
  'required_equipment_score',
  'supplier_availability_score'
];

const FIELD_HUMAN_LABELS = {
  business_category: 'Business Category',
  business_model: 'Business Model',
  district: 'District',
  location_type: 'Location Type',
  available_capital_lkr: 'Expansion Capital Available (LKR)',
  monthly_budget_lkr: 'Additional Monthly Operating Budget (LKR)',
  expected_price_lkr: 'Average Customer Spend per Visit (LKR)',
  expected_customers_per_day: 'Expected Additional Customers / Day',
  competition_level: 'Market Competition Level',
  customer_demand_score: 'Customer Demand Score',
  entrepreneur_experience_years: 'Relevant Business Operating Experience (Years)',
  available_staff_count: 'Available Staff Count',
  location_suitability_score: 'Location Suitability Score',
  available_equipment_score: 'Available Equipment Score',
  required_equipment_score: 'Required Equipment Score',
  supplier_availability_score: 'Supplier Availability Score',
};

const parseOptionalString = (val) => {
  if (val === '' || val === null || val === undefined) return null;
  const s = String(val).trim();
  return s.length > 0 ? s : null;
};

const parseOptionalNumber = (val) => {
  if (val === '' || val === null || val === undefined) return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
};

export default function ExistingBusinessGrowthForm({ 
  initialValues = null, 
  aiFilledKeys = null, 
  onSubmit, 
  loading = false, 
  onBack,
  onClose,
  onFormChange,
  stageBadge
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(() => {
    const merged = { ...EMPTY_GROWTH_STATE };
    if (initialValues) {
      Object.keys(EMPTY_GROWTH_STATE).forEach((k) => {
        if (initialValues[k] !== undefined && initialValues[k] !== null && initialValues[k] !== '') {
          merged[k] = initialValues[k];
        }
      });
    }
    merged.business_stage = 'Existing Business';
    return merged;
  });

  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [validationError, setValidationError] = useState('');

  const modalRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const previousActiveElement = useRef(null);
  const onCloseRef = useRef(onClose);
  const onBackRef = useRef(onBack);
  const onFormChangeRef = useRef(onFormChange);
  const formDataRef = useRef(formData);

  onCloseRef.current = onClose;
  onBackRef.current = onBack;
  onFormChangeRef.current = onFormChange;
  formDataRef.current = formData;

  const handleBackAction = useCallback(() => {
    if (onFormChangeRef.current) {
      onFormChangeRef.current(formDataRef.current);
    }
    if (onBackRef.current) {
      onBackRef.current(formDataRef.current);
    }
  }, []);

  const handleCloseAction = useCallback(() => {
    if (onFormChangeRef.current) {
      onFormChangeRef.current(formDataRef.current);
    }
    if (onCloseRef.current) {
      onCloseRef.current(formDataRef.current);
    } else if (onBackRef.current) {
      onBackRef.current(formDataRef.current);
    }
  }, []);

  const handleCloseActionRef = useRef(handleCloseAction);
  handleCloseActionRef.current = handleCloseAction;

  useEffect(() => {
    if (initialValues) {
      setFormData((prev) => {
        const merged = { ...prev };
        Object.keys(EMPTY_GROWTH_STATE).forEach((k) => {
          if (initialValues[k] !== undefined && initialValues[k] !== null && initialValues[k] !== '') {
            merged[k] = initialValues[k];
          }
        });
        merged.business_stage = 'Existing Business';
        return merged;
      });
    }
  }, [initialValues]);

  useEffect(() => {
    previousActiveElement.current = document.activeElement;
    if (modalRef.current) {
      modalRef.current.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (handleCloseActionRef.current) {
          handleCloseActionRef.current();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    };
  }, []);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const updatedValue = type === 'number' ? (value === '' ? '' : parseFloat(value)) : value;
    
    setFormData((prev) => ({
      ...prev,
      [name]: updatedValue,
    }));

    if (validationError) {
      setValidationError('');
    }
  };

  const handleBlur = (name) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const isAiFilled = (key) => {
    if (!aiFilledKeys) return false;
    if (aiFilledKeys instanceof Set) return aiFilledKeys.has(key);
    if (Array.isArray(aiFilledKeys)) return aiFilledKeys.includes(key);
    return false;
  };

  const getFieldError = (key) => {
    const val = formData[key];
    const isMissing = isFieldMissing(val);

    if (isMissing) {
      const label = FIELD_HUMAN_LABELS[key];
      if (label) {
        return `Please provide ${label}.`;
      }
      return null;
    }

    if (key === 'available_capital_lkr' && Number(val) < 0) {
      return 'Expansion Capital cannot be negative.';
    }
    if (key === 'monthly_budget_lkr' && Number(val) < 0) {
      return 'Additional Monthly Operating Budget cannot be negative.';
    }
    if (key === 'expected_price_lkr' && Number(val) <= 0) {
      return 'Average Customer Spend per Visit must be greater than 0.';
    }
    if (key === 'expected_customers_per_day' && Number(val) < 0) {
      return 'Expected Additional Customers / Day cannot be negative.';
    }
    if (key === 'customer_demand_score' && (Number(val) < 1 || Number(val) > 100)) {
      return 'Customer Demand Score must be between 1 and 100.';
    }
    if (key === 'entrepreneur_experience_years' && Number(val) < 0) {
      return 'Operating Experience cannot be negative.';
    }
    if (key === 'available_staff_count' && Number(val) < 0) {
      return 'Available Staff Count cannot be negative.';
    }

    return null;
  };

  const handleNextStep1 = () => {
    const missingSection1 = REQUIRED_SECTION_1_KEYS.filter((k) => !!getFieldError(k));

    if (missingSection1.length > 0) {
      const touchedUpdates = {};
      missingSection1.forEach((k) => { touchedUpdates[k] = true; });
      setTouched((prev) => ({ ...prev, ...touchedUpdates }));

      if (missingSection1.length === 1) {
        setValidationError(getFieldError(missingSection1[0]));
      } else {
        const labels = missingSection1.map((k) => FIELD_HUMAN_LABELS[k] || k).join(', ');
        setValidationError(`Please complete required fields: ${labels}.`);
      }
      return;
    }

    setValidationError('');
    setCurrentStep(2);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  const handleNextStep2 = () => {
    const missingSection2 = REQUIRED_SECTION_2_KEYS.filter((k) => !!getFieldError(k));

    if (missingSection2.length > 0) {
      const touchedUpdates = {};
      missingSection2.forEach((k) => { touchedUpdates[k] = true; });
      setTouched((prev) => ({ ...prev, ...touchedUpdates }));

      if (missingSection2.length === 1) {
        setValidationError(getFieldError(missingSection2[0]));
      } else {
        const labels = missingSection2.map((k) => FIELD_HUMAN_LABELS[k] || k).join(', ');
        setValidationError(`Please complete required fields: ${labels}.`);
      }
      return;
    }

    setValidationError('');
    setCurrentStep(3);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  const handlePrevStep = (targetStep) => {
    setValidationError('');
    setCurrentStep(targetStep);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSubmitted(true);

    const missingSection1 = REQUIRED_SECTION_1_KEYS.filter((k) => !!getFieldError(k));
    if (missingSection1.length > 0) {
      setCurrentStep(1);
      const touchedUpdates = {};
      missingSection1.forEach((k) => { touchedUpdates[k] = true; });
      setTouched((prev) => ({ ...prev, ...touchedUpdates }));
      const labels = missingSection1.map((k) => FIELD_HUMAN_LABELS[k] || k).join(', ');
      setValidationError(`Please complete required fields in Section 1: ${labels}.`);
      return;
    }

    const missingSection2 = REQUIRED_SECTION_2_KEYS.filter((k) => !!getFieldError(k));
    if (missingSection2.length > 0) {
      setCurrentStep(2);
      const touchedUpdates = {};
      missingSection2.forEach((k) => { touchedUpdates[k] = true; });
      setTouched((prev) => ({ ...prev, ...touchedUpdates }));
      const labels = missingSection2.map((k) => FIELD_HUMAN_LABELS[k] || k).join(', ');
      setValidationError(`Please complete required fields in Section 2: ${labels}.`);
      return;
    }

    setValidationError('');

    const distLower = (formData.district || 'colombo').trim().toLowerCase();
    const derivedProvince = DISTRICT_TO_PROVINCE[distLower] || 'Western';

    const finalPayload = {
      business_name: parseOptionalString(formData.business_name),
      business_stage: 'Existing Business',
      business_category: parseOptionalString(formData.business_category),
      business_model: parseOptionalString(formData.business_model) || 'Direct Retail / Service',
      district: parseOptionalString(formData.district) || 'Colombo',
      province: derivedProvince,
      address: parseOptionalString(formData.address),
      location_type: parseOptionalString(formData.location_type) || 'Suburban Commercial Hub',
      proposed_action: parseOptionalString(formData.proposed_action) || 'Expand Current Branch Capacity & Volume',
      additional_description: parseOptionalString(formData.additional_description),
      marketing_details: parseOptionalString(formData.marketing_details),
      competitor_information: parseOptionalString(formData.competitor_information),
      financial_overview: parseOptionalString(formData.financial_overview),
      
      // Core 22 Model Compatible Features
      available_capital_lkr: Number(formData.available_capital_lkr),
      loan_amount_lkr: isFieldMissing(formData.loan_amount_lkr) ? 0.0 : Number(formData.loan_amount_lkr),
      monthly_budget_lkr: Number(formData.monthly_budget_lkr),
      initial_inventory_cost_lkr: isFieldMissing(formData.initial_inventory_cost_lkr) ? 0.0 : Number(formData.initial_inventory_cost_lkr),
      expected_price_lkr: Number(formData.expected_price_lkr),
      
      expected_customers_per_day: Math.round(Number(formData.expected_customers_per_day)),
      competition_level: parseOptionalString(formData.competition_level) || 'Moderate',
      customer_demand_score: Math.round(Number(formData.customer_demand_score)),
      entrepreneur_experience_years: Math.round(Number(formData.entrepreneur_experience_years)),
      available_staff_count: Math.round(Number(formData.available_staff_count)),
      
      location_suitability_score: Math.round(Number(formData.location_suitability_score)),
      available_equipment_score: Math.round(Number(formData.available_equipment_score)),
      required_equipment_score: Math.round(Number(formData.required_equipment_score)),
      supplier_availability_score: Math.round(Number(formData.supplier_availability_score)),

      // Optional Supplementary Growth Fields
      current_monthly_revenue_lkr: parseOptionalNumber(formData.current_monthly_revenue_lkr),
      current_monthly_net_profit_lkr: parseOptionalNumber(formData.current_monthly_net_profit_lkr),
      existing_monthly_debt_obligations_lkr: parseOptionalNumber(formData.existing_monthly_debt_obligations_lkr),
      business_age_years: parseOptionalNumber(formData.business_age_years),
      expansion_capex_lkr: parseOptionalNumber(formData.expansion_capex_lkr),
      target_payback_months: parseOptionalNumber(formData.target_payback_months),
      current_capacity_utilization_pct: parseOptionalNumber(formData.current_capacity_utilization_pct),
      expansion_type: parseOptionalString(formData.expansion_type)
    };

    // Remove null/undefined optional keys
    Object.keys(finalPayload).forEach((k) => {
      if (finalPayload[k] === null || finalPayload[k] === undefined) {
        delete finalPayload[k];
      }
    });

    onSubmit(finalPayload);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCloseAction();
    }
  };

  const renderFloatingField = ({
    label,
    name,
    isRequired = false,
    helperText,
    isSelect = false,
    isTextarea = false,
    children
  }) => {
    const errorMsg = getFieldError(name);
    const showError = (touched[name] || submitted) && !!errorMsg;
    const isAi = isAiFilled(name);

    return (
      <div className={`floating-field-wrapper ${isTextarea ? 'is-textarea' : ''}`}>
        <div className={`floating-field-container ${showError ? 'has-error' : ''}`}>
          <div className="floating-field-top-row">
            <label className="floating-field-label" htmlFor={name}>
              {label}
              {isRequired && <span className="floating-field-required-dot" title="Required field">*</span>}
            </label>

            {isAi && (
              <span className="floating-field-ai-badge" title="Populated automatically by AI">
                <Sparkles size={10} />
                <span>AI-filled</span>
              </span>
            )}
          </div>

          {isSelect ? (
            <div className="floating-select-wrapper">
              {children}
              <ChevronDown size={16} className="floating-select-chevron" />
            </div>
          ) : (
            children
          )}
        </div>

        {helperText && !showError && (
          <div className="floating-field-helper-hint">
            <Info size={11} style={{ flexShrink: 0 }} />
            <span>{helperText}</span>
          </div>
        )}

        {showError && (
          <div className="floating-field-error-text">
            <AlertCircle size={12} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className="modal-backdrop-overlay" 
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className="modal-dialog-card" 
        ref={modalRef} 
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background Purple/Indigo Glow for Growth Form */}
        <div className="modal-deco-backdrop">
          <div className="modal-deco-glow" style={{ background: 'radial-gradient(circle, rgba(168, 85, 247, 0.18) 0%, rgba(99, 102, 241, 0.05) 70%, transparent 100%)' }} />
        </div>

        {/* Modal Header */}
        <div className="modal-header-section">
          <div className="modal-top-actions">
            {currentStep === 1 && onBack ? (
              <button 
                type="button" 
                onClick={handleBackAction} 
                className="modal-back-btn" 
                title="Return to Business Type Selection"
                id="modal-btn-back"
              >
                <ArrowLeft size={14} />
                <span>Back to Mode</span>
              </button>
            ) : currentStep > 1 ? (
              <button 
                type="button" 
                onClick={() => handlePrevStep(currentStep - 1)} 
                className="modal-back-btn" 
                title="Return to previous section"
                id="modal-btn-step-back"
              >
                <ArrowLeft size={14} />
                <span>Back to Section {currentStep - 1}</span>
              </button>
            ) : <div />}

            {onClose && (
              <button 
                type="button" 
                onClick={handleCloseAction} 
                className="modal-close-icon-btn" 
                title="Close Form (Esc)"
                id="modal-btn-close"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.35rem' }}>
            <span 
              style={{ 
                background: 'rgba(168, 85, 247, 0.15)', 
                color: '#c084fc', 
                border: '1px solid rgba(168, 85, 247, 0.35)', 
                padding: '0.2rem 0.65rem', 
                borderRadius: '16px', 
                fontSize: '0.75rem', 
                fontWeight: 700, 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.35rem' 
              }}
            >
              <TrendingUp size={12} /> Strategic Business Growth & Expansion Intake
            </span>
          </div>

          <h2 id="modal-title" className="modal-title" style={{ marginTop: '0.5rem' }}>
            {currentStep === 1 && '1. Enterprise Baseline & Expansion Focus'}
            {currentStep === 2 && '2. Expansion Capital, Demand & Operational Capacity'}
            {currentStep === 3 && '3. Baseline Performance & Investment Scope (Optional)'}
          </h2>

          <p className="modal-subtitle">
            {currentStep === 1 && 'Define your existing business identity, operating district, and proposed growth trajectory.'}
            {currentStep === 2 && 'Detail the incremental capital, expected additional footfall, and operational resources for expansion.'}
            {currentStep === 3 && 'Provide optional baseline revenue, net profit, and CapEx metrics for detailed payback analysis.'}
          </p>

          {/* Stepper */}
          <div className="form-step-stepper">
            <div 
              className={`form-step-pill ${currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : ''}`}
              onClick={() => { if (currentStep > 1) handlePrevStep(1); }}
              style={{ cursor: currentStep > 1 ? 'pointer' : 'default' }}
            >
              <div className="form-step-number">{currentStep > 1 ? <Check size={11} /> : '1'}</div>
              <span className="form-step-label">Expansion Focus</span>
            </div>

            <div className={`form-step-track ${currentStep > 1 ? 'filled' : ''}`} />

            <div 
              className={`form-step-pill ${currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : ''}`}
              onClick={() => { if (currentStep > 2) handlePrevStep(2); }}
              style={{ cursor: currentStep > 2 ? 'pointer' : 'default' }}
            >
              <div className="form-step-number">{currentStep > 2 ? <Check size={11} /> : '2'}</div>
              <span className="form-step-label">Expansion Capital</span>
            </div>

            <div className={`form-step-track ${currentStep > 2 ? 'filled' : ''}`} />

            <div className={`form-step-pill ${currentStep === 3 ? 'active' : ''}`}>
              <div className="form-step-number">3</div>
              <span className="form-step-label">Baseline Metrics</span>
            </div>
          </div>

          {/* Validation Error Banner */}
          {validationError && (
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.12)', 
              border: '1px solid rgba(239, 68, 68, 0.35)', 
              padding: '0.6rem 0.95rem', 
              borderRadius: '8px', 
              marginTop: '0.75rem', 
              color: '#fca5a5', 
              fontSize: '0.8rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.55rem',
              textAlign: 'left'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{validationError}</span>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="modal-body-scroll" ref={scrollContainerRef}>
            
            {/* STEP 1: Enterprise Profile & Expansion Focus */}
            {currentStep === 1 && (
              <div className="form-step-content">
                <div className="modal-section-header first-section">
                  <div className="modal-section-title-wrap" style={{ color: '#c084fc' }}>
                    <Building size={16} />
                    <span>Enterprise Profile & Operating Base</span>
                  </div>
                  <div className="modal-section-line" />
                </div>

                {renderFloatingField({
                  label: 'Enterprise Name',
                  name: 'business_name',
                  helperText: 'Your registered trade name or operating business identity.',
                  children: (
                    <input 
                      id="business_name"
                      type="text" 
                      name="business_name" 
                      value={formData.business_name} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('business_name')}
                      placeholder="e.g. Silva Supermarket & Bakery"
                      className="floating-field-input" 
                    />
                  )
                })}

                {renderFloatingField({
                  label: 'Business Category',
                  name: 'business_category',
                  isRequired: true,
                  isSelect: true,
                  children: (
                    <select 
                      id="business_category"
                      name="business_category" 
                      value={formData.business_category} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('business_category')}
                      className="floating-field-select"
                    >
                      <option value="">Select Category</option>
                      <option value="Grocery / Retail">Grocery / Retail</option>
                      <option value="Bakery / Food">Bakery / Food</option>
                      <option value="Clothing / Garment">Clothing / Garment</option>
                      <option value="Personal Care / Salon">Personal Care / Salon</option>
                    </select>
                  )
                })}

                {renderFloatingField({
                  label: 'Operating Business Model',
                  name: 'business_model',
                  isRequired: true,
                  isSelect: true,
                  children: (
                    <select 
                      id="business_model"
                      name="business_model" 
                      value={formData.business_model} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('business_model')}
                      className="floating-field-select"
                    >
                      <option value="">Select Model</option>
                      <option value="Direct Retail / Service">Direct Retail / Service</option>
                      <option value="Hybrid Retail + Delivery">Hybrid Retail + Delivery</option>
                      <option value="Wholesale & B2B Supply">Wholesale & B2B Supply</option>
                      <option value="Specialized Boutique Service">Specialized Boutique Service</option>
                    </select>
                  )
                })}

                {renderFloatingField({
                  label: 'Operating District',
                  name: 'district',
                  isRequired: true,
                  isSelect: true,
                  helperText: 'Operating district for the existing business or target expansion catchment.',
                  children: (
                    <select 
                      id="district"
                      name="district" 
                      value={formData.district} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('district')}
                      className="floating-field-select"
                    >
                      <option value="">Select District</option>
                      {SRI_LANKA_DISTRICTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  )
                })}

                {renderFloatingField({
                  label: 'Catchment Location Type',
                  name: 'location_type',
                  isRequired: true,
                  isSelect: true,
                  children: (
                    <select 
                      id="location_type"
                      name="location_type" 
                      value={formData.location_type} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('location_type')}
                      className="floating-field-select"
                    >
                      <option value="">Select Location Setting</option>
                      <option value="Commercial City Center">Commercial City Center</option>
                      <option value="Suburban Commercial Hub">Suburban Commercial Hub</option>
                      <option value="Residential Main Road">Residential Main Road</option>
                      <option value="Transit Station Vicinity">Transit Station Vicinity</option>
                      <option value="Rural Town Center">Rural Town Center</option>
                    </select>
                  )
                })}

                {renderFloatingField({
                  label: 'Proposed Growth Objective',
                  name: 'proposed_action',
                  isSelect: true,
                  helperText: 'Select the primary expansion or capacity scaling activity.',
                  children: (
                    <select 
                      id="proposed_action"
                      name="proposed_action" 
                      value={formData.proposed_action} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('proposed_action')}
                      className="floating-field-select"
                    >
                      <option value="">Select Proposed Growth Action</option>
                      {GROWTH_ACTIONS.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  )
                })}

                {renderFloatingField({
                  label: 'Expansion Scope & Project Description',
                  name: 'additional_description',
                  isTextarea: true,
                  helperText: 'Explain what you plan to expand (e.g. adding a bakery section, second counter, online delivery).',
                  children: (
                    <textarea 
                      id="additional_description"
                      name="additional_description" 
                      value={formData.additional_description} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('additional_description')}
                      rows={3}
                      placeholder="e.g. We operate a grocery store and want to add an in-store bakery counter and fresh food section to boost customer basket size..."
                      className="floating-field-textarea" 
                    />
                  )
                })}
              </div>
            )}

            {/* STEP 2: Expansion Capital & Operations */}
            {currentStep === 2 && (
              <div className="form-step-content">
                <div className="modal-section-header first-section">
                  <div className="modal-section-title-wrap" style={{ color: 'var(--accent-teal)' }}>
                    <DollarSign size={16} />
                    <span>Expansion Capital & Financial Resources</span>
                  </div>
                  <div className="modal-section-line" />
                </div>

                {renderFloatingField({
                  label: 'Capital Available for Proposed Expansion (LKR)',
                  name: 'available_capital_lkr',
                  isRequired: true,
                  helperText: 'Funds allocated specifically for this expansion project (do not include historical enterprise assets).',
                  children: (
                    <input 
                      id="available_capital_lkr"
                      type="number" 
                      name="available_capital_lkr" 
                      value={formData.available_capital_lkr} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('available_capital_lkr')}
                      step="25000" 
                      min="0" 
                      placeholder="e.g. 1500000"
                      className="floating-field-input" 
                    />
                  )
                })}

                {renderFloatingField({
                  label: 'Planned Expansion Loan Financing (LKR)',
                  name: 'loan_amount_lkr',
                  helperText: 'Optional. Enter 0 or leave blank if self-funded from operating reserves.',
                  children: (
                    <input 
                      id="loan_amount_lkr"
                      type="number" 
                      name="loan_amount_lkr" 
                      value={formData.loan_amount_lkr} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('loan_amount_lkr')}
                      step="50000" 
                      min="0" 
                      placeholder="e.g. 500000"
                      className="floating-field-input" 
                    />
                  )
                })}

                {renderFloatingField({
                  label: 'Additional Monthly Operating Budget for Expansion (LKR)',
                  name: 'monthly_budget_lkr',
                  isRequired: true,
                  helperText: 'Incremental monthly expenditure required solely for the expanded operations (additional rent, wages, utilities).',
                  children: (
                    <input 
                      id="monthly_budget_lkr"
                      type="number" 
                      name="monthly_budget_lkr" 
                      value={formData.monthly_budget_lkr} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('monthly_budget_lkr')}
                      step="10000" 
                      min="0" 
                      placeholder="e.g. 250000"
                      className="floating-field-input" 
                    />
                  )
                })}

                {renderFloatingField({
                  label: 'Additional Inventory Investment for Expansion (LKR)',
                  name: 'initial_inventory_cost_lkr',
                  helperText: 'Additional upfront inventory stock or raw materials required specifically for the new line or branch.',
                  children: (
                    <input 
                      id="initial_inventory_cost_lkr"
                      type="number" 
                      name="initial_inventory_cost_lkr" 
                      value={formData.initial_inventory_cost_lkr} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('initial_inventory_cost_lkr')}
                      step="10000" 
                      min="0" 
                      placeholder="e.g. 300000"
                      className="floating-field-input" 
                    />
                  )
                })}

                {renderFloatingField({
                  label: 'Average Customer Spend per Visit (LKR)',
                  name: 'expected_price_lkr',
                  isRequired: true,
                  helperText: 'Expected average transaction spend per customer visit across the expanded offerings.',
                  children: (
                    <input 
                      id="expected_price_lkr"
                      type="number" 
                      name="expected_price_lkr" 
                      value={formData.expected_price_lkr} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('expected_price_lkr')}
                      step="10" 
                      min="1" 
                      placeholder="e.g. 500"
                      className="floating-field-input" 
                    />
                  )
                })}

                <div className="modal-section-header">
                  <div className="modal-section-title-wrap" style={{ color: '#c084fc' }}>
                    <Users size={16} />
                    <span>Expansion Footfall & Operational Capacity</span>
                  </div>
                  <div className="modal-section-line" />
                </div>

                {renderFloatingField({
                  label: 'Expected Additional Customers / Day',
                  name: 'expected_customers_per_day',
                  isRequired: true,
                  helperText: 'Expected incremental customer visits per day generated by this expansion.',
                  children: (
                    <input 
                      id="expected_customers_per_day"
                      type="number" 
                      name="expected_customers_per_day" 
                      value={formData.expected_customers_per_day} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('expected_customers_per_day')}
                      min="1" 
                      placeholder="e.g. 60"
                      className="floating-field-input" 
                    />
                  )
                })}

                {renderFloatingField({
                  label: 'Market Competition Level',
                  name: 'competition_level',
                  isRequired: true,
                  isSelect: true,
                  children: (
                    <select 
                      id="competition_level"
                      name="competition_level" 
                      value={formData.competition_level} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('competition_level')}
                      className="floating-field-select"
                    >
                      <option value="">Select Competition Level</option>
                      <option value="Low">Low - Very few direct alternatives in catchment</option>
                      <option value="Moderate">Moderate - Established commercial competitors</option>
                      <option value="High">High - Dense competitive presence</option>
                    </select>
                  )
                })}

                {renderFloatingField({
                  label: 'Customer Demand Score (1-100)',
                  name: 'customer_demand_score',
                  isRequired: true,
                  helperText: 'Market demand confidence for this expansion (e.g. 50 = steady patronage, 80+ = strong existing demand).',
                  children: (
                    <input 
                      id="customer_demand_score"
                      type="number" 
                      name="customer_demand_score" 
                      value={formData.customer_demand_score} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('customer_demand_score')}
                      min="1" 
                      max="100" 
                      placeholder="e.g. 70"
                      className="floating-field-input" 
                    />
                  )
                })}

                {renderFloatingField({
                  label: 'Relevant Business Operating Experience (Years)',
                  name: 'entrepreneur_experience_years',
                  isRequired: true,
                  helperText: 'Your total active years running this enterprise or operating commercial businesses.',
                  children: (
                    <input 
                      id="entrepreneur_experience_years"
                      type="number" 
                      name="entrepreneur_experience_years" 
                      value={formData.entrepreneur_experience_years} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('entrepreneur_experience_years')}
                      min="0" 
                      max="50" 
                      placeholder="e.g. 5"
                      className="floating-field-input" 
                    />
                  )
                })}

                {renderFloatingField({
                  label: 'Available Total Staff for Expansion',
                  name: 'available_staff_count',
                  isRequired: true,
                  helperText: 'Total staff allocated to support the combined expanded operations.',
                  children: (
                    <input 
                      id="available_staff_count"
                      type="number" 
                      name="available_staff_count" 
                      value={formData.available_staff_count} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('available_staff_count')}
                      min="0" 
                      placeholder="e.g. 4"
                      className="floating-field-input" 
                    />
                  )
                })}

                {renderFloatingField({
                  label: 'Expansion Location Suitability (1-5)',
                  name: 'location_suitability_score',
                  isRequired: true,
                  isSelect: true,
                  children: (
                    <select 
                      id="location_suitability_score"
                      name="location_suitability_score" 
                      value={formData.location_suitability_score} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('location_suitability_score')}
                      className="floating-field-select"
                    >
                      <option value="">Select Location Suitability</option>
                      {[1, 2, 3, 4, 5].map(v => (
                        <option key={v} value={v}>
                          {v} - {v === 1 ? 'Very Low' : v === 2 ? 'Suboptimal' : v === 3 ? 'Standard' : v === 4 ? 'High Footfall' : 'Prime Hub'}
                        </option>
                      ))}
                    </select>
                  )
                })}

                <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.85rem' }}>
                  {renderFloatingField({
                    label: 'Available Equipment Readiness (1-5)',
                    name: 'available_equipment_score',
                    isRequired: true,
                    isSelect: true,
                    children: (
                      <select 
                        id="available_equipment_score"
                        name="available_equipment_score" 
                        value={formData.available_equipment_score} 
                        onChange={handleChange}
                        onBlur={() => handleBlur('available_equipment_score')}
                        className="floating-field-select"
                      >
                        <option value="">Select Equipment Readiness</option>
                        {[1, 2, 3, 4, 5].map(v => (
                          <option key={v} value={v}>
                            {v} - {v === 1 ? 'Minimal' : v === 2 ? 'Basic' : v === 3 ? 'Adequate' : v === 4 ? 'Well Equipped' : 'Fully Equipped'}
                          </option>
                        ))}
                      </select>
                    )
                  })}

                  {renderFloatingField({
                    label: 'Expansion Equipment Required (1-5)',
                    name: 'required_equipment_score',
                    isRequired: true,
                    isSelect: true,
                    children: (
                      <select 
                        id="required_equipment_score"
                        name="required_equipment_score" 
                        value={formData.required_equipment_score} 
                        onChange={handleChange}
                        onBlur={() => handleBlur('required_equipment_score')}
                        className="floating-field-select"
                      >
                        <option value="">Select Required Equipment</option>
                        {[1, 2, 3, 4, 5].map(v => (
                          <option key={v} value={v}>
                            {v} - {v === 1 ? 'Low Demand' : v === 2 ? 'Moderate' : v === 3 ? 'Standard' : v === 4 ? 'High Need' : 'Critical Machinery'}
                          </option>
                        ))}
                      </select>
                    )
                  })}

                  {renderFloatingField({
                    label: 'Supplier Network Access (1-5)',
                    name: 'supplier_availability_score',
                    isRequired: true,
                    isSelect: true,
                    children: (
                      <select 
                        id="supplier_availability_score"
                        name="supplier_availability_score" 
                        value={formData.supplier_availability_score} 
                        onChange={handleChange}
                        onBlur={() => handleBlur('supplier_availability_score')}
                        className="floating-field-select"
                      >
                        <option value="">Select Supplier Availability</option>
                        {[1, 2, 3, 4, 5].map(v => (
                          <option key={v} value={v}>
                            {v} - {v === 1 ? 'Scarce' : v === 2 ? 'Limited' : v === 3 ? 'Moderate' : v === 4 ? 'Reliable' : 'Abundant'}
                          </option>
                        ))}
                      </select>
                    )
                  })}
                </div>
              </div>
            )}

            {/* STEP 3: Enterprise Baseline & Expansion Scope (Optional Planning Metrics) */}
            {currentStep === 3 && (
              <div className="form-step-content">
                <div className="modal-section-header first-section">
                  <div className="modal-section-title-wrap" style={{ color: '#818cf8' }}>
                    <Briefcase size={16} />
                    <span>Enterprise Baseline & Investment Scope (Optional)</span>
                  </div>
                  <div className="modal-section-line" />
                </div>

                <div style={{ 
                  background: 'rgba(99, 102, 241, 0.08)', 
                  border: '1px solid rgba(99, 102, 241, 0.25)', 
                  padding: '0.75rem 1rem', 
                  borderRadius: '10px', 
                  marginBottom: '1.25rem',
                  fontSize: '0.8rem',
                  color: '#cbd5e1',
                  lineHeight: 1.5
                }}>
                  <strong style={{ color: '#818cf8' }}>Strategic Planning Context:</strong> The fields below are optional supplementary inputs. When provided, they enable accurate <strong>Payback Period</strong> calculations and <strong>Section 04 Capital Recovery</strong> estimates in your Strategic Business Growth Plan.
                </div>

                <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                  {renderFloatingField({
                    label: 'Current Monthly Revenue (LKR)',
                    name: 'current_monthly_revenue_lkr',
                    helperText: 'Existing parent enterprise average monthly revenue.',
                    children: (
                      <input 
                        id="current_monthly_revenue_lkr"
                        type="number" 
                        name="current_monthly_revenue_lkr" 
                        value={formData.current_monthly_revenue_lkr} 
                        onChange={handleChange}
                        step="25000" 
                        min="0" 
                        placeholder="e.g. 1200000"
                        className="floating-field-input" 
                      />
                    )
                  })}

                  {renderFloatingField({
                    label: 'Current Monthly Net Profit (LKR)',
                    name: 'current_monthly_net_profit_lkr',
                    helperText: 'Net cash profit generated by existing operations before expansion.',
                    children: (
                      <input 
                        id="current_monthly_net_profit_lkr"
                        type="number" 
                        name="current_monthly_net_profit_lkr" 
                        value={formData.current_monthly_net_profit_lkr} 
                        onChange={handleChange}
                        step="10000" 
                        min="0" 
                        placeholder="e.g. 180000"
                        className="floating-field-input" 
                      />
                    )
                  })}

                  {renderFloatingField({
                    label: 'Existing Monthly Debt Repayments (LKR)',
                    name: 'existing_monthly_debt_obligations_lkr',
                    helperText: 'Current ongoing monthly loan servicing obligations.',
                    children: (
                      <input 
                        id="existing_monthly_debt_obligations_lkr"
                        type="number" 
                        name="existing_monthly_debt_obligations_lkr" 
                        value={formData.existing_monthly_debt_obligations_lkr} 
                        onChange={handleChange}
                        step="5000" 
                        min="0" 
                        placeholder="e.g. 35000"
                        className="floating-field-input" 
                      />
                    )
                  })}

                  {renderFloatingField({
                    label: 'Business Operating Age (Years)',
                    name: 'business_age_years',
                    helperText: 'How many years the parent enterprise has been actively operating.',
                    children: (
                      <input 
                        id="business_age_years"
                        type="number" 
                        name="business_age_years" 
                        value={formData.business_age_years} 
                        onChange={handleChange}
                        min="0" 
                        step="0.5"
                        placeholder="e.g. 4"
                        className="floating-field-input" 
                      />
                    )
                  })}

                  {renderFloatingField({
                    label: 'One-Time Expansion CapEx (LKR)',
                    name: 'expansion_capex_lkr',
                    helperText: 'One-time renovation, machinery, or fitting expenditure for this expansion.',
                    children: (
                      <input 
                        id="expansion_capex_lkr"
                        type="number" 
                        name="expansion_capex_lkr" 
                        value={formData.expansion_capex_lkr} 
                        onChange={handleChange}
                        step="25000" 
                        min="0" 
                        placeholder="e.g. 600000"
                        className="floating-field-input" 
                      />
                    )
                  })}

                  {renderFloatingField({
                    label: 'Target Payback Period (Months)',
                    name: 'target_payback_months',
                    helperText: 'Target timeframe in months to recover expansion CapEx.',
                    children: (
                      <input 
                        id="target_payback_months"
                        type="number" 
                        name="target_payback_months" 
                        value={formData.target_payback_months} 
                        onChange={handleChange}
                        min="1" 
                        placeholder="e.g. 12"
                        className="floating-field-input" 
                      />
                    )
                  })}

                  {renderFloatingField({
                    label: 'Current Capacity Utilization (%)',
                    name: 'current_capacity_utilization_pct',
                    helperText: 'Estimated utilization percentage of your existing facility or staff.',
                    children: (
                      <input 
                        id="current_capacity_utilization_pct"
                        type="number" 
                        name="current_capacity_utilization_pct" 
                        value={formData.current_capacity_utilization_pct} 
                        onChange={handleChange}
                        min="0" 
                        max="100" 
                        placeholder="e.g. 85"
                        className="floating-field-input" 
                      />
                    )
                  })}

                  {renderFloatingField({
                    label: 'Expansion Type Model',
                    name: 'expansion_type',
                    isSelect: true,
                    children: (
                      <select 
                        id="expansion_type"
                        name="expansion_type" 
                        value={formData.expansion_type} 
                        onChange={handleChange}
                        className="floating-field-select"
                      >
                        <option value="">Select Expansion Type</option>
                        {EXPANSION_TYPES.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    )
                  })}
                </div>

                <div className="modal-section-header" style={{ marginTop: '1.25rem' }}>
                  <div className="modal-section-title-wrap" style={{ color: '#c084fc' }}>
                    <FileText size={16} />
                    <span>Expansion Strategy Narrative (Optional)</span>
                  </div>
                  <div className="modal-section-line" />
                </div>

                {renderFloatingField({
                  label: 'Customer Retention & Expansion Marketing',
                  name: 'marketing_details',
                  isTextarea: true,
                  children: (
                    <textarea 
                      id="marketing_details"
                      name="marketing_details" 
                      value={formData.marketing_details} 
                      onChange={handleChange}
                      rows={3}
                      placeholder="e.g. Announcing new product line to existing loyalty members, cross-promotions, neighborhood outreach..."
                      className="floating-field-textarea" 
                    />
                  )
                })}

                {renderFloatingField({
                  label: 'Competitive Defense & Growth Differentiator',
                  name: 'competitor_information',
                  isTextarea: true,
                  children: (
                    <textarea 
                      id="competitor_information"
                      name="competitor_information" 
                      value={formData.competitor_information} 
                      onChange={handleChange}
                      rows={3}
                      placeholder="e.g. How this expansion strengthens your market share against local competitors in your catchment..."
                      className="floating-field-textarea" 
                    />
                  )
                })}
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="modal-footer-section">
            <div className="modal-footer-left">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={() => handlePrevStep(currentStep - 1)}
                  className="btn btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                >
                  <ArrowLeft size={15} />
                  <span>Previous</span>
                </button>
              )}
            </div>

            <div className="modal-footer-right">
              {currentStep === 1 && (
                <button
                  type="button"
                  onClick={handleNextStep1}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                >
                  <span>Continue to Expansion Capital</span>
                  <ArrowRight size={15} />
                </button>
              )}

              {currentStep === 2 && (
                <button
                  type="button"
                  onClick={handleNextStep2}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                >
                  <span>Continue to Baseline Metrics</span>
                  <ArrowRight size={15} />
                </button>
              )}

              {currentStep === 3 && (
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', minWidth: '200px', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Evaluating Expansion...</span>
                    </>
                  ) : (
                    <>
                      <TrendingUp size={16} />
                      <span>Evaluate Expansion Feasibility</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
