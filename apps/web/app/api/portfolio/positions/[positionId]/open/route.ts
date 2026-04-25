import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';
import { validatePositionOpenRequest } from '@elceo/schemas';

export const POST = withApiErrorBoundary(async (request: Request, context: { params: Promise<{ positionId: string }> }) => {
  const subject = await requireAuthenticatedSubject();
  const { positionId } = await context.params;
  const body = unwrapValidation(validatePositionOpenRequest(await parseJsonBody(request)));
  const position = await getApplicationStateRuntime().portfolio.openPosition(positionId, body.openedAt, body, { actorKind: 'user', actorId: subject.userId });
  return jsonSuccess({ position });
});
