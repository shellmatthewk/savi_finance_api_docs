import * as Sentry from '@sentry/nextjs';

const environment = process.env.NODE_ENV || 'development';
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    // Set sample rate for error events
    beforeSend(event) {
      // Ignore certain errors in development
      if (environment !== 'production') {
        return event;
      }

      // Filter out client-side errors that are not important
      if (event.exception) {
        const error = event.exception.values?.[0];
        if (error?.type === 'NetworkError') {
          return event;
        }
      }

      return event;
    },
    // Ignore certain URLs to reduce noise
    denyUrls: [
      // Browser extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /moz-extension:\/\//i,
    ],
  });
}
