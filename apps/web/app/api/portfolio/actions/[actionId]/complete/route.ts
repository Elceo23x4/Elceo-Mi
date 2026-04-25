import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';

export const POST = withApiErrorBoundary(async (_request: Request, context: { params: Promise<{ actionId: string }> }) => {
  const subject = await requireAuthenticatedSubject();
  const { actionId } = await context.params;
  const action = await getApplicationStateRuntime().portfolio.completeActionItem(actionId, new Date().toISOString(), { actorKind: 'user', actorId: subject.userId });
  return jsonSuccess({ action });
});
