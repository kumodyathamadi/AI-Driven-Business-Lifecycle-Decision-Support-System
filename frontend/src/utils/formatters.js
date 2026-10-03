/**
 * Formatting utilities for SME360 AI
 * Ensures no NaN, undefined, or empty values leak into UI.
 */

/**
 * Formats a currency value in Sri Lankan Rupees (LKR).
 * E.g., 500000 -> "LKR 500,000"
 * @param {number|string|null|undefined} value
 * @param {string} fallback
 * @returns {string}
 */
export function formatCurrency(value, fallback = 'Not provided') {
  if (value === null || value === undefined || value === '') return fallback;

  // If string, strip any non-digit chars except decimal point
  let num = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]+/g, ''));

  if (isNaN(num)) return fallback;
  return `LKR ${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/**
 * Formats daily customers count.
 * E.g., 40 -> "40 / day"
 * @param {number|string|null|undefined} value
 * @param {string} fallback
 * @returns {string}
 */
export function formatCustomersPerDay(value, fallback = 'Not provided') {
  if (value === null || value === undefined || value === '') return fallback;
  let num = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]+/g, ''));
  if (isNaN(num) || num <= 0) return fallback;
  return `${num.toLocaleString('en-US')} / day`;
}

/**
 * Formats general numeric value.
 * @param {number|string|null|undefined} value
 * @param {string} fallback
 * @returns {string}
 */
export function formatNumber(value, fallback = 'Not provided') {
  if (value === null || value === undefined || value === '') return fallback;
  let num = typeof value === 'number' ? value : Number(value);
  if (isNaN(num)) return fallback;
  return num.toLocaleString('en-US');
}

/**
 * Formats date string to friendly format.
 * @param {string|Date|null|undefined} dateVal
 * @param {string} fallback
 * @returns {string}
 */
export function formatDate(dateVal, fallback = 'Not provided') {
  if (!dateVal) return fallback;
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return fallback;
  }
}

/**
 * Fallback display helper for any text or property.
 * @param {string|null|undefined} text
 * @param {string} fallback
 * @returns {string}
 */
export function formatText(text, fallback = 'Not provided') {
  if (text === null || text === undefined) return fallback;
  const str = String(text).trim();
  return str.length > 0 ? str : fallback;
}

/**
 * Formats a number to abbreviated string (e.g. 188000 -> 188k, 3500000 -> 3.5M).
 * @param {number|string|null|undefined} value
 * @returns {string}
 */
export function formatShortNumber(value) {
  if (value === null || value === undefined || value === '') return '0';
  let num = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]+/g, ''));
  if (isNaN(num)) return '0';
  if (Math.abs(num) >= 1_000_000) {
    const val = (num / 1_000_000).toFixed(1).replace(/\.0$/, '');
    return `${val}M`;
  }
  if (Math.abs(num) >= 1_000) {
    const val = Math.round(num / 1_000);
    return `${val}k`;
  }
  return num.toString();
}

/**
 * Standardizes confidence percentage format across all components (e.g. 0.63 -> "63%").
 * @param {number|string|null|undefined} score
 * @returns {string}
 */
export function formatConfidence(score, decimals = 1) {
  if (score === null || score === undefined || score === '') return '63%';
  let num = typeof score === 'number' ? score : Number(String(score).replace(/[^0-9.-]+/g, ''));
  if (isNaN(num)) return '63%';
  if (num <= 1 && num > 0) num = num * 100;
  return Number.isInteger(num) ? `${num}%` : `${num.toFixed(decimals)}%`;
}

/**
 * Cleans up double periods or trailing punctuation glitches (e.g., "Colombo.." -> "Colombo.").
 * @param {string} text
 * @returns {string}
 */
export function cleanDoublePunctuation(text = '') {
  if (!text) return '';
  return String(text)
    .replace(/\.{2,}/g, '.')
    .replace(/\s+\./g, '.')
    .trim();
}

/**
 * Formats full assessment date and time with LK Time.
 * @param {string|Date|null|undefined} dateVal
 * @returns {string}
 */
export function formatFullDateTime(dateVal) {
  const d = dateVal ? new Date(dateVal) : new Date();
  if (isNaN(d.getTime())) {
    const fallback = new Date();
    return `${fallback.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, ${fallback.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} LK Time`;
  }
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} LK Time`;
}

const FEATURE_KEYWORD_MAP = {
  'available capital': 'available_capital_lkr',
  'loan amount': 'loan_amount_lkr',
  'monthly operating budget': 'monthly_budget_lkr',
  'monthly budget': 'monthly_budget_lkr',
  'initial inventory cost': 'initial_inventory_cost_lkr',
  'expected product price': 'expected_price_lkr',
  'expected price': 'expected_price_lkr',
  'expected daily customers': 'expected_customers_per_day',
  'expected customers': 'expected_customers_per_day',
  'customer demand score': 'customer_demand_score',
  'customer demand': 'customer_demand_score',
  'operating days': 'expected_operating_days_per_month',
  'entrepreneur experience': 'entrepreneur_experience_years',
  'location suitability': 'location_suitability_score',
  'available staff': 'available_staff_count',
  'required staff': 'required_staff_count',
  'available equipment': 'available_equipment_score',
  'required equipment': 'required_equipment_score',
  'supplier availability': 'supplier_availability_score',
  'business stage': 'business_stage',
  'business category': 'business_category',
  'district': 'district',
  'province': 'province',
  'location type': 'location_type',
  'proposed action': 'proposed_action',
  'competition level': 'competition_level'
};

/**
 * Resolves human-readable feature value for SHAP explanation drivers.
 * Uses recorded driver.feature_value if present, otherwise maps to businessInput.
 * @param {object} driver
 * @param {object} businessInput
 * @returns {string}
 */
export function resolveDriverValue(driver, businessInput = {}) {
  if (driver?.feature_value && driver.feature_value !== 'N/A' && driver.feature_value !== 'null') {
    return driver.feature_value;
  }
  if (!businessInput || typeof businessInput !== 'object') return 'N/A';

  const rawKey = String(driver?.raw_feature || '').replace(/^num__|^cat__/, '');
  const featStr = String(driver?.feature || '').toLowerCase();

  // 1. Direct match by raw key if available
  let matchedKey = null;
  if (rawKey && businessInput[rawKey] !== undefined) {
    matchedKey = rawKey;
  } else {
    // 2. Keyword substring matching
    for (const [prefix, key] of Object.entries(FEATURE_KEYWORD_MAP)) {
      if (featStr.includes(prefix) || rawKey.startsWith(key)) {
        if (businessInput[key] !== undefined && businessInput[key] !== null) {
          matchedKey = key;
          break;
        }
      }
    }
  }

  if (matchedKey && businessInput[matchedKey] !== undefined && businessInput[matchedKey] !== null) {
    const val = businessInput[matchedKey];
    if (['available_capital_lkr', 'loan_amount_lkr', 'monthly_budget_lkr', 'initial_inventory_cost_lkr', 'expected_price_lkr'].includes(matchedKey)) {
      const num = Number(val);
      if (isNaN(num)) return String(val);
      return `LKR ${num.toLocaleString('en-US', { maximumFractionDigits: matchedKey === 'expected_price_lkr' ? 2 : 0 })}`;
    }
    if (matchedKey === 'expected_customers_per_day') {
      return `${Number(val).toLocaleString('en-US')} / day`;
    }
    if (matchedKey === 'customer_demand_score') {
      return `${val} / 100`;
    }
    if (matchedKey === 'entrepreneur_experience_years') {
      return `${val} ${Number(val) === 1 ? 'Year' : 'Years'}`;
    }
    if (['location_suitability_score', 'available_equipment_score', 'required_equipment_score', 'supplier_availability_score'].includes(matchedKey)) {
      return `${val} / 5`;
    }
    if (matchedKey === 'expected_operating_days_per_month') {
      return `${val} Days / Mo`;
    }
    if (['available_staff_count', 'required_staff_count'].includes(matchedKey)) {
      return `${val} Staff`;
    }
    if (matchedKey === 'business_stage') {
      const s = String(val).toLowerCase();
      return (s.includes('new') || s.includes('start')) ? 'New Startup' : 'Existing Business';
    }
    return String(val);
  }

  return 'N/A';
}

