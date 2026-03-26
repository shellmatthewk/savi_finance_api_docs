import { getDb } from '@/db/client';
import { rates, type Rate } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { getRedis } from './redis';

export interface StaleDataResult<T> {
  data: T | null;
  stale: boolean;
  staleReason?: string;
  dataAge?: number; // days old
  originalDate?: string;
}

/**
 * Get rate with stale fallback
 * Returns most recent data if requested date unavailable
 */
export async function getRateWithFallback(
  symbol: string,
  requestedDate?: string
): Promise<StaleDataResult<Rate>> {
  const db = getDb();

  // Try to get exact date first
  if (requestedDate) {
    const exactRate = await db
      .select()
      .from(rates)
      .where(and(eq(rates.symbol, symbol), eq(rates.recordedDate, requestedDate)))
      .limit(1);

    if (exactRate.length > 0) {
      return { data: exactRate[0], stale: false };
    }
  }

  // Fallback to most recent available data
  const [latestRate] = await db
    .select()
    .from(rates)
    .where(eq(rates.symbol, symbol))
    .orderBy(desc(rates.recordedDate))
    .limit(1);

  if (!latestRate) {
    return { data: null, stale: false };
  }

  const dataAge = requestedDate
    ? Math.floor(
        (new Date(requestedDate).getTime() - new Date(latestRate.recordedDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  return {
    data: latestRate,
    stale: requestedDate !== undefined,
    staleReason: requestedDate
      ? `Data for ${requestedDate} unavailable, returning data from ${latestRate.recordedDate}`
      : undefined,
    dataAge: Math.abs(dataAge),
    originalDate: latestRate.recordedDate,
  };
}

/**
 * Log stale data usage for monitoring
 */
export function logStaleDataUsage(
  symbol: string,
  requestedDate: string,
  returnedDate: string,
  reason: string
): void {
  console.warn('[STALE_DATA]', {
    symbol,
    requestedDate,
    returnedDate,
    reason,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Increment stale data counter for monitoring
 */
export async function incrementStaleDataCount(symbol: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const key = `stats:stale:${symbol}`;
    const dailyKey = `stats:stale:daily:${new Date().toISOString().split('T')[0]}`;

    await Promise.all([redis.incr(key), redis.incr(dailyKey)]);
  } catch (error) {
    console.error('Error incrementing stale data count:', error);
  }
}

/**
 * Get stale data statistics
 */
export async function getStaleDataStats(): Promise<{
  total: number;
  today: number;
  bySymbol: Record<string, number>;
}> {
  const redis = getRedis();
  if (!redis) {
    return { total: 0, today: 0, bySymbol: {} };
  }

  try {
    const todayKey = `stats:stale:daily:${new Date().toISOString().split('T')[0]}`;
    const todayValue = await redis.get(todayKey);
    const today = parseInt(String(todayValue || '0'), 10);

    // Get per-symbol stats
    const symbolKeys = await redis.keys('stats:stale:*');
    const bySymbol: Record<string, number> = {};
    let total = 0;

    for (const key of symbolKeys) {
      if (!key.includes('daily')) {
        const symbol = key.replace('stats:stale:', '');
        const countValue = await redis.get(key);
        const count = parseInt(String(countValue || '0'), 10);
        bySymbol[symbol] = count;
        total += count;
      }
    }

    return { total, today, bySymbol };
  } catch (error) {
    console.error('Error getting stale data stats:', error);
    return { total: 0, today: 0, bySymbol: {} };
  }
}
