import React, { useState } from 'react';

// ---------------------------------------------------------------------------
// Types (mirror backend schemas.py)
// ---------------------------------------------------------------------------

type ApplicabilityStatus = 'applicable' | 'conditional' | 'not_identified' | 'unknown' | 'not_covered';

interface EvidenceChunk {
  source_id: string;
  page?: number;
  quote: string;
  url?: string;
  retrieved_date?: string;
  effective_date?: string;
  source_title?: string;
  authority?: string;
  reviewer_status?: 'draft' | 'verified';
}

interface ObligationResult {
  id: string;
  name: string;
  status: ApplicabilityStatus;
  reason?: string;
  trigger_facts: Record<string, unknown>;
  missing_facts: string[];
  authority: string;
  jurisdiction: string;
  required_action: string;
  reviewer_status: 'draft' | 'verified';
  evidence: EvidenceChunk[];
  has_verified_source: boolean;
  caveat: string;
}

interface ComplianceAnalysisResponse {
  business_profile: BusinessProfileForm;
  summary: Record<string, number>;
  obligations: ObligationResult[];
  caveat: string;
}

interface BusinessProfileForm {
  business_type?: string;
  local_authority?: string;
  handles_food?: boolean;
  has_physical_premises?: boolean;
  employee_band?: string;
  is_manufacturing?: boolean;
  is_importing?: boolean;
  legal_form?: string;
  jurisdiction?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE = 'http://localhost:8000';

const STATUS_CONFIG: Record<ApplicabilityStatus, { label: string; color: string; icon: string; bg: string; border: string }> = {
  applicable: {
    label: 'Applicable',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'fa-circle-exclamation',
  },
  conditional: {
    label: 'Conditional',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'fa-triangle-exclamation',
  },
  not_identified: {
    label: 'Not identified for this profile',
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    icon: 'fa-circle-minus',
  },
  unknown: {
    label: 'Unknown',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'fa-circle-question',
  },
  not_covered: {
    label: 'Not yet covered - contact the authority',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    icon: 'fa-map-pin',
  },
};

const FACT_METADATA: Record<string, { label: string; type: 'boolean' | 'select'; options?: { label: string; value: string }[] }> = {
  business_type: {
    label: 'Business Type',
    type: 'select',
    options: [
      { label: 'Bakery', value: 'bakery' },
      { label: 'Cake Shop', value: 'cake_shop' },
      { label: 'Sweets Shop', value: 'sweets_shop' },
      { label: 'Restaurant', value: 'restaurant' },
      { label: 'Other Food Business', value: 'food_business' },
      { label: 'Clothing Retail', value: 'clothing_retail' },
      { label: 'Beauty Salon', value: 'beauty_salon' },
      { label: 'Vehicle Parts Retail', value: 'vehicle_parts_retail' },
    ],
  },
  local_authority: {
    label: 'Local Authority',
    type: 'select',
    options: [
      { label: 'Colombo Municipal Council', value: 'Colombo Municipal Council' },
      { label: 'Kotte Municipal Council', value: 'Kotte Municipal Council' },
      { label: 'Dehiwala-Mount Lavinia MC', value: 'Dehiwala-Mount Lavinia Municipal Council' },
      { label: 'Kandy Municipal Council', value: 'Kandy Municipal Council' },
    ],
  },
  legal_form: {
    label: 'Legal Form',
    type: 'select',
    options: [
      { label: 'Sole Proprietorship', value: 'sole_proprietorship' },
      { label: 'Partnership', value: 'partnership' },
      { label: 'Private Limited Company', value: 'private_limited' },
    ],
  },
  employee_band: {
    label: 'Number of Employees',
    type: 'select',
    options: [
      { label: '0 (Owner only)', value: '0' },
      { label: '1–9 (Micro)', value: '1_9' },
      { label: '10–49 (Small)', value: '10_49' },
      { label: '50+ (Medium)', value: '50_plus' },
    ],
  },
  jurisdiction: {
    label: 'Province',
    type: 'select',
    options: [
      { label: 'Western Province', value: 'Western Province' },
      { label: 'Central Province', value: 'Central Province' },
      { label: 'Southern Province', value: 'Southern Province' },
      { label: 'Northern Province', value: 'Northern Province' },
    ],
  },
  handles_food: { label: 'Handles Food', type: 'boolean' },
  has_physical_premises: { label: 'Physical Premises', type: 'boolean' },
  is_manufacturing: { label: 'Manufacturing', type: 'boolean' },
  is_importing: { label: 'Importing Goods', type: 'boolean' },
};

// ---------------------------------------------------------------------------
// Helper: POST to compliance engine
// ---------------------------------------------------------------------------

async function fetchCompliance(profile: BusinessProfileForm): Promise<ComplianceAnalysisResponse> {
  const body = Object.fromEntries(
    Object.entries(profile).filter(([, v]) => v !== undefined && v !== '' && v !== 'unknown')
  );
  const res = await fetch(`${API_BASE}/compliance/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Server error');
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: ApplicabilityStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
        cfg.color
      } ${cfg.bg} border ${cfg.border}`}
    >
      <i className={`fa-solid ${cfg.icon} text-xs`} />
      {cfg.label}
    </span>
  );
}

function ReviewerBadge({ status }: { status: 'draft' | 'verified' }) {
  if (status === 'verified') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700 border border-green-200">
        <i className="fa-solid fa-circle-check text-[9px]" /> Verified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
      <i className="fa-solid fa-pen-ruler text-[9px]" /> Draft Review
    </span>
  );
}

function FollowUpQuestion({
  factKey,
  onAnswer,
}: {
  factKey: string;
  onAnswer: (key: keyof BusinessProfileForm, value: unknown) => void;
}) {
  const meta = FACT_METADATA[factKey];
  if (!meta) return null;

  return (
    <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
      <span className="font-medium text-blue-900 flex items-center gap-1.5">
        <i className="fa-solid fa-circle-question text-blue-500" />
        {meta.label}?
      </span>
      {meta.type === 'boolean' ? (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onAnswer(factKey as keyof BusinessProfileForm, true)}
            className="px-2.5 py-1 bg-white hover:bg-green-50 text-green-700 font-semibold border border-green-300 rounded shadow-xs transition-colors"
          >
            Yes
          </button>
          <button
            onClick={() => onAnswer(factKey as keyof BusinessProfileForm, false)}
            className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-700 font-semibold border border-red-300 rounded shadow-xs transition-colors"
          >
            No
          </button>
        </div>
      ) : (
        <select
          onChange={(e) => onAnswer(factKey as keyof BusinessProfileForm, e.target.value)}
          defaultValue=""
          className="border border-blue-300 bg-white rounded px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="" disabled>Select {meta.label}...</option>
          {meta.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}
    </div>
  );
}

function EvidencePanel({
  chunks,
  hasVerifiedSource,
  reviewerStatus,
}: {
  chunks: EvidenceChunk[];
  hasVerifiedSource: boolean;
  reviewerStatus: 'draft' | 'verified';
}) {
  return (
    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
          Source Documentation &amp; Grounding
        </p>
        <ReviewerBadge status={reviewerStatus} />
      </div>

      {!hasVerifiedSource && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2 text-xs text-amber-800">
          <i className="fa-solid fa-triangle-exclamation text-amber-600 mt-0.5" />
          <div>
            <strong>No verified source quote yet:</strong> This regulatory requirement is based on draft legal indexing. Do not consider this quote definitive until verified by counsel.
          </div>
        </div>
      )}

      {chunks.map((c, i) => (
        <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-semibold text-slate-900">{c.source_title || c.source_id}</span>
              {c.page && <span className="ml-2 text-slate-500 font-mono">p. {c.page}</span>}
            </div>
            {c.url && (
              <a
                href={c.url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
              >
                <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                Official Source
              </a>
            )}
          </div>

          <div className="flex flex-wrap gap-4 text-[11px] text-slate-500">
            <span><strong>Source ID:</strong> <span className="font-mono">{c.source_id}</span></span>
            {c.effective_date && <span><strong>Effective From:</strong> {c.effective_date}</span>}
            {c.retrieved_date && <span><strong>Retrieved:</strong> {c.retrieved_date}</span>}
          </div>

          {c.quote ? (
            <blockquote className="border-l-2 border-blue-400 bg-white p-2 rounded text-slate-700 italic leading-relaxed text-xs">
              &ldquo;{c.quote}&rdquo;
            </blockquote>
          ) : (
            <p className="text-slate-400 italic text-[11px]">
              No verbatim quote recorded in draft catalog.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function ObligationCard({
  obl,
  previousStatus,
  onAnswerMissingFact,
}: {
  obl: ObligationResult;
  previousStatus?: ApplicabilityStatus;
  onAnswerMissingFact: (key: keyof BusinessProfileForm, value: unknown) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[obl.status];
  const hasStatusChanged = previousStatus && previousStatus !== obl.status;

  return (
    <div className={`border ${cfg.border} rounded-xl overflow-hidden bg-white shadow-xs transition-all`}>
      {/* Header row */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className={`w-full flex items-center gap-3 px-4 py-3.5 ${cfg.bg} text-left hover:brightness-95 transition-all`}
      >
        <i className={`fa-solid ${cfg.icon} ${cfg.color} text-base`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-bold ${cfg.color} truncate`}>{obl.name}</p>
            {hasStatusChanged && (
              <span className="text-[10px] font-semibold bg-white px-2 py-0.5 rounded-full border border-blue-300 text-blue-700">
                {STATUS_CONFIG[previousStatus].label} &rarr; {STATUS_CONFIG[obl.status].label}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">{obl.authority} &middot; {obl.jurisdiction}</p>
        </div>
        <StatusBadge status={obl.status} />
        <i
          className={`fa-solid ${
            expanded ? 'fa-chevron-up' : 'fa-chevron-down'
          } text-slate-400 text-xs ml-1`}
        />
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-5 py-4 bg-white space-y-3.5 text-xs">
          {/* Reason if not_identified or not_covered */}
          {obl.reason && (
            <div className="p-2.5 rounded-lg bg-slate-100 text-slate-700 flex items-start gap-2">
              <i className="fa-solid fa-circle-info text-slate-500 mt-0.5" />
              <div>
                <strong>Evaluation Reason:</strong> {obl.reason}
              </div>
            </div>
          )}

          {/* Trigger Facts */}
          <div>
            <p className="font-semibold text-slate-500 uppercase tracking-wide text-[11px] mb-1">
              Trigger Facts Evaluated
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(obl.trigger_facts).map(([k, v]) => (
                <span
                  key={k}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                    v === true
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : v === false
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  {k} = {String(v)}
                </span>
              ))}
            </div>
          </div>

          {/* Required Action */}
          <div>
            <p className="font-semibold text-slate-500 uppercase tracking-wide text-[11px]">
              Required Action
            </p>
            <p className="text-sm text-slate-800 mt-1 leading-relaxed">{obl.required_action}</p>
          </div>

          {/* Follow-up Questions for Unknowns */}
          {obl.missing_facts.length > 0 && (
            <div className="space-y-2 p-3 bg-blue-50/40 rounded-xl border border-blue-100">
              <p className="font-semibold text-blue-900 text-xs flex items-center gap-1.5">
                <i className="fa-solid fa-bolt text-blue-600" />
                Provide missing facts to resolve this obligation:
              </p>
              <div className="space-y-2">
                {obl.missing_facts.map((factKey) => (
                  <FollowUpQuestion
                    key={factKey}
                    factKey={factKey}
                    onAnswer={onAnswerMissingFact}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Evidence and Legal Documentation Panel */}
          <EvidencePanel
            chunks={obl.evidence}
            hasVerifiedSource={obl.has_verified_source}
            reviewerStatus={obl.reviewer_status}
          />

          <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">{obl.caveat}</p>
        </div>
      )}
    </div>
  );
}

function SummaryBadge({ label, count, colorClass }: { label: string; count: number; colorClass: string }) {
  return (
    <div className={`flex flex-col items-center px-4 py-2 rounded-xl ${colorClass}`}>
      <span className="text-2xl font-bold">{count}</span>
      <span className="text-xs font-medium opacity-80">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profile Form
// ---------------------------------------------------------------------------

function ProfileForm({
  profile,
  onChange,
  onSubmit,
  loading,
  onLoadSample,
}: {
  profile: BusinessProfileForm;
  onChange: (p: BusinessProfileForm) => void;
  onSubmit: () => void;
  loading: boolean;
  onLoadSample: (id: string) => void;
}) {
  const set = (key: keyof BusinessProfileForm, value: unknown) =>
    onChange({ ...profile, [key]: value === '' ? undefined : value });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <i className="fa-solid fa-building text-blue-600" />
          Business Profile
        </h2>
        
        {/* Sample Profile Demo Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Load sample:</span>
          <button
            type="button"
            onClick={() => onLoadSample('clear_case')}
            className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition-colors"
          >
            Clear Case
          </button>
          <button
            type="button"
            onClick={() => onLoadSample('conditional_case')}
            className="px-2.5 py-1 bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition-colors"
          >
            Conditional Case
          </button>
          <button
            type="button"
            onClick={() => onLoadSample('missing_info_case')}
            className="px-2.5 py-1 bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition-colors"
          >
            Missing Info
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Business Type */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Business Type</label>
          <select
            value={profile.business_type || ''}
            onChange={(e) => set('business_type', e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="">-- Unknown --</option>
            <option value="bakery">Bakery</option>
            <option value="cake_shop">Cake Shop</option>
            <option value="sweets_shop">Sweets Shop</option>
            <option value="restaurant">Restaurant</option>
            <option value="food_business">Other Food Business</option>
            <option value="clothing_retail">Clothing Retail</option>
            <option value="beauty_salon">Beauty Salon</option>
            <option value="vehicle_parts_retail">Vehicle Parts Retail</option>
          </select>
        </div>

        {/* Local Authority */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Local Authority</label>
          <select
            value={profile.local_authority || ''}
            onChange={(e) => set('local_authority', e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="">-- Unknown --</option>
            <option value="Colombo Municipal Council">Colombo Municipal Council</option>
            <option value="Kotte Municipal Council">Kotte Municipal Council</option>
            <option value="Dehiwala-Mount Lavinia Municipal Council">Dehiwala-Mount Lavinia MC</option>
            <option value="Kandy Municipal Council">Kandy Municipal Council (Out of scope demo)</option>
          </select>
        </div>

        {/* Legal Form */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Legal Form</label>
          <select
            value={profile.legal_form || ''}
            onChange={(e) => set('legal_form', e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="">-- Unknown --</option>
            <option value="sole_proprietorship">Sole Proprietorship</option>
            <option value="partnership">Partnership</option>
            <option value="private_limited">Private Limited Company</option>
          </select>
        </div>

        {/* Employee Band */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Number of Employees</label>
          <select
            value={profile.employee_band || ''}
            onChange={(e) => set('employee_band', e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="">-- Unknown --</option>
            <option value="0">0 (Owner only)</option>
            <option value="1_9">1–9 (Micro)</option>
            <option value="10_49">10–49 (Small)</option>
            <option value="50_plus">50+ (Medium)</option>
          </select>
        </div>

        {/* Jurisdiction */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Province</label>
          <select
            value={profile.jurisdiction || ''}
            onChange={(e) => set('jurisdiction', e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="">-- Unknown --</option>
            <option value="Western Province">Western Province</option>
            <option value="Central Province">Central Province (Out of scope demo)</option>
            <option value="Southern Province">Southern Province</option>
            <option value="Northern Province">Northern Province</option>
          </select>
        </div>
      </div>

      {/* Boolean toggles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { key: 'handles_food', label: 'Handles Food' },
          { key: 'has_physical_premises', label: 'Physical Premises' },
          { key: 'is_manufacturing', label: 'Manufacturing' },
          { key: 'is_importing', label: 'Importing Goods' },
        ] as const).map(({ key, label }) => {
          const val = profile[key];
          return (
            <div key={key} className="border border-slate-200 rounded-xl p-2.5">
              <p className="text-xs font-semibold text-slate-600 mb-2">{label}</p>
              <div className="flex gap-1.5">
                {([true, false] as const).map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    onClick={() => set(key, val === v ? undefined : v)}
                    className={`flex-1 text-xs py-1 rounded-lg font-semibold transition-colors ${
                      val === v
                        ? v
                          ? 'bg-green-100 text-green-700 border border-green-300'
                          : 'bg-red-100 text-red-700 border border-red-300'
                        : 'bg-slate-100 text-slate-500 border border-transparent hover:border-slate-300'
                    }`}
                  >
                    {v ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={onSubmit}
        disabled={loading}
        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold rounded-xl shadow transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <i className="fa-solid fa-spinner fa-spin" />
            Analysing&hellip;
          </>
        ) : (
          <>
            <i className="fa-solid fa-shield-halved" />
            Analyse Compliance
          </>
        )}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results Panel
// ---------------------------------------------------------------------------

function ResultsPanel({
  result,
  previousResults,
  onAnswerMissingFact,
  onExportChecklist,
}: {
  result: ComplianceAnalysisResponse;
  previousResults?: Record<string, ApplicabilityStatus>;
  onAnswerMissingFact: (key: keyof BusinessProfileForm, value: unknown) => void;
  onExportChecklist: () => void;
}) {
  const groups: Record<ApplicabilityStatus, ObligationResult[]> = {
    applicable: result.obligations.filter((o) => o.status === 'applicable'),
    conditional: result.obligations.filter((o) => o.status === 'conditional'),
    unknown: result.obligations.filter((o) => o.status === 'unknown'),
    not_identified: result.obligations.filter((o) => o.status === 'not_identified'),
    not_covered: result.obligations.filter((o) => o.status === 'not_covered'),
  };

  // Compute Missing Facts that would resolve the most obligations
  const factFrequency: Record<string, number> = {};
  result.obligations
    .filter((o) => o.status === 'unknown')
    .forEach((o) => {
      o.missing_facts.forEach((f) => {
        factFrequency[f] = (factFrequency[f] || 0) + 1;
      });
    });

  const sortedMissingFacts = Object.entries(factFrequency).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">
      {/* Summary row + Export Checklist */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <SummaryBadge label="Applicable" count={result.summary.applicable || 0} colorClass="bg-red-50 text-red-700 border border-red-200" />
          <SummaryBadge label="Conditional" count={result.summary.conditional || 0} colorClass="bg-amber-50 text-amber-700 border border-amber-200" />
          <SummaryBadge label="Unknown" count={result.summary.unknown || 0} colorClass="bg-blue-50 text-blue-700 border border-blue-200" />
          <SummaryBadge label="Not Identified" count={result.summary.not_identified || 0} colorClass="bg-slate-50 text-slate-600 border border-slate-200" />
          {result.summary.not_covered ? (
            <SummaryBadge label="Not Covered" count={result.summary.not_covered} colorClass="bg-purple-50 text-purple-700 border border-purple-200" />
          ) : null}
        </div>

        <button
          onClick={onExportChecklist}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
        >
          <i className="fa-solid fa-print" />
          Export Checklist (Print / PDF)
        </button>
      </div>

      {/* Task 4: Unknown - why? summary banner */}
      {sortedMissingFacts.length > 0 && (
        <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
            <i className="fa-solid fa-lightbulb text-amber-500" />
            Unknown &mdash; Why? (High Impact Missing Facts)
          </div>
          <p className="text-xs text-blue-800">
            Answering these questions will immediately resolve the most pending regulatory obligations:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {sortedMissingFacts.slice(0, 4).map(([fKey, count]) => (
              <div key={fKey} className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-blue-700">
                  Resolves {count} obligation{count > 1 ? 's' : ''}:
                </span>
                <FollowUpQuestion factKey={fKey} onAnswer={onAnswerMissingFact} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grouped obligation cards */}
      {((['applicable', 'conditional', 'unknown', 'not_identified', 'not_covered'] as ApplicabilityStatus[]).map((status) => (
        groups[status].length > 0 && (
          <div key={status}>
            <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${STATUS_CONFIG[status].color}`}>
              <i className={`fa-solid ${STATUS_CONFIG[status].icon} mr-1.5`} />
              {STATUS_CONFIG[status].label} ({groups[status].length})
            </h3>
            <div className="space-y-2.5">
              {groups[status].map((obl) => (
                <ObligationCard
                  key={obl.id}
                  obl={obl}
                  previousStatus={previousResults ? previousResults[obl.id] : undefined}
                  onAnswerMissingFact={onAnswerMissingFact}
                />
              ))}
            </div>
          </div>
        )
      )))}

      {/* Caveat */}
      <div className="p-3.5 bg-yellow-50 border border-yellow-200 rounded-xl">
        <p className="text-xs text-yellow-800 flex items-start gap-2">
          <i className="fa-solid fa-scale-balanced text-yellow-600 mt-0.5" />
          <span>{result.caveat}</span>
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------

export const RegistrationComplianceDashboard: React.FC = () => {
  const [profile, setProfile] = useState<BusinessProfileForm>({});
  const [result, setResult] = useState<ComplianceAnalysisResponse | null>(null);
  const [previousStatuses, setPreviousStatuses] = useState<Record<string, ApplicabilityStatus>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeAnalysis = async (profToAnalyze: BusinessProfileForm) => {
    setLoading(true);
    setError(null);
    try {
      if (result) {
        const prevMap: Record<string, ApplicabilityStatus> = {};
        result.obligations.forEach((o) => {
          prevMap[o.id] = o.status;
        });
        setPreviousStatuses(prevMap);
      }
      const data = await fetchCompliance(profToAnalyze);
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyse = () => {
    executeAnalysis(profile);
  };

  const handleAnswerMissingFact = (key: keyof BusinessProfileForm, value: unknown) => {
    const updatedProfile = { ...profile, [key]: value };
    setProfile(updatedProfile);
    executeAnalysis(updatedProfile);
  };

  const handleLoadSample = async (sampleId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/compliance/sample-profiles/${sampleId}`);
      if (!res.ok) throw new Error(`Failed to load sample ${sampleId}`);
      const sampleData = await res.json();
      setProfile(sampleData);
      const analysisData = await fetchCompliance(sampleData);
      setResult(analysisData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading sample profile');
    } finally {
      setLoading(false);
    }
  };

  const handleExportChecklist = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-auto bg-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-xs print:static">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <i className="fa-solid fa-shield-halved text-white text-sm" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Business Registration &amp; Regulatory Compliance</h1>
            <p className="text-xs text-slate-500">Component 2 — AI-Driven Business Lifecycle Decision Support System &middot; Colombo District, Sri Lanka</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6">
        {/* Task 2: Revised Banner */}
        <div className="bg-blue-600 rounded-2xl p-4 text-white shadow-xs">
          <div className="flex items-start gap-3">
            <i className="fa-solid fa-circle-info text-blue-200 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Regulatory Compliance Guidance Engine</p>
              <p className="text-xs text-blue-100 mt-0.5">
                Rule-based guidance with AI-phrased explanations. Not legal advice. Verify with the authority or a licensed practitioner.
              </p>
            </div>
          </div>
        </div>

        {/* Profile form */}
        <div className="print:hidden">
          <ProfileForm
            profile={profile}
            onChange={setProfile}
            onSubmit={handleAnalyse}
            loading={loading}
            onLoadSample={handleLoadSample}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700">
              <i className="fa-solid fa-triangle-exclamation mr-2" />
              {error}
            </p>
          </div>
        )}

        {/* Results */}
        {result && (
          <ResultsPanel
            result={result}
            previousResults={previousStatuses}
            onAnswerMissingFact={handleAnswerMissingFact}
            onExportChecklist={handleExportChecklist}
          />
        )}
      </main>
    </div>
  );
};

export default RegistrationComplianceDashboard;
