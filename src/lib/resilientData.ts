import { getRedis } from './redis';
import { getDb } from '@/db/client';
import { rates } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { getFromCache, setInCache, ratesCacheKey } from './cache';

export interface DataAccessResult<T> {
  data: T | null;
  source: 'cache' | 'database' | 'fallback';
  degraded: boolean;
  degradedReason?: string;
}

interface ServiceHealth {
  redis: boolean;
  database: boolean;
}

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
}

const serviceHealth: ServiceHealth = {
  redis: true,
  database: true,
};

const circuitBreakers: Map<string, CircuitBreakerState> = new Map();

const FAILURE_THRESHOLD = 5;
const RESET_TIMEOUT = 30_000; // 30 seconds

/**
 * Check if Redis is available
 */
async function checkRedisHealth(): Promise<boolean> {
  try {
    const redis = getRedis();
    if (!redis) {
      serviceHealth.redis = false;
      return false;
    }
    await redis.ping();
    serviceHealth.redis = true;
    return true;
  } catch {
    serviceHealth.redis = false;
    console.error('[HEALTH] Redis unavailable');
    return false;
  }
}

/**
 * Check if database is available
 */
async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const db = getDb();
    await db.execute('SELECT 1');
    serviceHealth.database = true;
    return true;
  } catch {
    serviceHealth.database = false;
    console.error('[HEALTH] Database unavailable');
    return false;
  }
}

/**
 * Get circuit breaker state for a service
 */
function getCircuitBreaker(service: string): CircuitBreakerState {
  if (!circuitBreakers.has(service)) {
    circuitBreakers.set(service, {
      failures: 0,
      lastFailure: 0,
      state: 'closed',
    });
  }
  return circuitBreakers.get(service)!;
}

/**
 * Record a service failure and potentially open circuit
 */
export function recordServiceFailure(service: string): void {
  const breaker = getCircuitBreaker(service);
  breaker.failures++;
  breaker.lastFailure = Date.now();

  if (breaker.failures >= FAILURE_THRESHOLD) {
    breaker.state = 'open';
    console.warn(`[CIRCUIT] ${service} circuit OPEN after ${breaker.failures} failures`);
  }
}

/**
 * Check if circuit is open for a service
 */
export function isCircuitOpen(service: string): boolean {
  const breaker = getCircuitBreaker(service);

  if (breaker.state === 'open') {
    // Check if enough time has passed to try again (half-open)
    if (Date.now() - breaker.lastFailure > RESET_TIMEOUT) {
      breaker.state = 'half-open';
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Record a service success and close circuit
 */
export function recordServiceSuccess(service: string): void {
  const breaker = getCircuitBreaker(service);
  breaker.failures = 0;
  breaker.state = 'closed';
}

/**
 * Get rate with graceful degradation (cache-first with fallbacks)
 */
export async function getRateResilient(
  symbol: string,
  date?: string
): Promise<DataAccessResult<typeof rates.$inferSelect>> {
  const cacheKey = ratesCacheKey(symbol, date);

  // Check circuit breaker for Redis
  if (!isCircuitOpen('redis')) {
    // Try Redis cache first
    const redisAvailable = await checkRedisHealth();
    if (redisAvailable) {
      try {
        const cached = await getFromCache(cacheKey);
        if (cached) {
          recordServiceSuccess('redis');
          return {
            data: cached as typeof rates.$inferSelect,
            source: 'cache',
            degraded: false,
          };
        }
      } catch (error) {
        console.error('[CACHE] Error reading from Redis', error);
        recordServiceFailure('redis');
      }
    } else {
      recordServiceFailure('redis');
    }
  }

  // Check circuit breaker for database
  if (!isCircuitOpen('database')) {
    // Try database
    const dbAvailable = await checkDatabaseHealth();
    if (dbAvailable) {
      try {
        const db = getDb();

        const result = date
          ? await db
              .select()
              .from(rates)
              .where(and(eq(rates.symbol, symbol), eq(rates.recordedDate, date)))
              .limit(1)
          : await db
              .select()
              .from(rates)
              .where(eq(rates.symbol, symbol))
              .orderBy(desc(rates.recordedDate))
              .limit(1);

        const rate = result[0];

        if (rate) {
          recordServiceSuccess('database');

          // Try to cache for next time (non-blocking)
          if (serviceHealth.redis && !isCircuitOpen('redis')) {
            setInCache(cacheKey, rate).catch(() => {});
          }

          return {
            data: rate,
            source: 'database',
            degraded: !serviceHealth.redis,
            degradedReason: !serviceHealth.redis ? 'Redis unavailable' : undefined,
          };
        }
      } catch (error) {
        console.error('[DB] Error querying database', error);
        recordServiceFailure('database');
      }
    } else {
      recordServiceFailure('database');
    }
  }

  // Both primary services degraded - try Redis as last resort for stale data
  if (!serviceHealth.database && serviceHealth.redis && !isCircuitOpen('redis')) {
    try {
      // Get latest cached data for this symbol (ignore date specificity)
      const fallbackKey = ratesCacheKey(symbol);
      const fallbackData = await getFromCache(fallbackKey);
      if (fallbackData) {
        return {
          data: fallbackData as typeof rates.$inferSelect,
          source: 'fallback',
          degraded: true,
          degradedReason: 'Database unavailable, serving cached data',
        };
      }
    } catch {
      // Redis also failed
    }
  }

  // Complete failure - all data sources unavailable
  return {
    data: null,
    source: 'fallback',
    degraded: true,
    degradedReason: 'All data sources unavailable',
  };
}

/**
 * Get current service health status
 */
export function getServiceHealth(): ServiceHealth {
  return { ...serviceHealth };
}

/**
 * Refresh service health by checking both services
 */
export async function refreshServiceHealth(): Promise<ServiceHealth> {
  await Promise.all([checkRedisHealth(), checkDatabaseHealth()]);
  return getServiceHealth();
}
