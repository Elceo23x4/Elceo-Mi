export * from './runtime/index';
export * from './scheduler/index';
export * from './facade/index';
export * from './core/index';
export * from './bridges/index';

// Legacy compatibility exports (non-canonical path).
export * from './worker';
export * from './adapters/build-provider-graph';
export * from './pipelines/marketIngestionPipeline';
export * from './pipelines/macroIngestionPipeline';
export * from './pipelines/newsIngestionPipeline';
export * from './pipelines/geopoliticsIngestionPipeline';
export * from './pipelines/extractionIngestionPipeline';
export * from './normalization/normalizeEvent';
export * from './normalization/dedupe';
export * from './source-health/tracker';
export * from './assembly/evidence-assembly';
export * from './cadence/scheduler';
export * from './publishers/kafka-publisher';
export * from './store/persistence-store';
export * from './app-data/dashboard-data';
export * from './orchestration/cadence-orchestrator';
