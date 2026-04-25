import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getNotificationRuntimes } from '@/lib/server/composition';

export const POST = withApiErrorBoundary(async (_request: Request, context: { params: Promise<{ targetId: string }> }) => {
  await requireAuthenticatedSubject();
  const { targetId } = await context.params;
  const target = await getNotificationRuntimes().management.disableTarget(targetId);
  return jsonSuccess({ target });
});
