import { parseJsonBody, parsePositiveInt, parseSearchParams, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, requireSecurityDecision } from '@/lib/server/security';
import { validateJournalCreateDraftRequest } from '@elceo/schemas';

export const GET = withApiErrorBoundary(async (request: Request) => {
  const subject = await requireAuthenticatedSubject();
  const params = parseSearchParams(request.url);
  const cases = await getApplicationStateRuntime().journal.listJournalCases({
    subjectKind: subject.subjectKind,
    subjectId: subject.subjectId,
    asset: params.get('asset') ?? undefined,
    timeframe: (params.get('timeframe') ?? undefined) as never,
    status: (params.get('status') ?? undefined) as never,
    limit: parsePositiveInt(params.get('limit'), 50, 200)
  });
  return jsonSuccess({ cases });
});

export const POST = withApiErrorBoundary(async (request: Request) => {
  const subject = await requireAuthenticatedSubject();
  const body = unwrapValidation(validateJournalCreateDraftRequest(await parseJsonBody(request)));
  const actor = { actorKind: 'user' as const, actorId: subject.userId, subjectId: subject.subjectId };
  const security = await requireSecurityDecision({ request, routePath: '/api/journal/cases', method: 'POST', actionKind: 'journal_case_write', actor, subjectId: subject.subjectId, requestBody: body });
  if (!security.ok) return security.response;
  const journal = getApplicationStateRuntime().journal;

  try {
    const created = body.linkedReasoningRunId
      ? await journal.createDraftCaseFromReasoningContext({
          subjectKind: subject.subjectKind,
          subjectId: subject.subjectId,
          reasoningRunId: body.linkedReasoningRunId,
          snapshotId: body.linkedSnapshotId ?? null,
          driftId: body.linkedDriftId ?? null,
          asset: body.asset,
          timeframe: body.timeframe,
          title: body.title,
          thesis: body.thesis,
          direction: body.direction
        }, { actorKind: 'user', actorId: subject.userId })
      : await journal.createDraftCase({
          identity: {
            caseId: `jcase-${crypto.randomUUID()}`,
            subjectKind: subject.subjectKind,
            subjectId: subject.subjectId,
            asset: body.asset,
            timeframe: body.timeframe,
            title: body.title
          },
          plan: {
            direction: body.direction,
            setupType: body.setupType,
            conviction: body.conviction,
            thesis: body.thesis,
            createdFromReasoningRunId: body.linkedReasoningRunId ?? null,
            createdFromSnapshotId: body.linkedSnapshotId ?? null,
            createdFromDriftId: body.linkedDriftId ?? null
          }
        }, { actorKind: 'user', actorId: subject.userId });
    await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, responseBody: { case: created } });
    await auditInternalMutation({ actor, subjectId: subject.subjectId, actionKind: 'journal_case_write', routePath: '/api/journal/cases', method: 'POST', request, idempotencyKey: security.idempotencyKey });
    return jsonSuccess({ case: created });
  } catch (error) {
    await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown_error' });
    throw error;
  }
});
