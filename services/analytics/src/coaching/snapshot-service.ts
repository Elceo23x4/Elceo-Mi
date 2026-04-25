import { validateCoachingSnapshot } from '@elceo/schemas';
import type { AnalyticsAssetScope, AnalyticsTimeframeScope, CoachingSnapshot, CoachingSummary } from '@elceo/types';
import { generateCoachingActionPlan } from './action-plan';
import { generateCoachingFocusAreas } from './focus-generator';
import { CoachingInputLoader } from './input-loader';
import type { CoachingSnapshotRepository, PersistedCoachingSnapshotRecord } from './persistence/contracts';
import { computeCoachingRiskScores, computeCoachingStrengthScores } from './scoring';
import { generateCoachingStrengthItems } from './strength-generator';
import { generateCoachingSummaryNotes } from './summary-notes';

export type GenerateCoachingSnapshotParams = {
  subjectKind: 'user' | 'workspace' | 'ops';
  subjectId: string;
  assetScope?: AnalyticsAssetScope;
  timeframeScope?: AnalyticsTimeframeScope;
  generatedAt?: string;
};

function snapshotId(subjectKind: string, subjectId: string, assetScope: string, timeframeScope: string, generatedAt: string): string {
  return `csn|${subjectKind}|${subjectId}|${assetScope}|${timeframeScope}|${generatedAt.replace(/[:.]/g, '-')}`;
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

function toRecord(snapshot: CoachingSnapshot): PersistedCoachingSnapshotRecord {
  const { summary } = snapshot;
  return {
    snapshotId: snapshot.snapshotId,
    subjectKind: summary.subjectKind,
    subjectId: summary.subjectId,
    assetScope: summary.assetScope,
    timeframeScope: summary.timeframeScope,
    generatedAt: summary.generatedAt,
    analyticsSnapshotId: summary.analyticsSnapshotId,
    journalInfluenceSnapshotId: summary.journalInfluenceSnapshotId,
    totalSignalsConsidered: summary.totalSignalsConsidered,
    focusAreasJson: JSON.stringify(summary.focusAreas),
    strengthsJson: JSON.stringify(summary.strengths),
    actionPlanJson: JSON.stringify(summary.actionPlan),
    summaryNotesJson: JSON.stringify(summary.summaryNotes),
    supportingCaseIdsJson: JSON.stringify(summary.supportingCaseIds),
    summaryJson: JSON.stringify(summary),
    createdAt: snapshot.createdAt
  };
}

export class CoachingSnapshotService {
  constructor(
    private readonly inputLoader: CoachingInputLoader,
    private readonly repository: CoachingSnapshotRepository
  ) {}

  async generateCoachingSnapshot(params: GenerateCoachingSnapshotParams): Promise<CoachingSnapshot> {
    const assetScope = params.assetScope ?? '*';
    const timeframeScope = params.timeframeScope ?? '*';
    const generatedAt = params.generatedAt ?? new Date().toISOString();

    const loaded = await this.inputLoader.load({
      subjectKind: params.subjectKind,
      subjectId: params.subjectId,
      assetScope,
      timeframeScope,
      generatedAt
    });

    const riskScores = computeCoachingRiskScores({
      analyticsSummary: loaded.analytics?.summary ?? null,
      journalInfluenceSummary: loaded.journalInfluence?.summary ?? null
    });
    const strengthScores = computeCoachingStrengthScores({
      analyticsSummary: loaded.analytics?.summary ?? null,
      journalInfluenceSummary: loaded.journalInfluence?.summary ?? null
    });

    const focusAreas = generateCoachingFocusAreas({
      subjectKind: params.subjectKind,
      subjectId: params.subjectId,
      assetScope,
      timeframeScope,
      generatedAt,
      analyticsSummary: loaded.analytics?.summary ?? null,
      journalInfluenceSummary: loaded.journalInfluence?.summary ?? null,
      riskScores
    });
    const strengths = generateCoachingStrengthItems({
      subjectKind: params.subjectKind,
      subjectId: params.subjectId,
      assetScope,
      timeframeScope,
      generatedAt,
      analyticsSummary: loaded.analytics?.summary ?? null,
      journalInfluenceSummary: loaded.journalInfluence?.summary ?? null,
      strengthScores
    });
    const actionPlan = generateCoachingActionPlan(focusAreas, {
      subjectKind: params.subjectKind,
      subjectId: params.subjectId,
      assetScope,
      timeframeScope,
      generatedAt
    });

    const summaryNotes = generateCoachingSummaryNotes(focusAreas, strengths);
    const supportingCaseIds = uniqueCap(
      [...focusAreas.flatMap((item) => item.supportingCaseIds), ...strengths.flatMap((item) => item.supportingCaseIds)],
      30
    );

    const nonZeroRiskCount = Object.values(riskScores).filter((value) => value > 0).length;
    const nonZeroStrengthCount = Object.values(strengthScores).filter((value) => value > 0).length;

    const summary: CoachingSummary = {
      subjectKind: params.subjectKind,
      subjectId: params.subjectId,
      assetScope,
      timeframeScope,
      generatedAt,
      analyticsSnapshotId: loaded.analytics?.snapshotId ?? null,
      journalInfluenceSnapshotId: loaded.journalInfluence?.snapshotId ?? null,
      totalSignalsConsidered: nonZeroRiskCount + nonZeroStrengthCount,
      focusAreas,
      strengths,
      actionPlan,
      summaryNotes,
      supportingCaseIds
    };

    const snapshot: CoachingSnapshot = {
      snapshotId: snapshotId(params.subjectKind, params.subjectId, assetScope, timeframeScope, generatedAt),
      summary,
      createdAt: generatedAt
    };

    const validated = validateCoachingSnapshot(snapshot);
    if (validated.ok === false) throw new Error(`invalid_coaching_snapshot:${validated.errors.join('; ')}`);

    await this.repository.saveSnapshot(toRecord(validated.value));
    return validated.value;
  }
}
