import React, { useState, useCallback, useRef } from 'react';
import { extractIntakeInformation } from '../services/api';
import BusinessForm from './BusinessForm';
import Logo from './Logo';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  FileEdit,
  Check,
  Target,
  Building2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  MapPin,
  DollarSign,
  Users,
  Award,
  Sliders,
  Rocket,
  TrendingUp,
  Layers
} from 'lucide-react';

import startupImg from '../assets/images/startup_illustration.jpg';
import expansionImg from '../assets/images/expansion_illustration.jpg';

const SRI_LANKA_DISTRICTS = [
  'Colombo',
  'Gampaha',
  'Kalutara'
];

const SUPPORTED_CATEGORIES = [
  'Grocery / Mini-Mart',
  'Clothing / Garment',
  'Beauty Salon',
  'Bakery / Food / Grocery'
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

export default function AiIntakeAssistant({ onCompleteIntake, onSwitchToManual, initialStage = null, initialGoal = null, loading = false }) {
  // intakeStep: 'type_select' | 'expansion_select' | 'describe' | 'form'
  const [intakeStep, setIntakeStep] = useState(
    initialStage === 'Existing' ? (initialGoal ? 'describe' : 'expansion_select') : (initialStage === 'New' ? 'describe' : 'type_select')
  );

  // Context selection
  const [selectedStage, setSelectedStage] = useState(initialStage || 'New');
  const [selectedGoal, setSelectedGoal] = useState(initialGoal || 'Establish New Business');
  const [stageSelectedByUser, setStageSelectedByUser] = useState(Boolean(initialStage));
  const [inputText, setInputText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Prefilled Form Data & AI state
  const [prefilledFormData, setPrefilledFormData] = useState(null);
  const [aiFilledKeys, setAiFilledKeys] = useState(new Set());
  const [extracting, setExtracting] = useState(false);

  const handleSelectStartup = () => {
    setSelectedStage('New');
    setStageSelectedByUser(true);
    setSelectedGoal('Establish New Business');
    setPrefilledFormData((prev) => ({
      ...EMPTY_FORM_STATE,
      ...prev,
      business_stage: 'New',
      proposed_action: prev?.proposed_action || 'Establish New Business',
    }));
    setIntakeStep('form');
    setErrorMsg('');
  };

  const handleSelectExpansion = () => {
    setSelectedStage('Existing');
    setStageSelectedByUser(true);
    setIntakeStep('expansion_select');
    setErrorMsg('');
  };

  const handleSelectExpansionGoal = (goal) => {
    setSelectedStage('Existing');
    setSelectedGoal(goal);
    setPrefilledFormData((prev) => ({
      ...EMPTY_FORM_STATE,
      ...prev,
      business_stage: 'Existing',
      proposed_action: prev?.proposed_action || (goal === 'Open New Branch' ? 'Expand / Open a New Branch' : 'Introduce a New Product / Service Line'),
    }));
    setIntakeStep('form');
    setErrorMsg('');
  };

  const latestFormDataRef = useRef(null);

  const handleFormChange = useCallback((updated) => {
    if (updated) {
      latestFormDataRef.current = updated;
    }
  }, []);

  const handleBack = useCallback((currentData) => {
    const dataToSave = currentData || latestFormDataRef.current;
    if (dataToSave) {
      setPrefilledFormData((prev) => ({ ...prev, ...dataToSave }));
    }
    if (intakeStep === 'form') {
      if (selectedStage === 'Existing') {
        setIntakeStep('expansion_select');
      } else {
        setIntakeStep('type_select');
        setStageSelectedByUser(false);
      }
    } else if (intakeStep === 'expansion_select') {
      setIntakeStep('type_select');
      setStageSelectedByUser(false);
    }
  }, [intakeStep, selectedStage]);

  // Step Describe -> Step Form: Extract & Prefill ALL original form fields
  const handleExtractAndReview = async () => {
    if (!inputText || inputText.trim().length < 15) {
      setErrorMsg("Please provide a description of at least 15 characters (e.g. business sector, district location, and capital).");
      return;
    }
    setErrorMsg('');
    setExtracting(true);

    try {
      const data = await extractIntakeInformation(
        inputText,
        selectedStage,
        selectedStage === 'Existing' ? selectedGoal : 'Establish New Business'
      );

      const prefilled = {
        business_name: '',
        business_stage: selectedStage || '',
        proposed_action: selectedStage === 'Existing'
          ? (selectedGoal === 'Open New Branch' ? 'Expand / Open a New Branch' : 'Introduce a New Product / Service Line')
          : '',
        original_business_description: inputText,
        business_category: '',
        business_model: '',
        district: '',
        address: '',
        location_type: '',
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
        location_suitability_score: '',
        available_staff_count: '',
        available_equipment_score: '',
        required_equipment_score: '',
        supplier_availability_score: '',
      };

      const filledKeys = new Set();

      if (data.context && data.context.business_category) {
        prefilled.business_category = data.context.business_category;
        filledKeys.add('business_category');
      }

      if (data.extracted_fields) {
        Object.entries(data.extracted_fields).forEach(([k, meta]) => {
          if (meta.value !== null && meta.value !== undefined && meta.value !== '' && meta.status !== 'hidden') {
            prefilled[k] = meta.value;
            filledKeys.add(k);
          }
        });
      }

      if (data.extracted_fields?.district?.value) {
        const rawDist = String(data.extracted_fields.district.value).trim().toLowerCase();
        const found = SRI_LANKA_DISTRICTS.find(d => {
          const dl = d.toLowerCase();
          if (dl === rawDist) return true;
          if ((rawDist === 'kalutara' || rawDist === 'kaluthara') && (dl === 'kalutara' || dl === 'kaluthara')) return true;
          return false;
        });
        if (found) {
          prefilled.district = found;
          filledKeys.add('district');
        }
      }

      setPrefilledFormData(prefilled);
      setAiFilledKeys(filledKeys);
      setIntakeStep('form');
    } catch (err) {
      console.warn("AI extraction fallback to full form:", err);
      setPrefilledFormData({
        business_name: '',
        business_stage: selectedStage || '',
        proposed_action: selectedStage === 'Existing'
          ? (selectedGoal === 'Open New Branch' ? 'Expand / Open a New Branch' : 'Introduce a New Product / Service Line')
          : '',
        original_business_description: inputText,
        business_category: '',
        business_model: '',
        district: '',
        address: '',
        location_type: '',
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
        location_suitability_score: '',
        available_staff_count: '',
        available_equipment_score: '',
        required_equipment_score: '',
        supplier_availability_score: '',
      });
      setAiFilledKeys(new Set());
      setIntakeStep('form');
    } finally {
      setExtracting(false);
    }
  };

  const handleManualSwitchWithContext = () => {
    setPrefilledFormData((prev) => {
      const base = prev || EMPTY_FORM_STATE;
      return {
        ...EMPTY_FORM_STATE,
        ...base,
        business_stage: base.business_stage || selectedStage || 'New',
        proposed_action: base.proposed_action || (selectedStage === 'Existing'
          ? (selectedGoal === 'Open New Branch' ? 'Expand / Open a New Branch' : 'Introduce a New Product / Service Line')
          : ''),
        original_business_description: base.original_business_description || inputText || '',
      };
    });
    setIntakeStep('form');
  };

  return (
    <>
      <div className="wizard-glass-container">

      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1.25rem', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <Logo variant="compact" height={36} />
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.3px', margin: 0 }}>
              AI Business Plan Generator
            </h2>
          </div>
        </div>

        {/* Sleek Step Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              background: (intakeStep === 'type_select' || intakeStep === 'expansion_select')
                ? 'linear-gradient(135deg, #0ea5e9, #3b82f6)'
                : 'rgba(56, 189, 248, 0.2)',
              color: '#ffffff',
              padding: '0.35rem 0.9rem',
              borderRadius: '24px',
              fontWeight: 700,
              fontSize: '0.78rem',
              boxShadow: (intakeStep === 'type_select' || intakeStep === 'expansion_select')
                ? '0 0 18px rgba(14, 165, 233, 0.55)'
                : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <span>1. Business Type</span>
          </div>

          <span 
            style={{ 
              color: intakeStep === 'form' ? '#38bdf8' : '#64748b', 
              fontSize: '0.8rem', 
              fontWeight: intakeStep === 'form' ? 700 : 500 
            }}
          >
            2. Multi-Step Form & Plan
          </span>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '0.75rem 1rem', borderRadius: '8px', color: '#fca5a5', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1A: BUSINESS TYPE SELECTION (NEW STARTUP vs EXISTING BUSINESS EXPANSION) */}
      {/* ========================================================================= */}
      {intakeStep === 'type_select' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.3px', margin: '0 0 0.35rem 0' }}>
                Select Business Type
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                Choose whether you are launching a new enterprise or scaling an existing operation.
              </p>
            </div>

            <button
              type="button"
              onClick={handleManualSwitchWithContext}
              className="ghost-manual-btn"
              title="Skip AI assistant and jump straight to the multi-step form"
            >
              <FileEdit size={15} style={{ color: '#94a3b8' }} />
              <span>Fill Form Manually</span>
            </button>
          </div>

          {/* 2-Column Selection Cards */}
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
              gap: '1.5rem', 
              marginTop: '0.25rem' 
            }}
          >
            {/* Card 1: New Startup */}
            <div
              role="button"
              tabIndex={0}
              onClick={handleSelectStartup}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelectStartup(); } }}
              className="wizard-card-startup"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.25rem' }}>
                <div style={{ maxWidth: '240px' }}>
                  <h4 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.5rem', letterSpacing: '-0.3px' }}>
                    New Startup
                  </h4>
                  <p style={{ fontSize: '0.86rem', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
                    Turn your business idea into a clear, professional plan and take the first step toward launching your business.
                  </p>
                </div>

                {/* 3D Isometric Glowing Blue Neon Rocket Illustration */}
                <div 
                  style={{ 
                    width: '100px', 
                    height: '100px', 
                    flexShrink: 0, 
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div 
                    style={{
                      position: 'absolute',
                      width: '75px',
                      height: '75px',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(6, 182, 212, 0.35) 0%, rgba(59, 130, 246, 0.15) 50%, transparent 75%)',
                      filter: 'blur(14px)',
                      zIndex: 0,
                    }}
                  />
                  <svg width="90" height="90" viewBox="0 0 100 100" fill="none" style={{ position: 'relative', zIndex: 1, filter: 'drop-shadow(0 0 10px rgba(6, 182, 212, 0.65))' }}>
                    <defs>
                      <linearGradient id="rocketBodyGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="60%" stopColor="#0284c7" />
                        <stop offset="100%" stopColor="#0369a1" />
                      </linearGradient>
                      <linearGradient id="neonGlowGrad" x1="0" y1="1" x2="1" y2="0">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="100%" stopColor="#38bdf8" />
                      </linearGradient>
                    </defs>
                    {/* Isometric Launch Blueprint Floor Plane */}
                    <polygon points="50,75 85,60 50,45 15,60" fill="rgba(6, 182, 212, 0.08)" stroke="#06b6d4" strokeWidth="1" strokeDasharray="3 3" />
                    {/* Rocket Exhaust Trail */}
                    <polygon points="46,55 54,55 51,78 49,78" fill="url(#neonGlowGrad)" opacity="0.8" />
                    <circle cx="50" cy="80" r="4" fill="#38bdf8" opacity="0.6" />
                    {/* Left & Right Fins */}
                    <path d="M36,46 L26,58 L38,55 Z" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
                    <path d="M64,46 L74,58 L62,55 Z" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
                    {/* Main Rocket Fuselage */}
                    <path d="M50,15 C44,28 42,42 42,54 L58,54 C58,42 56,28 50,15 Z" fill="url(#rocketBodyGrad)" stroke="#38bdf8" strokeWidth="2" />
                    {/* Porthole */}
                    <circle cx="50" cy="34" r="5" fill="#0c4a6e" stroke="#22d3ee" strokeWidth="1.8" />
                    <circle cx="50" cy="34" r="2.5" fill="#38bdf8" />
                  </svg>
                </div>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#22d3ee', fontSize: '0.88rem', fontWeight: 700, paddingTop: '0.5rem' }}>
                <span>Select New Startup</span>
                <ArrowRight size={16} />
              </div>
            </div>

            {/* Card 2: Existing Business Expansion */}
            <div
              role="button"
              tabIndex={0}
              onClick={handleSelectExpansion}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelectExpansion(); } }}
              className="wizard-card-expansion"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.25rem' }}>
                <div style={{ maxWidth: '240px' }}>
                  <h4 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.5rem', letterSpacing: '-0.3px' }}>
                    Existing Business Expansion
                  </h4>
                  <p style={{ fontSize: '0.86rem', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
                    Plan your next stage of growth, from opening a new location to introducing new products or services.
                  </p>
                </div>

                {/* 3D Isometric Glowing Purple Building Blocks & Trending Arrow */}
                <div 
                  style={{ 
                    width: '100px', 
                    height: '100px', 
                    flexShrink: 0, 
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div 
                    style={{
                      position: 'absolute',
                      width: '75px',
                      height: '75px',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(168, 85, 247, 0.35) 0%, rgba(217, 70, 239, 0.15) 50%, transparent 75%)',
                      filter: 'blur(14px)',
                      zIndex: 0,
                    }}
                  />
                  <svg width="90" height="90" viewBox="0 0 100 100" fill="none" style={{ position: 'relative', zIndex: 1, filter: 'drop-shadow(0 0 10px rgba(168, 85, 247, 0.65))' }}>
                    <defs>
                      <linearGradient id="cubeTopGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#c084fc" />
                        <stop offset="100%" stopColor="#9333ea" />
                      </linearGradient>
                      <linearGradient id="cubeLeftGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#7e22ce" />
                        <stop offset="100%" stopColor="#581c87" />
                      </linearGradient>
                      <linearGradient id="cubeRightGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#9333ea" />
                        <stop offset="100%" stopColor="#6b21a8" />
                      </linearGradient>
                    </defs>
                    {/* Isometric Cube 1 (Low) */}
                    <g transform="translate(18, 54)">
                      <polygon points="12,0 24,6 12,12 0,6" fill="url(#cubeTopGrad)" stroke="#c084fc" strokeWidth="1" />
                      <polygon points="0,6 12,12 12,22 0,16" fill="url(#cubeLeftGrad)" stroke="#c084fc" strokeWidth="1" />
                      <polygon points="12,12 24,6 24,16 12,22" fill="url(#cubeRightGrad)" stroke="#c084fc" strokeWidth="1" />
                    </g>
                    {/* Isometric Cube 2 (Mid) */}
                    <g transform="translate(38, 42)">
                      <polygon points="12,0 24,6 12,12 0,6" fill="url(#cubeTopGrad)" stroke="#c084fc" strokeWidth="1" />
                      <polygon points="0,6 12,12 12,34 0,28" fill="url(#cubeLeftGrad)" stroke="#c084fc" strokeWidth="1" />
                      <polygon points="12,12 24,6 24,28 12,34" fill="url(#cubeRightGrad)" stroke="#c084fc" strokeWidth="1" />
                    </g>
                    {/* Isometric Cube 3 (High) */}
                    <g transform="translate(58, 30)">
                      <polygon points="12,0 24,6 12,12 0,6" fill="url(#cubeTopGrad)" stroke="#c084fc" strokeWidth="1" />
                      <polygon points="0,6 12,12 12,46 0,40" fill="url(#cubeLeftGrad)" stroke="#c084fc" strokeWidth="1" />
                      <polygon points="12,12 24,6 24,40 12,46" fill="url(#cubeRightGrad)" stroke="#c084fc" strokeWidth="1" />
                    </g>
                    {/* Upward Trending Neon Magenta/Purple Arrow */}
                    <path d="M22,50 Q48,32 72,16" stroke="#f472b6" strokeWidth="3" strokeLinecap="round" />
                    <polygon points="78,13 65,14 74,23" fill="#f472b6" />
                  </svg>
                </div>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#c084fc', fontSize: '0.88rem', fontWeight: 700, paddingTop: '0.5rem' }}>
                <span>Select Expansion Path</span>
                <ArrowRight size={16} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1B: EXPANSION SUB-TYPE SELECTION (BRANCH vs NEW PRODUCT LINE) */}
      {/* ========================================================================= */}
      {intakeStep === 'expansion_select' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={handleBack}
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <ArrowLeft size={14} /> Back
              </button>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.2px' }}>
                  Choose Expansion Strategy
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                  Select the expansion model for your existing enterprise.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleManualSwitchWithContext}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <FileEdit size={14} />
              <span>Fill Form Manually</span>
            </button>
          </div>

          <div 
            className="grid-2" 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
              gap: '1.25rem', 
              marginTop: '0.5rem' 
            }}
          >
            {/* Expansion Card 1: Expand / Open a New Branch */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleSelectExpansionGoal('Open New Branch')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelectExpansionGoal('Open New Branch'); } }}
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(129, 140, 248, 0.08))',
                border: '1px solid rgba(129, 140, 248, 0.35)',
                borderRadius: '14px',
                padding: '1.75rem 1.5rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.9rem',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                outline: 'none',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.borderColor = '#818cf8';
                e.currentTarget.style.boxShadow = '0 10px 28px rgba(99, 102, 241, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(129, 140, 248, 0.35)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#818cf8';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(129, 140, 248, 0.3)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(129, 140, 248, 0.35)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div 
                style={{ 
                  width: '52px', 
                  height: '52px', 
                  borderRadius: '12px', 
                  background: 'linear-gradient(135deg, #6366f1, #818cf8)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: '#ffffff',
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
                }}
              >
                <Building2 size={26} />
              </div>

              <div>
                <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.35rem' }}>
                  Expand / Open a New Branch
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.4, margin: 0 }}>
                  Set up an additional physical location or branch.
                </p>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#818cf8', fontSize: '0.82rem', fontWeight: 700 }}>
                <span>Select Branch Expansion</span>
                <ArrowRight size={15} />
              </div>
            </div>

            {/* Expansion Card 2: Introduce a New Product / Service Line */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleSelectExpansionGoal('Introduce New Product')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelectExpansionGoal('Introduce New Product'); } }}
              style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(234, 88, 12, 0.08))',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                borderRadius: '14px',
                padding: '1.75rem 1.5rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.9rem',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                outline: 'none',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.borderColor = '#fbbf24';
                e.currentTarget.style.boxShadow = '0 10px 28px rgba(245, 158, 11, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.35)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#fbbf24';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.3)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.35)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div 
                style={{ 
                  width: '52px', 
                  height: '52px', 
                  borderRadius: '12px', 
                  background: 'linear-gradient(135deg, #f59e0b, #ea580c)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: '#ffffff',
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)'
                }}
              >
                <Layers size={26} />
              </div>

              <div>
                <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.35rem' }}>
                  Introduce a New Product / Service Line
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.4, margin: 0 }}>
                  Add new inventory, offerings, or service lines.
                </p>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fbbf24', fontSize: '0.82rem', fontWeight: 700 }}>
                <span>Select Product Expansion</span>
                <ArrowRight size={15} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: DESCRIBE BUSINESS IDEA (FULL CLEAN PAGE) */}
      {/* ========================================================================= */}
      {(intakeStep === 'describe' || intakeStep === 'form') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem', animation: 'fadeIn 0.2s ease-in-out' }}>
          
          {/* Top navigation row: Back button & Stage badge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={handleBack}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                title="Return to previous selection"
              >
                <ArrowLeft size={14} /> Back
              </button>

              {/* Status Badge */}
              {selectedStage === 'New' ? (
                <span 
                  style={{ 
                    background: 'rgba(56, 189, 248, 0.15)', 
                    color: '#38bdf8', 
                    border: '1px solid rgba(56, 189, 248, 0.35)', 
                    padding: '0.3rem 0.8rem', 
                    borderRadius: '20px', 
                    fontSize: '0.78rem', 
                    fontWeight: 700, 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.4rem' 
                  }}
                >
                  <Rocket size={13} /> New Startup
                </span>
              ) : selectedGoal === 'Open New Branch' ? (
                <span 
                  style={{ 
                    background: 'rgba(129, 140, 248, 0.15)', 
                    color: '#818cf8', 
                    border: '1px solid rgba(129, 140, 248, 0.35)', 
                    padding: '0.3rem 0.8rem', 
                    borderRadius: '20px', 
                    fontSize: '0.78rem', 
                    fontWeight: 700, 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.4rem' 
                  }}
                >
                  <Building2 size={13} /> Branch Expansion
                </span>
              ) : (
                <span 
                  style={{ 
                    background: 'rgba(245, 158, 11, 0.15)', 
                    color: '#fbbf24', 
                    border: '1px solid rgba(245, 158, 11, 0.35)', 
                    padding: '0.3rem 0.8rem', 
                    borderRadius: '20px', 
                    fontSize: '0.78rem', 
                    fontWeight: 700, 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.4rem' 
                  }}
                >
                  <Layers size={13} /> New Product / Service Line
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleManualSwitchWithContext}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.95rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <FileEdit size={14} />
              <span>Fill Form Manually</span>
            </button>
          </div>

          {/* Heading & Short Professional Description */}
          <div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.3px', margin: '0 0 0.4rem 0' }}>
              {selectedStage === 'New' 
                ? 'Describe your business idea'
                : selectedGoal === 'Open New Branch'
                ? 'Describe your branch expansion plan'
                : 'Describe your new product or service expansion'}
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
              {selectedStage === 'New'
                ? 'Turn your business idea into a clear, professional plan. Describe what you want to offer, your target audience, and your capital — let our AI Business Plan Generator do the heavy lifting.'
                : 'Detail your existing business operations, target expansion goals, location or product details, and allocated budget.'}
            </p>
          </div>

          {/* Business Idea Textarea */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.88rem', color: '#cbd5e1', fontWeight: 700 }}>
                Business Details:
              </label>
              <span style={{ fontSize: '0.75rem', color: inputText.length >= 15 ? '#4ade80' : '#94a3b8' }}>
                {inputText.length} characters (min 15)
              </span>
            </div>

            <textarea
              rows={7}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                selectedStage === 'New'
                  ? "Describe what your business will offer, target customers, location, starting capital, and your goals..."
                  : selectedGoal === 'Open New Branch'
                  ? "Describe your current business operations, your new branch location, available capital, and expected customer footfall..."
                  : "Describe your existing store, the new products or services you want to launch, target customer base, and allocated budget..."
              }
              className="form-control"
              style={{ 
                fontSize: '0.92rem', 
                lineHeight: '1.65', 
                padding: '1.15rem', 
                borderRadius: '12px',
                minHeight: '170px'
              }}
            />
          </div>

          {/* Action Row: Fill Form Manually & Continue */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={handleManualSwitchWithContext}
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem', padding: '0.65rem 1.15rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <FileEdit size={15} />
              <span>Fill Form Manually</span>
            </button>

            <button
              type="button"
              onClick={handleExtractAndReview}
              disabled={extracting || !inputText.trim() || inputText.trim().length < 15}
              className="btn btn-primary"
              style={{ padding: '0.85rem 2.2rem', fontSize: '0.95rem', fontWeight: 700, boxShadow: '0 4px 16px rgba(59, 130, 246, 0.4)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {extracting ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Preparing Your Plan...</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      </div>

      {intakeStep === 'form' && (
        <BusinessForm
          selectedStage={selectedStage}
          initialValues={prefilledFormData}
          aiFilledKeys={aiFilledKeys}
          onSubmit={onCompleteIntake}
          loading={loading}
          onBack={handleBack}
          onClose={handleBack}
          onFormChange={handleFormChange}
          isStageLocked={selectedStage === 'New' && (stageSelectedByUser || prefilledFormData?.business_stage === 'New')}
          stageBadge={
            selectedStage === 'New' ? (
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
                <Rocket size={12} /> New Startup
              </span>
            ) : selectedGoal === 'Open New Branch' ? (
              <span 
                style={{ 
                  background: 'rgba(129, 140, 248, 0.15)', 
                  color: '#818cf8', 
                  border: '1px solid rgba(129, 140, 248, 0.35)', 
                  padding: '0.2rem 0.65rem', 
                  borderRadius: '16px', 
                  fontSize: '0.75rem', 
                  fontWeight: 700, 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.35rem' 
                }}
              >
                <Building2 size={12} /> Branch Expansion
              </span>
            ) : (
              <span 
                style={{ 
                  background: 'rgba(245, 158, 11, 0.15)', 
                  color: '#fbbf24', 
                  border: '1px solid rgba(245, 158, 11, 0.35)', 
                  padding: '0.2rem 0.65rem', 
                  borderRadius: '16px', 
                  fontSize: '0.75rem', 
                  fontWeight: 700, 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.35rem' 
                }}
              >
                <Layers size={12} /> New Product Line
              </span>
            )
          }
        />
      )}
    </>
  );
}
