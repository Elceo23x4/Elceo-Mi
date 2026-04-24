import { validateJournalInfluenceSnapshot } from '@elceo/schemas';
import type {
  CanonicalAssetSymbol,
  JournalInfluenceCaseEvidence,
  JournalInfluenceSnapshot,
  JournalInfluenceSummary,
  Timeframe
} from '@elceo/types';
import type { JournalCaseRepository, JournalInfluenceRepository, PersistedJournalInfluenceSnapshotRecord } from '../persistence/contracts';
import { serializeJournalInfluenceSummary } from './influence-serialization';
import { buildInfluenceSummaryParts } from './influence-aggregator';
import { selectJournalInfluenceCases } from './influence-selection';

export type GenerateJournalInfluenceSnapshotParams = {
  subjectKind: 'user' | 'workspace' | 'ops';
  subjectId: string;
  assetScope?: CanonicalAssetSymbol | '*';
  timeframeScope?: Timeframe | '*';
  asOfIso?: string;
  maxCases?: number;
  lookbackDays?: number;
};

function defaultAsOf(): string {
  return new Date().toISOString();
}

function buildSnapshotId(subjectKind: string, subjectId: string, assetScope: string, timeframeScope: string, generatedAt: string): string {
  const isoToken = generatedAt.replace(/[:.]/g, '-');
  return `jis|${subjectKind}|${subjectId}|${assetScope}|${timeframeScope}|${isoToken}`;
}

function toEvidence(cases: Awaited<ReturnType<typeof selectJournalInfluenceCases>>): JournalInfluenceCaseEvidence[] {
  return cases.map(({ caseData, recencyWeight }) => ({
    caseId: caseData.identity.caseId,
    asset: caseData.identity.asset,
    timeframe: caseData.identity.timeframe,
    direction: caseData.plan.direction,
    setupType: caseData.plan.setupType,
    outcome: caseData.closure.outcome,
    executionQuality: caseData.execution.executionQuality,
    reviewedAt: caseData.review.reviewedAt,
    closedAt: caseData.closure.closedAt,
    pnlPercent: caseData.closure.pnlPercent,
    rMultiple: caseData.closure.rMultiple,
    behaviorTags: [...caseData.review.behaviorTags],
    lessons: [...caseData.review.lessons],
    recencyWeight
  }));
}

function toPersisted(record: JournalInfluenceSnapshot): PersistedJournalInfluenceSnapshotRecord {
  return {
    snapshotId: record.snapshotId,
    subjectKind: record.summary.subjectKind,
    subjectId: record.summary.subjectId,
    assetScope: record.summary.asset,
    timeframeScope: record.summary.timeframe,
    generatedAt: record.summary.generatedAt,
    reviewedCaseCount: record.summary.reviewedCaseCount,
    closedCaseCount: record.summary.closedCaseCount,
    recentCaseCount: record.summary.recentCaseCount,
    supportingCaseIdsJson: JSON.stringify(record.summary.supportingCaseIds),
    summaryJson: serializeJournalInfluenceSummary(record.summary),
    createdAt: record.createdAt
  };
}

export class JournalInfluenceService {
  constructor(
    private readonly caseRepository: JournalCaseRepository,
    private readonly influenceRepository: JournalInfluenceRepository
  ) {}

  async generateJournalInfluenceSnapshot(params: GenerateJournalInfluenceSnapshotParams): Promise<JournalInfluenceSnapshot> {
    const assetScope = params.assetScope ?? '*';
    const timeframeScope = params.timeframeScope ?? '*';
    const generatedAt = params.asOfIso ?? defaultAsOf();

    const selectionParams: {
      subjectKind: 'user' | 'workspace' | 'ops';
      subjectId: string;
      assetScope: CanonicalAssetSymbol | '*';
      timeframeScope: Timeframe | '*';
      asOfIso: string;
      maxCases?: number;
      lookbackDays?: number;
    } = {
      subjectKind: params.subjectKind,
      subjectId: params.subjectId,
      assetScope,
      timeframeScope,
      asOfIso: generatedAt
    };
    if (params.maxCases !== undefined) selectionParams.maxCases = params.maxCases;
    if (params.lookbackDays !== undefined) selectionParams.lookbackDays = params.lookbackDays;

    const selected = await selectJournalInfluenceCases(this.caseRepository, selectionParams);

    const evidence = toEvidence(selected);
    const reviewedCaseCount = evidence.filter((item) => item.reviewedAt !== null).length;
    const closedCaseCount = evidence.filter((item) => item.closedAt !== null).length;
    const recentCaseCount = evidence.filter((item) => item.recencyWeight >= 0.5).length;

    const summary: JournalInfluenceSummary = {
      subjectKind: params.subjectKind,
      subjectId: params.subjectId,
      asset: assetScope,
      timeframe: timeframeScope,
      generatedAt,
      reviewedCaseCount,
      closedCaseCount,
      recentCaseCount,
      setupPatterns: [],
      behaviorPatterns: [],
      directionPatterns: [],
      repeatedMistakes: [],
      repeatedStrengths: [],
      cautionNotes: [],
      confidenceBoostNotes: [],
      supportingCaseIds: []
    };

    if (evidence.length > 0) {
      Object.assign(summary, buildInfluenceSummaryParts(evidence));
    }

    const snapshot: JournalInfluenceSnapshot = {
      snapshotId: buildSnapshotId(params.subjectKind, params.subjectId, assetScope, timeframeScope, generatedAt),
      summary,
      createdAt: generatedAt
    };

    const validated = validateJournalInfluenceSnapshot(snapshot);
    if (validated.ok === false) {
      throw new Error(`invalid_journal_influence_snapshot:${validated.errors.join('; ')}`);
    }

    await this.influenceRepository.saveInfluenceSnapshot(toPersisted(validated.value));
    return validated.value;
  }
}
