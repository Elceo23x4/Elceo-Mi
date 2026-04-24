import { validateAnalyticsSnapshot } from '@elceo/schemas';
import type {
  AnalyticsAssetScope,
  AnalyticsSnapshot,
  AnalyticsSnapshotSummary,
  AnalyticsTimeframeScope,
  AnalyticsWindow,
  CanonicalJournalCase
} from '@elceo/types';
import type { AnalyticsCaseSource, AnalyticsSnapshotRepository, PersistedAnalyticsSnapshotRecord } from '../persistence/contracts';
import { buildBehaviorAnalyticsPatterns } from './behavior-analytics';
import { buildExecutionQualitySummary, buildPlanAdherenceSummary, buildDirectionPatterns, buildSetupPatterns } from './pattern-aggregator';
import { buildPerformanceTotals } from './performance-totals';
import { buildReasoningLinkSummary } from './reasoning-link-summary';
import { buildReviewInsights } from './review-insights';
import { serializeAnalyticsSnapshotSummary } from './serialization';
import { selectAnalyticsWindowCases } from './window-selection';

export type GenerateAnalyticsSnapshotParams = {
  subjectKind: AnalyticsWindow['subjectKind'];
  subjectId: string;
  assetScope?: AnalyticsAssetScope;
  timeframeScope?: AnalyticsTimeframeScope;
  lookbackDays?: number;
  generatedAt?: string;
  maxCases?: number;
};

function snapshotId(window: AnalyticsWindow): string {
  return `ans|${window.subjectKind}|${window.subjectId}|${window.assetScope}|${window.timeframeScope}|${window.lookbackDays}|${window.generatedAt.replace(/[:.]/g, '-')}`;
}

function uniqueOrderedCaseIds(cases: CanonicalJournalCase[], cap = 50): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of cases) {
    if (seen.has(item.identity.caseId)) continue;
    seen.add(item.identity.caseId);
    out.push(item.identity.caseId);
    if (out.length >= cap) break;
  }
  return out;
}

function toRecord(snapshot: AnalyticsSnapshot): PersistedAnalyticsSnapshotRecord {
  const { summary } = snapshot;
  return {
    snapshotId: snapshot.snapshotId,
    subjectKind: summary.window.subjectKind,
    subjectId: summary.window.subjectId,
    assetScope: summary.window.assetScope,
    timeframeScope: summary.window.timeframeScope,
    lookbackDays: summary.window.lookbackDays,
    generatedAt: summary.window.generatedAt,
    closedCaseCount: summary.totals.closedCaseCount,
    reviewedCaseCount: summary.totals.reviewedCaseCount,
    winCount: summary.totals.winCount,
    lossCount: summary.totals.lossCount,
    breakevenCount: summary.totals.breakevenCount,
    mixedCount: summary.totals.mixedCount,
    openCount: summary.totals.openCount,
    linkedReasoningCount: summary.totals.linkedReasoningCount,
    linkedDriftCount: summary.totals.linkedDriftCount,
    avgRMultiple: summary.totals.avgRMultiple,
    avgPnlPercent: summary.totals.avgPnlPercent,
    medianRMultiple: summary.totals.medianRMultiple,
    medianPnlPercent: summary.totals.medianPnlPercent,
    winRate: summary.totals.winRate,
    lossRate: summary.totals.lossRate,
    expectancyR: summary.totals.expectancyR,
    disciplineScore: summary.executionQuality.disciplineScore,
    adherenceScore: summary.planAdherence.adherenceScore,
    setupPatternsJson: JSON.stringify(summary.setupPatterns),
    directionPatternsJson: JSON.stringify(summary.directionPatterns),
    behaviorPatternsJson: JSON.stringify(summary.behaviorPatterns),
    reviewInsightsJson: JSON.stringify(summary.reviewInsights),
    supportingCaseIdsJson: JSON.stringify(summary.supportingCaseIds),
    summaryJson: serializeAnalyticsSnapshotSummary(summary),
    createdAt: snapshot.createdAt
  };
}

export class AnalyticsSnapshotService {
  constructor(private readonly caseSource: AnalyticsCaseSource, private readonly snapshotRepository: AnalyticsSnapshotRepository) {}

  async generateAnalyticsSnapshot(params: GenerateAnalyticsSnapshotParams): Promise<AnalyticsSnapshot> {
    const window: AnalyticsWindow = {
      subjectKind: params.subjectKind,
      subjectId: params.subjectId,
      assetScope: params.assetScope ?? '*',
      timeframeScope: params.timeframeScope ?? '*',
      lookbackDays: Math.max(1, params.lookbackDays ?? 180),
      generatedAt: params.generatedAt ?? new Date().toISOString()
    };

    const subjectCases = await this.caseSource.listSubjectCases(window.subjectKind, window.subjectId, 1000);
    const selectionParams = {
      subjectKind: window.subjectKind,
      subjectId: window.subjectId,
      assetScope: window.assetScope,
      timeframeScope: window.timeframeScope,
      lookbackDays: window.lookbackDays,
      generatedAt: window.generatedAt
    };
    const selectedCases = selectAnalyticsWindowCases(
      subjectCases,
      params.maxCases === undefined ? selectionParams : { ...selectionParams, maxCases: params.maxCases }
    );

    const totals = buildPerformanceTotals(selectedCases);
    const setupPatterns = buildSetupPatterns(selectedCases);
    const directionPatterns = buildDirectionPatterns(selectedCases);
    const executionQuality = buildExecutionQualitySummary(selectedCases);
    const planAdherence = buildPlanAdherenceSummary(selectedCases);
    const behaviorPatterns = buildBehaviorAnalyticsPatterns(selectedCases, window.generatedAt);
    const reviewInsights = buildReviewInsights(behaviorPatterns, setupPatterns, executionQuality);
    const reasoningLinkSummary = buildReasoningLinkSummary(selectedCases);

    const summary: AnalyticsSnapshotSummary = {
      window,
      totals,
      setupPatterns,
      directionPatterns,
      executionQuality,
      planAdherence,
      behaviorPatterns,
      reviewInsights,
      reasoningLinkSummary,
      supportingCaseIds: uniqueOrderedCaseIds(selectedCases, 50)
    };

    const snapshot: AnalyticsSnapshot = {
      snapshotId: snapshotId(window),
      summary,
      createdAt: window.generatedAt
    };

    const validated = validateAnalyticsSnapshot(snapshot);
    if (validated.ok === false) throw new Error(`invalid_analytics_snapshot:${validated.errors.join('; ')}`);

    await this.snapshotRepository.saveSnapshot(toRecord(validated.value));
    return validated.value;
  }
}
