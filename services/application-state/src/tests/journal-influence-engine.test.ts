import type { CanonicalJournalCase } from '@elceo/types';
import { validateJournalInfluenceSummary } from '@elceo/schemas';
import { buildInfluenceSummaryParts } from '../journal/influence-aggregator';
import { JournalInfluenceQueryService } from '../journal/influence-query';
import { getJournalInfluenceReplayById } from '../journal/influence-replay';
import { deserializeJournalInfluenceSnapshot, deserializeJournalInfluenceSummary, serializeJournalInfluenceSnapshot } from '../journal/influence-serialization';
import { computeJournalInfluenceRecencyWeight, selectJournalInfluenceCases } from '../journal/influence-selection';
import { JournalInfluenceService } from '../journal/influence-service';
import { MemoryJournalCaseRepository } from '../persistence/journal-case-repository';
import { MemoryJournalInfluenceRepository } from '../persistence/journal-influence-repository';
import { CanonicalJournalInfluenceBoundaryService } from '../runtime/canonical-journal-influence-boundary';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function expectReject(promise: Promise<unknown>, message: string): Promise<void> {
  let failed = false;
  try {
    await promise;
  } catch {
    failed = true;
  }
  assert(failed, message);
}

function caseFixture(params: {
  caseId: string;
  status: CanonicalJournalCase['status'];
  asset: CanonicalJournalCase['identity']['asset'];
  timeframe: CanonicalJournalCase['identity']['timeframe'];
  reviewedAt?: string | null;
  closedAt?: string | null;
  outcome?: CanonicalJournalCase['closure']['outcome'];
  setupType?: string;
  direction?: CanonicalJournalCase['plan']['direction'];
  rMultiple?: number | null;
  pnlPercent?: number | null;
  behaviorTags?: string[];
  executionQuality?: CanonicalJournalCase['execution']['executionQuality'];
  createdAt: string;
}): CanonicalJournalCase {
  return {
    identity: {
      caseId: params.caseId,
      subjectKind: 'user',
      subjectId: 'u-1',
      asset: params.asset,
      timeframe: params.timeframe,
      title: params.caseId
    },
    status: params.status,
    plan: {
      direction: params.direction ?? 'long',
      thesis: 'thesis',
      setupType: params.setupType ?? 'breakout',
      conviction: 'standard',
      entryPricePlanned: null,
      stopLossPlanned: null,
      takeProfitPlanned: [],
      riskAmountPlanned: null,
      riskPercentPlanned: null,
      invalidationNote: null,
      executionChecklist: [],
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
      executionQuality: params.executionQuality ?? null
    },
    closure: {
      exitPrice: null,
      closedAt: params.closedAt ?? null,
      pnlAmount: null,
      pnlPercent: params.pnlPercent ?? null,
      rMultiple: params.rMultiple ?? null,
      outcome: params.outcome ?? 'open',
      closureReason: null
    },
    review: {
      reviewedAt: params.reviewedAt ?? null,
      whatWentWell: [],
      whatWentWrong: [],
      lessons: ['lesson-1'],
      behaviorTags: params.behaviorTags ?? [],
      followUpActions: []
    },
    tags: [],
    createdAt: params.createdAt,
    updatedAt: params.createdAt
  };
}

export async function runJournalInfluenceEngineTests(): Promise<void> {
  const caseRepository = new MemoryJournalCaseRepository();
  const influenceRepository = new MemoryJournalInfluenceRepository();

  const c1 = caseFixture({ caseId: 'c1', status: 'reviewed', asset: 'BTC/USD', timeframe: 'H1', reviewedAt: '2026-04-20T10:00:00.000Z', closedAt: '2026-04-20T09:00:00.000Z', outcome: 'win', rMultiple: 1.8, pnlPercent: 2.2, behaviorTags: ['patience'], executionQuality: 'disciplined', createdAt: '2026-04-20T08:00:00.000Z' });
  const c2 = caseFixture({ caseId: 'c2', status: 'closed', asset: 'BTC/USD', timeframe: 'H1', closedAt: '2026-04-18T09:00:00.000Z', outcome: 'loss', rMultiple: -1.1, pnlPercent: -1.5, behaviorTags: ['chasing'], executionQuality: 'impulsive', createdAt: '2026-04-18T08:00:00.000Z' });
  const c3 = caseFixture({ caseId: 'c3', status: 'closed', asset: 'BTC/USD', timeframe: 'M15', closedAt: '2026-04-17T09:00:00.000Z', outcome: 'mixed', rMultiple: 0.2, pnlPercent: 0.1, behaviorTags: ['chasing'], executionQuality: 'weak', createdAt: '2026-04-17T08:00:00.000Z' });
  const c4 = caseFixture({ caseId: 'c4', status: 'closed', asset: 'XAU/USD', timeframe: 'H1', closedAt: '2026-04-16T09:00:00.000Z', outcome: 'win', setupType: 'pullback', direction: 'short', behaviorTags: ['discipline'], executionQuality: 'disciplined', createdAt: '2026-04-16T08:00:00.000Z' });
  const c5 = caseFixture({ caseId: 'c5', status: 'draft', asset: 'BTC/USD', timeframe: 'H1', createdAt: '2026-04-21T08:00:00.000Z' });

  for (const item of [c1, c2, c3, c4, c5]) {
    await caseRepository.saveCase({
      caseId: item.identity.caseId,
      subjectKind: item.identity.subjectKind,
      subjectId: item.identity.subjectId,
      asset: item.identity.asset,
      timeframe: item.identity.timeframe,
      title: item.identity.title,
      status: item.status,
      direction: item.plan.direction,
      conviction: item.plan.conviction,
      thesis: item.plan.thesis,
      setupType: item.plan.setupType,
      entryPricePlanned: null,
      stopLossPlanned: null,
      takeProfitPlannedJson: '[]',
      riskAmountPlanned: null,
      riskPercentPlanned: null,
      invalidationNote: null,
      executionChecklistJson: '[]',
      createdFromReasoningRunId: null,
      createdFromSnapshotId: null,
      createdFromDriftId: null,
      entryPriceExecuted: null,
      positionSize: null,
      openedAt: null,
      lastAdjustedAt: null,
      executionNotesJson: '[]',
      executionQuality: item.execution.executionQuality,
      exitPrice: null,
      closedAt: item.closure.closedAt,
      pnlAmount: null,
      pnlPercent: item.closure.pnlPercent,
      rMultiple: item.closure.rMultiple,
      outcome: item.closure.outcome,
      closureReason: null,
      reviewedAt: item.review.reviewedAt,
      whatWentWellJson: '[]',
      whatWentWrongJson: '[]',
      lessonsJson: JSON.stringify(item.review.lessons),
      behaviorTagsJson: JSON.stringify(item.review.behaviorTags),
      followUpActionsJson: '[]',
      tagsJson: '[]',
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      caseJson: JSON.stringify(item)
    });
  }

  const selected = await selectJournalInfluenceCases(caseRepository, {
    subjectKind: 'user',
    subjectId: 'u-1',
    assetScope: 'BTC/USD',
    timeframeScope: 'H1',
    asOfIso: '2026-04-24T10:00:00.000Z',
    maxCases: 3,
    lookbackDays: 180
  });
  assert(selected.length === 3, 'selection should honor maxCases');
  assert(selected[0]?.caseData.identity.caseId === 'c1' && selected[1]?.caseData.identity.caseId === 'c2', 'exact asset/timeframe cases should rank first');
  assert(selected.every((item) => ['closed', 'reviewed'].includes(item.caseData.status)), 'selection must include only closed/reviewed');
  assert(selected.every((item) => item.recencyWeight > 0 && item.recencyWeight <= 1), 'recency weight must be within expected range');
  assert(computeJournalInfluenceRecencyWeight(c1, '2026-04-24T10:00:00.000Z') === 0.8824, 'recency formula should be deterministic to 4 decimals');

  const evidence = selected.map((item) => ({
    caseId: item.caseData.identity.caseId,
    asset: item.caseData.identity.asset,
    timeframe: item.caseData.identity.timeframe,
    direction: item.caseData.plan.direction,
    setupType: item.caseData.plan.setupType,
    outcome: item.caseData.closure.outcome,
    executionQuality: item.caseData.execution.executionQuality,
    reviewedAt: item.caseData.review.reviewedAt,
    closedAt: item.caseData.closure.closedAt,
    pnlPercent: item.caseData.closure.pnlPercent,
    rMultiple: item.caseData.closure.rMultiple,
    behaviorTags: item.caseData.review.behaviorTags,
    lessons: item.caseData.review.lessons,
    recencyWeight: item.recencyWeight
  }));
  const aggregate = buildInfluenceSummaryParts(evidence);
  assert(aggregate.setupPatterns.length > 0 && aggregate.directionPatterns.length > 0, 'aggregates should produce setup/direction patterns');
  assert(aggregate.behaviorPatterns.some((item) => item.behaviorTag === 'chasing'), 'behavior aggregation must include review tags');
  assert(aggregate.cautionNotes.every((item) => item.endsWith('.')), 'caution notes should use deterministic templates');
  assert(aggregate.confidenceBoostNotes.every((item) => item.endsWith('.')), 'confidence notes should use deterministic templates');

  const influenceService = new JournalInfluenceService(caseRepository, influenceRepository);
  const snapshot = await influenceService.generateJournalInfluenceSnapshot({
    subjectKind: 'user',
    subjectId: 'u-1',
    assetScope: 'BTC/USD',
    timeframeScope: 'H1',
    asOfIso: '2026-04-24T10:00:00.000Z',
    maxCases: 3
  });
  assert(snapshot.summary.supportingCaseIds.length <= 20, 'supporting case IDs must be capped at 20');
  assert(snapshot.summary.supportingCaseIds[0] === 'c1', 'supporting case order should preserve selection order');

  const noCaseSnapshot = await influenceService.generateJournalInfluenceSnapshot({
    subjectKind: 'workspace',
    subjectId: 'w-404',
    assetScope: 'BTC/USD',
    timeframeScope: 'H1',
    asOfIso: '2026-04-24T10:00:00.000Z'
  });
  assert(noCaseSnapshot.summary.reviewedCaseCount === 0 && noCaseSnapshot.summary.setupPatterns.length === 0, 'no-case snapshot defaults must be deterministic');

  const replay = await getJournalInfluenceReplayById(snapshot.snapshotId, influenceRepository);
  assert(replay?.snapshot.snapshotId === snapshot.snapshotId, 'snapshot replay should load persisted snapshot');

  assert(validateJournalInfluenceSummary(snapshot.summary).ok, 'summary must validate against strict schema');
  const serializedSnapshot = serializeJournalInfluenceSnapshot(snapshot);
  assert(deserializeJournalInfluenceSnapshot(serializedSnapshot).snapshotId === snapshot.snapshotId, 'snapshot serialization should round-trip');
  await expectReject(Promise.resolve().then(() => deserializeJournalInfluenceSummary('{bad')), 'malformed summary json should fail deterministically');

  const queryService = new JournalInfluenceQueryService(influenceRepository);
  const latest = await queryService.getLatestJournalInfluenceSnapshot('user', 'u-1', 'BTC/USD', 'H1');
  assert(latest?.snapshotId === snapshot.snapshotId, 'latest snapshot query should select generatedAt desc + snapshotId asc');
  const topBehavior = await queryService.listMostRelevantBehaviorPatterns('user', 'u-1', 'BTC/USD', 'H1', 1);
  assert(topBehavior.length === 1, 'most relevant behavior query should cap to requested limit');

  const boundary = new CanonicalJournalInfluenceBoundaryService(influenceService, queryService);
  const boundarySnapshot = await boundary.generateJournalInfluenceSnapshot({ subjectKind: 'user', subjectId: 'u-1', assetScope: 'BTC/USD', timeframeScope: 'H1', asOfIso: '2026-04-24T10:10:00.000Z' });
  assert(boundarySnapshot.summary.subjectId === 'u-1', 'boundary generation should work end-to-end');
  const reasoningInfluence = await boundary.getJournalInfluenceForReasoningInput('user', 'u-1', 'BTC/USD', 'H1', '2026-04-24T10:10:00.000Z');
  assert(reasoningInfluence.enabled && reasoningInfluence.summary !== null, 'reasoning influence surface should return structured summary');
}
