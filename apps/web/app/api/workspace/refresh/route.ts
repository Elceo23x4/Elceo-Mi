import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { validateWorkspaceRefreshRequest } from '@elceo/schemas';
import { getRefreshRuntime } from '@/lib/server/composition';
import { maybeIncrementUsage, requireFeatureAccess } from '@/lib/server/access';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, requireSecurityDecision } from '@/lib/server/security';

export const POST = withApiErrorBoundary(async (request: Request) => {
  const access = await requireFeatureAccess('workspace.refresh', { request });
  if (!access.ok) return access.response;
  const body = unwrapValidation(validateWorkspaceRefreshRequest(await parseJsonBody(request)));
  const actor = { actorKind: 'user' as const, actorId: access.subject.subjectId, subjectId: access.subject.subjectId };
  const security = await requireSecurityDecision({ request, routePath: '/api/workspace/refresh', method: 'POST', actionKind: 'workspace_refresh', actor, subjectId: access.subject.subjectId, requestBody: body });
  if (!security.ok) return security.response;
  try {
    const report = await getRefreshRuntime().runSnapshotRefresh(access.subject.subjectKind, access.subject.subjectId, body.triggerKind);
    await maybeIncrementUsage('workspace.refresh', { request });
    await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, responseBody: { report } });
    await auditInternalMutation({ actor, subjectId: access.subject.subjectId, actionKind: 'workspace_refresh', routePath: '/api/workspace/refresh', method: 'POST', request, idempotencyKey: security.idempotencyKey });
    return jsonSuccess({ report });
  } catch (error) {
    await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown_error' });
    throw error;
  }
});
