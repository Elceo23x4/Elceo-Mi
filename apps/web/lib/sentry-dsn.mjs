const SENTRY_SAAS_INGEST_HOST = /^o\d+\.ingest(?:\.(?:us|de))?\.sentry\.io$/;
const SENTRY_PUBLIC_KEY = /^[a-f0-9]{32}$/i;
const SENTRY_PROJECT_PATH = /^\/\d+\/?$/;
const IMMUTABLE_GIT_RELEASE = /^[a-f0-9]{40}$/i;

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

/** Resolve only an immutable Git commit identifier from deployment metadata. */
export function sentryRelease(env) {
  const railwayRelease = env.RAILWAY_GIT_COMMIT_SHA;
  if (typeof railwayRelease === 'string' && IMMUTABLE_GIT_RELEASE.test(railwayRelease)) {
    return railwayRelease;
  }

  const release = env.SENTRY_RELEASE;
  return typeof release === 'string' && IMMUTABLE_GIT_RELEASE.test(release)
    ? release
    : undefined;
}

/** Return a release only when the browser build itself is authorized. */
export function sentryBrowserRelease(env) {
  return isSentryBrowserBuildAuthorized(env) ? sentryRelease(env) : undefined;
}

/** Publish the minimum browser-safe Sentry build environment. */
export function sentryBrowserBuildEnv(env) {
  const enabled = isSentryBrowserBuildAuthorized(env);
  const release = sentryBrowserRelease(env);

  return {
    NEXT_PUBLIC_ELCEO_SENTRY_BROWSER_ENABLED: enabled ? 'true' : 'false',
    ...(release ? { NEXT_PUBLIC_ELCEO_SENTRY_RELEASE: release } : {})
  };
}

export function sentryConnectSources(env) {
  const ingestOrigin = sentryBrowserIngestOrigin(env);
  return ["'self'", 'https://api.onesignal.com', ...(ingestOrigin ? [ingestOrigin] : [])];
}
