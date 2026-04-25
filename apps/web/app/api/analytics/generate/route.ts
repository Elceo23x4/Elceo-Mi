import { parseSearchParams, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getAnalyticsRuntime } from '@/lib/server/composition';

export const POST = withApiErrorBoundary(async (request: Request) => {
  const subject = await requireAuthenticatedSubject();
  const params = parseSearchParams(request.url);
  const snapshot = await getAnalyticsRuntime().analytics.generateAnalyticsSnapshot({
    subjectKind: subject.subjectKind,
    subjectId: subject.subjectId,
    assetScope: (params.get('assetScope') ?? '*') as '*' | string,
    timeframeScope: (params.get('timeframeScope') ?? '*') as '*' | 'M5' | 'M15' | 'H1' | 'H4' | 'D1',
    lookbackDays: Number.parseInt(params.get('lookbackDays') ?? '180', 10)
  });
  return jsonSuccess({ snapshot });
});
