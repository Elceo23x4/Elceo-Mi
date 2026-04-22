import type { InvalidationState, ZoneSignificance } from '@elceo/types';
import type { SchemaValidationResult } from './event.schema';

export function validateZoneSignificance(input: unknown): SchemaValidationResult<ZoneSignificance> {
  if (!input || typeof input !== 'object') return { ok: false, errors: ['ZoneSignificance must be object'] };
  const zone = input as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof zone.zoneId !== 'string') errors.push('zoneId required');
  if (typeof zone.touchCount !== 'number' || zone.touchCount < 0) errors.push('touchCount must be >= 0');
  if (typeof zone.lowerBound !== 'number' || typeof zone.upperBound !== 'number') errors.push('bounds must be numeric');
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: input as ZoneSignificance };
}

export function validateInvalidationState(input: unknown): SchemaValidationResult<InvalidationState> {
  if (!input || typeof input !== 'object') return { ok: false, errors: ['InvalidationState must be object'] };
  const state = input as Record<string, unknown>;
  if (!Array.isArray(state.secondary)) return { ok: false, errors: ['secondary must be array'] };
  if (typeof state.summary !== 'string') return { ok: false, errors: ['summary must be string'] };
  return { ok: true, value: input as InvalidationState };
}
