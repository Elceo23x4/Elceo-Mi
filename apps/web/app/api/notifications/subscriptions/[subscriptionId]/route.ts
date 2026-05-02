import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getNotificationRuntimes } from '@/lib/server/composition';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, requireSecurityDecision } from '@/lib/server/security';
import { validateSubscriptionUpdateRequest } from '@elceo/schemas';

export const PATCH = withApiErrorBoundary(async (request: Request, context: { params: Promise<{ subscriptionId: string }> }) => {
  const subject = await requireAuthenticatedSubject();
  const { subscriptionId } = await context.params;
  const body = unwrapValidation(validateSubscriptionUpdateRequest(await parseJsonBody(request)));
  const actor = { actorKind: 'user' as const, actorId: subject.userId, subjectId: subject.subjectId };
  const security = await requireSecurityDecision({ request, routePath: '/api/notifications/subscriptions/[subscriptionId]', method: 'PATCH', actionKind: 'notification_subscription_write', actor, subjectId: subject.subjectId, requestBody: body });
  if (!security.ok) return security.response;
  try {
    const runtime = getNotificationRuntimes().management;
    if (body.isEnabled === true) await runtime.enableSubscription(subscriptionId);
    if (body.isEnabled === false) await runtime.disableSubscription(subscriptionId);
    if (body.minimumMaterialityScore !== undefined) await runtime.updateSubscriptionThreshold(subscriptionId, body.minimumMaterialityScore ?? null);
    const envelope = { ok: true as const, data: { subscriptionId, updated: true } };

    await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, responseBody: { subscriptionId, updated: true }, responseEnvelope: envelope, httpStatus: 200, requestHash: security.requestHash });
    await auditInternalMutation({ actor, subjectId: subject.subjectId, actionKind: 'notification_subscription_write', routePath: '/api/notifications/subscriptions/[subscriptionId]', method: 'PATCH', request, idempotencyKey: security.idempotencyKey });
    return jsonSuccess({ subscriptionId, updated: true });
  } catch (error) {
    await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown_error' });
    throw error;
  }
});
