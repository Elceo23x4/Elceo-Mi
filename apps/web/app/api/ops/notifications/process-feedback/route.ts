import { parseJsonBody, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { getNotificationRuntimes } from '@/lib/server/composition';
import { requireFeatureAccess } from '@/lib/server/access';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, getSecurityActorFromRequest, requireSecurityDecision } from '@/lib/server/security';

type FeedbackChannel = 'in_app' | 'email' | 'push' | 'sms' | 'webhook';
type FeedbackBody = { providerKind?: string; channel?: FeedbackChannel; rawEvent?: unknown };

export const POST = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const access = await requireFeatureAccess('admin.ops', { request });
  if (!access.ok) return access.response;
  const body = await parseJsonBody(request) as FeedbackBody;
  if (!body.providerKind || !body.channel) throw new Error('validation_error:providerKind and channel required');
  const actor = getSecurityActorFromRequest(request, 'internal');
  const security = await requireSecurityDecision({ request, routePath: '/api/ops/notifications/process-feedback', method: 'POST', actionKind: 'internal_mutation', actor, requestBody: body });
  if (!security.ok) return security.response;
  try {
    const report = await getNotificationRuntimes().feedback.processProviderEvent(body.providerKind, body.channel, body.rawEvent ?? {});
    await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, responseBody: { report } });
    await auditInternalMutation({ actor, actionKind: 'internal_mutation', routePath: '/api/ops/notifications/process-feedback', method: 'POST', request, idempotencyKey: security.idempotencyKey });
    return jsonSuccess({ report });
  } catch (error) {
    await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown_error' });
    throw error;
  }
});
