export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = Record<string, unknown>;

const SENSITIVE_KEYS = ['password', 'secret', 'token', 'authorization', 'cookie', 'key'];

function shouldLog(level: LogLevel): boolean {
  const configured = ((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.LOG_LEVEL ?? 'info') as LogLevel;
  const rank: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
  return rank[level] >= rank[configured];
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.some((sensitive) => key.toLowerCase().includes(sensitive))) {
        out[key] = '[REDACTED]';
      } else {
        out[key] = redact(item);
      }
    }
    return out;
  }
  return value;
}

export function logEvent(scope: string, level: LogLevel, message: string, context: LogContext = {}): void {
  if (!shouldLog(level)) return;
  const payload = {
    ts: new Date().toISOString(),
    level,
    scope,
    message,
    context: redact(context)
  };

  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}
