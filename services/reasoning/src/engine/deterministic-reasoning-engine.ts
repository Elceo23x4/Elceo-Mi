import { validateCanonicalCognitionState } from '@elceo/schemas';
import type {
  CanonicalCognitionState,
  ContradictionAnatomy,
  ReasoningEngineContract,
  ReasoningInputFrame,
  ZoneSignificance
} from '@elceo/types';
import {
  DETERMINISTIC_REASONING_ENGINE_NAME,
  DETERMINISTIC_REASONING_VERSION,
  DETERMINISTIC_SCORING_VERSION,
  PRIMARY_ZONE_LIMIT,
  SECONDARY_ZONE_LIMIT,
  TOP_EVIDENCE_LIMIT
} from './constants';
import { buildChartProjection } from './chart-projection-builder';
import { composeConfidenceAnatomy } from './confidence-composer';
import { composeContradictionAnatomy } from './contradiction-composer';
import { buildBiasLabel, computeDirectionalSupport, selectBiasFromDirectionalSupport } from './directional-support';
import { buildExplanation, buildNarrativeSummary, buildThesis } from './explanation-builder';
import { composeFreshnessState } from './freshness-composer';
import { composeInvalidationState } from './invalidation-composer';
import { buildZoneConfluenceSummary, enrichEvidenceWithZoneAnchors } from './zone-anchoring';
import { sortEvidenceByRank, uniqueStrings } from './utils';

function buildCognitionId(input: ReasoningInputFrame): string {
  return `cognition|${input.asset}|${input.timeframe}|${input.asOf}`;
}

function buildZones(zones: ZoneSignificance[]): {
  primary: ZoneSignificance[];
  secondary: ZoneSignificance[];
  activeZoneIds: string[];
} {
  const sorted = [...zones].sort((a, b) => {
    if (b.finalStrengthScore !== a.finalStrengthScore) return b.finalStrengthScore - a.finalStrengthScore;
    return a.zoneId.localeCompare(b.zoneId);
  });
  const primary = sorted.slice(0, PRIMARY_ZONE_LIMIT);
  const secondary = sorted.slice(PRIMARY_ZONE_LIMIT, PRIMARY_ZONE_LIMIT + SECONDARY_ZONE_LIMIT);
  return {
    primary,
    secondary,
    activeZoneIds: uniqueStrings([...primary, ...secondary].map((zone) => zone.zoneId))
  };
}

function buildSupportEvents(input: ReasoningInputFrame): CanonicalCognitionState['supportEvents'] {
  const ranked = sortEvidenceByRank(input.evidenceCandidates);
  const topEvidence = ranked.slice(0, TOP_EVIDENCE_LIMIT);

  const linkedEventIds = uniqueStrings(
    topEvidence
      .map((item) => item.eventId)
      .filter((eventId): eventId is string => eventId !== null)
  ).slice(0, 10);

  const macroEventIds = uniqueStrings(
    input.events
      .filter((event) => event.eventKind === 'macro_calendar' || event.eventKind === 'macro_context')
      .map((event) => event.id)
  );
  const newsEventIds = uniqueStrings(input.events.filter((event) => event.eventKind === 'news').map((event) => event.id));
  const geopoliticsEventIds = uniqueStrings(input.events.filter((event) => event.eventKind === 'geopolitics').map((event) => event.id));

  return {
    linkedEventIds,
    catalystCount: linkedEventIds.length,
    macroEventIds,
    newsEventIds,
    geopoliticsEventIds
  };
}

export class DeterministicReasoningEngine implements ReasoningEngineContract {
  evaluate(input: ReasoningInputFrame): CanonicalCognitionState {
    const ranked = sortEvidenceByRank(input.evidenceCandidates);

    const directionalSupport = computeDirectionalSupport(ranked);
    const provisionalBias = selectBiasFromDirectionalSupport(directionalSupport);

    const contradictionAnatomy: ContradictionAnatomy = composeContradictionAnatomy({
      bias: provisionalBias,
      evidence: ranked,
      events: input.events,
      timeframe: input.timeframe,
      directionalSupport
    });

    const freshnessState = composeFreshnessState(input);

    const confidenceAnatomy = composeConfidenceAnatomy({
      bias: provisionalBias,
      evidence: ranked,
      directionalSupport,
      contradictionAnatomy,
      freshnessState
    });

    const finalBias = selectBiasFromDirectionalSupport(directionalSupport);
    const biasLabel = buildBiasLabel(finalBias, directionalSupport.biasStrengthScore, confidenceAnatomy.weightedScore, contradictionAnatomy.weightedScore);

    const zones = buildZones(input.zones);

    const invalidation = composeInvalidationState({
      asset: input.asset,
      timeframe: input.timeframe,
      bias: finalBias,
      confidenceScore: confidenceAnatomy.weightedScore,
      contradictionScore: contradictionAnatomy.weightedScore,
      freshnessScore: freshnessState.freshnessScore,
      recentPriceRange: input.recentPriceRange,
      evidence: ranked,
      zones: [...zones.primary, ...zones.secondary]
    });

    const enrichedEvidence = enrichEvidenceWithZoneAnchors({
      evidence: ranked,
      zones: [...zones.primary, ...zones.secondary],
      recentPriceRange: input.recentPriceRange,
      targetTimeframe: input.timeframe
    });

    const zoneConfluenceSummary = buildZoneConfluenceSummary(enrichedEvidence, [...zones.primary, ...zones.secondary]);

    const thesis = buildThesis(finalBias, invalidation.primary?.price ?? input.recentPriceRange.close);
    const narrativeSummary = buildNarrativeSummary({
      biasLabel,
      evidence: enrichedEvidence,
      contradictionRegime: contradictionAnatomy.regime,
      freshnessScore: freshnessState.freshnessScore
    });

    const evidence = {
      ranked: enrichedEvidence,
      topEvidenceIds: enrichedEvidence.slice(0, TOP_EVIDENCE_LIMIT).map((item) => item.evidenceId),
      evidenceCount: enrichedEvidence.length
    };

    const supportEvents = buildSupportEvents({ ...input, evidenceCandidates: enrichedEvidence });

    const explanation = buildExplanation({
      bias: finalBias,
      biasLabel,
      confidenceScore: confidenceAnatomy.weightedScore,
      contradictionScore: contradictionAnatomy.weightedScore,
      contradictionRegime: contradictionAnatomy.regime,
      freshnessScore: freshnessState.freshnessScore,
      evidence: enrichedEvidence,
      enrichedEvidence,
      invalidation,
      zones: zones.primary,
      recentPriceRange: input.recentPriceRange,
      zoneConfluenceSummary
    });

    const chartProjection = buildChartProjection({
      enrichedEvidence,
      invalidation,
      contradictionScore: contradictionAnatomy.weightedScore,
      zonesSection: zones,
      recentPriceRange: input.recentPriceRange
    });

    const output: CanonicalCognitionState = {
      cognitionId: buildCognitionId(input),
      asset: input.asset,
      timeframe: input.timeframe,
      evaluatedAt: input.asOf,
      evaluationWindowStart: null,
      evaluationWindowEnd: input.asOf,
      bias: finalBias,
      biasLabel,
      thesis,
      narrativeSummary,
      confidence: {
        score: confidenceAnatomy.weightedScore,
        anatomy: confidenceAnatomy
      },
      contradiction: {
        score: contradictionAnatomy.weightedScore,
        regime: contradictionAnatomy.regime,
        anatomy: contradictionAnatomy,
        summary: `${contradictionAnatomy.regime} contradiction (${contradictionAnatomy.weightedScore}).`
      },
      freshness: freshnessState,
      invalidation,
      evidence,
      zones,
      explanation,
      supportEvents,
      chartProjection,
      audit: {
        reasoningVersion: DETERMINISTIC_REASONING_VERSION,
        scoringVersion: DETERMINISTIC_SCORING_VERSION,
        evaluatedBy: DETERMINISTIC_REASONING_ENGINE_NAME,
        dataCutoffAt: input.asOf
      }
    };

    const validated = validateCanonicalCognitionState(output);
    if (validated.ok === false) {
      throw new Error(`invalid_cognition_output:${validated.errors.join('; ')}`);
    }

    return output;
  }
}
