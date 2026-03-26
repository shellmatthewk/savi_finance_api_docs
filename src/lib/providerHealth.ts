import { getRedis, isRedisConfigured } from './redis';

export interface ProviderHealth {
  name: string;
  consecutiveFailures: number;
  lastSuccess: string | null;
  lastFailure: string | null;
  lastError: string | null;
  status: 'healthy' | 'degraded' | 'unhealthy';
}

const HEALTH_PREFIX = 'provider:health:';

/**
 * Record a successful ingestion for a provider
 */
export async function recordProviderSuccess(provider: string): Promise<void> {
  const redis = getRedis();
  if (!redis || !isRedisConfigured()) {
    console.debug(`[HEALTH] Redis not configured, skipping health update for ${provider}`);
    return;
  }

  try {
    const key = `${HEALTH_PREFIX}${provider}`;
    await redis.hset(key, {
      consecutiveFailures: '0',
      lastSuccess: new Date().toISOString(),
      status: 'healthy',
    });
  } catch (error) {
    console.error(`Failed to record provider success for ${provider}:`, error);
  }
}

/**
 * Record a failed ingestion attempt for a provider
 */
export async function recordProviderFailure(
  provider: string,
  error: Error
): Promise<number> {
  const redis = getRedis();
  if (!redis || !isRedisConfigured()) {
    console.debug(`[HEALTH] Redis not configured, skipping health update for ${provider}`);
    return 0;
  }

  try {
    const key = `${HEALTH_PREFIX}${provider}`;

    // Increment failure count atomically
    const failures = await redis.hincrby(key, 'consecutiveFailures', 1);

    // Update status and error info (using multi-arg hset for atomicity)
    const status =
      failures >= 3 ? 'unhealthy' : failures >= 1 ? 'degraded' : 'healthy';

    await redis.hset(key, {
      lastFailure: new Date().toISOString(),
      lastError: error.message.substring(0, 255),
      status,
    });

    return failures as number;
  } catch (error) {
    console.error(`Failed to record provider failure for ${provider}:`, error);
    return 0;
  }
}

/**
 * Get health status for a specific provider
 */
export async function getProviderHealth(provider: string): Promise<ProviderHealth> {
  const redis = getRedis();

  if (!redis || !isRedisConfigured()) {
    return {
      name: provider,
      consecutiveFailures: 0,
      lastSuccess: null,
      lastFailure: null,
      lastError: null,
      status: 'healthy',
    };
  }

  try {
    const key = `${HEALTH_PREFIX}${provider}`;
    const data = await redis.hgetall(key);

    return {
      name: provider,
      consecutiveFailures: parseInt(
        (data?.consecutiveFailures as string) || '0',
        10
      ),
      lastSuccess: (data?.lastSuccess as string) || null,
      lastFailure: (data?.lastFailure as string) || null,
      lastError: (data?.lastError as string) || null,
      status: (data?.status as ProviderHealth['status']) || 'healthy',
    };
  } catch (error) {
    console.error(`Failed to get provider health for ${provider}:`, error);
    return {
      name: provider,
      consecutiveFailures: 0,
      lastSuccess: null,
      lastFailure: null,
      lastError: null,
      status: 'healthy',
    };
  }
}

/**
 * Get health status for all providers
 */
export async function getAllProviderHealth(): Promise<ProviderHealth[]> {
  const providers = ['fiat', 'crypto', 'stocks', 'metals'];
  return Promise.all(providers.map((provider) => getProviderHealth(provider)));
}
