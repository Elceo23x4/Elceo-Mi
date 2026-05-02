import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { getNotificationRuntimes } from '@/lib/server/composition';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, getSecurityActorFromRequest, requireSecurityDecision } from '@/lib/server/security';

export const POST = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const actor = getSecurityActorFromRequest(request, 'internal');
  const security = await requireSecurityDecision({ request, routePath: '/api/notifications/delivery/dispatch', method: 'POST', actionKind: 'notification_dispatch', actor, requestBody: {} });
  if (!security.ok) return security.response;
  try {
    const report = await getNotificationRuntimes().delivery.dispatchDue();
    const envelope = { ok: true as const, data: { report } };

    await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, responseBody: { report }, responseEnvelope: envelope, httpStatus: 200, requestHash: security.requestHash });
    await auditInternalMutation({ actor, actionKind: 'notification_dispatch', routePath: '/api/notifications/delivery/dispatch', method: 'POST', request, idempotencyKey: security.idempotencyKey });
    return jsonSuccess({ report });
  } catch (error) {
    await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown_error' });
    throw error;
  }
});
