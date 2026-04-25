import { parseJsonBody, parsePositiveInt, parseSearchParams, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';
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
  const entry = await getApplicationStateRuntime().portfolio.createWatchlistEntry({ subjectKind: subject.subjectKind, subjectId: subject.subjectId, asset: body.asset, timeframe: body.timeframe, priority: body.priority, status: body.status ?? 'watching', thesisHealth: body.thesisHealth ?? 'stable', note: body.note ?? null, linkedReasoningRunId: body.linkedReasoningRunId ?? null, linkedSnapshotId: body.linkedSnapshotId ?? null, linkedDriftId: body.linkedDriftId ?? null, linkedJournalCaseId: body.linkedJournalCaseId ?? null }, { actorKind: 'user', actorId: subject.userId });
  return jsonSuccess({ entry });
});
