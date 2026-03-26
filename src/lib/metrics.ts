import { getRedis, isRedisConfigured } from './redis';
import { getDb } from '@/db/client';
import { users, apiKeys, rates } from '@/db/schema';
import { count } from 'drizzle-orm';
import { getAllProviderHealth } from './providerHealth';
import { getCacheStats } from './cache';

const MODULE_START_TIME = Date.now();

export interface SystemMetrics {
  timestamp: string;
  uptime: number; // milliseconds
  api: {
    total: number;
    daily: number;
    avgResponseTime: number; // milliseconds
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  data: {
    symbols: number;
    rates: number;
  };
  providers: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    consecutiveFailures: number;
  }>;
  services: {
    redis: boolean;
    database: boolean;
  };
  users: {
    total: number;
    apiKeys: number;
  };
}

/**
 * Get API request statistics from Redis
 */
async function getApiStats(): Promise<{
  total: number;
  daily: number;
  avgResponseTime: number;
}> {
  const redis = getRedis();
  if (!redis || !isRedisConfigured()) {
    return { total: 0, daily: 0, avgResponseTime: 0 };
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const [total, daily, totalTime, count] = await Promise.all([
      redis.get('stats:api:total'),
      redis.get(`stats:api:daily:${today}`),
      redis.get('stats:api:totaltime'),
      redis.get('stats:api:count'),
    ]);

    const totalRequests = parseInt(String(total || '0'), 10);
    const dailyRequests = parseInt(String(daily || '0'), 10);
    const totalTimeMs = parseInt(String(totalTime || '0'), 10);
    const requestCount = parseInt(String(count || '0'), 10);
    const avgResponseTime = requestCount > 0 ? totalTimeMs / requestCount : 0;

    return {
      total: totalRequests,
      daily: dailyRequests,
      avgResponseTime,
    };
  } catch (error) {
    console.error('Failed to get API stats:', error);
    return { total: 0, daily: 0, avgResponseTime: 0 };
  }
}

/**
 * Get data statistics from database
 */
async function getDataStats(): Promise<{
  symbols: number;
  rates: number;
}> {
  try {
    const db = getDb();

    const [symbolsResult, ratesResult] = await Promise.all([
      db.selectDistinct({ symbol: rates.symbol }).from(rates),
      db.select({ count: count() }).from(rates),
    ]);

    return {
      symbols: symbolsResult.length,
      rates: ratesResult[0]?.count ?? 0,
    };
  } catch (error) {
    console.error('Failed to get data stats:', error);
    return { symbols: 0, rates: 0 };
  }
}

/**
 * Get user and API key statistics from database
 */
async function getUserStats(): Promise<{
  total: number;
  apiKeys: number;
}> {
  try {
    const db = getDb();

    const [usersResult, keysResult] = await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(apiKeys),
    ]);

    return {
      total: usersResult[0]?.count ?? 0,
      apiKeys: keysResult[0]?.count ?? 0,
    };
  } catch (error) {
    console.error('Failed to get user stats:', error);
    return { total: 0, apiKeys: 0 };
  }
}

/**
 * Collect all metrics in parallel
 */
export async function collectMetrics(): Promise<SystemMetrics> {
  const [apiStats, cacheStats, dataStats, userStats, providerHealth] =
    await Promise.all([
      getApiStats(),
      getCacheStats(),
      getDataStats(),
      getUserStats(),
      getAllProviderHealth(),
    ]);

  const redis = getRedis();

  return {
    timestamp: new Date().toISOString(),
    uptime: Date.now() - MODULE_START_TIME,
    api: apiStats,
    cache: cacheStats,
    data: dataStats,
    providers: providerHealth.map((p) => ({
      name: p.name,
      status: p.status,
      consecutiveFailures: p.consecutiveFailures,
    })),
    services: {
      redis: !!(redis && isRedisConfigured()),
      database: true, // If we got here, database is working
    },
    users: userStats,
  };
}
