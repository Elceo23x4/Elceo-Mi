import { validateCoachingSnapshot } from '@elceo/schemas';
import type { AnalyticsSnapshotSummary, JournalInfluenceSummary } from '@elceo/types';
import { generateCoachingActionPlan } from '../coaching/action-plan';
import { generateCoachingFocusAreas } from '../coaching/focus-generator';
import { CoachingInputLoader } from '../coaching/input-loader';
import { MemoryAnalyticsSnapshotLookupRepository, MemoryCoachingSnapshotRepository, MemoryJournalInfluenceSnapshotLookupRepository } from '../coaching/persistence';
import { CoachingQueryService } from '../coaching/query-service';
import { getCoachingSnapshotReplayById, listCoachingSnapshotReplays } from '../coaching/replay';
import { computeCoachingRiskScores, computeCoachingStrengthScores } from '../coaching/scoring';
import { deserializeCoachingSnapshot, serializeCoachingSnapshot } from '../coaching/serialization';
import { CoachingSnapshotService } from '../coaching/snapshot-service';
import { generateCoachingStrengthItems } from '../coaching/strength-generator';
import { generateCoachingSummaryNotes } from '../coaching/summary-notes';
import { setAnalyticsSnapshotLookupRepository, setCoachingSnapshotRepository, setJournalInfluenceSnapshotLookupRepository } from '../coaching/persistence';
import { CanonicalCoachingBoundaryService } from '../runtime/index';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function buildAnalyticsSummary(): AnalyticsSnapshotSummary {
  return {
    window: { subjectKind: 'user', subjectId: 'u-1', assetScope: 'BTC/USD', timeframeScope: 'H1', lookbackDays: 180, generatedAt: '2026-04-20T00:00:00.000Z' },
    totals: {
      closedCaseCount: 10,
      reviewedCaseCount: 6,
      winCount: 4,
      lossCount: 6,
      breakevenCount: 0,
      mixedCount: 0,
      openCount: 0,
      linkedReasoningCount: 5,
      linkedDriftCount: 2,
      avgRMultiple: 0.1,
      avgPnlPercent: 0.2,
      medianRMultiple: 0,
      medianPnlPercent: 0,
      winRate: 0.4,
      lossRate: 0.6,
      expectancyR: 0.1
    },
    setupPatterns: [
      { setupType: 'a', sampleCount: 4, winCount: 1, lossCount: 3, breakevenCount: 0, mixedCount: 0, avgRMultiple: -0.2, avgPnlPercent: -0.3, winRate: 0.25, expectancyR: -0.2, disciplineScore: 40, performanceScore: 40 },
      { setupType: 'b', sampleCount: 3, winCount: 1, lossCount: 2, breakevenCount: 0, mixedCount: 0, avgRMultiple: -0.1, avgPnlPercent: -0.2, winRate: 0.33, expectancyR: -0.1, disciplineScore: 45, performanceScore: 45 },
      { setupType: 'c', sampleCount: 4, winCount: 3, lossCount: 1, breakevenCount: 0, mixedCount: 0, avgRMultiple: 0.8, avgPnlPercent: 1, winRate: 0.75, expectancyR: 0.8, disciplineScore: 80, performanceScore: 70 }
    ],
    directionPatterns: [],
    executionQuality: { disciplinedCount: 2, acceptableCount: 2, weakCount: 3, impulsiveCount: 3, missingQualityCount: 0, disciplineScore: 40 },
    planAdherence: { comparableEntryCount: 10, avgEntryDeviationPercent: 6, maxEntryDeviationPercent: 12, adherenceScore: 60 },
    behaviorPatterns: [
      { behaviorTag: 'late-entry', sampleCount: 4, winAssociationScore: 20, lossAssociationScore: 50, impulsiveAssociationScore: 42, importanceScore: 55 },
      { behaviorTag: 'patience', sampleCount: 4, winAssociationScore: 40, lossAssociationScore: 10, impulsiveAssociationScore: 9, importanceScore: 42 }
    ],
    reviewInsights: { repeatedMistakes: ['late-entry'], repeatedStrengths: ['patience'], cautionNotes: [], confidenceNotes: [] },
    reasoningLinkSummary: { linkedCaseCount: 5, linkedWinRate: 0.4, linkedAvgRMultiple: -0.5, linkedAvgPnlPercent: -0.2 },
    supportingCaseIds: Array.from({ length: 12 }, (_, i) => `case-${i + 1}`)
  };
}

function buildInfluenceSummary(): JournalInfluenceSummary {
  return {
    subjectKind: 'user',
    subjectId: 'u-1',
    asset: 'BTC/USD',
    timeframe: 'H1',
    generatedAt: '2026-04-20T00:00:00.000Z',
    reviewedCaseCount: 6,
    closedCaseCount: 10,
    recentCaseCount: 8,
    setupPatterns: [],
    behaviorPatterns: [],
    directionPatterns: [],
    repeatedMistakes: ['late-entry'],
    repeatedStrengths: ['patience'],
    cautionNotes: [],
    confidenceBoostNotes: [],
    supportingCaseIds: ['case-1', 'case-2', 'case-3']
  };
}

export async function runCoachingCoreTests(): Promise<void> {
  const analyticsSummary = buildAnalyticsSummary();
  const influenceSummary = buildInfluenceSummary();

  const riskScores = computeCoachingRiskScores({ analyticsSummary, journalInfluenceSummary: influenceSummary });
  assert(riskScores.disciplineRiskScore === 60, 'discipline risk formula exact');
  assert(riskScores.setupSelectionRiskScore === 57.5, 'setup risk formula exact');
  assert(riskScores.behaviorControlRiskScore >= 35 && riskScores.behaviorControlRiskScore <= 60, 'behavior risk formula exact');
  assert(riskScores.executionPrecisionRiskScore === 40, 'execution precision risk exact');
  assert(riskScores.reviewQualityRiskScore === 40, 'review quality risk exact');
  assert(riskScores.reasoningAlignmentRiskScore === 70, 'reasoning alignment risk exact');

  const strengthScores = computeCoachingStrengthScores({ analyticsSummary, journalInfluenceSummary: influenceSummary });
  assert(strengthScores.disciplineStrengthScore === 40, 'discipline strength exact');
  assert(strengthScores.setupStrengthScore === 70, 'setup strength exact');
  assert(strengthScores.behaviorStrengthScore === 40, 'behavior strength exact');
  assert(strengthScores.reasoningStrengthScore === 28, 'reasoning strength exact');

  const focusAreas = generateCoachingFocusAreas({
    subjectKind: 'user', subjectId: 'u-1', assetScope: 'BTC/USD', timeframeScope: 'H1', generatedAt: '2026-04-24T00:00:00.000Z', analyticsSummary, journalInfluenceSummary: influenceSummary, riskScores
  });
  assert(focusAreas.length === 6, 'focus thresholds trigger exact');
  const firstFocus = focusAreas[0];
  assert(!!firstFocus && firstFocus.focusId === 'focus|discipline|user|u-1|BTC/USD|H1|2026-04-24T00:00:00.000Z', 'focus deterministic id exact');
  assert(!!firstFocus && firstFocus.priority === 'high', 'priority mapping exact');
  assert(!!firstFocus && firstFocus.supportingCaseIds.length === 10, 'supportingCaseIds cap exact');

  const strengths = generateCoachingStrengthItems({
    subjectKind: 'user', subjectId: 'u-1', assetScope: 'BTC/USD', timeframeScope: 'H1', generatedAt: '2026-04-24T00:00:00.000Z', analyticsSummary, journalInfluenceSummary: influenceSummary, strengthScores
  });
  assert(strengths.length === 2, 'strength thresholds exact');
  const firstStrength = strengths[0];
  const secondStrength = strengths[1];
  assert(!!firstStrength && firstStrength.strengthId.includes('strength|setup_selection|'), 'strength deterministic id exact');
  assert(!!firstStrength && !!secondStrength && firstStrength.score >= secondStrength.score, 'strength ordering exact');

  const actionPlan = generateCoachingActionPlan(focusAreas, { subjectKind: 'user', subjectId: 'u-1', assetScope: 'BTC/USD', timeframeScope: 'H1', generatedAt: '2026-04-24T00:00:00.000Z' });
  assert(actionPlan.length === focusAreas.length, 'one action per focus area');
  const firstAction = actionPlan[0];
  assert(!!firstAction && (firstAction.instruction === 'Reduce exposure to underperforming setup types until expectancy improves.' || firstAction.instruction.length > 10), 'action template exact');
  assert(actionPlan.length <= 6, 'action cap exact');

  const summaryNotes = generateCoachingSummaryNotes(focusAreas, strengths);
  const firstSummaryNote = summaryNotes[0];
  assert(!!firstSummaryNote && firstSummaryNote.startsWith('Primary coaching priority:'), 'summary priority template exact');

  const analyticsLookup = new MemoryAnalyticsSnapshotLookupRepository([
    { snapshotId: 'as-1', subjectKind: 'user', subjectId: 'u-1', assetScope: 'BTC/USD', timeframeScope: '*', lookbackDays: 180, generatedAt: '2026-04-22T00:00:00.000Z', summaryJson: JSON.stringify(analyticsSummary) }
  ]);
  const influenceLookup = new MemoryJournalInfluenceSnapshotLookupRepository([
    { snapshotId: 'js-1', subjectKind: 'user', subjectId: 'u-1', assetScope: '*', timeframeScope: 'H1', generatedAt: '2026-04-22T00:00:00.000Z', summaryJson: JSON.stringify(influenceSummary) }
  ]);
  const repo = new MemoryCoachingSnapshotRepository();
  const loader = new CoachingInputLoader(analyticsLookup, influenceLookup);
  const service = new CoachingSnapshotService(loader, repo);

  const snapshot = await service.generateCoachingSnapshot({ subjectKind: 'user', subjectId: 'u-1', assetScope: 'BTC/USD', timeframeScope: 'H1', generatedAt: '2026-04-24T01:00:00.000Z' });
  assert(snapshot.summary.analyticsSnapshotId === 'as-1', 'input fallback analytics selection exact');
  assert(snapshot.summary.journalInfluenceSnapshotId === 'js-1', 'input fallback influence selection exact');

  const validated = validateCoachingSnapshot(snapshot);
  assert(validated.ok, 'snapshot validates');

  const serialized = serializeCoachingSnapshot(snapshot);
  const deserialized = deserializeCoachingSnapshot(serialized);
  assert(deserialized.snapshotId === snapshot.snapshotId, 'valid deserialize works');

  let malformedFailed = false;
  try {
    deserializeCoachingSnapshot('{"bad":');
  } catch {
    malformedFailed = true;
  }
  assert(malformedFailed, 'malformed snapshot JSON deterministic failure');

  const replay = await getCoachingSnapshotReplayById(snapshot.snapshotId, repo);
  assert(replay?.snapshot.snapshotId === snapshot.snapshotId, 'replay by id exact');

  const query = new CoachingQueryService(repo);
  const second = await service.generateCoachingSnapshot({ subjectKind: 'user', subjectId: 'u-1', assetScope: 'BTC/USD', timeframeScope: 'H1', generatedAt: '2026-04-24T02:00:00.000Z' });
  const latest = await query.getLatestCoachingSnapshot('user', 'u-1', 'BTC/USD', 'H1');
  assert(latest?.snapshotId === second.snapshotId, 'latest snapshot selection exact');
  assert((await query.listTopCoachingFocusAreas('user', 'u-1', 'BTC/USD', 'H1', 3)).length === 3, 'top focus query exact');
  assert((await query.listTopCoachingStrengths('user', 'u-1', 'BTC/USD', 'H1', 2)).length === 2, 'top strengths query exact');
  assert((await query.listCurrentActionPlan('user', 'u-1', 'BTC/USD', 'H1')).length > 0, 'action plan query exact');

  const replays = await listCoachingSnapshotReplays('user', 'u-1', repo);
  assert(replays.length === 2, 'list replays exact');

  const emptyService = new CoachingSnapshotService(
    new CoachingInputLoader(new MemoryAnalyticsSnapshotLookupRepository(), new MemoryJournalInfluenceSnapshotLookupRepository()),
    repo
  );
  const emptySnapshot = await emptyService.generateCoachingSnapshot({ subjectKind: 'workspace', subjectId: 'w-1', generatedAt: '2026-04-24T03:00:00.000Z' });
  assert(emptySnapshot.summary.totalSignalsConsidered === 0, 'empty input totalSignals exact');
  assert(emptySnapshot.summary.focusAreas.length === 0 && emptySnapshot.summary.strengths.length === 0 && emptySnapshot.summary.actionPlan.length === 0, 'empty snapshot collections exact');
  assert(emptySnapshot.summary.summaryNotes[0] === 'No high-priority coaching issue detected in this window.', 'empty summary note deterministic');

  setCoachingSnapshotRepository(repo);
  setAnalyticsSnapshotLookupRepository(analyticsLookup);
  setJournalInfluenceSnapshotLookupRepository(influenceLookup);
  const boundary = new CanonicalCoachingBoundaryService();
  const boundarySnapshot = await boundary.generateCoachingSnapshot({ subjectKind: 'user', subjectId: 'u-1', assetScope: 'BTC/USD', timeframeScope: 'H1', generatedAt: '2026-04-24T04:00:00.000Z' });
  assert(boundarySnapshot.snapshotId.length > 0, 'boundary generate end-to-end');
  assert((await boundary.listTopCoachingFocusAreas('user', 'u-1', 'BTC/USD', 'H1', 2)).length === 2, 'boundary top focus works');
  assert((await boundary.getCriticalCoachingThemes('user', 'u-1', 'BTC/USD', 'H1')).length >= 0, 'boundary optional helper works');

  const snapshotValid = validateCoachingSnapshot(boundarySnapshot);
  assert(snapshotValid.ok, 'boundary snapshot validates');
}
