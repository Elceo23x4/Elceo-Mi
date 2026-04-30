import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { validateAdminEntitlementPlanRequest } from '@elceo/schemas';
import { getEntitlementsRuntime } from '@/lib/server/composition';

export const POST = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const body = unwrapValidation(validateAdminEntitlementPlanRequest(await parseJsonBody(request)));
  const accountState = await getEntitlementsRuntime().updateAccountPlan('user', body.subjectId, body.planKind, {
    planStartedAt: body.planStartedAt,
    planEndsAt: body.planEndsAt,
    trialEndsAt: body.trialEndsAt
  });
  return jsonSuccess({ accountState });
});
