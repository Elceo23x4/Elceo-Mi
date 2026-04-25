import { parseSearchParams, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';

export const POST = withApiErrorBoundary(async (request: Request) => {
  const subject = await requireAuthenticatedSubject();
  const params = parseSearchParams(request.url);
  const assetScope = (params.get('assetScope') ?? '*') as '*' | string;
  const timeframeScope = (params.get('timeframeScope') ?? '*') as '*' | 'M5' | 'M15' | 'H1' | 'H4' | 'D1';
  const snapshot = await getApplicationStateRuntime().journalInfluence.generateJournalInfluenceSnapshot({ subjectKind: subject.subjectKind, subjectId: subject.subjectId, assetScope, timeframeScope });
  return jsonSuccess({ snapshot });
});
