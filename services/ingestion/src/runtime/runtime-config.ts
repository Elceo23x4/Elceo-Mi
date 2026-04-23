import { DEFAULT_INGESTION_RUNTIME_CONFIG, type IngestionExecutionMode, type IngestionRuntimeConfig } from './execution-mode';

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  return fallback;
}

function parseMode(value: string | undefined): IngestionExecutionMode {
  if (value === 'canonical' || value === 'legacy' || value === 'shadow') return value;
  return DEFAULT_INGESTION_RUNTIME_CONFIG.mode;
}

export function getIngestionRuntimeConfig(env: Record<string, string | undefined>): IngestionRuntimeConfig {
  return {
    mode: parseMode(env.INGESTION_RUNTIME_MODE),
    legacyFallbackOnCanonicalFailure: parseBoolean(
      env.INGESTION_LEGACY_FALLBACK_ON_CANONICAL_FAILURE,
      DEFAULT_INGESTION_RUNTIME_CONFIG.legacyFallbackOnCanonicalFailure
    ),
    strictCanonicalFailure: parseBoolean(env.INGESTION_STRICT_CANONICAL_FAILURE, DEFAULT_INGESTION_RUNTIME_CONFIG.strictCanonicalFailure),
    boundaryVersion: env.INGESTION_BOUNDARY_VERSION?.trim() || DEFAULT_INGESTION_RUNTIME_CONFIG.boundaryVersion
  };
}
