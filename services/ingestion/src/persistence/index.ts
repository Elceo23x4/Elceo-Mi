export * from './contracts';
export * from './ingestion-run-repository';
export * from './event-snapshot-repository';
export * from './serialization';
export * from './replay';
export * from './memory-ingestion-repository';
export * from './sql-ingestion-repository';

import { MemoryIngestionPersistenceRepository } from './memory-ingestion-repository';
import { SqlIngestionPersistenceRepository } from './sql-ingestion-repository';
import type { IngestionPersistenceRepository } from './contracts';

export function createIngestionPersistenceRepository(env: Record<string, string | undefined>): IngestionPersistenceRepository {
  if (env.INGESTION_PERSISTENCE_MODE === 'memory') {
    return new MemoryIngestionPersistenceRepository();
  }

  if (env.DATABASE_URL && env.INGESTION_PERSISTENCE_MODE !== 'memory') {
    return new SqlIngestionPersistenceRepository();
  }

  return new MemoryIngestionPersistenceRepository();
}
