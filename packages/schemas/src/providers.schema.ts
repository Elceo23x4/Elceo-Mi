import type { CanonicalProviderAdapterSuite } from '@elceo/types';
import type { SchemaValidationResult } from './event.schema';

export function validateCanonicalProviderAdapterSuite(input: unknown): SchemaValidationResult<CanonicalProviderAdapterSuite> {
  if (!input || typeof input !== 'object') return { ok: false, errors: ['Adapter suite must be object'] };
  const suite = input as Record<string, unknown>;
  const required = ['marketData', 'macroCalendar', 'news', 'geopolitics', 'macroContext'];
  const errors = required.filter((key) => typeof suite[key] !== 'object').map((key) => `${key} adapter missing`);
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: input as CanonicalProviderAdapterSuite };
}
