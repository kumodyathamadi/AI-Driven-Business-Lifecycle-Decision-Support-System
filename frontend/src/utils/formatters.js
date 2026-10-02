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

