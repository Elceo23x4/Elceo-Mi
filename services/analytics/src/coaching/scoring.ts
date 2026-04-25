import type { AnalyticsSnapshotSummary, JournalInfluenceSummary } from '@elceo/types';

export type CoachingScoreInputs = {
  analyticsSummary: AnalyticsSnapshotSummary | null;
  journalInfluenceSummary: JournalInfluenceSummary | null;
};

export type CoachingRiskScores = {
  disciplineRiskScore: number;
  setupSelectionRiskScore: number;
  behaviorControlRiskScore: number;
  executionPrecisionRiskScore: number;
  reviewQualityRiskScore: number;
  reasoningAlignmentRiskScore: number;
};

export type CoachingStrengthScores = {
  disciplineStrengthScore: number;
  setupStrengthScore: number;
  behaviorStrengthScore: number;
  reasoningStrengthScore: number;
};

function clampTo100(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function roundScore(value: number): number {
  return Math.round(clampTo100(value) * 100) / 100;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, item) => acc + item, 0) / values.length;
}

export function computeCoachingRiskScores(inputs: CoachingScoreInputs): CoachingRiskScores {
  const analytics = inputs.analyticsSummary;
  const influence = inputs.journalInfluenceSummary;

  const disciplineScore = analytics?.executionQuality.disciplineScore ?? null;
  const disciplineRiskScore = disciplineScore === null ? 0 : roundScore(100 - disciplineScore);

  const lowSetups = (analytics?.setupPatterns ?? [])
    .filter((item) => item.sampleCount >= 3 && item.performanceScore < 50)
    .sort((a, b) => a.performanceScore - b.performanceScore || a.setupType.localeCompare(b.setupType))
    .slice(0, 3)
    .map((item) => 100 - item.performanceScore);
  const setupSelectionRiskScore = roundScore(average(lowSetups));

  const behaviorSignals = (analytics?.behaviorPatterns ?? [])
    .map((item) => Math.max(item.lossAssociationScore, item.impulsiveAssociationScore))
    .filter((value) => value >= 35)
    .sort((a, b) => b - a);
  const influenceSignals = (influence?.repeatedMistakes ?? []).length > 0 ? [35] : [];
  const behaviorControlRiskScore = roundScore(average([...behaviorSignals, ...influenceSignals]));

  const adherenceScore = analytics?.planAdherence.adherenceScore ?? null;
  const executionPrecisionRiskScore = adherenceScore === null ? 0 : roundScore(100 - adherenceScore);

  const closedCaseCount = analytics?.totals.closedCaseCount ?? 0;
  const reviewedCaseCount = analytics?.totals.reviewedCaseCount ?? 0;
  const reviewCoverage = closedCaseCount === 0 ? 1 : reviewedCaseCount / closedCaseCount;
  const reviewQualityRiskScore = closedCaseCount === 0 ? 0 : roundScore((1 - reviewCoverage) * 100);

  const linkedCaseCount = analytics?.reasoningLinkSummary.linkedCaseCount ?? 0;
  const linkedWinRate = analytics?.reasoningLinkSummary.linkedWinRate ?? null;
  const linkedAvgRMultiple = analytics?.reasoningLinkSummary.linkedAvgRMultiple ?? null;
  const base = 100 - ((linkedWinRate ?? 0) * 100);
  const adjust = Math.max(0, -(linkedAvgRMultiple ?? 0)) * 20;
  const reasoningAlignmentRiskScore = linkedCaseCount === 0 ? 0 : roundScore(base + adjust);

  return {
    disciplineRiskScore,
    setupSelectionRiskScore,
    behaviorControlRiskScore,
    executionPrecisionRiskScore,
    reviewQualityRiskScore,
    reasoningAlignmentRiskScore
  };
}

export function computeCoachingStrengthScores(inputs: CoachingScoreInputs): CoachingStrengthScores {
  const analytics = inputs.analyticsSummary;

  const disciplineScore = analytics?.executionQuality.disciplineScore ?? null;
  const disciplineStrengthScore = disciplineScore === null ? 0 : roundScore(disciplineScore);

  const strongSetups = (analytics?.setupPatterns ?? [])
    .filter((item) => item.sampleCount >= 3 && item.performanceScore >= 60)
    .sort((a, b) => b.performanceScore - a.performanceScore || a.setupType.localeCompare(b.setupType))
    .slice(0, 3)
    .map((item) => item.performanceScore);
  const setupStrengthScore = roundScore(average(strongSetups));

  const behaviorStrengths = (analytics?.behaviorPatterns ?? [])
    .filter((item) => item.winAssociationScore >= 35)
    .sort((a, b) => b.winAssociationScore - a.winAssociationScore || a.behaviorTag.localeCompare(b.behaviorTag))
    .slice(0, 3)
    .map((item) => item.winAssociationScore);
  const behaviorStrengthScore = roundScore(average(behaviorStrengths));

  const linkedCaseCount = analytics?.reasoningLinkSummary.linkedCaseCount ?? 0;
  const linkedWinRate = analytics?.reasoningLinkSummary.linkedWinRate ?? 0;
  const linkedAvgRMultiple = analytics?.reasoningLinkSummary.linkedAvgRMultiple ?? 0;
  const reasoningStrengthScore = linkedCaseCount === 0 ? 0 : roundScore((linkedWinRate * 70) + Math.max(0, linkedAvgRMultiple) * 15);

  return {
    disciplineStrengthScore,
    setupStrengthScore,
    behaviorStrengthScore,
    reasoningStrengthScore
  };
}
