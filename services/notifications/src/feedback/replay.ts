import type { NotificationDeliveryReceiptRepository, NotificationProviderEventRepository, NotificationTargetHealthRepository } from '../persistence/contracts';

export const getFeedbackProviderEventReplayById = (providerEventId: string, repo: NotificationProviderEventRepository) => repo.getProviderEventById(providerEventId);
export const getFeedbackDeliveryReceiptReplayById = (receiptId: string, repo: NotificationDeliveryReceiptRepository) => repo.getReceiptById(receiptId);
export const listFeedbackReceiptReplayForTarget = (targetId: string, repo: NotificationDeliveryReceiptRepository, limit?: number) => repo.listReceiptsForTarget(targetId, limit);
export const listFeedbackProviderEventReplayForTarget = (targetId: string, repo: NotificationProviderEventRepository, limit?: number) => repo.listProviderEventsForTarget(targetId, limit);
export const getFeedbackTargetHealthReplay = (targetId: string, repo: NotificationTargetHealthRepository) => repo.getTargetHealth(targetId);
