import type { AnalyticsCaseSource, AnalyticsSnapshotRepository } from './contracts';
import { MemoryAnalyticsCaseSource, SqlAnalyticsCaseSource } from './case-source';
import { MemoryAnalyticsSnapshotRepository, SqlAnalyticsSnapshotRepository } from './snapshot-repository';

function runtimeEnv(): Record<string, string | undefined> {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
}

function assertPersistence(env:Record<string,string|undefined>){const deployed=env.APP_ENV==='staging'||env.APP_ENV==='production';if(deployed&&(env.ANALYTICS_PERSISTENCE_BACKEND!=='sql'||!env.DATABASE_URL))throw new Error('analytics_persistence_unavailable');}

let snapshotSingleton: AnalyticsSnapshotRepository | null = null;
let caseSourceSingleton: AnalyticsCaseSource | null = null;

export function createAnalyticsSnapshotRepository(env: Record<string, string | undefined>): AnalyticsSnapshotRepository {
  assertPersistence(env);
  if (env.ANALYTICS_PERSISTENCE_BACKEND === 'sql') return new SqlAnalyticsSnapshotRepository();
  return new MemoryAnalyticsSnapshotRepository();
}

export function createAnalyticsCaseSource(env: Record<string, string | undefined>): AnalyticsCaseSource {
  assertPersistence(env);
  if (env.ANALYTICS_PERSISTENCE_BACKEND === 'sql') return new SqlAnalyticsCaseSource();
  return new MemoryAnalyticsCaseSource();
}

export function getAnalyticsSnapshotRepository(): AnalyticsSnapshotRepository {
  if (!snapshotSingleton) snapshotSingleton = createAnalyticsSnapshotRepository(runtimeEnv());
  return snapshotSingleton;
}

export function setAnalyticsSnapshotRepository(repository: AnalyticsSnapshotRepository): void {
  snapshotSingleton = repository;
}

export function getAnalyticsCaseSource(): AnalyticsCaseSource {
  if (!caseSourceSingleton) caseSourceSingleton = createAnalyticsCaseSource(runtimeEnv());
  return caseSourceSingleton;
}

export function setAnalyticsCaseSource(caseSource: AnalyticsCaseSource): void {
  caseSourceSingleton = caseSource;
}

export * from './contracts';
export * from './case-source';
export * from './snapshot-repository';
