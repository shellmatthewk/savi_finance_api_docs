/**
 * Metals API provider for commodity prices
 * Provides real-time and historical metal rates from multiple sources
 */

import { withIngestionRetry } from '@/lib/retry';

// ===== Configuration =====
const METALS_API_KEY = process.env.METALS_API_KEY || '';
const METALS_API_URL = 'https://api.metals.live/v1/spot/';

const GOLDAPI_KEY = process.env.GOLDAPI_KEY || '';
const GOLDAPI_URL = 'https://data-api.goldapi.io/';

const SUPPORTED_METALS = ['XAU', 'XAG', 'XPT', 'XPD'];

// ===== Types =====
export interface MetalRate {
  symbol: string;
  rate: number;
  unit: string;
}

interface MetalsLiveResponse {
  [key: string]: {
    price: number;
    currency: string;
  };
}

interface GoldAPIResponse {
  data?: {
    symbol?: string;
    price?: number;
  };
  error?: string;
}

// ===== Primary Provider: Metals API =====

/**
 * Fetch metal rates from metals-api.com
 * API returns USD per troy ounce, we invert to get metal per USD
 */
async function fetchMetalsApiRates(): Promise<MetalRate[]> {
  const metals = SUPPORTED_METALS.join(',').toLowerCase();
  const url = `${METALS_API_URL}${metals}`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    headers: {
      'Content-Type': 'application/json',
      ...(METALS_API_KEY && { 'X-API-Key': METALS_API_KEY }),
    },
  });

  if (!response.ok) {
    throw new Error(`Metals API error: ${response.status} ${response.statusText}`);
  }

  let data: MetalsLiveResponse;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error(`Failed to parse Metals API response: ${error instanceof Error ? error.message : String(error)}`);
  }

  const rates: MetalRate[] = [];
  const missingMetals: string[] = [];

  for (const symbol of SUPPORTED_METALS) {
    const key = symbol.toLowerCase();
    if (data[key] && data[key].price) {
      rates.push({
        symbol,
        rate: data[key].price,
        unit: 'USD/oz', // troy ounce
      });
    } else {
      missingMetals.push(symbol);
    }
  }

  if (missingMetals.length > 0) {
    console.warn('[METALS] Missing metals in response', {
      missing: missingMetals,
      timestamp: new Date().toISOString(),
    });
  }

  return rates;
}

// ===== Fallback Provider: GoldAPI =====

/**
 * Fetch from GoldAPI.io (fallback for XAU and XAG)
 * Only supports gold (XAU) and silver (XAG)
 */
async function fetchFromGoldAPI(symbol: 'XAU' | 'XAG'): Promise<number | null> {
  if (!GOLDAPI_KEY) {
    return null;
  }

  const symbolMap: Record<string, string> = {
    XAU: 'XAUUSD',
    XAG: 'XAGUSD',
  };

  const apiSymbol = symbolMap[symbol];
  if (!apiSymbol) return null;

  try {
    const url = `${GOLDAPI_URL}currency/spot/${apiSymbol}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: {
        'x-access-token': GOLDAPI_KEY,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data: GoldAPIResponse = await response.json();
    return data.data?.price ?? null;
  } catch {
    return null;
  }
}

// ===== Main Export Functions =====

/**
 * Fetch metal rates with primary provider
 */
export async function fetchMetalRates(): Promise<MetalRate[]> {
  return fetchMetalsApiRates();
}

/**
 * Fetch metal rates with retry wrapper
 * Wraps fetchMetalRates with withIngestionRetry for resilience
 */
export async function fetchMetalRatesWithRetry(): Promise<MetalRate[]> {
  return withIngestionRetry('metals', async () => {
    return fetchMetalRates();
  });
}

/**
 * Fetch metal rates with fallback provider
 * Tries primary provider, falls back to GoldAPI for individual metals
 */
export async function fetchMetalRatesWithFallback(): Promise<MetalRate[]> {
  const rates: MetalRate[] = [];

  // Try primary provider first
  try {
    return await fetchMetalsApiRates();
  } catch (error) {
    console.warn('[METALS] Primary provider failed, trying fallback', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Fallback: try individual metals with GoldAPI
  const fallbackSymbols: Array<'XAU' | 'XAG'> = ['XAU', 'XAG'];

  for (const symbol of fallbackSymbols) {
    try {
      const rate = await fetchFromGoldAPI(symbol);
      if (rate) {
        rates.push({
          symbol,
          rate,
          unit: 'USD/oz',
        });
      }
    } catch (error) {
      console.warn(`[METALS] GoldAPI fallback failed for ${symbol}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (rates.length === 0) {
    throw new Error('All metal providers failed');
  }

  return rates;
}

/**
 * Fetch historical metal rate for a specific date
 * Returns the rate that was recorded on the given date, if available
 */
export async function fetchHistoricalMetalRate(
  symbol: string,
  date: string
): Promise<MetalRate | null> {
  if (!SUPPORTED_METALS.includes(symbol)) {
    throw new Error(`Unsupported metal symbol: ${symbol}`);
  }

  // Note: Metals API historical endpoint requires paid subscription
  // This is a placeholder for future implementation
  // For now, return null as historical data is not available in free tier
  console.warn(`[METALS] Historical rate requested for ${symbol} on ${date} - not available in free tier`);
  return null;
}
