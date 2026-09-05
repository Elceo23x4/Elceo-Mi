import * as Sentry from '@sentry/nextjs';
import { applySentryPrivacyPolicy, safeEnvironment, safeRelease } from './lib/sentry-policy';
import { serverSentryDsn } from './lib/sentry-dsn.mjs';

export async function register() {
  const sentry = serverSentryDsn(process.env);
  if (!sentry) return;

  try {
    Sentry.init({
      dsn: sentry.dsn,
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
