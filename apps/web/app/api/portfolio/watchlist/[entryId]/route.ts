import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, requireSecurityDecision } from '@/lib/server/security';
import { validateWatchlistUpdateRequest } from '@elceo/schemas';

export const GET = withApiErrorBoundary(async (_request: Request, context: { params: Promise<{ entryId: string }> }) => {
  const subject = await requireAuthenticatedSubject();
  const { entryId } = await context.params;
  const replay = await getApplicationStateRuntime().portfolio.getPortfolioEntityReplay('user', subject.subjectId, 'watchlist_entry', entryId);
  if (!replay) throw new Error('not_found');
  return jsonSuccess({ entry: replay.current, replay });
});

export const PATCH = withApiErrorBoundary(async (request: Request, context: { params: Promise<{ entryId: string }> }) => {
  const subject = await requireAuthenticatedSubject();
  const { entryId } = await context.params;
  const patch = unwrapValidation(validateWatchlistUpdateRequest(await parseJsonBody(request)));
  const actor = { actorKind: 'user' as const, actorId: subject.userId, subjectId: subject.subjectId };
  const security = await requireSecurityDecision({ request, routePath: '/api/portfolio/watchlist/[entryId]', method: 'PATCH', actionKind: 'portfolio_watchlist_write', actor, subjectId: subject.subjectId, requestBody: patch });
  if (!security.ok) return security.response;
  try {
    const entry = await getApplicationStateRuntime().portfolio.updateWatchlistEntry('user', subject.subjectId, entryId, patch, { actorKind: 'user', actorId: subject.userId });
    const envelope = { ok: true as const, data: { entry } };

    await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, responseBody: { entry }, responseEnvelope: envelope, httpStatus: 200, requestHash: security.requestHash });
    await auditInternalMutation({ actor, subjectId: subject.subjectId, actionKind: 'portfolio_watchlist_write', routePath: '/api/portfolio/watchlist/[entryId]', method: 'PATCH', request, idempotencyKey: security.idempotencyKey });
    return jsonSuccess({ entry });
  } catch (error) {
    await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown_error' });
    throw error;
  }
});
