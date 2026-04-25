import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { validateWorkspaceRefreshRequest } from '@elceo/schemas';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getRefreshRuntime } from '@/lib/server/composition';

export const POST = withApiErrorBoundary(async (request: Request) => {
  const subject = await requireAuthenticatedSubject();
  const body = unwrapValidation(validateWorkspaceRefreshRequest(await parseJsonBody(request)));
  const run = await getRefreshRuntime().runSnapshotRefresh(subject.subjectKind, subject.subjectId, body.triggerKind);
  return jsonSuccess({ run });
});
