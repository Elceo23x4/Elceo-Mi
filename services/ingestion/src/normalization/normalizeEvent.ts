<<<<<<< HEAD
import type { InternalNormalizedEvent, NormalizedProviderEvent } from '@elceo/schemas';
import { articleDedupeKey, macroEventDedupeKey } from './dedupe';

export function normalizeEvent(event: NormalizedProviderEvent): InternalNormalizedEvent {
  const occurredAtUtc =
    (event.type === 'market_quote' && event.timestampUtc) ||
    (event.type === 'market_candle' && event.timestampUtc) ||
    (event.type === 'macro_event' && event.releaseTimeUtc) ||
    (event.type === 'news_article' && event.publishedAtUtc) ||
    (event.type === 'geopolitical_event' && event.occurredAtUtc) ||
    (event.type === 'extracted_document' && event.extractedAtUtc) ||
    new Date().toISOString();

  const dedupeKey =
    event.type === 'macro_event'
      ? macroEventDedupeKey(event)
      : event.type === 'news_article'
        ? articleDedupeKey(event)
        : 'dedupeKey' in event
          ? event.dedupeKey
          : `${event.type}::${occurredAtUtc.slice(0, 13)}`;

  const eventId = 'eventId' in event ? event.eventId : 'articleId' in event ? event.articleId : 'documentId' in event ? event.documentId : `${event.type}-${occurredAtUtc}`;

  return {
    eventId,
    eventType: event.type,
    sourceProvider: event.provider,
    occurredAtUtc,
    dedupeKey,
    payload: event
  };
}
=======
export {};
>>>>>>> origin/main
