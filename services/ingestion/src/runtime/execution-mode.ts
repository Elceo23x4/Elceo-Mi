export type IngestionExecutionMode = 'canonical' | 'legacy' | 'shadow';

export type IngestionActiveBoundary = 'canonical' | 'legacy' | 'none';

export type IngestionRunStatus = 'success' | 'partial_success' | 'failed';

export type IngestionRuntimeConfig = {
  mode: IngestionExecutionMode;
  legacyFallbackOnCanonicalFailure: boolean;
  strictCanonicalFailure: boolean;
  boundaryVersion: string;
};

export const DEFAULT_INGESTION_RUNTIME_CONFIG: IngestionRuntimeConfig = {
  mode: 'canonical',
  legacyFallbackOnCanonicalFailure: false,
  strictCanonicalFailure: false,
  boundaryVersion: 'c2c.0.0'
};
