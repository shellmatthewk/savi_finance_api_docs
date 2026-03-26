import { getRedis } from './redis';

const CACHE_PREFIX = 'cache:';
const DEFAULT_TTL = 86400; // 24 hours in seconds

export interface CacheOptions {
  ttl?: number; // seconds
  prefix?: string;
}

export async function getFromCache<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const data = await redis.get(`${CACHE_PREFIX}${key}`);
    if (!data) return null;
    // Upstash Redis automatically parses JSON, so data may already be an object
    if (typeof data === 'string') {
      return JSON.parse(data) as T;
    }
    return data as T;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

export async function setInCache<T>(
  key: string,
  value: T,
  options: CacheOptions = {}
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const ttl = options.ttl ?? DEFAULT_TTL;
    await redis.setex(
      `${CACHE_PREFIX}${key}`,
      ttl,
      JSON.stringify(value)
    );
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

export async function deleteFromCache(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.del(`${CACHE_PREFIX}${key}`);
  } catch (error) {
    console.error('Cache delete error:', error);
  }
}

export async function deleteCachePattern(pattern: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const keys = await redis.keys(`${CACHE_PREFIX}${pattern}`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error('Cache pattern delete error:', error);
  }
}

// Generate cache key for rate queries
export function ratesCacheKey(symbol: string, date?: string): string {
  return date ? `rates:${symbol}:${date}` : `rates:${symbol}:latest`;
}

export function historyRatesCacheKey(
  symbol: string,
  startDate: string,
  endDate: string
): string {
  return `rates:history:${symbol}:${startDate}:${endDate}`;
}

// Cache stats tracking
export async function incrementCacheHit(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.incr('stats:cache:hits');
  } catch (error) {
    console.error('Cache stats error:', error);
  }
}

export async function incrementCacheMiss(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.incr('stats:cache:misses');
  } catch (error) {
    console.error('Cache stats error:', error);
  }
}

export async function getCacheStats(): Promise<{
  hits: number;
  misses: number;
  hitRate: number;
}> {
  const redis = getRedis();
  if (!redis) {
    return { hits: 0, misses: 0, hitRate: 0 };
  }

  try {
    const [hits, misses] = await Promise.all([
      redis.get('stats:cache:hits'),
      redis.get('stats:cache:misses')
    ]);
    const h = parseInt(String(hits || '0'), 10);
    const m = parseInt(String(misses || '0'), 10);
    const total = h + m;
    return {
      hits: h,
      misses: m,
      hitRate: total > 0 ? h / total : 0
    };
  } catch (error) {
    console.error('Cache stats error:', error);
    return { hits: 0, misses: 0, hitRate: 0 };
  }
}
