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

## Legend

| Severity | Description |
|----------|-------------|
| Bug | Incorrect behavior |
| Issue | Suboptimal but working |
| Gap | Missing functionality |
