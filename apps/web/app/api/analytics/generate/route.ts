import { parseSearchParams, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { getAnalyticsRuntime } from '@/lib/server/composition';
import { maybeIncrementUsage, requireFeatureAccess } from '@/lib/server/access';

export const POST = withApiErrorBoundary(async (request: Request) => {
  const access = await requireFeatureAccess('analytics.generate', { request });
  if (!access.ok) return access.response;
  const params = parseSearchParams(request.url);
  const snapshot = await getAnalyticsRuntime().analytics.generateAnalyticsSnapshot({
    subjectKind: access.subject.subjectKind,
    subjectId: access.subject.subjectId,
    assetScope: (params.get('assetScope') ?? '*') as '*' | string,
    timeframeScope: (params.get('timeframeScope') ?? '*') as '*' | 'M5' | 'M15' | 'H1' | 'H4' | 'D1',
    lookbackDays: Number.parseInt(params.get('lookbackDays') ?? '180', 10)
  });
  await maybeIncrementUsage('analytics.generate', { request });
  return jsonSuccess({ snapshot });
});
