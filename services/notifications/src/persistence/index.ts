import type { NotificationDecisionRepository, NotificationOutboxAttemptRepository, NotificationOutboxRepository } from './contracts';
import { MemoryNotificationDecisionRepository, MemoryNotificationOutboxAttemptRepository, MemoryNotificationOutboxRepository } from './memory-notification-repository';
import { SqlNotificationDecisionRepository, SqlNotificationOutboxAttemptRepository, SqlNotificationOutboxRepository } from './sql-notification-repository';

export function createNotificationDecisionRepository(env: Record<string, string | undefined>): NotificationDecisionRepository {
  if (env.NOTIFICATIONS_PERSISTENCE_BACKEND === 'sql') return new SqlNotificationDecisionRepository();
  return new MemoryNotificationDecisionRepository();
}

export function createNotificationOutboxRepository(env: Record<string, string | undefined>): NotificationOutboxRepository {
  if (env.NOTIFICATIONS_PERSISTENCE_BACKEND === 'sql') return new SqlNotificationOutboxRepository();
  return new MemoryNotificationOutboxRepository();
}

export function createNotificationOutboxAttemptRepository(env: Record<string, string | undefined>): NotificationOutboxAttemptRepository {
  if (env.NOTIFICATIONS_PERSISTENCE_BACKEND === 'sql') return new SqlNotificationOutboxAttemptRepository();
  return new MemoryNotificationOutboxAttemptRepository();
}

export * from './contracts';
export * from './memory-notification-repository';
export * from './sql-notification-repository';
export * from './serialization';
export * from './replay';
