import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireFeatureAccess } from '@/lib/server/access';
import { guardRouteCommercialEntitlement } from '@/lib/server/access';
import { getNotificationRuntimes } from '@/lib/server/composition';
import { resolveUserCommercialEntitlementSnapshot } from '@elceo/application-state';

export const GET = withApiErrorBoundary(async (request: Request) => {
  const access = await requireFeatureAccess('notifications.read', { request });
  if (!access.ok) return access.response;
  const subject = access.subject;
  const commercial = guardRouteCommercialEntitlement({ routePath: '/api/notifications/summary', method: 'GET', featureKey: 'premium.full_access', snapshot: await resolveUserCommercialEntitlementSnapshot(subject.userId) });
  if (!commercial.allowed) return commercial.response;
  const runtime = getNotificationRuntimes();
  const [managementSummary, feedbackSummary] = await Promise.all([
    runtime.management.getNotificationOperationalSummaryForSubject(subject.subjectKind, subject.subjectId),
    runtime.feedback.getNotificationFeedbackSummary()
  ]);
  return jsonSuccess({ managementSummary, feedbackSummary, inboxUnreadCount: managementSummary.inboxUnreadCount });
});
