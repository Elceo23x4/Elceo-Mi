import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';
import { validateJournalReviewRequest } from '@elceo/schemas';

export const POST = withApiErrorBoundary(async (request: Request, context: { params: Promise<{ caseId: string }> }) => {
  const subject = await requireAuthenticatedSubject();
  const { caseId } = await context.params;
  const patch = unwrapValidation(validateJournalReviewRequest(await parseJsonBody(request)));
  const updated = await getApplicationStateRuntime().journal.reviewCase(caseId, patch as never, { actorKind: 'user', actorId: subject.userId });
  if (updated.identity.subjectId !== subject.subjectId) throw new Error('forbidden');
  return jsonSuccess({ case: updated });
});
