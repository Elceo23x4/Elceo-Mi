import { jsonError, jsonSuccess, parseJsonBody, withApiErrorBoundary } from '@/lib/server/api';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { requireFeatureAccess } from '@/lib/server/access';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, getSecurityActorFromRequest, requireSecurityDecision } from '@/lib/server/security';
import { giftFocusPlanToUser, getSuperAdminCommercialRouteScope } from '@elceo/application-state';

const commercialActionKind = 'focus_plan_gift' as const;
const routePath = getSuperAdminCommercialRouteScope(commercialActionKind);
const stepUpUnavailableEnvelope = { ok: false as const, error: { code: 'service_unavailable', message: 'Step-up service unavailable', details: ['step_up_persistence_unavailable'] } };
const stepUpDeniedEnvelope = { ok: false as const, error: { code: 'forbidden', message: 'Step-up verification failed', details: ['step_up_verification_failed'] } };
const requireChallengeId = (body: Record<string, unknown>) => typeof body.stepUpChallengeId === 'string' && body.stepUpChallengeId.trim() !== '' ? body.stepUpChallengeId.trim() : null;

export const POST = withApiErrorBoundary(async (request: Request, context: { params: Promise<{ userId: string }> }) => {
  requireInternalRouteAccess(request);
  const access = await requireFeatureAccess('admin.ops', { request });
  if (!access.ok) return access.response;
  const { userId } = await context.params;
  const body = (await parseJsonBody(request)) as Record<string, unknown>;
  const stepUpChallengeId = requireChallengeId(body);
  if (!stepUpChallengeId) return jsonError('forbidden', 'Step-up required', ['step_up_required'], 403);
  const duration = body.duration;
  if (duration !== 'two_weeks' && duration !== 'one_month') return jsonError('validation_error', 'Validation failed', ['invalid_duration'], 400);
  const operatorNote = typeof body.operatorNote === 'string' ? body.operatorNote : '';
  const actor = getSecurityActorFromRequest(request, 'admin');
  const securityRequest = { actorSuperAdminId: access.subject.userId, commercialActionKind, canonicalRouteScope: routePath, targetUserId: userId, stepUpChallengeId, duration, operatorNote };
  const security = await requireSecurityDecision({ request, routePath, method: 'POST', actionKind: 'admin_write', actor, subjectId: access.subject.subjectId, requestBody: securityRequest });
  if (!security.ok) return security.response;
  try {
    const result = await giftFocusPlanToUser({ actorSuperAdminId: access.subject.userId, targetUserId: userId, duration, reasonCode: 'commercial_support', operatorNote, stepUpChallengeId, idempotencyKey: security.idempotencyKey, requestedAt: new Date().toISOString() });
    if (result.failureReason === 'step_up_persistence_unavailable') { await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: 'step_up_persistence_unavailable' }); return Response.json(stepUpUnavailableEnvelope, { status: 503 }); } if (result.status !== 'success' || !result.giftRecord) { await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, requestHash: security.requestHash, responseBody: stepUpDeniedEnvelope, responseEnvelope: stepUpDeniedEnvelope, httpStatus: 403 }); return Response.json(stepUpDeniedEnvelope, { status: 403 }); }
    const response = { ok: true as const, action: 'gift_focus_plan', targetUserId: userId, giftStatus: result.giftRecord.status, startsAt: result.giftRecord.startsAt, endsAt: result.giftRecord.endsAt, entitlementResult: result.resultingEntitlementState, persistenceStatus: result.persistenceStatus };
    await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, requestHash: security.requestHash, responseBody: response, responseEnvelope: { ok: true as const, data: response }, httpStatus: 200 });
    await auditInternalMutation({ actor, subjectId: userId, actionKind: 'admin_write', routePath, method: 'POST', request, idempotencyKey: security.idempotencyKey, metadata: { action: 'gift_focus_plan', stepUpStatus: 'verified', redactionStatus: 'safe', targetUserId: userId } });
    return jsonSuccess(response);
  } catch (error) { await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown' }); throw error; }
});
