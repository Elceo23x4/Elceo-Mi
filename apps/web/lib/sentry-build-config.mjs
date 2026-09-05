import { isSentryBrowserBuildAuthorized, sentryRelease } from './sentry-dsn.mjs';

const SAFE_SENTRY_SLUG = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const STRUCTURALLY_SAFE_SECRET = /^[\x21-\x7e]{8,1024}$/;

function invalid(variableName) {
  throw new Error(`Invalid Sentry source-map upload configuration: ${variableName}`);
}

/**
 * Resolve build-only Sentry upload options. A non-exact activation value is an
 * intentional opt-out; exact activation is fail-closed before webpack starts.
 */
export function sentrySourceMapBuildOptions(env) {
  if (env.ELCEO_SENTRY_SOURCEMAPS_UPLOAD !== 'true') return null;

  if (env.APP_ENV !== 'staging') invalid('APP_ENV');
  if (env.NEXT_PUBLIC_APP_ENV !== 'staging') invalid('NEXT_PUBLIC_APP_ENV');
  if (!isSentryBrowserBuildAuthorized(env)) invalid('NEXT_PUBLIC_SENTRY_DSN');

  const release = sentryRelease(env);
  if (!release || release !== env.RAILWAY_GIT_COMMIT_SHA) invalid('RAILWAY_GIT_COMMIT_SHA');

  const authToken = env.SENTRY_AUTH_TOKEN;
  if (typeof authToken !== 'string' || !STRUCTURALLY_SAFE_SECRET.test(authToken)) {
    invalid('SENTRY_AUTH_TOKEN');
  }

  const org = env.SENTRY_ORG;
  if (typeof org !== 'string' || !SAFE_SENTRY_SLUG.test(org)) invalid('SENTRY_ORG');

  const project = env.SENTRY_PROJECT;
  if (typeof project !== 'string' || !SAFE_SENTRY_SLUG.test(project)) invalid('SENTRY_PROJECT');

  return {
    org,
    project,
    authToken,
    release: { name: release },
    sourcemaps: {
      disable: false,
      deleteSourcemapsAfterUpload: true
    },
    widenClientFileUpload: true,
    telemetry: false,
    silent: true
  };
}
