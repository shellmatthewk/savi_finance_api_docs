import { getDb } from '@/db/client';
import { rates, type Rate } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { getRedis } from './redis';
import { sendAlert, Alerts } from './alerts';

export interface StaleDataResult<T> {
  data: T | null;
  stale: boolean;
  staleReason?: string;
  dateOffset?: number; // days between actual data date and today
  originalDate?: string;
}

const STALE_ALERT_THRESHOLD_DAYS = 2;
const STALE_ALERT_COOLDOWN = 3600_000; // 1 hour in milliseconds
const ALERT_MAP_CLEANUP_INTERVAL = 86400_000; // 24 hours in milliseconds

// Track alert times per symbol to prevent spam
const staleAlerts = new Map<string, number>();

/**
 * Periodic cleanup of staleAlerts map to prevent memory leak
 * Entries older than 24 hours are removed
 */
function cleanupStaleAlerts(): void {
  const now = Date.now();
  const maxAge = 86400_000; // 24 hours

  for (const [symbol, timestamp] of staleAlerts.entries()) {
    if (now - timestamp > maxAge) {
      staleAlerts.delete(symbol);
    }
  }
}

// Start periodic cleanup on module load
setInterval(cleanupStaleAlerts, ALERT_MAP_CLEANUP_INTERVAL);

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

  // Calculate days between today and actual data date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dataDate = new Date(latestRate.recordedDate);
  dataDate.setHours(0, 0, 0, 0);
  const dateOffset = Math.floor((today.getTime() - dataDate.getTime()) / (1000 * 60 * 60 * 24));

  return {
    data: latestRate,
    stale: requestedDate !== undefined,
    staleReason: requestedDate
      ? `Data for ${requestedDate} unavailable, returning data from ${latestRate.recordedDate}`
      : undefined,
    dateOffset: dateOffset >= 0 ? dateOffset : 0,
    originalDate: latestRate.recordedDate,
  };
}

/**
 * Log stale data usage for monitoring and alert if threshold exceeded
 */
export async function logStaleDataUsage(
  symbol: string,
  requestedDate: string,
  returnedDate: string,
  reason: string,
  dataAge?: number
): Promise<void> {
  console.warn('[STALE_DATA]', {
    symbol,
    requestedDate,
    returnedDate,
    reason,
    timestamp: new Date().toISOString(),
  });

  // Send alert if data is older than threshold and cooldown has passed
  if (dataAge !== undefined && dataAge >= STALE_ALERT_THRESHOLD_DAYS) {
    const now = Date.now();
    const lastAlert = staleAlerts.get(symbol);

    if (lastAlert === undefined || now - lastAlert >= STALE_ALERT_COOLDOWN) {
      // Set timestamp BEFORE sending alert to prevent race condition
      staleAlerts.set(symbol, now);
      await sendAlert(Alerts.staleDataServed(symbol, dataAge));
    }
  }
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

    // Increment both counters and set TTL for cleanup
    // Per-symbol stats expire after 90 days
    // Daily stats expire after 7 days
    await Promise.all([
      redis.incr(key),
      redis.expire(key, 7776000), // 90 days in seconds
      redis.incr(dailyKey),
      redis.expire(dailyKey, 604800), // 7 days in seconds
    ]);
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

    // Use SCAN to iterate through per-symbol stats (O(N) efficient)
    const bySymbol: Record<string, number> = {};
    let total = 0;
    let cursor = '0';

    do {
      const [nextCursor, keys] = await redis.scan(
        parseInt(cursor),
        { match: 'stats:stale:*', count: 100 }
      ) as [string, string[]];

      for (const key of keys) {
        if (!key.includes('daily')) {
          const symbol = key.replace('stats:stale:', '');
          const countValue = await redis.get(key);
          const count = parseInt(String(countValue || '0'), 10);
          bySymbol[symbol] = count;
          total += count;
        }
      }

      cursor = nextCursor;
    } while (cursor !== '0');

    return { total, today, bySymbol };
  } catch (error) {
    console.error('Error getting stale data stats:', error);
    return { total: 0, today: 0, bySymbol: {} };
  }
}
