import type { AnalyticsSnapshotSummary, CoachingStrengthItem, JournalInfluenceSummary } from '@elceo/types';
import type { CoachingStrengthScores } from './scoring';

type Context = {
  subjectKind: 'user' | 'workspace' | 'ops';
  subjectId: string;
  assetScope: string;
  timeframeScope: string;
  generatedAt: string;
  analyticsSummary: AnalyticsSnapshotSummary | null;
  journalInfluenceSummary: JournalInfluenceSummary | null;
  strengthScores: CoachingStrengthScores;
};

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

function strengthId(theme: string, context: Context): string {
  return `strength|${theme}|${context.subjectKind}|${context.subjectId}|${context.assetScope}|${context.timeframeScope}|${context.generatedAt}`;
}

function buildStrength(context: Context, theme: CoachingStrengthItem['theme'], headline: string, explanation: string, score: number, supportingCaseIds: string[]): CoachingStrengthItem {
  return {
    strengthId: strengthId(theme, context),
    theme,
    headline,
    explanation,
    supportingCaseIds: uniqueCap(supportingCaseIds, 10),
    score
  };
}

export function generateCoachingStrengthItems(context: Context): CoachingStrengthItem[] {
  const out: CoachingStrengthItem[] = [];
  const scores = context.strengthScores;
  const analyticsCaseIds = context.analyticsSummary?.supportingCaseIds ?? [];
  const influenceCaseIds = context.journalInfluenceSummary?.supportingCaseIds ?? [];

  if (scores.disciplineStrengthScore >= 70) {
    out.push(buildStrength(context, 'discipline', 'Execution discipline is a current strength.', 'Recent execution quality remains stable and controlled.', scores.disciplineStrengthScore, analyticsCaseIds));
  }

  if (scores.setupStrengthScore >= 65) {
    out.push(buildStrength(context, 'setup_selection', 'Current setup selection shows strength.', 'Recent setup performance contains strong expectancy and/or win quality.', scores.setupStrengthScore, [...analyticsCaseIds, ...influenceCaseIds]));
  }

  if (scores.behaviorStrengthScore >= 35) {
    out.push(buildStrength(context, 'behavior_control', 'Positive behavioral patterns are repeating.', 'Reviewed history shows repeatable winning or disciplined behavior patterns.', scores.behaviorStrengthScore, [...analyticsCaseIds, ...influenceCaseIds]));
  }

  if (scores.reasoningStrengthScore >= 60) {
    out.push(buildStrength(context, 'reasoning_alignment', 'Reasoning-linked trades are performing well.', 'Trades linked to reasoning context are showing solid outcome quality.', scores.reasoningStrengthScore, analyticsCaseIds));
  }

  return out.sort((a, b) => b.score - a.score || a.theme.localeCompare(b.theme));
}
