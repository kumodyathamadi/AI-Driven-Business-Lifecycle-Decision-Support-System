import React, { useState } from 'react';
import './compliance.css';

// ---------------------------------------------------------------------------
// Types & Data Contracts
// ---------------------------------------------------------------------------

export type ApplicabilityStatus =
  | 'APPLICABLE'
  | 'UNKNOWN'
  | 'NOT_APPLICABLE'
  | 'NEEDS_VERIFICATION';

export interface ObligationResult {
  obligation_id: string;
  title: string;
  status: ApplicabilityStatus;
  classification: 'Mandatory' | 'Conditional' | 'Not Applicable' | 'Needs Verification';
  priority: 'high' | 'review' | 'none';
  triggering_facts: Record<string, unknown>;
  missing_facts: string[];
  applicability_conditions: Record<string, unknown>;
  exceptions: Array<{ description: string; source_id: string; confirmed: boolean }>;
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
  evidence_quality?: string;
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
  needs_verification: number;
}

export interface LegalSourceExcerpt {
  source_id: string;
  title: string;
  authority: string | null;
  excerpt: string;
  url: string | null;
  page: number | null;
  retrieval_score: number;
  verification_status: string;
  title_is_filename_guess: boolean;
  section_reference?: string | null;
  paragraph_number?: number | null;
  file_type?: 'pdf' | 'txt' | null;
  action_guidance?: {
    rule_title: string;
    category: string;
    predicted_action_type: string;
    rule_purpose: string;
    where_to_go: string;
    office_location: string;
    action_needed: string;
    action_urgency: string;
    required_documents: string[];
    procedural_steps: string[];
  } | null;
}

export interface ComplianceAnalysisResponse {
  summary: AnalysisSummary;
  obligations: ObligationResult[];
  follow_up_questions: FollowUpQuestion[];
  source_discovery: LegalSourceExcerpt[];
  action_roadmap?: {
    model_status: string;
    predicted_action_type: string;
    category: string;
    target_authority: string;
    office_location: string;
    required_action_name: string;
    action_urgency: string;
    required_documents: string[];
    procedural_steps: string[];
    governing_laws: string[];
    estimated_cost_lkr?: number;
    estimated_timeline_days?: number;
  } | null;
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
  district?: string | null;
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
  NEEDS_VERIFICATION: {
    label: 'Needs Verification',
    color: 'text-amber-900',
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    badge: 'bg-amber-100 text-amber-900 border-amber-400',
    icon: 'fa-triangle-exclamation',
  },
};

const FACT_DISPLAY_LABELS: Record<string, string> = {
  province: 'Province',
  district: 'District',
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
    district: 'Colombo',
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
    district: 'Colombo',
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
    district: 'Colombo',
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

export interface ExtractedPlanResponse {
  success: boolean;
  filename: string;
  pages_count: number;
  is_scanned: boolean;
  ocr_used: boolean;
  character_count: number;
  extracted_profile: Record<string, any>;
  metadata: Record<string, any>;
  raw_text_preview: string;
}

export interface SamplePlanItem {
  id: string;
  title: string;
  category: string;
  sector: string;
  stage: string;
  location: string;
  strategy: string;
  filename: string;
  description: string;
}

async function uploadAndExtractPlanPDF(file: File): Promise<ExtractedPlanResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/v1/component2/extract-plan-pdf`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to extract business plan PDF');
  }

  return res.json();
}

async function extractSamplePlanAPI(sampleId: string): Promise<ExtractedPlanResponse> {
  const res = await fetch(`${API_BASE}/api/v1/component2/sample-plans/${sampleId}/extract`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to extract sample plan');
  }
  return res.json();
}

async function fetchSamplePlansListAPI(): Promise<SamplePlanItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/component2/sample-plans`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
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

          {(Object.keys(obl.applicability_conditions).length > 0 || obl.exceptions.length > 0) && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
              {Object.keys(obl.applicability_conditions).length > 0 && (
                <div>
                  <p className="font-semibold text-slate-600 uppercase tracking-wide text-[11px] mb-1">
                    Rulebook applicability conditions
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-700">
                    {Object.entries(obl.applicability_conditions).map(([key, value]) => (
                      <li key={key}><strong>{FACT_DISPLAY_LABELS[key] || key}:</strong> {String(value)}</li>
                    ))}
                  </ul>
                </div>
              )}
              {obl.exceptions.length > 0 && (
                <div>
                  <p className="font-semibold text-slate-600 uppercase tracking-wide text-[11px] mb-1">
                    Recorded exceptions
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-700">
                    {obl.exceptions.map((exception, index) => (
                      <li key={`${exception.source_id}-${index}`}>
                        {exception.description} — {exception.confirmed ? 'reviewed' : 'not verified'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-[11px] text-slate-500">
                These are rulebook records and are not legal determinations unless their source is verified.
              </p>
            </div>
          )}

          {/* Required Action */}
          <div>
            <p className="font-semibold text-slate-500 uppercase tracking-wide text-[11px]">
              {obl.status === 'NEEDS_VERIFICATION' ? 'Verification Required' : 'Rulebook Action'}
            </p>
            <p className="text-xs text-slate-800 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              {obl.action || (
                obl.status === 'NEEDS_VERIFICATION'
                  ? 'No compliance action is recommended until the source and requirement are verified.'
                  : 'Confirm the current procedure with the responsible authority.'
              )}
            </p>
            <p className="text-xs text-slate-600 mt-2">{obl.explanation}</p>
            <p className="text-xs font-semibold text-blue-800 mt-2">Next action: {obl.next_action}</p>
          </div>

          {obl.registration_steps.length > 0 && (
            <div>
              <p className="font-semibold text-slate-500 uppercase tracking-wide text-[11px] mb-1.5">
                {obl.status === 'NEEDS_VERIFICATION' ? 'Verification step' : 'Registration Guidance'}
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
    district: null,
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

  // PDF Business / Growth Plan Ingestion State
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfExtractResult, setPdfExtractResult] = useState<ExtractedPlanResponse | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [samplePlans, setSamplePlans] = useState<SamplePlanItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [extractedProfileEdit, setExtractedProfileEdit] = useState<any | null>(null);
  const [newProductTag, setNewProductTag] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Load available sample business plans on mount
  React.useEffect(() => {
    fetchSamplePlansListAPI().then(setSamplePlans);
  }, []);


  const handlePdfFile = async (file: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setPdfError('Please upload a valid PDF document (.pdf).');
      return;
    }
    setPdfUploading(true);
    setPdfError(null);
    try {
      const data = await uploadAndExtractPlanPDF(file);
      setPdfExtractResult(data);
      setExtractedProfileEdit({ ...data.extracted_profile });
    } catch (err: any) {
      setPdfError(err.message || 'Failed to process business plan PDF');
    } finally {
      setPdfUploading(false);
    }
  };

  const handleSelectSamplePlan = async (sampleId: string) => {
    setPdfUploading(true);
    setPdfError(null);
    try {
      const data = await extractSamplePlanAPI(sampleId);
      setPdfExtractResult(data);
      setExtractedProfileEdit({ ...data.extracted_profile });
    } catch (err: any) {
      setPdfError(err.message || 'Failed to load sample business plan');
    } finally {
      setPdfUploading(false);
    }
  };

  const handleConfirmExtractedProfile = () => {
    if (!extractedProfileEdit) return;

    const confirmed: BusinessProfileForm = {
      business_type: extractedProfileEdit.business_type || 'food',
      province: extractedProfileEdit.province || 'Western Province',
      district: extractedProfileEdit.district || 'Colombo',
      local_authority: extractedProfileEdit.local_authority || 'Colombo Municipal Council',
      legal_form: extractedProfileEdit.legal_form || 'sole_proprietorship',
      number_of_employees: extractedProfileEdit.number_of_employees ?? 2,
      has_physical_premises: extractedProfileEdit.has_physical_premises ?? true,
      handles_food: extractedProfileEdit.handles_food ?? (extractedProfileEdit.business_type === 'food'),
      serves_cooked_food: extractedProfileEdit.serves_cooked_food ?? false,
      sells_alcohol: extractedProfileEdit.sells_alcohol ?? false,
      uses_chemicals_or_cosmetics: extractedProfileEdit.uses_chemicals_or_cosmetics ?? (extractedProfileEdit.business_type === 'salon'),
      handles_waste_oil_or_batteries: extractedProfileEdit.handles_waste_oil_or_batteries ?? (extractedProfileEdit.business_type === 'vehicle_parts'),
      is_manufacturing: extractedProfileEdit.is_manufacturing ?? false,
      is_importing: extractedProfileEdit.is_importing ?? false,
      turnover_band: extractedProfileEdit.turnover_band || '1m_10m',
      location: extractedProfileEdit.location || 'Colombo',
      products_services: extractedProfileEdit.products_services || [],
      business_size: (extractedProfileEdit.number_of_employees ?? 2) > 10 ? 'medium' : 'small',
    };

    setProfile(confirmed);
    runAnalysis(confirmed);
  };

  const handleEditInManualForm = () => {
    if (!extractedProfileEdit) return;
    setProfile((prev) => ({
      ...prev,
      business_type: extractedProfileEdit.business_type || prev.business_type,
      province: extractedProfileEdit.province || prev.province,
      district: extractedProfileEdit.district || prev.district,
      local_authority: extractedProfileEdit.local_authority || prev.local_authority,
      legal_form: extractedProfileEdit.legal_form || prev.legal_form,
      number_of_employees: extractedProfileEdit.number_of_employees ?? prev.number_of_employees,
      has_physical_premises: extractedProfileEdit.has_physical_premises ?? prev.has_physical_premises,
      handles_food: extractedProfileEdit.handles_food ?? prev.handles_food,
      serves_cooked_food: extractedProfileEdit.serves_cooked_food ?? prev.serves_cooked_food,
      sells_alcohol: extractedProfileEdit.sells_alcohol ?? prev.sells_alcohol,
      uses_chemicals_or_cosmetics: extractedProfileEdit.uses_chemicals_or_cosmetics ?? prev.uses_chemicals_or_cosmetics,
      handles_waste_oil_or_batteries: extractedProfileEdit.handles_waste_oil_or_batteries ?? prev.handles_waste_oil_or_batteries,
      is_manufacturing: extractedProfileEdit.is_manufacturing ?? prev.is_manufacturing,
      is_importing: extractedProfileEdit.is_importing ?? prev.is_importing,
      turnover_band: extractedProfileEdit.turnover_band || prev.turnover_band,
      location: extractedProfileEdit.location || prev.location,
      products_services: extractedProfileEdit.products_services || prev.products_services,
    }));
    setPdfExtractResult(null);
  };

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
  const unknownList = result?.obligations.filter(
    (o) => o.status === 'UNKNOWN' || o.status === 'NEEDS_VERIFICATION'
  ) || [];
  const selectedObligation = result?.obligations.find(
    (obligation) => obligation.obligation_id === selectedObligationId
  ) || result?.obligations[0];
  const profileFactKeys = [
    'business_type',
    'legal_form',
    'local_authority',
    'district',
    'province',
    'products_services',
    'business_size',
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
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && value !== undefined && value !== '';
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
      <header className="compliance-header sticky top-16 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200">
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
            <section className="compliance-panel space-y-5">
              {/* ------------------------------------------------------------- */}
              {/* COMPONENT 1 ➔ COMPONENT 2 INTEGRATION: PDF INGESTION & EXTRACTION */}
              {/* ------------------------------------------------------------- */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-md border border-slate-700/80">
                {/* Header & Steps Indicator */}
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-700/60 pb-4">
                  <div>
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-bold border border-blue-400/30 mb-2">
                      <i className="fa-solid fa-arrows-split-up-and-left" />
                      Component 1 ➔ Component 2 Meaningful Integration
                    </div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <i className="fa-solid fa-file-pdf text-red-400" />
                      Upload Business / Growth Plan (PDF)
                    </h2>
                    <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                      Upload the PDF plan generated from Component 1 or any SME business plan.
                      The system automatically parses text (or performs OCR on scanned PDFs), extracts a comprehensive
                      business profile, and lets you confirm it before displaying applicable Sri Lankan legal &amp; regulatory requirements.
                    </p>
                  </div>

                  {/* Step badges */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 text-[11px] font-semibold bg-slate-800/80 p-1.5 rounded-xl border border-slate-700 overflow-x-auto max-w-full">
                    <span className="px-2 py-0.5 rounded bg-blue-500/30 text-blue-300 whitespace-nowrap">1. Download Plan</span>
                    <i className="fa-solid fa-arrow-right text-[10px] text-slate-500 shrink-0" />
                    <span className="px-2 py-0.5 rounded bg-teal-500/30 text-teal-300 whitespace-nowrap">2. Upload PDF</span>
                    <i className="fa-solid fa-arrow-right text-[10px] text-slate-500 shrink-0" />
                    <span className="px-2 py-0.5 rounded bg-amber-500/30 text-amber-300 whitespace-nowrap">3. Extract &amp; Confirm</span>
                    <i className="fa-solid fa-arrow-right text-[10px] text-slate-500 shrink-0" />
                    <span className="px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-300 whitespace-nowrap">4. Legal Guidance</span>
                  </div>
                </div>

                {/* Upload Error Banner */}
                {pdfError && (
                  <div className="mt-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <i className="fa-solid fa-circle-exclamation text-rose-400" />
                      {pdfError}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPdfError(null)}
                      className="text-rose-300 hover:text-white text-xs ml-3"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Main Ingestion & Upload Section (Shown when no extracted profile is awaiting confirmation) */}
                {!pdfExtractResult && (
                  <div className="mt-5 space-y-4">
                    {/* Drag and Drop Zone */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragOver(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handlePdfFile(file);
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                        isDragOver
                          ? 'border-teal-400 bg-teal-500/10 scale-[1.01]'
                          : 'border-slate-600 hover:border-slate-400 bg-slate-800/40 hover:bg-slate-800/70'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePdfFile(file);
                        }}
                      />

                      {pdfUploading ? (
                        <div className="py-4 space-y-3">
                          <i className="fa-solid fa-circle-notch fa-spin text-3xl text-teal-400" />
                          <div className="text-sm font-semibold text-teal-300">
                            Analyzing &amp; Extracting Business Profile from PDF...
                          </div>
                          <p className="text-xs text-slate-400">
                            Running PyMuPDF text extractor · Scanning for OCR text · Identifying category, location &amp; products
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="w-12 h-12 mx-auto rounded-full bg-slate-700/80 flex items-center justify-center text-teal-400 text-xl shadow-inner">
                            <i className="fa-solid fa-cloud-arrow-up" />
                          </div>
                          <div className="text-sm font-semibold text-slate-200">
                            Drop your Business Plan PDF here, or <span className="text-teal-400 underline">browse file</span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Supports Component 1 SME360 AI Reports, Strategic Growth Plans, or Scanned SME Business Plans (.pdf)
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Quick-Load Built-in Sample Plans */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-xs text-slate-300 mb-2.5">
                        <span className="font-semibold flex items-center gap-1.5 text-slate-300">
                          <i className="fa-solid fa-bolt text-amber-400" />
                          Or Test Instantly with Built-in Component 1 Sample Business Plans:
                        </span>
                        <span className="text-[11px] text-slate-400">Pre-generated by SME360 AI Decision Engine</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Sample 1: FreshMart Grocery */}
                        <div className="bg-slate-800/90 border border-slate-700 hover:border-slate-500 rounded-xl p-3.5 flex flex-col justify-between transition-all">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                <i className="fa-solid fa-basket-shopping" /> FreshMart Grocery
                              </span>
                              <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300">Existing Business</span>
                            </div>
                            <div className="text-[11px] text-slate-300 mt-1 font-mono">Grocery / Mini-Mart · Colombo, Western Province</div>
                            <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2">
                              Expansion plan: multi-channel WhatsApp delivery, grocery retail, LKR 2.5M capital, 1 staff member.
                            </p>
                          </div>
                          <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-700/50">
                            <button
                              type="button"
                              onClick={() => handleSelectSamplePlan('freshmart_grocery')}
                              disabled={pdfUploading}
                              className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              <i className="fa-solid fa-wand-magic-sparkles" />
                              Auto-Ingest &amp; Extract
                            </button>
                            <a
                              href={`${API_BASE}/api/v1/component2/sample-plans/freshmart_grocery/download-pdf`}
                              download="FreshMart_Grocery_Business_Plan.pdf"
                              title="Download PDF file to test uploading yourself"
                              className="py-1.5 px-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                            >
                              <i className="fa-solid fa-download" />
                              <span className="text-[10px]">PDF</span>
                            </a>
                          </div>
                        </div>

                        {/* Sample 2: Trendy Style Clothing Shop */}
                        <div className="bg-slate-800/90 border border-slate-700 hover:border-slate-500 rounded-xl p-3.5 flex flex-col justify-between transition-all">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                                <i className="fa-solid fa-shirt" /> Trendy Style Clothing Shop
                              </span>
                              <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300">New Startup</span>
                            </div>
                            <div className="text-[11px] text-slate-300 mt-1 font-mono">Clothing / Garment · Colombo, Western Province</div>
                            <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2">
                              Startup plan: T-shirts, dresses, casual &amp; office wear, physical storefront, 2 staff members.
                            </p>
                          </div>
                          <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-700/50">
                            <button
                              type="button"
                              onClick={() => handleSelectSamplePlan('trendy_style_clothing')}
                              disabled={pdfUploading}
                              className="flex-1 py-1.5 px-3 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              <i className="fa-solid fa-wand-magic-sparkles" />
                              Auto-Ingest &amp; Extract
                            </button>
                            <a
                              href={`${API_BASE}/api/v1/component2/sample-plans/trendy_style_clothing/download-pdf`}
                              download="Trendy_Style_Clothing_Shop_Business_Plan.pdf"
                              title="Download PDF file to test uploading yourself"
                              className="py-1.5 px-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                            >
                              <i className="fa-solid fa-download" />
                              <span className="text-[10px]">PDF</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* STEP 3 & 4: EXTRACTED PROFILE CONFIRMATION & REVIEW CARD     */}
                {/* ------------------------------------------------------------- */}
                {pdfExtractResult && extractedProfileEdit && (
                  <div className="mt-5 bg-white text-slate-900 rounded-xl p-5 shadow-lg border border-slate-200 space-y-4">
                    {/* Header verification tag */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold mb-1">
                          <i className="fa-solid fa-circle-check text-emerald-600" />
                          Step 3 Complete: Business Profile Extracted
                        </div>
                        <h3 className="text-base font-bold text-slate-900">
                          Step 4: Confirm &amp; Adjust Extracted Business Profile
                        </h3>
                        <p className="text-xs text-slate-500">
                          Extracted from <span className="font-semibold text-slate-700">{pdfExtractResult.filename}</span> ({pdfExtractResult.pages_count} Pages · {pdfExtractResult.is_scanned ? 'OCR Processed' : 'Digital Text Extracted'})
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPdfExtractResult(null);
                            setExtractedProfileEdit(null);
                          }}
                          className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          <i className="fa-solid fa-arrow-rotate-left mr-1" />
                          Upload Different PDF
                        </button>
                      </div>
                    </div>

                    {/* Editable Fields Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
                      {/* Business Name */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Business Name</label>
                        <input
                          type="text"
                          value={extractedProfileEdit.business_name || ''}
                          onChange={(e) =>
                            setExtractedProfileEdit({ ...extractedProfileEdit, business_name: e.target.value })
                          }
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-slate-800"
                        />
                      </div>

                      {/* Business Category & Mapped Sector */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Category &amp; Mapped Legal Sector
                        </label>
                        <select
                          value={extractedProfileEdit.business_type || 'food'}
                          onChange={(e) => {
                            const bt = e.target.value;
                            setExtractedProfileEdit({
                              ...extractedProfileEdit,
                              business_type: bt,
                              sector: bt,
                              handles_food: bt === 'food',
                              uses_chemicals_or_cosmetics: bt === 'salon',
                              handles_waste_oil_or_batteries: bt === 'vehicle_parts',
                            });
                          }}
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50 font-semibold"
                        >
                          <option value="food">Grocery / Mini-Mart / Food Business</option>
                          <option value="clothing">Clothing / Garment Retail</option>
                          <option value="salon">Beauty Salon / Grooming</option>
                          <option value="vehicle_parts">Vehicle Parts &amp; Auto Accessories</option>
                        </select>
                      </div>

                      {/* Business Stage */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Business Stage</label>
                        <select
                          value={extractedProfileEdit.business_stage || 'New Startup'}
                          onChange={(e) =>
                            setExtractedProfileEdit({ ...extractedProfileEdit, business_stage: e.target.value })
                          }
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="New Startup">New Startup</option>
                          <option value="Existing Business">Existing Business (Expansion)</option>
                        </select>
                      </div>

                      {/* Province & District */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Province &amp; District</label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            readOnly
                            value={extractedProfileEdit.province || 'Western Province'}
                            className="w-1/2 bg-slate-100 border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-600"
                          />
                          <input
                            type="text"
                            value={extractedProfileEdit.district || 'Colombo'}
                            onChange={(e) =>
                              setExtractedProfileEdit({ ...extractedProfileEdit, district: e.target.value })
                            }
                            className="w-1/2 border border-slate-300 rounded-lg px-2 py-1.5 text-xs"
                          />
                        </div>
                      </div>

                      {/* Local Authority */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Local Authority</label>
                        <select
                          value={extractedProfileEdit.local_authority || 'Colombo Municipal Council'}
                          onChange={(e) =>
                            setExtractedProfileEdit({ ...extractedProfileEdit, local_authority: e.target.value })
                          }
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="Colombo Municipal Council">Colombo Municipal Council</option>
                          <option value="Kotte Municipal Council">Kotte Municipal Council</option>
                          <option value="Dehiwala-Mount Lavinia Municipal Council">Dehiwala-Mount Lavinia Municipal Council</option>
                          <option value="Gampaha Municipal Council">Gampaha Municipal Council</option>
                          <option value="Negombo Municipal Council">Negombo Municipal Council</option>
                          <option value="Kalutara Urban Council">Kalutara Urban Council</option>
                        </select>
                      </div>

                      {/* Number of Staff */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Hired Staff / Employees</label>
                        <input
                          type="number"
                          min="0"
                          value={extractedProfileEdit.number_of_employees ?? 1}
                          onChange={(e) =>
                            setExtractedProfileEdit({
                              ...extractedProfileEdit,
                              number_of_employees: parseInt(e.target.value, 10) || 0,
                            })
                          }
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold"
                        />
                      </div>
                    </div>

                    {/* Proposed Activity / Concept */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Proposed Activity / Business Concept (Identified from PDF)
                      </label>
                      <textarea
                        rows={2}
                        value={extractedProfileEdit.proposed_activity || ''}
                        onChange={(e) =>
                          setExtractedProfileEdit({ ...extractedProfileEdit, proposed_activity: e.target.value })
                        }
                        className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed text-slate-700"
                      />
                    </div>

                    {/* Products & Services Tag Cloud */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Products &amp; Commercial Offerings
                      </label>
                      <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg min-h-[38px]">
                        {(extractedProfileEdit.products_services || []).map((prod: string, idx: number) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-medium"
                          >
                            {prod}
                            <button
                              type="button"
                              onClick={() => {
                                const updated = extractedProfileEdit.products_services.filter(
                                  (_: any, i: number) => i !== idx
                                );
                                setExtractedProfileEdit({ ...extractedProfileEdit, products_services: updated });
                              }}
                              className="text-blue-500 hover:text-blue-900 ml-0.5 text-[10px]"
                            >
                              ✕
                            </button>
                          </span>
                        ))}

                        <div className="inline-flex items-center gap-1 ml-1">
                          <input
                            type="text"
                            placeholder="+ Add product"
                            value={newProductTag}
                            onChange={(e) => setNewProductTag(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newProductTag.trim()) {
                                e.preventDefault();
                                const updated = [
                                  ...(extractedProfileEdit.products_services || []),
                                  newProductTag.trim(),
                                ];
                                setExtractedProfileEdit({ ...extractedProfileEdit, products_services: updated });
                                setNewProductTag('');
                              }
                            }}
                            className="text-[11px] border border-slate-300 rounded px-1.5 py-0.5 w-24 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Operational Checkbox Flags */}
                    <div className="pt-2 border-t border-slate-100">
                      <span className="block font-bold text-slate-700 mb-2">
                        Operational Attributes for Regulatory Rulebook:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
                        <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2 rounded-lg border border-slate-200">
                          <input
                            type="checkbox"
                            checked={Boolean(extractedProfileEdit.has_physical_premises)}
                            onChange={(e) =>
                              setExtractedProfileEdit({
                                ...extractedProfileEdit,
                                has_physical_premises: e.target.checked,
                              })
                            }
                            className="rounded text-blue-600"
                          />
                          <span>Physical Premises</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2 rounded-lg border border-slate-200">
                          <input
                            type="checkbox"
                            checked={Boolean(extractedProfileEdit.handles_food)}
                            onChange={(e) =>
                              setExtractedProfileEdit({
                                ...extractedProfileEdit,
                                handles_food: e.target.checked,
                              })
                            }
                            className="rounded text-blue-600"
                          />
                          <span>Handles Food / Grocery</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2 rounded-lg border border-slate-200">
                          <input
                            type="checkbox"
                            checked={Boolean(extractedProfileEdit.uses_chemicals_or_cosmetics)}
                            onChange={(e) =>
                              setExtractedProfileEdit({
                                ...extractedProfileEdit,
                                uses_chemicals_or_cosmetics: e.target.checked,
                              })
                            }
                            className="rounded text-blue-600"
                          />
                          <span>Uses Cosmetics/Chemicals</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2 rounded-lg border border-slate-200">
                          <input
                            type="checkbox"
                            checked={Boolean(extractedProfileEdit.handles_waste_oil_or_batteries)}
                            onChange={(e) =>
                              setExtractedProfileEdit({
                                ...extractedProfileEdit,
                                handles_waste_oil_or_batteries: e.target.checked,
                              })
                            }
                            className="rounded text-blue-600"
                          />
                          <span>Waste Oil / Batteries</span>
                        </label>
                      </div>
                    </div>

                    {/* Bottom Confirmation Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                      <div className="text-[11px] text-slate-500">
                        {extractedProfileEdit.selected_strategy && (
                          <span>
                            Active Strategy: <strong className="text-slate-700">{extractedProfileEdit.selected_strategy}</strong>
                          </span>
                        )}
                        {extractedProfileEdit.available_capital_lkr && (
                          <span className="ml-2 font-mono">
                            · Capital: LKR {extractedProfileEdit.available_capital_lkr.toLocaleString()}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleEditInManualForm}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                        >
                          Edit in Form Below
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmExtractedProfile}
                          disabled={loading}
                          className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2"
                        >
                          {loading ? (
                            <>
                              <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                              <span>Evaluating Statutory Obligations...</span>
                            </>
                          ) : (
                            <>
                              <i className="fa-solid fa-check text-xs" />
                              <span>Confirm Profile &amp; View Legal Guidance ➔</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

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
              <label className="block text-xs font-bold text-slate-700 mb-1">District</label>
              <input
                type="text"
                value={profile.district || ''}
                onChange={(e) => setField('district', e.target.value || null)}
                placeholder="Colombo"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

              {/* ------------------------------------------------------------- */}
              {/* ACTIONABLE PROCEDURAL ROADMAP (TRAINED ON 600 SME SCENARIOS)  */}
              {/* ------------------------------------------------------------- */}
              {result.action_roadmap && (
                <section className="rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/70 p-5 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm text-xs">
                        <i className="fa-solid fa-route" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-emerald-950">
                            Actionable Compliance Roadmap
                          </h4>
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            <i className="fa-solid fa-microchip text-[9px]" /> AI Model Recommended
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-800">
                          Specific institutional destination, licence name, documents, and procedure for this business.
                        </p>
                      </div>
                    </div>

                    <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-full border border-emerald-300/40">
                      Target: {result.action_roadmap.predicted_action_type.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Target Authority & Required License Banner */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-xs">
                      <span className="block font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-1">
                        <i className="fa-solid fa-building-columns text-emerald-600 mr-1.5" />
                        Where to Go (Target Authority)
                      </span>
                      <p className="font-semibold text-slate-900 leading-snug">
                        {result.action_roadmap.target_authority}
                      </p>
                      {result.action_roadmap.office_location && result.action_roadmap.office_location !== 'nan' && (
                        <p className="text-[11px] text-slate-500 mt-1">
                          <i className="fa-solid fa-location-dot text-red-500 mr-1" />
                          {result.action_roadmap.office_location}
                        </p>
                      )}
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-xs">
                      <span className="block font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-1">
                        <i className="fa-solid fa-certificate text-amber-500 mr-1.5" />
                        Required Approval / Licence Name
                      </span>
                      <p className="font-semibold text-slate-900 leading-snug">
                        {result.action_roadmap.required_action_name}
                      </p>
                      <p className="text-[11px] text-amber-700 mt-1">
                        <i className="fa-solid fa-clock text-amber-500 mr-1" />
                        {result.action_roadmap.action_urgency}
                      </p>
                    </div>
                  </div>

                  {/* Documents & Step-by-Step Procedure Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs pt-1">
                    {/* Left: Required Documents Checklist */}
                    <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs">
                      <h5 className="font-bold text-slate-800 text-xs flex items-center gap-2 mb-2.5">
                        <i className="fa-solid fa-folder-open text-blue-600" />
                        Mandatory Document Package Checklist:
                      </h5>
                      <ul className="space-y-1.5">
                        {(result.action_roadmap.required_documents || []).map((doc, i) => (
                          <li key={i} className="flex items-start gap-2 text-slate-700 text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <i className="fa-solid fa-circle-check text-emerald-500 mt-0.5 text-xs shrink-0" />
                            <span>{doc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Right: Procedural Workflow Steps */}
                    <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs">
                      <h5 className="font-bold text-slate-800 text-xs flex items-center gap-2 mb-2.5">
                        <i className="fa-solid fa-list-check text-teal-600" />
                        Step-by-Step Submission Procedure:
                      </h5>
                      <ol className="space-y-2">
                        {(result.action_roadmap.procedural_steps || []).map((step, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-slate-700 text-[11px]">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              {idx + 1}
                            </span>
                            <span className="leading-relaxed pt-0.5">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </section>
              )}

              {result.source_discovery.length > 0 && (
                <section className="rounded-2xl border border-amber-300/80 bg-gradient-to-br from-amber-50/50 via-white to-amber-50/30 p-5 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <i className="fa-solid fa-scale-balanced text-amber-600" />
                        Applicable Legal Rules &amp; Institutional Actions
                      </h4>
                      <p className="mt-0.5 text-xs text-slate-600">
                        AI-predicted institutional guidance answering: <em>What does this rule do? Where should you go? What action is required?</em>
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200">
                      {result.source_discovery.length} Identified Rules &amp; Policies
                    </span>
                  </div>

                  <div className="space-y-4">
                    {result.source_discovery.map((source, index) => (
                      <article
                        key={`${source.source_id}-${source.page}-${index}`}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3 transition-all hover:border-slate-300"
                      >
                        {/* Title and Identification Header */}
                        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 mb-1 inline-block">
                              Statutory Source #{index + 1}
                            </span>
                            <h5 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                              <i className="fa-solid fa-book-bookmark text-slate-500 text-xs" />
                              {source.title}
                            </h5>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              {source.source_id}
                              {source.page
                                ? ` · Page ${source.page}`
                                : source.section_reference
                                  ? ` · ${source.section_reference}`
                                  : ''}
                              {source.authority ? ` · Authority: ${source.authority}` : ''}
                            </p>
                          </div>

                          <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                            Verification: {source.verification_status || 'Draft Template'}
                          </span>
                        </div>

                        {/* ML Action Guidance (Where to go, what it does, what to do) */}
                        {source.action_guidance && (
                          <div className="rounded-xl bg-slate-50/90 border border-slate-200 p-3.5 space-y-3 text-xs">
                            {/* 1. What this rule does */}
                            <div className="flex items-start gap-2.5">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 text-xs shadow-xs mt-0.5">
                                <i className="fa-solid fa-lightbulb" />
                              </span>
                              <div>
                                <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wide block">
                                  1. මේ නීතියෙන් වෙන්නේ කුමක්ද? (What This Rule Mandates):
                                </span>
                                <p className="text-slate-700 mt-0.5 leading-relaxed font-medium">
                                  {source.action_guidance.rule_purpose}
                                </p>
                              </div>
                            </div>

                            {/* 2. Where to Go */}
                            <div className="flex items-start gap-2.5">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-800 text-xs shadow-xs mt-0.5">
                                <i className="fa-solid fa-building-columns" />
                              </span>
                              <div>
                                <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wide block">
                                  2. යන්න ඕනෙ ස්ථානය / කාර්යාලය කොහෙද? (Where to Go / Target Office):
                                </span>
                                <p className="text-blue-900 font-bold mt-0.5">
                                  {source.action_guidance.where_to_go}
                                </p>
                                {source.action_guidance.office_location && source.action_guidance.office_location !== 'nan' && (
                                  <p className="text-slate-600 text-[11px] mt-0.5 flex items-center gap-1">
                                    <i className="fa-solid fa-location-dot text-red-500 text-[10px]" />
                                    {source.action_guidance.office_location}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* 3. Action Needed */}
                            <div className="flex items-start gap-2.5">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 text-xs shadow-xs mt-0.5">
                                <i className="fa-solid fa-file-circle-check" />
                              </span>
                              <div>
                                <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wide block">
                                  3. ගත යුතු ක්‍රියාමාර්ගය (Action Needed / Required Licence):
                                </span>
                                <p className="text-emerald-900 font-bold mt-0.5">
                                  {source.action_guidance.action_needed}
                                </p>
                              </div>
                            </div>

                            {/* 4. Documents & Steps Sub-grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1 text-[11px]">
                              {/* Documents */}
                              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                <span className="font-bold text-slate-700 block mb-1">
                                  <i className="fa-solid fa-folder-closed text-slate-500 mr-1" />
                                  ගෙනියන්න ඕනෙ ලියකියවිලි (Documents Checklist):
                                </span>
                                <ul className="space-y-1 text-slate-600">
                                  {source.action_guidance.required_documents.slice(0, 4).map((doc, dIdx) => (
                                    <li key={dIdx} className="flex items-start gap-1.5">
                                      <i className="fa-solid fa-check text-emerald-600 text-[10px] mt-0.5" />
                                      <span>{doc}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* Steps */}
                              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                <span className="font-bold text-slate-700 block mb-1">
                                  <i className="fa-solid fa-list-ol text-slate-500 mr-1" />
                                  පියවරෙන් පියවර (Procedural Steps):
                                </span>
                                <ol className="space-y-1 text-slate-600 list-decimal pl-3.5">
                                  {source.action_guidance.procedural_steps.slice(0, 3).map((st, sIdx) => (
                                    <li key={sIdx}>{st}</li>
                                  ))}
                                </ol>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Raw statutory excerpt (as secondary evidence quote) */}
                        <details className="text-[11px] text-slate-500">
                          <summary className="cursor-pointer hover:text-slate-800 font-medium">
                            <i className="fa-solid fa-quote-left text-slate-400 mr-1" />
                            View Raw Statutory Quote Excerpt from Source Document
                          </summary>
                          <blockquote className="mt-2 border-l-2 border-amber-300 pl-3 leading-relaxed text-slate-700 bg-amber-50/40 p-2 rounded-r-lg">
                            {source.excerpt}
                          </blockquote>
                        </details>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              <div className="compliance-summary-grid">
                <div className="compliance-summary-card applicable">
                  <strong>{result.summary.applicable}</strong><span>Applicable</span>
                </div>
                <div className="compliance-summary-card conditional">
                  <strong>{result.summary.unknown}</strong><span>Conditional / unknown</span>
                </div>
                <div className="compliance-summary-card needs-verification">
                  <strong>{result.summary.needs_verification}</strong><span>Needs verification</span>
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
                  { id: 'NEEDS_VERIFICATION', label: 'Needs verification', count: result.summary.needs_verification },
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
                  <p className="compliance-eyebrow">
                    {selectedObligation.status === 'NEEDS_VERIFICATION' ? 'Verification required' : 'What to do'}
                  </p>
                  <p>{selectedObligation.action || (
                    selectedObligation.status === 'NEEDS_VERIFICATION'
                      ? 'No compliance action is recommended until the source and requirement are verified.'
                      : 'Confirm the process with the relevant authority.'
                  )}</p>
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
                <p className="compliance-eyebrow">
                  {selectedObligation.status === 'NEEDS_VERIFICATION' ? 'Potential authority — unverified' : 'Authority'}
                </p>
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
