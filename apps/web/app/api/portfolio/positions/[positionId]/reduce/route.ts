import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';
import { validatePositionReduceRequest } from '@elceo/schemas';

export const POST = withApiErrorBoundary(async (request: Request, context: { params: Promise<{ positionId: string }> }) => {
  const subject = await requireAuthenticatedSubject();
  const { positionId } = await context.params;
  const body = unwrapValidation(validatePositionReduceRequest(await parseJsonBody(request)));
  const position = await getApplicationStateRuntime().portfolio.reducePosition(positionId, body, { actorKind: 'user', actorId: subject.userId });
  return jsonSuccess({ position });
});
