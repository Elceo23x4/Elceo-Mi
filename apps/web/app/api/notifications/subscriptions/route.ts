import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getNotificationRuntimes } from '@/lib/server/composition';
import { validateSubscriptionCreateRequest } from '@elceo/schemas';

export const GET = withApiErrorBoundary(async () => {
  const subject = await requireAuthenticatedSubject();
  const subscriptions = await getNotificationRuntimes().management.listSubscriptionsForSubjectDetailed(subject.subjectKind, subject.subjectId);
  return jsonSuccess({ subscriptions });
});

export const POST = withApiErrorBoundary(async (request: Request) => {
  const subject = await requireAuthenticatedSubject();
  const body = unwrapValidation(validateSubscriptionCreateRequest(await parseJsonBody(request)));
  const subscription = await getNotificationRuntimes().management.registerOrUpdateSubscription({
    subjectKind: subject.subjectKind,
    subjectId: subject.subjectId,
    channel: body.channel,
    assetScope: '*',
    timeframeScope: '*',
    ruleKeyScope: '*',
    enabled: body.isEnabled ?? true,
    minMaterialityScore: body.minimumMaterialityScore ?? null
  });
  return jsonSuccess({ subscription });
});
