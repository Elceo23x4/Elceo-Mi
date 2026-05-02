import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getNotificationRuntimes } from '@/lib/server/composition';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, requireSecurityDecision } from '@/lib/server/security';
import { validateVerificationIssueRequest } from '@elceo/schemas';

export const POST = withApiErrorBoundary(async (request: Request) => {
  const subject = await requireAuthenticatedSubject();
  const body = unwrapValidation(validateVerificationIssueRequest(await parseJsonBody(request)));
  const actor = { actorKind: 'user' as const, actorId: subject.userId, subjectId: subject.subjectId };
  const security = await requireSecurityDecision({ request, routePath: '/api/notifications/verification/issue', method: 'POST', actionKind: 'notification_verification_issue', actor, subjectId: subject.subjectId, requestBody: body });
  if (!security.ok) return security.response;
  try {
    const verification = await getNotificationRuntimes().verification.issueTargetVerification(body.targetId);
    await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, responseBody: { verification } });
    await auditInternalMutation({ actor, subjectId: subject.subjectId, actionKind: 'notification_verification_issue', routePath: '/api/notifications/verification/issue', method: 'POST', request, idempotencyKey: security.idempotencyKey });
    return jsonSuccess({ verification });
  } catch (error) {
    await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown_error' });
    throw error;
  }
});
