import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getTenantApplicationStateRuntime } from '@/lib/server/composition';

export const GET = withApiErrorBoundary(async (_request: Request, context: { params: Promise<{ caseId: string }> }) => {
  const subject = await requireAuthenticatedSubject();
  const { caseId } = await context.params;
  const found = await getTenantApplicationStateRuntime(subject).journal.getJournalCase('user', subject.subjectId, caseId);
  if (!found) throw new Error('not_found');
  return jsonSuccess({ case: found });
});
