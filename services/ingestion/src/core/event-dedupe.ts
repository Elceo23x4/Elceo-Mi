import type { CanonicalAssetSymbol, CanonicalEvent, EventImpactLevel, EventStatus, EvidenceKind, Timeframe } from '@elceo/types';
import { computeEventTemporalState } from './event-recency';
import { computeEventRelevanceScore } from './event-relevance';
import { getEffectiveSourceReliabilityScore } from './source-reliability';

const BUCKET_MINUTES_BY_EVIDENCE_KIND: Record<EvidenceKind, number> = {
  news: 60,
  sentiment: 60,
  system: 60,
  macro_calendar: 30,
  macro_context: 240,
  geopolitics: 240,
  cross_asset: 240,
  market_structure: 240,
  price_action: 240,
  zone_reaction: 240,
  volume: 240,
  volatility: 240,
  journal_behavior: 1440
};

const STATUS_PRECEDENCE: EventStatus[] = ['live', 'published', 'revised', 'scheduled', 'resolved', 'stale', 'cancelled'];
const IMPACT_PRECEDENCE: EventImpactLevel[] = ['critical', 'high', 'medium', 'low'];

function sortUnique<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function impactRank(impact: EventImpactLevel): number {
  return IMPACT_PRECEDENCE.indexOf(impact);
}

function statusByPrecedence(statuses: EventStatus[]): EventStatus {
  for (const status of STATUS_PRECEDENCE) {
    if (statuses.includes(status)) return status;
  }
  return 'published';
}

export function normalizeTitleForDedupe(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]+/g, '')
    .replace(/\s+/g, ' ')
    .replace(/ /g, '-')
    .slice(0, 80);
}

export function floorIsoToBucket(iso: string, bucketMinutes: number): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return new Date(0).toISOString();
  const bucketMillis = bucketMinutes * 60 * 1000;
  return new Date(Math.floor(date.getTime() / bucketMillis) * bucketMillis).toISOString();
}

export function getBucketMinutesForEvidenceKind(kind: EvidenceKind): number {
  return BUCKET_MINUTES_BY_EVIDENCE_KIND[kind];
}

export function buildCanonicalEventDedupeKey(event: Pick<CanonicalEvent, 'sourceCategory' | 'eventKind' | 'region' | 'currency' | 'relatedAssets' | 'occurredAt' | 'title'>): string {
  const regionKey = event.region?.toUpperCase() ?? 'GLOBAL';
  const currencyKey = event.currency?.toUpperCase() ?? 'NA';
  const assetKey = sortUnique(event.relatedAssets).join('+');
  const bucketIso = floorIsoToBucket(event.occurredAt, getBucketMinutesForEvidenceKind(event.eventKind));
  const titleSlug = normalizeTitleForDedupe(event.title);
  return `${event.sourceCategory}|${event.eventKind}|${regionKey}|${currencyKey}|${assetKey}|${bucketIso}|${titleSlug}`;
}

export function mergeDuplicateCanonicalEvents(
  events: CanonicalEvent[],
  targetAsset: CanonicalAssetSymbol,
  targetTimeframe: Timeframe,
  asOf: string
): { mergedEvents: CanonicalEvent[]; merges: Array<{ dedupeKey: string; mergedEventIds: string[]; primaryEventId: string; confirmationCount: number }>; droppedSecondaryIds: string[] } {
  const groups = new Map<string, CanonicalEvent[]>();
  for (const event of events) {
    const key = buildCanonicalEventDedupeKey(event);
    const existing = groups.get(key);
    if (existing) existing.push(event);
    else groups.set(key, [event]);
  }

  const mergedEvents: CanonicalEvent[] = [];
  const merges: Array<{ dedupeKey: string; mergedEventIds: string[]; primaryEventId: string; confirmationCount: number }> = [];
  const droppedSecondaryIds: string[] = [];

  for (const [dedupeKey, group] of groups.entries()) {
    if (group.length === 1) {
      const singleton = group[0];
      if (singleton) mergedEvents.push({ ...singleton, dedupeKey });
      continue;
    }

    const primary = [...group].sort((left, right) => {
      const reliabilityDiff = getEffectiveSourceReliabilityScore(right) - getEffectiveSourceReliabilityScore(left);
      if (reliabilityDiff !== 0) return reliabilityDiff;

      const impactDiff = impactRank(left.impact) - impactRank(right.impact);
      if (impactDiff !== 0) return impactDiff;

      const detectedAtDiff = new Date(right.detectedAt).getTime() - new Date(left.detectedAt).getTime();
      if (detectedAtDiff !== 0) return detectedAtDiff;

      return left.sourceName.localeCompare(right.sourceName);
    })[0];

    if (!primary) continue;

    const statuses = group.map((item) => item.status);
    const impacts = group.map((item) => item.impact);
    const scheduledOrLive = statuses.some((status) => status === 'scheduled' || status === 'live');

    const occurredAt = scheduledOrLive
      ? new Date(Math.min(...group.map((item) => new Date(item.occurredAt).getTime()))).toISOString()
      : primary.occurredAt;

    const detectedAt = new Date(Math.max(...group.map((item) => new Date(item.detectedAt).getTime()))).toISOString();
    const effectiveUntilCandidates = group
      .map((item) => (item.effectiveUntil ? new Date(item.effectiveUntil).getTime() : null))
      .filter((value): value is number => value !== null && Number.isFinite(value));
    const latestEffectiveUntilMs = effectiveUntilCandidates.length > 0 ? Math.max(...effectiveUntilCandidates) : null;

    const sortedByDetectedAtNewest = [...group].sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
    const revisionOfEventId = sortedByDetectedAtNewest.find((item) => item.revisionOfEventId !== null)?.revisionOfEventId ?? null;

    const merged: CanonicalEvent = {
      ...primary,
      occurredAt,
      detectedAt,
      effectiveUntil: latestEffectiveUntilMs === null ? null : new Date(latestEffectiveUntilMs).toISOString(),
      region: primary.region ?? group.find((item) => item.region !== null)?.region ?? null,
      country: primary.country ?? group.find((item) => item.country !== null)?.country ?? null,
      currency: primary.currency ?? group.find((item) => item.currency !== null)?.currency ?? null,
      relatedAssets: sortUnique(group.flatMap((item) => item.relatedAssets)),
      relatedTimeframes: sortUnique(group.flatMap((item) => item.relatedTimeframes)),
      confirmationCount: group.length,
      tags: sortUnique(group.flatMap((item) => item.tags)),
      revisionOfEventId,
      status: statusByPrecedence(statuses),
      impact: IMPACT_PRECEDENCE.find((impact) => impacts.includes(impact)) ?? primary.impact,
      sourceReliabilityScore: getEffectiveSourceReliabilityScore(primary),
      dedupeKey
    };

    const temporal = computeEventTemporalState(merged, asOf);
    const mergedWithScores: CanonicalEvent = {
      ...merged,
      recencyScore: temporal.recencyScore,
      freshnessHours: temporal.freshnessHours,
      stale: temporal.stale
    };

    const mergedWithRelevance: CanonicalEvent = {
      ...mergedWithScores,
      relevanceScore: computeEventRelevanceScore(mergedWithScores, targetAsset, targetTimeframe, asOf)
    };

    const rebuilt = { ...mergedWithRelevance, dedupeKey: buildCanonicalEventDedupeKey(mergedWithRelevance) };

    mergedEvents.push(rebuilt);
    merges.push({ dedupeKey, mergedEventIds: group.map((item) => item.id), primaryEventId: primary.id, confirmationCount: group.length });
    droppedSecondaryIds.push(...group.filter((item) => item.id !== primary.id).map((item) => item.id));
  }

  return { mergedEvents, merges, droppedSecondaryIds };
}
