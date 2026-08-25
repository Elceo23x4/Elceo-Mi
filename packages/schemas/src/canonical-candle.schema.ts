import { LAUNCH_ASSET_SYMBOLS, type CanonicalEvent, type CanonicalMarketCandleObservation } from '@elceo/types';
import { isEnumValue, isIsoDateString, isNonEmptyString, isObjectRecord, type SchemaValidationResult } from './validation-utils';

export function validateCanonicalMarketCandleObservation(input: unknown): SchemaValidationResult<CanonicalMarketCandleObservation> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: ['candle observation must be an object'] };
  if (input.kind !== 'market_candle') errors.push('kind must be market_candle');
  if (!isNonEmptyString(input.observationId)) errors.push('observationId must be nonempty');
  if (!isNonEmptyString(input.contentHash)) errors.push('contentHash must be nonempty');
  if (!isEnumValue(input.asset, LAUNCH_ASSET_SYMBOLS)) errors.push('asset must be a canonical launch asset');
  if (!isEnumValue(input.timeframe, ['M5', 'M15', 'H1', 'H4', 'D1'] as const)) errors.push('timeframe is unsupported');
  for (const field of ['open', 'high', 'low', 'close'] as const) {
    if (typeof input[field] !== 'number' || !Number.isFinite(input[field])) errors.push(`${field} must be finite`);
  }
  if (typeof input.high === 'number' && typeof input.open === 'number' && input.high < input.open) errors.push('high must be >= open');
  if (typeof input.high === 'number' && typeof input.close === 'number' && input.high < input.close) errors.push('high must be >= close');
  if (typeof input.high === 'number' && typeof input.low === 'number' && input.high < input.low) errors.push('high must be >= low');
  if (typeof input.low === 'number' && typeof input.open === 'number' && input.low > input.open) errors.push('low must be <= open');
  if (typeof input.low === 'number' && typeof input.close === 'number' && input.low > input.close) errors.push('low must be <= close');
  if (!(input.volume === null || (typeof input.volume === 'number' && Number.isFinite(input.volume) && input.volume >= 0))) errors.push('volume must be null or finite and >= 0');
  if (!isIsoDateString(input.observedAt)) errors.push('observedAt must be a valid ISO date');
  if (!isNonEmptyString(input.provider)) errors.push('provider must be nonempty');
  return errors.length ? { ok: false, errors } : { ok: true, value: input as CanonicalMarketCandleObservation };
}

export function getCanonicalCandleObservation(event: CanonicalEvent): CanonicalMarketCandleObservation | null {
  const result = validateCanonicalMarketCandleObservation(event.observation);
  if (!result.ok) return null;
  if (!event.relatedAssets.includes(result.value.asset) || !event.relatedTimeframes.includes(result.value.timeframe)) return null;
  if (event.attribution.provider !== result.value.provider) return null;
  return result.value;
}

export function extractCanonicalCandleObservations(events: CanonicalEvent[]): CanonicalMarketCandleObservation[] {
  const slots = new Map<string, CanonicalMarketCandleObservation>();
  for (const event of events) {
    if (!event.tags.includes('market_candle') && event.observation?.kind !== 'market_candle') continue;
    const observation = getCanonicalCandleObservation(event);
    if (!observation) throw new Error(`Canonical candle candidate ${event.id} lacks valid typed observation truth`);
    const existing = slots.get(observation.observationId);
    if (existing && existing.contentHash !== observation.contentHash) throw new Error(`Conflicting revisions for candle slot ${observation.observationId}`);
    slots.set(observation.observationId, observation);
  }
  return [...slots.values()].sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt) || a.observationId.localeCompare(b.observationId));
}
