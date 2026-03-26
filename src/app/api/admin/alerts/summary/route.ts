import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth';
import { getAllProviderHealth } from '@/lib/providerHealth';
import { getCacheHealthStatus } from '@/lib/cacheMonitor';
import { getStaleDataStats } from '@/lib/staleData';
import { refreshServiceHealth } from '@/lib/resilientData';

interface HealthIssue {
  type: 'provider' | 'cache' | 'service' | 'stale_data';
  severity: 'warning' | 'critical';
  component: string;
  message: string;
  details?: Record<string, unknown>;
}

interface AlertSummaryResponse {
  status: 'healthy' | 'issues_detected';
  issues: HealthIssue[];
  details: {
    providers: unknown;
    cache: unknown;
    services: unknown;
    staleData: unknown;
    timestamp: string;
  };
}

export async function GET(request: Request): Promise<NextResponse> {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch all health data in parallel
    const [providers, cache, staleData, serviceHealth] = await Promise.all([
      getAllProviderHealth(),
      getCacheHealthStatus(),
      getStaleDataStats(),
      refreshServiceHealth(),
    ]);

    const issues: HealthIssue[] = [];

    // Check provider health
    for (const provider of providers) {
      if (provider.status === 'unhealthy') {
        issues.push({
          type: 'provider',
          severity: 'critical',
          component: provider.name,
          message: `Provider ${provider.name} is unhealthy with ${provider.consecutiveFailures} consecutive failures`,
          details: {
            consecutiveFailures: provider.consecutiveFailures,
            lastError: provider.lastError,
            lastFailure: provider.lastFailure,
          },
        });
      } else if (provider.status === 'degraded') {
        issues.push({
          type: 'provider',
          severity: 'warning',
          component: provider.name,
          message: `Provider ${provider.name} is degraded with ${provider.consecutiveFailures} failure(s)`,
          details: {
            consecutiveFailures: provider.consecutiveFailures,
            lastError: provider.lastError,
          },
        });
      }
    }

    // Check cache health
    if (!cache.healthy) {
      issues.push({
        type: 'cache',
        severity: 'warning',
        component: 'Redis Cache',
        message: `Cache hit rate is ${(cache.hitRate * 100).toFixed(1)}%, below ${(cache.threshold * 100).toFixed(0)}% threshold`,
        details: {
          currentHitRate: `${(cache.hitRate * 100).toFixed(1)}%`,
          threshold: `${(cache.threshold * 100).toFixed(0)}%`,
        },
      });
    }

    // Check service health
    if (!serviceHealth.redis) {
      issues.push({
        type: 'service',
        severity: 'critical',
        component: 'Redis',
        message: 'Redis service is unavailable',
      });
    }

    if (!serviceHealth.database) {
      issues.push({
        type: 'service',
        severity: 'critical',
        component: 'PostgreSQL',
        message: 'Database service is unavailable',
      });
    }

    // Check stale data
    if (staleData.total > 0) {
      const topStaleSymbols = Object.entries(staleData.bySymbol)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([symbol, count]) => ({ symbol, count }));

      if (topStaleSymbols.length > 0) {
        issues.push({
          type: 'stale_data',
          severity: 'warning',
          component: 'Data Freshness',
          message: `${staleData.total} total stale data requests detected (${staleData.today} today)`,
          details: {
            totalStaleRequests: staleData.total,
            todayStaleRequests: staleData.today,
            topStaleSymbols,
          },
        });
      }
    }

    // Build response
    const response: AlertSummaryResponse = {
      status: issues.length > 0 ? 'issues_detected' : 'healthy',
      issues,
      details: {
        providers: {
          total: providers.length,
          healthy: providers.filter((p) => p.status === 'healthy').length,
          degraded: providers.filter((p) => p.status === 'degraded').length,
          unhealthy: providers.filter((p) => p.status === 'unhealthy').length,
          data: providers,
        },
        cache: {
          hitRate: `${(cache.hitRate * 100).toFixed(1)}%`,
          threshold: `${(cache.threshold * 100).toFixed(0)}%`,
          healthy: cache.healthy,
        },
        services: {
          redis: serviceHealth.redis ? 'healthy' : 'unavailable',
          database: serviceHealth.database ? 'healthy' : 'unavailable',
        },
        staleData: {
          total: staleData.total,
          today: staleData.today,
          bySymbol: staleData.bySymbol,
        },
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[ALERT_SUMMARY] Error:', errorMessage);
    return NextResponse.json(
      {
        error: 'Failed to generate alert summary',
        details: process.env.NODE_ENV !== 'production' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
