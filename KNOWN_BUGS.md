# Known Bugs & Fixes

## Fixed Bugs

### Step 10 Fixes

1. **FIXED: Circuit Breaker Logic Error in resilientData.ts (Line 264)**
   - Issue: Incorrect condition `!isCircuitOpen('database') === false && !isCircuitOpen('redis')`
   - Fix: Changed to `isCircuitOpen('database') && !isCircuitOpen('redis')`
   - Impact: Now correctly falls back to stale cached data when database circuit is open and Redis is available

2. **FIXED: Memory Leak in staleData.ts - staleAlerts Map**
   - Issue: staleAlerts Map had no cleanup mechanism, entries accumulated indefinitely
   - Fix: Added `cleanupStaleAlerts()` function that runs every 24 hours to remove entries older than 24 hours
   - Impact: Prevents unbounded memory growth from tracking per-symbol alert cooldowns

3. **FIXED: Race Condition in cacheMonitor.ts Alert Cooldown**
   - Issue: `lastAlertTime` set AFTER sending alert, causing duplicate alerts if alert sending is slow
   - Fix: Set `lastAlertTime = now` BEFORE calling `sendAlert()`
   - Impact: Prevents alert spam during high-load conditions

4. **FIXED: Race Condition in staleData.ts Alert Cooldown (Lines 93-100)**
   - Issue: Same race condition - `staleAlerts.set()` called AFTER `sendAlert()`
   - Fix: Set cooldown timestamp BEFORE sending alert
   - Impact: Prevents duplicate stale data alerts

### Step 11 Fixes

5. **FIXED: Prometheus Auth Header Parsing with Colons (Line 28-39)**
   - Issue: Credentials split by ':' with `.split(':')` failed for passwords containing colons
   - Fix: Compare entire decoded credentials string instead of splitting; use `Buffer.from(credentials)` directly
   - Impact: Passwords with colons now properly authenticated

6. **FIXED: Module Uptime Persistence Documentation**
   - Issue: `MODULE_START_TIME` captured at module load but not documented as transient in serverless
   - Fix: Added comment explaining uptime resets on cold starts; recommended Redis for persistent tracking
   - Impact: Clarifies uptime metric behavior in serverless environments

### Step 12 Fixes

7. **FIXED: Missing API Key Header in metals.ts**
   - Issue: Metals API requests didn't include API key header
   - Fix: Added conditional `X-API-Key` header when `METALS_API_KEY` is configured
   - Impact: Better API rate limiting and authentication

8. **FIXED: JSON Parsing Error in metals.ts (Line 60)**
   - Issue: `await response.json()` without try-catch for malformed responses
   - Fix: Wrapped JSON parsing in try-catch with descriptive error message
   - Impact: Prevents JSON parsing crashes on malformed API responses

9. **FIXED: Missing Metals in Response Logging (Lines 63-72)**
   - Issue: No warning logged when metals missing from API response
   - Fix: Track `missingMetals` array and log warning if any metals are missing
   - Impact: Better observability of incomplete API responses

10. **FIXED: Cache Invalidation Timing in ingest-eod/route.ts (Lines 254-260)**
    - Issue: Cache invalidation occurred AFTER database insert, allowing stale cache to be served
    - Fix: Moved cache invalidation BEFORE database insert
    - Impact: Eliminates window where old cached data could be served immediately after new data is available

## Testing Notes

All fixes have been applied to:
- `/src/lib/resilientData.ts`
- `/src/lib/staleData.ts`
- `/src/lib/cacheMonitor.ts`
- `/src/app/api/admin/metrics/prometheus/route.ts`
- `/src/lib/metrics.ts`
- `/src/lib/providers/metals.ts`
- `/src/app/api/cron/ingest-eod/route.ts`

Recommend testing:
- Circuit breaker fallback behavior with database down
- Prometheus endpoint with credentials containing special characters
- Metals API with incomplete responses
- Cache invalidation timing during EOD ingestion
