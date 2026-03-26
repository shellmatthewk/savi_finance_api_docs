# Step 03: Cache Invalidation & Warming

## Goal
Implement cache invalidation after data ingestion and cache warming on startup.

## Prerequisites
- Steps 01-02 completed
- Data ingestion cron exists at `src/app/api/cron/ingest-eod/route.ts`

---

## Tasks

### Task 3.1: Add Cache Purge After Ingestion
Modify the ingestion cron to invalidate caches after new data arrives.

```typescript
// Add to src/lib/cache.ts
export async function invalidateRatesCache(symbols?: string[]): Promise<void> {
  if (symbols && symbols.length > 0) {
    // Invalidate specific symbols
    for (const symbol of symbols) {
      await deleteCachePattern(`rates:${symbol}:*`);
    }
  } else {
    // Invalidate all rates cache
    await deleteCachePattern('rates:*');
  }
}

export async function purgeEdgeCache(surrogateKeys: string[]): Promise<void> {
  // Vercel doesn't have programmatic cache purge
  // But we set short stale-while-revalidate so it will refresh
  // For Cloudflare, you would call their purge API here
  console.log(`Edge cache purge requested for: ${surrogateKeys.join(', ')}`);
}
```

### Task 3.2: Update Ingestion Cron
Modify `src/app/api/cron/ingest-eod/route.ts` to invalidate cache.

```typescript
// At the end of successful ingestion:
import { invalidateRatesCache, purgeEdgeCache } from '@/lib/cache';

// After inserting new rates:
const ingestedSymbols = ['USD', 'EUR', 'BTC', ...]; // symbols that were updated
await invalidateRatesCache(ingestedSymbols);
await purgeEdgeCache(ingestedSymbols.map(s => `rates-${s}`));

console.log(`Cache invalidated for ${ingestedSymbols.length} symbols`);
```

### Task 3.3: Create Cache Warming Function
Pre-populate cache for frequently accessed data.

```typescript
// Add to src/lib/cache.ts
import { db } from '@/db';
import { rates } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function warmRatesCache(): Promise<number> {
  // Get all unique symbols
  const symbols = await db
    .selectDistinct({ symbol: rates.symbol })
    .from(rates);

  let warmed = 0;

  for (const { symbol } of symbols) {
    // Get latest rate for each symbol
    const [latestRate] = await db
      .select()
      .from(rates)
      .where(eq(rates.symbol, symbol))
      .orderBy(desc(rates.date))
      .limit(1);

    if (latestRate) {
      const cacheKey = ratesCacheKey(symbol, 'latest');
      await setInCache(cacheKey, latestRate);
      warmed++;
    }
  }

  return warmed;
}
```

### Task 3.4: Add Cache Warming Endpoint
Create an endpoint to trigger cache warming (admin only).

```typescript
// Create src/app/api/admin/cache/warm/route.ts
import { NextResponse } from 'next/server';
import { warmRatesCache } from '@/lib/cache';
import { verifyAdminAuth } from '@/lib/auth';

export async function POST(request: Request) {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const warmedCount = await warmRatesCache();

  return NextResponse.json({
    success: true,
    warmedSymbols: warmedCount,
    timestamp: new Date().toISOString()
  });
}
```

### Task 3.5: Add Cache Stats Endpoint
Create endpoint to view cache statistics.

```typescript
// Create src/app/api/admin/cache/stats/route.ts
import { NextResponse } from 'next/server';
import { getCacheStats } from '@/lib/cache';
import { verifyAdminAuth } from '@/lib/auth';

export async function GET(request: Request) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stats = await getCacheStats();

  return NextResponse.json({
    cache: {
      hits: stats.hits,
      misses: stats.misses,
      hitRate: `${(stats.hitRate * 100).toFixed(2)}%`
    },
    timestamp: new Date().toISOString()
  });
}
```

---

## Files to Create/Modify

| Action | File |
|--------|------|
| Modify | `src/lib/cache.ts` |
| Modify | `src/app/api/cron/ingest-eod/route.ts` |
| Create | `src/app/api/admin/cache/warm/route.ts` |
| Create | `src/app/api/admin/cache/stats/route.ts` |

---

## Acceptance Criteria

- [x] Cache is invalidated after successful data ingestion
- [x] Cache warming populates Redis with latest rates
- [x] Cache stats endpoint returns hit/miss counts
- [x] Admin endpoints are protected
- [x] Cache hit ratio improves after warming

---

## Testing

```bash
# Trigger cache warming (with admin auth)
curl -X POST "http://localhost:3000/api/admin/cache/warm" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Check cache stats
curl "http://localhost:3000/api/admin/cache/stats" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Verify cache hit after warming
curl -H "x-api-key: YOUR_KEY" "http://localhost:3000/api/v1/rates?symbol=USD"
# Should see X-Cache: HIT immediately after warming
```

---

## Next Step
Proceed to `04-triangulation-service.md`
