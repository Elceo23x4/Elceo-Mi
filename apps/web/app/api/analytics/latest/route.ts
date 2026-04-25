import { parseSearchParams, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getAnalyticsRuntime } from '@/lib/server/composition';

export const GET = withApiErrorBoundary(async (request: Request) => {
  const subject = await requireAuthenticatedSubject();
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
