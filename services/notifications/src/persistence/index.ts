import type {
  NotificationDecisionRepository,
  NotificationInboxRepository,
  NotificationOutboxAttemptRepository,
  NotificationOutboxRepository,
  NotificationProviderEventRepository,
  NotificationDeliveryReceiptRepository,
  NotificationOrchestrationRunRepository,
  NotificationSubscriptionRepository,
  NotificationTargetHealthRepository,
  NotificationTargetRepository,
  NotificationVerificationRepository
} from './contracts';
import { MemoryNotificationDecisionRepository, MemoryNotificationOrchestrationRunRepository, MemoryNotificationOutboxAttemptRepository, MemoryNotificationOutboxRepository, MemoryNotificationVerificationRepository, MemoryNotificationProviderEventRepository, MemoryNotificationDeliveryReceiptRepository, MemoryNotificationTargetHealthRepository } from './memory-notification-repository';
import {
  MemoryNotificationInboxRepository,
  MemoryNotificationSubscriptionRepository,
  MemoryNotificationTargetRepository
} from './memory-notification-repository';
import {
  SqlNotificationDecisionRepository,
  SqlNotificationInboxRepository,
  SqlNotificationOrchestrationRunRepository,
  SqlNotificationOutboxAttemptRepository,
  SqlNotificationOutboxRepository,
  SqlNotificationProviderEventRepository,
  SqlNotificationDeliveryReceiptRepository,
  SqlNotificationSubscriptionRepository,
  SqlNotificationTargetHealthRepository,
  SqlNotificationTargetRepository,
  SqlNotificationVerificationRepository
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

export function createNotificationOrchestrationRunRepository(env: Record<string, string | undefined>): NotificationOrchestrationRunRepository {
  if (env.NOTIFICATIONS_PERSISTENCE_BACKEND === 'sql') return new SqlNotificationOrchestrationRunRepository();
  return new MemoryNotificationOrchestrationRunRepository();
}

export function createNotificationProviderEventRepository(env: Record<string, string | undefined>): NotificationProviderEventRepository {
  if (env.NOTIFICATIONS_PERSISTENCE_BACKEND === 'sql') return new SqlNotificationProviderEventRepository() as NotificationProviderEventRepository;
  return new MemoryNotificationProviderEventRepository();
}

export function createNotificationDeliveryReceiptRepository(env: Record<string, string | undefined>): NotificationDeliveryReceiptRepository {
  if (env.NOTIFICATIONS_PERSISTENCE_BACKEND === 'sql') return new SqlNotificationDeliveryReceiptRepository() as NotificationDeliveryReceiptRepository;
  return new MemoryNotificationDeliveryReceiptRepository();
}

export function createNotificationTargetHealthRepository(env: Record<string, string | undefined>, targetRepository?: NotificationTargetRepository): NotificationTargetHealthRepository {
  if (env.NOTIFICATIONS_PERSISTENCE_BACKEND === 'sql') return new SqlNotificationTargetHealthRepository() as NotificationTargetHealthRepository;
  return new MemoryNotificationTargetHealthRepository(targetRepository ?? createNotificationTargetRepository(env));
}

export * from './contracts';
export * from './memory-notification-repository';
export * from './sql-notification-repository';
export * from './serialization';
export * from './replay';


export function createNotificationVerificationRepository(env: Record<string, string | undefined>): NotificationVerificationRepository {
  if (env.NOTIFICATIONS_PERSISTENCE_BACKEND === 'sql') return new SqlNotificationVerificationRepository() as NotificationVerificationRepository;
  return new MemoryNotificationVerificationRepository();
}
