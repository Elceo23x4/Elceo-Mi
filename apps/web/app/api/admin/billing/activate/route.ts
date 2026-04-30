import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { getBillingRuntime } from '@/lib/server/composition';
import { validateAdminBillingActivateRequest } from '@elceo/schemas';

export const POST = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const body = unwrapValidation(validateAdminBillingActivateRequest(await parseJsonBody(request)));
  const subscription = await getBillingRuntime().activatePaidPlan('user', body.subjectId, body.planKind, body.interval, body.currentPeriodStart, body.currentPeriodEnd, body.providerKind);
  return jsonSuccess({ subscription });
});
