import { logEvent } from '@elceo/config';
import * as Sentry from '@sentry/nextjs';
import { allowedCaptureTags } from './sentry-policy';

function runtimeEnv(): Record<string, string | undefined> {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
}

export function captureError(scope: string, error: unknown, context: Record<string, unknown> = {}): void {
  const message = error instanceof Error ? error.message : 'Unknown error';
  const stack = error instanceof Error ? error.stack : undefined;

  logEvent(scope, 'error', message, {
    ...context,
    stack
  });

  if (runtimeEnv().APP_ENV === 'staging') {
    Sentry.captureException(error instanceof Error ? error : new Error('Unknown actionable failure'), {
      tags: allowedCaptureTags(scope, context)
    });
  }
}
