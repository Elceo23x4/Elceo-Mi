import { createHash } from 'node:crypto';
import type { ObservationSet, ReactionObservationEnvelope } from './contracts';

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
}

export function canonicalHash(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

export function calculateObservationContentHash(observations: Omit<ObservationSet, 'contentHash'> | ObservationSet): string {
  return canonicalHash({
    asset: observations.asset,
    timeframe: observations.timeframe,
    source: { sourceId: observations.source.sourceId, provider: observations.source.provider, payloadRef: observations.source.payloadRef ?? null },
    observedWindow: observations.observedWindow,
    candles: observations.candles.map((c) => ({ openedAt: c.openedAt, closedAt: c.closedAt, open: c.open, high: c.high, low: c.low, close: c.close, complete: c.complete, verifiedPostEventSplit: c.verifiedPostEventSplit === true }))
  });
}

export function calculateReactionEnvelopeContentHash(envelope: ReactionObservationEnvelope): string {
  return canonicalHash({
    sourceId: envelope.sourceId,
    provider: envelope.provider,
    payloadRef: envelope.payloadRef ?? null,
    observationVersion: envelope.observationVersion,
    asset: envelope.reactionInput.asset,
    eventTime: envelope.reactionInput.eventTime ?? null,
    volatilityBasisPct: envelope.reactionInput.volatilityBasisPct ?? null,
    volatilityBasis: envelope.reactionInput.volatilityBasis ?? null,
    candles: [...envelope.reactionInput.candles].sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp)).map((c)=>({ timestamp:c.timestamp, open:c.open, high:c.high, low:c.low, close:c.close, volume:c.volume ?? null }))
  });
}

export function deepCloneFreeze<T>(value: T): T {
  const cloned = JSON.parse(JSON.stringify(value)) as T;
  const freeze = (input: unknown): unknown => {
    if (input && typeof input === 'object') {
      Object.freeze(input);
      for (const nested of Object.values(input as Record<string, unknown>)) freeze(nested);
    }
    return input;
  };
  return freeze(cloned) as T;
}
