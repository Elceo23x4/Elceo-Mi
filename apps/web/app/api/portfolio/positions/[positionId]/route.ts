import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';
import { validatePositionUpdateRequest } from '@elceo/schemas';

export const GET = withApiErrorBoundary(async (_request: Request, context: { params: Promise<{ positionId: string }> }) => {
  await requireAuthenticatedSubject();
  const { positionId } = await context.params;
  const replay = await getApplicationStateRuntime().portfolio.getPortfolioEntityReplay('position', positionId);
  if (!replay) throw new Error('not_found');
  return jsonSuccess({ position: replay.current, replay });
});

export const PATCH = withApiErrorBoundary(async (request: Request, context: { params: Promise<{ positionId: string }> }) => {
  const subject = await requireAuthenticatedSubject();
  const { positionId } = await context.params;
  const patch = unwrapValidation(validatePositionUpdateRequest(await parseJsonBody(request)));
  const position = await getApplicationStateRuntime().portfolio.updatePosition(positionId, patch, { actorKind: 'user', actorId: subject.userId });
  return jsonSuccess({ position });
});
