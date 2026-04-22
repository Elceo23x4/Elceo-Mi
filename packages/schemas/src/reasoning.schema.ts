import type { ReasoningInputFrame } from '@elceo/types';
import type { SchemaValidationResult } from './event.schema';

export function validateReasoningInputFrame(input: unknown): SchemaValidationResult<ReasoningInputFrame> {
  if (!input || typeof input !== 'object') return { ok: false, errors: ['ReasoningInputFrame must be object'] };
  const frame = input as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof frame.asset !== 'string' || frame.asset.length === 0) errors.push('asset required');
  if (typeof frame.timeframe !== 'string') errors.push('timeframe required');
  if (!Array.isArray(frame.events)) errors.push('events must be array');
  if (!Array.isArray(frame.evidenceCandidates)) errors.push('evidenceCandidates must be array');
  if (!Array.isArray(frame.zones)) errors.push('zones must be array');
  if (typeof frame.latestPrice !== 'number') errors.push('latestPrice must be number');
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: input as ReasoningInputFrame };
}
