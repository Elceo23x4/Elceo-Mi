import type { AnalyticsSnapshotSummary, CoachingFocusArea, CoachingPriority, CoachingSignalSource, JournalInfluenceSummary } from '@elceo/types';
import type { CoachingRiskScores } from './scoring';

type Context = {
  subjectKind: 'user' | 'workspace' | 'ops';
  subjectId: string;
  assetScope: string;
  timeframeScope: string;
  generatedAt: string;
  analyticsSummary: AnalyticsSnapshotSummary | null;
  journalInfluenceSummary: JournalInfluenceSummary | null;
  riskScores: CoachingRiskScores;
};

function priorityForScore(score: number): CoachingPriority {
  if (score >= 75) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

function uniqueCap(items: string[], cap: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
    if (out.length >= cap) break;
  }
  return out;
}

function focusId(theme: string, context: Context): string {
  return `focus|${theme}|${context.subjectKind}|${context.subjectId}|${context.assetScope}|${context.timeframeScope}|${context.generatedAt}`;
}

function fromAnalytics(summary: AnalyticsSnapshotSummary | null): string[] {
  return summary?.supportingCaseIds ?? [];
}

function fromInfluence(summary: JournalInfluenceSummary | null): string[] {
  return summary?.supportingCaseIds ?? [];
}

function buildFocus(context: Context, theme: CoachingFocusArea['theme'], score: number, headline: string, explanation: string, supportingMetrics: Record<string, number | null>, sourceKinds: CoachingSignalSource[], supportingCaseIds: string[]): CoachingFocusArea {
  return {
    focusId: focusId(theme, context),
    theme,
    priority: priorityForScore(score),
    headline,
    explanation,
    supportingMetrics,
    sourceKinds,
    supportingCaseIds: uniqueCap(supportingCaseIds, 10),
    score
  };
}

export function generateCoachingFocusAreas(context: Context): CoachingFocusArea[] {
  const out: CoachingFocusArea[] = [];
  const risk = context.riskScores;

  if (risk.disciplineRiskScore >= 35) {
    out.push(buildFocus(context, 'discipline', risk.disciplineRiskScore, 'Execution discipline requires improvement.', 'Recent history shows weak or impulsive execution quality.', {
      disciplineRiskScore: risk.disciplineRiskScore,
      disciplineScore: context.analyticsSummary?.executionQuality.disciplineScore ?? null
    }, ['analytics', 'journal_review'], [...fromAnalytics(context.analyticsSummary)]));
  }

  if (risk.setupSelectionRiskScore >= 35) {
    out.push(buildFocus(context, 'setup_selection', risk.setupSelectionRiskScore, 'Setup selection quality is underperforming.', 'Recent setup performance shows weak expectancy or low win quality.', {
      setupSelectionRiskScore: risk.setupSelectionRiskScore
    }, ['analytics', 'journal_influence'], [...fromAnalytics(context.analyticsSummary), ...fromInfluence(context.journalInfluenceSummary)]));
  }

  if (risk.behaviorControlRiskScore >= 35) {
    out.push(buildFocus(context, 'behavior_control', risk.behaviorControlRiskScore, 'Behavioral mistakes are repeating.', 'Recent reviewed history shows repeatable loss- or impulsive-associated behaviors.', {
      behaviorControlRiskScore: risk.behaviorControlRiskScore
    }, ['analytics', 'journal_influence', 'journal_review'], [...fromAnalytics(context.analyticsSummary), ...fromInfluence(context.journalInfluenceSummary)]));
  }

  if (risk.executionPrecisionRiskScore >= 30) {
    out.push(buildFocus(context, 'execution_precision', risk.executionPrecisionRiskScore, 'Entry precision and plan adherence need tightening.', 'Executed entries are drifting materially from planned entries.', {
      executionPrecisionRiskScore: risk.executionPrecisionRiskScore,
      adherenceScore: context.analyticsSummary?.planAdherence.adherenceScore ?? null
    }, ['analytics'], [...fromAnalytics(context.analyticsSummary)]));
  }

  if (risk.reviewQualityRiskScore >= 30) {
    out.push(buildFocus(context, 'review_quality', risk.reviewQualityRiskScore, 'Review coverage is too low.', 'Too many closed cases are not being fully reviewed.', {
      reviewQualityRiskScore: risk.reviewQualityRiskScore
    }, ['analytics'], [...fromAnalytics(context.analyticsSummary)]));
  }

  if (risk.reasoningAlignmentRiskScore >= 35) {
    out.push(buildFocus(context, 'reasoning_alignment', risk.reasoningAlignmentRiskScore, 'Reasoning-linked trades need better outcome quality.', 'Trades linked to reasoning context are underperforming relative to expectations.', {
      reasoningAlignmentRiskScore: risk.reasoningAlignmentRiskScore
    }, ['analytics', 'reasoning_linkage'], [...fromAnalytics(context.analyticsSummary)]));
  }

  return out;
}
