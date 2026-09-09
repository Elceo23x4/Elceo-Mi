import * as Sentry from '@sentry/nextjs';
import { applySentryPrivacyPolicy, safeEnvironment } from './lib/sentry-policy';
import { sentryRelease, serverSentryDsn } from './lib/sentry-dsn.mjs';
import { closeRuntimePools, installRuntimeSignalHandlers, registerRuntimeDrain } from '@elceo/db-runtime';

let lifecycleInstalled = false;

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && !lifecycleInstalled) {
    lifecycleInstalled = true;
    registerRuntimeDrain({ name: 'postgres-runtime', drain: closeRuntimePools });
    installRuntimeSignalHandlers();
  }
  const sentry = serverSentryDsn(process.env);
  if (!sentry) return;

  try {
    Sentry.init({
      dsn: sentry.dsn,
      environment: safeEnvironment(process.env.SENTRY_ENVIRONMENT ?? process.env.APP_ENV),
      release: sentryRelease(process.env),
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
