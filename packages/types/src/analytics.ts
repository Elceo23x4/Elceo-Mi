import type { CanonicalAssetSymbol, Timeframe } from './events';
import type { TradeDirection } from './journal';

export type AnalyticsAssetScope = CanonicalAssetSymbol | '*';
export type AnalyticsTimeframeScope = Timeframe | '*';

export type AnalyticsWindow = {
  subjectKind: 'user' | 'workspace' | 'ops';
  subjectId: string;
  assetScope: AnalyticsAssetScope;
  timeframeScope: AnalyticsTimeframeScope;
  lookbackDays: number;
  generatedAt: string;
};

export type PerformanceTotals = {
  closedCaseCount: number;
  reviewedCaseCount: number;
  winCount: number;
  lossCount: number;
  breakevenCount: number;
  mixedCount: number;
  openCount: number;
  linkedReasoningCount: number;
  linkedDriftCount: number;
  avgRMultiple: number | null;
  avgPnlPercent: number | null;
  medianRMultiple: number | null;
  medianPnlPercent: number | null;
  winRate: number | null;
  lossRate: number | null;
  expectancyR: number | null;
};

export type SetupPerformancePattern = {
  setupType: string;
  sampleCount: number;
  winCount: number;
  lossCount: number;
  breakevenCount: number;
  mixedCount: number;
  avgRMultiple: number | null;
  avgPnlPercent: number | null;
  winRate: number | null;
  expectancyR: number | null;
  disciplineScore: number;
  performanceScore: number;
};

export type DirectionPerformancePattern = {
  direction: TradeDirection;
  sampleCount: number;
  avgRMultiple: number | null;
  avgPnlPercent: number | null;
  winRate: number | null;
  performanceScore: number;
};

export type ExecutionQualitySummary = {
  disciplinedCount: number;
  acceptableCount: number;
  weakCount: number;
  impulsiveCount: number;
  missingQualityCount: number;
  disciplineScore: number;
};

export type PlanAdherenceSummary = {
  comparableEntryCount: number;
  avgEntryDeviationPercent: number | null;
  maxEntryDeviationPercent: number | null;
  adherenceScore: number | null;
};

export type BehaviorAnalyticsPattern = {
  behaviorTag: string;
  sampleCount: number;
  winAssociationScore: number;
  lossAssociationScore: number;
  impulsiveAssociationScore: number;
  importanceScore: number;
};

export type ReviewInsightSummary = {
  repeatedMistakes: string[];
  repeatedStrengths: string[];
  cautionNotes: string[];
  confidenceNotes: string[];
};

export type ReasoningLinkSummary = {
  linkedCaseCount: number;
  linkedWinRate: number | null;
  linkedAvgRMultiple: number | null;
  linkedAvgPnlPercent: number | null;
};

export type AnalyticsSnapshotSummary = {
  window: AnalyticsWindow;
  totals: PerformanceTotals;
  setupPatterns: SetupPerformancePattern[];
  directionPatterns: DirectionPerformancePattern[];
  executionQuality: ExecutionQualitySummary;
  planAdherence: PlanAdherenceSummary;
  behaviorPatterns: BehaviorAnalyticsPattern[];
  reviewInsights: ReviewInsightSummary;
  reasoningLinkSummary: ReasoningLinkSummary;
  supportingCaseIds: string[];
};

export type AnalyticsSnapshot = {
  snapshotId: string;
  summary: AnalyticsSnapshotSummary;
  createdAt: string;
};
