export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogContext = Record<string, unknown>;

const REDACTED = '[REDACTED]';
const SENSITIVE_KEY = /(authorization|cookie|session|password|passwd|secret|token|api[-_]?key|credential|email|address)/i;
const CREDENTIAL_PARAM = /^(access_token|auth|authorization|code|credential|email|key|password|passwd|secret|session|signature|token|api[-_]?key|reset[-_]?token|verification[-_]?token)$/i;

/** Deterministic, environment-independent sanitization shared by every telemetry sink. */
export function sanitizeTelemetryString(input: string): string {
  let value = input;
  value = value.replace(/\b(authorization\s*:\s*)?(bearer|basic)\s+[A-Za-z0-9._~+/=-]+/gi, (_m, prefix, scheme) => `${prefix ?? ''}${scheme} ${REDACTED}`);
  value = value.replace(/\b(cookie|set-cookie)\s*:\s*[^\r\n]*/gi, `$1: ${REDACTED}`);
  value = value.replace(/\b(password|passwd|secret|token|api[-_]?key|session|credential|email)\s*[:=]\s*["']?[^\s,;&"']+/gi, `$1=${REDACTED}`);
  value = value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, REDACTED);
  // URLs may occur inside prose or stack frames. Preserve origin/path while removing userinfo and credential values.
  value = value.replace(/https?:\/\/[^\s)\]}>'"]+/gi, (raw) => {
    try {
      const url = new URL(raw);
      if (url.username || url.password) { url.username = REDACTED; url.password = ''; }
      for (const key of [...url.searchParams.keys()]) if (CREDENTIAL_PARAM.test(key)) url.searchParams.set(key, REDACTED);
      if (url.hash) {
        const fragment = new URLSearchParams(url.hash.slice(1));
        let changed = false;
        for (const key of [...fragment.keys()]) if (CREDENTIAL_PARAM.test(key)) { fragment.set(key, REDACTED); changed = true; }
        if (changed) url.hash = fragment.toString();
        else if (/(token|secret|password|credential|session|authorization|email)/i.test(url.hash)) url.hash = REDACTED;
      }
      return url.toString();
    } catch { return REDACTED; }
  });
  return value;
}

export function sanitizeTelemetryValue(value: unknown, key = '', seen = new WeakSet<object>()): unknown {
  if (SENSITIVE_KEY.test(key)) return REDACTED;
  if (typeof value === 'string') return sanitizeTelemetryString(value);
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'function' || typeof value === 'symbol') return undefined;
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return '[CIRCULAR]';
  seen.add(value);
  if (value instanceof Error) return { name: sanitizeTelemetryString(value.name), message: sanitizeTelemetryString(value.message), stack: value.stack ? sanitizeTelemetryString(value.stack) : undefined };
  if (Array.isArray(value)) return value.map((item) => sanitizeTelemetryValue(item, '', seen));
  const out: Record<string, unknown> = {};
  for (const objectKey of Object.keys(value as Record<string, unknown>).sort()) out[objectKey] = sanitizeTelemetryValue((value as Record<string, unknown>)[objectKey], objectKey, seen);
  return out;
}

function shouldLog(level: LogLevel): boolean {
  const configured = ((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.LOG_LEVEL ?? 'info') as LogLevel;
  return ({ debug: 10, info: 20, warn: 30, error: 40 })[level] >= ({ debug: 10, info: 20, warn: 30, error: 40 })[configured];
}

export function logEvent(scope: string, level: LogLevel, message: string, context: LogContext = {}): void {
  if (!shouldLog(level)) return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, scope: sanitizeTelemetryString(scope), message: sanitizeTelemetryString(message), context: sanitizeTelemetryValue(context) });
  if (level === 'error') console.error(line); else if (level === 'warn') console.warn(line); else console.log(line);
}
