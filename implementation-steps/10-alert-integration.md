# Step 10: Alert Integration

## Goal
Wire alerting into existing failure points throughout the application.

## Prerequisites
- Step 07 completed (retry mechanism)
- Step 09 completed (alert service)

---

## Tasks

### Task 10.1: Alert on Ingestion Failure
Integrate alerts into the retry mechanism.

```typescript
// Update src/app/api/cron/ingest-eod/route.ts
import { sendAlert, Alerts } from '@/lib/alerts';
import { recordProviderFailure, getProviderHealth } from '@/lib/providerHealth';

async function ingestWithAlerts(
  provider: string,
  ingestFn: () => Promise<void>
): Promise<{ success: boolean; error?: string }> {
  try {
    await withIngestionRetry(provider, ingestFn);
    await recordProviderSuccess(provider);
    return { success: true };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const failures = await recordProviderFailure(provider, err);

    // Send alert
    await sendAlert(Alerts.ingestionFailure(provider, err.message, failures));

    return { success: false, error: err.message };
  }
}

// In the main ingestion handler:
export async function GET(request: NextRequest) {
  // Verify cron secret...

  const results = await Promise.allSettled([
    ingestWithAlerts('fiat', ingestFiatRates),
    ingestWithAlerts('crypto', ingestCryptoRates),
    ingestWithAlerts('stocks', ingestStockRates),
    ingestWithAlerts('metals', ingestMetalRates)
  ]);

  // Count failures
  const failures = results.filter(
    r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
  );

  if (failures.length === results.length) {
    // All providers failed - critical alert
    await sendAlert({
      title: 'Complete Ingestion Failure',
      message: 'All data providers failed during daily ingestion',
      severity: 'critical',
      context: { failedProviders: failures.length }
    });
  }

  return NextResponse.json({
    success: failures.length < results.length,
    results: results.map((r, i) => ({
      provider: ['fiat', 'crypto', 'stocks', 'metals'][i],
      status: r.status === 'fulfilled' ? r.value : { success: false }
    }))
  });
}
```

### Task 10.2: Alert on Cache Degradation
Monitor and alert on cache performance.

```typescript
// Create src/lib/cacheMonitor.ts
import { getCacheStats } from './cache';
import { sendAlert, Alerts } from './alerts';

const CACHE_HIT_THRESHOLD = 0.9; // 90%
let lastAlertTime = 0;
const ALERT_COOLDOWN = 300_000; // 5 minutes

export async function checkCacheHealth(): Promise<void> {
  const stats = await getCacheStats();

  if (stats.hitRate < CACHE_HIT_THRESHOLD) {
    const now = Date.now();

    // Prevent alert spam
    if (now - lastAlertTime > ALERT_COOLDOWN) {
      await sendAlert(Alerts.cacheHitRateLow(stats.hitRate, CACHE_HIT_THRESHOLD * 100));
      lastAlertTime = now;
    }
  }
}

// Can be called from a health check or scheduled job
```

### Task 10.3: Alert on Service Degradation
Wire alerts into graceful degradation.

```typescript
// Update src/lib/resilientData.ts
import { sendAlert, Alerts } from './alerts';

let redisAlertSent = false;
let dbAlertSent = false;

async function checkRedisHealth(): Promise<boolean> {
  try {
    await redis.ping();
    serviceHealth.redis = true;
    redisAlertSent = false; // Reset alert flag on recovery
    return true;
  } catch {
    serviceHealth.redis = false;

    // Send alert only once per outage
    if (!redisAlertSent) {
      await sendAlert(Alerts.serviceDown('Redis'));
      redisAlertSent = true;
    }

    return false;
  }
}

async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await db.execute('SELECT 1');
    serviceHealth.database = true;
    dbAlertSent = false;
    return true;
  } catch {
    serviceHealth.database = false;

    if (!dbAlertSent) {
      await sendAlert(Alerts.serviceDown('PostgreSQL'));
      dbAlertSent = true;
    }

    return false;
  }
}
```

### Task 10.4: Alert on Stale Data
Trigger alerts when serving old data.

```typescript
// Update src/lib/staleData.ts
import { sendAlert, Alerts } from './alerts';

const staleAlerts = new Map<string, number>(); // symbol -> last alert time
const STALE_ALERT_THRESHOLD_DAYS = 2;
const STALE_ALERT_COOLDOWN = 3600_000; // 1 hour

export async function logStaleDataUsage(
  symbol: string,
  requestedDate: string,
  returnedDate: string,
  reason: string,
  dataAge: number
): Promise<void> {
  console.warn('[STALE_DATA]', {
    symbol,
    requestedDate,
    returnedDate,
    reason,
    dataAge
  });

  // Alert if data is significantly old
  if (dataAge >= STALE_ALERT_THRESHOLD_DAYS) {
    const lastAlert = staleAlerts.get(symbol) || 0;
    const now = Date.now();

    if (now - lastAlert > STALE_ALERT_COOLDOWN) {
      await sendAlert(Alerts.staleDataServed(symbol, dataAge));
      staleAlerts.set(symbol, now);
    }
  }

  await incrementStaleDataCount(symbol);
}
```

### Task 10.5: Create Alert Summary Endpoint

```typescript
// Create src/app/api/admin/alerts/summary/route.ts
import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth';
import { getAllProviderHealth } from '@/lib/providerHealth';
import { getCacheStats } from '@/lib/cache';
import { getStaleDataStats } from '@/lib/staleData';
import { getServiceHealth } from '@/lib/resilientData';

export async function GET(request: Request) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [providers, cache, stale, services] = await Promise.all([
    getAllProviderHealth(),
    getCacheStats(),
    getStaleDataStats(),
    getServiceHealth()
  ]);

  // Determine overall status
  const issues: string[] = [];

  if (providers.some(p => p.status === 'unhealthy')) {
    issues.push('Provider failures detected');
  }
  if (cache.hitRate < 0.9) {
    issues.push('Cache hit rate below 90%');
  }
  if (stale.today > 100) {
    issues.push('High stale data volume today');
  }
  if (!services.redis || !services.database) {
    issues.push('Service degradation active');
  }

  return NextResponse.json({
    status: issues.length === 0 ? 'healthy' : 'issues_detected',
    issues,
    details: {
      providers,
      cache: {
        hitRate: `${(cache.hitRate * 100).toFixed(1)}%`,
        hits: cache.hits,
        misses: cache.misses
      },
      staleData: stale,
      services
    },
    timestamp: new Date().toISOString()
  });
}
```

---

## Files to Modify

| Action | File |
|--------|------|
| Modify | `src/app/api/cron/ingest-eod/route.ts` |
| Create | `src/lib/cacheMonitor.ts` |
| Modify | `src/lib/resilientData.ts` |
| Modify | `src/lib/staleData.ts` |
| Create | `src/app/api/admin/alerts/summary/route.ts` |

---

## Acceptance Criteria

- [ ] Ingestion failures trigger Slack alerts
- [ ] >2 consecutive failures trigger critical (PagerDuty)
- [ ] Redis/DB outages trigger alerts (once per outage)
- [ ] Cache degradation triggers alerts
- [ ] Stale data usage triggers alerts after threshold
- [ ] Alert summary endpoint shows all active issues

---

## Testing

```bash
# Simulate ingestion failure
# (Temporarily break provider URL)
curl "http://localhost:3000/api/cron/ingest-eod?secret=YOUR_CRON_SECRET"
# Verify alert in Slack

# Check alert summary
curl "http://localhost:3000/api/admin/alerts/summary" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## Next Step
Proceed to `11-metrics-endpoint.md`
