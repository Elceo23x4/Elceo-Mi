import { getIngestionRuntimeConfig } from '../runtime/runtime-config';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export function runRuntimeConfigTests(): void {
  const defaults = getIngestionRuntimeConfig({});
  assert(defaults.mode === 'canonical', 'default mode should be canonical');
  assert(defaults.legacyFallbackOnCanonicalFailure === false, 'default fallback should be false');
  assert(defaults.strictCanonicalFailure === false, 'default strict failure should be false');

  const invalidMode = getIngestionRuntimeConfig({ INGESTION_RUNTIME_MODE: 'invalid' });
  assert(invalidMode.mode === 'canonical', 'invalid mode should fallback to canonical');

  const parsedFlags = getIngestionRuntimeConfig({
    INGESTION_LEGACY_FALLBACK_ON_CANONICAL_FAILURE: 'true',
    INGESTION_STRICT_CANONICAL_FAILURE: 'true'
  });
  assert(parsedFlags.legacyFallbackOnCanonicalFailure === true, 'fallback flag should parse true');
  assert(parsedFlags.strictCanonicalFailure === true, 'strict flag should parse true');
}
