import * as Sentry from '@sentry/nextjs';
import { applySentryPrivacyPolicy, isValidPublicDsn, safeEnvironment, safeRelease } from './lib/sentry-policy';

export async function register() {
  if (process.env.APP_ENV !== 'staging' || !isValidPublicDsn(process.env.SENTRY_DSN)) return;

  try {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: safeEnvironment(process.env.SENTRY_ENVIRONMENT ?? process.env.APP_ENV),
      release: safeRelease(process.env.SENTRY_RELEASE),
      sendDefaultPii: false,
      tracesSampleRate: 0,
      enableLogs: false,
      beforeSend: applySentryPrivacyPolicy
    });
  } catch {
    // Monitoring configuration must never affect application availability.
  }
}

export const onRequestError = Sentry.captureRequestError;
