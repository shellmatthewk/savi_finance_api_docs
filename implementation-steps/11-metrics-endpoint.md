# Step 11: Metrics Endpoint

## Goal
Create a comprehensive metrics endpoint for monitoring system health.

## Prerequisites
- Steps 01-03 completed (caching with stats)
- Step 07 completed (provider health tracking)

---

## Tasks

### Task 11.1: Create Metrics Service
Create `src/lib/metrics.ts` to aggregate all metrics.

```typescript
// src/lib/metrics.ts
import { redis } from './redis';
import { db } from '@/db';
import { rates, apiKeys, users } from '@/db/schema';
import { count, sql } from 'drizzle-orm';
import { getCacheStats } from './cache';
import { getAllProviderHealth } from './providerHealth';
import { getStaleDataStats } from './staleData';
import { getServiceHealth } from './resilientData';

export interface SystemMetrics {
  timestamp: string;
  uptime: number;
  api: {
    totalRequests: number;
    requestsToday: number;
    avgResponseTimeMs: number;
  };
  cache: {
    hitRate: number;
    hits: number;
    misses: number;
  };
  data: {
    totalRates: number;
    totalSymbols: number;
    latestIngestion: string | null;
    staleRequestsToday: number;
  };
  providers: Array<{
    name: string;
    status: string;
    consecutiveFailures: number;
    lastSuccess: string | null;
  }>;
  services: {
    redis: string;
    database: string;
  };
  users: {
    total: number;
    activeApiKeys: number;
  };
}

const startTime = Date.now();

export async function collectMetrics(): Promise<SystemMetrics> {
  const [
    cacheStats,
    providerHealth,
    staleStats,
    services,
    apiStats,
    dataStats,
    userStats
  ] = await Promise.all([
    getCacheStats(),
    getAllProviderHealth(),
    getStaleDataStats(),
    getServiceHealth(),
    getApiStats(),
    getDataStats(),
    getUserStats()
  ]);

  return {
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    api: apiStats,
    cache: cacheStats,
    data: {
      totalRates: dataStats.totalRates,
      totalSymbols: dataStats.totalSymbols,
      latestIngestion: dataStats.latestIngestion,
      staleRequestsToday: staleStats.today
    },
    providers: providerHealth.map(p => ({
      name: p.name,
      status: p.status,
      consecutiveFailures: p.consecutiveFailures,
      lastSuccess: p.lastSuccess
    })),
    services: {
      redis: services.redis ? 'up' : 'down',
      database: services.database ? 'up' : 'down'
    },
    users: userStats
  };
}

async function getApiStats(): Promise<SystemMetrics['api']> {
  const [total, today, avgTime] = await Promise.all([
    redis.get('stats:api:total'),
    redis.get(`stats:api:daily:${new Date().toISOString().split('T')[0]}`),
    redis.get('stats:api:avgResponseTime')
  ]);

  return {
    totalRequests: parseInt(total || '0', 10),
    requestsToday: parseInt(today || '0', 10),
    avgResponseTimeMs: parseFloat(avgTime || '0')
  };
}

async function getDataStats(): Promise<{
  totalRates: number;
  totalSymbols: number;
  latestIngestion: string | null;
}> {
  const [rateCount, symbolCount, latest] = await Promise.all([
    db.select({ count: count() }).from(rates),
    db.selectDistinct({ symbol: rates.symbol }).from(rates),
    db.select({ date: rates.createdAt })
      .from(rates)
      .orderBy(sql`${rates.createdAt} DESC`)
      .limit(1)
  ]);

  return {
    totalRates: rateCount[0]?.count || 0,
    totalSymbols: symbolCount.length,
    latestIngestion: latest[0]?.date?.toISOString() || null
  };
}

async function getUserStats(): Promise<SystemMetrics['users']> {
  const [userCount, keyCount] = await Promise.all([
    db.select({ count: count() }).from(users),
    db.select({ count: count() })
      .from(apiKeys)
      .where(sql`${apiKeys.revokedAt} IS NULL`)
  ]);

  return {
    total: userCount[0]?.count || 0,
    activeApiKeys: keyCount[0]?.count || 0
  };
}
```

### Task 11.2: Create Metrics Endpoint

```typescript
// Create src/app/api/admin/metrics/route.ts
import { NextResponse } from 'next/server';
import { collectMetrics } from '@/lib/metrics';
import { verifyAdminAuth } from '@/lib/auth';

export async function GET(request: Request) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const metrics = await collectMetrics();
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('[METRICS] Collection error:', error);
    return NextResponse.json(
      { error: 'Failed to collect metrics' },
      { status: 500 }
    );
  }
}
```

### Task 11.3: Add Request Tracking Middleware
Track API requests for metrics.

```typescript
// Add to src/middleware.ts
import { redis } from '@/lib/redis';

// Track request after handling
export async function middleware(request: NextRequest) {
  const start = Date.now();

  // ... existing middleware logic ...

  // Track API requests (non-blocking)
  if (request.nextUrl.pathname.startsWith('/api/v1/')) {
    const duration = Date.now() - start;
    trackRequest(request.nextUrl.pathname, duration).catch(() => {});
  }

  return response;
}

async function trackRequest(path: string, durationMs: number): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  await Promise.all([
    redis.incr('stats:api:total'),
    redis.incr(`stats:api:daily:${today}`),
    // Rolling average (simplified)
    updateAverageResponseTime(durationMs)
  ]);
}

async function updateAverageResponseTime(durationMs: number): Promise<void> {
  const key = 'stats:api:avgResponseTime';
  const current = parseFloat(await redis.get(key) || '0');

  // Exponential moving average
  const alpha = 0.1;
  const newAvg = current === 0 ? durationMs : alpha * durationMs + (1 - alpha) * current;

  await redis.set(key, newAvg.toFixed(2));
}
```

### Task 11.4: Create Prometheus-Compatible Endpoint

```typescript
// Create src/app/api/admin/metrics/prometheus/route.ts
import { NextResponse } from 'next/server';
import { collectMetrics } from '@/lib/metrics';

export async function GET(request: Request) {
  // Basic auth or IP allowlist for Prometheus
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Basic ${Buffer.from(
    `${process.env.PROMETHEUS_USER}:${process.env.PROMETHEUS_PASS}`
  ).toString('base64')}`;

  if (authHeader !== expectedAuth && process.env.NODE_ENV === 'production') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const metrics = await collectMetrics();

  // Format as Prometheus exposition format
  const lines = [
    `# HELP finflux_api_requests_total Total API requests`,
    `# TYPE finflux_api_requests_total counter`,
    `finflux_api_requests_total ${metrics.api.totalRequests}`,
    '',
    `# HELP finflux_cache_hit_rate Cache hit rate`,
    `# TYPE finflux_cache_hit_rate gauge`,
    `finflux_cache_hit_rate ${metrics.cache.hitRate}`,
    '',
    `# HELP finflux_uptime_seconds Server uptime`,
    `# TYPE finflux_uptime_seconds gauge`,
    `finflux_uptime_seconds ${metrics.uptime}`,
    '',
    `# HELP finflux_provider_failures Provider consecutive failures`,
    `# TYPE finflux_provider_failures gauge`,
    ...metrics.providers.map(
      p => `finflux_provider_failures{provider="${p.name}"} ${p.consecutiveFailures}`
    ),
    '',
    `# HELP finflux_service_up Service availability`,
    `# TYPE finflux_service_up gauge`,
    `finflux_service_up{service="redis"} ${metrics.services.redis === 'up' ? 1 : 0}`,
    `finflux_service_up{service="database"} ${metrics.services.database === 'up' ? 1 : 0}`,
    '',
    `# HELP finflux_data_total Total rates in database`,
    `# TYPE finflux_data_total gauge`,
    `finflux_data_total ${metrics.data.totalRates}`,
  ];

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; version=0.0.4'
    }
  });
}
```

---

## Files to Create/Modify

| Action | File |
|--------|------|
| Create | `src/lib/metrics.ts` |
| Create | `src/app/api/admin/metrics/route.ts` |
| Create | `src/app/api/admin/metrics/prometheus/route.ts` |
| Modify | `src/middleware.ts` (add request tracking) |

---

## Acceptance Criteria

- [ ] `/api/admin/metrics` returns comprehensive JSON metrics
- [ ] `/api/admin/metrics/prometheus` returns Prometheus format
- [ ] Request counts tracked in Redis
- [ ] Average response time calculated
- [ ] All critical metrics included (cache, providers, services)

---

## Testing

```bash
# Get JSON metrics
curl "http://localhost:3000/api/admin/metrics" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Get Prometheus metrics
curl "http://localhost:3000/api/admin/metrics/prometheus" \
  -u "prometheus_user:prometheus_pass"

# Verify request tracking
# Make several API calls, then check metrics.api.requestsToday
```

---

## External Monitoring Integration

For production, consider integrating with:
- **Datadog:** Use dogstatsd library
- **New Relic:** Use @newrelic/next package
- **Grafana Cloud:** Use Prometheus endpoint

---

## Next Step
Proceed to `12-metals-api.md`
