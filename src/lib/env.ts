/**
 * Environment variable validation and access
 *
 * This module provides type-safe access to environment variables
 * and validates that required variables are present at runtime.
 */

function getEnvVar(name: string, required: boolean = true): string {
  const value = process.env[name];
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value || '';
}

/**
 * Server-side environment variables (not exposed to client)
 */
export const env = {
  // Database
  get DATABASE_URL() {
    return getEnvVar('DATABASE_URL');
  },

  // Redis
  get REDIS_URL() {
    return getEnvVar('REDIS_URL');
  },
  get REDIS_TOKEN() {
    return getEnvVar('REDIS_TOKEN');
  },

  // Stripe (server-side)
  get STRIPE_SECRET_KEY() {
    return getEnvVar('STRIPE_SECRET_KEY');
  },
  get STRIPE_WEBHOOK_SECRET() {
    return getEnvVar('STRIPE_WEBHOOK_SECRET');
  },
  get STRIPE_PRICE_MONTHLY_STANDARD() {
    return getEnvVar('STRIPE_PRICE_MONTHLY_STANDARD');
  },
  get STRIPE_PRICE_ANNUAL_STANDARD() {
    return getEnvVar('STRIPE_PRICE_ANNUAL_STANDARD');
  },

  // Authentication
  get JWT_SECRET() {
    return getEnvVar('JWT_SECRET');
  },

  // Financial data provider
  get FINANCIAL_DATA_API_KEY() {
    return getEnvVar('FINANCIAL_DATA_API_KEY', false); // Optional for now
  },

  // Admin authentication
  get ADMIN_API_KEY() {
    return getEnvVar('ADMIN_API_KEY', false); // Optional
  },

  // Alerting
  get SLACK_WEBHOOK_URL() {
    return getEnvVar('SLACK_WEBHOOK_URL', false); // Optional
  },
  get PAGERDUTY_KEY() {
    return getEnvVar('PAGERDUTY_KEY', false); // Optional
  },
  get ALERT_EMAIL_TO() {
    return getEnvVar('ALERT_EMAIL_TO', false); // Optional
  },
  get ALERT_EMAIL_FROM() {
    return getEnvVar('ALERT_EMAIL_FROM', false); // Optional
  },
} as const;

/**
 * Client-side environment variables (exposed via NEXT_PUBLIC_ prefix)
 */
export const publicEnv = {
  get STRIPE_PUBLISHABLE_KEY() {
    return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
  },
  get APP_URL() {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  },
} as const;
