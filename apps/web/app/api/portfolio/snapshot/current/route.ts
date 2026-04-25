import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';

export const GET = withApiErrorBoundary(async () => {
  const subject = await requireAuthenticatedSubject();
  const snapshot = await getApplicationStateRuntime().portfolio.getPortfolioSnapshot(subject.subjectKind, subject.subjectId);
  return jsonSuccess({ snapshot });
});
