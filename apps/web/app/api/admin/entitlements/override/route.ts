import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { validateAdminEntitlementOverrideRequest } from '@elceo/schemas';
import { getEntitlementsRuntime } from '@/lib/server/composition';

export const POST = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const body = unwrapValidation(validateAdminEntitlementOverrideRequest(await parseJsonBody(request)));
  const accountState = await getEntitlementsRuntime().setInternalOverride('user', body.subjectId, body.internalOverride);
  return jsonSuccess({ accountState });
});
