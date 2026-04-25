import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';
import { validatePositionCloseRequest } from '@elceo/schemas';

export const POST = withApiErrorBoundary(async (request: Request, context: { params: Promise<{ positionId: string }> }) => {
  const subject = await requireAuthenticatedSubject();
  const { positionId } = await context.params;
  const body = unwrapValidation(validatePositionCloseRequest(await parseJsonBody(request)));
  const position = await getApplicationStateRuntime().portfolio.closePosition(positionId, body.closedAt, body, { actorKind: 'user', actorId: subject.userId });
  return jsonSuccess({ position });
});
