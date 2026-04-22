import type { CanonicalCognitionState } from '@elceo/types';
import { validateCanonicalEvent, type SchemaValidationResult } from './event.schema';

function isScore(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}

export function validateCanonicalCognitionState(input: unknown): SchemaValidationResult<CanonicalCognitionState> {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') return { ok: false, errors: ['CanonicalCognitionState must be an object'] };
  const s = input as Record<string, unknown>;

  const requiredStrings = ['cognitionId', 'asset', 'timeframe', 'evaluatedAt', 'bias', 'biasLabel', 'thesis', 'narrativeSummary'];
  for (const key of requiredStrings) {
    if (typeof s[key] !== 'string' || (s[key] as string).length === 0) errors.push(`${key} must be a non-empty string`);
  }

  const confidence = s.confidence as Record<string, unknown> | undefined;
  if (!confidence || typeof confidence !== 'object') errors.push('confidence must be object');
  if (confidence && !isScore(confidence.score)) errors.push('confidence.score must be 0..100');

  const contradiction = s.contradiction as Record<string, unknown> | undefined;
  if (!contradiction || typeof contradiction !== 'object') errors.push('contradiction must be object');
  if (contradiction && !isScore(contradiction.score)) errors.push('contradiction.score must be 0..100');

  const freshness = s.freshness as Record<string, unknown> | undefined;
  if (!freshness || typeof freshness !== 'object') errors.push('freshness must be object');
  if (freshness && !isScore(freshness.freshnessScore)) errors.push('freshness.freshnessScore must be 0..100');

  const evidence = s.evidence as Record<string, unknown> | undefined;
  if (!evidence || typeof evidence !== 'object') errors.push('evidence must be object');
  if (evidence && (!Array.isArray(evidence.ranked) || !evidence.ranked.every((v) => !!v && typeof v === 'object'))) {
    errors.push('evidence.ranked must be object[]');
  }

  const zones = s.zones as Record<string, unknown> | undefined;
  if (!zones || typeof zones !== 'object') errors.push('zones must be object');
  if (zones && (!Array.isArray(zones.primary) || !Array.isArray(zones.secondary) || !Array.isArray(zones.activeZoneIds))) {
    errors.push('zones.primary/zones.secondary/zones.activeZoneIds must be arrays');
  }

  const supportEvents = s.supportEvents as Record<string, unknown> | undefined;
  if (!supportEvents || typeof supportEvents !== 'object') errors.push('supportEvents must be object');

  const chartProjection = s.chartProjection as Record<string, unknown> | undefined;
  if (!chartProjection || typeof chartProjection !== 'object') errors.push('chartProjection must be object');

  const audit = s.audit as Record<string, unknown> | undefined;
  if (!audit || typeof audit !== 'object') errors.push('audit must be object');

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: input as CanonicalCognitionState };
}

export function validateEventCollection(events: unknown[]): SchemaValidationResult<true> {
  const errors: string[] = [];
  events.forEach((event, idx) => {
    const result = validateCanonicalEvent(event);
    if (result.ok === false) {
      const detailErrors = result.errors;
      errors.push(`event[${idx}] invalid: ${detailErrors.join('; ')}`);
    }
  });
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: true };
}
