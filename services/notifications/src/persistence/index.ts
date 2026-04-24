import type {
  NotificationDecisionRepository,
  NotificationInboxRepository,
  NotificationOutboxAttemptRepository,
  NotificationOutboxRepository,
  NotificationSubscriptionRepository,
  NotificationTargetRepository
} from './contracts';
import { MemoryNotificationDecisionRepository, MemoryNotificationOutboxAttemptRepository, MemoryNotificationOutboxRepository } from './memory-notification-repository';
import {
  MemoryNotificationInboxRepository,
  MemoryNotificationSubscriptionRepository,
  MemoryNotificationTargetRepository
} from './memory-notification-repository';
import {
  SqlNotificationDecisionRepository,
  SqlNotificationInboxRepository,
  SqlNotificationOutboxAttemptRepository,
  SqlNotificationOutboxRepository,
  SqlNotificationSubscriptionRepository,
  SqlNotificationTargetRepository
} from './sql-notification-repository';

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

export function createNotificationTargetRepository(env: Record<string, string | undefined>): NotificationTargetRepository {
  if (env.NOTIFICATIONS_PERSISTENCE_BACKEND === 'sql') return new SqlNotificationTargetRepository();
  return new MemoryNotificationTargetRepository();
}

export function createNotificationSubscriptionRepository(env: Record<string, string | undefined>): NotificationSubscriptionRepository {
  if (env.NOTIFICATIONS_PERSISTENCE_BACKEND === 'sql') return new SqlNotificationSubscriptionRepository();
  return new MemoryNotificationSubscriptionRepository();
}

export function createNotificationInboxRepository(env: Record<string, string | undefined>): NotificationInboxRepository {
  if (env.NOTIFICATIONS_PERSISTENCE_BACKEND === 'sql') return new SqlNotificationInboxRepository();
  return new MemoryNotificationInboxRepository();
}

export * from './contracts';
export * from './memory-notification-repository';
export * from './sql-notification-repository';
export * from './serialization';
export * from './replay';
