import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { getBillingRuntime } from '@/lib/server/composition';
import { validateAdminBillingChangePlanRequest } from '@elceo/schemas';

export const POST = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const body = unwrapValidation(validateAdminBillingChangePlanRequest(await parseJsonBody(request)));
  const subscription = await getBillingRuntime().changePlan('user', body.subjectId, body.nextPlanKind, body.interval, body.effectiveAt, body.reason);
  return jsonSuccess({ subscription });
});
