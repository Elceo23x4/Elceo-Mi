import { logEvent } from '@elceo/config';
import { readProviderEnv, validateProviderEnv } from '@elceo/schemas';

let validated = false;

export function validateRuntimeEnv(): void {
  if (validated) return;
  validated = true;

  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
  const result = validateProviderEnv(readProviderEnv(env));

  if (!result.valid) {
    logEvent('runtime.env', 'warn', 'Environment validation issues detected', { errors: result.errors });
  } else {
    logEvent('runtime.env', 'info', 'Environment validation passed');
  }
}
