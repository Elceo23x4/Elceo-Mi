import type { NotificationDeliveryRuntimeRepositories } from '../persistence/contracts';
import { NotificationVerificationService } from '../verification/verification-service';
import { getLatestVerificationReplayForTarget, getVerificationReplayById, listVerificationReplayForTarget } from '../verification/replay';

export class CanonicalNotificationVerificationBoundaryService {
  private readonly service: NotificationVerificationService;

  constructor(private readonly repositories: NotificationDeliveryRuntimeRepositories) {
    this.service = new NotificationVerificationService({
      targetRepository: repositories.targetRepository,
      verificationRepository: repositories.verificationRepository
    });
  }

  async issueTargetVerificationForSubject(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, targetId: string, nowIso?: string) { return this.service.issueTargetVerificationForSubject(subjectKind, subjectId, targetId, nowIso); }
  async resendTargetVerificationForSubject(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, targetId: string, nowIso?: string) { return this.service.resendTargetVerificationForSubject(subjectKind, subjectId, targetId, nowIso); }
  async consumeTargetVerificationForSubject(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, targetId: string, rawToken: string, consumedAt?: string) { return this.service.consumeTargetVerificationForSubject(subjectKind, subjectId, targetId, rawToken, consumedAt); }
  async expireStaleVerifications(asOfIso?: string) { return this.service.expireStaleVerifications(asOfIso); }

  async getVerificationReplayById(verificationId: string) { return getVerificationReplayById(this.repositories.verificationRepository, verificationId); }
  async getLatestVerificationReplayForTarget(targetId: string, verificationKind: 'email_verification' | 'push_verification') { return getLatestVerificationReplayForTarget(this.repositories.verificationRepository, targetId, verificationKind); }
  async listVerificationReplayForTarget(targetId: string) { return listVerificationReplayForTarget(this.repositories.verificationRepository, targetId); }
}
