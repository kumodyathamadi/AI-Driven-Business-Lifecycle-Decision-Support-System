/**
 * Strategy Helper Utilities
 * Provides user-friendly names and clear generation explanations
 * across both new startup and existing business growth strategies.
 */

/**
 * Returns a simple, user-friendly strategy title in clear everyday language,
 * removing jargon like "Lean Bootstrapped" and eliminating parenthesized business names.
 */
export function getFriendlyStrategyName(rawName = '', strategyId = '') {
  if (!rawName && !strategyId) return 'Recommended Strategy';

  const clean = String(rawName).trim();
  const id = String(strategyId || '').toUpperCase();

  // 1. Startup strategy mappings
  if (clean.includes('Lean Bootstrapped') || id === 'STRAT_01' && clean.toLowerCase().includes('lean')) {
    return 'Low-Cost Essential Start';
  }
  if (clean.includes('Customer Acquisition & Local Promotion') || (id === 'STRAT_02' && clean.toLowerCase().includes('customer'))) {
    return 'Active Marketing & Opening Promotion';
  }
  if (clean.includes('Storefront + Home Delivery') || clean.includes('Storefront + Delivery')) {
    return 'Physical Shop + Local Home Delivery';
  }
  if (clean.includes('Specialty & High-Quality Focus') || clean.includes('Specialty Focus')) {
    return 'Specialty & High-Quality Focus';
  }

  // 2. Existing business growth mappings
  if (clean.includes('Phased Modular Expansion')) {
    return 'Step-by-Step Low-Risk Expansion';
  }
  if (clean.includes('Capacity & Scale Expansion')) {
    return 'Full-Scale Capacity Growth';
  }
  if (clean.includes('Omnichannel Delivery & Digital Expansion') || clean.includes('Omnichannel')) {
    return 'Online & Home Delivery Expansion';
  }
  if (clean.includes('Product / Service-Line Extension') || clean.includes('Product Line Extension')) {
    return 'New High-Margin Product Lines';
  }

  // 3. Strip any remaining trailing parenthesis like "(Daily Bake House)"
  const stripped = clean.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (stripped) return stripped;

  return clean || 'Strategic Option';
}

/**
 * Returns a short, user-friendly explanation of how the strategy was developed
 * by the AI system (based on capital allocation, customer targets, and business challenges).
 */
export function getHowStrategyWasDeveloped(strategy = {}) {
  if (strategy.how_generated && typeof strategy.how_generated === 'string' && strategy.how_generated.trim().length > 0) {
    return strategy.how_generated;
  }

  const capital = Number(strategy.estimated_capital_required_lkr || 0);
  const customers = Number(strategy.target_daily_customers || 0);
  const name = String(strategy.strategy_name || '').toLowerCase();
  const id = String(strategy.strategy_id || '').toUpperCase();

  // Low-Cost Essential / Lean Bootstrapped
  if (id === 'STRAT_01' || name.includes('lean') || name.includes('low-cost') || name.includes('essential')) {
    return capital > 0
      ? `Generated to protect cash reserves and minimize startup debt by reserving capital at LKR ${capital.toLocaleString()} and keeping fixed overhead low, protecting your runway against early operating challenges.`
      : `Generated to protect cash reserves and minimize startup debt by focusing only on essential equipment and low initial overhead.`;
  }

  // Active Marketing / Promotion
  if (id === 'STRAT_02' || name.includes('promotion') || name.includes('marketing') || name.includes('customer acquisition')) {
    return customers > 0
      ? `Generated to stand out against nearby competitors by investing in opening discounts and local flyers to rapidly build momentum and reach ${customers} daily customers.`
      : `Generated to overcome local competition by investing in promotional discounts, flyers, and neighborhood awareness to quickly capture customer footfall.`;
  }

  // Physical Shop + Home Delivery
  if (id === 'STRAT_03' || name.includes('delivery') || name.includes('storefront') || name.includes('omnichannel')) {
    return `Generated to increase daily orders without the high cost of opening a second shop, by pairing your physical storefront with direct phone and WhatsApp delivery to nearby households.`;
  }

  // Specialty & High-Quality / High-Margin
  if (id === 'STRAT_04' || name.includes('specialty') || name.includes('high-margin') || name.includes('quality')) {
    return `Generated to avoid price competition with large chains by focusing on premium, handcrafted products with higher profit margins per customer visit.`;
  }

  // Default fallback
  return `Developed by analyzing your available capital, daily customer targets, and local competition to calculate optimal resource allocations and risk protections.`;
}
