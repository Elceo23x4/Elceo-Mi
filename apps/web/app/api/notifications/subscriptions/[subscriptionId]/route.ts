import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getNotificationRuntimes } from '@/lib/server/composition';
import { validateSubscriptionUpdateRequest } from '@elceo/schemas';

export const PATCH = withApiErrorBoundary(async (request: Request, context: { params: Promise<{ subscriptionId: string }> }) => {
  await requireAuthenticatedSubject();
  const { subscriptionId } = await context.params;
  const body = unwrapValidation(validateSubscriptionUpdateRequest(await parseJsonBody(request)));
  const runtime = getNotificationRuntimes().management;
  if (body.isEnabled === true) await runtime.enableSubscription(subscriptionId);
  if (body.isEnabled === false) await runtime.disableSubscription(subscriptionId);
  if (body.minimumMaterialityScore !== undefined) await runtime.updateSubscriptionThreshold(subscriptionId, body.minimumMaterialityScore ?? null);
  return jsonSuccess({ subscriptionId, updated: true });
});
