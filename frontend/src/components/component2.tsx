import React, { useState } from 'react';
import './compliance.css';

// ---------------------------------------------------------------------------
// Types & Data Contracts
// ---------------------------------------------------------------------------

export type ApplicabilityStatus = 'APPLICABLE' | 'UNKNOWN' | 'NOT_APPLICABLE';

export interface ObligationResult {
  obligation_id: string;
  title: string;
  status: ApplicabilityStatus;
  classification: 'Mandatory' | 'Conditional' | 'Not Applicable';
  priority: 'high' | 'review' | 'none';
  triggering_facts: Record<string, unknown>;
  missing_facts: string[];
  authority: string;
  explanation: string;
  action: string;
  registration_steps: string[];
  next_action: string;
  source_id: string;
  source_paragraph: string;
  source_text: string;
  documents_needed: string[];
  documents_notice: string;
  has_verified_source: boolean;
}

export interface FollowUpQuestion {
  fact: string;
  question_en: string;
  question_si: string;
  type: 'boolean' | 'select' | 'number' | 'text';
  options: (string | boolean | number)[];
}

export interface AnalysisSummary {
  total: number;
  applicable: number;
  not_applicable: number;
  unknown: number;
}

export interface ComplianceAnalysisResponse {
  summary: AnalysisSummary;
  obligations: ObligationResult[];
  follow_up_questions: FollowUpQuestion[];
  evaluation_id: string;
  retrieval_mode: string;
  business_context: Record<string, unknown>;
  profile_validation: {
    complete: boolean;
    missing_required_fields: string[];
    note: string;
  };
  disclaimer: string;
}

export interface BusinessProfileForm {
  business_type?: 'food' | 'clothing' | 'salon' | 'vehicle_parts' | null;
  local_authority?: string | null;
  legal_form?: 'sole_proprietorship' | 'partnership' | 'private_limited' | 'other' | null;
  number_of_employees?: number | null;
  province?: string | null;
  handles_food?: boolean | null;
  has_physical_premises?: boolean | null;
  is_manufacturing?: boolean | null;
  is_importing?: boolean | null;
  // Conditional fields
  serves_cooked_food?: boolean | null;
  sells_alcohol?: boolean | null;
  uses_chemicals_or_cosmetics?: boolean | null;
  handles_waste_oil_or_batteries?: boolean | null;
  turnover_band?: string | null;
  location?: string | null;
  products_services?: string[];
  business_size?: string | null;
}

// ---------------------------------------------------------------------------
// Constants & Metadata
// ---------------------------------------------------------------------------

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const STATUS_CONFIG: Record<
  ApplicabilityStatus,
  { label: string; color: string; bg: string; border: string; icon: string; badge: string }
> = {
  APPLICABLE: {
    label: 'Applicable',
    color: 'text-emerald-800',
    bg: 'bg-emerald-50/80',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: 'fa-circle-check',
  },
  UNKNOWN: {
    label: 'Conditional / Needs Review',
    color: 'text-amber-800',
    bg: 'bg-amber-50/70',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    icon: 'fa-circle-question',
  },
  NOT_APPLICABLE: {
    label: 'Not Applicable',
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    badge: 'bg-slate-100 text-slate-700 border-slate-300',
    icon: 'fa-circle-minus',
  },
};

const FACT_DISPLAY_LABELS: Record<string, string> = {
  province: 'Province',
  business_type: 'Business Type',
  local_authority: 'Local Authority',
  legal_form: 'Legal Form',
  number_of_employees: 'Number of Employees',
  employee_band: 'Number of Employees',
  has_physical_premises: 'Physical Premises',
  handles_food: 'Handles Food',
  is_manufacturing: 'Manufacturing Operations',
  is_importing: 'Importing Goods',
  serves_cooked_food: 'Serves Cooked Food',
  sells_alcohol: 'Sells Alcohol',
  uses_chemicals_or_cosmetics: 'Uses Cosmetics/Chemicals',
  handles_waste_oil_or_batteries: 'Handles Waste Oil/Batteries',
  turnover_band: 'Turnover Band',
};

// Real sample profiles matching the 4 business types in Western Province
const SAMPLE_PROFILES: Record<string, BusinessProfileForm> = {
  clear_case: {
    business_type: 'food',
    province: 'Western Province',
    local_authority: 'Colombo Municipal Council',
    legal_form: 'sole_proprietorship',
    number_of_employees: 4,
    has_physical_premises: true,
    handles_food: true,
    serves_cooked_food: true,
    sells_alcohol: false,
    is_manufacturing: false,
    is_importing: false,
    turnover_band: '1m_10m',
    location: 'Colombo',
    products_services: ['Prepared food', 'Bakery products'],
    business_size: 'small',
  },
  conditional_case: {
    business_type: 'vehicle_parts',
    province: 'Western Province',
    local_authority: 'Colombo Municipal Council',
    legal_form: 'partnership',
    number_of_employees: 6,
    has_physical_premises: true,
    handles_food: false,
    is_manufacturing: false,
    is_importing: false,
    handles_waste_oil_or_batteries: true,
    turnover_band: '10m_50m',
    location: 'Colombo',
    products_services: ['Vehicle parts retail'],
    business_size: 'small',
  },
  missing_info_case: {
    business_type: 'food',
    province: 'Western Province',
    local_authority: 'Colombo Municipal Council',
    legal_form: null,
    number_of_employees: null,
    has_physical_premises: null,
    handles_food: null,
    serves_cooked_food: null,
    sells_alcohol: null,
    is_manufacturing: null,
    is_importing: null,
    turnover_band: null,
    location: null,
    products_services: [],
    business_size: null,
  },
};

// ---------------------------------------------------------------------------
// API Helper
// ---------------------------------------------------------------------------

async function analyseComplianceAPI(profile: BusinessProfileForm): Promise<ComplianceAnalysisResponse> {
  const payload = Object.fromEntries(
    Object.entries(profile).map(([k, v]) => [k, v === undefined ? null : v])
  );

  const res = await fetch(`${API_BASE}/api/v1/component2/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to analyze compliance profile');
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Sub-components: Badges, Controls, Cards
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: ApplicabilityStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.UNKNOWN;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cfg.badge}`}
    >
      <i className={`fa-solid ${cfg.icon} text-xs`} />
      {cfg.label}
    </span>
  );
}

function InlineAnswerControl({
  factKey,
  onAnswer,
}: {
  factKey: string;
  onAnswer: (key: keyof BusinessProfileForm, value: unknown) => void;
}) {
  const label = FACT_DISPLAY_LABELS[factKey] || factKey;

  // Decide if boolean or selection
  const isSelect = factKey === 'turnover_band' || factKey === 'legal_form' || factKey === 'local_authority' || factKey === 'business_type';

  return (
    <div className="bg-amber-100/60 border border-amber-300/80 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
      <span className="font-semibold text-amber-900 flex items-center gap-1.5">
        <i className="fa-solid fa-circle-question text-amber-600" />
        {label}?
      </span>

      {!isSelect && factKey !== 'number_of_employees' && factKey !== 'employee_band' ? (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onAnswer(factKey as keyof BusinessProfileForm, true)}
            className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 font-semibold border border-emerald-300 rounded shadow-xs transition-colors"
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => onAnswer(factKey as keyof BusinessProfileForm, false)}
            className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 font-semibold border border-rose-300 rounded shadow-xs transition-colors"
          >
            No
          </button>
          <button
            type="button"
            onClick={() => onAnswer(factKey as keyof BusinessProfileForm, null)}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 font-semibold border border-slate-300 rounded transition-colors"
          >
            Not sure
          </button>
        </div>
      ) : factKey === 'number_of_employees' || factKey === 'employee_band' ? (
        <input
          type="number"
          min="0"
          placeholder="Enter number..."
          onBlur={(e) => {
            if (e.target.value !== '') onAnswer('number_of_employees', Number(e.target.value));
          }}
          className="w-32 border border-amber-300 bg-white rounded px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      ) : factKey === 'turnover_band' ? (
        <select
          onChange={(e) => onAnswer('turnover_band', e.target.value)}
          defaultValue=""
          className="border border-amber-300 bg-white rounded px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">Not sure (keep unknown)</option>
          <option value="under_1m">Under LKR 1 Million</option>
          <option value="1m_10m">LKR 1M – 10M</option>
          <option value="10m_50m">LKR 10M – 50M</option>
          <option value="over_50m">Over LKR 50 Million</option>
        </select>
      ) : factKey === 'legal_form' ? (
        <select
          onChange={(e) => onAnswer('legal_form', e.target.value)}
          defaultValue=""
          className="border border-amber-300 bg-white rounded px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">Not sure (keep unknown)</option>
          <option value="sole_proprietorship">Sole Proprietorship</option>
          <option value="partnership">Partnership</option>
          <option value="private_limited">Private Limited</option>
        </select>
      ) : factKey === 'local_authority' ? (
        <select
          onChange={(e) => onAnswer('local_authority', e.target.value || null)}
          defaultValue=""
          className="border border-amber-300 bg-white rounded px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">Not sure (keep unknown)</option>
          <option value="Colombo Municipal Council">Colombo Municipal Council</option>
          <option value="Sri Jayawardenepura Kotte Municipal Council">Kotte Municipal Council</option>
          <option value="Dehiwala-Mount Lavinia Municipal Council">Dehiwala-Mount Lavinia Municipal Council</option>
          <option value="Moratuwa Municipal Council">Moratuwa Municipal Council</option>
        </select>
      ) : factKey === 'business_type' ? (
        <select
          onChange={(e) => onAnswer('business_type', e.target.value || null)}
          defaultValue=""
          className="border border-amber-300 bg-white rounded px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">Not sure (keep unknown)</option>
          <option value="food">Food</option>
          <option value="clothing">Clothing</option>
          <option value="salon">Salon</option>
          <option value="vehicle_parts">Vehicle parts</option>
        </select>
      ) : null}
    </div>
  );
}

function ObligationCard({
  obl,
  onAnswerMissingFact,
  onOpenEvidence,
}: {
  obl: ObligationResult;
  onAnswerMissingFact: (key: keyof BusinessProfileForm, value: unknown) => void;
  onOpenEvidence: (obligationId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[obl.status] || STATUS_CONFIG.UNKNOWN;

  return (
    <div className={`border ${cfg.border} rounded-2xl overflow-hidden bg-white shadow-xs transition-all`}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center gap-3 px-5 py-4 ${cfg.bg} text-left hover:brightness-95 transition-all`}
      >
        <i className={`fa-solid ${cfg.icon} ${cfg.color} text-lg`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{obl.title}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            <span className="font-semibold text-slate-700">{obl.authority}</span> &middot; ID: <span className="font-mono">{obl.obligation_id}</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Classification: <span className="font-semibold">{obl.classification}</span>
            {' · '}Priority: <span className="font-semibold">{obl.priority}</span>
          </p>
        </div>
        <StatusBadge status={obl.status} />
        <i
          className={`fa-solid ${expanded ? 'fa-chevron-up' : 'fa-chevron-down'} text-slate-400 text-xs ml-2`}
        />
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-5 py-4 bg-white space-y-4 text-xs border-t border-slate-100">
          {/* Why it applies / Triggering facts */}
          <div>
            <p className="font-semibold text-slate-500 uppercase tracking-wide text-[11px] mb-1.5">
              {obl.status === 'APPLICABLE' ? 'Why It Applies (Triggering Facts)' : 'Evaluated Facts'}
            </p>
            {Object.keys(obl.triggering_facts).length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(obl.triggering_facts).map(([k, v]) => (
                  <span
                    key={k}
                    className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200"
                  >
                    <strong>{FACT_DISPLAY_LABELS[k] || k}:</strong> {String(v)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 italic">No positive triggering facts evaluated.</p>
            )}
          </div>

          {/* Missing Facts & Inline Controls */}
          {obl.missing_facts.length > 0 && (
            <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2">
              <p className="font-semibold text-amber-900 text-xs flex items-center gap-1.5">
                <i className="fa-solid fa-bolt text-amber-600" />
                Missing Facts &mdash; Answer inline to re-evaluate:
              </p>
              <div className="space-y-1.5">
                {obl.missing_facts.map((factKey) => (
                  <InlineAnswerControl
                    key={factKey}
                    factKey={factKey}
                    onAnswer={onAnswerMissingFact}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Required Action */}
          <div>
            <p className="font-semibold text-slate-500 uppercase tracking-wide text-[11px]">
              Required Statutory Action
            </p>
            <p className="text-xs text-slate-800 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              {obl.action || 'Comply with designated registration procedure.'}
            </p>
            <p className="text-xs text-slate-600 mt-2">{obl.explanation}</p>
            <p className="text-xs font-semibold text-blue-800 mt-2">Next action: {obl.next_action}</p>
          </div>

          {obl.registration_steps.length > 0 && (
            <div>
              <p className="font-semibold text-slate-500 uppercase tracking-wide text-[11px] mb-1.5">
                Registration Guidance
              </p>
              <ol className="list-decimal pl-5 space-y-1 text-slate-700">
                {obl.registration_steps.map((step, index) => <li key={index}>{step}</li>)}
              </ol>
            </div>
          )}

          {/* Documents Needed */}
          {obl.documents_needed && obl.documents_needed.length > 0 && (
            <div>
              <p className="font-semibold text-slate-500 uppercase tracking-wide text-[11px] mb-1.5">
                Required Application Documents
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {obl.documents_needed.map((doc, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100 text-slate-700"
                  >
                    <i className="fa-solid fa-file-lines text-blue-500 text-xs shrink-0" />
                    <span>{doc}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {obl.documents_notice && (
            <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              {obl.documents_notice}
            </p>
          )}

          {/* Statutory Source Citation & Excerpt */}
          <div className="border-t border-slate-100 pt-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-500 uppercase tracking-wide text-[11px]">
                Rulebook Source Reference
              </p>
              <span className="font-mono text-[11px] text-slate-500">
                {obl.source_id} &middot; {obl.source_paragraph}
              </span>
            </div>
            <p className="text-[11px] text-amber-800">
              Evidence status: {obl.has_verified_source ? 'verified' : 'draft / not independently verified'}
            </p>
            {obl.source_text ? (
              <blockquote className="border-l-2 border-blue-500 bg-blue-50/40 p-2.5 rounded-r-lg text-slate-700 italic leading-relaxed text-xs">
                &ldquo;{obl.source_text}&rdquo;
              </blockquote>
            ) : (
              <p className="text-xs text-slate-500">
                No matching source excerpt is available in the local corpus.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onOpenEvidence(obl.obligation_id)}
            className="w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-left text-xs font-semibold text-blue-800 transition hover:border-blue-300 hover:bg-blue-100"
          >
            <i className="fa-solid fa-book-open mr-2" />
            Open evidence details
            <i className="fa-solid fa-arrow-right float-right mt-0.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard Component
// ---------------------------------------------------------------------------

export const RegistrationComplianceDashboard: React.FC = () => {
  // Every field defaults to null/undefined (Unknown)
  const [profile, setProfile] = useState<BusinessProfileForm>({
    business_type: null,
    local_authority: null,
    legal_form: null,
    number_of_employees: null,
    province: 'Western Province', // Fixed scope
    handles_food: null,
    has_physical_premises: null,
    is_manufacturing: null,
    is_importing: null,
    serves_cooked_food: null,
    sells_alcohol: null,
    uses_chemicals_or_cosmetics: null,
    handles_waste_oil_or_batteries: null,
    turnover_band: null,
    location: null,
    products_services: [],
    business_size: null,
  });

  const [result, setResult] = useState<ComplianceAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<'profile' | 'results' | 'evidence'>('profile');
  const [selectedObligationId, setSelectedObligationId] = useState('');
  const [resultFilter, setResultFilter] = useState<'all' | ApplicabilityStatus>('all');

  const setField = (key: keyof BusinessProfileForm, value: unknown) => {
    setProfile((prev) => ({
      ...prev,
      [key]: value === '' || value === 'unknown' ? null : value,
    }));
  };

  const runAnalysis = async (profToAnalyze: BusinessProfileForm = profile) => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyseComplianceAPI(profToAnalyze);
      setResult(data);
      setSelectedObligationId((current) =>
        data.obligations.some((obligation) => obligation.obligation_id === current)
          ? current
          : data.obligations[0]?.obligation_id || ''
      );
      setActiveStep('results');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error evaluating compliance');
    } finally {
      setLoading(false);
    }
  };

  const handleInlineAnswer = (key: keyof BusinessProfileForm, value: unknown) => {
    const updated = { ...profile, [key]: value };
    setProfile(updated);
    runAnalysis(updated);
  };

  const handleLoadSample = (sampleId: 'clear_case' | 'conditional_case' | 'missing_info_case') => {
    const sample = SAMPLE_PROFILES[sampleId];
    if (sample) {
      setProfile(sample);
      runAnalysis(sample);
    }
  };

  // Group obligations
  const unknownList = result?.obligations.filter((o) => o.status === 'UNKNOWN') || [];
  const selectedObligation = result?.obligations.find(
    (obligation) => obligation.obligation_id === selectedObligationId
  ) || result?.obligations[0];
  const profileFactKeys = [
    'business_type',
    'legal_form',
    'local_authority',
    'number_of_employees',
    'has_physical_premises',
    'handles_food',
    'is_manufacturing',
    'is_importing',
    'turnover_band',
    ...(profile.business_type === 'food' ? ['serves_cooked_food', 'sells_alcohol'] : []),
    ...(profile.business_type === 'salon' ? ['uses_chemicals_or_cosmetics'] : []),
    ...(profile.business_type === 'vehicle_parts' ? ['handles_waste_oil_or_batteries'] : []),
  ];
  const knownProfileFacts = profileFactKeys.filter((key) => {
    const value = profile[key as keyof BusinessProfileForm];
    return value !== null && value !== undefined;
  }).length;
  const profileCompleteness = Math.round((knownProfileFacts / profileFactKeys.length) * 100);
  const followUpFacts = Array.from(
    new Set(unknownList.flatMap((obligation) => obligation.missing_facts))
  );
  const filteredObligations = (result?.obligations || []).filter(
    (obligation) => resultFilter === 'all' || obligation.status === resultFilter
  );

  return (
    <div className="compliance-app min-h-screen flex-1 font-sans">
      <header className="compliance-header sticky top-0 z-20">
        <div className="compliance-header-inner">
          <a className="compliance-brand" href="/" aria-label="Compliance Navigator home">
            <span className="compliance-brand-mark">C2</span>
            <span>
              <strong>Compliance Navigator</strong>
              <small>Western Province SME registration guidance</small>
            </span>
          </a>
          <nav className="compliance-steps" aria-label="Compliance analysis steps">
            {([
              { id: 'profile', label: 'Profile', number: '1' },
              { id: 'results', label: 'Results', number: '2' },
              { id: 'evidence', label: 'Evidence', number: '3' },
            ] as const).map((step) => {
              const isAvailable = step.id === 'profile' || Boolean(result);
              return (
                <button
                  key={step.id}
                  type="button"
                  disabled={!isAvailable}
                  aria-current={activeStep === step.id ? 'step' : undefined}
                  onClick={() => isAvailable && setActiveStep(step.id)}
                  className={`compliance-step ${activeStep === step.id ? 'is-active' : ''}`}
                >
                  <span>{step.number} · {step.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="compliance-main">
        {/* Guidance disclaimer banner */}
        <div className="compliance-notice">
          <div className="flex items-start gap-3">
            <i className="fa-solid fa-shield-halved text-lg mt-0.5" />
            <div>
              <p className="text-xs font-semibold tracking-tight">Decision support only, not legal advice.</p>
              <p className="text-xs mt-0.5 leading-relaxed">
                Applicability decisions are generated 100% deterministically by a Three-Valued Kleene Logic Rule Engine,
                never by an LLM. Results provide preliminary guidance for NEW BUSINESS REGISTRATION in Western Province.
                “Not sure” answers remain unknown and are never treated as “No”.
              </p>
            </div>
          </div>
        </div>

        {activeStep === 'profile' && (
          <div className="compliance-layout">
            <section className="compliance-panel">
        {/* Form Container */}
        <div className="compliance-form-card bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <i className="fa-solid fa-sliders text-blue-600" />
                Business Intake Profile
              </h2>
              <p className="text-xs text-slate-500">Every field defaults to Unknown (null) until specified.</p>
            </div>

            {/* Real Sample Profile Buttons */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Load sample:</span>
              <button
                type="button"
                onClick={() => handleLoadSample('clear_case')}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
              >
                Clear Case
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample('conditional_case')}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
              >
                Conditional Case
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample('missing_info_case')}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
              >
                Missing Info
              </button>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Business Type (Scope: 4 types) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Business Type (Sector)
              </label>
              <select
                value={profile.business_type || ''}
                onChange={(e) => setField('business_type', e.target.value || null)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Unknown (null) --</option>
                <option value="food">Food &amp; Catering (Bakery / Restaurant / Sweets)</option>
                <option value="clothing">Clothing &amp; Textile Retail</option>
                <option value="salon">Beauty Salon &amp; Hair Care</option>
                <option value="vehicle_parts">Vehicle Spare Parts Retail</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Business Location</label>
              <input
                type="text"
                value={profile.location || ''}
                onChange={(e) => setField('location', e.target.value || null)}
                placeholder="Town or business area"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Products / Services</label>
              <input
                type="text"
                value={(profile.products_services || []).join(', ')}
                onChange={(e) =>
                  setField(
                    'products_services',
                    e.target.value.split(',').map((value) => value.trim()).filter(Boolean)
                  )
                }
                placeholder="Comma-separated products or services"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Business Size</label>
              <select
                value={profile.business_size || ''}
                onChange={(e) => setField('business_size', e.target.value || null)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Unknown --</option>
                <option value="micro">Micro</option>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>

            {/* Local Authority */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Local Authority</label>
              <select
                value={profile.local_authority || ''}
                onChange={(e) => setField('local_authority', e.target.value || null)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Unknown (null) --</option>
                <option value="Colombo Municipal Council">Colombo Municipal Council</option>
                <option value="Sri Jayawardenepura Kotte Municipal Council">Kotte Municipal Council</option>
                <option value="Dehiwala-Mount Lavinia Municipal Council">Dehiwala-Mount Lavinia MC</option>
                <option value="Moratuwa Municipal Council">Moratuwa Municipal Council</option>
              </select>
            </div>

            {/* Legal Form */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Legal Form</label>
              <select
                value={profile.legal_form || ''}
                onChange={(e) => setField('legal_form', e.target.value || null)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Unknown (null) --</option>
                <option value="sole_proprietorship">Sole Proprietorship</option>
                <option value="partnership">Partnership</option>
                <option value="private_limited">Private Limited Company</option>
                <option value="other">Other Legal Form</option>
              </select>
            </div>

            {/* Number of Employees */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Number of Employees (Staff)
              </label>
              <input
                type="number"
                min="0"
                placeholder="-- Unknown (null) --"
                value={profile.number_of_employees !== null && profile.number_of_employees !== undefined ? profile.number_of_employees : ''}
                onChange={(e) => setField('number_of_employees', e.target.value === '' ? null : parseInt(e.target.value, 10))}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Province (Fixed Scope: Western Province) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Province (Scope)</label>
              <select
                value={profile.province || ''}
                onChange={(e) => setField('province', e.target.value || null)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Western Province">Western Province</option>
                <option value="">-- Unknown (null) --</option>
              </select>
            </div>

            {/* Turnover Band (All business types) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Annual Turnover Band (All Businesses)
              </label>
              <select
                value={profile.turnover_band || ''}
                onChange={(e) => setField('turnover_band', e.target.value || null)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Unknown (null) --</option>
                <option value="under_1m">Under LKR 1 Million</option>
                <option value="1m_10m">LKR 1M – 10M</option>
                <option value="10m_50m">LKR 10M – 50M</option>
                <option value="over_50m">Over LKR 50 Million</option>
              </select>
            </div>
          </div>

          {/* Standard Yes/No Toggles */}
          <div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              Operational Attributes (Defaults to Unknown / null)
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {([
                { key: 'handles_food', label: 'Handles Food' },
                { key: 'has_physical_premises', label: 'Physical Premises' },
                { key: 'is_manufacturing', label: 'Manufacturing' },
                { key: 'is_importing', label: 'Importing Goods' },
              ] as const).map(({ key, label }) => {
                const val = profile[key];
                return (
                  <div key={key} className="border border-slate-200 rounded-xl p-2.5 bg-slate-50/50">
                    <p className="text-xs font-semibold text-slate-700 mb-1.5">{label}</p>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setField(key, val === true ? null : true)}
                        className={`flex-1 text-xs py-1 rounded-lg font-semibold border transition-all ${
                          val === true
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setField(key, val === false ? null : false)}
                        className={`flex-1 text-xs py-1 rounded-lg font-semibold border transition-all ${
                          val === false
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Conditional Fields depending on business_type */}
          {profile.business_type === 'food' && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
              <p className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <i className="fa-solid fa-utensils text-blue-600" />
                Extra Questions for Food Businesses:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="border border-blue-200 bg-white rounded-lg p-2.5">
                  <p className="text-xs font-semibold text-slate-700 mb-1.5">Serves Cooked Food on Premises?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setField('serves_cooked_food', profile.serves_cooked_food === true ? null : true)}
                      className={`flex-1 text-xs py-1 rounded font-semibold border ${profile.serves_cooked_food === true ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-600'}`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setField('serves_cooked_food', profile.serves_cooked_food === false ? null : false)}
                      className={`flex-1 text-xs py-1 rounded font-semibold border ${profile.serves_cooked_food === false ? 'bg-rose-600 text-white' : 'bg-slate-50 text-slate-600'}`}
                    >
                      No
                    </button>
                  </div>
                </div>

                <div className="border border-blue-200 bg-white rounded-lg p-2.5">
                  <p className="text-xs font-semibold text-slate-700 mb-1.5">Sells / Serves Alcohol?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setField('sells_alcohol', profile.sells_alcohol === true ? null : true)}
                      className={`flex-1 text-xs py-1 rounded font-semibold border ${profile.sells_alcohol === true ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-600'}`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setField('sells_alcohol', profile.sells_alcohol === false ? null : false)}
                      className={`flex-1 text-xs py-1 rounded font-semibold border ${profile.sells_alcohol === false ? 'bg-rose-600 text-white' : 'bg-slate-50 text-slate-600'}`}
                    >
                      No
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {profile.business_type === 'salon' && (
            <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
              <p className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                <i className="fa-solid fa-scissors text-purple-600" />
                Extra Questions for Beauty Salon Businesses:
              </p>
              <div className="border border-purple-200 bg-white rounded-lg p-2.5 max-w-md">
                <p className="text-xs font-semibold text-slate-700 mb-1.5">Uses Chemical Cosmetics / Dyes / Bleaches?</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setField('uses_chemicals_or_cosmetics', profile.uses_chemicals_or_cosmetics === true ? null : true)}
                    className={`flex-1 text-xs py-1 rounded font-semibold border ${profile.uses_chemicals_or_cosmetics === true ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-600'}`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setField('uses_chemicals_or_cosmetics', profile.uses_chemicals_or_cosmetics === false ? null : false)}
                    className={`flex-1 text-xs py-1 rounded font-semibold border ${profile.uses_chemicals_or_cosmetics === false ? 'bg-rose-600 text-white' : 'bg-slate-50 text-slate-600'}`}
                  >
                    No
                  </button>
                </div>
              </div>
            </div>
          )}

          {profile.business_type === 'vehicle_parts' && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
              <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <i className="fa-solid fa-wrench text-amber-600" />
                Extra Questions for Vehicle Parts Businesses:
              </p>
              <div className="border border-amber-200 bg-white rounded-lg p-2.5 max-w-md">
                <p className="text-xs font-semibold text-slate-700 mb-1.5">Handles Waste Mineral Oil or Used Lead Batteries?</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setField('handles_waste_oil_or_batteries', profile.handles_waste_oil_or_batteries === true ? null : true)}
                    className={`flex-1 text-xs py-1 rounded font-semibold border ${profile.handles_waste_oil_or_batteries === true ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-600'}`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setField('handles_waste_oil_or_batteries', profile.handles_waste_oil_or_batteries === false ? null : false)}
                    className={`flex-1 text-xs py-1 rounded font-semibold border ${profile.handles_waste_oil_or_batteries === false ? 'bg-rose-600 text-white' : 'bg-slate-50 text-slate-600'}`}
                  >
                    No
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            type="button"
            onClick={() => runAnalysis(profile)}
            disabled={loading}
            className="compliance-primary-button w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" />
                Evaluating Deterministic Rules&hellip;
              </>
            ) : (
              <>
                <i className="fa-solid fa-bolt" />
                Analyze requirements
                <i className="fa-solid fa-arrow-right ml-1" />
              </>
            )}
          </button>
        </div>
            </section>

            <aside className="compliance-side-panel">
              <section className="compliance-side-card">
                <p className="compliance-eyebrow">Profile completeness</p>
                <div className="compliance-completeness">
                  <strong>{profileCompleteness}%</strong>
                  <span>{profileFactKeys.length - knownProfileFacts} facts unknown</span>
                </div>
                <div
                  className="compliance-progress"
                  role="progressbar"
                  aria-label="Profile completeness"
                  aria-valuenow={profileCompleteness}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <span style={{ width: `${profileCompleteness}%` }} />
                </div>
                <p className="compliance-side-copy">
                  {profileFactKeys.length - knownProfileFacts === 0
                    ? 'Your profile is complete. Analyze it to see the requirements that may apply.'
                    : 'Unknown answers are kept as unknown. Adding details can clarify more requirements.'}
                </p>
              </section>

              <section className="compliance-side-card">
                <p className="compliance-eyebrow">How it works</p>
                <ol className="compliance-how-list">
                  <li><span>1</span><p>Your profile is checked against the local rulebook.</p></li>
                  <li><span>2</span><p>Each requirement is marked applicable, unknown, or not applicable.</p></li>
                  <li><span>3</span><p>Results include their source reference and evidence status.</p></li>
                </ol>
              </section>
            </aside>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="compliance-error p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {activeStep === 'results' && result && (
          <div className="compliance-results-layout">
            <section className="compliance-results-main">
              <div className="compliance-result-meta">
                <div>
                  <p className="compliance-eyebrow">Analysis results</p>
                  <h2>Requirements for this business</h2>
                </div>
                <span>Evaluation {result.evaluation_id}</span>
              </div>

              {!result.profile_validation.complete && (
                <div className="compliance-incomplete">
                  <i className="fa-solid fa-circle-info" />
                  <span>Some profile details are still unknown. You can answer questions on the right or edit the profile.</span>
                </div>
              )}

              <div className="compliance-summary-grid">
                <div className="compliance-summary-card applicable">
                  <strong>{result.summary.applicable}</strong><span>Applicable</span>
                </div>
                <div className="compliance-summary-card conditional">
                  <strong>{result.summary.unknown}</strong><span>Conditional / unknown</span>
                </div>
                <div className="compliance-summary-card not-applicable">
                  <strong>{result.summary.not_applicable}</strong><span>Not applicable</span>
                </div>
                <div className="compliance-summary-card total">
                  <strong>{result.summary.total}</strong><span>Reviewed</span>
                </div>
              </div>

              <div className="compliance-filter-row" aria-label="Filter requirements">
                {([
                  { id: 'all', label: 'All', count: result.summary.total },
                  { id: 'APPLICABLE', label: 'Applicable', count: result.summary.applicable },
                  { id: 'UNKNOWN', label: 'Unknown', count: result.summary.unknown },
                  { id: 'NOT_APPLICABLE', label: 'Not applicable', count: result.summary.not_applicable },
                ] as const).map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    className={`compliance-filter ${resultFilter === filter.id ? 'is-active' : ''}`}
                    onClick={() => setResultFilter(filter.id)}
                  >
                    {filter.label}<span>{filter.count}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {filteredObligations.map((obligation) => (
                  <ObligationCard
                    key={obligation.obligation_id}
                    obl={obligation}
                    onAnswerMissingFact={handleInlineAnswer}
                    onOpenEvidence={(id) => {
                      setSelectedObligationId(id);
                      setActiveStep('evidence');
                    }}
                  />
                ))}
                {filteredObligations.length === 0 && (
                  <div className="compliance-empty-state">No requirements match this filter.</div>
                )}
              </div>
            </section>

            <aside className="compliance-side-panel">
              <section className="compliance-side-card">
                <p className="compliance-eyebrow">Answers to resolve</p>
                {followUpFacts.length > 0 ? (
                  <div className="compliance-followups">
                    {followUpFacts.map((factKey) => {
                      const obligationCount = unknownList.filter((obligation) =>
                        obligation.missing_facts.includes(factKey)
                      ).length;
                      return (
                        <div className="compliance-followup" key={factKey}>
                          <InlineAnswerControl factKey={factKey} onAnswer={handleInlineAnswer} />
                          <small>May clarify {obligationCount} {obligationCount === 1 ? 'requirement' : 'requirements'}</small>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="compliance-side-copy">No unanswered facts are currently blocking a decision.</p>
                )}
                <p className="compliance-side-copy">Questions are based on missing facts in the rule results. “Not sure” keeps a fact unknown.</p>
                <button type="button" className="compliance-secondary-button" onClick={() => setActiveStep('profile')}>
                  <i className="fa-solid fa-arrow-left mr-2" />Edit profile
                </button>
              </section>
            </aside>
          </div>
        )}

        {activeStep === 'evidence' && result && selectedObligation && (
          <div className="compliance-evidence-layout">
            <section className="compliance-evidence-main">
              <button type="button" className="compliance-back-link" onClick={() => setActiveStep('results')}>
                <i className="fa-solid fa-arrow-left mr-2" />Back to results
              </button>
              <div className="compliance-evidence-heading">
                <div>
                  <p className="compliance-eyebrow">Requirement evidence</p>
                  <h2>{selectedObligation.title}</h2>
                </div>
                <StatusBadge status={selectedObligation.status} />
              </div>

              <div className="compliance-fact-table">
                {Object.entries(selectedObligation.triggering_facts).map(([fact, value]) => (
                  <div key={fact}><span>{FACT_DISPLAY_LABELS[fact] || fact}</span><strong>{String(value)}</strong></div>
                ))}
                {selectedObligation.missing_facts.map((fact) => (
                  <div key={fact}><span>{FACT_DISPLAY_LABELS[fact] || fact}</span><strong className="is-unknown">Unknown</strong></div>
                ))}
                {Object.keys(selectedObligation.triggering_facts).length === 0 && selectedObligation.missing_facts.length === 0 && (
                  <div><span>Evaluation</span><strong>No triggering or missing facts were returned.</strong></div>
                )}
              </div>

              <section className="compliance-evidence-section">
                <p className="compliance-eyebrow">What to do</p>
                <p>{selectedObligation.action || 'Follow the process confirmed by the relevant authority.'}</p>
                <p className="compliance-next-action"><strong>Next action:</strong> {selectedObligation.next_action}</p>
                {selectedObligation.registration_steps.length > 0 && (
                  <ol>
                    {selectedObligation.registration_steps.map((step, index) => <li key={index}>{step}</li>)}
                  </ol>
                )}
                {selectedObligation.documents_needed.length > 0 && (
                  <div className="compliance-documents">
                    <p className="compliance-eyebrow">Documents noted by the rulebook</p>
                    <ul>{selectedObligation.documents_needed.map((document, index) => <li key={index}>{document}</li>)}</ul>
                    {selectedObligation.documents_notice && <small>{selectedObligation.documents_notice}</small>}
                  </div>
                )}
              </section>

              <section className="compliance-quote-card">
                <div className="compliance-quote-meta">
                  <span>{selectedObligation.source_id} · {selectedObligation.source_paragraph}</span>
                  <span className={selectedObligation.has_verified_source ? 'is-verified' : 'is-draft'}>
                    <i className={`fa-solid ${selectedObligation.has_verified_source ? 'fa-circle-check' : 'fa-triangle-exclamation'} mr-1`} />
                    {selectedObligation.has_verified_source ? 'Citation verified' : 'Draft · expert review pending'}
                  </span>
                </div>
                {selectedObligation.source_text ? (
                  <blockquote>“{selectedObligation.source_text}”</blockquote>
                ) : (
                  <p className="compliance-side-copy">No matching source excerpt is available in the local corpus.</p>
                )}
              </section>
            </section>

            <aside className="compliance-side-panel">
              <section className="compliance-side-card">
                <p className="compliance-eyebrow">Authority</p>
                <p className="compliance-authority">{selectedObligation.authority || 'Relevant local authority'}</p>
                <p className="compliance-eyebrow">Status</p>
                <StatusBadge status={selectedObligation.status} />
                <p className="compliance-side-copy">
                  {selectedObligation.has_verified_source
                    ? 'This evidence is marked as verified in the local source register.'
                    : 'This source reference is not independently verified. Confirm details with the relevant authority.'}
                </p>
                <div className="compliance-source-id">
                  <span>Obligation</span><strong>{selectedObligation.obligation_id}</strong>
                  <span>Source reference</span><strong>{selectedObligation.source_id} · {selectedObligation.source_paragraph}</strong>
                  <span>Rule priority</span><strong>{selectedObligation.priority}</strong>
                </div>
              </section>
            </aside>
          </div>
        )}

        {result && (
          <div className="compliance-disclaimer">
            <i className="fa-solid fa-scale-balanced" />
            <span>{result.disclaimer}</span>
          </div>
        )}
      </main>
    </div>
  );
};

export default RegistrationComplianceDashboard;
