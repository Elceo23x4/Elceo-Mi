import type { ErrorEvent, EventHint } from '@sentry/nextjs';
import { parseSentrySaasDsn } from './sentry-dsn.mjs';

const SAFE_TAGS = new Set([
  'appEnv',
  'category',
  'environment',
  'http.status_code',
  'requestId',
  'route',
  'runtime',
  'scope',
  'subsystem'
]);

function safeLabel(value: unknown, maxLength = 120): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const label = String(value).trim();
  return label && /^[a-zA-Z0-9._:/ -]+$/.test(label) ? label.slice(0, maxLength) : undefined;
}

export function safeRoute(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const label = value.trim().slice(0, 240);
  if (!label) return undefined;

  try {
    const path = label.startsWith('http://') || label.startsWith('https://')
      ? new URL(label).pathname
      : label.split(/[?#]/, 1)[0];
    return path?.startsWith('/') && /^[a-zA-Z0-9._~!$&'()*+,;=:@%/{}[\]-]+$/.test(path) ? path : undefined;
  } catch {
    return undefined;
  }
}

function safeStackLocation(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const location = value.split(/[?#]/, 1)[0]?.trim();
  return location && /^[a-zA-Z0-9._~!$&'()*+,;=:@%/{}[\]-]+$/.test(location)
    ? location.slice(0, 240)
    : undefined;
}

export function isValidPublicDsn(value: string | undefined): value is string {
  return parseSentrySaasDsn(value) !== null;
}

export function safeEnvironment(value: string | undefined): string {
  return safeLabel(value, 64) ?? 'staging';
}

export function safeRelease(value: string | undefined): string | undefined {
  return safeLabel(value, 120);
}

export function allowedCaptureTags(scope: string, context: Record<string, unknown>): Record<string, string> {
  const tags: Record<string, string> = { appEnv: 'staging' };
  const safeScope = safeLabel(scope);
  if (safeScope) tags.scope = safeScope;

  const route = safeRoute(context.route ?? context.path);
  if (route) tags.route = route;

  for (const [source, target] of [
    ['status', 'http.status_code'],
    ['category', 'category'],
    ['subsystem', 'subsystem'],
    ['requestId', 'requestId'],
    ['runtime', 'runtime']
  ] as const) {
    const value = safeLabel(context[source]);
    if (value) tags[target] = value;
  }

  return tags;
}

/** Remove ambient SDK context and retain only ELCEO's explicit metadata allowlist. */
export function applySentryPrivacyPolicy(event: ErrorEvent, _hint?: EventHint): ErrorEvent {
  const tags = Object.fromEntries(
    Object.entries(event.tags ?? {}).flatMap(([key, value]) => {
      if (!SAFE_TAGS.has(key)) return [];
      const safeValue = key === 'route' ? safeRoute(value) : safeLabel(value);
      return safeValue ? [[key, safeValue]] : [];
    })
  );
  const runtimeName = safeLabel(event.contexts?.runtime?.name, 64);
  const runtimeVersion = safeLabel(event.contexts?.runtime?.version, 64);
  const runtime = runtimeName || runtimeVersion
    ? { name: runtimeName, version: runtimeVersion }
    : undefined;
  const exception = event.exception?.values?.map((value) => ({
    type: safeLabel(value.type, 80) ?? 'Error',
    value: 'ELCEO captured error',
    mechanism: value.mechanism ? {
      type: safeLabel(value.mechanism.type, 80) ?? 'generic',
      handled: value.mechanism.handled,
      synthetic: value.mechanism.synthetic
    } : undefined,
    stacktrace: value.stacktrace ? {
      frames: value.stacktrace.frames?.map((frame) => ({
        filename: safeStackLocation(frame.filename),
        function: safeLabel(frame.function, 120),
        module: safeLabel(frame.module, 120),
        lineno: frame.lineno,
        colno: frame.colno,
        in_app: frame.in_app,
        abs_path: safeStackLocation(frame.abs_path)
      }))
    } : undefined
  }));

  return {
    type: undefined,
    event_id: event.event_id,
    timestamp: event.timestamp,
    platform: event.platform,
    level: event.level,
    exception: exception ? { values: exception } : undefined,
    message: 'ELCEO captured error',
    environment: safeEnvironment(event.environment),
    release: safeRelease(event.release),
    tags,
    contexts: runtime ? { runtime } : undefined
  };
}
