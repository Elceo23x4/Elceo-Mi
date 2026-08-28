import type {
  AnalyticsSnapshotLookupRepository,
  CoachingSnapshotRepository,
  JournalInfluenceSnapshotLookupRepository
} from './contracts';
import {
  MemoryAnalyticsSnapshotLookupRepository,
  MemoryCoachingSnapshotRepository,
  MemoryJournalInfluenceSnapshotLookupRepository,
  SqlAnalyticsSnapshotLookupRepository,
  SqlCoachingSnapshotRepository,
  SqlJournalInfluenceSnapshotLookupRepository
} from './repositories';

function runtimeEnv(): Record<string, string | undefined> {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
}

function assertPersistence(env:Record<string,string|undefined>){const deployed=env.APP_ENV==='staging'||env.APP_ENV==='production';if(deployed&&(env.ANALYTICS_PERSISTENCE_BACKEND!=='sql'||!env.DATABASE_URL))throw new Error('analytics_persistence_unavailable');}

let coachingSnapshotRepositorySingleton: CoachingSnapshotRepository | null = null;
let analyticsSnapshotLookupRepositorySingleton: AnalyticsSnapshotLookupRepository | null = null;
let journalInfluenceLookupRepositorySingleton: JournalInfluenceSnapshotLookupRepository | null = null;

export function createCoachingSnapshotRepository(env: Record<string, string | undefined>): CoachingSnapshotRepository {
  assertPersistence(env);
  if (env.ANALYTICS_PERSISTENCE_BACKEND === 'sql') return new SqlCoachingSnapshotRepository();
  return new MemoryCoachingSnapshotRepository();
}

export function createAnalyticsSnapshotLookupRepository(env: Record<string, string | undefined>): AnalyticsSnapshotLookupRepository {
  assertPersistence(env);
  if (env.ANALYTICS_PERSISTENCE_BACKEND === 'sql') return new SqlAnalyticsSnapshotLookupRepository();
  return new MemoryAnalyticsSnapshotLookupRepository();
}

export function createJournalInfluenceSnapshotLookupRepository(env: Record<string, string | undefined>): JournalInfluenceSnapshotLookupRepository {
  assertPersistence(env);
  if (env.ANALYTICS_PERSISTENCE_BACKEND === 'sql') return new SqlJournalInfluenceSnapshotLookupRepository();
  return new MemoryJournalInfluenceSnapshotLookupRepository();
}

export function getCoachingSnapshotRepository(): CoachingSnapshotRepository {
  if (!coachingSnapshotRepositorySingleton) coachingSnapshotRepositorySingleton = createCoachingSnapshotRepository(runtimeEnv());
  return coachingSnapshotRepositorySingleton;
}

export function setCoachingSnapshotRepository(repository: CoachingSnapshotRepository): void {
  coachingSnapshotRepositorySingleton = repository;
}

export function getAnalyticsSnapshotLookupRepository(): AnalyticsSnapshotLookupRepository {
  if (!analyticsSnapshotLookupRepositorySingleton) analyticsSnapshotLookupRepositorySingleton = createAnalyticsSnapshotLookupRepository(runtimeEnv());
  return analyticsSnapshotLookupRepositorySingleton;
}

export function setAnalyticsSnapshotLookupRepository(repository: AnalyticsSnapshotLookupRepository): void {
  analyticsSnapshotLookupRepositorySingleton = repository;
}

export function getJournalInfluenceSnapshotLookupRepository(): JournalInfluenceSnapshotLookupRepository {
  if (!journalInfluenceLookupRepositorySingleton) journalInfluenceLookupRepositorySingleton = createJournalInfluenceSnapshotLookupRepository(runtimeEnv());
  return journalInfluenceLookupRepositorySingleton;
}

export function setJournalInfluenceSnapshotLookupRepository(repository: JournalInfluenceSnapshotLookupRepository): void {
  journalInfluenceLookupRepositorySingleton = repository;
}

export * from './contracts';
export * from './repositories';
