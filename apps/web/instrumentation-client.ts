import * as Sentry from '@sentry/nextjs';
import { applySentryPrivacyPolicy, isValidPublicDsn, safeEnvironment } from './lib/sentry-policy';

if (process.env.NEXT_PUBLIC_APP_ENV === 'staging' && isValidPublicDsn(process.env.NEXT_PUBLIC_SENTRY_DSN)) {
  try {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: safeEnvironment(process.env.NEXT_PUBLIC_APP_ENV),
      sendDefaultPii: false,
      tracesSampleRate: 0,
      enableLogs: false,
      beforeSend: applySentryPrivacyPolicy
    });
  } catch {
    // Browser monitoring is optional and may not prevent ELCEO from starting.
  }
}
