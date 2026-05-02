import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getNotificationRuntimes } from '@/lib/server/composition';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, requireSecurityDecision } from '@/lib/server/security';
import { validateSubscriptionCreateRequest } from '@elceo/schemas';

export const GET = withApiErrorBoundary(async () => {
  const subject = await requireAuthenticatedSubject();
  const subscriptions = await getNotificationRuntimes().management.listSubscriptionsForSubjectDetailed(subject.subjectKind, subject.subjectId);
  return jsonSuccess({ subscriptions });
});

export const POST = withApiErrorBoundary(async (request: Request) => {
  const subject = await requireAuthenticatedSubject();
  const body = unwrapValidation(validateSubscriptionCreateRequest(await parseJsonBody(request)));
  const actor = { actorKind: 'user' as const, actorId: subject.userId, subjectId: subject.subjectId };
  const security = await requireSecurityDecision({ request, routePath: '/api/notifications/subscriptions', method: 'POST', actionKind: 'notification_subscription_write', actor, subjectId: subject.subjectId, requestBody: body });
  if (!security.ok) return security.response;
  try {
    const subscription = await getNotificationRuntimes().management.registerOrUpdateSubscription({
      subjectKind: subject.subjectKind,
      subjectId: subject.subjectId,
      channel: body.channel,
      assetScope: '*',
      timeframeScope: '*',
      ruleKeyScope: '*',
      enabled: body.isEnabled ?? true,
      minMaterialityScore: body.minimumMaterialityScore ?? null
    });
    const envelope = { ok: true as const, data: { subscription } };
    await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, responseBody: { subscription }, responseEnvelope: envelope, httpStatus: 200, requestHash: security.requestHash });
    await auditInternalMutation({ actor, subjectId: subject.subjectId, actionKind: 'notification_subscription_write', routePath: '/api/notifications/subscriptions', method: 'POST', request, idempotencyKey: security.idempotencyKey });
    return jsonSuccess({ subscription });
  } catch (error) {
    await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown_error' });
    throw error;
  }
});
