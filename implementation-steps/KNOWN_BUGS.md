# Known Bugs & Technical Debt

Tracking issues discovered during implementation for future fixes.

---

## Step 02: Edge Caching

### Bug: Dead Code in Middleware (Minor)
**File:** `src/middleware.ts` (lines 29-34)
**Issue:** Auth route no-cache logic is unreachable. Auth routes are at `/api/auth/` but middleware only processes `/api/v1/` routes, so the auth check never executes.
**Impact:** None (auth routes bypass middleware entirely, so they're not cached anyway)
**Fix:** Remove dead code or move auth check before the `/api/v1/` filter.

### Issue: Duplicate Header Setting (Redundancy)
**Files:** `src/middleware.ts`, `src/app/api/v1/rates/route.ts`, `src/app/api/v1/rates/history/route.ts`, `src/app/api/v1/assets/route.ts`
**Issue:** Both middleware and route handlers set the same cache headers (Cache-Control, Vary, Surrogate-Key).
**Impact:** Maintenance confusion, slight overhead
**Fix:** Consolidate to route handlers only (they have more context for error vs success responses).

### Issue: History Cache Key Missing Plan Context (Potential Bug)
**File:** `src/app/api/v1/rates/history/route.ts`
**Issue:** Application-level cache key (`historyRatesCacheKey`) includes symbol and dates but NOT the user's plan. Different plans have different history limits (30 vs 90 days).
**Impact:** Edge cache is safe (Vary header), but Redis cache could serve wrong data across plans.
**Fix:** Include plan tier in cache key, or bypass app cache for plan-limited responses.

### Issue: Error Details Exposed (Minor Security)
**Files:** `src/app/api/v1/rates/route.ts`, `src/app/api/v1/assets/route.ts`
**Issue:** 500 error responses include `details: errorMessage` which could leak implementation details.
**Impact:** Low - internal error messages visible to API consumers
**Fix:** Remove `details` field in production or sanitize error messages.

### Gap: Assets Route Missing Application Cache
**File:** `src/app/api/v1/assets/route.ts`
**Issue:** Unlike rates routes, assets route doesn't use Redis caching (`getFromCache`/`setInCache`).
**Impact:** Every cache miss hits the database directly.
**Fix:** Add application-level caching for consistency.

---

---

## Step 03: Cache Invalidation & Warming

### Issue: N+1 Query in `warmRatesCache()` (Performance)
**File:** `src/lib/cache.ts` (lines 167-190)
**Issue:** Cache warming executes N+1 queries (1 for distinct symbols + 1 per symbol for latest rate). For 50 symbols = 51 queries.
**Impact:** Slow cache warming, database load
**Fix:** Use single query with `DISTINCT ON (symbol)` or window function.

### Gap: History Cache Not Invalidated
**File:** `src/lib/cache.ts` (lines 139-148)
**Issue:** `invalidateRatesCache()` deletes `rates:{symbol}:*` but history keys are `rates:history:{symbol}:*` - pattern doesn't match.
**Impact:** Stale historical data served after EOD ingestion
**Fix:** Add `await deleteCachePattern(`rates:history:${symbol}:*`)` to invalidation.

### Gap: Sequential Cache Invalidation
**File:** `src/lib/cache.ts` (lines 140-144)
**Issue:** Invalidation loop uses sequential `await` instead of `Promise.all()`.
**Impact:** Slower invalidation for many symbols
**Fix:** Collect promises and await with `Promise.all()`.

### Gap: No Admin Action Audit Logging
**Files:** `src/app/api/admin/cache/warm/route.ts`, `src/app/api/admin/cache/stats/route.ts`
**Issue:** Admin endpoints don't log who made requests or what actions were taken.
**Impact:** No security audit trail
**Fix:** Add logging with timestamp, IP, action, result.

### Gap: Timing Attack Potential in Admin Auth (Low)
**File:** `src/lib/auth.ts` (line 144)
**Issue:** Direct string comparison `token === adminKey` instead of `crypto.timingSafeEqual()`.
**Impact:** Theoretical timing attack (low practical risk for admin keys)
**Fix:** Use `crypto.timingSafeEqual()` for comparison.

---

## Step 04: Triangulation Service

### Bug: Dash Format Parser Missing Length Validation (Medium)
**File:** `src/lib/triangulation.ts` (lines 111-116)
**Issue:** Dash format parser doesn't validate 3-char minimum for currencies unlike slash format. `parseCrossPair('EU-J')` returns `{ base: 'EU', quote: 'J' }` instead of `null`.
**Impact:** Invalid currency pairs accepted
**Fix:** Add `&& base.length >= 3 && quote.length >= 3` to dash format check.

### Bug: USD Pair Handling Inconsistent (Low)
**File:** `src/lib/triangulation.ts` (lines 124-127)
**Issue:** Concatenated format rejects USD pairs (`EURUSD` → null) but slash/dash formats accept them (`EUR/USD` → valid).
**Impact:** Inconsistent API behavior
**Fix:** Either reject USD in all formats or document the intentional difference.

### Gap: No NaN/Infinity Validation
**File:** `src/lib/triangulation.ts`
**Issue:** `triangulateRate(NaN, 1)` returns NaN instead of throwing. Validation `<= 0` doesn't catch NaN.
**Impact:** Silent failures with bad input
**Fix:** Add `Number.isFinite()` check before calculation.

### Issue: Test Precision Too Loose
**File:** `src/lib/__tests__/triangulation.test.ts` (line 14)
**Issue:** Tests use `toBeCloseTo(162.5, 1)` (1 decimal) but code uses 8 decimal precision.
**Impact:** Could miss rounding bugs
**Fix:** Use `toBeCloseTo(value, 5)` or higher precision.

---

## Step 05: Triangulation API Integration

### Issue: Triangulated Rates Not Invalidated (Medium)
**File:** `src/lib/cache.ts` (invalidateRatesCache function)
**Issue:** `invalidateRatesCache()` clears `rates:*` pattern but triangulated rates use `triangulated:*` prefix, so they're never invalidated.
**Impact:** Stale triangulated rates persist after EOD ingestion
**Fix:** Update `invalidateRatesCache()` to also clear `triangulated:*` pattern, or use `rates:triangulated:*` prefix.

### Issue: `getUsdRate()` Missing Caching (Medium)
**File:** `src/lib/rates.ts` (getUsdRate function)
**Issue:** `getUsdRate()` directly queries DB without checking cache first, unlike the main rates endpoint.
**Impact:** Cache misses for triangulated rates cause redundant DB queries even if USD rates are already cached.
**Fix:** Add cache lookup before DB query or reuse cache from main rates endpoint.

### Gap: No Cache Stats for Triangulated Rates
**File:** `src/app/api/v1/rates/route.ts` (handleCrossRateRequest function)
**Issue:** Triangulated rate path doesn't call `incrementCacheHit()` / `incrementCacheMiss()`.
**Impact:** Cache statistics are incomplete/inaccurate
**Fix:** Add cache stat tracking to triangulated rate handler.

### Issue: Error Details Exposed in Production (Medium)
**Files:** `src/app/api/v1/rates/route.ts`, `src/app/api/v1/assets/route.ts`
**Issue:** 500 error responses include `details: errorMessage` exposing internal errors.
**Impact:** Security information disclosure risk
**Fix:** Only include `details` when `process.env.NODE_ENV !== 'production'`.

### Gap: Date Format Not Normalized in Cache Key
**File:** `src/app/api/v1/rates/route.ts` (line 252)
**Issue:** Cache key uses raw date param. `2024-01-01` vs `2024-1-1` create different cache keys for same date.
**Impact:** Cache fragmentation, reduced hit rate
**Fix:** Parse and format date consistently (e.g., `YYYY-MM-DD`) before using in cache key.

### Gap: USD Might Not Be in Supported Symbols
**File:** `src/lib/rates.ts` (getSupportedSymbols function)
**Issue:** If no USD entries exist in DB, `canTriangulate('EUR', 'USD', supportedSymbols)` fails with "Unsupported quote currency".
**Impact:** USD cross-pairs may fail validation
**Fix:** Ensure USD is always in supported symbols set (seed DB or add programmatically).

---

## Step 06: Stale Data Fallback

### Bug: Cached Stale Data Not Marked on Cache HIT (High)
**File:** `src/app/api/v1/rates/route.ts` (lines 152-156)
**Issue:** When stale data is returned from cache, the `staleMetadata` is not populated. Clients receive stale data without `X-Stale` header or metadata.
**Impact:** Clients can't detect they're receiving stale cached data
**Fix:** Either don't cache stale responses, or cache with stale metadata and restore on HIT.

### Bug: Stale Data Cached with Requested-Date Key (High)
**File:** `src/app/api/v1/rates/route.ts` (lines 149, 193)
**Issue:** Stale data (from date Y) is cached with key containing requested date X. Subsequent requests for date X get stale data silently.
**Impact:** Cache pollution, incorrect data served
**Fix:** Use actual data date in cache key, or don't cache stale responses.

### Issue: `dataAge` Calculation Semantics Confusing
**File:** `src/lib/staleData.ts` (lines 49-54)
**Issue:** `dataAge` is calculated as `requestedDate - actualDate`, not `today - actualDate`. Meaning varies based on what date was requested.
**Impact:** Confusing for API consumers
**Fix:** Calculate from today, or rename to `dateOffset` and document clearly.

### Issue: Redis KEYS Command is O(N)
**File:** `src/lib/staleData.ts` (line 121)
**Issue:** `getStaleDataStats()` uses `redis.keys('stats:stale:*')` which scans entire keyspace.
**Impact:** Performance degradation at scale, can block Redis
**Fix:** Use `SCAN` iterator or maintain a Set of known symbol keys.

### Gap: No TTL on Stats Keys
**File:** `src/lib/staleData.ts` (line 96)
**Issue:** `stats:stale:{symbol}` and daily keys never expire, accumulating forever.
**Impact:** Redis memory growth, stale stats for removed symbols
**Fix:** Add TTL via `INCR` + `EXPIRE` pipeline or use `SETEX` pattern.

### Issue: `response.ts` Helper Unused
**File:** `src/lib/response.ts`
**Issue:** `createSuccessResponse()` helper created but routes manually construct responses.
**Impact:** Dead code, inconsistency
**Fix:** Either use the helper consistently or remove it.

---

## Step 07: Retry Mechanism

### Bug: `withSmartRetry` Doesn't Actually Reduce Delays (High)
**File:** `src/lib/retry.ts` (lines 118-141)
**Issue:** The `onRetry` callback calculates `transientDelay` but this value is discarded. The actual sleep uses `nextDelay` from `withRetry`, not the callback's modified value.
**Impact:** Transient errors get full exponential delays instead of shorter 5s delays
**Fix:** Refactor to have callback return modified delay, or remove the function.

### Bug: Backoff Comments Misleading
**File:** `src/lib/retry.ts`
**Issue:** Comments say "1min → 5min → 15min" but with 3 max attempts, only 2 waits occur (1min, 5min). The 15min delay is never reached.
**Impact:** Documentation doesn't match behavior
**Fix:** Either increase `maxAttempts` to 4 or update comments to "1min → 5min".

### Issue: Race Condition in Health Tracking
**File:** `src/lib/providerHealth.ts` (lines 49-65)
**Issue:** `hincrby` is atomic but subsequent `hset` is not. Two concurrent failures could see stale counts when calculating status.
**Impact:** Status could briefly show wrong value under concurrent failures
**Fix:** Use Lua script or Redis transaction for atomicity.

### Gap: `maxDuration` vs Retry Delays Mismatch
**File:** `src/app/api/cron/ingest-eod/route.ts` (line 9)
**Issue:** `maxDuration = 60` seconds but retry delays total 6+ minutes. Vercel kills function before retries complete.
**Impact:** Retries never execute in serverless context
**Fix:** Either reduce delays (5s→10s→20s) or increase maxDuration (Pro: 300s, Enterprise: 900s).

### Gap: Non-RetryError Failures Not Tracked
**File:** `src/app/api/cron/ingest-eod/route.ts` (lines 78-84)
**Issue:** Only `RetryError` triggers `recordProviderFailure()`. Other errors (parsing bugs, etc.) are logged but not tracked.
**Impact:** Incomplete provider health picture
**Fix:** Call `recordProviderFailure()` for all caught errors.

---

## Legend

| Severity | Description |
|----------|-------------|
| Bug | Incorrect behavior |
| Issue | Suboptimal but working |
| Gap | Missing functionality |
