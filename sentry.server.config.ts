import * as Sentry from '@sentry/nextjs';

const environment = process.env.NODE_ENV || 'development';
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    // Set a lower sample rate for production to avoid high costs
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    // Capture performance monitoring for API routes
    integrations: [
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection(),
    ],
    beforeSend(event, hint) {
      // Don't send 404 errors
      if (event.request?.url?.includes('/404')) {
        return null;
      }

      // Filter out certain low-priority errors
      if (hint.originalException) {
        const message = String(hint.originalException);
        if (message.includes('ECONNREFUSED') || message.includes('ETIMEDOUT')) {
          return event;
        }
      }

      return event;
    },
    // Set context for server-side errors
    initialScope: {
      tags: {
        service: 'vaultline-api',
      },
    },
  });
}

// Capture unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  Sentry.captureException(new Error(`Unhandled Rejection at ${promise}: ${reason}`));
});

process.on('uncaughtException', (error) => {
  Sentry.captureException(error);
  process.exit(1);
});
