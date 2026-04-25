import type { CanonicalAssetSymbol, Timeframe } from './events';

export type CoachingPriority = 'critical' | 'high' | 'medium' | 'low';

export type CoachingTheme =
  | 'discipline'
  | 'setup_selection'
  | 'risk_management'
  | 'execution_precision'
  | 'behavior_control'
  | 'review_quality'
  | 'reasoning_alignment';

export type CoachingSignalSource = 'analytics' | 'journal_influence' | 'journal_review' | 'reasoning_linkage';

export type CoachingFocusArea = {
  focusId: string;
  theme: CoachingTheme;
  priority: CoachingPriority;
  headline: string;
  explanation: string;
  supportingMetrics: Record<string, number | null>;
  supportingCaseIds: string[];
  sourceKinds: CoachingSignalSource[];
  score: number;
};

export type CoachingActionItem = {
  actionId: string;
  theme: CoachingTheme;
  priority: CoachingPriority;
  instruction: string;
  successMetric: string;
  supportingFocusIds: string[];
  score: number;
};

export type CoachingStrengthItem = {
  strengthId: string;
  theme: CoachingTheme;
  headline: string;
  explanation: string;
  supportingCaseIds: string[];
  score: number;
};

export type CoachingSummary = {
  subjectKind: 'user' | 'workspace' | 'ops';
  subjectId: string;
  assetScope: CanonicalAssetSymbol | '*';
  timeframeScope: Timeframe | '*';
  generatedAt: string;
  analyticsSnapshotId: string | null;
  journalInfluenceSnapshotId: string | null;
  totalSignalsConsidered: number;
  focusAreas: CoachingFocusArea[];
  strengths: CoachingStrengthItem[];
  actionPlan: CoachingActionItem[];
  summaryNotes: string[];
  supportingCaseIds: string[];
};

export type CoachingSnapshot = {
  snapshotId: string;
  summary: CoachingSummary;
  createdAt: string;
};
