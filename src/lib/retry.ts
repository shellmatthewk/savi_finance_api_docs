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
  backoffMultiplier: 5, // 1min -> 5min -> 15min (capped)
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
        timestamp: new Date().toISOString(),
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

/**
 * Wrapper for ingestion tasks with standard retry config
 */
export async function withIngestionRetry<T>(
  provider: string,
  fn: () => Promise<T>
): Promise<T> {
  return withRetry(fn, {
    maxAttempts: 3,
    baseDelayMs: 60_000, // 1 minute
    backoffMultiplier: 5, // 1min -> 5min (2 retries with exponential backoff)
    maxDelayMs: 900_000, // 15 minutes max
    onRetry: (attempt, error, nextDelay) => {
      console.error(`[${provider}] Retry ${attempt}`, {
        error: error.message,
        nextRetryMs: nextDelay,
      });
    },
  });
}

/**
 * Detect if an error is transient and should retry immediately
 */
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

/**
 * Execute function with smart retry - shorter delays for transient errors
 */
export async function withSmartRetry<T>(
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

      // Use shorter delay for transient errors
      let nextDelay: number;
      if (isTransientError(lastError)) {
        // Transient errors get 5s max delay
        nextDelay = Math.min(delayMs, 5000);
      } else {
        // Non-transient errors use exponential backoff
        nextDelay = Math.min(delayMs, opts.maxDelayMs);
      }

      console.warn(`[RETRY] Attempt ${attempt}/${opts.maxAttempts} failed`, {
        error: lastError.message,
        nextRetryIn: `${nextDelay / 1000}s`,
        transient: isTransientError(lastError),
        timestamp: new Date().toISOString(),
      });

      if (opts.onRetry) {
        opts.onRetry(attempt, lastError, nextDelay);
      }

      await sleep(nextDelay);

      // For transient errors, don't increase delay exponentially
      if (!isTransientError(lastError)) {
        delayMs *= opts.backoffMultiplier;
      }
    }
  }

  throw lastError || new Error('Retry failed');
}
