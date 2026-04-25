import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getWorkspaceRuntime } from '@/lib/server/composition';

export const GET = withApiErrorBoundary(async () => {
  const subject = await requireAuthenticatedSubject();
  const agenda = await getWorkspaceRuntime().getCurrentWorkspaceAgenda(subject.subjectKind, subject.subjectId);
  return jsonSuccess({ agenda });
});
