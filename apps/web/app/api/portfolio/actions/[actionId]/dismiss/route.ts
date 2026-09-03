import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, requireSecurityDecision } from '@/lib/server/security';

export const POST = withApiErrorBoundary(async (request: Request, context: { params: Promise<{ actionId: string }> }) => {
  const subject = await requireAuthenticatedSubject();
  const actor = { actorKind: 'user' as const, actorId: subject.userId, subjectId: subject.subjectId };
  const { actionId } = await context.params;
  const security = await requireSecurityDecision({ request, routePath: '/api/portfolio/actions/[actionId]/dismiss', method: 'POST', actionKind: 'portfolio_action_write', actor, subjectId: subject.subjectId, requestBody: {} });
  if (!security.ok) return security.response;
  try {
    const action = await getApplicationStateRuntime().portfolio.dismissActionItem('user', subject.subjectId, actionId, new Date().toISOString(), { actorKind: 'user', actorId: subject.userId });
      const envelope = { ok: true as const, data: { action } };

      await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, responseBody: { action }, responseEnvelope: envelope, httpStatus: 200, requestHash: security.requestHash });
    await auditInternalMutation({ actor, subjectId: subject.subjectId, actionKind: 'portfolio_action_write', routePath: '/api/portfolio/actions/[actionId]/dismiss', method: 'POST', request, idempotencyKey: security.idempotencyKey });
    return jsonSuccess({ action });
  } catch (error) { await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown_error' }); throw error; }
});
