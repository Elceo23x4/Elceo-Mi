import { createHash } from 'node:crypto';

const SECRET_PATTERNS = [/api[_-]?key/i, /authorization/i, /bearer\s+[a-z0-9._-]+/i, /smtp/i, /password/i, /token/i, /secret/i];

export function hasUnsafeNotificationSecret(value: string): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(value));
}

export function safeNotificationChecksum(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

export function redactNotificationPreview(value: string, maxLength = 96): string {
  if (!value) return '';
  if (hasUnsafeNotificationSecret(value)) return `[redacted:checksum:${safeNotificationChecksum(value)}]`;
  return value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, (email) => `[email:${safeNotificationChecksum(email)}]`).slice(0, maxLength);
}
