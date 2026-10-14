import React, { useState } from 'react';

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

      {!isSelect ? (
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
        </div>
      ) : factKey === 'turnover_band' ? (
        <select
          onChange={(e) => onAnswer('turnover_band', e.target.value)}
          defaultValue=""
          className="border border-amber-300 bg-white rounded px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="" disabled>Select band...</option>
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
          <option value="" disabled>Select legal form...</option>
          <option value="sole_proprietorship">Sole Proprietorship</option>
          <option value="partnership">Partnership</option>
          <option value="private_limited">Private Limited</option>
        </select>
      ) : null}
    </div>
  );
}

function ObligationCard({
  obl,
  onAnswerMissingFact,
}: {
  obl: ObligationResult;
  onAnswerMissingFact: (key: keyof BusinessProfileForm, value: unknown) => void;
}) {
  const [expanded, setExpanded] = useState(obl.status === 'APPLICABLE' || obl.status === 'UNKNOWN');
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
  const applicableList = result?.obligations.filter((o) => o.status === 'APPLICABLE') || [];
  const unknownList = result?.obligations.filter((o) => o.status === 'UNKNOWN') || [];
  const notApplicableList = result?.obligations.filter((o) => o.status === 'NOT_APPLICABLE') || [];

  return (
    <div className="flex-1 flex flex-col h-screen overflow-auto bg-slate-100 font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <i className="fa-solid fa-scale-balanced text-lg" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">
              Legal &amp; Regulatory Requirement Identification
            </h1>
            <p className="text-xs text-slate-500">
              Component 2 &mdash; AI-Driven Business Lifecycle Decision Support System &middot;{' '}
              <span className="font-semibold text-blue-600">Western Province</span>, Sri Lanka
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6">
        {/* Guidance disclaimer banner */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-700 rounded-2xl p-4 text-white shadow-md">
          <div className="flex items-start gap-3">
            <i className="fa-solid fa-shield-halved text-blue-200 text-lg mt-0.5" />
            <div>
              <p className="text-sm font-bold tracking-tight">Regulatory Guidance &mdash; Not Legal Advice</p>
              <p className="text-xs text-blue-100 mt-0.5 leading-relaxed">
                Applicability decisions are generated 100% deterministically by a Three-Valued Kleene Logic Rule Engine,
                never by an LLM. Results provide preliminary guidance for NEW BUSINESS REGISTRATION in Western Province.
                Verify all statutory permits with the relevant authority.
              </p>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-5">
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
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" />
                Evaluating Deterministic Rules&hellip;
              </>
            ) : (
              <>
                <i className="fa-solid fa-bolt" />
                Analyse Compliance
              </>
            )}
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
              <span className="font-semibold">Evaluation {result.evaluation_id}</span>
              {' · '}Retrieval: <span className="font-semibold">{result.retrieval_mode}</span>
              {!result.profile_validation.complete && (
                <p className="mt-1 text-amber-800">
                  Profile is incomplete. Add: {result.profile_validation.missing_required_fields.join(', ')}.
                </p>
              )}
            </div>

            {/* Summary Counters */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                <span className="text-2xl font-black text-emerald-800">{result.summary.applicable}</span>
                <p className="text-xs font-bold text-emerald-700 mt-0.5">Applicable</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                <span className="text-2xl font-black text-amber-800">{result.summary.unknown}</span>
                <p className="text-xs font-bold text-amber-700 mt-0.5">Conditional / Review</p>
              </div>
              <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 text-center">
                <span className="text-2xl font-black text-slate-700">{result.summary.not_applicable}</span>
                <p className="text-xs font-bold text-slate-600 mt-0.5">Not Applicable</p>
              </div>
            </div>

            {/* Group 1: Applicable Cards */}
            {applicableList.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-2">
                  <i className="fa-solid fa-circle-check text-emerald-600" />
                  Applicable Obligations ({applicableList.length})
                </h3>
                <div className="space-y-3">
                  {applicableList.map((obl) => (
                    <ObligationCard
                      key={obl.obligation_id}
                      obl={obl}
                      onAnswerMissingFact={handleInlineAnswer}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Group 2: Unknown Cards */}
            {unknownList.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-2">
                  <i className="fa-solid fa-circle-question text-amber-600" />
                  Conditional &mdash; Missing Facts or Evidence Review ({unknownList.length})
                </h3>
                <div className="space-y-3">
                  {unknownList.map((obl) => (
                    <ObligationCard
                      key={obl.obligation_id}
                      obl={obl}
                      onAnswerMissingFact={handleInlineAnswer}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Group 3: Not Applicable Cards */}
            {notApplicableList.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <i className="fa-solid fa-circle-minus text-slate-500" />
                  Not Applicable ({notApplicableList.length})
                </h3>
                <div className="space-y-3">
                  {notApplicableList.map((obl) => (
                    <ObligationCard
                      key={obl.obligation_id}
                      obl={obl}
                      onAnswerMissingFact={handleInlineAnswer}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Persistent Disclaimer */}
            <div className="p-3 bg-yellow-50/80 border border-yellow-200 rounded-xl text-[11px] text-yellow-900 flex items-center gap-2">
              <i className="fa-solid fa-scale-balanced text-yellow-600 shrink-0" />
              <span>{result.disclaimer}</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default RegistrationComplianceDashboard;
