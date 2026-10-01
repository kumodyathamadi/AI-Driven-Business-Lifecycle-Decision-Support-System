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
