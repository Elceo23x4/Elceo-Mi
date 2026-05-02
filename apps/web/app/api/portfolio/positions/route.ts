import { parseJsonBody, parsePositiveInt, parseSearchParams, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, requireSecurityDecision } from '@/lib/server/security';
import { validatePositionCreateRequest } from '@elceo/schemas';

export const GET = withApiErrorBoundary(async (request: Request) => {
  const subject = await requireAuthenticatedSubject();
  const params = parseSearchParams(request.url);
  const positions = await getApplicationStateRuntime().portfolio.listOpenPositions(subject.subjectKind, subject.subjectId, parsePositiveInt(params.get('limit'), 50, 200));
  return jsonSuccess({ positions });
});

export const POST = withApiErrorBoundary(async (request: Request) => {
  const subject = await requireAuthenticatedSubject();
  const body = unwrapValidation(validatePositionCreateRequest(await parseJsonBody(request)));
  const actor = { actorKind: 'user' as const, actorId: subject.userId, subjectId: subject.subjectId };
  const security = await requireSecurityDecision({ request, routePath: '/api/portfolio/positions', method: 'POST', actionKind: 'portfolio_position_write', actor, subjectId: subject.subjectId, requestBody: body });
  if (!security.ok) return security.response;
  try {
    const position = await getApplicationStateRuntime().portfolio.createProposedPosition({ subjectKind: subject.subjectKind, subjectId: subject.subjectId, asset: body.asset, timeframe: body.timeframe, direction: body.direction, entryPrice: body.entryPrice ?? null, stopLoss: body.stopLoss ?? null, takeProfitLevels: body.takeProfitLevels ?? [], size: body.size ?? null, thesisHealth: body.thesisHealth ?? 'stable', linkedJournalCaseId: body.linkedJournalCaseId ?? null, linkedReasoningRunId: body.linkedReasoningRunId ?? null, linkedSnapshotId: body.linkedSnapshotId ?? null, linkedDriftId: body.linkedDriftId ?? null, note: body.note ?? null }, { actorKind: 'user', actorId: subject.userId });
    const envelope = { ok: true as const, data: { position } };

    await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, responseBody: { position }, responseEnvelope: envelope, httpStatus: 200, requestHash: security.requestHash });
    await auditInternalMutation({ actor, subjectId: subject.subjectId, actionKind: 'portfolio_position_write', routePath: '/api/portfolio/positions', method: 'POST', request, idempotencyKey: security.idempotencyKey });
    return jsonSuccess({ position });
  } catch (error) {
    await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown_error' });
    throw error;
  }
});
