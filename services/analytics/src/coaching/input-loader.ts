import type { AnalyticsAssetScope, AnalyticsTimeframeScope } from '@elceo/types';
import { deserializeAnalyticsSnapshotSummary } from '../core/serialization';
import { deserializeJournalInfluenceSummary } from './serialization';
import type { LoadedCoachingInputs, AnalyticsSnapshotLookupRepository, JournalInfluenceSnapshotLookupRepository } from './persistence/contracts';

export type CoachingInputLoadParams = {
  subjectKind: 'user' | 'workspace' | 'ops';
  subjectId: string;
  assetScope: AnalyticsAssetScope;
  timeframeScope: AnalyticsTimeframeScope;
  generatedAt: string;
};

const LOOKBACK_DAYS = 180;

export class CoachingInputLoader {
  constructor(
    private readonly analyticsLookup: AnalyticsSnapshotLookupRepository,
    private readonly influenceLookup: JournalInfluenceSnapshotLookupRepository
  ) {}

  private async loadAnalyticsWithFallback(params: CoachingInputLoadParams): Promise<LoadedCoachingInputs['analytics']> {
    const ladders: Array<{ assetScope: AnalyticsAssetScope; timeframeScope: AnalyticsTimeframeScope }> = [
      { assetScope: params.assetScope, timeframeScope: params.timeframeScope },
      { assetScope: params.assetScope, timeframeScope: '*' },
      { assetScope: '*', timeframeScope: params.timeframeScope },
      { assetScope: '*', timeframeScope: '*' }
    ];

    for (const ladder of ladders) {
      const snapshot = await this.analyticsLookup.getLatestSnapshot(
        params.subjectKind,
        params.subjectId,
        ladder.assetScope,
        ladder.timeframeScope,
        LOOKBACK_DAYS
      );
      if (snapshot) {
        return { snapshotId: snapshot.snapshotId, summary: deserializeAnalyticsSnapshotSummary(snapshot.summaryJson) };
      }
    }
    return null;
  }

  private async loadInfluenceWithFallback(params: CoachingInputLoadParams): Promise<LoadedCoachingInputs['journalInfluence']> {
    const ladders: Array<{ assetScope: AnalyticsAssetScope; timeframeScope: AnalyticsTimeframeScope }> = [
      { assetScope: params.assetScope, timeframeScope: params.timeframeScope },
      { assetScope: params.assetScope, timeframeScope: '*' },
      { assetScope: '*', timeframeScope: params.timeframeScope },
      { assetScope: '*', timeframeScope: '*' }
    ];

    for (const ladder of ladders) {
      const snapshot = await this.influenceLookup.getLatestInfluenceSnapshot(params.subjectKind, params.subjectId, ladder.assetScope, ladder.timeframeScope);
      if (snapshot) {
        return { snapshotId: snapshot.snapshotId, summary: deserializeJournalInfluenceSummary(snapshot.summaryJson) };
      }
    }
    return null;
  }

  async load(params: CoachingInputLoadParams): Promise<LoadedCoachingInputs> {
    const [analytics, journalInfluence] = await Promise.all([
      this.loadAnalyticsWithFallback(params),
      this.loadInfluenceWithFallback(params)
    ]);
    return { analytics, journalInfluence };
  }
}
