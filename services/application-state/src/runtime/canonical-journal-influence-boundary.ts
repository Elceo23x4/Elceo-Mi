import type { CanonicalAssetSymbol, JournalBehaviorPattern, JournalInfluenceFlag, JournalInfluenceSnapshot, JournalInfluenceSummary, JournalSetupPattern, Timeframe } from '@elceo/types';
import { JournalInfluenceQueryService } from '../journal/influence-query';
import { JournalInfluenceService, type GenerateJournalInfluenceSnapshotParams } from '../journal/influence-service';
import type { JournalInfluenceReplayBundle } from '../journal/influence-replay';
import { getJournalCaseRepository } from '../persistence/journal-case-repository';
import { getJournalInfluenceRepository } from '../persistence/journal-influence-repository';

export type JournalInfluenceForReasoningInput = {
  enabled: boolean;
  influenceFlag: JournalInfluenceFlag;
  linkedEntryIds: string[];
  summary: JournalInfluenceSummary | null;
};

function deriveInfluenceFlag(summary: JournalInfluenceSummary | null): JournalInfluenceFlag {
  if (!summary) return 'none';
  const setup = summary.setupPatterns[0]?.influenceScore ?? 0;
  const behavior = Math.max(...summary.behaviorPatterns.map((item) => item.influenceScore), 0);
  const score = Math.max(setup, behavior);
  if (score >= 70) return 'strong';
  if (score >= 45) return 'medium';
  if (score > 0) return 'weak';
  return 'none';
}

export class CanonicalJournalInfluenceBoundaryService {
  constructor(
    private readonly influenceService: JournalInfluenceService = new JournalInfluenceService(getJournalCaseRepository(), getJournalInfluenceRepository()),
    private readonly queryService: JournalInfluenceQueryService = new JournalInfluenceQueryService(getJournalInfluenceRepository())
  ) {}

  generateJournalInfluenceSnapshot(params: GenerateJournalInfluenceSnapshotParams): Promise<JournalInfluenceSnapshot> {
    return this.influenceService.generateJournalInfluenceSnapshot(params);
  }

  getJournalInfluenceSnapshot(snapshotId: string): Promise<JournalInfluenceSnapshot | null> {
    return this.queryService.getJournalInfluenceSnapshot(snapshotId);
  }

  getLatestJournalInfluenceSnapshot(
    subjectKind: 'user' | 'workspace' | 'ops',
    subjectId: string,
    assetScope: CanonicalAssetSymbol | '*',
    timeframeScope: Timeframe | '*'
  ): Promise<JournalInfluenceSnapshot | null> {
    return this.queryService.getLatestJournalInfluenceSnapshot(subjectKind, subjectId, assetScope, timeframeScope);
  }

  listJournalInfluenceSnapshots(
    subjectKind: 'user' | 'workspace' | 'ops',
    subjectId: string,
    assetScope?: CanonicalAssetSymbol | '*',
    timeframeScope?: Timeframe | '*',
    limit?: number
  ): Promise<JournalInfluenceReplayBundle[]> {
    return this.queryService.listJournalInfluenceSnapshots(subjectKind, subjectId, assetScope, timeframeScope, limit);
  }

  listMostRelevantBehaviorPatterns(
    subjectKind: 'user' | 'workspace' | 'ops',
    subjectId: string,
    assetScope?: CanonicalAssetSymbol | '*',
    timeframeScope?: Timeframe | '*',
    limit?: number
  ): Promise<JournalBehaviorPattern[]> {
    return this.queryService.listMostRelevantBehaviorPatterns(subjectKind, subjectId, assetScope, timeframeScope, limit);
  }

  async getJournalInfluenceForReasoningInput(
    subjectKind: 'user' | 'workspace' | 'ops',
    subjectId: string,
    asset: CanonicalAssetSymbol,
    timeframe: Timeframe,
    asOfIso: string
  ): Promise<JournalInfluenceForReasoningInput> {
    const snapshot = await this.influenceService.generateJournalInfluenceSnapshot({
      subjectKind,
      subjectId,
      assetScope: asset,
      timeframeScope: timeframe,
      asOfIso
    });
    const summary = snapshot.summary.supportingCaseIds.length > 0 ? snapshot.summary : null;
    return {
      enabled: summary !== null,
      influenceFlag: deriveInfluenceFlag(summary),
      linkedEntryIds: summary?.supportingCaseIds ?? [],
      summary
    };
  }

  listMostRelevantSetupPatterns(
    subjectKind: 'user' | 'workspace' | 'ops',
    subjectId: string,
    assetScope?: CanonicalAssetSymbol | '*',
    timeframeScope?: Timeframe | '*',
    limit?: number
  ): Promise<JournalSetupPattern[]> {
    return this.queryService.listMostRelevantSetupPatterns(subjectKind, subjectId, assetScope, timeframeScope, limit);
  }
}
