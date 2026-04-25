import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';

export const GET = withApiErrorBoundary(async () => {
  const subject = await requireAuthenticatedSubject();
  const boundary = getApplicationStateRuntime().portfolio;
  const [summary, openActionQueue, weakeningOrInvalidated] = await Promise.all([
    boundary.getPortfolioAttentionSummary(subject.subjectKind, subject.subjectId),
    boundary.listOpenActionQueue(subject.subjectKind, subject.subjectId, 50),
    boundary.listWeakeningOrInvalidatedEntities(subject.subjectKind, subject.subjectId, 50)
  ]);
  return jsonSuccess({ summary, openActionQueue, weakeningOrInvalidated });
});
