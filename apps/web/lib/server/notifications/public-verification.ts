import type { NotificationVerificationIssueResult } from '@elceo/types';

export type PublicVerificationIssue = Omit<NotificationVerificationIssueResult, 'rawToken'>;

export function toPublicVerificationIssue(result: NotificationVerificationIssueResult): PublicVerificationIssue {
  return {
    verificationId: result.verificationId,
    targetId: result.targetId,
    verificationKind: result.verificationKind,
    issuedAt: result.issuedAt,
    expiresAt: result.expiresAt,
    alreadyActive: result.alreadyActive
  };
}
