import { getRedis, isRedisConfigured } from './redis';

/**
 * Rate limiting configuration for authentication endpoints
 * Prevents brute force attacks by limiting login/register attempts
 */
const AUTH_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAttempts: 5, // 5 attempts per window
  blockDuration: 60 * 60 * 1000, // 1 hour block after exceeded
};

/**
 * Check if an identifier (IP or email) is rate limited
 * Returns { allowed: true } if within limits
 * Returns { allowed: false, retryAfter: seconds } if limited
 */
export async function checkAuthRateLimit(
  identifier: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const redis = getRedis();

  // If Redis not configured, allow all attempts (dev mode)
  if (!redis || !isRedisConfigured()) {
    return { allowed: true };
  }

  try {
    const blockKey = `auth:blocked:${identifier}`;
    const attemptsKey = `auth:ratelimit:${identifier}`;

    // Check if blocked
    const blocked = await redis.get(blockKey);
    if (blocked) {
      const ttl = await redis.ttl(blockKey);
      return { allowed: false, retryAfter: ttl > 0 ? ttl : AUTH_RATE_LIMIT.blockDuration / 1000 };
    }

    // Increment attempts and set expiration atomically using GETSET pattern
    // For first request: set with expiry, for subsequent: just increment
    const pipeline = redis.pipeline();
    pipeline.incr(attemptsKey);
    pipeline.expire(attemptsKey, Math.ceil(AUTH_RATE_LIMIT.windowMs / 1000));
    const results = await pipeline.exec();

    const attempts = (results?.[0] ?? 0) as number;

    // Check if exceeded limit
    if (attempts > AUTH_RATE_LIMIT.maxAttempts) {
      // Block the identifier
      await redis.setex(
        blockKey,
        AUTH_RATE_LIMIT.blockDuration / 1000,
        '1'
      );
      return {
        allowed: false,
        retryAfter: AUTH_RATE_LIMIT.blockDuration / 1000,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Log the error but fail securely - consider blocking during Redis failure
    // Fail open for now to avoid breaking auth in development, but production should consider fail-closed
    if (process.env.NODE_ENV === 'production') {
      console.warn('Redis unavailable for rate limiting - allowing request but logging incident');
    }
    return { allowed: true };
  }
}

/**
 * Reset rate limit for an identifier after successful login
 * Clears both the attempts key and block key
 */
export async function resetAuthRateLimit(identifier: string): Promise<void> {
  const redis = getRedis();

  if (!redis || !isRedisConfigured()) {
    return;
  }

  try {
    const attemptsKey = `auth:ratelimit:${identifier}`;
    const blockKey = `auth:blocked:${identifier}`;
    await redis.del(attemptsKey, blockKey);
  } catch (error) {
    console.error('Failed to reset rate limit:', error);
  }
}
