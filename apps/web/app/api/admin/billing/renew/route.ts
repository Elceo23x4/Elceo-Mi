import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { getBillingRuntime } from '@/lib/server/composition';
import { validateAdminBillingRenewRequest } from '@elceo/schemas';

export const POST = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const body = unwrapValidation(validateAdminBillingRenewRequest(await parseJsonBody(request)));
  const subscription = await getBillingRuntime().renewPaidPlan('user', body.subjectId, body.nextPeriodStart, body.nextPeriodEnd);
  return jsonSuccess({ subscription });
});
