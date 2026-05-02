export * from './contracts';
export * from './serialization';
export * from './memory-reasoning-repository';
export * from './sql-reasoning-repository';
export * from './replay';

import { MemoryReasoningPersistenceRepository } from './memory-reasoning-repository';
import { SqlReasoningPersistenceRepository } from './sql-reasoning-repository';
import type { ReasoningPersistenceRepository } from './contracts';

export function createReasoningPersistenceRepository(env: Record<string, string | undefined>): ReasoningPersistenceRepository {
  if (env.REASONING_PERSISTENCE_MODE === 'memory') {
    return new MemoryReasoningPersistenceRepository();
  }
  if (env.DATABASE_URL && env.REASONING_PERSISTENCE_MODE !== 'memory') {
    return new SqlReasoningPersistenceRepository();
  }
  return new MemoryReasoningPersistenceRepository();
}

export * from './registry-snapshot-repository';
