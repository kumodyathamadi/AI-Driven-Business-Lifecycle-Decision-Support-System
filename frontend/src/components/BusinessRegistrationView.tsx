import React, { useState } from 'react';

export interface BrFormData {
  business_name: string;
  legal_form: 'sole_proprietorship' | 'partnership' | 'private_limited';
  sector: string;
  district: string;
  province: string;
  local_authority: string;
  divisional_secretariat: string;
  grama_niladhari: string;
  address: string;
  activities: string[];
  products_services: string[];
  employee_count: number;
  revenue: number;
  initial_capital: number;
  owner_name: string;
  owner_nic: string;
  phone: string;
  email: string;
  residence_address: string;
  commencement_date: string;
}

const SAMPLE_PRESETS: Record<string, BrFormData> = {
  bakery: {
    business_name: 'CEYLON ARTISAN BAKEHOUSE',
    legal_form: 'sole_proprietorship',
    sector: 'Food Manufacturing & Bakery Products',
    district: 'Colombo',
    province: 'Western Province',
    local_authority: 'Colombo Municipal Council',
    divisional_secretariat: 'Thimbirigasyaya Divisional Secretariat',
    grama_niladhari: 'Havelock Town (GN Division 512)',
    address: 'No. 45, Galle Road, Colombo 04',
    activities: ['Baking bread and pastries', 'Cooked meals preparation', 'Retail sales'],
    products_services: ['Artisan Sourdough', 'Cakes & Pastries', 'Cooked Breakfast Snacks', 'Tea & Coffee'],
    employee_count: 5,
    revenue: 4200000,
    initial_capital: 1500000,
    owner_name: 'Dhananjaya Bandara',
    owner_nic: '199415802345',
    phone: '+94 77 123 4567',
    email: 'dhananjaya.bakes@sme.lk',
    residence_address: 'No. 12/B, Flower Road, Colombo 07',
    commencement_date: '2026-11-01',
  },
  clothing: {
    business_name: 'URBAN THREAD BOUTIQUE',
    legal_form: 'sole_proprietorship',
    sector: 'Textile & Garment Retail',
    district: 'Colombo',
    province: 'Western Province',
    local_authority: 'Colombo Municipal Council',
    divisional_secretariat: 'Colombo Divisional Secretariat',
    grama_niladhari: 'Kollupitiya (GN Division 504)',
    address: 'No. 88, Dharmapala Mawatha, Colombo 03',
    activities: ['Ready-made garment retail', 'Custom tailoring', 'Online fashion orders'],
    products_services: ['Casual Wear', 'Office Trousers', 'Dresses & Sarees', 'Bespoke Tailoring'],
    employee_count: 3,
    revenue: 3500000,
    initial_capital: 1200000,
    owner_name: 'Anoma Senanayake',
    owner_nic: '198965401234',
    phone: '+94 71 987 6543',
    email: 'anoma.threads@fashion.lk',
    residence_address: 'No. 24, Station Road, Dehiwala',
    commencement_date: '2026-11-15',
  },
  salon: {
    business_name: 'GLAMOUR & GLOW UNISEX SALON',
    legal_form: 'partnership',
    sector: 'Personal Care & Beauty Services',
    district: 'Colombo',
    province: 'Western Province',
    local_authority: 'Kotte Municipal Council',
    divisional_secretariat: 'Sri Jayawardenepura Kotte DS',
    grama_niladhari: 'Rajagiriya North (GN Division 518)',
    address: 'No. 112, Kotte Road, Rajagiriya',
    activities: ['Hair cutting and styling', 'Cosmetic chemical treatments', 'Skin care & bridal dressing'],
    products_services: ['Hair Styling', 'Facials & Skin Care', 'Bridal Dressing Packages', 'Nail Art'],
    employee_count: 4,
    revenue: 3800000,
    initial_capital: 1800000,
    owner_name: 'Kavindi Perera & Partners',
    owner_nic: '199587402198',
    phone: '+94 77 456 7890',
    email: 'kavindi.glamour@gmail.com',
    residence_address: 'No. 78, Nawala Road, Rajagiriya',
    commencement_date: '2026-12-01',
  },
  vehicle: {
    business_name: 'LANKA AUTO GEAR & REPAIRS',
    legal_form: 'sole_proprietorship',
    sector: 'Vehicle Parts & Repair Workshop',
    district: 'Gampaha',
    province: 'Western Province',
    local_authority: 'Gampaha Municipal Council',
    divisional_secretariat: 'Gampaha Divisional Secretariat',
    grama_niladhari: 'Yakkala South (GN Division 204)',
    address: 'No. 15, Kandy Road, Yakkala, Gampaha',
    activities: ['Auto mechanical repair', 'Spare parts retail', 'Spent lubricant & battery handling'],
    products_services: ['Brake Pads & Belts', 'Motor Lubricants', 'Engine Diagnostics', 'Battery Replacements'],
    employee_count: 6,
    revenue: 5500000,
    initial_capital: 2500000,
    owner_name: 'Sunil Weerasinghe',
    owner_nic: '198212304567',
    phone: '+94 70 333 4455',
    email: 'sunil.autogear@sme.lk',
    residence_address: 'No. 5, Temple Road, Yakkala',
    commencement_date: '2026-11-10',
  },
};

export const BusinessRegistrationView: React.FC = () => {
  const [formData, setFormData] = useState<BrFormData>(SAMPLE_PRESETS.bakery);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [activeRoadmapStage, setActiveRoadmapStage] = useState<number>(3);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    doc_nic: true,
    doc_gn: true,
    doc_deed: true,
    doc_rates: false,
    doc_form1: true,
  });

  const toggleChecklist = (key: string) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const checklistScore = Math.round(
    (Object.values(checklist).filter(Boolean).length / Object.keys(checklist).length) * 100
  );

  const handleDownloadPdf = async () => {
    setIsGenerating(true);
    setDownloadSuccess(false);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/component2/generate-br-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        // Fallback to sample BR form endpoint
        const fallbackRes = await fetch(
          `http://127.0.0.1:8000/api/v1/component2/sample-br-form/download?business_name=${encodeURIComponent(
            formData.business_name
          )}&legal_form=${encodeURIComponent(formData.legal_form)}&district=${encodeURIComponent(formData.district)}`
        );
        if (!fallbackRes.ok) throw new Error('Failed to generate application form');
        const blob = await fallbackRes.blob();
        triggerDownload(blob, `Official_BR_Form1_${formData.business_name.replace(/\s+/g, '_')}.pdf`);
      } else {
        const blob = await response.blob();
        triggerDownload(blob, `Official_BR_Form1_${formData.business_name.replace(/\s+/g, '_')}.pdf`);
      }

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    } catch (err) {
      console.error(err);
      alert('Could not download PDF from backend. Make sure backend is running at http://127.0.0.1:8000.');
    } finally {
      setIsGenerating(false);
    }
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-7 font-sans">
      {/* ----------------------------------------------------------------- */}
      {/* 1. HERO HEADER BANNER                                             */}
      {/* ----------------------------------------------------------------- */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#0d1627] to-indigo-950 p-6 sm:p-8 text-white shadow-xl border border-slate-800">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-teal-500/15 text-teal-300 border border-teal-500/30">
                <i className="fa-solid fa-landmark text-teal-400" />
                Western Province Business Registration Portal
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                <i className="fa-solid fa-file-signature text-blue-400" />
                Statute No. 04 of 1990
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-slate-950 text-base shadow-lg shadow-teal-500/20">
                <i className="fa-solid fa-file-contract" />
              </span>
              Business Registration &amp; Form 1 Generator
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Official institutional registration system for Sri Lankan SMEs in Western Province (Colombo, Gampaha, Kalutara).
              Pre-populates statutory <strong>Form 1 (Statement of Particulars)</strong> for Divisional Secretariat filing,
              guides your Grama Niladhari assessment, and calculates municipal fees.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 shrink-0">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Statutory Filing</span>
              <span className="text-lg font-extrabold text-white">Form 1 / Form A</span>
              <span className="block text-[10px] text-teal-400 font-medium mt-0.5">DS Direct Submission</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Est. Timeline</span>
              <span className="text-lg font-extrabold text-white">1 - 3 Days</span>
              <span className="block text-[10px] text-blue-400 font-medium mt-0.5">Upon GN Clearance</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md col-span-2 sm:col-span-1">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Statutory Fee</span>
              <span className="text-lg font-extrabold text-emerald-400">LKR 2,500</span>
              <span className="block text-[10px] text-emerald-300 font-medium mt-0.5">Government Duty</span>
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 2. LEGAL ENTITY SELECTOR & SECTOR PRESETS                         */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <i className="fa-solid fa-scale-balanced text-teal-600" />
              1. Choose Legal Structure &amp; Sector Preset
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select your intended commercial classification under Western Province legislation.
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 mr-1">Quick Presets:</span>
            {[
              { key: 'bakery', label: 'Bakery SME', icon: 'fa-bread-slice' },
              { key: 'clothing', label: 'Clothing Boutique', icon: 'fa-shirt' },
              { key: 'salon', label: 'Beauty Salon', icon: 'fa-scissors' },
              { key: 'vehicle', label: 'Auto Parts / Garage', icon: 'fa-wrench' },
            ].map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => setFormData(SAMPLE_PRESETS[preset.key])}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              >
                <i className={`fa-solid ${preset.icon} text-slate-500`} />
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 3 Entity Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Sole Proprietorship */}
          <div
            onClick={() => setFormData({ ...formData, legal_form: 'sole_proprietorship' })}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-2 relative ${
              formData.legal_form === 'sole_proprietorship'
                ? 'border-teal-500 bg-teal-50/40 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            }`}
          >
            {formData.legal_form === 'sole_proprietorship' && (
              <span className="absolute top-3 right-3 text-teal-600 font-bold text-xs">
                <i className="fa-solid fa-circle-check" /> Selected
              </span>
            )}
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded-md">
              Most Popular for SMEs
            </span>
            <h4 className="font-bold text-slate-900 text-sm">Sole Proprietorship (තනි පුද්ගල)</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Statutory Form 1 filed at the local Divisional Secretariat. Minimal compliance burden, direct owner authority.
            </p>
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-semibold text-slate-600">
              <span>Authority: Divisional Secretariat</span>
              <span className="text-teal-700 font-bold">~LKR 2,500</span>
            </div>
          </div>

          {/* Partnership */}
          <div
            onClick={() => setFormData({ ...formData, legal_form: 'partnership' })}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-2 relative ${
              formData.legal_form === 'partnership'
                ? 'border-teal-500 bg-teal-50/40 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            }`}
          >
            {formData.legal_form === 'partnership' && (
              <span className="absolute top-3 right-3 text-teal-600 font-bold text-xs">
                <i className="fa-solid fa-circle-check" /> Selected
              </span>
            )}
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-800 bg-blue-100/80 px-2 py-0.5 rounded-md">
              Co-Founder Model
            </span>
            <h4 className="font-bold text-slate-900 text-sm">Partnership (හවුල් ව්‍යාපාරය)</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Governed by WP Statute No. 04 of 1990 &amp; Partnership Ordinance 1890. 2 to 20 partners with shared capital.
            </p>
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-semibold text-slate-600">
              <span>Authority: Divisional Secretariat</span>
              <span className="text-blue-700 font-bold">~LKR 3,500</span>
            </div>
          </div>

          {/* Private Limited Company */}
          <div
            onClick={() => setFormData({ ...formData, legal_form: 'private_limited' })}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-2 relative ${
              formData.legal_form === 'private_limited'
                ? 'border-teal-500 bg-teal-50/40 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            }`}
          >
            {formData.legal_form === 'private_limited' && (
              <span className="absolute top-3 right-3 text-teal-600 font-bold text-xs">
                <i className="fa-solid fa-circle-check" /> Selected
              </span>
            )}
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-800 bg-purple-100/80 px-2 py-0.5 rounded-md">
              Corporate Entity
            </span>
            <h4 className="font-bold text-slate-900 text-sm">Private Limited (Pvt Ltd)</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Companies Act No. 07 of 2007 through eROC (Samagam Medura). Provides limited liability for shareholders.
            </p>
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-semibold text-slate-600">
              <span>Authority: Registrar of Companies</span>
              <span className="text-purple-700 font-bold">~LKR 18,000+</span>
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 3. 5-STAGE INSTITUTIONAL ROADMAP STEPPER                         */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <i className="fa-solid fa-route text-blue-600" />
              2. 5-Stage Institutional Registration Roadmap (පියවරෙන් පියවර මඟපෙන්වීම)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Chronological procedure required by Western Provincial Council and Municipal Authorities.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 self-start sm:self-auto">
            Click any stage to view execution details
          </span>
        </div>

        {/* 5 Stepper Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {[
            {
              step: 1,
              title: 'Name Search & Clearance',
              title_si: 'ව්‍යාපාර නාමය සෙවීම',
              auth: 'Divisional Secretariat',
              time: '1 Day',
              fee: 'LKR 250 - 500',
              icon: 'fa-magnifying-glass',
              desc: 'Verify that the proposed business name is not identical or deceptively similar to an existing entity registered in the Western Province.',
            },
            {
              step: 2,
              title: 'Grama Niladhari Report',
              title_si: 'ග්‍රාම නිලධාරී වාර්තාව',
              auth: 'Grama Niladhari Officer',
              time: '1 - 2 Days',
              fee: 'Free (Statutory Duty)',
              icon: 'fa-user-check',
              desc: 'Local GN inspects the physical business premises, confirms applicant residence, and issues the signed GN assessment report.',
            },
            {
              step: 3,
              title: 'Statutory Form 1 Filing',
              title_si: 'Form 1 අයදුම්පත භාරදීම',
              auth: 'Business Names Department',
              time: '1 - 3 Days',
              fee: 'LKR 2,500',
              icon: 'fa-file-signature',
              desc: 'Submit the completed Form 1 with certified NIC, deed/lease, and GN certificate to the Divisional Secretariat.',
            },
            {
              step: 4,
              title: 'Municipal Trade Tax',
              title_si: 'නගර සභා වෙළඳ බද්ද',
              auth: 'Municipal / Urban Council',
              time: '2 - 5 Days',
              fee: 'LKR 3,000 - 8,000',
              icon: 'fa-city',
              desc: 'Under Municipal Council By-laws, obtain the commercial trade tax clearance and public health inspection pass (for food/salons).',
            },
            {
              step: 5,
              title: 'RAMIS TIN & Labour EPF',
              title_si: 'TIN අංකය සහ සේවක අර්ථසාධක',
              auth: 'Inland Revenue & Labour Dept',
              time: '1 - 3 Days',
              fee: 'Free Registration',
              icon: 'fa-receipt',
              desc: 'Obtain mandatory RAMIS Taxpayer Identification Number (TIN) from IRD and register hired employees under EPF/ETF Act.',
            },
          ].map((stg) => {
            const isSelected = activeRoadmapStage === stg.step;
            return (
              <div
                key={stg.step}
                onClick={() => setActiveRoadmapStage(stg.step)}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/30'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span
                      className={`w-6 h-6 rounded-lg text-xs font-extrabold flex items-center justify-center ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {stg.step}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">{stg.time}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs leading-snug">{stg.title}</h4>
                  <p className="text-[10px] text-slate-500 font-medium">{stg.title_si}</p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 text-[10px] space-y-1">
                  <span className="text-slate-500 block truncate">📍 {stg.auth}</span>
                  <span className="text-blue-700 font-bold block">{stg.fee}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 4. INTERACTIVE FORM 1 AUTO-FILLER & GENERATION SECTION           */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Inputs (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 mb-1">
                Official Statutory Form 1
              </span>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <i className="fa-solid fa-pen-to-square text-emerald-600" />
                3. Statement of Particulars (Form 1) Particulars
              </h3>
              <p className="text-xs text-slate-500">
                Data entered below is mapped directly to the official Sri Lanka Business Registration PDF.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <i className={`fa-solid ${isGenerating ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`} />
              <span>{isGenerating ? 'Generating Official PDF...' : 'Download Form 1 (PDF)'}</span>
            </button>
          </div>

          {/* Success Banner */}
          {downloadSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
              <span className="flex items-center gap-2 font-semibold">
                <i className="fa-solid fa-circle-check text-emerald-600 text-sm" />
                Official Form 1 PDF has been successfully generated and downloaded to your computer!
              </span>
              <button
                type="button"
                onClick={() => setDownloadSuccess(false)}
                className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Input Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Business Name */}
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                Proposed Business Name (ව්‍යාපාරික නාමය)
              </label>
              <input
                type="text"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            {/* Target Divisional Secretariat */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Target Divisional Secretariat (ප්‍රාදේශීය ලේකම් කාර්යාලය)
              </label>
              <select
                value={formData.divisional_secretariat}
                onChange={(e) => setFormData({ ...formData, divisional_secretariat: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                <option value="Thimbirigasyaya Divisional Secretariat">Thimbirigasyaya DS (Colombo Central)</option>
                <option value="Colombo Divisional Secretariat">Colombo DS (Fort / Pettah)</option>
                <option value="Sri Jayawardenepura Kotte DS">Kotte DS (Rajagiriya / Nugegoda)</option>
                <option value="Kaduwela Divisional Secretariat">Kaduwela DS (Malabe / Battaramulla)</option>
                <option value="Dehiwala-Mount Lavinia DS">Dehiwala DS (Mount Lavinia)</option>
                <option value="Gampaha Divisional Secretariat">Gampaha DS</option>
                <option value="Negombo Divisional Secretariat">Negombo DS</option>
                <option value="Kalutara Divisional Secretariat">Kalutara DS</option>
              </select>
            </div>

            {/* Local Authority */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Local Municipal / Urban Council (පළාත් පාලන ආයතනය)
              </label>
              <input
                type="text"
                value={formData.local_authority}
                onChange={(e) => setFormData({ ...formData, local_authority: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            {/* Grama Niladhari Division */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Grama Niladhari Division (ග්‍රාම නිලධාරී වසම)
              </label>
              <input
                type="text"
                value={formData.grama_niladhari}
                onChange={(e) => setFormData({ ...formData, grama_niladhari: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            {/* Sector / Commercial Category */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Commercial Sector &amp; Activities
              </label>
              <input
                type="text"
                value={formData.sector}
                onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            {/* Physical Business Address */}
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                Principal Place of Business (ව්‍යාපාරය පවත්වාගෙන යන ස්ථානය)
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            {/* Proprietor Full Name */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Applicant / Owner Full Name (අයදුම්කරුගේ සම්පූර්ණ නම)
              </label>
              <input
                type="text"
                value={formData.owner_name}
                onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            {/* NIC Number */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                National Identity Card (NIC) (ජාතික හැඳුනුම්පත් අංකය)
              </label>
              <input
                type="text"
                value={formData.owner_nic}
                onChange={(e) => setFormData({ ...formData, owner_nic: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            {/* Phone & Email */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Contact Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            {/* Residence Address */}
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                Permanent Residential Address (ස්ථිර පදිංචි ලිපිනය)
              </label>
              <input
                type="text"
                value={formData.residence_address}
                onChange={(e) => setFormData({ ...formData, residence_address: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            {/* Commencement Date & Initial Capital */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Commencement Date</label>
              <input
                type="date"
                value={formData.commencement_date}
                onChange={(e) => setFormData({ ...formData, commencement_date: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Initial Capital (LKR)</label>
              <input
                type="number"
                value={formData.initial_capital}
                onChange={(e) => setFormData({ ...formData, initial_capital: parseFloat(e.target.value) || 0 })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Right Sidebar: Document Checklist & Summary (1 Col) */}
        <div className="space-y-5">
          {/* Document Checklist Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <i className="fa-solid fa-list-check text-teal-600" />
                Required Documents Checklist
              </h4>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                {checklistScore}% Ready
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${checklistScore}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Check off documents you have prepared to bring to the Divisional Secretariat:
            </p>

            <div className="space-y-2 text-xs">
              {[
                {
                  key: 'doc_nic',
                  label: 'Certified NIC / Passport Copy',
                  desc: 'Photocopy certified by JP or Grama Niladhari',
                },
                {
                  key: 'doc_gn',
                  label: 'Grama Niladhari Report',
                  desc: 'Original signed residence & business assessment report',
                },
                {
                  key: 'doc_deed',
                  label: 'Deed or Notarized Lease Agreement',
                  desc: 'Proof of premises rights or landlord consent letter',
                },
                {
                  key: 'doc_rates',
                  label: 'Municipal Rates Tax Receipt',
                  desc: 'Assessment tax receipt from Municipal/Urban Council',
                },
                {
                  key: 'doc_form1',
                  label: 'Printed & Signed Form 1',
                  desc: 'Downloaded official statutory application form',
                },
              ].map((doc) => {
                const isChecked = checklist[doc.key];
                return (
                  <label
                    key={doc.key}
                    onClick={() => toggleChecklist(doc.key)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isChecked ? 'bg-teal-50/60 border-teal-200' : 'bg-slate-50/50 border-slate-200/80 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                    />
                    <div>
                      <span className={`block font-bold text-xs ${isChecked ? 'text-teal-950' : 'text-slate-700'}`}>
                        {doc.label}
                      </span>
                      <span className="text-[10px] text-slate-500 leading-tight block">{doc.desc}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Submission Guidance Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-5 shadow-xs border border-slate-700 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center text-sm">
                <i className="fa-solid fa-building-columns" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Submission Office</h4>
                <p className="text-[10px] text-teal-300 font-mono">Business Names Branch</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Submit your printed Form 1 package in person to the <strong>Business Names Registrar</strong> at{' '}
              <span className="text-white font-semibold">{formData.divisional_secretariat}</span>.
            </p>

            <div className="pt-2 border-t border-slate-700/80 space-y-1 text-[11px] text-slate-300">
              <div className="flex items-center justify-between">
                <span>Working Hours:</span>
                <span className="text-white font-semibold">Mon - Fri (8:30 AM - 4:15 PM)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Certificate Processing:</span>
                <span className="text-teal-400 font-bold">1 - 3 Business Days</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessRegistrationView;
