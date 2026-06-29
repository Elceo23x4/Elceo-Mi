import { jsonError, jsonSuccess, parseJsonBody, withApiErrorBoundary } from '@/lib/server/api';
import { requireFeatureAccess } from '@/lib/server/access';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { createSuperAdminStepUpChallenge, getSuperAdminCommercialRouteScope, getSuperAdminStepUpCoverageReport, isSuperAdminCommercialActionKind } from '@elceo/application-state';
import { validateSuperAdminStepUpChallengeRequest } from '@elceo/schemas';

export const POST = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const access = await requireFeatureAccess('admin.ops', { request });
  if (!access.ok) return access.response;

  const body = (await parseJsonBody(request)) as Record<string, unknown>;
  if (!isSuperAdminCommercialActionKind(body.actionKind)) return jsonError('validation_error', 'Validation failed', ['unsupported_action_kind'], 400);
  const routeScope = getSuperAdminCommercialRouteScope(body.actionKind);
  if (Object.prototype.hasOwnProperty.call(body, 'routeScope') && body.routeScope !== routeScope) return jsonError('validation_error', 'Validation failed', ['route_scope_mismatch'], 400);
  if (typeof body.targetUserId !== 'string' || body.targetUserId.trim() === '') return jsonError('validation_error', 'Validation failed', ['target_user_id_required'], 400);
  const targetUserId = body.targetUserId.trim();
  const parsed = validateSuperAdminStepUpChallengeRequest({
    actorUserId: access.subject.userId,
    actionKind: body.actionKind,
    routeScope,
    targetUserId,
    providerKind: body.providerKind,
    requestedAt: new Date().toISOString()
  });
  if (!parsed.ok) return jsonError('validation_error', 'Validation failed', ['invalid_step_up_challenge_request'], 400);
  let challenge;
  try {
    challenge = await createSuperAdminStepUpChallenge(parsed.value);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    if (message === 'step_up_rate_limited') return jsonError('bad_request', 'Rate limit exceeded', ['step_up_rate_limited'], 429);
    if (message === 'step_up_persistence_unavailable') return Response.json({ ok: false, error: { code: 'service_unavailable', message: 'Step-up service unavailable', details: ['step_up_persistence_unavailable'] } }, { status: 503 });
    if (message === 'step_up_actor_locked') return jsonError('forbidden', 'Step-up actor locked', ['step_up_actor_locked'], 423);
    return jsonError('validation_error', 'Validation failed', ['invalid_step_up_challenge_request'], 400);
  }
  return jsonSuccess({
    challengeId: challenge.challengeId,
    providerKind: challenge.providerKind,
    status: challenge.status,
    routeScope: challenge.routeScope,
    targetUserId: challenge.targetUserId,
    expiresAt: challenge.expiresAt,
    providerStatus: challenge.providerKind === 'fixture_test_only' ? 'fixture_test_only' : 'provider_pending',
    persistenceStatus: getSuperAdminStepUpCoverageReport().persistenceStatus
  });
});
