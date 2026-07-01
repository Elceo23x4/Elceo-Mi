import { jsonError, jsonSuccess, parseJsonBody, withApiErrorBoundary } from '@/lib/server/api';
import { requireFeatureAccess } from '@/lib/server/access';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { isStepUpPersistenceError, verifySuperAdminStepUpChallenge } from '@elceo/application-state';
import { validateSuperAdminStepUpVerificationRequest } from '@elceo/schemas';

export const POST = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const access = await requireFeatureAccess('admin.ops', { request });
  if (!access.ok) return access.response;

  const body = (await parseJsonBody(request)) as Record<string, unknown>;
  const parsed = validateSuperAdminStepUpVerificationRequest({
    challengeId: body.challengeId,
    providerKind: body.providerKind,
    actorUserId: access.subject.userId,
    proof: body.proof,
    requestedAt: new Date().toISOString()
  });
  if (!parsed.ok) return jsonError('validation_error', 'Validation failed', ['invalid_step_up_verification_request'], 400);
  let result;
  try {
    result = await verifySuperAdminStepUpChallenge(parsed.value);
  } catch (error) {
    if (isStepUpPersistenceError(error)) return Response.json({ ok: false, error: { code: 'service_unavailable', message: 'Step-up service unavailable', details: ['step_up_persistence_unavailable'] } }, { status: 503 });
    throw error;
  }
  if (result.persistenceStatus === 'unavailable') return Response.json({ ok: false, error: { code: 'service_unavailable', message: 'Step-up service unavailable', details: ['step_up_persistence_unavailable'] } }, { status: 503 });
  return jsonSuccess({ ...result, proofAccepted: undefined });
});
