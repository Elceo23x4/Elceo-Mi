import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { getNotificationRuntimes } from '@/lib/server/composition';
import { requireFeatureAccess } from '@/lib/server/access';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, getSecurityActorFromRequest, requireSecurityDecision } from '@/lib/server/security';

export const POST = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const access = await requireFeatureAccess('admin.ops', { request });
  if (!access.ok) return access.response;
  const actor = getSecurityActorFromRequest(request, 'internal');
  const security = await requireSecurityDecision({ request, routePath: '/api/ops/notifications/expire-verifications', method: 'POST', actionKind: 'internal_mutation', actor, requestBody: {} });
  if (!security.ok) return security.response;
  try {
    const report = await getNotificationRuntimes().verification.expireStaleVerifications();
    await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, responseBody: { report } });
    await auditInternalMutation({ actor, actionKind: 'internal_mutation', routePath: '/api/ops/notifications/expire-verifications', method: 'POST', request, idempotencyKey: security.idempotencyKey });
    return jsonSuccess({ report });
  } catch (error) {
    await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown_error' });
    throw error;
  }
});
