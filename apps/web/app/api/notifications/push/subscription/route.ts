import { createHash } from 'node:crypto';
import { jsonSuccess, parseJsonBody, withApiErrorBoundary } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getNotificationRuntimes } from '@/lib/server/composition';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, requireSecurityDecision } from '@/lib/server/security';

function parseBody(value: unknown): { subscriptionId: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('validation_error:invalid_body');
  const body = value as Record<string, unknown>;
  if (Object.keys(body).length !== 1 || typeof body.subscriptionId !== 'string') throw new Error('validation_error:subscriptionId_only');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.subscriptionId.trim())) throw new Error('validation_error:invalid_subscription_id');
  return { subscriptionId: body.subscriptionId };
}

async function mutate(request: Request, operation: 'bind' | 'unbind'): Promise<Response> {
  const subject = await requireAuthenticatedSubject();
  const body = parseBody(await parseJsonBody(request));
  const opaqueKey = `push-${operation}-${createHash('sha256').update(`${subject.subjectId}:${operation}:${body.subscriptionId.trim().toLowerCase()}`).digest('hex')}`;
  const securedRequest = new Request(request.url, { method: request.method, headers: new Headers(request.headers) });
  securedRequest.headers.set('Idempotency-Key', opaqueKey);
  const actor = { actorKind: 'user' as const, actorId: subject.userId, subjectId: subject.subjectId };
  const security = await requireSecurityDecision({ request: securedRequest, routePath: '/api/notifications/push/subscription', method: operation === 'bind' ? 'PUT' : 'DELETE', actionKind: 'notification_target_write', actor, subjectId: subject.subjectId, requestBody: { operation, subscriptionChecksum: createHash('sha256').update(body.subscriptionId).digest('hex') } });
  if (!security.ok) return security.response;
  try {
    const result = operation === 'bind'
      ? { target: await getNotificationRuntimes().management.bindPushSubscription(subject.subjectId, body.subscriptionId) }
      : await getNotificationRuntimes().management.unbindPushSubscription(subject.subjectId, body.subscriptionId);
    const envelope = { ok: true as const, data: result };
    await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, responseBody: result, responseEnvelope: envelope, httpStatus: 200, requestHash: security.requestHash });
    await auditInternalMutation({ actor, subjectId: subject.subjectId, actionKind: 'notification_target_write', routePath: '/api/notifications/push/subscription', method: operation === 'bind' ? 'PUT' : 'DELETE', request: securedRequest, idempotencyKey: opaqueKey, metadata: { operation } });
    return jsonSuccess(result);
  } catch (error) {
    await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown_error' });
    throw error;
  }
}

export const PUT = withApiErrorBoundary((request: Request) => mutate(request, 'bind'));
export const DELETE = withApiErrorBoundary((request: Request) => mutate(request, 'unbind'));
