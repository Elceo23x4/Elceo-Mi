import { validateCanonicalJournalCase } from '@elceo/schemas';
import type { CanonicalJournalCase } from '@elceo/types';
import { JournalCaseService } from '../journal/case-service';
import { assertValidJournalCaseTransition, buildJournalRevisionSummary } from '../journal/lifecycle';
import { getJournalCaseReplayById } from '../journal/replay';
import { deserializeCanonicalJournalCase, deserializeJournalCaseRevisionRecord, serializeCanonicalJournalCase } from '../journal/serialization';
import { JournalQueryService } from '../journal/query-service';
import { MemoryJournalCaseRepository } from '../persistence/journal-case-repository';
import { CanonicalJournalBoundaryService } from '../runtime/canonical-journal-boundary';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function expectThrows(fn: () => unknown, message: string): void {
  let didThrow = false;
  try {
    fn();
  } catch {
    didThrow = true;
  }
  assert(didThrow, message);
}

async function expectReject(promise: Promise<unknown>, message: string): Promise<void> {
  let didThrow = false;
  try {
    await promise;
  } catch {
    didThrow = true;
  }
  assert(didThrow, message);
}

function buildDraftCase(caseId: string): CanonicalJournalCase {
  return {
    identity: {
      caseId,
      subjectKind: 'user',
      subjectId: 'u-1',
      asset: 'XAU/USD',
      timeframe: 'H1',
      title: 'Gold London continuation'
    },
    status: 'draft',
    plan: {
      direction: 'long',
      thesis: 'London session continuation with strong support retention.',
      setupType: 'continuation',
      conviction: 'standard',
      entryPricePlanned: 3020,
      stopLossPlanned: 3005,
      takeProfitPlanned: [3032, 3045],
      riskAmountPlanned: 250,
      riskPercentPlanned: 1,
      invalidationNote: 'Break under 3005',
      executionChecklist: ['Trend intact', 'No high impact data in 10m'],
      createdFromReasoningRunId: null,
      createdFromSnapshotId: null,
      createdFromDriftId: null
    },
    execution: {
      entryPriceExecuted: null,
      positionSize: null,
      openedAt: null,
      lastAdjustedAt: null,
      notes: [],
      executionQuality: null
    },
    closure: {
      exitPrice: null,
      closedAt: null,
      pnlAmount: null,
      pnlPercent: null,
      rMultiple: null,
      outcome: 'open',
      closureReason: null
    },
    review: {
      reviewedAt: null,
      whatWentWell: [],
      whatWentWrong: [],
      lessons: [],
      behaviorTags: [],
      followUpActions: []
    },
    tags: ['london'],
    createdAt: '2026-04-24T08:00:00.000Z',
    updatedAt: '2026-04-24T08:00:00.000Z'
  };
}

export async function runJournalDomainCoreTests(): Promise<void> {
  const valid = buildDraftCase('case-validate');
  assert(validateCanonicalJournalCase(valid).ok, 'valid journal case should pass validation');
  expectThrows(() => deserializeCanonicalJournalCase('{bad json'), 'malformed case json should fail deterministically');

  const serialized = serializeCanonicalJournalCase(valid);
  const roundTrip = deserializeCanonicalJournalCase(serialized);
  assert(roundTrip.identity.caseId === valid.identity.caseId, 'journal case serialization should round-trip');

  expectThrows(
    () => deserializeJournalCaseRevisionRecord('{"revisionId":"r1","caseId":"c1"}'),
    'malformed revision snapshot should fail deterministically'
  );

  assertValidJournalCaseTransition('draft', 'planned', valid);
  assertValidJournalCaseTransition('planned', 'executed', { ...valid, status: 'planned' });
  assertValidJournalCaseTransition('executed', 'closed', { ...valid, status: 'executed' });
  assertValidJournalCaseTransition('executed', 'partially_closed', { ...valid, status: 'executed' });
  assertValidJournalCaseTransition('partially_closed', 'closed', { ...valid, status: 'partially_closed' });
  assertValidJournalCaseTransition('closed', 'reviewed', { ...valid, status: 'closed' });
  assertValidJournalCaseTransition('canceled', 'reviewed', { ...valid, status: 'canceled' });

  expectThrows(() => assertValidJournalCaseTransition('draft', 'executed', valid), 'forbidden transition must fail');
  expectThrows(() => assertValidJournalCaseTransition('reviewed', 'closed', { ...valid, status: 'reviewed' }), 'reviewed terminal state enforced');
  expectThrows(
    () => assertValidJournalCaseTransition('executed', 'canceled', { ...valid, status: 'executed', execution: { ...valid.execution, openedAt: '2026-04-24T10:00:00.000Z' } }),
    'executed to canceled should fail once opened'
  );

  assert(buildJournalRevisionSummary('created') === 'Case created.', 'summary template must be deterministic');

  const repository = new MemoryJournalCaseRepository();
  const service = new JournalCaseService(repository);
  const queryService = new JournalQueryService(repository);

  const actor = { actorKind: 'user' as const, actorId: 'u-1', changedAt: '2026-04-24T09:00:00.000Z' };
  const draft = await service.createDraftCase({ identity: valid.identity, plan: valid.plan, tags: ['alpha'] }, actor);
  assert(draft.status === 'draft', 'create draft should set draft status');

  const planned = await service.planCase(draft.identity.caseId, { plan: { thesis: 'Planned after checklist confirmation.' } }, { ...actor, changedAt: '2026-04-24T09:05:00.000Z' });
  assert(planned.status === 'planned', 'plan should transition to planned');

  const executed = await service.markExecuted(
    draft.identity.caseId,
    { execution: { openedAt: '2026-04-24T09:10:00.000Z', entryPriceExecuted: 3021, positionSize: 1.2 } },
    { ...actor, changedAt: '2026-04-24T09:10:00.000Z' }
  );
  assert(executed.status === 'executed', 'execute should transition to executed');

  const adjusted = await service.adjustExecution(
    draft.identity.caseId,
    { execution: { lastAdjustedAt: '2026-04-24T09:30:00.000Z', notes: ['Moved stop to reduce risk.'] } },
    { ...actor, changedAt: '2026-04-24T09:30:00.000Z' }
  );
  assert(adjusted.status === 'executed', 'adjust should preserve lifecycle state');

  const partially = await service.markPartiallyClosed(
    draft.identity.caseId,
    { closure: { exitPrice: 3030, pnlAmount: 120, outcome: 'mixed' } },
    { ...actor, changedAt: '2026-04-24T09:45:00.000Z' }
  );
  assert(partially.status === 'partially_closed', 'partial close should transition');

  const closed = await service.closeCase(
    draft.identity.caseId,
    { closure: { closedAt: '2026-04-24T10:00:00.000Z', exitPrice: 3040, pnlAmount: 200, pnlPercent: 2.4, rMultiple: 1.6, outcome: 'win' } },
    { ...actor, changedAt: '2026-04-24T10:00:00.000Z' }
  );
  assert(closed.status === 'closed', 'close should transition to closed');

  await expectReject(
    service.closeCase(draft.identity.caseId, { closure: { closedAt: '2026-04-24T10:10:00.000Z', outcome: 'open' } }, actor),
    'close should reject open outcome'
  );

  const reviewed = await service.reviewCase(
    draft.identity.caseId,
    { review: { reviewedAt: '2026-04-24T10:20:00.000Z', lessons: ['Wait for pullback confirmation.'] } },
    { ...actor, changedAt: '2026-04-24T10:20:00.000Z' }
  );
  assert(reviewed.status === 'reviewed', 'review should transition to reviewed');

  await expectReject(service.cancelCase(draft.identity.caseId, {}, actor), 'cancel should fail after execution lifecycle');

  const draftCancel = await service.createDraftCase(
    {
      identity: { ...valid.identity, caseId: 'case-cancel', title: 'Cancel path' },
      plan: { ...valid.plan, thesis: 'Waiting for confirmation.' }
    },
    { ...actor, changedAt: '2026-04-24T11:00:00.000Z' }
  );
  await service.cancelCase(draftCancel.identity.caseId, {}, { ...actor, changedAt: '2026-04-24T11:01:00.000Z' });

  const replay = await getJournalCaseReplayById(draft.identity.caseId, repository);
  assert(replay?.revisions.length === 7, 'replay should contain ordered lifecycle revisions');
  assert(replay?.revisions[0]?.revisionType === 'created', 'first revision should be created');

  const fromReasoning = await service.createDraftCaseFromReasoningContext(
    {
      subjectKind: 'user',
      subjectId: 'u-1',
      reasoningRunId: 'run-99',
      snapshotId: 'snap-99',
      asset: 'BTC/USD',
      timeframe: 'M15',
      title: 'Reasoning linked BTC case',
      thesis: 'Context-linked setup'
    },
    { ...actor, changedAt: '2026-04-24T12:00:00.000Z' }
  );
  assert(fromReasoning.plan.createdFromReasoningRunId === 'run-99', 'reasoning linkage should persist');

  const latestReplay = await queryService.getLatestJournalCaseReplayForReasoningRun('run-99');
  assert(latestReplay?.caseData.identity.caseId === fromReasoning.identity.caseId, 'latest replay by reasoning run should resolve');

  const ordered = await queryService.listJournalCases({ subjectKind: 'user', subjectId: 'u-1', limit: 10 });
  assert(ordered.length >= 2, 'list query should return cases');
  assert(
    Date.parse(ordered[0]!.createdAt) >= Date.parse(ordered[1]!.createdAt),
    'list ordering should be createdAt desc then caseId asc'
  );

  const openCases = await queryService.listOpenCasesForSubject('user', 'u-1', 20);
  assert(openCases.every((item) => ['draft', 'planned', 'executed', 'partially_closed'].includes(item.status)), 'open case filtering should be exact');

  const byAssetTf = await queryService.listCasesByAssetTimeframe('BTC/USD', 'M15', 10);
  assert(byAssetTf.some((item) => item.identity.caseId === fromReasoning.identity.caseId), 'asset/timeframe filtering should be exact');

  const influence = await queryService.listJournalCasesForReasoningInfluence('user', 'u-1', 'BTC/USD', 'M15', 5);
  assert(influence.length === 1 && influence[0]!.identity.caseId === fromReasoning.identity.caseId, 'reasoning influence query should be exact');

  const boundaryRepository = new MemoryJournalCaseRepository();
  const boundary = new CanonicalJournalBoundaryService(new JournalCaseService(boundaryRepository), new JournalQueryService(boundaryRepository));
  const boundaryDraft = await boundary.createDraftCase(
    {
      identity: {
        caseId: 'boundary-case',
        subjectKind: 'workspace',
        subjectId: 'ws-1',
        asset: 'EUR/USD',
        timeframe: 'H4',
        title: 'Boundary case'
      },
      plan: {
        direction: 'short',
        thesis: 'Mean reversion at weekly resistance.',
        setupType: 'reversion',
        conviction: 'standard'
      }
    },
    { actorKind: 'workspace', actorId: 'ws-1', changedAt: '2026-04-24T13:00:00.000Z' }
  );
  assert(boundaryDraft.status === 'draft', 'boundary create should work end-to-end');

  const boundaryReasoning = await boundary.createDraftCaseFromReasoningContext(
    { subjectKind: 'workspace', subjectId: 'ws-1', reasoningRunId: 'run-boundary', asset: 'EUR/USD', timeframe: 'H4' },
    { actorKind: 'workspace', actorId: 'ws-1', changedAt: '2026-04-24T13:01:00.000Z' }
  );
  assert(boundaryReasoning.plan.createdFromReasoningRunId === 'run-boundary', 'boundary reasoning draft helper should persist linkage');

  const replayBoundary = await boundary.getLatestJournalCaseReplayForReasoningRun('run-boundary');
  assert(replayBoundary?.caseData.identity.caseId === boundaryReasoning.identity.caseId, 'boundary replay query should work');

  const corruptRecord = await boundaryRepository.getCaseById(boundaryReasoning.identity.caseId);
  if (!corruptRecord) throw new Error('expected persisted record for corruption test');
  await boundaryRepository.saveCase({ ...corruptRecord, caseJson: '{broken' });
  await expectReject(boundary.getJournalCase(boundaryReasoning.identity.caseId), 'malformed stored JSON should fail deterministically');
}
