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

function assertPersistence(env:Record<string,string|undefined>){const deployed=env.APP_ENV==='staging'||env.APP_ENV==='production'||env.NODE_ENV==='production';if(deployed&&(env.NOTIFICATIONS_PERSISTENCE_BACKEND!=='sql'||!env.DATABASE_URL))throw new Error('notifications_persistence_unavailable');}

export function createNotificationDecisionRepository(env: Record<string, string | undefined>): NotificationDecisionRepository {
  assertPersistence(env);
  if (env.NOTIFICATIONS_PERSISTENCE_BACKEND === 'sql') return new SqlNotificationDecisionRepository();
  return new MemoryNotificationDecisionRepository();
}

export function createNotificationOutboxRepository(env: Record<string, string | undefined>): NotificationOutboxRepository {
  assertPersistence(env);
  if (env.NOTIFICATIONS_PERSISTENCE_BACKEND === 'sql') return new SqlNotificationOutboxRepository();
  return new MemoryNotificationOutboxRepository();
}

export function createNotificationOutboxAttemptRepository(env: Record<string, string | undefined>): NotificationOutboxAttemptRepository {
  assertPersistence(env);
  if (env.NOTIFICATIONS_PERSISTENCE_BACKEND === 'sql') return new SqlNotificationOutboxAttemptRepository();
  return new MemoryNotificationOutboxAttemptRepository();
}

export function createNotificationTargetRepository(env: Record<string, string | undefined>): NotificationTargetRepository {
  assertPersistence(env);
  if (env.NOTIFICATIONS_PERSISTENCE_BACKEND === 'sql') return new SqlNotificationTargetRepository();
  return new MemoryNotificationTargetRepository();
}

export function createNotificationSubscriptionRepository(env: Record<string, string | undefined>): NotificationSubscriptionRepository {
  assertPersistence(env);
  if (env.NOTIFICATIONS_PERSISTENCE_BACKEND === 'sql') return new SqlNotificationSubscriptionRepository();
  return new MemoryNotificationSubscriptionRepository();
}

export function createNotificationInboxRepository(env: Record<string, string | undefined>): NotificationInboxRepository {
  assertPersistence(env);
  if (env.NOTIFICATIONS_PERSISTENCE_BACKEND === 'sql') return new SqlNotificationInboxRepository();
  return new MemoryNotificationInboxRepository();
}

export function createNotificationOrchestrationRunRepository(env: Record<string, string | undefined>): NotificationOrchestrationRunRepository {
  assertPersistence(env);
  if (env.NOTIFICATIONS_PERSISTENCE_BACKEND === 'sql') return new SqlNotificationOrchestrationRunRepository();
  return new MemoryNotificationOrchestrationRunRepository();
}

export function createNotificationProviderEventRepository(env: Record<string, string | undefined>): NotificationProviderEventRepository {
  assertPersistence(env);
  if (env.NOTIFICATIONS_PERSISTENCE_BACKEND === 'sql') return new SqlNotificationProviderEventRepository() as NotificationProviderEventRepository;
  return new MemoryNotificationProviderEventRepository();
}

export function createNotificationDeliveryReceiptRepository(env: Record<string, string | undefined>): NotificationDeliveryReceiptRepository {
  assertPersistence(env);
  if (env.NOTIFICATIONS_PERSISTENCE_BACKEND === 'sql') return new SqlNotificationDeliveryReceiptRepository() as NotificationDeliveryReceiptRepository;
  return new MemoryNotificationDeliveryReceiptRepository();
}

export function createNotificationTargetHealthRepository(env: Record<string, string | undefined>, targetRepository?: NotificationTargetRepository): NotificationTargetHealthRepository {
  assertPersistence(env);
  if (env.NOTIFICATIONS_PERSISTENCE_BACKEND === 'sql') return new SqlNotificationTargetHealthRepository() as NotificationTargetHealthRepository;
  return new MemoryNotificationTargetHealthRepository(targetRepository ?? createNotificationTargetRepository(env));
}

export * from './contracts';
export * from './memory-notification-repository';
export * from './sql-notification-repository';
export * from './serialization';
export * from './replay';


export function createNotificationVerificationRepository(env: Record<string, string | undefined>): NotificationVerificationRepository {
  assertPersistence(env);
  if (env.NOTIFICATIONS_PERSISTENCE_BACKEND === 'sql') return new SqlNotificationVerificationRepository() as NotificationVerificationRepository;
  return new MemoryNotificationVerificationRepository();
}
