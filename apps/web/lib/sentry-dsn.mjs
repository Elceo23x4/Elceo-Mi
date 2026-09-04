const SENTRY_SAAS_INGEST_HOST = /^o\d+\.ingest(?:\.(?:us|de))?\.sentry\.io$/;
const SENTRY_PUBLIC_KEY = /^[a-f0-9]{32}$/i;
const SENTRY_PROJECT_PATH = /^\/\d+\/?$/;

export function parseSentrySaasDsn(value) {
  if (!value) return null;

  try {
    const dsn = new globalThis.URL(value);
    if (
      dsn.protocol !== 'https:' ||
      !SENTRY_SAAS_INGEST_HOST.test(dsn.hostname) ||
      !SENTRY_PUBLIC_KEY.test(dsn.username) ||
      dsn.password ||
      !SENTRY_PROJECT_PATH.test(dsn.pathname) ||
      dsn.search ||
      dsn.hash ||
      dsn.port
    ) return null;

    return { dsn: dsn.href, ingestOrigin: dsn.origin };
  } catch {
    return null;
  }
}

export function sentryBrowserIngestOrigin(env) {
  if (!isSentryBrowserBuildAuthorized(env)) return null;
  return parseSentrySaasDsn(env.NEXT_PUBLIC_SENTRY_DSN)?.ingestOrigin ?? null;
}

export function serverSentryDsn(env) {
  if (env.APP_ENV !== 'staging') return null;
  return parseSentrySaasDsn(env.SENTRY_DSN);
}

export function browserSentryDsn(env) {
  if (env.NEXT_PUBLIC_ELCEO_SENTRY_BROWSER_ENABLED !== 'true' || env.NEXT_PUBLIC_APP_ENV !== 'staging') return null;
  return parseSentrySaasDsn(env.NEXT_PUBLIC_SENTRY_DSN);
}

export function isSentryBrowserBuildAuthorized(env) {
  return env.APP_ENV === 'staging' &&
    env.NEXT_PUBLIC_APP_ENV === 'staging' &&
    parseSentrySaasDsn(env.NEXT_PUBLIC_SENTRY_DSN) !== null;
}

export function sentryConnectSources(env) {
  const ingestOrigin = sentryBrowserIngestOrigin(env);
  return ["'self'", 'https://api.onesignal.com', ...(ingestOrigin ? [ingestOrigin] : [])];
}
