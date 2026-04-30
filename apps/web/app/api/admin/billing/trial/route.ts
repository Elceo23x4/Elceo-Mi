import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { getBillingRuntime } from '@/lib/server/composition';
import { validateAdminBillingTrialRequest } from '@elceo/schemas';

export const POST = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const body = unwrapValidation(validateAdminBillingTrialRequest(await parseJsonBody(request)));
  const subscription = await getBillingRuntime().startTrial('user', body.subjectId, body.planKind, body.trialEndsAt, body.providerKind);
  return jsonSuccess({ subscription });
});
