import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';

export const GET = withApiErrorBoundary(async (_request: Request, context: { params: Promise<{ caseId: string }> }) => {
  const subject = await requireAuthenticatedSubject();
  const { caseId } = await context.params;
  const replay = await getApplicationStateRuntime().journal.getJournalCaseReplay(caseId);
  if (!replay || replay.caseData.identity.subjectId !== subject.subjectId) throw new Error('not_found');
  return jsonSuccess({ replay });
});
