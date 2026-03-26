import { NextResponse } from 'next/server';
import { refreshServiceHealth } from '@/lib/resilientData';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health/detailed
 *
 * Comprehensive health check endpoint that tests both Redis and database
 * Returns individual service status and overall system status
 */
export async function GET() {
  const health = await refreshServiceHealth();

  const allHealthy = health.redis && health.database;
  const anyHealthy = health.redis || health.database;

  const response = {
    status: allHealthy ? 'healthy' : anyHealthy ? 'degraded' : 'unhealthy',
    services: {
      redis: {
        status: health.redis ? 'up' : 'down',
      },
      database: {
        status: health.database ? 'up' : 'down',
      },
    },
    timestamp: new Date().toISOString(),
  };

  const statusCode = allHealthy ? 200 : anyHealthy ? 200 : 503;

  return NextResponse.json(response, { status: statusCode });
}
