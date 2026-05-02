import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getNotificationRuntimes } from '@/lib/server/composition';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, requireSecurityDecision } from '@/lib/server/security';
import { validateTargetCreateRequest } from '@elceo/schemas';

const targetKindByChannel = { in_app: 'in_app_user', email: 'email_address', push: 'push_endpoint', sms: 'email_address', webhook: 'email_address' } as const;

export const GET = withApiErrorBoundary(async () => {
  const subject = await requireAuthenticatedSubject();
  const targets = await getNotificationRuntimes().management.listTargetsForSubjectDetailed(subject.subjectKind, subject.subjectId);
  return jsonSuccess({ targets });
});

export const POST = withApiErrorBoundary(async (request: Request) => {
  const subject = await requireAuthenticatedSubject();
  const body = unwrapValidation(validateTargetCreateRequest(await parseJsonBody(request)));
  const actor = { actorKind: 'user' as const, actorId: subject.userId, subjectId: subject.subjectId };
  const security = await requireSecurityDecision({ request, routePath: '/api/notifications/targets', method: 'POST', actionKind: 'notification_target_write', actor, subjectId: subject.subjectId, requestBody: body });
  if (!security.ok) return security.response;
  try {
    const target = await getNotificationRuntimes().management.registerOrUpdateTarget({
      subjectKind: subject.subjectKind,
      subjectId: subject.subjectId,
      channel: body.channel,
      targetKind: targetKindByChannel[body.channel],
      label: body.label ?? null,
      addressJson: JSON.stringify({ value: body.value })
    });
    await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, responseBody: { target } });
    await auditInternalMutation({ actor, subjectId: subject.subjectId, actionKind: 'notification_target_write', routePath: '/api/notifications/targets', method: 'POST', request, idempotencyKey: security.idempotencyKey });
    return jsonSuccess({ target });
  } catch (error) {
    await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown_error' });
    throw error;
  }
});
