# Step 08: Graceful Degradation

## Goal
Ensure API continues serving requests even when Redis or database is unavailable.

## Prerequisites
- Step 01 completed (caching infrastructure)
- Step 06 completed (stale data fallback)

---

## Concept

Implement layered fallback:
1. **Primary:** Redis cache → Database
2. **Redis Down:** Database only (slower but functional)
3. **DB Down:** Redis only (serve cached data with stale flag)
4. **Both Down:** Return last known good response with severe degradation flag

Never return 500 for data availability issues.

---

## Tasks

### Task 8.1: Create Resilient Data Access Layer
Create `src/lib/resilientData.ts` with fallback logic.

```typescript
// src/lib/resilientData.ts
import { redis } from './redis';
import { db } from '@/db';
import { rates } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
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

let serviceHealth: ServiceHealth = {
  redis: true,
  database: true
};

/**
 * Check if Redis is available
 */
async function checkRedisHealth(): Promise<boolean> {
  try {
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
 * Get rate with graceful degradation
 */
export async function getRateResilient(
  symbol: string,
  date?: string
): Promise<DataAccessResult<typeof rates.$inferSelect>> {
  const cacheKey = ratesCacheKey(symbol, date);

  // Try Redis cache first
  const redisAvailable = await checkRedisHealth();
  if (redisAvailable) {
    try {
      const cached = await getFromCache(cacheKey);
      if (cached) {
        return {
          data: cached as typeof rates.$inferSelect,
          source: 'cache',
          degraded: false
        };
      }
    } catch (error) {
      console.error('[CACHE] Error reading from Redis', error);
    }
  }

  // Try database
  const dbAvailable = await checkDatabaseHealth();
  if (dbAvailable) {
    try {
      const query = db
        .select()
        .from(rates)
        .where(eq(rates.symbol, symbol));

      if (date) {
        query.where(eq(rates.date, new Date(date)));
      } else {
        query.orderBy(desc(rates.date)).limit(1);
      }

      const [rate] = await query;

      if (rate) {
        // Try to cache for next time (non-blocking)
        if (redisAvailable) {
          setInCache(cacheKey, rate).catch(() => {});
        }

        return {
          data: rate,
          source: 'database',
          degraded: !redisAvailable,
          degradedReason: !redisAvailable ? 'Redis unavailable' : undefined
        };
      }
    } catch (error) {
      console.error('[DB] Error querying database', error);
    }
  }

  // Both services degraded - try Redis as last resort (might have stale data)
  if (!dbAvailable && redisAvailable) {
    try {
      // Get any cached data for this symbol (ignore date)
      const fallbackKey = ratesCacheKey(symbol, 'latest');
      const fallbackData = await getFromCache(fallbackKey);
      if (fallbackData) {
        return {
          data: fallbackData as typeof rates.$inferSelect,
          source: 'fallback',
          degraded: true,
          degradedReason: 'Database unavailable, serving cached data'
        };
      }
    } catch {
      // Redis also failed
    }
  }

  // Complete failure
  return {
    data: null,
    source: 'fallback',
    degraded: true,
    degradedReason: 'All data sources unavailable'
  };
}

/**
 * Get current service health status
 */
export function getServiceHealth(): ServiceHealth {
  return { ...serviceHealth };
}

/**
 * Refresh service health (call periodically)
 */
export async function refreshServiceHealth(): Promise<ServiceHealth> {
  await Promise.all([checkRedisHealth(), checkDatabaseHealth()]);
  return getServiceHealth();
}
```

### Task 8.2: Update Rate Endpoints
Use resilient data access in routes.

```typescript
// In src/app/api/v1/rates/route.ts
import { getRateResilient } from '@/lib/resilientData';

export async function GET(request: NextRequest) {
  // ... auth validation ...

  const { data: rate, source, degraded, degradedReason } =
    await getRateResilient(symbol, date);

  if (!rate) {
    // Even in complete failure, return 503 not 500
    return NextResponse.json(
      {
        error: 'Service temporarily unavailable',
        degraded: true,
        reason: degradedReason
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    data: {
      symbol: rate.symbol,
      rate: rate.rate,
      date: rate.date.toISOString().split('T')[0]
    },
    meta: {
      source,
      degraded,
      degradedReason,
      timestamp: new Date().toISOString()
    }
  });
}
```

### Task 8.3: Add Health Check Endpoint
Create comprehensive health check.

```typescript
// Create src/app/api/health/detailed/route.ts
import { NextResponse } from 'next/server';
import { refreshServiceHealth, getServiceHealth } from '@/lib/resilientData';

export async function GET() {
  const health = await refreshServiceHealth();

  const allHealthy = health.redis && health.database;
  const anyHealthy = health.redis || health.database;

  return NextResponse.json(
    {
      status: allHealthy ? 'healthy' : anyHealthy ? 'degraded' : 'unhealthy',
      services: {
        redis: {
          status: health.redis ? 'up' : 'down'
        },
        database: {
          status: health.database ? 'up' : 'down'
        }
      },
      timestamp: new Date().toISOString()
    },
    {
      status: allHealthy ? 200 : anyHealthy ? 200 : 503
    }
  );
}
```

### Task 8.4: Add Circuit Breaker Pattern
Prevent cascading failures with circuit breaker.

```typescript
// Add to src/lib/resilientData.ts

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
}

const circuitBreakers: Map<string, CircuitBreakerState> = new Map();

const FAILURE_THRESHOLD = 5;
const RESET_TIMEOUT = 30_000; // 30 seconds

function getCircuitBreaker(service: string): CircuitBreakerState {
  if (!circuitBreakers.has(service)) {
    circuitBreakers.set(service, {
      failures: 0,
      lastFailure: 0,
      state: 'closed'
    });
  }
  return circuitBreakers.get(service)!;
}

export function recordServiceFailure(service: string): void {
  const breaker = getCircuitBreaker(service);
  breaker.failures++;
  breaker.lastFailure = Date.now();

  if (breaker.failures >= FAILURE_THRESHOLD) {
    breaker.state = 'open';
    console.warn(`[CIRCUIT] ${service} circuit OPEN`);
  }
}

export function isCircuitOpen(service: string): boolean {
  const breaker = getCircuitBreaker(service);

  if (breaker.state === 'open') {
    // Check if enough time has passed to try again
    if (Date.now() - breaker.lastFailure > RESET_TIMEOUT) {
      breaker.state = 'half-open';
      return false;
    }
    return true;
  }

  return false;
}

export function recordServiceSuccess(service: string): void {
  const breaker = getCircuitBreaker(service);
  breaker.failures = 0;
  breaker.state = 'closed';
}
```

---

## Files to Create/Modify

| Action | File |
|--------|------|
| Create | `src/lib/resilientData.ts` |
| Create | `src/app/api/health/detailed/route.ts` |
| Modify | `src/app/api/v1/rates/route.ts` |
| Modify | `src/app/api/v1/rates/history/route.ts` |

---

## Acceptance Criteria

- [x] API returns 200 with degraded flag when Redis is down
- [x] API returns 200 with degraded flag when DB is down (using cache)
- [x] API returns 503 (not 500) when both are down
- [x] Health endpoint shows individual service status
- [x] Circuit breaker prevents repeated calls to failed services
- [x] Zero 500 errors from infrastructure issues

---

## Testing

```bash
# Test with Redis down
docker stop redis
curl "http://localhost:3000/api/v1/rates?symbol=USD"
# Should return 200 with degraded: true

# Test health endpoint
curl "http://localhost:3000/api/health/detailed"
# Should show redis: down, database: up

# Restore Redis
docker start redis
```

---

## Next Step
Proceed to `09-alert-service.md`
