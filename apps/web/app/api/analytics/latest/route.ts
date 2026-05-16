import { parseSearchParams, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireFeatureAccess } from '@/lib/server/access';
import { getAnalyticsRuntime } from '@/lib/server/composition';

export const GET = withApiErrorBoundary(async (request: Request) => {
  const access = await requireFeatureAccess('analytics.read', { request });
  if (!access.ok) return access.response;
  const subject = access.subject;
  const params = parseSearchParams(request.url);
  const snapshot = await getAnalyticsRuntime().analytics.getLatestAnalyticsSnapshot(
    subject.subjectKind,
    subject.subjectId,
    (params.get('assetScope') ?? '*') as '*' | string,
    (params.get('timeframeScope') ?? '*') as '*' | 'M5' | 'M15' | 'H1' | 'H4' | 'D1',
    Number.parseInt(params.get('lookbackDays') ?? '180', 10)
  );
  return jsonSuccess({ snapshot });
});
