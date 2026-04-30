import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { validateWorkspaceRefreshRequest } from '@elceo/schemas';
import { getRefreshRuntime } from '@/lib/server/composition';
import { maybeIncrementUsage, requireFeatureAccess } from '@/lib/server/access';

export const POST = withApiErrorBoundary(async (request: Request) => {
  const access = await requireFeatureAccess('refresh.run', { request });
  if (!access.ok) return access.response;
  const body = unwrapValidation(validateWorkspaceRefreshRequest(await parseJsonBody(request)));
  const run = await getRefreshRuntime().runSnapshotRefresh(access.subject.subjectKind, access.subject.subjectId, body.triggerKind);
  await maybeIncrementUsage('refresh.run', { request });
  return jsonSuccess({ run });
});
