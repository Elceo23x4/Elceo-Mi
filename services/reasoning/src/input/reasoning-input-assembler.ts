import { validateReasoningInputFrame } from '@elceo/schemas';
import type { CanonicalAssetSymbol, CanonicalCognitionState, ReasoningInputFrame, Timeframe, ZoneSignificance } from '@elceo/types';
import type { CognitionSnapshotRepository } from '../persistence/contracts';
import { deserializeCanonicalCognitionState } from '../persistence/serialization';
import { buildRankedEvidenceCandidates } from './evidence-projection';
import type { ReasoningJournalInfluenceProvider } from './journal-influence-provider';
import { DisabledJournalInfluenceProvider, validateJournalInfluenceOrThrow } from './journal-influence-provider';
import type { ReasoningMarketContextLoader } from './market-context-loader';
import { EmptyReasoningZoneInputProvider, type ReasoningZoneInputProvider, validateZonesOrThrow } from './zone-input-provider';
import type { ReasoningInputSourceSelector } from './source-selector';

export const DEFAULT_REASONING_VERSION = 'c3a.0.0';
export const DEFAULT_SCORING_VERSION = 'c3a.0.0';

export type ReasoningInputAssemblerErrorCode = 'corrupt_prior_cognition_snapshot';

export class ReasoningInputAssemblerError extends Error {
  constructor(public readonly code: ReasoningInputAssemblerErrorCode, message: string) {
    super(message);
    this.name = 'ReasoningInputAssemblerError';
  }
}

export type AssembleReasoningInputParams = {
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  asOf: string;
  sourceIngestionRunId?: string | null;
  userId?: string | null;
};

export type ReasoningInputAssemblyResult = {
  input: ReasoningInputFrame;
  sourceRunId: string;
  sourceRequestKey: string | null;
  priorSnapshotId: string | null;
  warnings: string[];
  selectedEventCount: number;
  projectedEvidenceCount: number;
  zoneCount: number;
};

export class ReasoningInputAssembler {
  constructor(
    private readonly sourceSelector: ReasoningInputSourceSelector,
    private readonly marketContextLoader: ReasoningMarketContextLoader,
    private readonly snapshotRepository: CognitionSnapshotRepository,
    private readonly zoneProvider: ReasoningZoneInputProvider = new EmptyReasoningZoneInputProvider(),
    private readonly journalProvider: ReasoningJournalInfluenceProvider = new DisabledJournalInfluenceProvider()
  ) {}

  async assembleReasoningInput(params: AssembleReasoningInputParams): Promise<ReasoningInputAssemblyResult> {
    const warnings: string[] = [];

    const selected = await this.sourceSelector.selectReasoningInputSource(params);

    const market = await this.marketContextLoader.load(params.asset, params.timeframe, params.asOf);

    const priorSnapshot = await this.snapshotRepository.getLatestSnapshotForAssetTimeframe(params.asset, params.timeframe, params.asOf);
    let priorCognition: CanonicalCognitionState | null = null;
    if (priorSnapshot) {
      try {
        priorCognition = deserializeCanonicalCognitionState(priorSnapshot.cognitionJson);
      } catch (error) {
        throw new ReasoningInputAssemblerError(
          'corrupt_prior_cognition_snapshot',
          `corrupt prior cognition snapshot ${priorSnapshot.snapshotId}: ${error instanceof Error ? error.message : 'unknown error'}`
        );
      }
    }

    let zones: ZoneSignificance[] = [];
    try {
      zones = validateZonesOrThrow(await this.zoneProvider.loadZones(params.asset, params.timeframe, params.asOf));
    } catch (error) {
      warnings.push(`zone_provider_failure:${error instanceof Error ? error.message : 'unknown error'}`);
      zones = [];
    }

    let journalInfluence = await new DisabledJournalInfluenceProvider().loadJournalInfluence(params.asset, params.timeframe, params.asOf, params.userId);
    try {
      journalInfluence = validateJournalInfluenceOrThrow(
        await this.journalProvider.loadJournalInfluence(params.asset, params.timeframe, params.asOf, params.userId)
      );
    } catch (error) {
      warnings.push(`journal_provider_failure:${error instanceof Error ? error.message : 'unknown error'}`);
      journalInfluence = await new DisabledJournalInfluenceProvider().loadJournalInfluence(params.asset, params.timeframe, params.asOf, params.userId);
    }

    const evidenceCandidates = buildRankedEvidenceCandidates(selected.events, params.asset, params.timeframe, market.latestPrice, priorCognition);

    const input: ReasoningInputFrame = {
      asset: params.asset,
      timeframe: params.timeframe,
      asOf: params.asOf,
      events: [...selected.events],
      evidenceCandidates,
      zones,
      latestPrice: market.latestPrice,
      recentPriceRange: market.recentPriceRange,
      priorCognition,
      userJournalInfluence: journalInfluence,
      config: {
        reasoningVersion: DEFAULT_REASONING_VERSION,
        scoringVersion: DEFAULT_SCORING_VERSION
      }
    };

    const validated = validateReasoningInputFrame(input);
    if (validated.ok === false) {
      throw new Error(`invalid_reasoning_input_frame:${validated.errors.join('; ')}`);
    }

    return {
      input: validated.value,
      sourceRunId: selected.run.runId,
      sourceRequestKey: selected.run.requestKey,
      priorSnapshotId: priorSnapshot?.snapshotId ?? null,
      warnings,
      selectedEventCount: selected.events.length,
      projectedEvidenceCount: evidenceCandidates.length,
      zoneCount: zones.length
    };
  }
}
