import { NotificationVerificationService } from '../verification/verification-service.js';
import { getNotificationDeliveryProviderConfig } from '../providers/config.js';
import { getNotificationProviderCapabilities } from '../providers/capabilities.js';
import { MemoryNotificationTargetRepository, MemoryNotificationVerificationRepository } from '../persistence/memory-notification-repository.js';

const assert = (condition: boolean, message: string): void => { if (!condition) throw new Error(message); };

export async function runVerificationProviderTests(): Promise<void> {
  const targetRepository = new MemoryNotificationTargetRepository();
  const verificationRepository = new MemoryNotificationVerificationRepository();
  const service = new NotificationVerificationService({ targetRepository, verificationRepository }, { tokenGenerator: () => 'fixed-token' });

  await targetRepository.saveTarget({ targetId: 'email-target', subjectKind: 'user', subjectId: 'u1', channel: 'email', targetKind: 'email_address', status: 'unverified', label: null, addressJson: '{"email":"a@b.c"}', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', verifiedAt: null });
  let foreignIssueDenied = false;
  try { await service.issueTargetVerificationForSubject('user', 'USER_A', 'email-target', '2026-01-01T00:59:00.000Z'); } catch { foreignIssueDenied = true; }
  assert(foreignIssueDenied, 'USER_A cannot issue or receive a token for USER_B target');
  const foreignConsume = await service.consumeTargetVerificationForSubject('user', 'USER_A', 'email-target', 'fixed-token', '2026-01-01T00:59:30.000Z');
  assert(!foreignConsume.verified && foreignConsume.reason === 'target_not_found', 'USER_A cannot consume USER_B verification');
  assert((await verificationRepository.listVerificationsForTarget('email-target')).length === 0, 'foreign verification attempts have no side effects');
  const issue = await service.issueTargetVerificationForSubject('user', 'u1', 'email-target', '2026-01-01T01:00:00.000Z');
  assert(issue.verificationKind === 'email_verification' && issue.rawToken === 'fixed-token', 'should issue deterministic email verification token');

  const badConsume = await service.consumeTargetVerificationForSubject('user', 'u1', 'email-target', 'wrong', '2026-01-01T01:10:00.000Z');
  assert(badConsume.verified === false && badConsume.reason === 'invalid_verification_token', 'wrong token should fail');

  const okConsume = await service.consumeTargetVerificationForSubject('user', 'u1', 'email-target', 'fixed-token', '2026-01-01T01:11:00.000Z');
  assert(okConsume.verified, 'matching token should verify target');
  const target = await targetRepository.getTargetById('email-target');
  assert(target?.status === 'active' && target.verifiedAt === '2026-01-01T01:11:00.000Z', 'target must activate and set verifiedAt');

  const already = await service.issueTargetVerificationForSubject('user', 'u1', 'email-target', '2026-01-01T01:12:00.000Z');
  assert(already.alreadyActive, 'already active target should not create new verification');

  await targetRepository.saveTarget({ targetId: 'push-target', subjectKind: 'user', subjectId: 'u1', channel: 'push', targetKind: 'push_endpoint', status: 'unverified', label: null, addressJson: '{"endpoint":"https://example.invalid/push"}', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', verifiedAt: null });
  const pushIssue = await service.issueTargetVerificationForSubject('user', 'u1', 'push-target', '2026-01-01T02:00:00.000Z');
  const pushResend = await service.resendTargetVerificationForSubject('user', 'u1', 'push-target', '2026-01-01T02:05:00.000Z');
  assert(pushIssue.verificationId !== pushResend.verificationId, 'resend should rotate verification id');

  await service.expireStaleVerifications('2026-01-02T03:00:00.000Z');
  const latest = await verificationRepository.getLatestActiveVerificationForTarget('push-target', 'push_verification');
  assert(latest === null, 'stale verification should expire and no longer be active');

  const cfgSmtp = getNotificationDeliveryProviderConfig({ NOTIFICATION_SMTP_HOST: 'smtp.local', NOTIFICATION_SMTP_USER: 'user', NOTIFICATION_SMTP_PASSWORD: 'pw' });
  assert(cfgSmtp.emailProvider === 'smtp_email', 'smtp should auto-detect');
  const cfgHttp = getNotificationDeliveryProviderConfig({ NOTIFICATION_HTTP_EMAIL_ENDPOINT: 'https://email.local/send', NOTIFICATION_HTTP_EMAIL_API_KEY: 'k', NOTIFICATION_EMAIL_FROM_ADDRESS: 'ops@x.test' });
  assert(cfgHttp.emailProvider === 'http_email', 'http email should auto-detect');
  const cfgPush = getNotificationDeliveryProviderConfig({ NOTIFICATION_WEB_PUSH_ENDPOINT: 'https://push.local/send', NOTIFICATION_WEB_PUSH_API_KEY: 'k' });
  assert(cfgPush.pushProvider === 'web_push', 'push should auto-detect');
  const caps = getNotificationProviderCapabilities(cfgHttp);
  assert(caps.inApp.enabled && caps.email.enabled && !caps.push.enabled, 'capabilities should reflect provider readiness');
}
