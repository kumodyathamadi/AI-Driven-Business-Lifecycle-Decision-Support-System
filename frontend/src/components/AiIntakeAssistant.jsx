import React, { useState, useCallback } from 'react';
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
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
  'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
  'Monaragala', 'Ratnapura', 'Kegalle'
];

const SUPPORTED_CATEGORIES = [
  'Grocery / Mini-Mart',
  'Clothing / Garment',
  'Beauty Salon',
  'Bakery / Food / Grocery'
];

const EMPTY_FORM_STATE = {
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
  const [inputText, setInputText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Prefilled Form Data & AI state
  const [prefilledFormData, setPrefilledFormData] = useState(null);
  const [aiFilledKeys, setAiFilledKeys] = useState(new Set());
  const [extracting, setExtracting] = useState(false);

  const handleSelectStartup = () => {
    setSelectedStage('New');
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

  const handleFormChange = useCallback((updated) => {
    if (updated) {
      setPrefilledFormData((prev) => ({ ...prev, ...updated }));
    }
  }, []);

  const handleBack = useCallback((currentData) => {
    if (currentData) {
      setPrefilledFormData((prev) => ({ ...prev, ...currentData }));
    }
    if (intakeStep === 'form') {
      if (selectedStage === 'Existing') {
        setIntakeStep('expansion_select');
      } else {
        setIntakeStep('type_select');
      }
    } else if (intakeStep === 'expansion_select') {
      setIntakeStep('type_select');
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
        const found = SRI_LANKA_DISTRICTS.find(
          d => d.toLowerCase() === String(data.extracted_fields.district.value).toLowerCase()
        );
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
      <div className="glass-card" style={{ maxWidth: '960px', margin: '0 auto', padding: '1.85rem' }}>

      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.1rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Logo variant="compact" height={34} />
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.2px' }}>
              AI Business Plan Generator
            </h2>
          </div>
        </div>

        {/* Stepper indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(15, 23, 42, 0.7)', padding: '0.3rem 0.6rem', borderRadius: '30px', border: '1px solid var(--border-color)' }}>
          {[
            { id: 'type_select', label: '1. Business Type' },
            { id: 'form', label: '2. Multi-Step Form & Plan' },
          ].map((s, idx) => {
            const isCurrent = 
              (s.id === 'type_select' && (intakeStep === 'type_select' || intakeStep === 'expansion_select')) ||
              (s.id === 'form' && intakeStep === 'form');
            
            const isPast = 
              (s.id === 'type_select' && intakeStep === 'form');

            return (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.72rem',
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? '#60a5fa' : isPast ? '#4ade80' : '#64748b',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '12px',
                  background: isCurrent ? 'rgba(59, 130, 246, 0.15)' : 'transparent'
                }}
              >
                {isPast ? <Check size={11} /> : null}
                <span>{s.label}</span>
              </div>
            );
          })}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.2px' }}>
                Select Business Type
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                Choose whether you are launching a new enterprise or scaling an existing operation.
              </p>
            </div>

            <button
              type="button"
              onClick={handleManualSwitchWithContext}
              className="btn btn-secondary"
              style={{ fontSize: '0.78rem', padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <FileEdit size={14} />
              <span>Fill Form Manually</span>
            </button>
          </div>

          <div 
            className="grid-2" 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '1.25rem', 
              marginTop: '0.5rem' 
            }}
          >
            {/* Card 1: New Startup */}
            <div
              role="button"
              tabIndex={0}
              onClick={handleSelectStartup}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelectStartup(); } }}
              style={{
                background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.12), rgba(20, 184, 166, 0.08))',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                borderRadius: '16px',
                padding: '1.75rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.2rem',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                outline: 'none',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.borderColor = '#38bdf8';
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(14, 165, 233, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.35)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#38bdf8';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(56, 189, 248, 0.3)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.35)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.15rem' }}>
                <img 
                  src={startupImg} 
                  alt="New Startup" 
                  style={{ 
                    width: '76px', 
                    height: '76px', 
                    borderRadius: '14px', 
                    objectFit: 'cover', 
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    boxShadow: '0 6px 18px rgba(14, 165, 233, 0.35)',
                    flexShrink: 0
                  }} 
                />
                <div>
                  <h4 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.35rem', letterSpacing: '-0.3px' }}>
                    New Startup
                  </h4>
                  <p style={{ fontSize: '0.86rem', color: '#94a3b8', lineHeight: 1.45, margin: 0 }}>
                    Turn your business idea into a clear, professional plan and take the first step toward launching your business.
                  </p>
                </div>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#38bdf8', fontSize: '0.85rem', fontWeight: 700 }}>
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
              style={{
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12), rgba(249, 115, 22, 0.08))',
                border: '1px solid rgba(168, 85, 247, 0.35)',
                borderRadius: '16px',
                padding: '1.75rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.2rem',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                outline: 'none',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.borderColor = '#c084fc';
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(168, 85, 247, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.35)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#c084fc';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(168, 85, 247, 0.3)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.35)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.15rem' }}>
                <img 
                  src={expansionImg} 
                  alt="Existing Business Expansion" 
                  style={{ 
                    width: '76px', 
                    height: '76px', 
                    borderRadius: '14px', 
                    objectFit: 'cover', 
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                    boxShadow: '0 6px 18px rgba(168, 85, 247, 0.35)',
                    flexShrink: 0
                  }} 
                />
                <div>
                  <h4 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.35rem', letterSpacing: '-0.3px' }}>
                    Existing Business Expansion
                  </h4>
                  <p style={{ fontSize: '0.86rem', color: '#94a3b8', lineHeight: 1.45, margin: 0 }}>
                    Plan your next stage of growth, from opening a new location to introducing new products or services.
                  </p>
                </div>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#c084fc', fontSize: '0.85rem', fontWeight: 700 }}>
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
          initialValues={prefilledFormData}
          aiFilledKeys={aiFilledKeys}
          onSubmit={onCompleteIntake}
          loading={loading}
          onBack={handleBack}
          onClose={handleBack}
          onFormChange={handleFormChange}
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
