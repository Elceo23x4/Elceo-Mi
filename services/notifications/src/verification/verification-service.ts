import type { NotificationVerificationConsumeResult, NotificationVerificationIssueResult, NotificationVerificationKind, NotificationVerificationRecord, NotificationTargetRecord } from '@elceo/types';
import type { NotificationTargetRepository, NotificationVerificationRepository } from '../persistence/contracts';
import { buildDeterministicId } from '../management/ids';
import { createVerificationTokenService, type VerificationTokenServiceOptions } from './token-service';

function resolveVerificationKind(target: NotificationTargetRecord): NotificationVerificationKind {
  if (target.targetKind === 'email_address') return 'email_verification';
  if (target.targetKind === 'push_endpoint') return 'push_verification';
  throw new Error('unsupported_verification_target_kind');
}

export class NotificationVerificationService {
  private readonly tokenService;
  constructor(
    private readonly repositories: { targetRepository: NotificationTargetRepository; verificationRepository: NotificationVerificationRepository },
    tokenOptions?: VerificationTokenServiceOptions
  ) {
    this.tokenService = createVerificationTokenService(tokenOptions);
  }

  async issueTargetVerificationForSubject(subjectKind: NotificationTargetRecord['subjectKind'], subjectId: string, targetId: string, nowIso = new Date().toISOString()): Promise<NotificationVerificationIssueResult> {
    const target = await this.repositories.targetRepository.getTargetForSubject(subjectKind, subjectId, targetId);
    if (!target) throw new Error('target_not_found');
    if (target.status === 'active' && target.verifiedAt) {
      return { verificationId: buildDeterministicId('verification-active', `${targetId}|${target.verifiedAt}`), targetId, verificationKind: target.targetKind === 'push_endpoint' ? 'push_verification' : 'email_verification', issuedAt: nowIso, expiresAt: nowIso, rawToken: '', alreadyActive: true };
    }
    const verificationKind = resolveVerificationKind(target);
    const existing = await this.repositories.verificationRepository.getLatestActiveVerificationForTarget(targetId, verificationKind);
    if (existing) await this.repositories.verificationRepository.markVerificationCanceled(existing.verificationId, nowIso);

    const rawToken = this.tokenService.generateVerificationToken();
    const expiresAt = new Date(Date.parse(nowIso) + 24 * 60 * 60_000).toISOString();
    const verificationKey = `${target.targetId}|${verificationKind}|${nowIso}`;
    const record: NotificationVerificationRecord = {
      verificationId: buildDeterministicId('verify', verificationKey),
      verificationKey,
      targetId: target.targetId,
      subjectKind: target.subjectKind,
      subjectId: target.subjectId,
      channel: target.channel,
      verificationKind,
      tokenHash: this.tokenService.hashVerificationToken(rawToken),
      issuedAt: nowIso,
      expiresAt,
      consumedAt: null,
      status: 'pending',
      attemptCount: 0,
      lastAttemptAt: null,
      createdAt: nowIso,
      updatedAt: nowIso
    };
    await this.repositories.verificationRepository.saveVerification(record);
    return { verificationId: record.verificationId, targetId: record.targetId, verificationKind, issuedAt: record.issuedAt, expiresAt: record.expiresAt, rawToken, alreadyActive: false };
  }

  async resendTargetVerificationForSubject(subjectKind: NotificationTargetRecord['subjectKind'], subjectId: string, targetId: string, nowIso = new Date().toISOString()): Promise<NotificationVerificationIssueResult> {
    return this.issueTargetVerificationForSubject(subjectKind, subjectId, targetId, nowIso);
  }

  async consumeTargetVerificationForSubject(subjectKind: NotificationTargetRecord['subjectKind'], subjectId: string, targetId: string, rawToken: string, consumedAt = new Date().toISOString()): Promise<NotificationVerificationConsumeResult> {
    const target = await this.repositories.targetRepository.getTargetForSubject(subjectKind, subjectId, targetId);
    if (!target) return { verificationId: '', targetId, verified: false, reason: 'target_not_found' };
    let verificationKind: NotificationVerificationKind;
    try { verificationKind = resolveVerificationKind(target); } catch { return { verificationId: '', targetId, verified: false, reason: 'unsupported_verification_target_kind' }; }

    const active = await this.repositories.verificationRepository.getLatestActiveVerificationForTarget(targetId, verificationKind);
    if (!active) return { verificationId: '', targetId, verified: false, reason: 'missing_active_verification' };
    if (Date.parse(active.expiresAt) < Date.parse(consumedAt)) {
      await this.repositories.verificationRepository.markVerificationExpired(active.verificationId, consumedAt);
      return { verificationId: active.verificationId, targetId, verified: false, reason: 'verification_expired' };
    }

    await this.repositories.verificationRepository.incrementVerificationAttempt(active.verificationId, consumedAt);
    if (!this.tokenService.compareVerificationToken(rawToken, active.tokenHash)) {
      return { verificationId: active.verificationId, targetId, verified: false, reason: 'invalid_verification_token' };
    }
    await this.repositories.verificationRepository.markVerificationConsumed(active.verificationId, consumedAt);
    await this.repositories.targetRepository.updateTargetStatusForSubject(subjectKind, subjectId, targetId, 'active', consumedAt, consumedAt);
    return { verificationId: active.verificationId, targetId, verified: true, reason: null };
  }

  async expireStaleVerifications(asOfIso = new Date().toISOString()): Promise<number> {
    const rows = await this.repositories.verificationRepository.listPendingVerificationsExpiringBefore(asOfIso);
    for (const row of rows) await this.repositories.verificationRepository.markVerificationExpired(row.verificationId, asOfIso);
    return rows.length;
  }
}
