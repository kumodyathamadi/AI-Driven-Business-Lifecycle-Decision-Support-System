import React, { useState } from 'react';

// ---------------------------------------------------------------------------
// Types (mirror backend schemas.py)
// ---------------------------------------------------------------------------

type ApplicabilityStatus = 'applicable' | 'conditional' | 'not_applicable' | 'unknown';

interface EvidenceChunk {
  source_id: string;
  page?: number;
  quote: string;
  url?: string;
  retrieved_date?: string;
  authority?: string;
}

interface ObligationResult {
  id: string;
  name: string;
  status: ApplicabilityStatus;
  trigger_facts: Record<string, unknown>;
  missing_facts: string[];
  authority: string;
  jurisdiction: string;
  required_action: string;
  evidence: EvidenceChunk[];
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
  not_applicable: {
    label: 'Not Applicable',
    color: 'text-slate-500',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    icon: 'fa-circle-check',
  },
  unknown: {
    label: 'Unknown',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'fa-circle-question',
  },
};

// ---------------------------------------------------------------------------
// Helper: POST to compliance engine
// ---------------------------------------------------------------------------

async function fetchCompliance(profile: BusinessProfileForm): Promise<ComplianceAnalysisResponse> {
  // Strip undefined values so the engine treats them as None (unknown)
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
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
        cfg.color
      } ${cfg.bg} border ${cfg.border}`}
    >
      <i className={`fa-solid ${cfg.icon} text-xs`} />
      {cfg.label}
    </span>
  );
}

function EvidencePanel({ chunks }: { chunks: EvidenceChunk[] }) {
  if (!chunks.length) return null;
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Legal Source</p>
      {chunks.map((c, i) => (
        <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono font-bold text-slate-700">{c.source_id}</span>
            {c.page && <span className="text-slate-400">p. {c.page}</span>}
            {c.url && (
              <a
                href={c.url}
                target="_blank"
                rel="noreferrer"
                className="ml-auto text-blue-600 hover:underline flex items-center gap-1"
              >
                <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                Source
              </a>
            )}
          </div>
          {c.quote && (
            <blockquote className="border-l-2 border-slate-300 pl-2 text-slate-600 italic leading-relaxed">
              &ldquo;{c.quote}&rdquo;
            </blockquote>
          )}
          {c.retrieved_date && (
            <p className="mt-1 text-slate-400">Retrieved: {c.retrieved_date}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function MissingFactsPrompt({ facts }: { facts: string[] }) {
  if (!facts.length) return null;
  const labels: Record<string, string> = {
    business_type: 'Business Type',
    local_authority: 'Local Authority',
    handles_food: 'Handles Food?',
    has_physical_premises: 'Has Physical Premises?',
    employee_band: 'Number of Employees',
    is_manufacturing: 'Is Manufacturing?',
    is_importing: 'Is Importing?',
    legal_form: 'Legal Form',
    jurisdiction: 'Jurisdiction / Province',
  };
  return (
    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <p className="text-xs font-semibold text-blue-700 mb-1.5">
        <i className="fa-solid fa-circle-info mr-1" />
        Provide these facts to resolve this obligation:
      </p>
      <ul className="space-y-0.5">
        {facts.map((f) => (
          <li key={f} className="text-xs text-blue-800 flex items-center gap-1.5">
            <i className="fa-solid fa-chevron-right text-[9px] text-blue-400" />
            {labels[f] || f}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ObligationCard({ obl }: { obl: ObligationResult }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[obl.status];

  return (
    <div className={`border ${cfg.border} rounded-xl overflow-hidden`}>
      {/* Header row */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className={`w-full flex items-center gap-3 px-4 py-3 ${cfg.bg} text-left hover:brightness-95 transition-all`}
      >
        <i className={`fa-solid ${cfg.icon} ${cfg.color}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${cfg.color} truncate`}>{obl.name}</p>
          <p className="text-xs text-slate-500">{obl.authority} · {obl.jurisdiction}</p>
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
        <div className="px-4 py-3 bg-white space-y-2">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Required Action</p>
            <p className="text-sm text-slate-800 mt-1 leading-relaxed">{obl.required_action}</p>
          </div>

          {obl.missing_facts.length > 0 && <MissingFactsPrompt facts={obl.missing_facts} />}
          <EvidencePanel chunks={obl.evidence} />

          <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">{obl.caveat}</p>
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
}: {
  profile: BusinessProfileForm;
  onChange: (p: BusinessProfileForm) => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  const set = (key: keyof BusinessProfileForm, value: unknown) =>
    onChange({ ...profile, [key]: value === '' ? undefined : value });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
        <i className="fa-solid fa-building text-blue-600" />
        Business Profile
        <span className="ml-auto text-xs font-normal text-slate-400">All fields optional — leave blank if unknown</span>
      </h2>

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
            <option value="Central Province">Central Province</option>
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

function ResultsPanel({ result }: { result: ComplianceAnalysisResponse }) {
  const groups: Record<ApplicabilityStatus, ObligationResult[]> = {
    applicable: result.obligations.filter((o) => o.status === 'applicable'),
    conditional: result.obligations.filter((o) => o.status === 'conditional'),
    unknown: result.obligations.filter((o) => o.status === 'unknown'),
    not_applicable: result.obligations.filter((o) => o.status === 'not_applicable'),
  };

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="flex flex-wrap gap-2">
        <SummaryBadge label="Applicable" count={result.summary.applicable || 0} colorClass="bg-red-50 text-red-700 border border-red-200" />
        <SummaryBadge label="Conditional" count={result.summary.conditional || 0} colorClass="bg-amber-50 text-amber-700 border border-amber-200" />
        <SummaryBadge label="Unknown" count={result.summary.unknown || 0} colorClass="bg-blue-50 text-blue-700 border border-blue-200" />
        <SummaryBadge label="Not Applicable" count={result.summary.not_applicable || 0} colorClass="bg-slate-50 text-slate-500 border border-slate-200" />
      </div>

      {/* Applicable obligations first */}
      {((['applicable', 'conditional', 'unknown', 'not_applicable'] as ApplicabilityStatus[]).map((status) => (
        groups[status].length > 0 && (
          <div key={status}>
            <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${STATUS_CONFIG[status].color}`}>
              <i className={`fa-solid ${STATUS_CONFIG[status].icon} mr-1`} />
              {STATUS_CONFIG[status].label} ({groups[status].length})
            </h3>
            <div className="space-y-2">
              {groups[status].map((obl) => (
                <ObligationCard key={obl.id} obl={obl} />
              ))}
            </div>
          </div>
        )
      )))}

      {/* Caveat */}
      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
        <p className="text-xs text-yellow-800">
          <i className="fa-solid fa-scale-balanced mr-1" />
          {result.caveat}
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyse = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCompliance(profile);
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-auto bg-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
          <i className="fa-solid fa-shield-halved text-white text-sm" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900">Business Registration &amp; Regulatory Compliance</h1>
          <p className="text-xs text-slate-500">Component 2 — AI-Driven Business Lifecycle Decision Support System · Colombo District, Sri Lanka</p>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6">
        {/* Intro banner */}
        <div className="bg-blue-600 rounded-2xl p-4 text-white">
          <div className="flex items-start gap-3">
            <i className="fa-solid fa-circle-info text-blue-200 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Deterministic Three-Valued Applicability Engine</p>
              <p className="text-xs text-blue-100 mt-0.5">
                Fill in what you know. Leave fields blank for unknown facts.
                The engine returns <strong>Applicable</strong>, <strong>Conditional</strong>,
                <strong> Unknown</strong>, or <strong>Not Applicable</strong> per regulation —
                grounded in registered legal sources. The AI only phrases results; it never decides.
              </p>
            </div>
          </div>
        </div>

        {/* Profile form */}
        <ProfileForm
          profile={profile}
          onChange={setProfile}
          onSubmit={handleAnalyse}
          loading={loading}
        />

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
        {result && <ResultsPanel result={result} />}
      </main>
    </div>
  );
};

export default RegistrationComplianceDashboard;
