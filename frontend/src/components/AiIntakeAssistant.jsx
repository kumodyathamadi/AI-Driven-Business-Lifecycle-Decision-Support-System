import React, { useState, useCallback, useRef, useEffect } from 'react';
import { sendIntakeChatMessage, extractIntakeInformation } from '../services/api';
import BusinessForm from './BusinessForm';
import Logo from './Logo';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  FileEdit,
  Check,
  Building2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  DollarSign,
  Users,
  Award,
  Rocket,
  TrendingUp,
  Layers,
  Send,
  Bot,
  User,
  Info,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';

const SRI_LANKA_DISTRICTS = [
  'Colombo',
  'Gampaha',
  'Kalutara'
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

export default function AiIntakeAssistant({
  onCompleteIntake,
  onSwitchToManual,
  initialStage = null,
  initialGoal = null,
  loading = false
}) {
  // Steps: 'type_select' | 'expansion_select' | 'chat' | 'form'
  const [intakeStep, setIntakeStep] = useState(() => {
    if (initialStage === 'Existing') {
      return initialGoal ? 'chat' : 'expansion_select';
    }
    if (initialStage === 'New') {
      return 'chat';
    }
    return 'type_select';
  });

  // Selected stage & goal
  const [selectedStage, setSelectedStage] = useState(initialStage || 'New');
  const [selectedGoal, setSelectedGoal] = useState(initialGoal || 'Establish New Business');
  const [stageSelectedByUser, setStageSelectedByUser] = useState(Boolean(initialStage));

  // Chat conversation state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isProcessingChat, setIsProcessingChat] = useState(false);
  const [chatError, setChatError] = useState('');

  // Extracted fields & Form state
  const [prefilledFormData, setPrefilledFormData] = useState(null);
  const [aiFilledKeys, setAiFilledKeys] = useState(new Set());
  const [userEditedKeys, setUserEditedKeys] = useState(new Set());
  const [fieldProvenance, setFieldProvenance] = useState({});
  const [extractedFieldsMeta, setExtractedFieldsMeta] = useState({});
  const [missingRequiredFields, setMissingRequiredFields] = useState([]);

  const messagesEndRef = useRef(null);
  const latestFormDataRef = useRef(null);

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (intakeStep === 'chat') {
      scrollToBottom();
    }
  }, [chatMessages, isProcessingChat, intakeStep]);

  // Initialize Welcome Message when starting Chat
  const startConversationalIntake = (stage, goal) => {
    setSelectedStage(stage);
    setSelectedGoal(goal);
    setStageSelectedByUser(true);
    setChatError('');

    let welcomeText = '';
    if (stage === 'New') {
      welcomeText = "Hello! I'm your **SME360 AI Business Intake Assistant**.\n\nTell me about the business you want to start in Sri Lanka! You can describe it in your own words:\n• What products or services you plan to offer (e.g. Grocery, Bakery, Garments, or Salon)\n• Where you want to locate it (e.g. Colombo, Kaluthara, Gampaha)\n• Your starting capital and expected monthly budget\n• Any experience, staffing, or customer expectations you have\n\n*Feel free to write in English. You can click **Continue to Form** at any time to review and edit your prefilled details.*";
    } else {
      welcomeText = "Welcome! Let's craft your **Personalized Business Growth Plan**.\n\nTell me about your existing business and how you would like to grow:\n• Your current business name, category, and location in Sri Lanka\n• Existing products or services you offer\n• Your growth vision (e.g. attracting new customers, improving sales & marketing, expanding reach, adding offerings, improving capacity, or opening locations)\n• Available growth capital and monthly operating budget\n• Current team size, equipment readiness, and operational hurdles\n\n*Describe in natural language, and click **Continue to Form** whenever you are ready.*";
    }

    setChatMessages([
      {
        id: 'welcome-msg',
        role: 'assistant',
        content: welcomeText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    // Initialize base prefill state
    setPrefilledFormData((prev) => ({
      ...EMPTY_FORM_STATE,
      ...prev,
      business_stage: stage,
      proposed_action: stage === 'Existing'
        ? (goal === 'Open New Branch' ? 'Expand / Open a New Branch' : (goal === 'Introduce New Product' ? 'Introduce a New Product / Service Line' : 'Personalized Strategic Growth & Expansion'))
        : 'Establish New Business'
    }));

    setIntakeStep('chat');
  };

  // Handler: Select Start a New Business
  const handleSelectStartup = () => {
    startConversationalIntake('New', 'Establish New Business');
  };

  // Handler: Select Grow an Existing Business -> Directly start unified Personalized Growth intake
  const handleSelectExpansion = () => {
    startConversationalIntake('Existing', 'Personalized Growth & Expansion');
  };

  // Handler: Select Expansion Goal -> Go to Chat
  const handleSelectExpansionGoal = (goal) => {
    startConversationalIntake('Existing', goal);
  };

  // Handler: Send Message in Conversational Intake
  const handleSendMessage = async (textToSend = null) => {
    const text = (textToSend || chatInput).trim();
    if (!text || isProcessingChat) return;

    setChatInput('');
    setChatError('');

    // Add user message to stream
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setIsProcessingChat(true);

    try {
      // Build conversation history for API
      const historyPayload = chatMessages.map((m) => ({
        role: m.role,
        content: m.content
      }));

      const response = await sendIntakeChatMessage({
        message: text,
        history: historyPayload,
        business_stage: selectedStage,
        business_goal: selectedGoal,
        current_extracted_fields: extractedFieldsMeta
      });

      // Append assistant reply
      const assistantMsg = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages((prev) => [...prev, assistantMsg]);

      // Update extracted state and form prefill
      if (response.extracted_fields) {
        setExtractedFieldsMeta(response.extracted_fields);

        const newFilledKeys = new Set(aiFilledKeys);
        const newProvenance = { ...fieldProvenance };
        const updatedPrefill = { ...(prefilledFormData || EMPTY_FORM_STATE) };

        Object.entries(response.extracted_fields).forEach(([k, meta]) => {
          // Rule: Never overwrite user manually edited fields
          if (userEditedKeys.has(k)) return;

          if (meta.value !== null && meta.value !== undefined && meta.value !== '' && meta.status !== 'hidden') {
            updatedPrefill[k] = meta.value;
            newFilledKeys.add(k);
            newProvenance[k] = meta.provenance || 'explicit';
          }
        });

        // Ensure canonical business_stage
        updatedPrefill.business_stage = selectedStage;
        if (selectedStage === 'Existing') {
          updatedPrefill.proposed_action = selectedGoal === 'Open New Branch'
            ? 'Expand / Open a New Branch'
            : 'Introduce a New Product / Service Line';
        }

        setPrefilledFormData(updatedPrefill);
        setAiFilledKeys(newFilledKeys);
        setFieldProvenance(newProvenance);
      }

      if (response.missing_required_fields) {
        setMissingRequiredFields(response.missing_required_fields);
      }
    } catch (err) {
      console.error('Conversational intake error:', err);
      const msg = err.message || 'Could not process message. You can try again or jump straight to the form.';
      setChatError(msg);

      const errorAssistantMsg = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `I encountered an issue connecting to the extraction service: *${msg}*. Don't worry, all previous information is safe! You can continue chatting or click **Continue to Form** below to fill out the form directly.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages((prev) => [...prev, errorAssistantMsg]);
    } finally {
      setIsProcessingChat(false);
    }
  };

  // Keyboard shortcut: Enter to send (Shift+Enter for newline)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handler: Continue to Form
  const handleContinueToForm = () => {
    setIntakeStep('form');
    setChatError('');
  };

  // Handler: Manual Switch (bypass chat or form)
  const handleManualSwitchWithContext = () => {
    setPrefilledFormData((prev) => {
      const base = prev || EMPTY_FORM_STATE;
      return {
        ...EMPTY_FORM_STATE,
        ...base,
        business_stage: selectedStage || 'New',
        proposed_action: base.proposed_action || (selectedStage === 'Existing'
          ? (selectedGoal === 'Open New Branch' ? 'Expand / Open a New Branch' : 'Introduce a New Product / Service Line')
          : 'Establish New Business'),
      };
    });
    setIntakeStep('form');
  };

  // Track user edits on form so AI extractions never overwrite manual changes
  const handleFormChange = useCallback((updated) => {
    if (!updated) return;
    latestFormDataRef.current = updated;

    // Detect fields edited by user
    if (prefilledFormData) {
      Object.keys(updated).forEach((key) => {
        if (key === 'business_stage') return;
        const oldVal = prefilledFormData[key];
        const newVal = updated[key];
        if (oldVal !== undefined && newVal !== undefined && String(oldVal).trim() !== String(newVal).trim()) {
          setUserEditedKeys((prev) => new Set(prev).add(key));
          setAiFilledKeys((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
          setFieldProvenance((prev) => ({ ...prev, [key]: 'user_edited' }));
        }
      });
    }
    setPrefilledFormData((prev) => ({ ...prev, ...updated }));
  }, [prefilledFormData]);

  // Back Navigation Handler
  const handleBack = useCallback((currentData) => {
    const dataToSave = currentData || latestFormDataRef.current;
    if (dataToSave) {
      setPrefilledFormData((prev) => ({ ...prev, ...dataToSave }));
    }

    if (intakeStep === 'form') {
      // Return to Chat with full context preserved
      setIntakeStep('chat');
    } else if (intakeStep === 'chat') {
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

  // Quick suggestion prompts for user inspiration
  const getSuggestionPrompts = () => {
    if (selectedStage === 'New') {
      return [
        "Small grocery shop in Homagama with LKR 800,000 capital",
        "Bakery with 5 years experience, target 50 customers daily",
        "Clothing boutique with 2 staff and Rs. 1 million budget",
        "Beauty salon in Panadura with moderate competition"
      ];
    } else if (selectedGoal === 'Open New Branch') {
      return [
        "Expand our supermarket with a new branch in Gampaha and 2M capital",
        "Open a second salon in Panadura with 3 staff members",
        "New clothing boutique branch with LKR 1.5 million budget"
      ];
    } else {
      return [
        "Introduce organic groceries to our store with 400k inventory",
        "Add bridal makeup packages with high local customer demand",
        "Launch custom tailor made shirts line with 500k stock"
      ];
    }
  };

  // Render extracted count (strictly counts fields extracted by AI)
  const extractedCount = aiFilledKeys ? aiFilledKeys.size : 0;

  return (
    <>
      <div className="wizard-glass-container">

        {/* Top Header bar with Logo & Step Indicators */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1.25rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <Logo variant="compact" height={36} />
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px', margin: 0 }}>
                AI Business Plan Generator
              </h2>
            </div>
          </div>

          {/* Stepper Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Step 1: Business Type */}
            <div
              style={{
                background: (intakeStep === 'type_select' || intakeStep === 'expansion_select')
                  ? 'linear-gradient(135deg, #0ea5e9, #3b82f6)'
                  : 'rgba(56, 189, 248, 0.15)',
                color: (intakeStep === 'type_select' || intakeStep === 'expansion_select') ? '#ffffff' : '#38bdf8',
                padding: '0.35rem 0.85rem',
                borderRadius: '24px',
                fontWeight: 700,
                fontSize: '0.78rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <span>1. Business Type</span>
            </div>

            {/* Step 2: Conversational Intake */}
            <div
              style={{
                background: intakeStep === 'chat'
                  ? 'linear-gradient(135deg, #0ea5e9, #3b82f6)'
                  : (intakeStep === 'form' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)'),
                color: intakeStep === 'chat' ? '#ffffff' : (intakeStep === 'form' ? '#38bdf8' : 'var(--text-muted)'),
                padding: '0.35rem 0.85rem',
                borderRadius: '24px',
                fontWeight: 700,
                fontSize: '0.78rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <Sparkles size={13} />
              <span>2. AI Conversation</span>
            </div>

            {/* Step 3: Review Form */}
            <div
              style={{
                background: intakeStep === 'form'
                  ? 'linear-gradient(135deg, #0ea5e9, #3b82f6)'
                  : 'rgba(255, 255, 255, 0.05)',
                color: intakeStep === 'form' ? '#ffffff' : 'var(--text-muted)',
                padding: '0.35rem 0.85rem',
                borderRadius: '24px',
                fontWeight: 700,
                fontSize: '0.78rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <span>3. Review & Plan</span>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {chatError && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '0.75rem 1rem', borderRadius: '10px', color: '#fca5a5', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={16} />
              <span>{chatError}</span>
            </div>
            <button
              type="button"
              onClick={handleManualSwitchWithContext}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}
            >
              Skip to Form
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1A: BUSINESS TYPE SELECTION (NEW STARTUP vs EXISTING EXPANSION)       */}
        {/* ========================================================================= */}
        {intakeStep === 'type_select' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.2s ease-in-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px', margin: '0 0 0.35rem 0' }}>
                  Select Business Type
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  Choose whether you are launching a new enterprise or expanding an existing business.
                </p>
              </div>

              <button
                type="button"
                onClick={handleManualSwitchWithContext}
                className="ghost-manual-btn"
                title="Skip conversational intake and fill form manually"
              >
                <FileEdit size={15} style={{ color: 'var(--text-secondary)' }} />
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
              {/* Option A: New Startup */}
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
                      Start a New Business
                    </h4>
                    <p style={{ fontSize: '0.86rem', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
                      Turn your business idea into a validated plan. We'll guide you through capital, location, products, and feasibility.
                    </p>
                  </div>

                  {/* Rocket Icon Graphic */}
                  <div
                    style={{
                      width: '84px',
                      height: '84px',
                      flexShrink: 0,
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(59, 130, 246, 0.15))',
                      border: '1px solid rgba(6, 182, 212, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#38bdf8',
                      boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)'
                    }}
                  >
                    <Rocket size={42} strokeWidth={2} />
                  </div>
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#22d3ee', fontSize: '0.88rem', fontWeight: 700, paddingTop: '1rem' }}>
                  <span>Start New Business Conversation</span>
                  <ArrowRight size={16} />
                </div>
              </div>

              {/* Option B: Existing Business Expansion */}
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
                      Grow an Existing Business
                    </h4>
                    <p style={{ fontSize: '0.86rem', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
                      Generate a personalized Business Growth Plan tailored to your current resources, market opportunities, and objectives.
                    </p>
                  </div>

                  {/* Growth Building Icon Graphic */}
                  <div
                    style={{
                      width: '84px',
                      height: '84px',
                      flexShrink: 0,
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(217, 70, 239, 0.15))',
                      border: '1px solid rgba(168, 85, 247, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#c084fc',
                      boxShadow: '0 0 20px rgba(168, 85, 247, 0.3)'
                    }}
                  >
                    <TrendingUp size={42} strokeWidth={2} />
                  </div>
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#c084fc', fontSize: '0.88rem', fontWeight: 700, paddingTop: '1rem' }}>
                  <span>Start Growth Conversation</span>
                  <ArrowRight size={16} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1B: EXPANSION SUB-TYPE SELECTION (BRANCH vs NEW PRODUCT LINE)         */}
        {/* ========================================================================= */}
        {intakeStep === 'expansion_select' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'fadeIn 0.2s ease-in-out' }}>
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
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.2px', margin: 0 }}>
                    Choose Expansion Strategy
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0' }}>
                    Select the growth path for your existing business enterprise.
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
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.25rem',
                marginTop: '0.5rem'
              }}
            >
              {/* Expansion Option 1: Expand / Open a New Branch */}
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
                  outline: 'none'
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
                    Set up an additional physical location, store, or branch in another area.
                  </p>
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#818cf8', fontSize: '0.82rem', fontWeight: 700 }}>
                  <span>Start Branch Conversation</span>
                  <ArrowRight size={15} />
                </div>
              </div>

              {/* Expansion Option 2: Introduce a New Product / Service Line */}
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
                  outline: 'none'
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
                    Add new inventory, offerings, or service lines within your existing establishment.
                  </p>
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fbbf24', fontSize: '0.82rem', fontWeight: 700 }}>
                  <span>Start Product Line Conversation</span>
                  <ArrowRight size={15} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: FREE-STYLE CONVERSATIONAL INTAKE INTERFACE                        */}
        {/* ========================================================================= */}
        {intakeStep === 'chat' && (
          <div className="conversational-intake-container">

            {/* Navigation & Context Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={handleBack}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <ArrowLeft size={14} /> Back
                </button>

                {/* Stage Badge */}
                {selectedStage === 'New' ? (
                  <span
                    style={{
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
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
                      padding: '0.25rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
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
                      padding: '0.25rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <Layers size={13} /> Product Line Expansion
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={handleManualSwitchWithContext}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <FileEdit size={14} />
                  <span>Fill Form Manually</span>
                </button>

                <button
                  type="button"
                  onClick={handleContinueToForm}
                  className="btn btn-primary"
                  style={{
                    fontSize: '0.82rem',
                    padding: '0.5rem 1.15rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    fontWeight: 700,
                    boxShadow: '0 4px 14px rgba(56, 189, 248, 0.35)'
                  }}
                >
                  <span>Continue to Form</span>
                  {extractedCount > 0 && (
                    <span style={{ background: 'rgba(255, 255, 255, 0.25)', padding: '0.1rem 0.45rem', borderRadius: '10px', fontSize: '0.72rem' }}>
                      {extractedCount}
                    </span>
                  )}
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>

            {/* 2-Column Chat Layout: Left Chat Stream, Right Live Extracted Profile */}
            <div className="chat-layout-grid">

              {/* LEFT: Main Chat Card */}
              <div className="chat-main-card">
                {/* Chat Stream Messages Viewport */}
                <div className="chat-stream-viewport">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`chat-message-row ${msg.role}`}
                    >
                      <div className={`chat-avatar ${msg.role}`}>
                        {msg.role === 'assistant' ? <Bot size={18} /> : <User size={18} />}
                      </div>

                      <div className={`chat-bubble ${msg.role}`}>
                        {/* Message Content formatted with linebreaks and bold */}
                        <div style={{ whiteSpace: 'pre-wrap' }}>
                          {msg.content.split('\n').map((line, idx) => (
                            <p key={idx} style={{ margin: '0 0 0.35rem 0', lineHeight: 1.55 }}>
                              {line.split(/(\*\*.*?\*\*|\*.*?\*)/g).map((part, pIdx) => {
                                if (part.startsWith('**') && part.endsWith('**')) {
                                  return <strong key={pIdx} style={{ color: msg.role === 'assistant' ? 'var(--text-primary)' : '#ffffff' }}>{part.slice(2, -2)}</strong>;
                                }
                                if (part.startsWith('*') && part.endsWith('*')) {
                                  return <em key={pIdx} style={{ opacity: 0.85 }}>{part.slice(1, -1)}</em>;
                                }
                                return part;
                              })}
                            </p>
                          ))}
                        </div>

                        <div className="chat-timestamp">
                          {msg.timestamp}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Typing Indicator */}
                  {isProcessingChat && (
                    <div className="chat-message-row assistant">
                      <div className="chat-avatar assistant">
                        <Bot size={18} />
                      </div>
                      <div className="chat-bubble assistant chat-typing-bubble">
                        <span className="chat-dot" />
                        <span className="chat-dot" />
                        <span className="chat-dot" />
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8', marginLeft: '0.35rem' }}>Extracting details...</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Input Bar */}
                <div className="chat-input-bar">
                  {/* Quick Suggestion Chips */}
                  <div className="chat-suggestions-container">
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}>
                      <Sparkles size={11} style={{ color: '#38bdf8' }} /> Examples:
                    </span>
                    {getSuggestionPrompts().map((promptText, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(promptText)}
                        className="chat-suggestion-chip"
                        disabled={isProcessingChat}
                      >
                        {promptText}
                      </button>
                    ))}
                  </div>

                  {/* Textarea Input & Send Button */}
                  <div className="chat-input-row">
                    <textarea
                      rows={2}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        selectedStage === 'New'
                          ? "E.g.: I want to open a grocery shop in Homagama with LKR 800,000 capital and 3 years experience..."
                          : "E.g.: We run Royal Garments in Colombo. We want to open a branch in Gampaha with 1.5 million..."
                      }
                      className="chat-textarea-field"
                      disabled={isProcessingChat}
                    />

                    <button
                      type="button"
                      onClick={() => handleSendMessage()}
                      disabled={!chatInput.trim() || isProcessingChat}
                      className="chat-send-action-btn"
                      title="Send message (Enter)"
                    >
                      {isProcessingChat ? (
                        <Loader2 size={16} className="spin" />
                      ) : (
                        <Send size={16} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT: Live Profile Extracted Snapshot */}
              <div className="live-profile-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <ShieldCheck size={18} style={{ color: '#38bdf8' }} />
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      Extracted Profile
                    </h4>
                  </div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: '#38bdf8',
                      padding: '0.15rem 0.55rem',
                      borderRadius: '12px',
                      fontWeight: 700
                    }}
                  >
                    {extractedCount} Captured
                  </span>
                </div>

                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                  Information parsed from your conversation. Unmentioned fields remain blank and can be completed on the form.
                </p>

                {/* Captured Fields List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1, overflowY: 'auto' }}>

                  {/* Business Name */}
                  <div className={`live-fact-item ${prefilledFormData?.business_name ? 'extracted' : 'missing'}`}>
                    <span className="live-fact-label">Business Name</span>
                    <span className="live-fact-value">
                      {prefilledFormData?.business_name || 'Not specified'}
                    </span>
                  </div>

                  {/* Category */}
                  <div className={`live-fact-item ${prefilledFormData?.business_category ? 'extracted' : 'missing'}`}>
                    <span className="live-fact-label">Category</span>
                    <span className="live-fact-value">
                      {prefilledFormData?.business_category || 'Not specified'}
                    </span>
                  </div>

                  {/* District & Province */}
                  <div className={`live-fact-item ${prefilledFormData?.district ? 'extracted' : 'missing'}`}>
                    <span className="live-fact-label">District</span>
                    <span className="live-fact-value">
                      {prefilledFormData?.district ? `${prefilledFormData.district} (${prefilledFormData.province || 'Western'})` : 'Not specified'}
                    </span>
                  </div>

                  {/* Available Capital */}
                  <div className={`live-fact-item ${prefilledFormData?.available_capital_lkr ? 'extracted' : 'missing'}`}>
                    <span className="live-fact-label">Available Capital</span>
                    <span className="live-fact-value">
                      {prefilledFormData?.available_capital_lkr ? `LKR ${Number(prefilledFormData.available_capital_lkr).toLocaleString()}` : 'Not specified'}
                    </span>
                  </div>

                  {/* Monthly Budget */}
                  <div className={`live-fact-item ${prefilledFormData?.monthly_budget_lkr ? 'extracted' : 'missing'}`}>
                    <span className="live-fact-label">Monthly Budget</span>
                    <span className="live-fact-value">
                      {prefilledFormData?.monthly_budget_lkr ? `LKR ${Number(prefilledFormData.monthly_budget_lkr).toLocaleString()}` : 'Not specified'}
                    </span>
                  </div>

                  {/* Daily Customers */}
                  <div className={`live-fact-item ${prefilledFormData?.expected_customers_per_day ? 'extracted' : 'missing'}`}>
                    <span className="live-fact-label">Expected Customers</span>
                    <span className="live-fact-value">
                      {prefilledFormData?.expected_customers_per_day ? `${prefilledFormData.expected_customers_per_day} / day` : 'Not specified'}
                    </span>
                  </div>

                  {/* Average Spend / Price */}
                  <div className={`live-fact-item ${prefilledFormData?.expected_price_lkr ? 'extracted' : 'missing'}`}>
                    <span className="live-fact-label">Average Spend</span>
                    <span className="live-fact-value">
                      {prefilledFormData?.expected_price_lkr ? `LKR ${Number(prefilledFormData.expected_price_lkr).toLocaleString()}` : 'Not specified'}
                    </span>
                  </div>

                  {/* Experience */}
                  <div className={`live-fact-item ${prefilledFormData?.entrepreneur_experience_years !== '' && prefilledFormData?.entrepreneur_experience_years !== null ? 'extracted' : 'missing'}`}>
                    <span className="live-fact-label">Experience</span>
                    <span className="live-fact-value">
                      {prefilledFormData?.entrepreneur_experience_years !== '' && prefilledFormData?.entrepreneur_experience_years !== null
                        ? `${prefilledFormData.entrepreneur_experience_years} years`
                        : 'Not specified'}
                    </span>
                  </div>

                  {/* Staff Count */}
                  <div className={`live-fact-item ${prefilledFormData?.available_staff_count !== '' && prefilledFormData?.available_staff_count !== null && prefilledFormData?.available_staff_count !== undefined ? 'extracted' : 'missing'}`}>
                    <span className="live-fact-label">Staff Count</span>
                    <span className="live-fact-value">
                      {prefilledFormData?.available_staff_count !== '' && prefilledFormData?.available_staff_count !== null && prefilledFormData?.available_staff_count !== undefined
                        ? (Number(prefilledFormData.available_staff_count) === 0 ? '0 (No staff / Solo)' : `${prefilledFormData.available_staff_count} members`)
                        : 'Not specified'}
                    </span>
                  </div>

                  {/* Competition Level */}
                  <div className={`live-fact-item ${prefilledFormData?.competition_level ? 'extracted' : 'missing'}`}>
                    <span className="live-fact-label">Competition</span>
                    <span className="live-fact-value">
                      {prefilledFormData?.competition_level || 'Not specified'}
                    </span>
                  </div>
                </div>

                {/* Primary CTA Button */}
                <button
                  type="button"
                  onClick={handleContinueToForm}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '0.8rem 1rem',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 16px rgba(56, 189, 248, 0.4)',
                    marginTop: 'auto'
                  }}
                >
                  <span>Review Prefilled Form</span>
                  <ArrowRight size={16} />
                </button>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* STEP 3: REVIEW & COMPLETE PREFILLED FORM                                  */}
      {/* ========================================================================= */}
      {intakeStep === 'form' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.25s ease-in-out' }}>

          {/* AI Prefill Notice Banner */}
          {aiFilledKeys.size > 0 && (
            <div className="ai-prefill-banner">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Sparkles size={18} style={{ color: '#38bdf8', flexShrink: 0 }} />
                <span>
                  <strong>Information Extracted from Your Conversation:</strong> We've prefilled details from your chat. Fields with the <Sparkles size={11} style={{ display: 'inline', color: '#38bdf8' }} /> <strong>AI-filled</strong> tag were populated automatically. Please review, edit as needed, and complete any remaining required fields.
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIntakeStep('chat')}
                className="btn btn-secondary"
                style={{ fontSize: '0.74rem', padding: '0.35rem 0.75rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                title="Return to the conversational intake chat"
              >
                <Bot size={13} />
                <span>Back to Chat</span>
              </button>
            </div>
          )}

          {/* Render Specialized Dual Form Dispatcher */}
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
        </div>
      )}
    </>
  );
}
