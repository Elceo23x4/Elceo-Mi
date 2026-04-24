import type { NotificationVerificationKind, NotificationVerificationRecord } from '@elceo/types';
import type { NotificationVerificationRepository } from '../persistence/contracts';

export async function getVerificationReplayById(repository: NotificationVerificationRepository, verificationId: string): Promise<NotificationVerificationRecord | null> {
  return repository.getVerificationById(verificationId);
}

export async function getLatestVerificationReplayForTarget(repository: NotificationVerificationRepository, targetId: string, verificationKind: NotificationVerificationKind): Promise<NotificationVerificationRecord | null> {
  return repository.getLatestActiveVerificationForTarget(targetId, verificationKind);
}

export async function listVerificationReplayForTarget(repository: NotificationVerificationRepository, targetId: string): Promise<NotificationVerificationRecord[]> {
  return repository.listVerificationsForTarget(targetId);
}
