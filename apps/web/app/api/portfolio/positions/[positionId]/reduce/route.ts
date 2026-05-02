import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, requireSecurityDecision } from '@/lib/server/security';
import { validatePositionReduceRequest } from '@elceo/schemas';

export const POST = withApiErrorBoundary(async (request: Request, context: { params: Promise<{ positionId: string }> }) => {
  const subject = await requireAuthenticatedSubject();
  const actor = { actorKind: 'user' as const, actorId: subject.userId, subjectId: subject.subjectId };
  const { positionId } = await context.params;
  const body = unwrapValidation(validatePositionReduceRequest(await parseJsonBody(request)));
    const security = await requireSecurityDecision({ request, routePath: '/api/portfolio/positions/[positionId]/reduce', method: 'POST', actionKind: 'portfolio_position_write', actor, subjectId: subject.subjectId, requestBody: body });
  if (!security.ok) return security.response;
  try {
const position = await getApplicationStateRuntime().portfolio.reducePosition(positionId, body, { actorKind: 'user', actorId: subject.userId });
    const envelope = { ok: true as const, data: { position } };
    await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, responseBody: { position }, responseEnvelope: envelope, httpStatus: 200, requestHash: security.requestHash });
    await auditInternalMutation({ actor, subjectId: subject.subjectId, actionKind: 'portfolio_position_write', routePath: '/api/portfolio/positions/[positionId]/reduce', method: 'POST', request, idempotencyKey: security.idempotencyKey });
    return jsonSuccess({ position });
  } catch (error) { await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown_error' }); throw error; }
});
