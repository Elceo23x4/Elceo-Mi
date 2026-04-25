import { parseJsonBody, parsePositiveInt, parseSearchParams, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';
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
  const position = await getApplicationStateRuntime().portfolio.createProposedPosition({ subjectKind: subject.subjectKind, subjectId: subject.subjectId, asset: body.asset, timeframe: body.timeframe, direction: body.direction, entryPrice: body.entryPrice ?? null, stopLoss: body.stopLoss ?? null, takeProfitLevels: body.takeProfitLevels ?? [], size: body.size ?? null, thesisHealth: body.thesisHealth ?? 'stable', linkedJournalCaseId: body.linkedJournalCaseId ?? null, linkedReasoningRunId: body.linkedReasoningRunId ?? null, linkedSnapshotId: body.linkedSnapshotId ?? null, linkedDriftId: body.linkedDriftId ?? null, note: body.note ?? null }, { actorKind: 'user', actorId: subject.userId });
  return jsonSuccess({ position });
});
