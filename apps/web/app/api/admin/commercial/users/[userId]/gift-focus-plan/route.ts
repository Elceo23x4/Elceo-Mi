import { jsonError, jsonSuccess, parseJsonBody, withApiErrorBoundary } from '@/lib/server/api';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { requireFeatureAccess } from '@/lib/server/access';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, getSecurityActorFromRequest, requireSecurityDecision } from '@/lib/server/security';
import { giftFocusPlanToUser } from '@elceo/application-state';
import { validateSuperAdminStepUpVerification } from '@elceo/schemas';

export const POST = withApiErrorBoundary(async (request: Request, context: { params: Promise<{ userId: string }> }) => {
  requireInternalRouteAccess(request);
  const access = await requireFeatureAccess('admin.ops', { request });
  if (!access.ok) return access.response;
  const { userId } = await context.params;
  const body = (await parseJsonBody(request)) as Record<string, unknown>;
  const step = validateSuperAdminStepUpVerification(body.stepUpVerification);
  if (!step.ok) return jsonError('forbidden', 'Step-up required', ['step_up_required'], 403);
  if (step.value.status !== 'verified') return jsonError('forbidden', 'Step-up required', ['step_up_required'], 403);
  if (step.value.verifiedAt && Date.now() - Date.parse(step.value.verifiedAt) > 10 * 60 * 1000) return jsonError('forbidden', 'Step-up verification failed', ['step_up_verification_failed'], 403);
  const duration = body.duration;
  if (duration !== 'two_weeks' && duration !== 'one_month') return jsonError('validation_error', 'Validation failed', ['invalid_duration'], 400);
  const actor = getSecurityActorFromRequest(request, 'admin');
  const security = await requireSecurityDecision({ request, routePath: '/api/admin/commercial/users/[userId]/gift-focus-plan', method: 'POST', actionKind: 'admin_write', actor, subjectId: access.subject.subjectId, requestBody: body });
  if (!security.ok) return security.response;
  try {
    const result = giftFocusPlanToUser({ actorSuperAdminId: access.subject.userId, targetUserId: userId, duration, reasonCode: 'commercial_support', operatorNote: typeof body.operatorNote === 'string' ? body.operatorNote : '', stepUpVerification: step.value, idempotencyKey: security.idempotencyKey, requestedAt: new Date().toISOString() });
    if (result.status !== 'success' || !result.giftRecord) return jsonError('forbidden', 'Step-up required', ['step_up_required'], 403);
    const response = { ok: true as const, action: 'gift_focus_plan', targetUserId: userId, giftStatus: result.giftRecord.status, startsAt: result.giftRecord.startsAt, endsAt: result.giftRecord.endsAt, entitlementResult: result.resultingEntitlementState };
    await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, requestHash: security.requestHash, responseBody: response, responseEnvelope: { ok: true as const, data: response }, httpStatus: 200 });
    await auditInternalMutation({ actor, subjectId: userId, actionKind: 'admin_write', routePath: '/api/admin/commercial/users/[userId]/gift-focus-plan', method: 'POST', request, idempotencyKey: security.idempotencyKey, metadata: { action: 'gift_focus_plan', stepUpStatus: step.value.status, redactionStatus: 'safe', targetUserId: userId } });
    return jsonSuccess(response);
  } catch (error) { await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown' }); throw error; }
});
