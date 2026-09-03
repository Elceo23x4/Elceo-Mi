import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, requireSecurityDecision } from '@/lib/server/security';
import { validateActionUpdateRequest } from '@elceo/schemas';

export const GET = withApiErrorBoundary(async (_request: Request, context: { params: Promise<{ actionId: string }> }) => {
  const subject = await requireAuthenticatedSubject();
  const { actionId } = await context.params;
  const replay = await getApplicationStateRuntime().portfolio.getPortfolioEntityReplay('user', subject.subjectId, 'action_item', actionId);
  if (!replay) throw new Error('not_found');
  return jsonSuccess({ action: replay.current, replay });
});

export const PATCH = withApiErrorBoundary(async (request: Request, context: { params: Promise<{ actionId: string }> }) => {
  const subject = await requireAuthenticatedSubject();
  const actor = { actorKind: 'user' as const, actorId: subject.userId, subjectId: subject.subjectId };
  const { actionId } = await context.params;
  const patch = unwrapValidation(validateActionUpdateRequest(await parseJsonBody(request)));
  const security = await requireSecurityDecision({ request, routePath: '/api/portfolio/actions/[actionId]', method: 'PATCH', actionKind: 'portfolio_action_write', actor, subjectId: subject.subjectId, requestBody: patch });
  if (!security.ok) return security.response;
  try {
    const action = await getApplicationStateRuntime().portfolio.updateActionItem('user', subject.subjectId, actionId, patch, { actorKind: 'user', actorId: subject.userId });
      const envelope = { ok: true as const, data: { action } };

      await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, responseBody: { action }, responseEnvelope: envelope, httpStatus: 200, requestHash: security.requestHash });
    await auditInternalMutation({ actor, subjectId: subject.subjectId, actionKind: 'portfolio_action_write', routePath: '/api/portfolio/actions/[actionId]', method: 'PATCH', request, idempotencyKey: security.idempotencyKey });
    return jsonSuccess({ action });
  } catch (error) { await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown_error' }); throw error; }
});
