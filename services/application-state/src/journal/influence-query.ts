import type { CanonicalAssetSymbol, JournalBehaviorPattern, JournalInfluenceSnapshot, JournalSetupPattern, Timeframe } from '@elceo/types';
import type { JournalInfluenceRepository } from '../persistence/contracts';
import {
  getJournalInfluenceReplayById,
  getLatestJournalInfluenceReplay,
  listJournalInfluenceReplays,
  type JournalInfluenceReplayBundle
} from './influence-replay';

export class JournalInfluenceQueryService {
  constructor(private readonly repository: JournalInfluenceRepository) {}

  async getJournalInfluenceSnapshot(snapshotId: string): Promise<JournalInfluenceSnapshot | null> {
    const replay = await getJournalInfluenceReplayById(snapshotId, this.repository);
    return replay?.snapshot ?? null;
  }

  async getLatestJournalInfluenceSnapshot(
    subjectKind: 'user' | 'workspace' | 'ops',
    subjectId: string,
    assetScope: CanonicalAssetSymbol | '*',
    timeframeScope: Timeframe | '*'
  ): Promise<JournalInfluenceSnapshot | null> {
    const replay = await getLatestJournalInfluenceReplay(subjectKind, subjectId, assetScope, timeframeScope, this.repository);
    return replay?.snapshot ?? null;
  }

  listJournalInfluenceSnapshots(
    subjectKind: 'user' | 'workspace' | 'ops',
    subjectId: string,
    assetScope?: CanonicalAssetSymbol | '*',
    timeframeScope?: Timeframe | '*',
    limit?: number
  ): Promise<JournalInfluenceReplayBundle[]> {
    return listJournalInfluenceReplays(subjectKind, subjectId, this.repository, assetScope, timeframeScope, limit);
  }

  async listMostRelevantBehaviorPatterns(
    subjectKind: 'user' | 'workspace' | 'ops',
    subjectId: string,
    assetScope: CanonicalAssetSymbol | '*' = '*',
    timeframeScope: Timeframe | '*' = '*',
    limit = 5
  ): Promise<JournalBehaviorPattern[]> {
    const latest = await this.getLatestJournalInfluenceSnapshot(subjectKind, subjectId, assetScope, timeframeScope);
    if (!latest) return [];
    return [...latest.summary.behaviorPatterns]
      .sort((left, right) => right.influenceScore - left.influenceScore || right.sampleCount - left.sampleCount || left.behaviorTag.localeCompare(right.behaviorTag))
      .slice(0, Math.max(1, limit));
  }

  async listMostRelevantSetupPatterns(
    subjectKind: 'user' | 'workspace' | 'ops',
    subjectId: string,
    assetScope: CanonicalAssetSymbol | '*' = '*',
    timeframeScope: Timeframe | '*' = '*',
    limit = 5
  ): Promise<JournalSetupPattern[]> {
    const latest = await this.getLatestJournalInfluenceSnapshot(subjectKind, subjectId, assetScope, timeframeScope);
    if (!latest) return [];
    return [...latest.summary.setupPatterns]
      .sort((left, right) => right.influenceScore - left.influenceScore || right.sampleCount - left.sampleCount || left.setupType.localeCompare(right.setupType))
      .slice(0, Math.max(1, limit));
  }
}
