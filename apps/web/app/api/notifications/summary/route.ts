import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireFeatureAccess } from '@/lib/server/access';
import { guardRouteCommercialEntitlement } from '@/lib/server/access';
import { getNotificationRuntimes } from '@/lib/server/composition';
import type { UserCommercialEntitlementSnapshot } from '@elceo/types';


function resolveCommercialSnapshot(request: Request, userId: string): UserCommercialEntitlementSnapshot {
  const fromHeader = request.headers.get('x-elceo-commercial-snapshot');
  if (process.env.ELCEO_ALLOW_TEST_COMMERCIAL_SNAPSHOT === '1' && fromHeader) return JSON.parse(fromHeader) as UserCommercialEntitlementSnapshot;
  return { userId, nowIso: new Date().toISOString(), trialStartedAt: null, activePlanCode: null, subscriptionActive: false, socialIdentifiers: [], userRestrictionStatus: 'none' };
}

export const GET = withApiErrorBoundary(async (request: Request) => {
  const access = await requireFeatureAccess('notifications.read', { request });
  if (!access.ok) return access.response;
  const subject = access.subject;
  const commercial = guardRouteCommercialEntitlement({ routePath: '/api/notifications/summary', method: 'GET', featureKey: 'premium.full_access', snapshot: resolveCommercialSnapshot(request, subject.userId) });
  if (!commercial.allowed) return commercial.response;
  const runtime = getNotificationRuntimes();
  const [managementSummary, feedbackSummary] = await Promise.all([
    runtime.management.getNotificationOperationalSummaryForSubject(subject.subjectKind, subject.subjectId),
    runtime.feedback.getNotificationFeedbackSummary()
  ]);
  return jsonSuccess({ managementSummary, feedbackSummary, inboxUnreadCount: managementSummary.inboxUnreadCount });
});
