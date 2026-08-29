import { parseSearchParams, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireFeatureAccess } from '@/lib/server/access';
import { guardRouteCommercialEntitlement } from '@/lib/server/access';
import { getAnalyticsRuntime } from '@/lib/server/composition';
import { resolveUserCommercialEntitlementSnapshot } from '@elceo/application-state';

export const GET = withApiErrorBoundary(async (request: Request) => {
  const access = await requireFeatureAccess('coaching.read', { request });
  if (!access.ok) return access.response;
  const subject = access.subject;
  const commercial = guardRouteCommercialEntitlement({ routePath: '/api/coaching/latest', method: 'GET', featureKey: 'premium.full_access', snapshot: await resolveUserCommercialEntitlementSnapshot(subject.userId) });
  if (!commercial.allowed) return commercial.response;
  const params = parseSearchParams(request.url);
  const snapshot = await getAnalyticsRuntime().coaching.getLatestCoachingSnapshot(subject.subjectKind, subject.subjectId, (params.get('assetScope') ?? '*') as '*' | string, (params.get('timeframeScope') ?? '*') as '*' | 'M5' | 'M15' | 'H1' | 'H4' | 'D1');
  return jsonSuccess({ snapshot });
});
