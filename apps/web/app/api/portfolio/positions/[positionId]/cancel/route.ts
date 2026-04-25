import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';
import { validatePositionCancelRequest } from '@elceo/schemas';

export const POST = withApiErrorBoundary(async (request: Request, context: { params: Promise<{ positionId: string }> }) => {
  const subject = await requireAuthenticatedSubject();
  const { positionId } = await context.params;
  unwrapValidation(validatePositionCancelRequest(await parseJsonBody(request)));
  const position = await getApplicationStateRuntime().portfolio.cancelPosition(positionId, { actorKind: 'user', actorId: subject.userId });
  return jsonSuccess({ position });
});
