/**
 * Logging utilities for sensitive data protection
 * Ensures passwords, tokens, and API keys are never logged
 */

/**
 * Sensitive keys that should be redacted from logs
 */
const SENSITIVE_KEYS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'authorization',
  'bearer',
  'jwtSecret',
  'stripeSecret',
  'adminKey',
];

/**
 * Sanitize an object for logging by redacting sensitive fields
 * Performs shallow sanitization (doesn't recurse into nested objects)
 */
export function sanitizeForLogging(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const sanitized = { ...obj };

  for (const key of Object.keys(sanitized)) {
    const isSensitive = SENSITIVE_KEYS.some((sensitiveKey) =>
      key.toLowerCase().includes(sensitiveKey.toLowerCase())
    );

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Sanitize an error for logging
 * Includes stack trace but sanitizes message content
 */
export function sanitizeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: sanitizeErrorMessage(error.message),
      stack: error.stack,
    };
  }

  if (typeof error === 'object' && error !== null) {
    return sanitizeForLogging(error as Record<string, unknown>);
  }

  return { error: String(error) };
}

/**
 * Sanitize error message by removing potential sensitive data
 */
function sanitizeErrorMessage(message: string): string {
  // Remove email addresses
  message = message.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');

  // Remove common token/key patterns
  message = message.replace(/(sk_|pk_|vl_)[a-zA-Z0-9_]{32,}/g, '[KEY]');

  // Remove IP addresses
  message = message.replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, '[IP]');

  return message;
}

/**
 * Create a safe logging function
 * Use this wrapper when logging request/response data
 */
export function createSafeLogger(
  label: string
): {
  info: (data: unknown) => void;
  error: (data: unknown) => void;
  warn: (data: unknown) => void;
} {
  return {
    info: (data: unknown) => {
      if (typeof data === 'object' && data !== null && !(data instanceof Date)) {
        console.log(`[${label}]`, sanitizeForLogging(data as Record<string, unknown>));
      } else {
        console.log(`[${label}]`, data);
      }
    },
    error: (data: unknown) => {
      const sanitized = data instanceof Error ? sanitizeError(data) : sanitizeForLogging(
        typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : { error: String(data) }
      );
      console.error(`[${label}]`, sanitized);
    },
    warn: (data: unknown) => {
      if (typeof data === 'object' && data !== null && !(data instanceof Date)) {
        console.warn(`[${label}]`, sanitizeForLogging(data as Record<string, unknown>));
      } else {
        console.warn(`[${label}]`, data);
      }
    },
  };
}
