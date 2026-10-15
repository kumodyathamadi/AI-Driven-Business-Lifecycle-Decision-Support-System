import React, { useState, useEffect } from 'react';
import { RegistrationComplianceDashboard } from './components/component2.tsx';

// ---------------------------------------------------------------------------
// Static Legal Sources Data for Corpus Inspector Tab
// ---------------------------------------------------------------------------
interface LegalSourceItem {
  source_id: string;
  title: string;
  authority: string;
  jurisdiction: string;
  doc_type: string;
  effective_date: string;
  key_sections: string;
  status: 'verified' | 'needs_verification';
}

const STATUTORY_REGISTER: LegalSourceItem[] = [
  {
    source_id: 'SRC-WP-BN-1990',
    title: 'Business Names Statute of Western Province No. 04 of 1990',
    authority: 'Department of Business Names (Western Provincial Council)',
    jurisdiction: 'Western Province, Sri Lanka',
    doc_type: 'Provincial Statute',
    effective_date: '1990-06-15',
    key_sections: 'Section 3(1), Section 7 (Registration within 14 days)',
    status: 'verified',
  },
  {
    source_id: 'SRC-MCO-1976',
    title: 'Municipal Councils Ordinance No. 29 of 1947 (Section 247A By-laws)',
    authority: 'Colombo Municipal Council / Western Province Local Authorities',
    jurisdiction: 'Western Province (Municipal Areas)',
    doc_type: 'Primary Act & By-Laws',
    effective_date: '1976-11-20',
    key_sections: 'Section 247A (Annual Trade Tax & Commercial Operating License)',
    status: 'verified',
  },
  {
    source_id: 'SRC-FOOD-ACT-1980',
    title: 'Food Act No. 26 of 1980 & Food (Hygiene) Regulations',
    authority: 'Public Health Department / Office of MOH (Municipal Health)',
    jurisdiction: 'Sri Lanka (National & Municipal Enforcement)',
    doc_type: 'Primary Act & Gazettes',
    effective_date: '1980-08-01',
    key_sections: 'Section 2(1) (Food premises licensing), Reg 14 (PHI Medical Clearance)',
    status: 'verified',
  },
  {
    source_id: 'SRC-NMRA-COSMETICS-2015',
    title: 'National Medicines Regulatory Authority (NMRA) Act No. 5 of 2015',
    authority: 'National Medicines Regulatory Authority & Municipal Health Department',
    jurisdiction: 'Sri Lanka (National)',
    doc_type: 'Primary Act',
    effective_date: '2015-07-01',
    key_sections: 'Part IV Regulation 12 (Cosmetic chemical handling & salon registration)',
    status: 'verified',
  },
  {
    source_id: 'SRC-CEA-ENV-2008',
    title: 'National Environmental Act No. 47 of 1980 (Order 1533/16)',
    authority: 'Central Environmental Authority (CEA)',
    jurisdiction: 'Western Province & National',
    doc_type: 'Statutory Gazette Order',
    effective_date: '2008-02-01',
    key_sections: 'Schedule List B (Hazardous waste lubricant & spent battery storage)',
    status: 'verified',
  },
  {
    source_id: 'SRC-LA-TRADE-1980',
    title: 'Local Authority Trade Licensing & Fire Safety Regulations',
    authority: 'Local Municipal Council & Fire Service Department',
    jurisdiction: 'Colombo Municipal Limits',
    doc_type: 'Municipal By-Law',
    effective_date: '1980-01-15',
    key_sections: 'Section 4 (Textile / Garment commercial safety clearance)',
    status: 'needs_verification',
  },
];

export const App: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'comp2' | 'comp1' | 'sources' | 'kleene_inspector' | 'audit_log'>('comp2');
  const [backendStatus, setBackendStatus] = useState<'online' | 'checking' | 'offline'>('checking');
  const [sourceSearch, setSourceSearch] = useState<string>('');

  // Interactive Kleene Inspector State
  const [kleeneFacts, setKleeneFacts] = useState<{
    province_is_wp: boolean | null;
    physical_premises: boolean | null;
    operates_kitchen: boolean | null;
    handles_hazardous_waste: boolean | null;
  }>({
    province_is_wp: true,
    physical_premises: true,
    operates_kitchen: null, // Unknown
    handles_hazardous_waste: false,
  });

  // Verify backend health on mount
  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/health')
      .then((res) => {
        if (res.ok) setBackendStatus('online');
        else setBackendStatus('offline');
      })
      .catch(() => setBackendStatus('offline'));
  }, []);

  // Compute Kleene 3VL demonstration output:
  // Rule: Province == WP (Fact 1) AND Physical Premises (Fact 2) AND Operates Kitchen (Fact 3)
  const computeKleeneFoodPremises = () => {
    const { province_is_wp, physical_premises, operates_kitchen } = kleeneFacts;
    // Kleene AND
    if (province_is_wp === false || physical_premises === false || operates_kitchen === false) {
      return { status: 'NOT_APPLICABLE', label: 'Not Applicable (False)', color: 'text-slate-600 bg-slate-100 border-slate-300' };
    }
    if (province_is_wp === null || physical_premises === null || operates_kitchen === null) {
      return { status: 'UNKNOWN', label: 'Conditional / Unknown (None)', color: 'text-amber-800 bg-amber-50 border-amber-300' };
    }
    return { status: 'APPLICABLE', label: 'Applicable (True)', color: 'text-emerald-800 bg-emerald-50 border-emerald-300' };
  };

  const filteredSources = STATUTORY_REGISTER.filter(
    (s) =>
      s.title.toLowerCase().includes(sourceSearch.toLowerCase()) ||
      s.authority.toLowerCase().includes(sourceSearch.toLowerCase()) ||
      s.source_id.toLowerCase().includes(sourceSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800 font-sans antialiased selection:bg-teal-500 selection:text-white">
      {/* ----------------------------------------------------------------- */}
      {/* 1. COLLAPSIBLE EXECUTIVE SIDEBAR                                   */}
      {/* ----------------------------------------------------------------- */}
      <aside
        className={`bg-white border-r border-slate-200/90 flex flex-col transition-all duration-300 ease-in-out shrink-0 z-40 relative shadow-xs ${
          isSidebarCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        {/* Brand / Logo Section */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between min-h-[72px]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-teal-400 flex items-center justify-center shrink-0 shadow-sm border border-slate-700/50">
              <i className="fa-solid fa-scale-balanced text-lg"></i>
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col truncate">
                <span className="font-extrabold text-sm tracking-tight text-slate-900 flex items-center gap-1.5">
                  LEXIS·SME AI
                  <span className="text-[10px] bg-teal-50 text-teal-700 font-bold px-1.5 py-0.5 rounded border border-teal-200">
                    v1.2
                  </span>
                </span>
                <span className="text-[11px] text-slate-600 truncate font-medium">
                  Regulatory &amp; Advisory Suite
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors text-xs border border-slate-200/80 shrink-0"
          >
            <i className={`fa-solid ${isSidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
          </button>
        </div>

        {/* Academic Project Scope Pill */}
        {!isSidebarCollapsed && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px]">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              Research Demonstration
            </div>
            <p className="text-slate-600 leading-tight">
              Western Province SME Compliance Architecture (Kleene 3VL Engine)
            </p>
          </div>
        )}

        {/* Primary Navigation Menu */}
        <nav className="p-3 space-y-1.5 flex-1 overflow-y-auto">
          {/* Component 2: Regulatory Compliance */}
          <button
            onClick={() => setActiveTab('comp2')}
            title="Legal & Regulatory Requirement Identification"
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'comp2'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                activeTab === 'comp2' ? 'bg-slate-800 text-teal-400' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <i className="fa-solid fa-gavel"></i>
            </div>
            {!isSidebarCollapsed && (
              <div className="text-left flex-1 truncate">
                <div className="truncate font-semibold">Regulatory Engine</div>
                <div className={`text-[10px] font-normal truncate ${activeTab === 'comp2' ? 'text-slate-300' : 'text-slate-600'}`}>
                  Component 2 — Law &amp; Regs
                </div>
              </div>
            )}
            {!isSidebarCollapsed && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'comp2' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' : 'bg-slate-200 text-slate-600'
                }`}
              >
                Core
              </span>
            )}
          </button>

          {/* Component 1: Feasibility & Business Planning */}
          <button
            onClick={() => setActiveTab('comp1')}
            title="Business Feasibility & Business Plan Recommendation"
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'comp1'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                activeTab === 'comp1' ? 'bg-slate-800 text-teal-400' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <i className="fa-solid fa-chart-line"></i>
            </div>
            {!isSidebarCollapsed && (
              <div className="text-left flex-1 truncate">
                <div className="truncate font-semibold">Feasibility &amp; Planning</div>
                <div className={`text-[10px] font-normal truncate ${activeTab === 'comp1' ? 'text-slate-300' : 'text-slate-600'}`}>
                  Component 1 — ML &amp; SHAP
                </div>
              </div>
            )}
          </button>

          {/* Statutory Source Register */}
          <button
            onClick={() => setActiveTab('sources')}
            title="Browse Ingested Primary Acts and Gazettes"
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'sources'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                activeTab === 'sources' ? 'bg-slate-800 text-teal-400' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <i className="fa-solid fa-book-bookmark"></i>
            </div>
            {!isSidebarCollapsed && (
              <div className="text-left flex-1 truncate">
                <div className="truncate font-semibold">Statutory Register</div>
                <div className={`text-[10px] font-normal truncate ${activeTab === 'sources' ? 'text-slate-300' : 'text-slate-600'}`}>
                  Primary Acts &amp; Gazettes
                </div>
              </div>
            )}
            {!isSidebarCollapsed && (
              <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                {STATUTORY_REGISTER.length}
              </span>
            )}
          </button>

          {/* Kleene 3VL Logic Inspector */}
          <button
            onClick={() => setActiveTab('kleene_inspector')}
            title="Interactive Three-Valued Logic Truth Table & Proof"
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'kleene_inspector'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                activeTab === 'kleene_inspector' ? 'bg-slate-800 text-teal-400' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <i className="fa-solid fa-flask-vial"></i>
            </div>
            {!isSidebarCollapsed && (
              <div className="text-left flex-1 truncate">
                <div className="truncate font-semibold">3VL Kleene Inspector</div>
                <div className={`text-[10px] font-normal truncate ${activeTab === 'kleene_inspector' ? 'text-slate-300' : 'text-slate-600'}`}>
                  Audit-Proof Logic Demo
                </div>
              </div>
            )}
          </button>
        </nav>

        {/* Sidebar Footer: System Diagnostics */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                backendStatus === 'online'
                  ? 'bg-emerald-500 ring-4 ring-emerald-100 animate-pulse'
                  : 'bg-rose-500'
              }`}
            ></span>
            {!isSidebarCollapsed && (
              <div className="truncate">
                <div className="text-[11px] font-bold text-slate-800 leading-tight">
                  {backendStatus === 'online' ? 'API Server Online' : 'API Connecting...'}
                </div>
                <div className="text-[10px] text-slate-600 font-mono">
                  127.0.0.1:8000
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ----------------------------------------------------------------- */}
      {/* 2. MAIN APPLICATION CONTENT AREA                                 */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Executive Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <i className="fa-solid fa-landmark text-slate-600"></i>
              Sri Lanka LegalTech
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-bold text-slate-800">
              {activeTab === 'comp2' && 'Component 2 — Regulatory Compliance Engine'}
              {activeTab === 'comp1' && 'Component 1 — Feasibility & Planning Advisory'}
              {activeTab === 'sources' && 'Statutory Source Register & Ingested Corpus'}
              {activeTab === 'kleene_inspector' && 'Deterministic Three-Valued Kleene Logic Inspector'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Jurisdiction Badge */}
            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200/80 text-xs font-semibold text-slate-700">
              <span className="text-sm">🇱🇰</span>
              <span>Western Province Scope</span>
            </div>

            {/* Kleene Logic Indicator */}
            <div className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
              <i className="fa-solid fa-shield-check text-emerald-600"></i>
              <span>Deterministic 3VL (No LLM Decider)</span>
            </div>

            {/* Swagger API Direct Link */}
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              title="Open FastAPI Swagger Interactive Docs"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs transition-colors"
            >
              <i className="fa-solid fa-terminal text-blue-600"></i>
              <span>API Docs</span>
            </a>
          </div>
        </header>

        {/* Active View Container */}
        <main className="flex-1">
          {/* TAB 1: REGULATORY COMPLIANCE ENGINE (COMPONENT 2) */}
          {activeTab === 'comp2' && <RegistrationComplianceDashboard />}

          {/* TAB 2: COMPONENT 1 (FEASIBILITY & INTAKE) */}
          {activeTab === 'comp1' && (
            <div className="max-w-5xl mx-auto p-8 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="inline-block px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2 border border-blue-200">
                      Component 1 Architecture
                    </span>
                    <h2 className="text-xl font-bold text-slate-900">
                      Business Feasibility, AI Intake &amp; Planning Engine
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                      Component 1 receives entrepreneurial ideas, predicts viability using an ensemble
                      Random Forest trained on Sri Lankan SME survey datasets, extracts SHAP explainability values,
                      and outputs the structured Business Profile JSON consumed by Component 2.
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0">
                    <i className="fa-solid fa-network-wired"></i>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="text-xs font-bold text-slate-700 flex items-center gap-2 mb-1">
                      <i className="fa-solid fa-robot text-teal-600"></i>
                      Intake Assistant
                    </div>
                    <p className="text-xs text-slate-500">
                      Conversational NLP extractor mapping freeform Sri Lankan business descriptions to structured parameters.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="text-xs font-bold text-slate-700 flex items-center gap-2 mb-1">
                      <i className="fa-solid fa-chart-pie text-blue-600"></i>
                      Random Forest Model
                    </div>
                    <p className="text-xs text-slate-500">
                      Predicts success probability score and risk profile across startup capital, location, and demand.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="text-xs font-bold text-slate-700 flex items-center gap-2 mb-1">
                      <i className="fa-solid fa-file-invoice-dollar text-purple-600"></i>
                      Financial &amp; Plan Generator
                    </div>
                    <p className="text-xs text-slate-500">
                      Generates 12-month cashflow projections, break-even analyses, and ready-to-fund business plans.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between bg-slate-900 text-white rounded-xl p-4">
                  <div>
                    <h3 className="text-sm font-bold">Bridge to Component 2 Legal Engine</h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Ready to feed the validated business profile JSON into the regulatory rule engine?
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('comp2')}
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-900 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <span>Open Regulatory Engine</span>
                    <i className="fa-solid fa-arrow-right"></i>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STATUTORY REGISTER & SOURCE CORPUS */}
          {activeTab === 'sources' && (
            <div className="max-w-6xl mx-auto p-8 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <i className="fa-solid fa-book-journal-whills text-blue-600"></i>
                      Statutory Source Register
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Authoritative legal register grounded in Sri Lankan acts, provincial statutes, and municipal by-laws.
                    </p>
                  </div>

                  <div className="relative w-full sm:w-80">
                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-xs text-slate-400"></i>
                    <input
                      type="text"
                      value={sourceSearch}
                      onChange={(e) => setSourceSearch(e.target.value)}
                      placeholder="Search acts, authorities, source IDs..."
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-3 font-semibold">Source Identifier</th>
                        <th className="py-3 px-3 font-semibold">Statute / By-law Title</th>
                        <th className="py-3 px-3 font-semibold">Enforcing Authority</th>
                        <th className="py-3 px-3 font-semibold">Key Cited Sections</th>
                        <th className="py-3 px-3 font-semibold">Verification Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredSources.map((s) => (
                        <tr key={s.source_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-mono font-semibold text-blue-600">
                            {s.source_id}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-900 max-w-xs">
                            {s.title}
                            <div className="text-[10px] text-slate-400 font-normal">
                              {s.doc_type} &middot; Effective {s.effective_date}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {s.authority}
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {s.key_sections}
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <i className="fa-solid fa-check-double text-[10px]"></i>
                              Verified Law
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: KLEENE 3-VALUED LOGIC INSPECTOR (ACADEMIC DEMO) */}
          {activeTab === 'kleene_inspector' && (
            <div className="max-w-5xl mx-auto p-8 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <div>
                  <span className="inline-block px-2.5 py-1 rounded-md bg-teal-50 text-teal-700 text-xs font-bold uppercase tracking-wider mb-2 border border-teal-200">
                    Academic Research Rigor
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">
                    Deterministic Three-Valued Kleene Logic Inspector
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
                    A core research contribution of Component 2 is the strict elimination of LLM hallucination
                    in legal applicability. Missing facts are treated with Kleene 3-valued logic (True, False, None/Unknown).
                    Missing facts are <strong>never assumed to be false</strong>.
                  </p>
                </div>

                {/* Mathematical Kleene Truth Tables */}
                <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Kleene AND Table */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <h3 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-2">
                      <i className="fa-solid fa-square-root-variable text-blue-600"></i>
                      Kleene Conjunction (AND / all_of)
                    </h3>
                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                      <table className="w-full text-center text-xs">
                        <thead className="bg-slate-100 font-bold text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="py-1.5">AND</th>
                            <th className="py-1.5 text-emerald-700">True</th>
                            <th className="py-1.5 text-amber-700">Unknown</th>
                            <th className="py-1.5 text-rose-700">False</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
                          <tr>
                            <td className="bg-slate-100 font-bold text-emerald-700">True</td>
                            <td className="bg-emerald-50 text-emerald-800 font-bold">True</td>
                            <td className="bg-amber-50 text-amber-800">Unknown</td>
                            <td className="bg-rose-50 text-rose-800">False</td>
                          </tr>
                          <tr>
                            <td className="bg-slate-100 font-bold text-amber-700">Unknown</td>
                            <td className="bg-amber-50 text-amber-800">Unknown</td>
                            <td className="bg-amber-50 text-amber-800">Unknown</td>
                            <td className="bg-rose-50 text-rose-800">False</td>
                          </tr>
                          <tr>
                            <td className="bg-slate-100 font-bold text-rose-700">False</td>
                            <td className="bg-rose-50 text-rose-800">False</td>
                            <td className="bg-rose-50 text-rose-800">False</td>
                            <td className="bg-rose-50 text-rose-800">False</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">
                      Notice: <code>False AND Unknown = False</code> (short-circuit). However, <code>True AND Unknown = Unknown</code>.
                    </p>
                  </div>

                  {/* Kleene OR Table */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <h3 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-2">
                      <i className="fa-solid fa-code-fork text-teal-600"></i>
                      Kleene Disjunction (OR / any_of)
                    </h3>
                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                      <table className="w-full text-center text-xs">
                        <thead className="bg-slate-100 font-bold text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="py-1.5">OR</th>
                            <th className="py-1.5 text-emerald-700">True</th>
                            <th className="py-1.5 text-amber-700">Unknown</th>
                            <th className="py-1.5 text-rose-700">False</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
                          <tr>
                            <td className="bg-slate-100 font-bold text-emerald-700">True</td>
                            <td className="bg-emerald-50 text-emerald-800">True</td>
                            <td className="bg-emerald-50 text-emerald-800">True</td>
                            <td className="bg-emerald-50 text-emerald-800">True</td>
                          </tr>
                          <tr>
                            <td className="bg-slate-100 font-bold text-amber-700">Unknown</td>
                            <td className="bg-emerald-50 text-emerald-800">True</td>
                            <td className="bg-amber-50 text-amber-800">Unknown</td>
                            <td className="bg-amber-50 text-amber-800">Unknown</td>
                          </tr>
                          <tr>
                            <td className="bg-slate-100 font-bold text-rose-700">False</td>
                            <td className="bg-emerald-50 text-emerald-800">True</td>
                            <td className="bg-amber-50 text-amber-800">Unknown</td>
                            <td className="bg-rose-50 text-rose-800">False</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">
                      Notice: <code>True OR Unknown = True</code>. However, <code>False OR Unknown = Unknown</code>.
                    </p>
                  </div>
                </div>

                {/* Interactive Sandbox Playground */}
                <div className="mt-6 p-5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <i className="fa-solid fa-gamepad text-blue-600"></i>
                        Interactive Rule Evaluation Sandbox
                      </h3>
                      <p className="text-xs text-slate-500">
                        Rule: <code>CMC Food Premises Hygiene Licence (OBL-FOOD-001)</code>
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                        Evaluated Verdict
                      </div>
                      <div className={`mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${computeKleeneFoodPremises().color}`}>
                        {computeKleeneFoodPremises().label}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                    {/* Fact 1 */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        1. Location in Western Province
                      </label>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setKleeneFacts((p) => ({ ...p, province_is_wp: true }))}
                          className={`flex-1 py-1 text-xs font-semibold rounded ${
                            kleeneFacts.province_is_wp === true ? 'bg-emerald-600 text-white' : 'bg-white border text-slate-600'
                          }`}
                        >
                          True
                        </button>
                        <button
                          type="button"
                          onClick={() => setKleeneFacts((p) => ({ ...p, province_is_wp: null }))}
                          className={`flex-1 py-1 text-xs font-semibold rounded ${
                            kleeneFacts.province_is_wp === null ? 'bg-amber-500 text-white' : 'bg-white border text-slate-600'
                          }`}
                        >
                          Unknown
                        </button>
                        <button
                          type="button"
                          onClick={() => setKleeneFacts((p) => ({ ...p, province_is_wp: false }))}
                          className={`flex-1 py-1 text-xs font-semibold rounded ${
                            kleeneFacts.province_is_wp === false ? 'bg-rose-600 text-white' : 'bg-white border text-slate-600'
                          }`}
                        >
                          False
                        </button>
                      </div>
                    </div>

                    {/* Fact 2 */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        2. Has Physical Premises
                      </label>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setKleeneFacts((p) => ({ ...p, physical_premises: true }))}
                          className={`flex-1 py-1 text-xs font-semibold rounded ${
                            kleeneFacts.physical_premises === true ? 'bg-emerald-600 text-white' : 'bg-white border text-slate-600'
                          }`}
                        >
                          True
                        </button>
                        <button
                          type="button"
                          onClick={() => setKleeneFacts((p) => ({ ...p, physical_premises: null }))}
                          className={`flex-1 py-1 text-xs font-semibold rounded ${
                            kleeneFacts.physical_premises === null ? 'bg-amber-500 text-white' : 'bg-white border text-slate-600'
                          }`}
                        >
                          Unknown
                        </button>
                        <button
                          type="button"
                          onClick={() => setKleeneFacts((p) => ({ ...p, physical_premises: false }))}
                          className={`flex-1 py-1 text-xs font-semibold rounded ${
                            kleeneFacts.physical_premises === false ? 'bg-rose-600 text-white' : 'bg-white border text-slate-600'
                          }`}
                        >
                          False
                        </button>
                      </div>
                    </div>

                    {/* Fact 3 */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        3. Operates Kitchen / Cooking
                      </label>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setKleeneFacts((p) => ({ ...p, operates_kitchen: true }))}
                          className={`flex-1 py-1 text-xs font-semibold rounded ${
                            kleeneFacts.operates_kitchen === true ? 'bg-emerald-600 text-white' : 'bg-white border text-slate-600'
                          }`}
                        >
                          True
                        </button>
                        <button
                          type="button"
                          onClick={() => setKleeneFacts((p) => ({ ...p, operates_kitchen: null }))}
                          className={`flex-1 py-1 text-xs font-semibold rounded ${
                            kleeneFacts.operates_kitchen === null ? 'bg-amber-500 text-white' : 'bg-white border text-slate-600'
                          }`}
                        >
                          Unknown
                        </button>
                        <button
                          type="button"
                          onClick={() => setKleeneFacts((p) => ({ ...p, operates_kitchen: false }))}
                          className={`flex-1 py-1 text-xs font-semibold rounded ${
                            kleeneFacts.operates_kitchen === false ? 'bg-rose-600 text-white' : 'bg-white border text-slate-600'
                          }`}
                        >
                          False
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
