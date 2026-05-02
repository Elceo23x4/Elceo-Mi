import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, requireSecurityDecision } from '@/lib/server/security';

export const POST = withApiErrorBoundary(async (request: Request, context: { params: Promise<{ entryId: string }> }) => {
  const subject = await requireAuthenticatedSubject();
  const { entryId } = await context.params;
  const actor = { actorKind: 'user' as const, actorId: subject.userId, subjectId: subject.subjectId };
  const security = await requireSecurityDecision({ request, routePath: '/api/portfolio/watchlist/[entryId]/archive', method: 'POST', actionKind: 'portfolio_watchlist_write', actor, subjectId: subject.subjectId, requestBody: {} });
  if (!security.ok) return security.response;
  try {
    const entry = await getApplicationStateRuntime().portfolio.archiveWatchlistEntry(entryId, { actorKind: 'user', actorId: subject.userId });
    await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, responseBody: { entry } });
    await auditInternalMutation({ actor, subjectId: subject.subjectId, actionKind: 'portfolio_watchlist_write', routePath: '/api/portfolio/watchlist/[entryId]/archive', method: 'POST', request, idempotencyKey: security.idempotencyKey });
    return jsonSuccess({ entry });
  } catch (error) { await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown_error' }); throw error; }
});
