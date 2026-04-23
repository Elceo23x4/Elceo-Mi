import type { NotificationDecisionRepository } from './contracts';
import { MemoryNotificationDecisionRepository } from './memory-notification-repository';
import { SqlNotificationDecisionRepository } from './sql-notification-repository';

export function createNotificationDecisionRepository(env: Record<string, string | undefined>): NotificationDecisionRepository {
  if (env.NOTIFICATIONS_PERSISTENCE_BACKEND === 'memory') {
    return new MemoryNotificationDecisionRepository();
  }
  if (env.NOTIFICATIONS_PERSISTENCE_BACKEND === 'sql') {
    return new SqlNotificationDecisionRepository();
  }
  return new MemoryNotificationDecisionRepository();
}

export * from './contracts';
export * from './memory-notification-repository';
export * from './sql-notification-repository';
export * from './serialization';
export * from './replay';
