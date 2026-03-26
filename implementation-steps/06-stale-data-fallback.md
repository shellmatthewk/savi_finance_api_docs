# Step 06: Stale Data Fallback

## Goal
Implement "Never Fail" policy by serving stale data when current data is unavailable.

## Prerequisites
- Steps 01-03 completed (caching infrastructure)

---

## Concept

When the latest data is unavailable (ingestion failure, DB issues), the API should:
1. Fall back to the most recent available data
2. Mark the response with `stale: true`
3. Log the incident for monitoring
4. Never return a 500 error for data availability issues

---

## Tasks

### Task 6.1: Create Stale Data Service
Create `src/lib/staleData.ts` for fallback logic.

```typescript
// src/lib/staleData.ts
import { db } from '@/db';
import { rates } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getFromCache, setInCache } from './cache';

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
): Promise<StaleDataResult<typeof rates.$inferSelect>> {
  // Try to get exact date first
  if (requestedDate) {
    const exactRate = await db
      .select()
      .from(rates)
      .where(eq(rates.symbol, symbol))
      .where(eq(rates.date, new Date(requestedDate)))
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
    .orderBy(desc(rates.date))
    .limit(1);

  if (!latestRate) {
    return { data: null, stale: false };
  }

  const dataAge = requestedDate
    ? Math.floor(
        (new Date(requestedDate).getTime() - latestRate.date.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  return {
    data: latestRate,
    stale: requestedDate !== undefined,
    staleReason: requestedDate
      ? `Data for ${requestedDate} unavailable, returning data from ${latestRate.date.toISOString().split('T')[0]}`
      : undefined,
    dataAge: Math.abs(dataAge),
    originalDate: latestRate.date.toISOString().split('T')[0]
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
    timestamp: new Date().toISOString()
  });

  // Increment stale data counter for monitoring
  // This will be picked up by alerting system
}
```

### Task 6.2: Update Rates Endpoint
Modify rates endpoint to use stale fallback.

```typescript
// In src/app/api/v1/rates/route.ts

import { getRateWithFallback, logStaleDataUsage } from '@/lib/staleData';

// Replace direct DB query with:
const { data: rate, stale, staleReason, dataAge, originalDate } =
  await getRateWithFallback(symbol, date);

if (!rate) {
  return NextResponse.json(
    { error: 'No data available for symbol' },
    { status: 404 }
  );
}

// Log if stale
if (stale && staleReason) {
  logStaleDataUsage(symbol, date!, originalDate!, staleReason);
}

// Include stale metadata in response
const response = {
  data: {
    symbol: rate.symbol,
    rate: rate.rate,
    date: originalDate
  },
  meta: {
    stale,
    ...(stale && {
      staleReason,
      dataAge,
      requestedDate: date
    }),
    cache: 'MISS'
  }
};
```

### Task 6.3: Add Stale Data Metrics
Track stale data usage for monitoring.

```typescript
// Add to src/lib/staleData.ts
import { redis } from './redis';

export async function incrementStaleDataCount(symbol: string): Promise<void> {
  const key = `stats:stale:${symbol}`;
  const dailyKey = `stats:stale:daily:${new Date().toISOString().split('T')[0]}`;

  await Promise.all([
    redis.incr(key),
    redis.incr(dailyKey)
  ]);
}

export async function getStaleDataStats(): Promise<{
  total: number;
  today: number;
  bySymbol: Record<string, number>;
}> {
  const todayKey = `stats:stale:daily:${new Date().toISOString().split('T')[0]}`;
  const today = parseInt(await redis.get(todayKey) || '0', 10);

  // Get per-symbol stats
  const symbolKeys = await redis.keys('stats:stale:*');
  const bySymbol: Record<string, number> = {};
  let total = 0;

  for (const key of symbolKeys) {
    if (!key.includes('daily')) {
      const symbol = key.replace('stats:stale:', '');
      const count = parseInt(await redis.get(key) || '0', 10);
      bySymbol[symbol] = count;
      total += count;
    }
  }

  return { total, today, bySymbol };
}
```

### Task 6.4: Create Response Helpers

```typescript
// Create src/lib/response.ts
import { NextResponse } from 'next/server';

export interface ApiMeta {
  stale?: boolean;
  staleReason?: string;
  dataAge?: number;
  triangulated?: boolean;
  cache?: 'HIT' | 'MISS';
}

export function createSuccessResponse<T>(
  data: T,
  meta: ApiMeta = {},
  headers: Record<string, string> = {}
): NextResponse {
  return NextResponse.json(
    { data, meta: { ...meta, timestamp: new Date().toISOString() } },
    {
      status: 200,
      headers: {
        'X-Stale': meta.stale ? 'true' : 'false',
        ...headers
      }
    }
  );
}
```

---

## Files to Create/Modify

| Action | File |
|--------|------|
| Create | `src/lib/staleData.ts` |
| Create | `src/lib/response.ts` |
| Modify | `src/app/api/v1/rates/route.ts` |
| Modify | `src/app/api/v1/rates/history/route.ts` |

---

## Acceptance Criteria

- [ ] API returns 200 OK with stale data when current unavailable
- [ ] Response includes `stale: true` flag
- [ ] Response includes `staleReason` explaining the fallback
- [ ] Response includes `dataAge` showing how old data is
- [ ] Stale data usage is logged
- [ ] Stale metrics are tracked in Redis

---

## Testing

```bash
# Request data for a date with no data
curl -H "x-api-key: YOUR_KEY" \
  "http://localhost:3000/api/v1/rates?symbol=USD&date=2099-01-01"
# Should return stale: true with most recent available data

# Verify stale header
curl -I -H "x-api-key: YOUR_KEY" \
  "http://localhost:3000/api/v1/rates?symbol=USD&date=2099-01-01"
# Should see: X-Stale: true
```

---

## Next Step
Proceed to `07-retry-mechanism.md`
