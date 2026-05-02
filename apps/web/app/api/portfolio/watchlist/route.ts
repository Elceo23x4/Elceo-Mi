import { parseJsonBody, parsePositiveInt, parseSearchParams, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, requireSecurityDecision } from '@/lib/server/security';
import { validateWatchlistCreateRequest } from '@elceo/schemas';

export const GET = withApiErrorBoundary(async (request: Request) => {
  const subject = await requireAuthenticatedSubject();
  const params = parseSearchParams(request.url);
  const entries = await getApplicationStateRuntime().portfolio.listCurrentWatchlist(subject.subjectKind, subject.subjectId, parsePositiveInt(params.get('limit'), 50, 200));
  return jsonSuccess({ entries });
});

export const POST = withApiErrorBoundary(async (request: Request) => {
  const subject = await requireAuthenticatedSubject();
  const body = unwrapValidation(validateWatchlistCreateRequest(await parseJsonBody(request)));
  const actor = { actorKind: 'user' as const, actorId: subject.userId, subjectId: subject.subjectId };
  const security = await requireSecurityDecision({ request, routePath: '/api/portfolio/watchlist', method: 'POST', actionKind: 'portfolio_watchlist_write', actor, subjectId: subject.subjectId, requestBody: body });
  if (!security.ok) return security.response;
  try {
    const entry = await getApplicationStateRuntime().portfolio.createWatchlistEntry({ subjectKind: subject.subjectKind, subjectId: subject.subjectId, asset: body.asset, timeframe: body.timeframe, priority: body.priority, status: body.status ?? 'watching', thesisHealth: body.thesisHealth ?? 'stable', note: body.note ?? null, linkedReasoningRunId: body.linkedReasoningRunId ?? null, linkedSnapshotId: body.linkedSnapshotId ?? null, linkedDriftId: body.linkedDriftId ?? null, linkedJournalCaseId: body.linkedJournalCaseId ?? null }, { actorKind: 'user', actorId: subject.userId });
    await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, responseBody: { entry } });
    await auditInternalMutation({ actor, subjectId: subject.subjectId, actionKind: 'portfolio_watchlist_write', routePath: '/api/portfolio/watchlist', method: 'POST', request, idempotencyKey: security.idempotencyKey });
    return jsonSuccess({ entry });
  } catch (error) {
    await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown_error' });
    throw error;
  }
});
