import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  PieChart,
  ShieldCheck,
  Store,
  ShoppingBag,
  UtensilsCrossed,
  RotateCcw
} from 'lucide-react';

import ConfirmDiscardDialog from './common/ConfirmDiscardDialog';
import OptionCardGroup from './common/OptionCardGroup';
import SearchableSelect from './common/SearchableSelect';
import CurrencyInput from './common/CurrencyInput';
import NumberStepperInput from './common/NumberStepperInput';
import RatingPillGroup from './common/RatingPillGroup';
import SegmentedPills from './common/SegmentedPills';
import NarrativeTextarea from './common/NarrativeTextarea';
import ScoreSliderInput from './common/ScoreSliderInput';
import CompactModelCards from './common/CompactModelCards';
import { useFormDraft } from '../utils/useFormDraft';

const SRI_LANKA_DISTRICTS = [
  'Colombo',
  'Gampaha',
  'Kalutara'
];

const DISTRICT_TO_PROVINCE = {
  'colombo': 'Western', 'gampaha': 'Western', 'kalutara': 'Western', 'kaluthara': 'Western'
};

const GROWTH_CATEGORY_OPTIONS = [
  {
    value: 'Grocery / Retail',
    label: 'Grocery / Retail',
    subtitle: 'Daily essentials & retail food',
    icon: Store
  },
  {
    value: 'Clothing / Garment',
    label: 'Clothing / Garment',
    subtitle: 'Apparel, textiles & boutique',
    icon: ShoppingBag
  },
  {
    value: 'Personal Care / Salon',
    label: 'Personal Care / Salon',
    subtitle: 'Hair, styling & personal care',
    icon: Sparkles
  },
  {
    value: 'Bakery / Food',
    label: 'Bakery / Food',
    subtitle: 'Baked goods, snacks & meals',
    icon: UtensilsCrossed
  }
];

const matchGrowthCategoryValue = (optionValue, currentValue) => {
  if (!currentValue) return false;
  if (optionValue === currentValue) return true;
  const o = optionValue.toLowerCase();
  const c = currentValue.toLowerCase();
  if (o.includes('grocery') && (c.includes('grocery') || c.includes('retail'))) return true;
  if (o.includes('clothing') && c.includes('clothing')) return true;
  if ((o.includes('salon') || o.includes('personal care') || o.includes('beauty')) && (c.includes('salon') || c.includes('personal care') || c.includes('beauty'))) return true;
  if (o.includes('bakery') && c.includes('bakery')) return true;
  return false;
};

const LOCATION_SUITABILITY_DESCRIPTORS = {
  1: 'Very Low Accessibility',
  2: 'Suboptimal Catchment',
  3: 'Standard Commercial',
  4: 'High Footfall Zone',
  5: 'Prime Hub',
};

const AVAILABLE_EQUIPMENT_DESCRIPTORS = {
  1: 'Minimal Tooling',
  2: 'Basic Essentials',
  3: 'Adequate Machinery',
  4: 'Well Equipped',
  5: 'Fully Equipped Commercial',
};

const REQUIRED_EQUIPMENT_DESCRIPTORS = {
  1: 'Low Demand',
  2: 'Moderate Needs',
  3: 'Standard Equipment',
  4: 'High Investment Need',
  5: 'Critical Machinery',
};

const SUPPLIER_AVAILABILITY_DESCRIPTORS = {
  1: 'Scarce Local Supply',
  2: 'Limited Wholesale',
  3: 'Moderate Channel',
  4: 'Reliable Vendors',
  5: 'Abundant Local Supply',
};

const COMPETITION_LEVEL_OPTIONS = [
  { value: 'Low', label: 'Low', subtitle: 'Few nearby alternatives', color: '#10b981' },
  { value: 'Moderate', label: 'Moderate', subtitle: 'Established local competitors', color: '#f59e0b' },
  { value: 'High', label: 'High', subtitle: 'Intense commercial rivalry', color: '#f43f5e' },
];

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
  const [showConfirmDiscard, setShowConfirmDiscard] = useState(false);

  const modalRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const previousActiveElement = useRef(null);
  const onCloseRef = useRef(onClose);
  const onBackRef = useRef(onBack);
  const onFormChangeRef = useRef(onFormChange);
  const formDataRef = useRef(formData);
  const stepActionRef = useRef({});

  onCloseRef.current = onClose;
  onBackRef.current = onBack;
  onFormChangeRef.current = onFormChange;
  formDataRef.current = formData;

  // Snapshot initial values to track isDirty
  const initialSnapshotRef = useRef(null);
  if (initialSnapshotRef.current === null) {
    const base = { ...EMPTY_GROWTH_STATE };
    if (initialValues) {
      Object.keys(EMPTY_GROWTH_STATE).forEach((k) => {
        if (initialValues[k] !== undefined && initialValues[k] !== null && initialValues[k] !== '') {
          base[k] = initialValues[k];
        }
      });
    }
    base.business_stage = 'Existing Business';
    initialSnapshotRef.current = base;
  }

  // Calculate isDirty: true if any field differs from the initial snapshot
  const isDirty = useMemo(() => {
    if (!initialSnapshotRef.current) return false;
    return Object.keys(EMPTY_GROWTH_STATE).some((k) => {
      if (k === 'business_stage') return false;
      const initVal = initialSnapshotRef.current[k] ?? '';
      const curVal = formData[k] ?? '';
      return String(initVal).trim() !== String(curVal).trim();
    });
  }, [formData]);

  // Hook for debounced auto-saving to localStorage under 'sme360:growth-intake-draft'
  const {
    saveStatus,
    availableDraft,
    showDraftBanner,
    lastSavedTimestamp,
    saveDraftNow,
    clearDraft,
    dismissDraftBanner,
  } = useFormDraft({
    formData,
    currentStep,
    isDirty,
    storageKey: 'sme360:growth-intake-draft'
  });

  // Warn on browser tab close or refresh when form is dirty
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Central close handler
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

  const handleBackAction = useCallback(() => {
    if (onFormChangeRef.current) {
      onFormChangeRef.current(formDataRef.current);
    }
    if (onBackRef.current) {
      onBackRef.current(formDataRef.current);
    }
  }, []);

  // Request close: checks isDirty, routes through ConfirmDiscardDialog if dirty
  const requestClose = useCallback((isBackNavigation = false) => {
    if (!isDirty) {
      if (isBackNavigation) {
        handleBackAction();
      } else {
        handleCloseAction();
      }
      return;
    }
    setShowConfirmDiscard(true);
  }, [isDirty, handleBackAction, handleCloseAction]);

  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;

  // Accessibility: focus trap and Escape handler
  useEffect(() => {
    previousActiveElement.current = document.activeElement;
    if (modalRef.current) {
      modalRef.current.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (requestCloseRef.current) {
          requestCloseRef.current(false);
        }
        return;
      }

      // Enter key to continue to next step (if not in a textarea or button)
      if (e.key === 'Enter') {
        const tag = e.target.tagName ? e.target.tagName.toUpperCase() : '';
        if (tag === 'TEXTAREA' || tag === 'BUTTON') return;

        e.preventDefault();
        const { currentStep: step, handleNextStep1: h1, handleNextStep2: h2, handleSubmit: hSubmit } = stepActionRef.current;
        if (step === 1 && h1) h1();
        else if (step === 2 && h2) h2();
        else if (step === 3 && hSubmit) hSubmit();
      }

      // Focus trap within modal
      if (e.key === 'Tab' && modalRef.current && !showConfirmDiscard) {
        const focusable = modalRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
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
  }, [currentStep, showConfirmDiscard]);

  // Autofocus the first field of each step
  useEffect(() => {
    const timer = setTimeout(() => {
      let targetId = null;
      if (currentStep === 1) targetId = 'business_name';
      else if (currentStep === 2) targetId = 'available_capital_lkr';
      else if (currentStep === 3) targetId = 'current_monthly_revenue_lkr';

      if (targetId) {
        const el = document.getElementById(targetId);
        if (el && typeof el.focus === 'function') {
          el.focus({ preventScroll: true });
        }
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [currentStep]);

  // Focus and scroll to first invalid field
  const focusFirstInvalidField = (missingKeys) => {
    if (!missingKeys || missingKeys.length === 0) return;
    const firstKey = missingKeys[0];
    setTimeout(() => {
      const el = document.getElementById(firstKey) || 
                 document.getElementById(`${firstKey}-label`) || 
                 document.querySelector(`[name="${firstKey}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof el.focus === 'function') {
          el.focus({ preventScroll: true });
        }
      }
    }, 100);
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const updatedValue = type === 'number' ? (value === '' ? '' : parseFloat(value)) : value;

    setFormData((prev) => {
      const next = {
        ...prev,
        [name]: updatedValue,
      };
      if (onFormChangeRef.current) {
        onFormChangeRef.current(next);
      }
      return next;
    });

    if (showDraftBanner) {
      dismissDraftBanner();
    }

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

  // Remaining required fields counters
  const missingStep1Keys = useMemo(
    () => REQUIRED_SECTION_1_KEYS.filter((k) => !!getFieldError(k)),
    [formData]
  );
  const remainingCountStep1 = missingStep1Keys.length;

  const missingStep2Keys = useMemo(
    () => REQUIRED_SECTION_2_KEYS.filter((k) => !!getFieldError(k)),
    [formData]
  );
  const remainingCountStep2 = missingStep2Keys.length;

  const handleNextStep1 = () => {
    if (missingStep1Keys.length > 0) {
      const touchedUpdates = {};
      missingStep1Keys.forEach((k) => { touchedUpdates[k] = true; });
      setTouched((prev) => ({ ...prev, ...touchedUpdates }));

      if (missingStep1Keys.length === 1) {
        setValidationError(getFieldError(missingStep1Keys[0]));
      } else {
        const labels = missingStep1Keys.map((k) => FIELD_HUMAN_LABELS[k] || k).join(', ');
        setValidationError(`Please complete required fields: ${labels}.`);
      }
      focusFirstInvalidField(missingStep1Keys);
      return;
    }

    setValidationError('');
    setCurrentStep(2);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  const handleNextStep2 = () => {
    if (missingStep2Keys.length > 0) {
      const touchedUpdates = {};
      missingStep2Keys.forEach((k) => { touchedUpdates[k] = true; });
      setTouched((prev) => ({ ...prev, ...touchedUpdates }));

      if (missingStep2Keys.length === 1) {
        setValidationError(getFieldError(missingStep2Keys[0]));
      } else {
        const labels = missingStep2Keys.map((k) => FIELD_HUMAN_LABELS[k] || k).join(', ');
        setValidationError(`Please complete required fields: ${labels}.`);
      }
      focusFirstInvalidField(missingStep2Keys);
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

  const handleStepClick = (targetStep) => {
    if (targetStep === currentStep) return;

    if (targetStep < currentStep) {
      handlePrevStep(targetStep);
      return;
    }

    if (targetStep === 2) {
      handleNextStep1();
    } else if (targetStep === 3) {
      if (missingStep1Keys.length > 0) {
        setCurrentStep(1);
        handleNextStep1();
      } else if (missingStep2Keys.length > 0) {
        setCurrentStep(2);
        handleNextStep2();
      } else {
        setValidationError('');
        setCurrentStep(3);
      }
    }
  };

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSubmitted(true);

    if (missingStep1Keys.length > 0) {
      setCurrentStep(1);
      const touchedUpdates = {};
      missingStep1Keys.forEach((k) => { touchedUpdates[k] = true; });
      setTouched((prev) => ({ ...prev, ...touchedUpdates }));
      const labels = missingStep1Keys.map((k) => FIELD_HUMAN_LABELS[k] || k).join(', ');
      setValidationError(`Please complete required fields in Section 1: ${labels}.`);
      focusFirstInvalidField(missingStep1Keys);
      return;
    }

    if (missingStep2Keys.length > 0) {
      setCurrentStep(2);
      const touchedUpdates = {};
      missingStep2Keys.forEach((k) => { touchedUpdates[k] = true; });
      setTouched((prev) => ({ ...prev, ...touchedUpdates }));
      const labels = missingStep2Keys.map((k) => FIELD_HUMAN_LABELS[k] || k).join(', ');
      setValidationError(`Please complete required fields in Section 2: ${labels}.`);
      focusFirstInvalidField(missingStep2Keys);
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

    // Clear draft on successful submit
    clearDraft();

    onSubmit(finalPayload);
  };

  stepActionRef.current = {
    handleNextStep1,
    handleNextStep2,
    handleSubmit,
    currentStep,
  };

  // Draft Banner actions
  const handleResumeDraft = () => {
    if (availableDraft && availableDraft.formData) {
      setFormData((prev) => ({
        ...prev,
        ...availableDraft.formData,
        business_stage: 'Existing Business',
      }));
      if (availableDraft.currentStep) {
        setCurrentStep(availableDraft.currentStep);
      }
      dismissDraftBanner();
    }
  };

  const handleStartFresh = () => {
    clearDraft();
    const fresh = { ...EMPTY_GROWTH_STATE };
    if (initialValues) {
      Object.keys(EMPTY_GROWTH_STATE).forEach((k) => {
        if (initialValues[k] !== undefined && initialValues[k] !== null && initialValues[k] !== '') {
          fresh[k] = initialValues[k];
        }
      });
    }
    fresh.business_stage = 'Existing Business';
    setFormData(fresh);
    setCurrentStep(1);
    setValidationError('');
  };

  // Confirm Discard dialog actions
  const handleDialogKeepEditing = () => {
    setShowConfirmDiscard(false);
  };

  const handleDialogSaveAndClose = () => {
    saveDraftNow(formData, currentStep);
    setShowConfirmDiscard(false);
    handleCloseAction();
  };

  const handleDialogDiscard = () => {
    clearDraft();
    setShowConfirmDiscard(false);
    handleCloseAction();
  };

  // Derived Province for read-only preview
  const distKey = (formData.district || '').trim().toLowerCase();
  const derivedProvinceDisplay = DISTRICT_TO_PROVINCE[distKey] 
    ? `${DISTRICT_TO_PROVINCE[distKey]} Province` 
    : formData.district 
    ? 'Auto-derived' 
    : 'Select a district first';

  const renderFloatingField = ({
    label,
    name,
    isRequired = false,
    helperText,
    isSelect = false,
    isTextarea = false,
    isCustom = false,
    children
  }) => {
    const errorMsg = getFieldError(name);
    const showError = (touched[name] || submitted) && !!errorMsg;
    const isAi = isAiFilled(name);

    if (isCustom) {
      return (
        <div className="floating-field-wrapper" style={{ marginBottom: '0.35rem' }}>
          <div className="floating-field-top-row" style={{ marginBottom: '0.35rem' }}>
            <label 
              className="floating-field-label" 
              htmlFor={name} 
              id={`${name}-label`}
              style={{ color: showError ? '#f87171' : undefined }}
            >
              {label}
              {isRequired && <span className="req-asterisk" title="Required field">*</span>}
            </label>

            {isAi && (
              <span className="floating-field-ai-badge" title="Populated automatically by AI">
                <Sparkles size={10} />
                <span>AI-filled</span>
              </span>
            )}
          </div>

          <div className={showError ? 'has-error' : ''}>
            {children}
          </div>

          {helperText && !showError && (
            <div className="floating-field-helper-hint" style={{ marginTop: '0.25rem' }}>
              <Info size={11} style={{ flexShrink: 0 }} />
              <span>{helperText}</span>
            </div>
          )}

          {showError && (
            <div className="floating-field-error-text" style={{ marginTop: '0.25rem' }}>
              <AlertCircle size={12} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={`floating-field-wrapper ${isTextarea ? 'is-textarea' : ''}`}>
        <div className={`floating-field-container ${showError ? 'has-error' : ''}`}>
          <div className="floating-field-top-row">
            <label className="floating-field-label" htmlFor={name} id={`${name}-label`}>
              {label}
              {isRequired && <span className="req-asterisk" title="Required field">*</span>}
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
    <>
      <div
        className="modal-backdrop-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div
          className="modal-dialog-card"
          ref={modalRef}
          tabIndex={-1}
          style={{ maxWidth: '880px', width: '95%' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Background Purple Glow for Growth Form */}
          <div className="modal-deco-backdrop">
            <div className="modal-deco-glow" style={{ background: 'radial-gradient(circle, rgba(168, 85, 247, 0.18) 0%, rgba(99, 102, 241, 0.05) 70%, transparent 100%)' }} />
          </div>

          {/* Modal Header */}
          <div className="modal-header-section" style={{ paddingBottom: '0.85rem' }}>
            <div className="modal-top-actions">
              {currentStep === 1 && onBack ? (
                <button
                  type="button"
                  onClick={() => requestClose(true)}
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

              {/* Header Right: Draft Indicator + Close (X) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {saveStatus === 'saved' && (
                  <span className="draft-saved-pill" title="Changes auto-saved to your browser">
                    <Check size={11} />
                    <span>Draft saved ✓</span>
                  </span>
                )}
                {saveStatus === 'saving' && (
                  <span className="draft-saving-pill">
                    <Loader2 size={11} className="spin" />
                    <span>Saving...</span>
                  </span>
                )}

                {onClose && (
                  <button
                    type="button"
                    onClick={() => requestClose(false)}
                    className="modal-close-icon-btn"
                    title="Close Form (Esc)"
                    id="modal-btn-close"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', marginTop: '0.2rem' }}>
              <span
                className="intake-stage-badge growth-badge"
                style={{
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
              <span className="intake-stage-dot" style={{ fontSize: '0.75rem', fontWeight: 600 }}>•</span>
              <span className="intake-step-hint" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                Step {currentStep} of 3
              </span>
            </div>

            <h2 id="modal-title" className="modal-title" style={{ marginTop: '0.4rem', fontSize: '1.3rem' }}>
              {currentStep === 1 && '1. Enterprise Baseline & Expansion Focus'}
              {currentStep === 2 && '2. Expansion Capital, Demand & Operational Capacity'}
              {currentStep === 3 && '3. Baseline Performance & Investment Scope (Optional)'}
            </h2>

            <p className="modal-subtitle" style={{ fontSize: '0.8rem', maxWidth: '640px', margin: '0 auto' }}>
              {currentStep === 1 && 'Define your existing business identity, operating district, and proposed growth trajectory.'}
              {currentStep === 2 && 'Detail the incremental capital, expected additional footfall, and operational resources for expansion.'}
              {currentStep === 3 && 'Provide optional baseline revenue, net profit, and CapEx metrics for detailed payback analysis.'}
            </p>

            {/* Stepper with click navigation */}
            <div className="form-step-stepper" style={{ marginTop: '0.75rem', marginBottom: '0.1rem' }}>
              <div
                className={`form-step-pill ${currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : ''}`}
                onClick={() => handleStepClick(1)}
                style={{ cursor: currentStep > 1 ? 'pointer' : 'default' }}
                title="Jump to Step 1"
              >
                <div className="form-step-number">
                  {currentStep > 1 ? <Check size={11} /> : '1'}
                </div>
                <span className="form-step-label">Expansion Focus</span>
              </div>

              <div className={`form-step-track ${currentStep > 1 ? 'filled' : ''}`} />

              <div
                className={`form-step-pill ${currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : ''}`}
                onClick={() => handleStepClick(2)}
                style={{ cursor: (currentStep > 2 || remainingCountStep1 === 0) ? 'pointer' : 'not-allowed' }}
                title={remainingCountStep1 > 0 ? 'Complete Step 1 required fields first' : 'Jump to Step 2'}
              >
                <div className="form-step-number">
                  {currentStep > 2 ? <Check size={11} /> : '2'}
                </div>
                <span className="form-step-label">Expansion Capital</span>
              </div>

              <div className={`form-step-track ${currentStep > 2 ? 'filled' : ''}`} />

              <div
                className={`form-step-pill ${currentStep === 3 ? 'active' : ''}`}
                onClick={() => handleStepClick(3)}
                style={{ cursor: (remainingCountStep1 === 0 && remainingCountStep2 === 0) ? 'pointer' : 'not-allowed' }}
                title={(remainingCountStep1 > 0 || remainingCountStep2 > 0) ? 'Complete Step 1 & 2 required fields first' : 'Jump to Step 3'}
              >
                <div className="form-step-number">3</div>
                <span className="form-step-label">Baseline Metrics</span>
              </div>
            </div>

            {/* Unfinished Draft Resume Banner */}
            {availableDraft && showDraftBanner && (
              <div className="draft-banner">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c084fc', fontSize: '0.8rem' }}>
                  <FileText size={15} className="text-purple-400" style={{ flexShrink: 0 }} />
                  <span>
                    You have an unfinished draft from earlier.
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={handleStartFresh}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      fontSize: '0.76rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      padding: '0.35rem 0.5rem',
                    }}
                    onMouseEnter={(e) => e.target.style.color = '#f8fafc'}
                    onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
                  >
                    Start fresh
                  </button>
                  <span style={{ color: 'rgba(192, 132, 252, 0.4)' }}>|</span>
                  <button
                    type="button"
                    onClick={handleResumeDraft}
                    className="btn btn-primary"
                    style={{
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      background: '#7c3aed',
                      color: '#ffffff',
                      borderRadius: '6px',
                    }}
                  >
                    Resume
                  </button>
                </div>
              </div>
            )}

            {/* Validation Error Banner */}
            {validationError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                padding: '0.6rem 0.95rem',
                borderRadius: '8px',
                marginTop: '0.65rem',
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

          {/* Form Body with Responsive Grid */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div className="modal-body-scroll" ref={scrollContainerRef} style={{ paddingBottom: '3rem' }}>

              {/* STEP 1: Enterprise Profile & Expansion Focus */}
              {currentStep === 1 && (
                <div className="form-step-content wizard-form-grid">
                  <div className="modal-section-header first-section wizard-col-full">
                    <div className="modal-section-title-wrap" style={{ color: '#c084fc' }}>
                      <Building size={16} />
                      <span>ENTERPRISE PROFILE & OPERATING BASE</span>
                    </div>
                    <div className="modal-section-line" />
                  </div>

                  {/* Enterprise Name */}
                  <div className="wizard-col-full">
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
                  </div>

                  {/* Business Category (4 selectable cards full width) */}
                  <div className="wizard-col-full">
                    <OptionCardGroup
                      label="Business Category"
                      name="business_category"
                      isRequired={true}
                      value={formData.business_category}
                      options={GROWTH_CATEGORY_OPTIONS}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={(touched.business_category || submitted) ? getFieldError('business_category') : null}
                      isAi={isAiFilled('business_category')}
                      matchFn={matchGrowthCategoryValue}
                      columns={4}
                      helperText="Choose the sector matching your operating business enterprise."
                    />
                  </div>

                  {/* Row of 3 on Desktop: Business Model, Operating District, Province */}
                  <div className="wizard-col-full wizard-grid-3">
                    {/* Business Model */}
                    <div className="wizard-col-third">
                      {renderFloatingField({
                        label: 'Operating Business Model',
                        name: 'business_model',
                        isRequired: true,
                        isCustom: true,
                        helperText: 'Select commercial delivery model.',
                        children: (
                          <CompactModelCards
                            name="business_model"
                            value={formData.business_model}
                            onChange={handleChange}
                            onBlur={handleBlur}
                          />
                        )
                      })}
                    </div>

                    {/* Operating District */}
                    <div className="wizard-col-third">
                      <SearchableSelect
                        label="Operating District"
                        name="district"
                        isRequired={true}
                        value={formData.district}
                        options={SRI_LANKA_DISTRICTS}
                        placeholder="Type to search..."
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={(touched.district || submitted) ? getFieldError('district') : null}
                        isAi={isAiFilled('district')}
                        helperText="Operating district for existing business."
                      />
                    </div>

                    {/* Province (Auto-Derived Read-Only Dashed-Border Field) */}
                    <div className="wizard-col-third">
                      <div className="floating-field-wrapper">
                        <div
                          className="floating-field-container is-locked-field"
                          style={{
                            background: 'rgba(15, 23, 42, 0.45)',
                            border: '1px dashed rgba(168, 85, 247, 0.35)',
                            cursor: 'not-allowed',
                          }}
                        >
                          <div className="floating-field-top-row">
                            <label className="floating-field-label" htmlFor="derived_province" style={{ color: '#94a3b8' }}>
                              Province
                            </label>

                            <span className="floating-field-locked-badge" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', color: '#c084fc', borderColor: 'rgba(168, 85, 247, 0.3)' }}>
                              <ShieldCheck size={10} />
                              <span>Auto-Filled</span>
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.2rem' }}>
                            <input
                              id="derived_province"
                              type="text"
                              readOnly
                              disabled
                              value={derivedProvinceDisplay}
                              className="floating-field-input"
                              style={{
                                color: formData.district ? '#c084fc' : '#64748b',
                                fontWeight: formData.district ? 700 : 500,
                                cursor: 'not-allowed',
                                border: 'none',
                                padding: 0,
                                background: 'transparent',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Catchment Location Type */}
                  <div className="wizard-col-half">
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
                  </div>

                  {/* Proposed Growth Objective */}
                  <div className="wizard-col-half">
                    {renderFloatingField({
                      label: 'Proposed Growth Objective',
                      name: 'proposed_action',
                      isSelect: true,
                      helperText: 'Select primary expansion or capacity scaling activity.',
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
                  </div>

                  {/* Expansion Scope & Project Description */}
                  <div className="wizard-col-full">
                    {renderFloatingField({
                      label: 'Expansion Scope & Project Description',
                      name: 'additional_description',
                      isCustom: true,
                      helperText: 'Explain what you plan to expand (e.g. adding a bakery section, second counter, online delivery).',
                      children: (
                        <NarrativeTextarea
                          id="additional_description"
                          name="additional_description"
                          value={formData.additional_description}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          rows={3}
                          placeholder="e.g. We operate a grocery store and want to add an in-store bakery counter and fresh food section to boost customer basket size..."
                          examples={[
                            'Add in-store bakery counter & fresh snacks',
                            'Expand digital ordering & doorstep delivery in 3km',
                            'Upgrade refrigeration & bulk storage capacity'
                          ]}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {/* STEP 2: Expansion Capital & Operations */}
              {currentStep === 2 && (
                <div className="form-step-content wizard-form-grid">
                  {/* SECTION 1: EXPANSION CAPITAL & OPERATING BUDGET */}
                  <div className="wizard-col-full wizard-section-label" style={{ color: 'var(--accent-teal)' }}>
                    <span>EXPANSION CAPITAL & OPERATING BUDGET</span>
                  </div>

                  {/* Available Capital */}
                  <div className="wizard-col-half">
                    {renderFloatingField({
                      label: 'Capital Available for Proposed Expansion (LKR)',
                      name: 'available_capital_lkr',
                      isRequired: true,
                      helperText: 'Funds allocated specifically for this expansion project.',
                      children: (
                        <CurrencyInput
                          id="available_capital_lkr"
                          name="available_capital_lkr"
                          value={formData.available_capital_lkr}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder="e.g. 1,500,000"
                        />
                      )
                    })}
                  </div>

                  {/* Loan Financing */}
                  <div className="wizard-col-half">
                    {renderFloatingField({
                      label: 'Planned Expansion Loan / Credit (LKR)',
                      name: 'loan_amount_lkr',
                      helperText: 'Optional. Bank credit or SME facility sought for project.',
                      children: (
                        <CurrencyInput
                          id="loan_amount_lkr"
                          name="loan_amount_lkr"
                          value={formData.loan_amount_lkr}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder="e.g. 500,000"
                        />
                      )
                    })}
                  </div>

                  {/* Monthly Budget */}
                  <div className="wizard-col-half">
                    {renderFloatingField({
                      label: 'Incremental Monthly Operating Budget (LKR)',
                      name: 'monthly_budget_lkr',
                      isRequired: true,
                      helperText: 'Expected additional monthly expenditure for expanded operation.',
                      children: (
                        <CurrencyInput
                          id="monthly_budget_lkr"
                          name="monthly_budget_lkr"
                          value={formData.monthly_budget_lkr}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder="e.g. 250,000"
                        />
                      )
                    })}
                  </div>

                  {/* Initial Inventory */}
                  <div className="wizard-col-half">
                    {renderFloatingField({
                      label: 'Initial Stock / Raw Materials for Expansion (LKR)',
                      name: 'initial_inventory_cost_lkr',
                      helperText: 'Initial inventory required for new line or branch stock.',
                      children: (
                        <CurrencyInput
                          id="initial_inventory_cost_lkr"
                          name="initial_inventory_cost_lkr"
                          value={formData.initial_inventory_cost_lkr}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder="e.g. 300,000"
                        />
                      )
                    })}
                  </div>

                  {/* SECTION 2: DAILY PATRON THROUGHPUT & PRICING */}
                  <div className="wizard-col-full wizard-section-label" style={{ color: '#38bdf8' }}>
                    <span>DAILY PATRON THROUGHPUT & PRICING</span>
                  </div>

                  {/* Average Spend */}
                  <div className="wizard-col-half">
                    {renderFloatingField({
                      label: 'Average Customer Spend per Visit (LKR)',
                      name: 'expected_price_lkr',
                      isRequired: true,
                      helperText: 'Expected average transaction basket across all lines post-expansion.',
                      children: (
                        <CurrencyInput
                          id="expected_price_lkr"
                          name="expected_price_lkr"
                          value={formData.expected_price_lkr}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder="e.g. 650"
                        />
                      )
                    })}
                  </div>

                  {/* Expected Additional Customers */}
                  <div className="wizard-col-half">
                    {renderFloatingField({
                      label: 'Expected Additional Daily Customers',
                      name: 'expected_customers_per_day',
                      isRequired: true,
                      helperText: 'Projected net new customer visits gained through this expansion.',
                      children: (
                        <NumberStepperInput
                          id="expected_customers_per_day"
                          name="expected_customers_per_day"
                          value={formData.expected_customers_per_day}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          unit="patrons / day"
                          min={1}
                          placeholder="e.g. 75"
                        />
                      )
                    })}
                  </div>

                  {/* Competition Level */}
                  <div className="wizard-col-half">
                    {renderFloatingField({
                      label: 'Market Competition Level',
                      name: 'competition_level',
                      isRequired: true,
                      isCustom: true,
                      helperText: 'Intensity of competitive pressure in expanded scope.',
                      children: (
                        <SegmentedPills
                          name="competition_level"
                          value={formData.competition_level}
                          options={COMPETITION_LEVEL_OPTIONS}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        />
                      )
                    })}
                  </div>

                  {/* Demand Score */}
                  <div className="wizard-col-half">
                    {renderFloatingField({
                      label: 'Target Market Demand Score (1-100)',
                      name: 'customer_demand_score',
                      isRequired: true,
                      isCustom: true,
                      helperText: 'Consumer interest for proposed expansion in catchment.',
                      children: (
                        <ScoreSliderInput
                          id="customer_demand_score"
                          name="customer_demand_score"
                          value={formData.customer_demand_score}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          min={1}
                          max={100}
                          suffix="/100"
                          placeholder="70"
                        />
                      )
                    })}
                  </div>

                  {/* SECTION 3: TEAM READINESS & EXPERIENCE */}
                  <div className="wizard-col-full wizard-section-label" style={{ color: '#c084fc' }}>
                    <span>TEAM READINESS & EXPERIENCE</span>
                  </div>

                  {/* Operating Experience */}
                  <div className="wizard-col-half">
                    {renderFloatingField({
                      label: 'Business Operating Experience (Years)',
                      name: 'entrepreneur_experience_years',
                      isRequired: true,
                      helperText: 'Operating experience running current enterprise.',
                      children: (
                        <NumberStepperInput
                          id="entrepreneur_experience_years"
                          name="entrepreneur_experience_years"
                          value={formData.entrepreneur_experience_years}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          unit="years"
                          min={0}
                          max={50}
                          placeholder="e.g. 5"
                        />
                      )
                    })}
                  </div>

                  {/* Total Staff */}
                  <div className="wizard-col-half">
                    {renderFloatingField({
                      label: 'Total Staff Post-Expansion',
                      name: 'available_staff_count',
                      isRequired: true,
                      helperText: 'Combined staff count across current and expanded operations.',
                      children: (
                        <NumberStepperInput
                          id="available_staff_count"
                          name="available_staff_count"
                          value={formData.available_staff_count}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          unit="staff"
                          min={0}
                          max={50}
                          placeholder="e.g. 6"
                        />
                      )
                    })}
                  </div>

                  {/* SECTION 4: OPERATIONAL READINESS RATINGS (1-5) */}
                  <div className="wizard-col-full wizard-section-label" style={{ color: '#fbbf24' }}>
                    <span>OPERATIONAL READINESS RATINGS (1-5)</span>
                  </div>

                  {/* Location Suitability */}
                  <div className="wizard-col-half">
                    {renderFloatingField({
                      label: 'Location Suitability for Expansion (1-5)',
                      name: 'location_suitability_score',
                      isRequired: true,
                      isCustom: true,
                      children: (
                        <RatingPillGroup
                          name="location_suitability_score"
                          value={formData.location_suitability_score}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          descriptors={LOCATION_SUITABILITY_DESCRIPTORS}
                        />
                      )
                    })}
                  </div>

                  {/* Available Equipment Readiness */}
                  <div className="wizard-col-half">
                    {renderFloatingField({
                      label: 'Available Equipment Readiness (1-5)',
                      name: 'available_equipment_score',
                      isRequired: true,
                      isCustom: true,
                      children: (
                        <RatingPillGroup
                          name="available_equipment_score"
                          value={formData.available_equipment_score}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          descriptors={AVAILABLE_EQUIPMENT_DESCRIPTORS}
                        />
                      )
                    })}
                  </div>

                  {/* Expansion Equipment Required */}
                  <div className="wizard-col-half">
                    {renderFloatingField({
                      label: 'Expansion Equipment Required (1-5)',
                      name: 'required_equipment_score',
                      isRequired: true,
                      isCustom: true,
                      children: (
                        <RatingPillGroup
                          name="required_equipment_score"
                          value={formData.required_equipment_score}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          descriptors={REQUIRED_EQUIPMENT_DESCRIPTORS}
                        />
                      )
                    })}
                  </div>

                  {/* Supplier Network Access */}
                  <div className="wizard-col-half">
                    {renderFloatingField({
                      label: 'Supplier Network Access (1-5)',
                      name: 'supplier_availability_score',
                      isRequired: true,
                      isCustom: true,
                      children: (
                        <RatingPillGroup
                          name="supplier_availability_score"
                          value={formData.supplier_availability_score}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          descriptors={SUPPLIER_AVAILABILITY_DESCRIPTORS}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {/* STEP 3: Enterprise Baseline & Expansion Scope */}
              {currentStep === 3 && (
                <div className="form-step-content wizard-form-grid">
                  <div className="modal-section-header first-section wizard-col-full">
                    <div className="modal-section-title-wrap" style={{ color: '#818cf8' }}>
                      <Briefcase size={16} />
                      <span>ENTERPRISE BASELINE & INVESTMENT SCOPE (OPTIONAL)</span>
                    </div>
                    <div className="modal-section-line" />
                  </div>

                  <div className="wizard-col-full" style={{
                    background: 'rgba(99, 102, 241, 0.08)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    marginBottom: '0.45rem',
                    fontSize: '0.8rem',
                    color: '#cbd5e1',
                    lineHeight: 1.5
                  }}>
                    <strong style={{ color: '#818cf8' }}>Strategic Planning Context:</strong> The fields below are optional supplementary inputs. When provided, they enable accurate <strong>Payback Period</strong> calculations and <strong>Section 04 Capital Recovery</strong> estimates in your Strategic Business Growth Plan.
                  </div>

                  {/* Current Monthly Revenue */}
                  <div className="wizard-col-half">
                    {renderFloatingField({
                      label: 'Current Monthly Revenue (LKR)',
                      name: 'current_monthly_revenue_lkr',
                      helperText: 'Existing parent enterprise average monthly revenue.',
                      children: (
                        <CurrencyInput
                          id="current_monthly_revenue_lkr"
                          name="current_monthly_revenue_lkr"
                          value={formData.current_monthly_revenue_lkr}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder="e.g. 1,200,000"
                        />
                      )
                    })}
                  </div>

                  {/* Current Monthly Net Profit */}
                  <div className="wizard-col-half">
                    {renderFloatingField({
                      label: 'Current Monthly Net Profit (LKR)',
                      name: 'current_monthly_net_profit_lkr',
                      helperText: 'Net cash profit generated by existing operations before expansion.',
                      children: (
                        <CurrencyInput
                          id="current_monthly_net_profit_lkr"
                          name="current_monthly_net_profit_lkr"
                          value={formData.current_monthly_net_profit_lkr}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder="e.g. 180,000"
                        />
                      )
                    })}
                  </div>

                  {/* Existing Monthly Debt */}
                  <div className="wizard-col-half">
                    {renderFloatingField({
                      label: 'Existing Monthly Debt Repayments (LKR)',
                      name: 'existing_monthly_debt_obligations_lkr',
                      helperText: 'Current ongoing monthly loan servicing obligations.',
                      children: (
                        <CurrencyInput
                          id="existing_monthly_debt_obligations_lkr"
                          name="existing_monthly_debt_obligations_lkr"
                          value={formData.existing_monthly_debt_obligations_lkr}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder="e.g. 35,000"
                        />
                      )
                    })}
                  </div>

                  {/* Operating Age */}
                  <div className="wizard-col-half">
                    {renderFloatingField({
                      label: 'Business Operating Age (Years)',
                      name: 'business_age_years',
                      helperText: 'How many years the parent enterprise has been actively operating.',
                      children: (
                        <NumberStepperInput
                          id="business_age_years"
                          name="business_age_years"
                          value={formData.business_age_years}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          unit="years"
                          min={0}
                          placeholder="e.g. 4"
                        />
                      )
                    })}
                  </div>

                  {/* One-Time CapEx */}
                  <div className="wizard-col-half">
                    {renderFloatingField({
                      label: 'One-Time Expansion CapEx (LKR)',
                      name: 'expansion_capex_lkr',
                      helperText: 'One-time renovation, machinery, or fitting expenditure.',
                      children: (
                        <CurrencyInput
                          id="expansion_capex_lkr"
                          name="expansion_capex_lkr"
                          value={formData.expansion_capex_lkr}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder="e.g. 600,000"
                        />
                      )
                    })}
                  </div>

                  {/* Target Payback Period */}
                  <div className="wizard-col-half">
                    {renderFloatingField({
                      label: 'Target Payback Period (Months)',
                      name: 'target_payback_months',
                      helperText: 'Target timeframe in months to recover expansion CapEx.',
                      children: (
                        <NumberStepperInput
                          id="target_payback_months"
                          name="target_payback_months"
                          value={formData.target_payback_months}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          unit="months"
                          min={1}
                          placeholder="e.g. 12"
                        />
                      )
                    })}
                  </div>

                  {/* Current Capacity Utilization */}
                  <div className="wizard-col-half">
                    {renderFloatingField({
                      label: 'Current Capacity Utilization (%)',
                      name: 'current_capacity_utilization_pct',
                      isCustom: true,
                      helperText: 'Estimated utilization percentage of existing facility or team.',
                      children: (
                        <ScoreSliderInput
                          id="current_capacity_utilization_pct"
                          name="current_capacity_utilization_pct"
                          value={formData.current_capacity_utilization_pct}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          min={0}
                          max={100}
                          suffix="%"
                          placeholder="85"
                        />
                      )
                    })}
                  </div>

                  {/* Expansion Type Model */}
                  <div className="wizard-col-half">
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

                  {/* SECTION: Expansion Strategy Narrative */}
                  <div className="modal-section-header wizard-col-full" style={{ marginTop: '0.85rem' }}>
                    <div className="modal-section-title-wrap" style={{ color: '#c084fc' }}>
                      <FileText size={16} />
                      <span>GROWTH STRATEGY NARRATIVE (OPTIONAL)</span>
                    </div>
                    <div className="modal-section-line" />
                  </div>

                  {/* Retention & Marketing */}
                  <div className="wizard-col-full">
                    {renderFloatingField({
                      label: 'Customer Retention & Expansion Marketing',
                      name: 'marketing_details',
                      isCustom: true,
                      helperText: 'How you plan to inform existing and new patrons of your expansion.',
                      children: (
                        <NarrativeTextarea
                          id="marketing_details"
                          name="marketing_details"
                          value={formData.marketing_details}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          rows={3}
                          placeholder="e.g. Announcing new product line to existing loyalty members, cross-promotions, neighborhood outreach..."
                          examples={[
                            'Loyalty member VIP preview discount',
                            'WhatsApp announcements with weekly offers',
                            'Cross-promotion with neighboring shops'
                          ]}
                        />
                      )
                    })}
                  </div>

                  {/* Competitive Defense */}
                  <div className="wizard-col-full">
                    {renderFloatingField({
                      label: 'Competitive Defense & Growth Differentiator',
                      name: 'competitor_information',
                      isCustom: true,
                      helperText: 'How this expansion strengthens your market share against local competitors.',
                      children: (
                        <NarrativeTextarea
                          id="competitor_information"
                          name="competitor_information"
                          value={formData.competitor_information}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          rows={3}
                          placeholder="e.g. How this expansion strengthens your market share against local competitors in your catchment..."
                          examples={[
                            'Exclusive direct distributor partnership',
                            'Faster 15-minute neighborhood fulfillment',
                            'Expanded product variety not offered nearby'
                          ]}
                        />
                      )
                    })}
                  </div>

                  {/* Financial Overview */}
                  <div className="wizard-col-full">
                    {renderFloatingField({
                      label: 'Financial Outlook & Cash Buffer Strategy',
                      name: 'financial_overview',
                      isCustom: true,
                      helperText: 'Cash flow management and reinvestment policy for expansion.',
                      children: (
                        <NarrativeTextarea
                          id="financial_overview"
                          name="financial_overview"
                          value={formData.financial_overview}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          rows={3}
                          placeholder="e.g. Maintaining positive operational cash flow from parent operations to subsidize expansion rollout..."
                          examples={[
                            'Fund expansion entirely from retained operating profits',
                            'Maintain 2 months operating expense cash buffer',
                            'Target cash-flow breakeven by month 4'
                          ]}
                        />
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Modal Footer Actions */}
            <div className="modal-footer-sticky-clean">
              {/* Footer Left: Step Counter & Required Fields Hint */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
                  Step {currentStep} of 3
                </span>

                <span style={{ color: 'rgba(255, 255, 255, 0.15)' }}>•</span>

                {/* Real-time Required Fields Indicator */}
                {currentStep === 1 && (
                  remainingCountStep1 > 0 ? (
                    <span style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fbbf24' }} />
                      {remainingCountStep1} required {remainingCountStep1 === 1 ? 'field' : 'fields'} left
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Check size={13} />
                      All required fields complete
                    </span>
                  )
                )}

                {currentStep === 2 && (
                  remainingCountStep2 > 0 ? (
                    <span style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fbbf24' }} />
                      {remainingCountStep2} required {remainingCountStep2 === 1 ? 'field' : 'fields'} left
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Check size={13} />
                      All required fields complete
                    </span>
                  )
                )}

                {currentStep === 3 && (
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500 }}>
                    All fields optional
                  </span>
                )}
              </div>

              {/* Footer Right: Back & Continue/Submit Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => handlePrevStep(currentStep - 1)}
                    className="btn btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', padding: '0.55rem 1rem' }}
                  >
                    <ArrowLeft size={15} />
                    <span>Back</span>
                  </button>
                ) : onBack ? (
                  <button
                    type="button"
                    onClick={() => requestClose(true)}
                    className="btn btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', padding: '0.55rem 0.95rem' }}
                  >
                    <RotateCcw size={14} />
                    <span>Back to Mode</span>
                  </button>
                ) : null}

                {currentStep === 1 && (
                  <button
                    type="button"
                    onClick={handleNextStep1}
                    className="btn btn-primary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.65rem 1.25rem',
                      background: 'linear-gradient(135deg, #7c3aed, #4f46e5)'
                    }}
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
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.65rem 1.25rem',
                      background: 'linear-gradient(135deg, #7c3aed, #4f46e5)'
                    }}
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
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      minWidth: '200px',
                      padding: '0.65rem 1.35rem',
                      background: 'linear-gradient(135deg, #7c3aed, #4f46e5)'
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="spin" />
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

      {/* Accessible Confirmation Dialog on Discard / Unsaved Changes */}
      <ConfirmDiscardDialog
        isOpen={showConfirmDiscard}
        onKeepEditing={handleDialogKeepEditing}
        onSaveAndClose={handleDialogSaveAndClose}
        onDiscard={handleDialogDiscard}
      />
    </>
  );
}
