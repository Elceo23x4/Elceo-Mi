import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { validateWorkspaceRefreshRequest } from '@elceo/schemas';
import { getRefreshRuntime } from '@/lib/server/composition';
import { maybeIncrementUsage, requireFeatureAccess } from '@/lib/server/access';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, requireSecurityDecision } from '@/lib/server/security';

export const POST = withApiErrorBoundary(async (request: Request) => {
  const access = await requireFeatureAccess('refresh.run', { request });
  if (!access.ok) return access.response;
  const body = unwrapValidation(validateWorkspaceRefreshRequest(await parseJsonBody(request)));
  const actor = { actorKind: 'user' as const, actorId: access.subject.subjectId, subjectId: access.subject.subjectId };
  const security = await requireSecurityDecision({ request, routePath: '/api/refresh/run', method: 'POST', actionKind: 'refresh_run', actor, subjectId: access.subject.subjectId, requestBody: body });
  if (!security.ok) return security.response;
  try {
    const run = await getRefreshRuntime().runSnapshotRefresh(access.subject.subjectKind, access.subject.subjectId, body.triggerKind);
    await maybeIncrementUsage('refresh.run', { request });
    const envelope = { ok: true as const, data: { run } };
    await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, responseBody: { run }, responseEnvelope: envelope, httpStatus: 200, requestHash: security.requestHash });
    await auditInternalMutation({ actor, subjectId: access.subject.subjectId, actionKind: 'refresh_run', routePath: '/api/refresh/run', method: 'POST', request, idempotencyKey: security.idempotencyKey });
    return jsonSuccess({ run });
  } catch (error) {
    await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown_error' });
    throw error;
  }
});
