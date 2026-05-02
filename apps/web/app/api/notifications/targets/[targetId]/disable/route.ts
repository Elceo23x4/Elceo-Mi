import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getNotificationRuntimes } from '@/lib/server/composition';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, requireSecurityDecision } from '@/lib/server/security';

export const POST = withApiErrorBoundary(async (request: Request, context: { params: Promise<{ targetId: string }> }) => {
  const subject = await requireAuthenticatedSubject();
  const { targetId } = await context.params;
  const actor = { actorKind: 'user' as const, actorId: subject.userId, subjectId: subject.subjectId };
  const security = await requireSecurityDecision({ request, routePath: '/api/notifications/targets/[targetId]/disable', method: 'POST', actionKind: 'notification_target_write', actor, subjectId: subject.subjectId, requestBody: { targetId } });
  if (!security.ok) return security.response;
  try {
    const target = await getNotificationRuntimes().management.disableTarget(targetId);
    const envelope = { ok: true as const, data: { target } };

    await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, responseBody: { target }, responseEnvelope: envelope, httpStatus: 200, requestHash: security.requestHash });
    await auditInternalMutation({ actor, subjectId: subject.subjectId, actionKind: 'notification_target_write', routePath: '/api/notifications/targets/[targetId]/disable', method: 'POST', request, idempotencyKey: security.idempotencyKey });
    return jsonSuccess({ target });
  } catch (error) {
    await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown_error' });
    throw error;
  }
});
