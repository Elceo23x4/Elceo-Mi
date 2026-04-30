import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { validateAdminEntitlementStateRequest } from '@elceo/schemas';
import { getEntitlementsRuntime } from '@/lib/server/composition';

export const POST = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const body = unwrapValidation(validateAdminEntitlementStateRequest(await parseJsonBody(request)));
  const accountState = await getEntitlementsRuntime().updateAccountState('user', body.subjectId, body.accountState);
  return jsonSuccess({ accountState });
});
