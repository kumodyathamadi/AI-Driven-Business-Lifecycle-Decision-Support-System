/**
 * SME360 AI - Feature-to-Label Mapping & Dynamic Copy Generator
 * 
 * Maps raw ML / SHAP features to human-readable business titles and stage/category-aware explanations.
 * Eliminates raw ML feature leakage (e.g. "Available Capital (LKR)", "Business Stage Existing").
 */

// Category Classification: Product vs Service
const PRODUCT_CATEGORIES = [
  'clothing',
  'garment',
  'textile',
  'grocery',
  'mini-mart',
  'supermarket',
  'bakery',
  'food',
  'agriculture',
  'agribusiness',
  'manufacturing',
  'handloom',
  'retail',
  'hardware',
  'pharmacy',
  'spices',
  'wholesale'
];

/**
 * Determines whether a business category is primarily goods/products vs services.
 * @param {string} category 
 * @returns {boolean}
 */
export function isProductBusiness(category = '') {
  const norm = String(category).toLowerCase();
  return PRODUCT_CATEGORIES.some(cat => norm.includes(cat));
}

/**
 * Returns the appropriate gross margin wording ("product gross margins" vs "service gross margins")
 * @param {string} category 
 * @returns {string}
 */
export function getMarginTerm(category = '') {
  return isProductBusiness(category) ? 'product gross margin' : 'service gross margin';
}

/**
 * Normalizes raw feature string to clean key.
 * e.g., "Available Capital (LKR)" -> "available_capital_lkr"
 * "cat__district_Colombo" -> "district"
 * "Business Stage = 'Existing'" -> "business_stage"
 */
export function normalizeFeatureKey(featureStr = '') {
  if (!featureStr) return 'general';
  const lower = String(featureStr).toLowerCase();

  if (lower.includes('available_capital') || lower.includes('capital')) return 'available_capital_lkr';
  if (lower.includes('loan_amount') || lower.includes('loan')) return 'loan_amount_lkr';
  if (lower.includes('monthly_budget') || lower.includes('budget')) return 'monthly_budget_lkr';
  if (lower.includes('inventory') || lower.includes('stock')) return 'initial_inventory_cost_lkr';
  if (lower.includes('price')) return 'expected_price_lkr';
  if (lower.includes('customer') || lower.includes('demand')) return 'expected_customers_per_day';
  if (lower.includes('experience')) return 'entrepreneur_experience_years';
  if (lower.includes('location') || lower.includes('district')) return 'district';
  if (lower.includes('staff')) return 'available_staff_count';
  if (lower.includes('equipment')) return 'available_equipment_score';
  if (lower.includes('supplier')) return 'supplier_availability_score';
  if (lower.includes('stage') || lower.includes('startup') || lower.includes('existing')) return 'business_stage';
  if (lower.includes('competition')) return 'competition_level';
  if (lower.includes('category') || lower.includes('sector')) return 'business_category';
  if (lower.includes('action') || lower.includes('proposed')) return 'proposed_action';

  return lower.replace(/[^a-z0-9_]/g, '_');
}

/**
 * Human-readable titles and tailored copy for STRENGTHS (Positive Drivers).
 */
export const STRENGTH_DEFINITIONS = {
  available_capital_lkr: {
    title: 'Adequate Startup Capitalization',
    getDesc: ({ capitalFormatted }) =>
      `Available capital base (${capitalFormatted}) provides comfortable upfront runway for initial setup and buffer reserves.`
  },
  entrepreneur_experience_years: {
    getTitle: ({ isNewStartup }) =>
      isNewStartup ? 'Founding Readiness & Skillset' : 'Proven Operational Track Record',
    getDesc: ({ isNewStartup, experienceYears }) =>
      isNewStartup
        ? 'Founder background and industry readiness reduce early operational friction and staff onboarding time.'
        : `Your ${experienceYears || 2}+ years of operating history provides strong management efficiency and customer rapport.`
  },
  expected_customers_per_day: {
    title: 'Healthy Local Footfall Demand',
    getDesc: ({ district, expectedCust }) =>
      `Expected customer target (${expectedCust}/day) aligns well with localized demographic demand density in ${district}.`
  },
  expected_price_lkr: {
    getTitle: ({ category }) =>
      isProductBusiness(category) ? 'Strong Product Margin Unit Economics' : 'High Service Margin Structure',
    getDesc: ({ category, priceFormatted }) => {
      const margin = getMarginTerm(category);
      return `Target pricing of ${priceFormatted} generates sustainable ${margin}s to reliably cover fixed operating overheads.`;
    }
  },
  district: {
    title: 'Commercial Hub Location Advantage',
    getDesc: ({ district }) =>
      `High consumer purchasing power and commercial footfall concentration in ${district} support steady revenue generation.`
  },
  monthly_budget_lkr: {
    title: 'Disciplined Operating Cost Structure',
    getDesc: ({ budgetFormatted }) =>
      `Balanced monthly operating plan (${budgetFormatted}) keeps breakeven requirements within reachable daily customer volume.`
  },
  available_staff_count: {
    title: 'Lean Staffing Architecture',
    getDesc: () =>
      'Streamlined team structure controls fixed payroll commitments while maintaining consistent service delivery capacity.'
  },
  available_equipment_score: {
    title: 'Essential Tooling Readiness',
    getDesc: () =>
      'Access to core operational tooling and fixtures minimizes early debt-financed capital expenditure.'
  },
  supplier_availability_score: {
    title: 'Reliable Regional Supply Access',
    getDesc: ({ district }) =>
      `Established regional wholesale channels in ${district} mitigate procurement bottlenecks and inventory holding costs.`
  },
  business_stage: {
    getTitle: ({ isNewStartup }) =>
      isNewStartup ? 'Agile Market Entry Advantage' : 'Established Customer Base',
    getDesc: ({ isNewStartup }) =>
      isNewStartup
        ? 'Greenfield startup status enables modern, digital-first operational flexibility without legacy overhead.'
        : 'Existing operational footprint and repeat customer return loops significantly lower customer acquisition costs.'
  },
  competition_level: {
    title: 'Defensible Market Differentiation',
    getDesc: () =>
      'Unique service positioning and value propositions allow effective capture of local market share.'
  },
  loan_amount_lkr: {
    title: 'Prudent Leverage & Debt Capacity',
    getDesc: () =>
      'Balanced debt-to-equity ratio ensures monthly debt-service commitments remain manageable during early ramp-up.'
  },
  business_category: {
    title: 'Sector Growth & Demand Alignment',
    getDesc: ({ category }) =>
      `Strong commercial growth velocity in the ${category} sector supports resilient transaction volume.`
  },
  proposed_action: {
    title: 'Focused Operational Rollout Plan',
    getDesc: ({ isNewStartup }) =>
      isNewStartup
        ? 'Well-scoped greenfield launch milestones minimize capital waste and accelerate time-to-first-revenue.'
        : 'Targeted expansion strategy builds efficiently on existing operational strengths and customer relationships.'
  }
};

/**
 * Human-readable titles and tailored copy for RISKS (Negative Drivers / Constraints).
 */
export const RISK_DEFINITIONS = {
  available_capital_lkr: {
    title: 'Tight Month 1–4 Cash Runway',
    getDesc: () =>
      'Initial working capital requires vigilant cash conservation before positive repeat cashflow cycles compound.'
  },
  monthly_budget_lkr: {
    title: 'Fixed Overhead & Operating Exposure',
    getDesc: ({ budgetFormatted }) =>
      `Monthly recurring commitments of ${budgetFormatted} necessitate strict cost controls against revenue fluctuations.`
  },
  loan_amount_lkr: {
    title: 'Debt-Service Repayment Pressure',
    getDesc: () =>
      'Debt-financing amortizations increase monthly breakeven hurdles during early incubation periods.'
  },
  competition_level: {
    title: 'Localized Competitive Density',
    getDesc: ({ district }) =>
      `Established competition within ${district} commercial hub necessitates proactive positioning and promotional outreach.`
  },
  initial_inventory_cost_lkr: {
    title: 'High Initial Inventory Capital Outlay',
    getDesc: () =>
      'Upfront stock purchasing absorbs significant working capital before retail turnover velocity accelerates.'
  },
  entrepreneur_experience_years: {
    getTitle: ({ isNewStartup }) =>
      isNewStartup ? 'First-Time Venture Execution Risk' : 'Operational Scaling Bottlenecks',
    getDesc: ({ isNewStartup }) =>
      isNewStartup
        ? 'First-time operational launch requires disciplined standardized operating protocols to avoid costly mistakes.'
        : 'Scaling existing operational capacity strains management bandwidth and oversight routines.'
  },
  supplier_availability_score: {
    title: 'Import & Consumable Cost Fluctuation',
    getDesc: () =>
      'Higher utility tariffs and wholesale consumable price volatility expose baseline operational margins to supply shocks.'
  },
  available_staff_count: {
    title: 'Staffing Capacity & Training Overhead',
    getDesc: () =>
      'Securing skilled operational staff in local markets requires structured training and competitive wage retention.'
  },
  expected_price_lkr: {
    title: 'Price Elasticity & Consumer Sensitivity',
    getDesc: () =>
      'Local consumer sensitivity to price points could impact repeat transaction frequency if value perception lags.'
  },
  expected_customers_per_day: {
    title: 'Customer Acquisition Ramp Uncertainty',
    getDesc: ({ district }) =>
      `Achieving baseline daily customer volume in ${district} depends on sustained local marketing momentum.`
  },
  business_stage: {
    getTitle: ({ isNewStartup }) =>
      isNewStartup ? 'Unproven Local Customer Loops' : 'Market Saturation & Retention Pressure',
    getDesc: ({ isNewStartup }) =>
      isNewStartup
        ? 'New brand presence requires upfront marketing investment to build consumer trust and awareness.'
        : 'Mature local markets require continuous differentiation to defend existing market share against new entrants.'
  },
  available_equipment_score: {
    title: 'Tooling & Fixture Setup Overhead',
    getDesc: () =>
      'Initial requirements for specialized operational tooling necessitate dedicated upfront procurement or leasing allocation.'
  },
  business_category: {
    title: 'Sector Cyclicality & Seasonality',
    getDesc: ({ category }) =>
      `Operating in the ${category} sector requires active working capital management to buffer against seasonal demand variations.`
  },
  proposed_action: {
    title: 'Operational Rollout Execution Risk',
    getDesc: () =>
      'Launch milestones require structured timeline oversight to avoid vendor delivery delays and inventory holding bottlenecks.'
  }
};

/**
 * Resolves a human-readable title and matching description for a SHAP feature.
 * 
 * @param {Object} params
 * @param {string} params.rawFeature - The raw feature name from SHAP
 * @param {boolean} params.isPositive - True if strength, false if risk
 * @param {Object} params.context - Business context { stage, category, district, capital, budget, customers, price, experience, shapValue }
 * @returns {{ title: string, description: string }}
 */
export function resolveFeatureInsight({ rawFeature, isPositive = true, context = {} }) {
  const normKey = normalizeFeatureKey(rawFeature);
  const defs = isPositive ? STRENGTH_DEFINITIONS : RISK_DEFINITIONS;
  const def = defs[normKey] || defs.general;

  const isNewStartup = String(context.stage || '').toLowerCase().includes('new') ||
                       String(context.stage || '').toLowerCase().includes('start');

  const contextData = {
    ...context,
    isNewStartup,
    category: context.category || 'SME Business',
    district: context.district || 'Colombo',
    capitalFormatted: context.capitalFormatted || 'adequate capital',
    budgetFormatted: context.budgetFormatted || 'planned budget',
    priceFormatted: context.priceFormatted || 'standard pricing',
    expectedCust: context.expectedCust || 20,
    experienceYears: context.experienceYears || 0
  };

  if (!def) {
    // Fallback if key not found
    const defaultTitle = isPositive ? 'Operational Competitive Advantage' : 'Operational Risk Factor';
    const defaultDesc = isPositive
      ? `Favorable operational indicators support business viability in ${contextData.district}.`
      : `Operational variable requires proactive monitoring to safeguard cashflow in ${contextData.district}.`;
    return { title: defaultTitle, description: defaultDesc };
  }

  const title = typeof def.getTitle === 'function' ? def.getTitle(contextData) : def.title;
  const description = typeof def.getDesc === 'function' ? def.getDesc(contextData) : def.description;

  return { title, description };
}
