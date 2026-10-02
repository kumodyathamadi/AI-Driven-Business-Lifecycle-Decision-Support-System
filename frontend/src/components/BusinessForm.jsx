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
  Sliders, 
  X, 
  ChevronDown, 
  Loader2, 
  FileText,
  Check,
  Lock
} from 'lucide-react';

const SRI_LANKA_DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
  'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
  'Monaragala', 'Ratnapura', 'Kegalle'
];

const EMPTY_FORM_STATE = {
  business_name: '',
  business_stage: '',
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
  business_stage: 'Business Stage',
  business_category: 'Business Category',
  business_model: 'Business Model',
  district: 'District',
  location_type: 'Location Type',
  available_capital_lkr: 'Available Capital (LKR)',
  monthly_budget_lkr: 'Monthly Operating Budget (LKR)',
  expected_price_lkr: 'Expected Price / Unit (LKR)',
  expected_customers_per_day: 'Expected Customers / Day',
  competition_level: 'Market Competition Level',
  customer_demand_score: 'Customer Demand Score',
  entrepreneur_experience_years: 'Entrepreneur Experience (Years)',
  available_staff_count: 'Available Staff Count',
  location_suitability_score: 'Location Suitability Score',
  available_equipment_score: 'Available Equipment Readiness',
  required_equipment_score: 'Required Equipment Need',
  supplier_availability_score: 'Supplier Availability'
};

const parseOptionalNumber = (val) => {
  if (val === '' || val === null || val === undefined) return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
};

const parseOptionalString = (val) => {
  if (val === '' || val === null || val === undefined) return null;
  const s = String(val).trim();
  return s.length > 0 ? s : null;
};

export default function BusinessForm({ 
  initialValues = null, 
  aiFilledKeys = null, 
  aiNotice = null,
  onSubmit, 
  loading = false, 
  onSwitchToAi,
  onBack,
  onClose,
  onFormChange,
  stageBadge,
  isStageLocked = false
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(() => {
    const merged = { ...EMPTY_FORM_STATE };
    if (initialValues) {
      Object.keys(EMPTY_FORM_STATE).forEach((k) => {
        if (initialValues[k] !== undefined && initialValues[k] !== null && initialValues[k] !== '') {
          merged[k] = initialValues[k];
        }
      });
    }
    if (isStageLocked && !merged.business_stage) {
      merged.business_stage = 'New';
    }
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

  // Sync initialValues if updated externally
  useEffect(() => {
    if (initialValues) {
      setFormData((prev) => {
        const merged = { ...prev };
        Object.keys(EMPTY_FORM_STATE).forEach((k) => {
          if (initialValues[k] !== undefined && initialValues[k] !== null && initialValues[k] !== '') {
            merged[k] = initialValues[k];
          }
        });
        if (isStageLocked && !merged.business_stage) {
          merged.business_stage = 'New';
        }
        return merged;
      });
    }
  }, [initialValues, isStageLocked]);

  // Focus management & Escape key listener - RUNS ONLY ON MOUNT
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

      // Focus trap
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length > 0) {
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
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
  }, []); // Run once on mount to avoid stealing focus on typing

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

  // Validation checks
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

    // Range checks when values are provided
    if (key === 'available_capital_lkr' && Number(val) < 0) {
      return 'Available Capital cannot be negative.';
    }
    if (key === 'monthly_budget_lkr' && Number(val) < 0) {
      return 'Monthly Operating Budget cannot be negative.';
    }
    if (key === 'expected_price_lkr' && Number(val) <= 0) {
      return 'Expected Price / Unit must be greater than 0.';
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

  // Step 1 Navigation with validation
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
        setValidationError(`Please complete all required fields in Section 1: ${labels}.`);
      }
      return;
    }

    setValidationError('');
    setCurrentStep(2);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  // Step 2 Navigation with validation
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
        setValidationError(`Please complete all required fields in Section 2: ${labels}.`);
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

    const finalPayload = {
      business_name: parseOptionalString(formData.business_name),
      business_stage: parseOptionalString(formData.business_stage) || 'New',
      business_category: parseOptionalString(formData.business_category),
      business_model: parseOptionalString(formData.business_model),
      district: parseOptionalString(formData.district) || 'Colombo',
      address: parseOptionalString(formData.address),
      location_type: parseOptionalString(formData.location_type) || 'Suburban Commercial Hub',
      proposed_action: parseOptionalString(formData.proposed_action) || 'Establish New Business',
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

    // Clean optional narrative fields only, NEVER delete required business inputs
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

  // Reusable Floating Field Wrapper
  const renderFloatingField = ({
    label,
    name,
    isRequired = false,
    isSelect = false,
    isTextarea = false,
    isLocked = false,
    lockedBadge = null,
    helperText = null,
    children,
    charCounter = null,
  }) => {
    const errorMsg = getFieldError(name);
    const showError = (touched[name] || submitted) && !!errorMsg;
    const filledWithAi = isAiFilled(name) && formData[name] !== '' && formData[name] !== null;

    return (
      <div style={{ width: '100%' }}>
        <div className={`floating-field-container ${isTextarea ? 'is-textarea-field' : ''} ${showError ? 'has-error' : ''} ${isLocked ? 'is-locked-field' : ''}`}>
          <div className="floating-field-top">
            <label htmlFor={name} className="floating-field-label">
              <span>{label}</span>
              {isRequired && <span className="req-asterisk">*</span>}
            </label>
            {isLocked && (
              <span className="floating-field-locked-badge">
                <Lock size={10} />
                <span>{lockedBadge || 'Selected in Step 1'}</span>
              </span>
            )}
            {filledWithAi && !isLocked && (
              <span style={{ 
                fontSize: '0.68rem', 
                color: '#7e22ce', 
                background: 'rgba(168, 85, 247, 0.12)', 
                border: '1px solid rgba(168, 85, 247, 0.35)', 
                padding: '0.08rem 0.4rem', 
                borderRadius: '4px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem'
              }}>
                <Sparkles size={10} /> AI-filled
              </span>
            )}
          </div>

          {isSelect ? (
            <div className={`floating-select-wrapper ${isLocked ? 'is-locked-select-wrapper' : ''}`}>
              {children}
              {isLocked ? (
                <Lock size={15} className="floating-select-chevron floating-select-locked-icon" />
              ) : (
                <ChevronDown size={16} className="floating-select-chevron" />
              )}
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
        {/* Abstract Background Top Decoration */}
        <div className="modal-deco-backdrop">
          <div className="modal-deco-glow" />
          <div className="modal-deco-card modal-deco-left">
            <div className="modal-deco-line" style={{ width: '45%' }} />
            <div className="modal-deco-line" style={{ width: '85%' }} />
            <div className="modal-deco-line" style={{ width: '70%' }} />
            <div className="modal-deco-line" style={{ width: '90%' }} />
          </div>
          <div className="modal-deco-card modal-deco-right">
            <div className="modal-deco-line" style={{ width: '60%' }} />
            <div className="modal-deco-bar-chart">
              <div className="modal-deco-bar" style={{ height: '35%' }} />
              <div className="modal-deco-bar" style={{ height: '60%', background: 'rgba(20, 184, 166, 0.45)' }} />
              <div className="modal-deco-bar" style={{ height: '45%' }} />
              <div className="modal-deco-bar" style={{ height: '80%', background: 'rgba(99, 102, 241, 0.45)' }} />
            </div>
          </div>
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
                <span>Back to Type</span>
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

            <button 
              type="button" 
              onClick={handleCloseAction} 
              className="modal-close-btn" 
              aria-label="Close dialog"
              id="modal-btn-close-x"
            >
              <X size={16} />
            </button>
          </div>

          {/* Centered Circular Icon Ring */}
          <div className="modal-icon-ring">
            {currentStep === 1 ? (
              <Building size={24} style={{ color: 'var(--accent-teal)' }} />
            ) : currentStep === 2 ? (
              <Sliders size={24} style={{ color: 'var(--accent-teal)' }} />
            ) : (
              <FileText size={24} style={{ color: 'var(--accent-teal)' }} />
            )}
          </div>

          <h2 id="modal-title" className="modal-title">
            {currentStep === 1 && '1. Business & Location'}
            {currentStep === 2 && '2. Business Operations & Resources'}
            {currentStep === 3 && '3. Business Plan Details'}
          </h2>

          <div className="modal-badge-row">
            {stageBadge}
          </div>

          <p className="modal-subtitle">
            {currentStep === 1 && 'Set up your business stage, model, category, and physical location.'}
            {currentStep === 2 && 'Define your financial budget, market demand, and operational readiness.'}
            {currentStep === 3 && 'Provide optional strategy, competitor, and financial details for your plan.'}
          </p>

          {/* 3-Step Progress Stepper */}
          <div className="form-step-stepper">
            <div 
              className={`form-step-pill ${currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : ''}`}
              onClick={() => { if (currentStep > 1) handlePrevStep(1); }}
              style={{ cursor: currentStep > 1 ? 'pointer' : 'default' }}
              title="Section 1: Business & Location"
            >
              <div className="form-step-number">{currentStep > 1 ? <Check size={11} /> : '1'}</div>
              <span className="form-step-label">Business & Location</span>
            </div>

            <div className={`form-step-track ${currentStep > 1 ? 'filled' : ''}`} />

            <div 
              className={`form-step-pill ${currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : ''}`}
              onClick={() => { if (currentStep > 2) handlePrevStep(2); }}
              style={{ cursor: currentStep > 2 ? 'pointer' : 'default' }}
              title="Section 2: Business Operations & Resources"
            >
              <div className="form-step-number">{currentStep > 2 ? <Check size={11} /> : '2'}</div>
              <span className="form-step-label">Operations & Resources</span>
            </div>

            <div className={`form-step-track ${currentStep > 2 ? 'filled' : ''}`} />

            <div 
              className={`form-step-pill ${currentStep === 3 ? 'active' : ''}`}
              title="Section 3: Business Plan Details"
            >
              <div className="form-step-number">3</div>
              <span className="form-step-label">Plan Details</span>
            </div>
          </div>

          {/* AI Prefill Notice Summary */}
          {filledCount > 0 && currentStep === 1 && (
            <div style={{ 
              background: 'rgba(20, 184, 166, 0.08)', 
              border: '1px solid rgba(20, 184, 166, 0.25)', 
              padding: '0.6rem 0.95rem', 
              borderRadius: '8px', 
              marginTop: '0.75rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.65rem',
              textAlign: 'left'
            }}>
              <Sparkles size={16} style={{ color: 'var(--accent-teal)', flexShrink: 0 }} />
              <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                We structured <strong style={{ color: '#ffffff' }}>{filledCount} details</strong> from your description. Fields with <Sparkles size={10} style={{ color: '#c084fc', display: 'inline' }} /> <strong>AI-filled</strong> can be adjusted freely.
              </div>
            </div>
          )}

          {/* Fallback Notice */}
          {aiNotice && currentStep === 1 && (
            <div style={{ 
              background: 'rgba(234, 179, 8, 0.1)', 
              border: '1px solid rgba(234, 179, 8, 0.25)', 
              padding: '0.6rem 0.95rem', 
              borderRadius: '8px', 
              marginTop: '0.75rem', 
              color: '#fde047', 
              fontSize: '0.76rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.6rem',
              textAlign: 'left'
            }}>
              <Info size={16} style={{ flexShrink: 0 }} />
              <span>{aiNotice}</span>
            </div>
          )}

          {/* Top Validation Error Banner */}
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

        {/* Scrollable Modal Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="modal-body-scroll" ref={scrollContainerRef}>
            
            {/* ========================================================================= */}
            {/* SECTION 1 — Business & Location */}
            {/* ========================================================================= */}
            {currentStep === 1 && (
              <div className="form-step-content">
                <div className="modal-section-header first-section">
                  <div className="modal-section-title-wrap" style={{ color: '#60a5fa' }}>
                    <Building size={16} />
                    <span>Business Profile & Location</span>
                  </div>
                  <div className="modal-section-line" />
                </div>

                {renderFloatingField({
                  label: 'Business / Company Name',
                  name: 'business_name',
                  helperText: 'Enter the planned or registered trading name for your business.',
                  children: (
                    <input 
                      id="business_name"
                      name="business_name"
                      type="text" 
                      value={formData.business_name} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('business_name')}
                      placeholder="e.g. Waasana Grocery Shop"
                      className="floating-field-input"
                      maxLength={80}
                    />
                  )
                })}

                {renderFloatingField({
                  label: 'Business Stage',
                  name: 'business_stage',
                  isRequired: true,
                  isSelect: true,
                  isLocked: isStageLocked,
                  lockedBadge: 'Selected in Step 1',
                  helperText: isStageLocked ? 'Locked to New Startup from your Step 1 choice. Click "Back to Type" above to change.' : null,
                  children: (
                    <select 
                      id="business_stage"
                      name="business_stage" 
                      value={formData.business_stage || (isStageLocked ? 'New' : '')} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('business_stage')}
                      disabled={isStageLocked}
                      className="floating-field-select"
                      style={isStageLocked ? { cursor: 'not-allowed', color: '#f8fafc', fontWeight: 600 } : undefined}
                      aria-disabled={isStageLocked}
                    >
                      <option value="New">New Startup</option>
                      {!isStageLocked && (
                        <>
                          <option value="">Select Business Stage</option>
                          <option value="Existing">Existing Business Expansion</option>
                        </>
                      )}
                    </select>
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
                      <option value="">Select Business Category</option>
                      <option value="Grocery / Mini-Mart">Grocery / Mini-Mart</option>
                      <option value="Clothing / Garment">Clothing / Garment</option>
                      <option value="Beauty Salon">Beauty Salon</option>
                      <option value="Bakery / Food / Grocery">Bakery / Food / Grocery</option>
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
                      <option value="">Select Business Model</option>
                      <option value="B2B (Business to Business)">B2B (Business to Business)</option>
                      <option value="B2C (Business to Consumer)">B2C (Business to Consumer)</option>
                      <option value="B2B2C (Business to Business to Consumer)">B2B2C (Business to Business to Consumer)</option>
                      <option value="Marketplace">Marketplace</option>
                      <option value="Subscription">Subscription</option>
                      <option value="E-commerce">E-commerce</option>
                      <option value="Franchise">Franchise</option>
                      <option value="Other">Other</option>
                    </select>
                  )
                })}

                {renderFloatingField({
                  label: 'District',
                  name: 'district',
                  isRequired: true,
                  isSelect: true,
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
                        <option key={d} value={d}>{d} District</option>
                      ))}
                    </select>
                  )
                })}

                {renderFloatingField({
                  label: 'Address',
                  name: 'address',
                  children: (
                    <input 
                      id="address"
                      type="text" 
                      name="address" 
                      value={formData.address} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('address')}
                      placeholder="Street address or local landmark"
                      className="floating-field-input" 
                    />
                  )
                })}

                {renderFloatingField({
                  label: 'Location Type',
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
                      <option value="">Select Location Type</option>
                      <option value="Suburban Commercial Hub">Suburban Commercial Hub (e.g. Homagama)</option>
                      <option value="Urban Main Street">Urban Main Street</option>
                      <option value="Industrial Zone">Industrial / Commercial Zone</option>
                      <option value="Home Based">Home-Based Operations</option>
                      <option value="Other">Other</option>
                    </select>
                  )
                })}

                {renderFloatingField({
                  label: 'Proposed Action',
                  name: 'proposed_action',
                  children: (
                    <input 
                      id="proposed_action"
                      type="text" 
                      name="proposed_action" 
                      value={formData.proposed_action} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('proposed_action')}
                      placeholder="e.g. Establish New Bakery Branch"
                      className="floating-field-input" 
                    />
                  )
                })}

                {renderFloatingField({
                  label: 'Additional Description',
                  name: 'additional_description',
                  isTextarea: true,
                  charCounter: formData.additional_description ? `${formData.additional_description.length} characters` : null,
                  children: (
                    <textarea 
                      id="additional_description"
                      name="additional_description" 
                      value={formData.additional_description} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('additional_description')}
                      rows={3}
                      placeholder="Tell us more about your business idea, expansion, or what you would like to achieve."
                      className="floating-field-textarea" 
                    />
                  )
                })}
              </div>
            )}

            {/* ========================================================================= */}
            {/* SECTION 2 — Business Operations & Resources */}
            {/* ========================================================================= */}
            {currentStep === 2 && (
              <div className="form-step-content">
                
                {/* Financial Capital & Budget Subgroup */}
                <div className="modal-section-header first-section">
                  <div className="modal-section-title-wrap" style={{ color: '#818cf8' }}>
                    <DollarSign size={16} />
                    <span>Financial Capital & Budget</span>
                  </div>
                  <div className="modal-section-line" />
                </div>

                {renderFloatingField({
                  label: 'Available Capital (LKR)',
                  name: 'available_capital_lkr',
                  isRequired: true,
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
                      placeholder="e.g. 500000"
                      className="floating-field-input" 
                    />
                  )
                })}

                {renderFloatingField({
                  label: 'Requested Loan Amount (LKR)',
                  name: 'loan_amount_lkr',
                  helperText: 'Optional. Leave blank or enter 0 if you are not requesting a bank loan.',
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
                  label: 'Monthly Operating Budget (LKR)',
                  name: 'monthly_budget_lkr',
                  isRequired: true,
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
                  label: 'Initial Inventory Cost (LKR)',
                  name: 'initial_inventory_cost_lkr',
                  helperText: 'Optional. Leave blank or enter 0 if no initial inventory stock is required.',
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
                      placeholder="e.g. 180000"
                      className="floating-field-input" 
                    />
                  )
                })}

                {renderFloatingField({
                  label: 'Expected Price / Unit (LKR)',
                  name: 'expected_price_lkr',
                  isRequired: true,
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
                      placeholder="e.g. 350"
                      className="floating-field-input" 
                    />
                  )
                })}

                {/* Operations & Market Subgroup */}
                <div className="modal-section-header">
                  <div className="modal-section-title-wrap" style={{ color: '#c084fc' }}>
                    <Users size={16} />
                    <span>Market & Operations</span>
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
                      placeholder="e.g. 40"
                      className="floating-field-input" 
                    />
                  )
                })}

                {renderFloatingField({
                  label: 'Competition Level',
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
                      <option value="Low">Low Competition</option>
                      <option value="Moderate">Moderate Competition</option>
                      <option value="High">High Competition</option>
                    </select>
                  )
                })}

                {renderFloatingField({
                  label: 'Customer Demand Score (1-100)',
                  name: 'customer_demand_score',
                  isRequired: true,
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
                  label: 'Entrepreneur Experience (Years)',
                  name: 'entrepreneur_experience_years',
                  isRequired: true,
                  helperText: 'Enter 0 if this is your first startup enterprise.',
                  children: (
                    <input 
                      id="entrepreneur_experience_years"
                      type="number" 
                      name="entrepreneur_experience_years" 
                      value={formData.entrepreneur_experience_years} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('entrepreneur_experience_years')}
                      min="0" 
                      placeholder="e.g. 5"
                      className="floating-field-input" 
                    />
                  )
                })}

                {renderFloatingField({
                  label: 'Available Staff Count',
                  name: 'available_staff_count',
                  isRequired: true,
                  helperText: 'Enter 0 if you are operating as a solo entrepreneur.',
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

                {/* Operational Feasibility & Readiness Scores (2x2 Grid) */}
                <div className="modal-section-header">
                  <div className="modal-section-title-wrap" style={{ color: 'var(--accent-teal)' }}>
                    <Sliders size={16} />
                    <span>Operational Feasibility & Readiness (1 - 5 Scale)</span>
                  </div>
                  <div className="modal-section-line" />
                </div>

                <div className="modal-grid-2x2">
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
                            {v} - {v === 1 ? 'Very Low' : v === 2 ? 'Low' : v === 3 ? 'Moderate' : v === 4 ? 'Good' : 'Optimal'}
                          </option>
                        ))}
                      </select>
                    )
                  })}

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

            {/* ========================================================================= */}
            {/* SECTION 3 — Business Plan Details */}
            {/* ========================================================================= */}
            {currentStep === 3 && (
              <div className="form-step-content">
                <div className="modal-section-header first-section">
                  <div className="modal-section-title-wrap" style={{ color: 'var(--accent-teal)' }}>
                    <FileText size={16} />
                    <span>Business Plan Strategy & Details (Optional)</span>
                  </div>
                  <div className="modal-section-line" />
                </div>

                <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '1.25rem', lineHeight: '1.5' }}>
                  The fields below are optional, but will be directly incorporated into your generated business plan document and investor brief.
                </p>

                {renderFloatingField({
                  label: 'Marketing Details',
                  name: 'marketing_details',
                  isTextarea: true,
                  charCounter: formData.marketing_details ? `${formData.marketing_details.length} characters` : null,
                  children: (
                    <textarea 
                      id="marketing_details"
                      name="marketing_details" 
                      value={formData.marketing_details} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('marketing_details')}
                      rows={4}
                      placeholder="Describe your target customers, acquisition channels, promotions, pricing strategy, and sales tactics..."
                      className="floating-field-textarea" 
                    />
                  )
                })}

                {renderFloatingField({
                  label: 'Competitor Information',
                  name: 'competitor_information',
                  isTextarea: true,
                  charCounter: formData.competitor_information ? `${formData.competitor_information.length} characters` : null,
                  children: (
                    <textarea 
                      id="competitor_information"
                      name="competitor_information" 
                      value={formData.competitor_information} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('competitor_information')}
                      rows={4}
                      placeholder="Detail existing competitors in your area, market positioning, and your unique competitive advantages..."
                      className="floating-field-textarea" 
                    />
                  )
                })}

                {renderFloatingField({
                  label: 'Financial Overview',
                  name: 'financial_overview',
                  isTextarea: true,
                  charCounter: formData.financial_overview ? `${formData.financial_overview.length} characters` : null,
                  children: (
                    <textarea 
                      id="financial_overview"
                      name="financial_overview" 
                      value={formData.financial_overview} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('financial_overview')}
                      rows={4}
                      placeholder="Provide an overview of your financial projections, expected costs, revenue model, or funding requirements..."
                      className="floating-field-textarea" 
                    />
                  )
                })}
              </div>
            )}

          </div>

          {/* Sticky Footer: Dynamic navigation per section */}
          <div className="modal-footer-sticky">
            
            {/* STEP 1 FOOTER: [Back to Type] + [Next: Operations & Resources] */}
            {currentStep === 1 && (
              <>
                {onBack ? (
                  <button 
                    type="button" 
                    onClick={handleBackAction}
                    className="modal-footer-btn modal-footer-btn-cancel"
                    id="btn-step1-back"
                  >
                    <span>Back</span>
                    <div className="btn-square-block btn-square-cancel">
                      <ArrowLeft size={16} />
                    </div>
                  </button>
                ) : (
                  <button 
                    type="button" 
                    onClick={handleCloseAction}
                    className="modal-footer-btn modal-footer-btn-cancel"
                    id="btn-step1-cancel"
                  >
                    <span>Cancel</span>
                    <div className="btn-square-block btn-square-cancel">
                      <X size={16} />
                    </div>
                  </button>
                )}

                <button 
                  type="button" 
                  onClick={handleNextStep1}
                  className="modal-footer-btn modal-footer-btn-primary"
                  id="btn-step1-next"
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Next: Operations & Resources
                  </span>
                  <div className="btn-square-block btn-square-primary">
                    <ArrowRight size={16} />
                  </div>
                </button>
              </>
            )}

            {/* STEP 2 FOOTER: [Back to Section 1] + [Next: Business Plan Details] */}
            {currentStep === 2 && (
              <>
                <button 
                  type="button" 
                  onClick={() => handlePrevStep(1)}
                  className="modal-footer-btn modal-footer-btn-cancel"
                  id="btn-step2-back"
                >
                  <span>Back</span>
                  <div className="btn-square-block btn-square-cancel">
                    <ArrowLeft size={16} />
                  </div>
                </button>

                <button 
                  type="button" 
                  onClick={handleNextStep2}
                  className="modal-footer-btn modal-footer-btn-primary"
                  id="btn-step2-next"
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Next: Business Plan Details
                  </span>
                  <div className="btn-square-block btn-square-primary">
                    <ArrowRight size={16} />
                  </div>
                </button>
              </>
            )}

            {/* STEP 3 FOOTER: [Back to Section 2] + [Generate Business Plan & Analysis] */}
            {currentStep === 3 && (
              <>
                <button 
                  type="button" 
                  onClick={() => handlePrevStep(2)}
                  disabled={loading}
                  className="modal-footer-btn modal-footer-btn-cancel"
                  id="btn-step3-back"
                >
                  <span>Back</span>
                  <div className="btn-square-block btn-square-cancel">
                    <ArrowLeft size={16} />
                  </div>
                </button>

                <button 
                  type="submit" 
                  disabled={loading} 
                  className="modal-footer-btn modal-footer-btn-primary"
                  id="btn-generate-plan"
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {loading ? 'Generating Business Plan & Analysis...' : 'Generate Business Plan & Analysis'}
                  </span>
                  <div className="btn-square-block btn-square-primary">
                    {loading ? (
                      <Loader2 size={18} className="spin-animation" />
                    ) : (
                      <Rocket size={18} />
                    )}
                  </div>
                </button>
              </>
            )}

          </div>
        </form>
      </div>
    </div>
  );
}
