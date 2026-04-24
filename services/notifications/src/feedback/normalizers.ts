import type { NotificationChannel, NotificationProviderEventKind, NotificationReceiptSeverity } from '@elceo/types';

export type NormalizedProviderEvent = {
  providerEventId: string;
  providerKind: string;
  channel: NotificationChannel;
  providerMessageId: string | null;
  eventKind: NotificationProviderEventKind;
  severity: NotificationReceiptSeverity;
  occurredAt: string;
  reasonCode: string | null;
  reasonMessage: string | null;
  rawEventJson: string;
  normalizedMetaJson: string | null;
};

const classifySeverity = (eventKind: NotificationProviderEventKind): NotificationReceiptSeverity => {
  if (eventKind === 'complained' || eventKind === 'unsubscribed' || eventKind === 'invalid_target') return 'critical';
  if (eventKind === 'accepted' || eventKind === 'delivered') return 'info';
  return 'warning';
};

const toJson = (input: unknown): string => JSON.stringify(input ?? {});
const normalizeOccurredAt = (candidate: unknown, fallbackIso: string): string => {
  if (typeof candidate !== 'string') return fallbackIso;
  const asMs = Date.parse(candidate);
  return Number.isFinite(asMs) ? new Date(asMs).toISOString() : fallbackIso;
};

export function normalizeHttpEmailProviderEvent(rawEvent: unknown, providerKind: string, receivedAt = new Date().toISOString()): NormalizedProviderEvent {
  const event = (rawEvent && typeof rawEvent === 'object') ? (rawEvent as Record<string, unknown>) : {};
  const status = typeof event.status === 'string' ? event.status.toLowerCase() : 'unknown';
  const map: Record<string, NotificationProviderEventKind> = {
    accepted: 'accepted',
    delivered: 'delivered',
    bounced: 'bounced',
    complaint: 'complained',
    complained: 'complained',
    unsubscribe: 'unsubscribed',
    unsubscribed: 'unsubscribed',
    invalid_target: 'invalid_target'
  };
  const eventKind = map[status] ?? 'unknown';
  const providerEventId = typeof event.eventId === 'string' ? event.eventId : `provider_event|${providerKind}|${status}|${normalizeOccurredAt(event.occurredAt, receivedAt)}`;
  const providerMessageId = typeof event.messageId === 'string' ? event.messageId : null;
  const reasonCode = typeof event.reasonCode === 'string' ? event.reasonCode : null;
  const reasonMessage = typeof event.reason === 'string' ? event.reason : null;
  return {
    providerEventId,
    providerKind,
    channel: 'email',
    providerMessageId,
    eventKind,
    severity: classifySeverity(eventKind),
    occurredAt: normalizeOccurredAt(event.occurredAt, receivedAt),
    reasonCode,
    reasonMessage,
    rawEventJson: toJson(rawEvent),
    normalizedMetaJson: JSON.stringify({ source: 'http_email', status, outboxId: typeof event.outboxId === 'string' ? event.outboxId : undefined, attemptId: typeof event.attemptId === 'string' ? event.attemptId : undefined })
  };
}

export function normalizePushProviderEvent(rawEvent: unknown, providerKind: string, receivedAt = new Date().toISOString()): NormalizedProviderEvent {
  const event = (rawEvent && typeof rawEvent === 'object') ? (rawEvent as Record<string, unknown>) : {};
  const code = typeof event.code === 'string' ? event.code.toLowerCase() : 'unknown';
  const eventKind: NotificationProviderEventKind = code.includes('invalid') ? 'invalid_target' : 'unknown';
  return {
    providerEventId: typeof event.eventId === 'string' ? event.eventId : `provider_event|${providerKind}|push|${receivedAt}`,
    providerKind,
    channel: 'push',
    providerMessageId: typeof event.messageId === 'string' ? event.messageId : null,
    eventKind,
    severity: classifySeverity(eventKind),
    occurredAt: normalizeOccurredAt(event.occurredAt, receivedAt),
    reasonCode: typeof event.code === 'string' ? event.code : null,
    reasonMessage: typeof event.message === 'string' ? event.message : null,
    rawEventJson: toJson(rawEvent),
    normalizedMetaJson: JSON.stringify({ source: 'push', code, outboxId: typeof event.outboxId === 'string' ? event.outboxId : undefined, attemptId: typeof event.attemptId === 'string' ? event.attemptId : undefined })
  };
}

export function normalizeProviderFailureEvent(rawEvent: unknown, providerKind: string, channel: NotificationChannel, receivedAt = new Date().toISOString()): NormalizedProviderEvent {
  const event = (rawEvent && typeof rawEvent === 'object') ? (rawEvent as Record<string, unknown>) : {};
  return {
    providerEventId: typeof event.eventId === 'string' ? event.eventId : `provider_event|${providerKind}|failed|${receivedAt}`,
    providerKind,
    channel,
    providerMessageId: typeof event.providerMessageId === 'string' ? event.providerMessageId : null,
    eventKind: 'provider_failed',
    severity: 'warning',
    occurredAt: normalizeOccurredAt(event.occurredAt, receivedAt),
    reasonCode: typeof event.errorCode === 'string' ? event.errorCode : 'provider_failed',
    reasonMessage: typeof event.errorMessage === 'string' ? event.errorMessage : null,
    rawEventJson: toJson(rawEvent),
    normalizedMetaJson: JSON.stringify({ source: 'provider_failure', outboxId: typeof event.outboxId === 'string' ? event.outboxId : undefined, attemptId: typeof event.attemptId === 'string' ? event.attemptId : undefined })
  };
}

export function normalizeUnknownProviderEvent(rawEvent: unknown, providerKind: string, channel: NotificationChannel, receivedAt = new Date().toISOString()): NormalizedProviderEvent {
  return {
    providerEventId: `provider_event|${providerKind}|unknown|${receivedAt}`,
    providerKind,
    channel,
    providerMessageId: null,
    eventKind: 'unknown',
    severity: 'warning',
    occurredAt: receivedAt,
    reasonCode: 'unmapped_payload',
    reasonMessage: 'Provider payload could not be mapped deterministically.',
    rawEventJson: toJson(rawEvent),
    normalizedMetaJson: null
  };
}
