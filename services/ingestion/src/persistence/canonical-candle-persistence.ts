import { getCanonicalCandleObservation } from '@elceo/schemas';
import type { CanonicalEvent } from '@elceo/types';

/** Validates and deterministically collapses identical candle rows before any durable mutation. */
export function prepareCanonicalEventsForSnapshot(events: CanonicalEvent[]): CanonicalEvent[] {
  const candleContentBySlot = new Map<string, string>();
  const output: CanonicalEvent[] = [];
  for (const event of events) {
    const candidate = event.tags.includes('market_candle') || event.observation?.kind === 'market_candle';
    if (!candidate) { output.push(event); continue; }
    const observation = getCanonicalCandleObservation(event);
    if (!observation) throw new Error(`invalid_canonical_candle_event:${event.id}`);
    const priorHash = candleContentBySlot.get(observation.observationId);
    if (priorHash && priorHash !== observation.contentHash) throw new Error(`canonical_candle_revision_conflict:${observation.observationId}`);
    if (priorHash) continue;
    candleContentBySlot.set(observation.observationId, observation.contentHash);
    output.push(event);
  }
  return output;
}
