import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { getApplicationStateRuntime } from '@/lib/server/composition';
import { maybeIncrementUsage, requireFeatureAccess } from '@/lib/server/access';

export const POST = withApiErrorBoundary(async (request: Request) => {
  const access = await requireFeatureAccess('portfolio.snapshot.generate', { request });
  if (!access.ok) return access.response;
  const snapshot = await getApplicationStateRuntime().portfolio.generatePortfolioSnapshot(access.subject.subjectKind, access.subject.subjectId);
  await maybeIncrementUsage('portfolio.snapshot.generate', { request });
  return jsonSuccess({ snapshot });
});
