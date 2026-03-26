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

    // Increment attempts
    const attempts = await redis.incr(attemptsKey);

    // Set expiration on first attempt
    if (attempts === 1) {
      await redis.expire(attemptsKey, AUTH_RATE_LIMIT.windowMs / 1000);
    }

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
    // Fail open in case of Redis error
    return { allowed: true };
  }
}

/**
 * Reset rate limit for an identifier after successful login
 */
export async function resetAuthRateLimit(identifier: string): Promise<void> {
  const redis = getRedis();

  if (!redis || !isRedisConfigured()) {
    return;
  }

  try {
    await redis.del(`auth:ratelimit:${identifier}`);
  } catch (error) {
    console.error('Failed to reset rate limit:', error);
  }
}
