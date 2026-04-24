import type { CanonicalAssetSymbol, Timeframe } from './events';
import type { JournalExecutionQuality, JournalOutcomeLabel, JournalSubjectKind, TradeDirection } from './journal';

export type JournalInfluenceCaseEvidence = {
  caseId: string;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  direction: TradeDirection;
  setupType: string;
  outcome: JournalOutcomeLabel;
  executionQuality: JournalExecutionQuality | null;
  reviewedAt: string | null;
  closedAt: string | null;
  pnlPercent: number | null;
  rMultiple: number | null;
  behaviorTags: string[];
  lessons: string[];
  recencyWeight: number;
};

export type JournalSetupPattern = {
  setupType: string;
  sampleCount: number;
  winCount: number;
  lossCount: number;
  breakevenCount: number;
  mixedCount: number;
  avgRMultiple: number | null;
  avgPnlPercent: number | null;
  executionQualityBreakdown: Record<string, number>;
  influenceScore: number;
};

export type JournalBehaviorPattern = {
  behaviorTag: string;
  sampleCount: number;
  negativeAssociationScore: number;
  positiveAssociationScore: number;
  influenceScore: number;
};

export type JournalDirectionPattern = {
  direction: TradeDirection;
  sampleCount: number;
  avgRMultiple: number | null;
  avgPnlPercent: number | null;
  winRate: number | null;
  influenceScore: number;
};

export type JournalInfluenceSummary = {
  subjectKind: JournalSubjectKind;
  subjectId: string;
  asset: CanonicalAssetSymbol | '*';
  timeframe: Timeframe | '*';
  generatedAt: string;
  reviewedCaseCount: number;
  closedCaseCount: number;
  recentCaseCount: number;
  setupPatterns: JournalSetupPattern[];
  behaviorPatterns: JournalBehaviorPattern[];
  directionPatterns: JournalDirectionPattern[];
  repeatedMistakes: string[];
  repeatedStrengths: string[];
  cautionNotes: string[];
  confidenceBoostNotes: string[];
  supportingCaseIds: string[];
};

export type JournalInfluenceSnapshot = {
  snapshotId: string;
  summary: JournalInfluenceSummary;
  createdAt: string;
};
