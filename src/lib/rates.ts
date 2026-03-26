import { eq, desc, and } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { rates } from '@/db/schema';
import { getFromCache, setInCache } from './cache';

/**
 * Get all supported currency symbols from the database
 * Results are cached for 1 hour
 */
export async function getSupportedSymbols(): Promise<Set<string>> {
  // Check cache first
  const cached = await getFromCache<string[]>('supported-symbols');
  if (cached) {
    return new Set(cached);
  }

  // Query database for distinct symbols
  const db = getDb();
  const symbols = await db
    .selectDistinct({ symbol: rates.symbol })
    .from(rates);

  const symbolSet = symbols.map((s) => s.symbol);

  // Cache for 1 hour
  await setInCache('supported-symbols', symbolSet, { ttl: 3600 });

  return new Set(symbolSet);
}

/**
 * Get the USD rate for a currency
 * Returns null if not found
 *
 * @param symbol - Currency symbol (e.g., 'EUR', 'JPY')
 * @param date - Optional ISO date string, defaults to latest
 * @returns Rate value or null if not found
 */
export async function getUsdRate(
  symbol: string,
  date?: string | null
): Promise<number | null> {
  // USD to USD is always 1
  if (symbol === 'USD') {
    return 1;
  }

  const db = getDb();

  if (date) {
    // Query for specific date
    const result = await db
      .select()
      .from(rates)
      .where(and(eq(rates.symbol, symbol), eq(rates.recordedDate, date)));

    if (result.length > 0) {
      return parseFloat(result[0].rate);
    }
  } else {
    // Query for latest rate
    const result = await db
      .select()
      .from(rates)
      .where(eq(rates.symbol, symbol))
      .orderBy(desc(rates.recordedDate))
      .limit(1);

    if (result.length > 0) {
      return parseFloat(result[0].rate);
    }
  }

  return null;
}
