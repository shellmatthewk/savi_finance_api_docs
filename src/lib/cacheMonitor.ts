import { getCacheStats } from './cache';
import { sendAlert, Alerts } from './alerts';

const CACHE_HIT_THRESHOLD = 0.9; // 90%
const ALERT_COOLDOWN = 300_000; // 5 minutes in milliseconds

let lastAlertTime: number | null = null;

/**
 * Check cache health and send alert if hit rate drops below threshold
 */
export async function checkCacheHealth(): Promise<void> {
  try {
    const stats = await getCacheStats();
    const hitRate = stats.hitRate;

    // Only alert if below threshold and cooldown has passed
    if (hitRate < CACHE_HIT_THRESHOLD) {
      const now = Date.now();
      if (lastAlertTime === null || now - lastAlertTime >= ALERT_COOLDOWN) {
        await sendAlert(Alerts.cacheHitRateLow(hitRate, CACHE_HIT_THRESHOLD * 100));
        lastAlertTime = now;
      }
    } else if (lastAlertTime !== null) {
      // Reset cooldown when cache recovers
      lastAlertTime = null;
    }
  } catch (error) {
    console.error('[CACHE_MONITOR] Error checking cache health:', error);
  }
}

/**
 * Get cache health status
 */
export async function getCacheHealthStatus(): Promise<{
  hitRate: number;
  healthy: boolean;
  threshold: number;
}> {
  const stats = await getCacheStats();
  return {
    hitRate: stats.hitRate,
    healthy: stats.hitRate >= CACHE_HIT_THRESHOLD,
    threshold: CACHE_HIT_THRESHOLD,
  };
}
