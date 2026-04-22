import type { CanonicalProviderAdapterSuite } from '@elceo/types';
import type { SchemaValidationResult } from './validation-utils';

export function validateCanonicalProviderAdapterSuite(input: unknown): SchemaValidationResult<CanonicalProviderAdapterSuite> {
  if (!input || typeof input !== 'object') return { ok: false, errors: ['Adapter suite must be object'] };
  const suite = input as Record<string, unknown>;
  const required = ['marketData', 'macroCalendar', 'news', 'geopolitics', 'macroContext'] as const;
  const errors: string[] = [];

  for (const key of required) {
    const adapter = suite[key];
    if (!adapter || typeof adapter !== 'object') {
      errors.push(`${key} adapter missing`);
      continue;
    }
    if (typeof (adapter as Record<string, unknown>) !== 'object') {
      errors.push(`${key} adapter must be object`);
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: input as CanonicalProviderAdapterSuite };
}
