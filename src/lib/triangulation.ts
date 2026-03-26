export interface TriangulationResult {
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  inverseRate: number;
  triangulated: boolean;
  usdToBase: number;
  usdToQuote: number;
  precision: number;
}

export interface ParsedCrossPair {
  base: string;
  quote: string;
}

const DECIMAL_PRECISION = 8;

/**
 * Triangulate rate from base to quote currency using USD as intermediary
 *
 * @param usdToBase - Rate from USD to base currency (e.g., USD -> EUR = 0.92)
 * @param usdToQuote - Rate from USD to quote currency (e.g., USD -> JPY = 149.50)
 * @returns Triangulated rate from base to quote
 */
export function triangulateRate(
  usdToBase: number,
  usdToQuote: number
): number {
  // Validate that inputs are finite numbers
  if (!Number.isFinite(usdToBase) || !Number.isFinite(usdToQuote)) {
    throw new Error('Rates must be finite numbers');
  }

  if (usdToBase <= 0 || usdToQuote <= 0) {
    throw new Error('Rates must be positive numbers');
  }

  // Rate(Base -> Quote) = Rate(USD -> Quote) / Rate(USD -> Base)
  const rate = usdToQuote / usdToBase;

  return roundToPrecision(rate, DECIMAL_PRECISION);
}

/**
 * Calculate full triangulation result with metadata
 */
export function calculateTriangulation(
  baseCurrency: string,
  quoteCurrency: string,
  usdToBase: number,
  usdToQuote: number
): TriangulationResult {
  const rate = triangulateRate(usdToBase, usdToQuote);
  const inverseRate = roundToPrecision(1 / rate, DECIMAL_PRECISION);

  return {
    baseCurrency,
    quoteCurrency,
    rate,
    inverseRate,
    triangulated: true,
    usdToBase,
    usdToQuote,
    precision: DECIMAL_PRECISION
  };
}

/**
 * Round number to specified decimal places
 */
function roundToPrecision(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Validate if triangulation is possible for given pair
 */
export function canTriangulate(
  baseCurrency: string,
  quoteCurrency: string,
  supportedSymbols: Set<string>
): { valid: boolean; error?: string } {
  if (baseCurrency === quoteCurrency) {
    return { valid: false, error: 'Base and quote currency cannot be the same' };
  }

  if (!supportedSymbols.has(baseCurrency)) {
    return { valid: false, error: `Unsupported base currency: ${baseCurrency}` };
  }

  if (!supportedSymbols.has(quoteCurrency)) {
    return { valid: false, error: `Unsupported quote currency: ${quoteCurrency}` };
  }

  return { valid: true };
}

/**
 * Parse a cross-rate symbol into base and quote currencies
 * Supports: EUR/JPY, EURJPY, EUR-JPY
 */
export function parseCrossPair(symbol: string): ParsedCrossPair | null {
  const normalized = symbol.toUpperCase().trim();

  // Handle slash format: EUR/JPY
  if (normalized.includes('/')) {
    const [base, quote] = normalized.split('/');
    if (base && quote && base.length >= 3 && quote.length >= 3) {
      return { base: base.trim(), quote: quote.trim() };
    }
  }

  // Handle dash format: EUR-JPY
  if (normalized.includes('-')) {
    const [base, quote] = normalized.split('-');
    if (base && quote && base.length >= 3 && quote.length >= 3) {
      return { base: base.trim(), quote: quote.trim() };
    }
  }

  // Handle concatenated format: EURJPY (6 chars = 3+3)
  // Accept USD pairs for consistency with slash/dash formats
  if (normalized.length === 6 && !normalized.includes('/') && !normalized.includes('-')) {
    const base = normalized.substring(0, 3);
    const quote = normalized.substring(3, 6);

    return { base, quote };
  }

  return null;
}

/**
 * Check if symbol is a cross-pair request
 */
export function isCrossPair(symbol: string): boolean {
  return parseCrossPair(symbol) !== null;
}
