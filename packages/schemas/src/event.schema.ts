import type { CanonicalEvent, EventImpactLevel, EventStatus, EvidenceKind, SourceCategory } from '@elceo/types';
import type { NormalizedProviderEvent } from './provider-normalized.schema';

const SOURCE_CATEGORIES: SourceCategory[] = ['market_data', 'macro_calendar', 'news', 'geopolitics', 'macro_context', 'internal', 'user'];
const EVIDENCE_KINDS: EvidenceKind[] = [
  'market_structure',
  'price_action',
  'macro_calendar',
  'macro_context',
  'news',
  'geopolitics',
  'sentiment',
  'volume',
  'volatility',
  'zone_reaction',
  'cross_asset',
  'journal_behavior',
  'system'
];
const EVENT_STATUSES: EventStatus[] = ['scheduled', 'live', 'published', 'revised', 'stale', 'cancelled', 'resolved'];
const EVENT_IMPACTS: EventImpactLevel[] = ['low', 'medium', 'high', 'critical'];

export type SchemaValidationResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

function isIso(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

function isScore(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

export function validateCanonicalEvent(input: unknown): SchemaValidationResult<CanonicalEvent> {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: ['CanonicalEvent must be an object'] };
  }

  const e = input as Record<string, unknown>;
  const requiredStrings = ['id', 'sourceId', 'sourceName', 'title', 'summary', 'normalizedNarrative', 'occurredAt', 'detectedAt', 'dedupeKey'];
  for (const key of requiredStrings) {
    if (typeof e[key] !== 'string' || (e[key] as string).length === 0) errors.push(`${key} must be a non-empty string`);
  }

  if (!SOURCE_CATEGORIES.includes(e.sourceCategory as SourceCategory)) errors.push('sourceCategory is invalid');
  if (!EVIDENCE_KINDS.includes(e.eventKind as EvidenceKind)) errors.push('eventKind is invalid');
  if (!EVENT_STATUSES.includes(e.status as EventStatus)) errors.push('status is invalid');
  if (!EVENT_IMPACTS.includes(e.impact as EventImpactLevel)) errors.push('impact is invalid');

  if (typeof e.occurredAt === 'string' && !isIso(e.occurredAt)) errors.push('occurredAt must be ISO date');
  if (typeof e.detectedAt === 'string' && !isIso(e.detectedAt)) errors.push('detectedAt must be ISO date');
  if (e.effectiveUntil !== null && (typeof e.effectiveUntil !== 'string' || !isIso(e.effectiveUntil))) errors.push('effectiveUntil must be ISO date or null');

  const scoreFields: Array<keyof CanonicalEvent> = ['relevanceScore', 'sourceReliabilityScore', 'recencyScore'];
  for (const field of scoreFields) {
    const value = e[field];
    if (typeof value !== 'number' || !isScore(value)) errors.push(`${field} must be number in 0..100`);
  }

  if (typeof e.confirmationCount !== 'number' || e.confirmationCount < 0) errors.push('confirmationCount must be >= 0');
  if (!Array.isArray(e.relatedAssets) || !e.relatedAssets.every((v) => typeof v === 'string')) errors.push('relatedAssets must be string[]');
  if (!Array.isArray(e.relatedTimeframes) || !e.relatedTimeframes.every((v) => typeof v === 'string')) errors.push('relatedTimeframes must be timeframe[]');
  if (!Array.isArray(e.tags) || !e.tags.every((v) => typeof v === 'string')) errors.push('tags must be string[]');

  if (e.rawUrl !== null && typeof e.rawUrl !== 'string') errors.push('rawUrl must be string|null');
  if (e.revisionOfEventId !== null && typeof e.revisionOfEventId !== 'string') errors.push('revisionOfEventId must be string|null');
  if (typeof e.stale !== 'boolean') errors.push('stale must be boolean');
  if (typeof e.freshnessHours !== 'number' || e.freshnessHours < 0) errors.push('freshnessHours must be >= 0');

  const attribution = e.attribution;
  if (!attribution || typeof attribution !== 'object') errors.push('attribution must be object');
  const audit = e.audit;
  if (!audit || typeof audit !== 'object') errors.push('audit must be object');

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: input as CanonicalEvent };
}

export type InternalNormalizedEvent = {
  eventId: string;
  eventType: NormalizedProviderEvent['type'];
  sourceProvider: string;
  occurredAtUtc: string;
  dedupeKey: string;
  payload: NormalizedProviderEvent;
};
