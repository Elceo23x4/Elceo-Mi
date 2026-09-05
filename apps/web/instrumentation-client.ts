import * as Sentry from '@sentry/nextjs';
import { applySentryPrivacyPolicy, safeEnvironment } from './lib/sentry-policy';
import { browserSentryDsn } from './lib/sentry-dsn.mjs';

const sentry = browserSentryDsn({
  NEXT_PUBLIC_ELCEO_SENTRY_BROWSER_ENABLED: process.env.NEXT_PUBLIC_ELCEO_SENTRY_BROWSER_ENABLED,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN
});

if (sentry) {
  try {
    Sentry.init({
      dsn: sentry.dsn,
      environment: safeEnvironment(process.env.NEXT_PUBLIC_APP_ENV),
      release: process.env.NEXT_PUBLIC_ELCEO_SENTRY_RELEASE,
      sendDefaultPii: false,
      tracesSampleRate: 0,
      enableLogs: false,
      beforeSend: applySentryPrivacyPolicy
    });
  } catch {
    // Browser monitoring is optional and may not prevent ELCEO from starting.
  }
}
