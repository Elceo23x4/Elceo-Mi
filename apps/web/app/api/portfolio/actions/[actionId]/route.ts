import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';
import { validateActionUpdateRequest } from '@elceo/schemas';

export const GET = withApiErrorBoundary(async (_request: Request, context: { params: Promise<{ actionId: string }> }) => {
  await requireAuthenticatedSubject();
  const { actionId } = await context.params;
  const replay = await getApplicationStateRuntime().portfolio.getPortfolioEntityReplay('action_item', actionId);
  if (!replay) throw new Error('not_found');
  return jsonSuccess({ action: replay.current, replay });
});

export const PATCH = withApiErrorBoundary(async (request: Request, context: { params: Promise<{ actionId: string }> }) => {
  const subject = await requireAuthenticatedSubject();
  const { actionId } = await context.params;
  const patch = unwrapValidation(validateActionUpdateRequest(await parseJsonBody(request)));
  const action = await getApplicationStateRuntime().portfolio.updateActionItem(actionId, patch, { actorKind: 'user', actorId: subject.userId });
  return jsonSuccess({ action });
});
