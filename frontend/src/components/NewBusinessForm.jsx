import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Building, 
  DollarSign, 
  Users, 
  Rocket, 
  Sparkles, 
  AlertCircle, 
  Info, 
  ArrowLeft, 
  ArrowRight, 
  X, 
  ChevronDown, 
  Loader2, 
  FileText,
  Check
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

const STARTUP_ACTIONS = [
  'Launch New Business Operations',
  'Establish Standalone Retail Store / Mart',
  'Open Dedicated Bakery / Food Production Outlet',
  'Launch Clothing / Garment Boutique',
  'Open Personal Care & Beauty Salon',
  'Establish Local Delivery & Direct Service Counter'
];

const EMPTY_STARTUP_STATE = {
  business_name: '',
  business_stage: 'New Startup',
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
  available_capital_lkr: 'Available Startup Capital (LKR)',
  monthly_budget_lkr: 'Expected Monthly Operating Budget (LKR)',
  expected_price_lkr: 'Average Customer Spend per Visit (LKR)',
  expected_customers_per_day: 'Expected Customers / Day',
  competition_level: 'Market Competition Level',
  customer_demand_score: 'Customer Demand Score',
  entrepreneur_experience_years: 'Relevant Business Experience (Years)',
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

export default function NewBusinessForm({ 
  initialValues = null, 
  aiFilledKeys = null, 
  aiNotice = null,
  onSubmit, 
  loading = false, 
  onSwitchToAi,
  onBack,
  onClose,
  onFormChange,
  stageBadge
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(() => {
    const merged = { ...EMPTY_STARTUP_STATE };
    if (initialValues) {
      Object.keys(EMPTY_STARTUP_STATE).forEach((k) => {
        if (initialValues[k] !== undefined && initialValues[k] !== null && initialValues[k] !== '') {
          merged[k] = initialValues[k];
        }
      });
    }
    merged.business_stage = 'New Startup';
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
        Object.keys(EMPTY_STARTUP_STATE).forEach((k) => {
          if (initialValues[k] !== undefined && initialValues[k] !== null && initialValues[k] !== '') {
            merged[k] = initialValues[k];
          }
        });
        merged.business_stage = 'New Startup';
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

  const filledCount = aiFilledKeys ? (aiFilledKeys instanceof Set ? aiFilledKeys.size : aiFilledKeys.length) : 0;

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
      return 'Available Capital cannot be negative.';
    }
    if (key === 'monthly_budget_lkr' && Number(val) < 0) {
      return 'Monthly Operating Budget cannot be negative.';
    }
    if (key === 'expected_price_lkr' && Number(val) <= 0) {
      return 'Average Customer Spend per Visit must be greater than 0.';
    }
    if (key === 'expected_customers_per_day' && Number(val) < 0) {
      return 'Expected Customers / Day cannot be negative.';
    }
    if (key === 'customer_demand_score' && (Number(val) < 1 || Number(val) > 100)) {
      return 'Customer Demand Score must be between 1 and 100.';
    }
    if (key === 'entrepreneur_experience_years' && Number(val) < 0) {
      return 'Entrepreneur Experience cannot be negative.';
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
      business_stage: 'New Startup',
      business_category: parseOptionalString(formData.business_category),
      business_model: parseOptionalString(formData.business_model) || 'Direct Retail / Service',
      district: parseOptionalString(formData.district) || 'Colombo',
      province: derivedProvince,
      address: parseOptionalString(formData.address),
      location_type: parseOptionalString(formData.location_type) || 'Suburban Commercial Hub',
      proposed_action: parseOptionalString(formData.proposed_action) || 'Launch New Business Operations',
      additional_description: parseOptionalString(formData.additional_description),
      marketing_details: parseOptionalString(formData.marketing_details),
      competitor_information: parseOptionalString(formData.competitor_information),
      financial_overview: parseOptionalString(formData.financial_overview),
      
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
    };

    ['business_name', 'address', 'business_model', 'additional_description', 'marketing_details', 'competitor_information', 'financial_overview'].forEach((k) => {
      if (!finalPayload[k]) {
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
    charCounter = null,
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

        {!showError && charCounter && (
          <div className="floating-field-counter">
            {charCounter}
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
        {/* Background Glow */}
        <div className="modal-deco-backdrop">
          <div className="modal-deco-glow" />
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
                background: 'rgba(56, 189, 248, 0.15)', 
                color: '#38bdf8', 
                border: '1px solid rgba(56, 189, 248, 0.35)', 
                padding: '0.2rem 0.65rem', 
                borderRadius: '16px', 
                fontSize: '0.75rem', 
                fontWeight: 700, 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.35rem' 
              }}
            >
              <Rocket size={12} /> New Business Feasibility Intake
            </span>
          </div>

          <h2 id="modal-title" className="modal-title" style={{ marginTop: '0.5rem' }}>
            {currentStep === 1 && '1. Startup Profile & Catchment Location'}
            {currentStep === 2 && '2. Financial Capital, Demand & Setup Readiness'}
            {currentStep === 3 && '3. Startup Strategy & Plan Narrative (Optional)'}
          </h2>

          <p className="modal-subtitle">
            {currentStep === 1 && 'Define your new enterprise concept, category, model, and physical district location.'}
            {currentStep === 2 && 'Detail your available startup capital, expected customer throughput, and initial setup requirements.'}
            {currentStep === 3 && 'Provide supplementary marketing, competitor, and financial strategy details for your personalized plan.'}
          </p>

          {/* Stepper */}
          <div className="form-step-stepper">
            <div 
              className={`form-step-pill ${currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : ''}`}
              onClick={() => { if (currentStep > 1) handlePrevStep(1); }}
              style={{ cursor: currentStep > 1 ? 'pointer' : 'default' }}
            >
              <div className="form-step-number">{currentStep > 1 ? <Check size={11} /> : '1'}</div>
              <span className="form-step-label">Startup Profile</span>
            </div>

            <div className={`form-step-track ${currentStep > 1 ? 'filled' : ''}`} />

            <div 
              className={`form-step-pill ${currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : ''}`}
              onClick={() => { if (currentStep > 2) handlePrevStep(2); }}
              style={{ cursor: currentStep > 2 ? 'pointer' : 'default' }}
            >
              <div className="form-step-number">{currentStep > 2 ? <Check size={11} /> : '2'}</div>
              <span className="form-step-label">Capital & Operations</span>
            </div>

            <div className={`form-step-track ${currentStep > 2 ? 'filled' : ''}`} />

            <div className={`form-step-pill ${currentStep === 3 ? 'active' : ''}`}>
              <div className="form-step-number">3</div>
              <span className="form-step-label">Strategy Narrative</span>
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
            
            {/* STEP 1: Startup Profile & Location */}
            {currentStep === 1 && (
              <div className="form-step-content">
                <div className="modal-section-header first-section">
                  <div className="modal-section-title-wrap" style={{ color: '#60a5fa' }}>
                    <Building size={16} />
                    <span>Startup Profile & Location</span>
                  </div>
                  <div className="modal-section-line" />
                </div>

                {renderFloatingField({
                  label: 'Business Name',
                  name: 'business_name',
                  helperText: 'Optional. Leave blank to generate an automatic commercial reference.',
                  children: (
                    <input 
                      id="business_name"
                      type="text" 
                      name="business_name" 
                      value={formData.business_name} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('business_name')}
                      placeholder="e.g. Colombo Fresh Mart"
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
                  label: 'Business Model',
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
                  helperText: 'Province is derived automatically based on the selected Sri Lankan district.',
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
                  label: 'Operating Location Type',
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
                  label: 'Proposed Startup Action',
                  name: 'proposed_action',
                  isSelect: true,
                  helperText: 'Select the primary launch activity for this new venture.',
                  children: (
                    <select 
                      id="proposed_action"
                      name="proposed_action" 
                      value={formData.proposed_action} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('proposed_action')}
                      className="floating-field-select"
                    >
                      <option value="">Select Startup Action</option>
                      {STARTUP_ACTIONS.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  )
                })}

                {renderFloatingField({
                  label: 'Startup Concept & Value Proposition',
                  name: 'additional_description',
                  isTextarea: true,
                  helperText: 'Briefly describe your target customers, offerings, and competitive strengths.',
                  children: (
                    <textarea 
                      id="additional_description"
                      name="additional_description" 
                      value={formData.additional_description} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('additional_description')}
                      rows={3}
                      placeholder="e.g. A neighborhood mini-mart offering fresh produce, daily essentials, and doorstep delivery..."
                      className="floating-field-textarea" 
                    />
                  )
                })}
              </div>
            )}

            {/* STEP 2: Capital, Demand & Operations */}
            {currentStep === 2 && (
              <div className="form-step-content">
                <div className="modal-section-header first-section">
                  <div className="modal-section-title-wrap" style={{ color: 'var(--accent-teal)' }}>
                    <DollarSign size={16} />
                    <span>Startup Capital & Financial Estimates</span>
                  </div>
                  <div className="modal-section-line" />
                </div>

                {renderFloatingField({
                  label: 'Available Startup Capital (LKR)',
                  name: 'available_capital_lkr',
                  isRequired: true,
                  helperText: 'Total personal/partner funds committed specifically to start this business.',
                  children: (
                    <input 
                      id="available_capital_lkr"
                      type="number" 
                      name="available_capital_lkr" 
                      value={formData.available_capital_lkr} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('available_capital_lkr')}
                      step="10000" 
                      min="0" 
                      placeholder="e.g. 1000000"
                      className="floating-field-input" 
                    />
                  )
                })}

                {renderFloatingField({
                  label: 'Planned Loan Financing (LKR)',
                  name: 'loan_amount_lkr',
                  helperText: 'Optional. Enter 0 or leave blank if no external loan is required.',
                  children: (
                    <input 
                      id="loan_amount_lkr"
                      type="number" 
                      name="loan_amount_lkr" 
                      value={formData.loan_amount_lkr} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('loan_amount_lkr')}
                      step="25000" 
                      min="0" 
                      placeholder="e.g. 200000"
                      className="floating-field-input" 
                    />
                  )
                })}

                {renderFloatingField({
                  label: 'Expected Monthly Operating Budget (LKR)',
                  name: 'monthly_budget_lkr',
                  isRequired: true,
                  helperText: 'Anticipated monthly operating expenditure (rent, utilities, baseline payroll, replenish stock).',
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
                      placeholder="e.g. 150000"
                      className="floating-field-input" 
                    />
                  )
                })}

                {renderFloatingField({
                  label: 'Initial Inventory Investment (LKR)',
                  name: 'initial_inventory_cost_lkr',
                  helperText: 'Upfront capital allocated to purchase initial merchandise stock or raw materials.',
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
                      placeholder="e.g. 200000"
                      className="floating-field-input" 
                    />
                  )
                })}

                {renderFloatingField({
                  label: 'Average Customer Spend per Visit (LKR)',
                  name: 'expected_price_lkr',
                  isRequired: true,
                  helperText: 'Approximate average basket value per visit. For single-item sales, enter average unit price.',
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
                      placeholder="e.g. 450"
                      className="floating-field-input" 
                    />
                  )
                })}

                <div className="modal-section-header">
                  <div className="modal-section-title-wrap" style={{ color: '#c084fc' }}>
                    <Users size={16} />
                    <span>Market Demand & Operational Readiness</span>
                  </div>
                  <div className="modal-section-line" />
                </div>

                {renderFloatingField({
                  label: 'Expected Customers / Day',
                  name: 'expected_customers_per_day',
                  isRequired: true,
                  children: (
                    <input 
                      id="expected_customers_per_day"
                      type="number" 
                      name="expected_customers_per_day" 
                      value={formData.expected_customers_per_day} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('expected_customers_per_day')}
                      min="1" 
                      placeholder="e.g. 50"
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
                      <option value="Low">Low - Very few nearby alternatives</option>
                      <option value="Moderate">Moderate - Established local competitors</option>
                      <option value="High">High - Intense commercial rivalry</option>
                    </select>
                  )
                })}

                {renderFloatingField({
                  label: 'Customer Demand Score (1-100)',
                  name: 'customer_demand_score',
                  isRequired: true,
                  helperText: 'Local consumer interest level (e.g. 20 = low footfall, 50 = steady demand, 80+ = high customer demand).',
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
                      placeholder="e.g. 65"
                      className="floating-field-input" 
                    />
                  )
                })}

                {renderFloatingField({
                  label: 'Relevant Business or Entrepreneurial Experience (Years)',
                  name: 'entrepreneur_experience_years',
                  isRequired: true,
                  helperText: 'Years of practical experience in managing a business, retail, or relevant industry operations.',
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
                      placeholder="e.g. 3"
                      className="floating-field-input" 
                    />
                  )
                })}

                {renderFloatingField({
                  label: 'Available Initial Staff Count',
                  name: 'available_staff_count',
                  isRequired: true,
                  helperText: 'Number of active founders and hired employees ready to work on launch day.',
                  children: (
                    <input 
                      id="available_staff_count"
                      type="number" 
                      name="available_staff_count" 
                      value={formData.available_staff_count} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('available_staff_count')}
                      min="0" 
                      placeholder="e.g. 2"
                      className="floating-field-input" 
                    />
                  )
                })}

                {renderFloatingField({
                  label: 'Location Suitability (1-5)',
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
                          {v} - {v === 1 ? 'Very Low Accessibility' : v === 2 ? 'Suboptimal' : v === 3 ? 'Standard Commercial' : v === 4 ? 'Prime Footfall' : 'Exceptional Hub'}
                        </option>
                      ))}
                    </select>
                  )
                })}

                <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.85rem' }}>
                  {renderFloatingField({
                    label: 'Available Equipment (1-5)',
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
                        <option value="">Select Available Equipment</option>
                        {[1, 2, 3, 4, 5].map(v => (
                          <option key={v} value={v}>
                            {v} - {v === 1 ? 'Minimal' : v === 2 ? 'Basic' : v === 3 ? 'Adequate' : v === 4 ? 'Well Equipped' : 'Fully Equipped'}
                          </option>
                        ))}
                      </select>
                    )
                  })}

                  {renderFloatingField({
                    label: 'Required Equipment (1-5)',
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
                            {v} - {v === 1 ? 'Low Demand' : v === 2 ? 'Moderate' : v === 3 ? 'Standard' : v === 4 ? 'High Need' : 'Critical'}
                          </option>
                        ))}
                      </select>
                    )
                  })}

                  {renderFloatingField({
                    label: 'Supplier Availability (1-5)',
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

            {/* STEP 3: Startup Strategy & Plan Narrative (Optional) */}
            {currentStep === 3 && (
              <div className="form-step-content">
                <div className="modal-section-header first-section">
                  <div className="modal-section-title-wrap" style={{ color: 'var(--accent-teal)' }}>
                    <FileText size={16} />
                    <span>Startup Strategy & Plan Details (Optional)</span>
                  </div>
                  <div className="modal-section-line" />
                </div>

                <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '1.25rem', lineHeight: '1.5' }}>
                  The fields below are optional, but will be directly synthesized into your generated Strategic Business Plan document.
                </p>

                {renderFloatingField({
                  label: 'Marketing & Customer Acquisition Strategy',
                  name: 'marketing_details',
                  isTextarea: true,
                  children: (
                    <textarea 
                      id="marketing_details"
                      name="marketing_details" 
                      value={formData.marketing_details} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('marketing_details')}
                      rows={3}
                      placeholder="e.g. Local neighborhood flyers, WhatsApp group ordering, promotional introductory discount bundles..."
                      className="floating-field-textarea" 
                    />
                  )
                })}

                {renderFloatingField({
                  label: 'Competitor Context & Positioning',
                  name: 'competitor_information',
                  isTextarea: true,
                  children: (
                    <textarea 
                      id="competitor_information"
                      name="competitor_information" 
                      value={formData.competitor_information} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('competitor_information')}
                      rows={3}
                      placeholder="e.g. 2 traditional stores nearby; we differentiate via extended opening hours and curated fresh groceries..."
                      className="floating-field-textarea" 
                    />
                  )
                })}

                {renderFloatingField({
                  label: 'Financial Outlook & Working Capital Strategy',
                  name: 'financial_overview',
                  isTextarea: true,
                  children: (
                    <textarea 
                      id="financial_overview"
                      name="financial_overview" 
                      value={formData.financial_overview} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('financial_overview')}
                      rows={3}
                      placeholder="e.g. Maintaining 3 months working capital reserve, reinvesting opening profits into inventory expansion..."
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
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                >
                  <span>Continue to Capital & Operations</span>
                  <ArrowRight size={15} />
                </button>
              )}

              {currentStep === 2 && (
                <button
                  type="button"
                  onClick={handleNextStep2}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                >
                  <span>Continue to Plan Narrative</span>
                  <ArrowRight size={15} />
                </button>
              )}

              {currentStep === 3 && (
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', minWidth: '180px' }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Evaluating Startup...</span>
                    </>
                  ) : (
                    <>
                      <Rocket size={16} />
                      <span>Evaluate Feasibility</span>
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
