import { validateAnalyticsSnapshot } from '@elceo/schemas';
import type { CanonicalJournalCase } from '@elceo/types';
import { AnalyticsQueryService } from '../core/query-service';
import { AnalyticsSnapshotService } from '../core/snapshot-service';
import { buildBehaviorAnalyticsPatterns } from '../core/behavior-analytics';
import { buildDirectionPatterns, buildExecutionQualitySummary, buildPlanAdherenceSummary, buildSetupPatterns } from '../core/pattern-aggregator';
import { buildPerformanceTotals } from '../core/performance-totals';
import { buildReviewInsights } from '../core/review-insights';
import { deserializeAnalyticsSnapshot, deserializeAnalyticsSnapshotSummary } from '../core/serialization';
import { listAnalyticsSnapshotReplays } from '../core/replay';
import { selectAnalyticsWindowCases } from '../core/window-selection';
import { MemoryAnalyticsCaseSource } from '../persistence/case-source';
import { setAnalyticsCaseSource, setAnalyticsSnapshotRepository } from '../persistence/index';
import { MemoryAnalyticsSnapshotRepository } from '../persistence/snapshot-repository';
import { CanonicalAnalyticsBoundaryService } from '../runtime/index';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function buildCase(index: number, overrides: Partial<CanonicalJournalCase> = {}): CanonicalJournalCase {
  const day = String(index + 1).padStart(2, '0');
  return {
    identity: {
      caseId: `case-${index}`,
      subjectKind: 'user',
      subjectId: 'u-1',
      asset: index % 2 === 0 ? 'BTC/USD' : 'ETH/USD',
      timeframe: index % 2 === 0 ? 'M15' : 'H1',
      title: `Case ${index}`
    },
    status: 'reviewed',
    plan: {
      direction: index % 2 === 0 ? 'long' : 'short',
      thesis: 'deterministic thesis',
      setupType: index % 2 === 0 ? 'breakout' : 'pullback',
      conviction: 'standard',
      entryPricePlanned: 100,
      stopLossPlanned: 95,
      takeProfitPlanned: [105, 110],
      riskAmountPlanned: 100,
      riskPercentPlanned: 1,
      invalidationNote: null,
      executionChecklist: ['a'],
      createdFromReasoningRunId: index % 3 === 0 ? `rr-${index}` : null,
      createdFromSnapshotId: null,
      createdFromDriftId: index % 4 === 0 ? `dr-${index}` : null
    },
    execution: {
      entryPriceExecuted: 100 + index,
      positionSize: 1,
      openedAt: `2026-01-${day}T10:00:00.000Z`,
      lastAdjustedAt: null,
      notes: [],
      executionQuality: index % 4 === 0 ? 'impulsive' : index % 4 === 1 ? 'weak' : index % 4 === 2 ? 'acceptable' : 'disciplined'
    },
    closure: {
      exitPrice: 102,
      closedAt: `2026-02-${day}T10:00:00.000Z`,
      pnlAmount: index % 3 === 0 ? -100 : 120,
      pnlPercent: index % 3 === 0 ? -1.1 : 1.2,
      rMultiple: index % 3 === 0 ? -1.2 : 1.4,
      outcome: index % 3 === 0 ? 'loss' : 'win',
      closureReason: null
    },
    review: {
      reviewedAt: `2026-02-${day}T12:00:00.000Z`,
      whatWentWell: [],
      whatWentWrong: [],
      lessons: [],
      behaviorTags: index % 2 === 0 ? ['late-entry'] : ['patience'],
      followUpActions: []
    },
    tags: [],
    createdAt: `2026-01-${day}T09:00:00.000Z`,
    updatedAt: `2026-02-${day}T12:00:00.000Z`,
    ...overrides
  } as CanonicalJournalCase;
}

export async function runAnalyticsCoreTests(): Promise<void> {
  const now = '2026-03-31T00:00:00.000Z';
  const cases = [
    buildCase(1),
    buildCase(2),
    buildCase(3),
    buildCase(4),
    buildCase(5, { status: 'closed' }),
    buildCase(6, { status: 'draft' })
  ];

  const selected = selectAnalyticsWindowCases(cases, {
    subjectKind: 'user',
    subjectId: 'u-1',
    assetScope: '*',
    timeframeScope: '*',
    generatedAt: now,
    lookbackDays: 180,
    maxCases: 4
  });
  assert(selected.length === 4, 'selection maxCases cap exact');
  assert(selected.every((item) => item.status === 'reviewed' || item.status === 'closed'), 'selection includes only closed/reviewed');

  const totals = buildPerformanceTotals(selected);
  assert(totals.closedCaseCount === 4, 'totals closedCaseCount exact');
  assert(totals.expectancyR !== null, 'expectancy computed');

  const setupPatterns = buildSetupPatterns(selected);
  const directionPatterns = buildDirectionPatterns(selected);
  const quality = buildExecutionQualitySummary(selected);
  const adherence = buildPlanAdherenceSummary(selected);
  const behaviorPatterns = buildBehaviorAnalyticsPatterns(selected, now);
  const insights = buildReviewInsights(behaviorPatterns, setupPatterns, quality);

  assert(setupPatterns.length > 0, 'setup patterns generated');
  assert(directionPatterns.length > 0, 'direction patterns generated');
  assert(quality.disciplineScore >= 0 && quality.disciplineScore <= 100, 'discipline score bounded');
  assert(adherence.adherenceScore === null || adherence.adherenceScore <= 100, 'adherence score bounded');
  assert(behaviorPatterns.length > 0, 'behavior patterns generated');
  assert(insights.cautionNotes.length <= 6 && insights.confidenceNotes.length <= 6, 'notes capped');

  const caseSource = new MemoryAnalyticsCaseSource();
  selected.forEach((item) => caseSource.saveCase(item));
  const snapshotRepo = new MemoryAnalyticsSnapshotRepository();
  const snapshotService = new AnalyticsSnapshotService(caseSource, snapshotRepo);
  const snapshot = await snapshotService.generateAnalyticsSnapshot({ subjectKind: 'user', subjectId: 'u-1', generatedAt: now, lookbackDays: 180, maxCases: 10 });

  const validated = validateAnalyticsSnapshot(snapshot);
  assert(validated.ok, 'snapshot validates');
  assert(snapshot.summary.supportingCaseIds.length <= 50, 'supporting case ids capped');

  const replay = await listAnalyticsSnapshotReplays('user', 'u-1', snapshotRepo);
  assert(replay.length === 1, 'replay persisted');

  const parsed = deserializeAnalyticsSnapshot(JSON.stringify(snapshot));
  const parsedSummary = deserializeAnalyticsSnapshotSummary(JSON.stringify(snapshot.summary));
  assert(parsed.snapshotId === snapshot.snapshotId, 'deserialize snapshot works');
  assert(parsedSummary.window.subjectId === 'u-1', 'deserialize summary works');

  let failed = false;
  try {
    deserializeAnalyticsSnapshot('{"bad":');
  } catch {
    failed = true;
  }
  assert(failed, 'malformed JSON fails deterministically');

  const query = new AnalyticsQueryService(snapshotRepo);
  const latest = await query.getLatestAnalyticsSnapshot('user', 'u-1', '*', '*', 180);
  assert(latest?.snapshotId === snapshot.snapshotId, 'latest query exact');
  const topSetup = await query.listTopSetupPatterns('user', 'u-1');
  const topBehavior = await query.listTopBehaviorPatterns('user', 'u-1');
  assert(topSetup.length > 0, 'top setup list works');
  assert(topBehavior.length > 0, 'top behavior list works');

  setAnalyticsCaseSource(caseSource);
  setAnalyticsSnapshotRepository(snapshotRepo);
  const boundary = new CanonicalAnalyticsBoundaryService();
  const fromBoundary = await boundary.getLatestAnalyticsSnapshot('user', 'u-1', '*', '*', 180);
  assert(fromBoundary?.snapshotId === snapshot.snapshotId, 'boundary latest snapshot works');
}
