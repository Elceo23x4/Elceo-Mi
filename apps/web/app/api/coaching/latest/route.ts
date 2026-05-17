import { parseSearchParams, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireFeatureAccess } from '@/lib/server/access';
import { guardRouteCommercialEntitlement } from '@/lib/server/access';
import { getAnalyticsRuntime } from '@/lib/server/composition';
import type { UserCommercialEntitlementSnapshot } from '@elceo/types';


function resolveCommercialSnapshot(request: Request, userId: string): UserCommercialEntitlementSnapshot {
  const fromHeader = request.headers.get('x-elceo-commercial-snapshot');
  if (process.env.ELCEO_ALLOW_TEST_COMMERCIAL_SNAPSHOT === '1' && fromHeader) return JSON.parse(fromHeader) as UserCommercialEntitlementSnapshot;
  return { userId, nowIso: new Date().toISOString(), trialStartedAt: null, activePlanCode: null, subscriptionActive: false, socialIdentifiers: [], userRestrictionStatus: 'none' };
}

export const GET = withApiErrorBoundary(async (request: Request) => {
  const access = await requireFeatureAccess('coaching.read', { request });
  if (!access.ok) return access.response;
  const subject = access.subject;
  const commercial = guardRouteCommercialEntitlement({ routePath: '/api/coaching/latest', method: 'GET', featureKey: 'premium.full_access', snapshot: resolveCommercialSnapshot(request, subject.userId) });
  if (!commercial.allowed) return commercial.response;
  const params = parseSearchParams(request.url);
  const snapshot = await getAnalyticsRuntime().coaching.getLatestCoachingSnapshot(subject.subjectKind, subject.subjectId, (params.get('assetScope') ?? '*') as '*' | string, (params.get('timeframeScope') ?? '*') as '*' | 'M5' | 'M15' | 'H1' | 'H4' | 'D1');
  return jsonSuccess({ snapshot });
});
