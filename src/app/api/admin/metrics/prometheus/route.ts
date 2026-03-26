import { NextResponse } from 'next/server';
import { collectMetrics } from '@/lib/metrics';
import { timingSafeEqual } from 'crypto';

/**
 * Verify Prometheus basic auth credentials
 */
function verifyPrometheusAuth(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const prometheusUser = process.env.PROMETHEUS_USER;
  const prometheusPass = process.env.PROMETHEUS_PASS;

  if (!prometheusUser || !prometheusPass) {
    console.warn('PROMETHEUS_USER or PROMETHEUS_PASS environment variable not set');
    return false;
  }

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false;
  }

  try {
    const credentials = Buffer.from(
      authHeader.slice(6), // Remove "Basic " prefix
      'base64'
    ).toString('utf-8');

    const [username, password] = credentials.split(':');
    const expectedAuth = `${prometheusUser}:${prometheusPass}`;

    // Timing-safe comparison
    const userBuffer = Buffer.from(credentials);
    const expectedBuffer = Buffer.from(expectedAuth);

    if (
      userBuffer.length === expectedBuffer.length &&
      timingSafeEqual(userBuffer, expectedBuffer)
    ) {
      return true;
    }
  } catch {
    // Invalid base64 or other parsing error
  }

  return false;
}

/**
 * Format metrics in Prometheus exposition format
 */
function formatPrometheusMetrics(metrics: Awaited<ReturnType<typeof collectMetrics>>): string {
  const lines: string[] = [];

  // HELP and TYPE lines
  lines.push('# HELP finflux_requests_total Total API requests');
  lines.push('# TYPE finflux_requests_total counter');
  lines.push(`finflux_requests_total ${metrics.api.total}`);

  lines.push('# HELP finflux_requests_daily Daily API requests');
  lines.push('# TYPE finflux_requests_daily gauge');
  lines.push(`finflux_requests_daily ${metrics.api.daily}`);

  lines.push('# HELP finflux_api_response_time_ms Average API response time in milliseconds');
  lines.push('# TYPE finflux_api_response_time_ms gauge');
  lines.push(`finflux_api_response_time_ms ${metrics.api.avgResponseTime.toFixed(2)}`);

  lines.push('# HELP finflux_cache_hit_rate Cache hit rate');
  lines.push('# TYPE finflux_cache_hit_rate gauge');
  lines.push(`finflux_cache_hit_rate ${(metrics.cache.hitRate * 100).toFixed(2)}`);

  lines.push('# HELP finflux_cache_hits Total cache hits');
  lines.push('# TYPE finflux_cache_hits counter');
  lines.push(`finflux_cache_hits ${metrics.cache.hits}`);

  lines.push('# HELP finflux_cache_misses Total cache misses');
  lines.push('# TYPE finflux_cache_misses counter');
  lines.push(`finflux_cache_misses ${metrics.cache.misses}`);

  lines.push('# HELP finflux_uptime_seconds Service uptime in seconds');
  lines.push('# TYPE finflux_uptime_seconds gauge');
  lines.push(`finflux_uptime_seconds ${(metrics.uptime / 1000).toFixed(2)}`);

  lines.push('# HELP finflux_data_symbols Total unique symbols');
  lines.push('# TYPE finflux_data_symbols gauge');
  lines.push(`finflux_data_symbols ${metrics.data.symbols}`);

  lines.push('# HELP finflux_data_rates Total rate records');
  lines.push('# TYPE finflux_data_rates counter');
  lines.push(`finflux_data_rates ${metrics.data.rates}`);

  lines.push('# HELP finflux_users_total Total users');
  lines.push('# TYPE finflux_users_total gauge');
  lines.push(`finflux_users_total ${metrics.users.total}`);

  lines.push('# HELP finflux_api_keys_total Total API keys');
  lines.push('# TYPE finflux_api_keys_total gauge');
  lines.push(`finflux_api_keys_total ${metrics.users.apiKeys}`);

  lines.push('# HELP finflux_service_up Service availability');
  lines.push('# TYPE finflux_service_up gauge');
  lines.push(`finflux_service_up{service="redis"} ${metrics.services.redis ? 1 : 0}`);
  lines.push(`finflux_service_up{service="database"} ${metrics.services.database ? 1 : 0}`);

  lines.push('# HELP finflux_provider_failures Provider consecutive failures');
  lines.push('# TYPE finflux_provider_failures gauge');
  for (const provider of metrics.providers) {
    lines.push(`finflux_provider_failures{provider="${provider.name}"} ${provider.consecutiveFailures}`);
  }

  lines.push('# HELP finflux_provider_status Provider health status (1=healthy, 0.5=degraded, 0=unhealthy)');
  lines.push('# TYPE finflux_provider_status gauge');
  for (const provider of metrics.providers) {
    const statusValue =
      provider.status === 'healthy' ? 1 : provider.status === 'degraded' ? 0.5 : 0;
    lines.push(`finflux_provider_status{provider="${provider.name}"} ${statusValue}`);
  }

  return lines.join('\n') + '\n';
}

export async function GET(request: Request) {
  if (!verifyPrometheusAuth(request)) {
    const clientIp =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    console.warn('[PROMETHEUS_AUDIT] Unauthorized metrics request', {
      ip: clientIp,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const clientIp =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    console.info('[PROMETHEUS_AUDIT] Prometheus metrics requested', {
      ip: clientIp,
      timestamp: new Date().toISOString(),
    });

    const metrics = await collectMetrics();
    const prometheusText = formatPrometheusMetrics(metrics);

    return new NextResponse(prometheusText, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      },
    });
  } catch (error) {
    const clientIp =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    console.error('[PROMETHEUS_AUDIT] Prometheus metrics retrieval failed', {
      ip: clientIp,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to collect metrics',
      },
      { status: 500 }
    );
  }
}
