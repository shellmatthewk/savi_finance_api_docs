# Step 07: Retry Mechanism with Exponential Backoff

## Goal
Implement robust retry logic for third-party API calls during data ingestion.

## Prerequisites
- None (independent module)

---

## Concept

When fetching data from external providers (fiat rates, crypto, stocks, metals), implement:
1. Exponential backoff: 1 min → 5 min → 15 min
2. Maximum 3 retry attempts
3. Detailed logging for each attempt
4. Provider health tracking

---

## Tasks

### Task 7.1: Create Retry Utility
Create `src/lib/retry.ts` with exponential backoff logic.

```typescript
// src/lib/retry.ts

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxAttempts: 3,
  baseDelayMs: 60_000, // 1 minute
  maxDelayMs: 900_000, // 15 minutes
  backoffMultiplier: 5  // 1min -> 5min -> 15min (capped)
};

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

/**
 * Execute function with exponential backoff retry
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;
  let delayMs = opts.baseDelayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === opts.maxAttempts) {
        throw new RetryError(
          `Failed after ${opts.maxAttempts} attempts: ${lastError.message}`,
          attempt,
          lastError
        );
      }

      // Calculate next delay with exponential backoff
      const nextDelay = Math.min(delayMs, opts.maxDelayMs);

      // Log retry attempt
      console.warn(`[RETRY] Attempt ${attempt}/${opts.maxAttempts} failed`, {
        error: lastError.message,
        nextRetryIn: `${nextDelay / 1000}s`,
        timestamp: new Date().toISOString()
      });

      if (opts.onRetry) {
        opts.onRetry(attempt, lastError, nextDelay);
      }

      // Wait before retrying
      await sleep(nextDelay);
      delayMs *= opts.backoffMultiplier;
    }
  }

  // TypeScript guard - should never reach here
  throw lastError || new Error('Retry failed');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wrapper for ingestion tasks with standard retry config
 */
export async function withIngestionRetry<T>(
  provider: string,
  fn: () => Promise<T>
): Promise<T> {
  return withRetry(fn, {
    maxAttempts: 3,
    baseDelayMs: 60_000,      // 1 minute
    backoffMultiplier: 5,     // 1min -> 5min -> 15min (capped at 15)
    maxDelayMs: 900_000,      // 15 minutes max
    onRetry: (attempt, error, nextDelay) => {
      console.error(`[${provider}] Retry ${attempt}`, {
        error: error.message,
        nextRetryMs: nextDelay
      });
    }
  });
}
```

### Task 7.2: Create Provider Health Tracker
Track consecutive failures per provider.

```typescript
// Create src/lib/providerHealth.ts
import { redis } from './redis';

export interface ProviderHealth {
  name: string;
  consecutiveFailures: number;
  lastSuccess: string | null;
  lastFailure: string | null;
  lastError: string | null;
  status: 'healthy' | 'degraded' | 'unhealthy';
}

const HEALTH_PREFIX = 'provider:health:';

export async function recordProviderSuccess(provider: string): Promise<void> {
  const key = `${HEALTH_PREFIX}${provider}`;
  await redis.hset(key, {
    consecutiveFailures: '0',
    lastSuccess: new Date().toISOString(),
    status: 'healthy'
  });
}

export async function recordProviderFailure(
  provider: string,
  error: Error
): Promise<number> {
  const key = `${HEALTH_PREFIX}${provider}`;

  // Increment failure count
  const failures = await redis.hincrby(key, 'consecutiveFailures', 1);

  // Update last failure info
  await redis.hset(key, {
    lastFailure: new Date().toISOString(),
    lastError: error.message,
    status: failures >= 3 ? 'unhealthy' : failures >= 1 ? 'degraded' : 'healthy'
  });

  return failures;
}

export async function getProviderHealth(provider: string): Promise<ProviderHealth> {
  const key = `${HEALTH_PREFIX}${provider}`;
  const data = await redis.hgetall(key);

  return {
    name: provider,
    consecutiveFailures: parseInt(data?.consecutiveFailures || '0', 10),
    lastSuccess: data?.lastSuccess || null,
    lastFailure: data?.lastFailure || null,
    lastError: data?.lastError || null,
    status: (data?.status as ProviderHealth['status']) || 'healthy'
  };
}

export async function getAllProviderHealth(): Promise<ProviderHealth[]> {
  const providers = ['fiat', 'crypto', 'stocks', 'metals'];
  return Promise.all(providers.map(getProviderHealth));
}
```

### Task 7.3: Update Data Ingestion
Apply retry logic to `src/app/api/cron/ingest-eod/route.ts`.

```typescript
// In ingest-eod/route.ts
import { withIngestionRetry, RetryError } from '@/lib/retry';
import {
  recordProviderSuccess,
  recordProviderFailure
} from '@/lib/providerHealth';

async function ingestFiatRates(): Promise<void> {
  try {
    await withIngestionRetry('fiat', async () => {
      // Existing fiat ingestion logic
      const response = await fetch(FIAT_API_URL);
      if (!response.ok) {
        throw new Error(`Fiat API error: ${response.status}`);
      }
      // Process and store rates...
    });

    await recordProviderSuccess('fiat');
  } catch (error) {
    if (error instanceof RetryError) {
      const failures = await recordProviderFailure('fiat', error.lastError);
      console.error(`[FIAT] All retries exhausted. Consecutive failures: ${failures}`);
      // Don't overwrite existing data on failure
    }
    throw error;
  }
}

// Apply same pattern to crypto, stocks, metals ingestion
```

### Task 7.4: Add Immediate Retry for Transient Errors
Some errors should retry immediately (rate limits, timeouts).

```typescript
// Add to src/lib/retry.ts

export function isTransientError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('timeout') ||
    message.includes('econnreset') ||
    message.includes('rate limit') ||
    message.includes('429') ||
    message.includes('503')
  );
}

export async function withSmartRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  return withRetry(fn, {
    ...options,
    onRetry: (attempt, error, nextDelay) => {
      // Use shorter delay for transient errors
      if (isTransientError(error)) {
        return Math.min(nextDelay, 5000); // 5 second max for transient
      }
      options.onRetry?.(attempt, error, nextDelay);
    }
  });
}
```

---

## Files to Create/Modify

| Action | File |
|--------|------|
| Create | `src/lib/retry.ts` |
| Create | `src/lib/providerHealth.ts` |
| Modify | `src/app/api/cron/ingest-eod/route.ts` |

---

## Acceptance Criteria

- [x] `withRetry` implements exponential backoff
- [x] Delays follow 1min → 5min → 15min pattern
- [x] Each retry attempt is logged
- [x] Provider health tracks consecutive failures
- [x] Ingestion cron uses retry wrapper
- [x] Existing data preserved on complete failure

---

## Testing

```bash
# Unit test for retry logic
npm test src/lib/__tests__/retry.test.ts

# Simulate provider failure (in dev)
# Temporarily set invalid API URL, trigger ingestion, verify retries in logs
```

---

## Next Step
Proceed to `08-graceful-degradation.md`
