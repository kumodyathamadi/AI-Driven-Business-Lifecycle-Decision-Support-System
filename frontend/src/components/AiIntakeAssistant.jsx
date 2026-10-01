import React, { useState } from 'react';
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
  Sliders
} from 'lucide-react';

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

const PROMPT_CHIPS = [
  {
    title: '🍞 Bakery in Homagama',
    stage: 'New',
    text: 'I want to start an artisanal bakery in Homagama, Colombo District. I have Rs. 650,000 available capital and 4 years of baking experience. I expect around 45 daily customers with an average price of Rs. 380 per item.'
  },
  {
    title: '👗 Clothing Boutique in Colombo',
    stage: 'New',
    text: 'I am planning to open a readymade clothing and garment boutique in Colombo. Capital available is Rs. 1,200,000 with 3 years of retail fashion experience. Expecting 35 customers per day at Rs. 2,500 average item price.'
  },
  {
    title: '🛒 Mini-Mart in Gampaha',
    stage: 'New',
    text: 'Planning to launch a grocery mini-mart in Gampaha town. Initial capital is Rs. 850,000 and I have 2 years of retail management experience. Target is 65 customers daily with average basket size of Rs. 600.'
  },
  {
    title: '💇 Beauty Salon in Kandy',
    stage: 'New',
    text: 'I want to establish a beauty salon in Kandy. I have Rs. 500,000 investment capital and 5 years of professional salon experience. Average service price is Rs. 1,500 with around 18 clients per day.'
  },
  {
    title: '🏢 Existing Bakery Expanding Branch',
    stage: 'Existing',
    goal: 'Open New Branch',
    text: 'I currently run a bakery in Homagama with 5 staff members and 70 customers per day. I want to open a new branch in Maharagama with Rs. 900,000 capital, expecting 55 customers daily at Rs. 400 average price.'
  }
];

export default function AiIntakeAssistant({ onCompleteIntake, onSwitchToManual }) {
  // 3-step workflow: 1. Describe -> 2. Review -> 3. Analyze
  const [currentStep, setCurrentStep] = useState(1); // 1 = Describe, 2 = Review, 3 = Analyze
  
  // Context selection
  const [selectedStage, setSelectedStage] = useState('New');
  const [selectedGoal, setSelectedGoal] = useState('Establish New Business');
  const [inputText, setInputText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Extracted fields & confidence state
  const [extractedReviewData, setExtractedReviewData] = useState({
    business_stage: 'New',
    business_category: 'Bakery / Food / Grocery',
    district: 'Colombo',
    location_type: 'Suburban Commercial Hub',
    available_capital_lkr: 500000,
    monthly_budget_lkr: 120000,
    expected_price_lkr: 400,
    expected_customers_per_day: 40,
    entrepreneur_experience_years: 3,
    original_business_description: ''
  });

  const [fieldConfidence, setFieldConfidence] = useState({});
  const [extracting, setExtracting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [reviewErrors, setReviewErrors] = useState({});

  const EXISTING_STAGE_GOAL_OPTIONS = [
    { id: "Open New Branch", label: "Expand / Open a New Branch", desc: "Set up an additional physical location or branch." },
    { id: "Introduce New Product", label: "Introduce a New Product / Service Line", desc: "Add new inventory, offerings, or service lines." }
  ];

  const handleChipClick = (chip) => {
    setSelectedStage(chip.stage);
    if (chip.goal) setSelectedGoal(chip.goal);
    setInputText(chip.text);
    setErrorMsg('');
  };

  // Step 1 -> Step 2: Extract & Transition to Review
  const handleExtractAndReview = async () => {
    if (!inputText || inputText.trim().length < 15) {
      setErrorMsg("Please provide a description of at least 15 characters (e.g. your business sector, district location, and capital) so our AI can extract your profile.");
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

      const reviewState = {
        business_stage: selectedStage,
        original_business_description: inputText,
        business_category: data.context?.business_category || 'Bakery / Food / Grocery',
        district: 'Colombo',
        location_type: 'Suburban Commercial Hub',
        available_capital_lkr: 500000,
        monthly_budget_lkr: 120000,
        expected_price_lkr: 400,
        expected_customers_per_day: 40,
        entrepreneur_experience_years: 2
      };

      const confidences = {};

      if (data.extracted_fields) {
        Object.entries(data.extracted_fields).forEach(([k, meta]) => {
          if (meta.value !== null && meta.value !== undefined && meta.status !== 'hidden') {
            reviewState[k] = meta.value;
          }
          confidences[k] = meta.confidence !== undefined ? meta.confidence : 0.8;
        });
      }

      // Check district matching
      if (data.extracted_fields?.district?.value) {
        const found = SRI_LANKA_DISTRICTS.find(
          d => d.toLowerCase() === String(data.extracted_fields.district.value).toLowerCase()
        );
        if (found) reviewState.district = found;
      }

      setExtractedReviewData(reviewState);
      setFieldConfidence(confidences);
      setCurrentStep(2); // Go to Review step
    } catch (err) {
      console.warn("AI extraction fallback to manual review:", err);
      setExtractedReviewData(prev => ({
        ...prev,
        business_stage: selectedStage,
        original_business_description: inputText
      }));
      setCurrentStep(2);
    } finally {
      setExtracting(false);
    }
  };

  // Handle Review field updates
  const handleFieldChange = (key, value) => {
    setExtractedReviewData(prev => ({ ...prev, [key]: value }));
    if (reviewErrors[key]) {
      setReviewErrors(prev => ({ ...prev, [key]: null }));
    }
  };

  // Validate Review Step & Run Analysis
  const handleProceedToAnalysis = async () => {
    const errors = {};
    const cap = Number(extractedReviewData.available_capital_lkr);
    if (isNaN(cap) || cap <= 0) {
      errors.available_capital_lkr = "Available capital must be a positive number (LKR).";
    }

    const cust = Number(extractedReviewData.expected_customers_per_day);
    if (isNaN(cust) || cust <= 0) {
      errors.expected_customers_per_day = "Expected customers must be greater than 0.";
    }

    if (!extractedReviewData.district) {
      errors.district = "Please select a valid Sri Lankan district.";
    }

    if (Object.keys(errors).length > 0) {
      setReviewErrors(errors);
      return;
    }

    setReviewErrors({});
    setCurrentStep(3); // Go to Analyze step
    setAnalyzing(true);

    try {
      const payload = {
        ...extractedReviewData,
        available_capital_lkr: parseFloat(extractedReviewData.available_capital_lkr),
        monthly_budget_lkr: parseFloat(extractedReviewData.monthly_budget_lkr || 100000),
        expected_price_lkr: parseFloat(extractedReviewData.expected_price_lkr || 350),
        expected_customers_per_day: parseInt(extractedReviewData.expected_customers_per_day),
        entrepreneur_experience_years: parseInt(extractedReviewData.entrepreneur_experience_years || 2),
        original_business_description: inputText || extractedReviewData.original_business_description
      };

      await onCompleteIntake(payload);
    } catch (err) {
      console.error("Submission error:", err);
      setCurrentStep(2); // Return to review if failed
      setErrorMsg(`Analysis failed: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="glass-card" style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem' }}>
      
      {/* Three-Step Indicator Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <Logo variant="compact" height={36} />
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>New Business Feasibility Analysis</h2>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Sri Lankan SME Decision Support & Recommendations
            </div>
          </div>
        </div>

        {/* Stepper Pill Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.7)', padding: '0.35rem 0.65rem', borderRadius: '30px', border: '1px solid var(--border-color)' }}>
          {[
            { step: 1, label: '1. Describe' },
            { step: 2, label: '2. Review & Refine' },
            { step: 3, label: '3. Analyze' },
          ].map((s) => {
            const isActive = currentStep === s.step;
            const isCompleted = currentStep > s.step;

            return (
              <div 
                key={s.step} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.35rem', 
                  fontSize: '0.75rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#60a5fa' : isCompleted ? '#4ade80' : '#64748b',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '16px',
                  background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent'
                }}
              >
                {isCompleted ? <Check size={13} /> : null}
                <span>{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '0.75rem 1rem', borderRadius: '8px', color: '#fca5a5', fontSize: '0.85rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: DESCRIBE (NATURAL LANGUAGE INTAKE) */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Secondary Path Switch */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              onClick={onSwitchToManual}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <FileEdit size={14} />
              <span>Fill Form Manually</span>
            </button>
          </div>

          {/* 1. Stage Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '0.5rem' }}>
              1. Business Lifecycle Stage
            </label>

            <div className="grid-2">
              <div 
                onClick={() => {
                  setSelectedStage('New');
                  setSelectedGoal('Establish New Business');
                }}
                style={{ 
                  padding: '1rem', 
                  borderRadius: '10px', 
                  cursor: 'pointer',
                  border: selectedStage === 'New' ? '2px solid #60a5fa' : '1px solid var(--border-color)',
                  background: selectedStage === 'New' ? 'rgba(30, 58, 138, 0.35)' : 'rgba(15, 23, 42, 0.6)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: selectedStage === 'New' ? '#60a5fa' : '#fff', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                  <Building2 size={16} /> New Startup
                </div>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: '1.4' }}>
                  Evaluating a new business venture. Feasibility assesses market viability, capital adequacy, and expected demand.
                </p>
              </div>

              <div 
                onClick={() => {
                  setSelectedStage('Existing');
                  setSelectedGoal('Open New Branch');
                }}
                style={{ 
                  padding: '1rem', 
                  borderRadius: '10px', 
                  cursor: 'pointer',
                  border: selectedStage === 'Existing' ? '2px solid #60a5fa' : '1px solid var(--border-color)',
                  background: selectedStage === 'Existing' ? 'rgba(30, 58, 138, 0.35)' : 'rgba(15, 23, 42, 0.6)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: selectedStage === 'Existing' ? '#60a5fa' : '#fff', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                  <Target size={16} /> Existing Business Expansion
                </div>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: '1.4' }}>
                  Evaluating expansion of an existing active enterprise into a new branch or new product/service category.
                </p>
              </div>
            </div>
          </div>

          {/* Goal Selector for Existing Business */}
          {selectedStage === 'Existing' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '0.5rem' }}>
                Primary Expansion Goal
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {EXISTING_STAGE_GOAL_OPTIONS.map((g) => (
                  <div
                    key={g.id}
                    onClick={() => setSelectedGoal(g.id)}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: selectedGoal === g.id ? '1px solid #60a5fa' : '1px solid var(--border-color)',
                      background: selectedGoal === g.id ? 'rgba(59, 130, 246, 0.15)' : 'rgba(15, 23, 42, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: selectedGoal === g.id ? '#60a5fa' : '#fff' }}>
                        {g.label}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {g.desc}
                      </div>
                    </div>
                    {selectedGoal === g.id && <Check size={16} style={{ color: '#60a5fa' }} />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prompt Chips */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '0.5rem' }}>
              💡 Example Prompt Ideas (Click to Try)
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {PROMPT_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleChipClick(chip)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', borderRadius: '20px', background: 'rgba(30, 41, 59, 0.8)' }}
                >
                  {chip.title}
                </button>
              ))}
            </div>
          </div>

          {/* Description Textarea */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 700 }}>
                Describe your business idea or existing operation:
              </label>
              <span style={{ fontSize: '0.72rem', color: inputText.length >= 15 ? '#4ade80' : '#94a3b8' }}>
                {inputText.length} characters (min 15)
              </span>
            </div>

            <textarea
              rows={6}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Example: I want to start a bakery in Homagama with Rs. 500,000 capital and 5 years baking experience. I expect around 40 customers per day..."
              className="form-control"
              style={{ fontSize: '0.88rem', lineHeight: '1.6', padding: '1rem' }}
            />
          </div>

          {/* Prefill Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
            <button
              onClick={handleExtractAndReview}
              disabled={extracting || !inputText.trim() || inputText.trim().length < 15}
              className="btn btn-primary"
              style={{ padding: '0.85rem 1.8rem', fontSize: '0.9rem', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)' }}
            >
              {extracting ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Extracting Fields with AI...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Prefill & Review Extracted Fields</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: REVIEW EXTRACTED FIELDS (EDITABLE & CONFIDENCE HIGHLIGHTS) */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', padding: '1rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Sparkles size={20} style={{ color: '#60a5fa' }} />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                  Extracted Attributes Ready for Review
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Verify or edit any field before submitting to the prediction engine. Fields marked in yellow have lower extraction confidence.
                </div>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => setCurrentStep(1)} 
              className="btn btn-secondary" 
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
            >
              <ArrowLeft size={13} /> Edit Description
            </button>
          </div>

          <div className="grid-2" style={{ gap: '1.25rem' }}>
            {/* Sector / Business Category */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 700 }}>
                  Business Category *
                </label>
                {fieldConfidence.business_category < 0.7 && (
                  <span style={{ fontSize: '0.68rem', color: '#fde047', background: 'rgba(234, 179, 8, 0.15)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                    ⚠️ Needs verification
                  </span>
                )}
              </div>
              <select
                value={extractedReviewData.business_category}
                onChange={(e) => handleFieldChange('business_category', e.target.value)}
                className="form-control"
                style={{ 
                  fontSize: '0.85rem',
                  borderColor: fieldConfidence.business_category < 0.7 ? '#eab308' : undefined 
                }}
              >
                {SUPPORTED_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Sri Lankan District */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 700 }}>
                  District (Sri Lanka) *
                </label>
                {fieldConfidence.district < 0.7 && (
                  <span style={{ fontSize: '0.68rem', color: '#fde047', background: 'rgba(234, 179, 8, 0.15)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                    ⚠️ Verify district
                  </span>
                )}
              </div>
              <select
                value={extractedReviewData.district}
                onChange={(e) => handleFieldChange('district', e.target.value)}
                className="form-control"
                style={{ 
                  fontSize: '0.85rem',
                  borderColor: reviewErrors.district ? '#ef4444' : fieldConfidence.district < 0.7 ? '#eab308' : undefined 
                }}
              >
                {SRI_LANKA_DISTRICTS.map(dist => (
                  <option key={dist} value={dist}>{dist} District</option>
                ))}
              </select>
              {reviewErrors.district && (
                <span style={{ fontSize: '0.72rem', color: '#f87171' }}>{reviewErrors.district}</span>
              )}
            </div>

            {/* Available Capital */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 700 }}>
                  Available Capital (LKR) *
                </label>
                {fieldConfidence.available_capital_lkr < 0.7 && (
                  <span style={{ fontSize: '0.68rem', color: '#fde047', background: 'rgba(234, 179, 8, 0.15)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                    ⚠️ Extracted estimate
                  </span>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <DollarSign size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="number"
                  min="1000"
                  step="5000"
                  value={extractedReviewData.available_capital_lkr}
                  onChange={(e) => handleFieldChange('available_capital_lkr', e.target.value)}
                  className="form-control"
                  style={{ 
                    paddingLeft: '2.2rem', 
                    fontSize: '0.85rem',
                    borderColor: reviewErrors.available_capital_lkr ? '#ef4444' : fieldConfidence.available_capital_lkr < 0.7 ? '#eab308' : undefined 
                  }}
                />
              </div>
              {reviewErrors.available_capital_lkr && (
                <span style={{ fontSize: '0.72rem', color: '#f87171' }}>{reviewErrors.available_capital_lkr}</span>
              )}
            </div>

            {/* Entrepreneur Experience */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 700 }}>
                  Experience (Years)
                </label>
              </div>
              <input
                type="number"
                min="0"
                max="50"
                value={extractedReviewData.entrepreneur_experience_years}
                onChange={(e) => handleFieldChange('entrepreneur_experience_years', e.target.value)}
                className="form-control"
                style={{ fontSize: '0.85rem' }}
              />
            </div>

            {/* Expected Unit Price */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 700 }}>
                  Expected Average Price (LKR)
                </label>
              </div>
              <input
                type="number"
                min="10"
                value={extractedReviewData.expected_price_lkr}
                onChange={(e) => handleFieldChange('expected_price_lkr', e.target.value)}
                className="form-control"
                style={{ fontSize: '0.85rem' }}
              />
            </div>

            {/* Expected Customers / Day */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 700 }}>
                  Expected Customers / Day *
                </label>
                {fieldConfidence.expected_customers_per_day < 0.7 && (
                  <span style={{ fontSize: '0.68rem', color: '#fde047', background: 'rgba(234, 179, 8, 0.15)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                    ⚠️ Inferred default
                  </span>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <Users size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="number"
                  min="1"
                  value={extractedReviewData.expected_customers_per_day}
                  onChange={(e) => handleFieldChange('expected_customers_per_day', e.target.value)}
                  className="form-control"
                  style={{ 
                    paddingLeft: '2.2rem', 
                    fontSize: '0.85rem',
                    borderColor: reviewErrors.expected_customers_per_day ? '#ef4444' : fieldConfidence.expected_customers_per_day < 0.7 ? '#eab308' : undefined 
                  }}
                />
              </div>
              {reviewErrors.expected_customers_per_day && (
                <span style={{ fontSize: '0.72rem', color: '#f87171' }}>{reviewErrors.expected_customers_per_day}</span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem', padding: '0.7rem 1.25rem' }}
            >
              <ArrowLeft size={16} /> Back to Describe
            </button>

            <button
              type="button"
              onClick={handleProceedToAnalysis}
              className="btn btn-primary"
              style={{ padding: '0.85rem 1.8rem', fontSize: '0.9rem', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)' }}
            >
              <Sparkles size={16} />
              <span>Run AI Feasibility Analysis</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: ANALYZE (LOADING SCREEN WITH BENCHMARK PROGRESS) */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div style={{ padding: '4rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
          <div style={{ position: 'relative' }}>
            <div 
              style={{ 
                width: '72px', 
                height: '72px', 
                borderRadius: '50%', 
                background: 'rgba(59, 130, 246, 0.15)', 
                border: '2px solid rgba(59, 130, 246, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'pulse 2s infinite ease-in-out'
              }}
            >
              <Loader2 size={36} style={{ color: '#60a5fa', animation: 'spin 1.5s linear infinite' }} />
            </div>
            <Sparkles size={22} style={{ color: '#c084fc', position: 'absolute', top: '-4px', right: '-4px' }} />
          </div>

          <div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
              Evaluating SME Feasibility & Generating Strategy Plan...
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.4rem', maxWidth: '520px', lineHeight: 1.5 }}>
              Analyzing capital sufficiency, market benchmarks in Sri Lanka, calculating SHAP feature explainability, and ranking strategic recommendations.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.78rem', color: '#64748b' }}>
            <span>• Random Forest Classifier</span>
            <span>• SHAP Attribution</span>
            <span>• TOPSIS Decision Matrix</span>
          </div>
        </div>
      )}

    </div>
  );
}
