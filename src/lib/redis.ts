import { Redis } from '@upstash/redis';

/**
 * Redis client for rate limiting and caching
 *
 * Uses Upstash Redis which is optimized for serverless/edge environments.
 * The client is created lazily to avoid errors during build time
 * when environment variables may not be available.
 */

let redis: Redis | null = null;

/**
 * Check if Redis is configured
 */
export function isRedisConfigured(): boolean {
  return !!(process.env.REDIS_URL && process.env.REDIS_TOKEN);
}

export function getRedis(): Redis | null {
  if (!redis) {
    const url = process.env.REDIS_URL;
    const token = process.env.REDIS_TOKEN;

    if (!url || !token) {
      // Redis not configured - return null for local dev
      return null;
    }

    redis = new Redis({
      url,
      token,
    });
  }

  return redis;
}

/**
 * Check if Redis is available and responsive
 */
export async function pingRedis(): Promise<boolean> {
  try {
    const client = getRedis();
    if (!client) return false;
    const result = await client.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}
