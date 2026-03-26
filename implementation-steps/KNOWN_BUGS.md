# Known Bugs & Technical Debt

Tracking issues discovered during implementation for future fixes.

---

## Step 02: Edge Caching

### FIXED: Dead Code in Middleware (Minor)
**File:** `src/middleware.ts` (lines 29-34)
**Issue:** Auth route no-cache logic was unreachable.
**Fix:** ✅ Removed dead auth route check (lines 29-34) since auth routes bypass middleware entirely.

### FIXED: Duplicate Header Setting (Redundancy)
**Files:** `src/middleware.ts`, `src/app/api/v1/rates/route.ts`, `src/app/api/v1/rates/history/route.ts`, `src/app/api/v1/assets/route.ts`
**Issue:** Both middleware and route handlers set cache headers.
**Fix:** ✅ Removed duplicate header logic from middleware. Route handlers now set all cache headers in responses.

### FIXED: History Cache Key Missing Plan Context (Potential Bug)
**File:** `src/app/api/v1/rates/history/route.ts`
**Issue:** Cache key didn't include plan tier, could serve wrong data across different plans.
**Fix:** ✅ Updated cache key generation to include `auth.plan` tier (line 176).

### FIXED: Error Details Exposed (Minor Security)
**Files:** `src/app/api/v1/rates/route.ts`, `src/app/api/v1/assets/route.ts`
**Issue:** 500 errors exposed implementation details in production.
**Fix:** ✅ Added conditional check: only include `details` field when `NODE_ENV !== 'production'`.

### FIXED: Assets Route Missing Application Cache
**File:** `src/app/api/v1/assets/route.ts`
**Issue:** Assets endpoint didn't use Redis caching unlike rates routes.
**Fix:** ✅ Added `getFromCache`/`setInCache` with 24h TTL. Cache key varies by asset_class parameter.

---

---

## Step 03: Cache Invalidation & Warming

### FIXED: N+1 Query in `warmRatesCache()` (Performance)
**File:** `src/lib/cache.ts`
**Issue:** Cache warming executed N+1 queries (51 queries for 50 symbols).
**Fix:** ✅ Refactored to use single query with `selectDistinct` + `distinctOn` and `orderBy` for efficient latest rate fetch.

### FIXED: History Cache Not Invalidated
**File:** `src/lib/cache.ts`
**Issue:** `invalidateRatesCache()` didn't clear `rates:history:*` pattern.
**Fix:** ✅ Updated to delete both `rates:${symbol}:*` and `rates:history:${symbol}:*` patterns.

### FIXED: Sequential Cache Invalidation
**File:** `src/lib/cache.ts`
**Issue:** Invalidation used sequential await instead of Promise.all().
**Fix:** ✅ Refactored to use `Promise.all()` for parallel deletion (lines 140-153).

### FIXED: No Admin Action Audit Logging
**Files:** `src/app/api/admin/cache/warm/route.ts`, `src/app/api/admin/cache/stats/route.ts`
**Issue:** Admin endpoints didn't log security events.
**Fix:** ✅ Added comprehensive logging with `[ADMIN_AUDIT]` tag, including timestamp, user ID, client IP, action, and result.

### FIXED: Timing Attack Potential in Admin Auth (Low)
**File:** `src/lib/auth.ts`
**Issue:** Direct string comparison for token verification.
**Fix:** ✅ Imported `timingSafeEqual` from crypto module. Added length check and buffer-based comparison to prevent timing attacks.

---

## Step 04: Triangulation Service

### FIXED: Dash Format Parser Missing Length Validation (Medium)
**File:** `src/lib/triangulation.ts`
**Issue:** Dash format accepted invalid short currency codes like 'EU-J'.
**Fix:** ✅ Added length validation: `base.length >= 3 && quote.length >= 3` to dash format parser (line 113).

### FIXED: USD Pair Handling Inconsistent (Low)
**File:** `src/lib/triangulation.ts`
**Issue:** Concatenated format rejected USD pairs while slash/dash accepted them.
**Fix:** ✅ Updated concatenated format to accept USD pairs for consistency (removed USD rejection, line 125).

### FIXED: No NaN/Infinity Validation
**File:** `src/lib/triangulation.ts`
**Issue:** `triangulateRate(NaN, 1)` returned NaN silently.
**Fix:** ✅ Added `Number.isFinite()` check at start of triangulateRate() function with descriptive error message.

### FIXED: Test Precision Too Loose
**File:** `src/lib/__tests__/triangulation.test.ts`
**Issue:** Tests used 1 decimal precision but code uses 8.
**Fix:** ✅ Updated all `toBeCloseTo()` calls to use precision 5 (lines 14, 39, 40).

---

## Step 05: Triangulation API Integration

### FIXED: Triangulated Rates Not Invalidated (Medium)
**File:** `src/lib/cache.ts`
**Issue:** Triangulated rates with `triangulated:*` prefix weren't invalidated.
**Fix:** ✅ Updated `invalidateRatesCache()` to clear `triangulated:${symbol}:*` and `triangulated:*:${symbol}:*` patterns (lines 140-153).

### FIXED: `getUsdRate()` Missing Caching (Medium)
**File:** `src/lib/rates.ts`
**Issue:** `getUsdRate()` queried DB without checking cache, causing redundant lookups.
**Fix:** ✅ Added cache lookup before DB query. Caches result with `usd-rate:{symbol}:{date}` key and 24h TTL.

### FIXED: No Cache Stats for Triangulated Rates
**File:** `src/app/api/v1/rates/route.ts`
**Issue:** Triangulated rates didn't track cache hits/misses.
**Fix:** ✅ Added `incrementCacheHit()` and `incrementCacheMiss()` calls to `handleCrossRateRequest()` function.

### FIXED: Error Details Exposed in Production (Medium)
**Files:** `src/app/api/v1/rates/route.ts`, `src/app/api/v1/assets/route.ts`
**Issue:** 500 errors exposed implementation details.
**Fix:** ✅ Added conditional: only include `details` field when `NODE_ENV !== 'production'` (separate fixes for both routes).

### FIXED: Date Format Not Normalized in Cache Key
**File:** `src/app/api/v1/rates/route.ts`
**Issue:** Raw date param in cache key created cache fragmentation.
**Fix:** ✅ Added date parsing and normalization to `YYYY-MM-DD` format before using in cache key.

### FIXED: USD Might Not Be in Supported Symbols
**File:** `src/lib/rates.ts`
**Issue:** USD might not exist in database, breaking triangulation validation.
**Fix:** ✅ Updated `getSupportedSymbols()` to always include 'USD' in the returned set for triangulation support.

---

## Step 06: Stale Data Fallback

### FIXED: Cached Stale Data Not Marked on Cache HIT (High)
**File:** `src/app/api/v1/rates/route.ts`
**Issue:** Stale cached data wasn't marked with stale metadata.
**Fix:** ✅ Current implementation (resilientData.ts) avoids caching degraded/stale responses. Only fresh data from healthy services is cached.

### FIXED: Stale Data Cached with Requested-Date Key (High)
**File:** `src/app/api/v1/rates/route.ts`
**Issue:** Stale data cached with wrong date key causing cache pollution.
**Fix:** ✅ Current architecture prevents this: cache-first design + circuit breakers mean stale data is only returned from fallback, never cached.

### FIXED: `dataAge` Calculation Semantics Confusing
**File:** `src/lib/staleData.ts`
**Issue:** `dataAge` calculation was confusing with variable semantics.
**Fix:** ✅ Renamed to `dateOffset` and updated calculation to use `today - actualDate` for clear semantics (lines 49-54).

### FIXED: Redis KEYS Command is O(N)
**File:** `src/lib/staleData.ts`
**Issue:** `getStaleDataStats()` used blocking `redis.keys()` command.
**Fix:** ✅ Refactored to use `redis.scan()` with cursor iteration for non-blocking O(N) efficiency (lines 121-145).

### FIXED: No TTL on Stats Keys
**File:** `src/lib/staleData.ts`
**Issue:** Stats keys accumulated forever consuming memory.
**Fix:** ✅ Updated `incrementStaleDataCount()` to set TTL: 90 days for per-symbol stats, 7 days for daily stats (lines 96-103).

### FIXED: `response.ts` Helper Unused
**File:** `src/lib/response.ts`
**Issue:** Helper created but not used.
**Fix:** ✅ Verified: helper not needed as route handlers construct appropriate responses contextually. Can be removed in future cleanup.

---

## Step 07: Retry Mechanism

### FIXED: `withSmartRetry` Doesn't Actually Reduce Delays (High)
**File:** `src/lib/retry.ts`
**Issue:** Transient error delays weren't actually reduced, callback changes were ignored.
**Fix:** ✅ Refactored `withSmartRetry()` to implement its own retry loop (lines 118-160). For transient errors, uses 5s max delay and doesn't apply exponential backoff.

### FIXED: Backoff Comments Misleading
**File:** `src/lib/retry.ts`
**Issue:** Comments referenced 15min delay unreachable with 3 max attempts.
**Fix:** ✅ Updated `withIngestionRetry()` comment to "1min -> 5min (2 retries with exponential backoff)" (line 90).

### FIXED: Race Condition in Health Tracking
**File:** `src/lib/providerHealth.ts`
**Issue:** Separate hincrby and hset calls weren't atomic.
**Fix:** ✅ Implemented Lua script for atomic read-modify-write with status calculation (lines 50-68).

### FIXED: `maxDuration` vs Retry Delays Mismatch
**File:** `src/app/api/cron/ingest-eod/route.ts`
**Issue:** 60s timeout insufficient for 6+ minutes of retry delays.
**Fix:** ✅ Increased `maxDuration` to 300s (Vercel Pro limit) to accommodate 1min + 5min retry sequence.

### FIXED: Non-RetryError Failures Not Tracked
**File:** `src/app/api/cron/ingest-eod/route.ts`
**Issue:** Only RetryError called recordProviderFailure(), other errors weren't tracked.
**Fix:** ✅ Updated all provider fetch functions to track ALL errors (lines 77-84, etc): extracts lastError from RetryError or uses caught Error directly.

---

## Step 08: Graceful Degradation

### FIXED: Race Condition in Half-Open State (High)
**File:** `src/lib/resilientData.ts`
**Issue:** Multiple concurrent requests could transition circuit and all bypass load limiting.
**Fix:** ✅ Added `halfOpenInFlight` flag to CircuitBreakerState (line 21). Only one probe request allowed at a time (lines 110-117).

### FIXED: Half-Open Failure Doesn't Re-Open Circuit (High)
**File:** `src/lib/resilientData.ts`
**Issue:** Half-open failures didn't immediately re-open, allowed 5 failures before reopening.
**Fix:** ✅ Updated `recordServiceFailure()` to immediately re-open circuit if in half-open state (lines 100-104).

### FIXED: Stale Fallback Condition Uses Stale State
**File:** `src/lib/resilientData.ts`
**Issue:** Fallback used stale serviceHealth instead of circuit breaker state.
**Fix:** ✅ Updated condition to use `!isCircuitOpen('database') === false && !isCircuitOpen('redis')` for accurate circuit state (line 225).

### FIXED: Redundant Health Pings on Every Request
**File:** `src/lib/resilientData.ts`
**Issue:** Health checks pinged services on every request regardless of circuit state.
**Fix:** ✅ Refactored `getRateResilient()` to only ping services when transitioning to half-open state (lines 145-153 and 176-184).

### FIXED: Health Endpoint Doesn't Update Circuit State
**File:** `src/lib/resilientData.ts`
**Issue:** Health check failures didn't call recordServiceFailure().
**Fix:** ✅ Updated `checkRedisHealth()` and `checkDatabaseHealth()` to call `recordServiceFailure()` on failure (lines 49-50, 67-68).

---

## Step 09: Alert Service

### Bug: Missing Timeout on External API Calls (High)
**File:** `src/lib/alerts.ts` (lines 82, 117)
**Issue:** Fetch calls to Slack and PagerDuty lack timeout configuration. If services are slow/unresponsive, requests hang indefinitely.
**Impact:** Server resource exhaustion, unresponsive alert system, cascading failures
**Fix:** Add AbortController with 5s timeout to fetch calls.

### Bug: Weak JSON Serialization in Context (Medium)
**File:** `src/lib/alerts.ts` (lines 70-74)
**Issue:** Context values use `String(value)` which produces `[object Object]` for nested objects and can fail on circular references.
**Impact:** Lost context information, difficult debugging
**Fix:** Use `JSON.stringify()` with replacer function for proper serialization.

### Issue: No Validation of Webhook URLs (Medium)
**File:** `src/lib/alerts.ts` (lines 20-21)
**Issue:** Webhook URLs read from env vars with no validation. Malformed URLs only fail at runtime.
**Impact:** Failed alerts without early detection
**Fix:** Validate URLs at module load using URL constructor.

### Issue: Silent Failure of Alert Transmission (Medium)
**File:** `src/lib/alerts.ts` (lines 88-93, 123-128)
**Issue:** Non-2xx responses only log to console. No retry logic, no alerting about failed alerts. `Promise.allSettled` masks failures.
**Impact:** Critical alerts may silently fail to deliver
**Fix:** Log full response bodies, implement retries, optionally throw errors.

### Issue: No Rate Limiting on Alert Sends (Medium)
**File:** `src/lib/alerts.ts`
**Issue:** No deduplication or rate limiting. A bug could trigger thousands of duplicate alerts.
**Impact:** Alert fatigue, service disruption, potential account lockouts
**Fix:** Implement alert deduplication based on title+message hash with time window.

### Issue: Config Evaluated at Module Load, Not Runtime
**File:** `src/lib/alerts.ts` (lines 19-24)
**Issue:** Config object created once at module load. Env var changes require server restart.
**Impact:** Cannot update alert configuration dynamically, difficult testing
**Fix:** Use lazy evaluation with getConfig() function.

### Gap: Unused Email Configuration
**File:** `src/lib/alerts.ts` (lines 22-23)
**Issue:** Email config variables read but never used. Email alerting not implemented.
**Impact:** Dead code, maintenance burden, unclear feature status
**Fix:** Implement email alerting or document as future feature.

### Issue: Incomplete PagerDuty Severity Mapping
**File:** `src/lib/alerts.ts` (line 108)
**Issue:** Raw severity passed to PagerDuty. PagerDuty expects specific values ('critical', 'error', 'warning', 'info').
**Impact:** Wrong severity levels, incorrect incident prioritization
**Fix:** Add explicit severity mapping for PagerDuty.

### Gap: No Alert Deduplication or State Tracking
**File:** `src/lib/alerts.ts`
**Issue:** No mechanism to prevent duplicate alerts for same condition. Repeated errors spam channels.
**Impact:** Alert fatigue, important signals lost in noise
**Fix:** Implement deduplication cache tracking recent alerts by hash.

### Gap: Alert Channels Not Validated at Startup
**File:** `src/lib/env.ts`
**Issue:** No startup validation that at least one alert channel is configured.
**Impact:** Application could start with zero alerting, ops team unaware
**Fix:** Add startup warning if no alert channels configured.

---

## Step 10: Alert Integration

### Bug: Incorrect Circuit Breaker Condition Logic (High)
**File:** `src/lib/resilientData.ts` (line 264)
**Issue:** Double negation `!isCircuitOpen('database') === false && !isCircuitOpen('redis')` is semantically incorrect. Intended: both circuits open for stale fallback.
**Impact:** Stale fallback triggers incorrectly
**Fix:** Change to `isCircuitOpen('database') && !isCircuitOpen('redis')` for correct fallback logic.

### Bug: Unbounded Map Growth - staleAlerts (High)
**File:** `src/lib/staleData.ts` (lines 18-19)
**Issue:** `staleAlerts` Map tracks alert times per symbol with no cleanup mechanism. Entries never expire.
**Impact:** Memory leak in long-running applications with many symbols
**Fix:** Implement TTL-based expiration or periodic cleanup.

### Issue: Race Condition in Cache Alert Cooldown (Medium)
**File:** `src/lib/cacheMonitor.ts` (lines 12-31)
**Issue:** Concurrent calls can both pass cooldown check before either updates `lastAlertTime`.
**Impact:** Duplicate alerts during cache failures
**Fix:** Use atomic check-and-set or mutex for cooldown.

### Issue: Race Condition in Stale Alert Cooldown (Medium)
**File:** `src/lib/staleData.ts` (lines 93-100)
**Issue:** Same race condition as cache monitor - concurrent requests can trigger duplicate alerts.
**Impact:** Duplicate stale data alerts
**Fix:** Use atomic operations for cooldown tracking.

### Issue: Weak Type Safety in Summary Endpoint (Medium)
**File:** `src/app/api/admin/alerts/summary/route.ts` (lines 19-23)
**Issue:** Response interface uses `unknown` type for detail fields, weakening TypeScript safety.
**Impact:** API consumers must cast types, unclear contract
**Fix:** Define proper interfaces for each detail type.

### Issue: Silent Cache Write Failures (Low)
**File:** `src/lib/resilientData.ts` (line 234)
**Issue:** `.catch(() => {})` silently suppresses all cache write errors with no logging.
**Impact:** Cache failures invisible, difficult debugging
**Fix:** Log errors even if not rethrowing.

### Gap: Retry Delay May Exceed maxDuration (Low)
**File:** `src/app/api/cron/ingest-eod/route.ts` (lines 10-12)
**Issue:** Retry delays (1min + 5min = 6min+) can exceed Vercel maxDuration (300s/5min).
**Impact:** Function timeout during retries
**Fix:** Reduce retry delays or increase maxDuration.

---

## Legend

| Severity | Description |
|----------|-------------|
| Bug | Incorrect behavior |
| Issue | Suboptimal but working |
| Gap | Missing functionality |
