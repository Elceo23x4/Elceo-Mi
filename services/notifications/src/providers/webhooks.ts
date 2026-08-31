import { createHmac, timingSafeEqual } from 'node:crypto';

const equal = (a: string, b: string): boolean => {
  const left = Buffer.from(a); const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

export function verifyResendWebhook(rawBody: string, headers: { id: string | null; timestamp: string | null; signature: string | null }, secret: string, nowMs = Date.now()): boolean {
  if (!headers.id || !headers.timestamp || !headers.signature || !secret) return false;
  const seconds = Number(headers.timestamp);
  if (!Number.isFinite(seconds) || Math.abs(nowMs - seconds * 1000) > 5 * 60_000) return false;
  let key: Buffer;
  try { key = Buffer.from(secret.startsWith('whsec_') ? secret.slice(6) : secret, 'base64'); } catch { return false; }
  if (key.length < 16) return false;
  const expected = createHmac('sha256', key).update(`${headers.id}.${headers.timestamp}.${rawBody}`).digest('base64');
  return headers.signature.split(' ').some((part) => part.startsWith('v1,') && equal(part.slice(3), expected));
}

export function verifyPostmarkBasicAuth(authorization: string | null, username: string, password: string): boolean {
  if (!authorization?.startsWith('Basic ') || !username || !password) return false;
  const expected = Buffer.from(`${username}:${password}`).toString('base64');
  return equal(authorization.slice(6), expected);
}

export function normalizeResendWebhook(eventId: string, payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object') return null;
  const event = payload as Record<string, unknown>; const data = event.data as Record<string, unknown> | undefined;
  const type = typeof event.type === 'string' ? event.type : '';
  const status = ({ 'email.sent':'accepted', 'email.delivered':'delivered', 'email.delivery_delayed':'delayed', 'email.failed':'failed', 'email.bounced':'bounced', 'email.complained':'complained', 'email.suppressed':'unsubscribed' } as Record<string,string>)[type];
  if (!status || typeof data?.email_id !== 'string') return null;
  return { eventId, status, messageId: data.email_id, occurredAt: event.created_at, reasonCode: type };
}

export function normalizePostmarkWebhook(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object') return null;
  const event = payload as Record<string, unknown>; const messageId = event.MessageID;
  if (typeof messageId !== 'string') return null;
  const type = typeof event.RecordType === 'string' ? event.RecordType.toLowerCase() : '';
  const status = type === 'delivery' ? 'delivered' : type === 'bounce' ? 'bounced' : null;
  if (!status) return null;
  const eventId = typeof event.ID === 'number' || typeof event.ID === 'string' ? `postmark-${String(event.ID)}` : `postmark-${type}-${messageId}`;
  return { eventId, status, messageId, occurredAt: event.DeliveredAt ?? event.BouncedAt, reasonCode: typeof event.Type === 'string' ? event.Type : type, reason: typeof event.Description === 'string' ? event.Description : undefined };
}
