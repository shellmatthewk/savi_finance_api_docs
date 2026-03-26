# Step 01: Redis Response Caching

## Goal
Implement the cache-aside pattern for API rate responses to achieve high cache hit rates.

## Prerequisites
- Redis is already configured in `src/lib/redis.ts`
- Rate endpoints exist at `src/app/api/v1/rates/route.ts`

---

## Tasks

### Task 1.1: Create Cache Service
Create `src/lib/cache.ts` with unified caching utilities.

```typescript
// src/lib/cache.ts
import { redis } from './redis';

const CACHE_PREFIX = 'cache:';
const DEFAULT_TTL = 86400; // 24 hours in seconds

export interface CacheOptions {
  ttl?: number; // seconds
  prefix?: string;
}

export async function getFromCache<T>(key: string): Promise<T | null> {
  const data = await redis.get(`${CACHE_PREFIX}${key}`);
  if (!data) return null;
  return JSON.parse(data) as T;
}

export async function setInCache<T>(
  key: string,
  value: T,
  options: CacheOptions = {}
): Promise<void> {
  const ttl = options.ttl ?? DEFAULT_TTL;
  await redis.setex(
    `${CACHE_PREFIX}${key}`,
    ttl,
    JSON.stringify(value)
  );
}

export async function deleteFromCache(key: string): Promise<void> {
  await redis.del(`${CACHE_PREFIX}${key}`);
}

export async function deleteCachePattern(pattern: string): Promise<void> {
  const keys = await redis.keys(`${CACHE_PREFIX}${pattern}`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

// Generate cache key for rate queries
export function ratesCacheKey(symbol: string, date?: string): string {
  return date ? `rates:${symbol}:${date}` : `rates:${symbol}:latest`;
}

export function historyRatesCacheKey(
  symbol: string,
  startDate: string,
  endDate: string
): string {
  return `rates:history:${symbol}:${startDate}:${endDate}`;
}
```

### Task 1.2: Update Rates Endpoint
Modify `src/app/api/v1/rates/route.ts` to use cache-aside pattern.

**Changes needed:**
1. Import cache utilities
2. Check Redis cache before querying DB
3. Populate cache after DB query
4. Add cache hit/miss to response headers

```typescript
// Add to GET handler:
import { getFromCache, setInCache, ratesCacheKey } from '@/lib/cache';

// Before DB query:
const cacheKey = ratesCacheKey(symbol, date);
const cachedRate = await getFromCache<RateResponse>(cacheKey);
if (cachedRate) {
  return NextResponse.json(cachedRate, {
    headers: { 'X-Cache': 'HIT' }
  });
}

// After DB query succeeds:
await setInCache(cacheKey, responseData);
return NextResponse.json(responseData, {
  headers: { 'X-Cache': 'MISS' }
});
```

### Task 1.3: Update History Endpoint
Apply same pattern to `src/app/api/v1/rates/history/route.ts`.

### Task 1.4: Add Cache Stats Tracking
Track cache hits/misses in Redis for monitoring.

```typescript
// Add to src/lib/cache.ts
export async function incrementCacheHit(): Promise<void> {
  await redis.incr('stats:cache:hits');
}

export async function incrementCacheMiss(): Promise<void> {
  await redis.incr('stats:cache:misses');
}

export async function getCacheStats(): Promise<{
  hits: number;
  misses: number;
  hitRate: number;
}> {
  const [hits, misses] = await Promise.all([
    redis.get('stats:cache:hits'),
    redis.get('stats:cache:misses')
  ]);
  const h = parseInt(hits || '0', 10);
  const m = parseInt(misses || '0', 10);
  const total = h + m;
  return {
    hits: h,
    misses: m,
    hitRate: total > 0 ? h / total : 0
  };
}
```

---

## Files to Create/Modify

| Action | File |
|--------|------|
| Create | `src/lib/cache.ts` |
| Modify | `src/app/api/v1/rates/route.ts` |
| Modify | `src/app/api/v1/rates/history/route.ts` |

---

## Acceptance Criteria

- [ ] `getFromCache` and `setInCache` functions work correctly
- [ ] Rate endpoint returns `X-Cache: HIT` on repeated requests
- [ ] Cache TTL is set to 24 hours
- [ ] Cache stats are being tracked
- [ ] No regression in existing functionality

---

## Testing

```bash
# First request (cache miss)
curl -H "x-api-key: YOUR_KEY" "http://localhost:3000/api/v1/rates?symbol=USD"
# Check header: X-Cache: MISS

# Second request (cache hit)
curl -H "x-api-key: YOUR_KEY" "http://localhost:3000/api/v1/rates?symbol=USD"
# Check header: X-Cache: HIT
```

---

## Next Step
Proceed to `02-edge-caching.md`
