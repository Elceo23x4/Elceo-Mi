import { logEvent } from '@elceo/config';

function runtimeEnv(): Record<string, string | undefined> {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
}

function sentryStoreApiUrl(dsn: string): string | null {
  try {
    const url = new URL(dsn);
    const [projectId] = url.pathname.replace(/^\//, '').split('/').slice(-1);
    if (!projectId || !url.username) return null;
    return `${url.protocol}//${url.host}/api/${projectId}/store/?sentry_version=7&sentry_key=${url.username}`;
  } catch {
    return null;
  }
}

async function sendToSentry(scope: string, message: string, stack: string | undefined, context: Record<string, unknown>): Promise<void> {
  const dsn = runtimeEnv().SENTRY_DSN;
  if (!dsn) return;

  const endpoint = sentryStoreApiUrl(dsn);
  if (!endpoint) {
    logEvent(scope, 'warn', 'Sentry DSN is invalid; skipping external error transport');
    return;
  }

  const payload = {
    message,
    level: 'error',
    platform: 'javascript',
    timestamp: Date.now() / 1000,
    tags: {
      scope,
      appEnv: runtimeEnv().APP_ENV ?? 'development'
    },
    extra: {
      ...context,
      stack
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    logEvent(scope, 'warn', 'Sentry store API rejected event', { status: response.status });
  }
}

export function captureError(scope: string, error: unknown, context: Record<string, unknown> = {}): void {
  const message = error instanceof Error ? error.message : 'Unknown error';
  const stack = error instanceof Error ? error.stack : undefined;

  logEvent(scope, 'error', message, {
    ...context,
    stack
  });

  void sendToSentry(scope, message, stack, context).catch((transportError) => {
    logEvent(scope, 'warn', 'External error transport failed', {
      reason: transportError instanceof Error ? transportError.message : String(transportError)
    });
  });
}
