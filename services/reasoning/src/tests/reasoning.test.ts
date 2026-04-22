import {
  computeConfidenceWeightedScore,
  computeContradictionWeightedScore,
  computeFreshnessState,
  computeZoneStrengthScore,
  mapContradictionRegime,
  mapInvalidationRiskLabel
} from '@elceo/domain';
import { validateCanonicalEvent } from '../../../../packages/schemas/src/event.schema';
import { validateCanonicalCognitionState } from '../../../../packages/schemas/src/cognition.schema';
import type {
  CanonicalCognitionState,
  CanonicalEvent,
  CanonicalProviderAdapterSuite,
  NotificationDecision,
  NotificationTriggerRule
} from '@elceo/types';
import type { MarketDataAdapter } from '@elceo/providers';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function fixtureEvent(): CanonicalEvent {
  return {
    id: 'evt-us-cpi-2026-01-15',
    sourceId: 'upstream-991',
    sourceName: 'MacroWire',
    sourceCategory: 'macro_calendar',
    eventKind: 'macro_calendar',
    status: 'published',
    impact: 'high',
    title: 'US CPI YoY published',
    summary: 'US CPI printed above forecast.',
    normalizedNarrative: 'Inflation surprise lifts rate hold risk and keeps USD bid.',
    occurredAt: '2026-01-15T13:30:00.000Z',
    detectedAt: '2026-01-15T13:31:10.000Z',
    effectiveUntil: null,
    region: 'US',
    country: 'US',
    currency: 'USD',
    relatedAssets: ['XAU/USD', 'EUR/USD'],
    relatedTimeframes: ['M15', 'H1', 'H4'],
    relevanceScore: 88,
    sourceReliabilityScore: 84,
    recencyScore: 96,
    confirmationCount: 3,
    tags: ['inflation', 'cpi', 'usd'],
    rawPayload: { source: 'macro-wire', cpiYoY: 3.4 },
    rawUrl: 'https://example.com/cpi',
    revisionOfEventId: null,
    dedupeKey: 'macro_calendar|US|CPI|2026-01-15T13:30:00.000Z',
    stale: false,
    freshnessHours: 0.1,
    attribution: {
      provider: 'macrowire',
      publisher: 'MacroWire',
      author: null
    },
    audit: {
      normalizedBy: 'macro-calendar-normalizer',
      normalizationVersion: 'c1.0.0',
      ingestedVia: 'macro_pipeline'
    }
  };
}

function fixtureCognition(event: CanonicalEvent): CanonicalCognitionState {
  return {
    cognitionId: 'cog-xau-h1-2026-01-15t1400z',
    asset: 'XAU/USD',
    timeframe: 'H1',
    evaluatedAt: '2026-01-15T14:00:00.000Z',
    evaluationWindowStart: '2026-01-15T00:00:00.000Z',
    evaluationWindowEnd: '2026-01-15T14:00:00.000Z',
    bias: 'bullish',
    biasLabel: 'Constructive but event-sensitive',
    thesis: 'Gold stays constructive while dollar impulse fades.',
    narrativeSummary: 'Macro surprise is partially priced; zone demand still respected.',
    confidence: {
      score: 71.5,
      anatomy: {
        sourceIntegrity: 84,
        eventAlignment: 78,
        priceAcceptance: 80,
        contradictionPenalty: 22,
        stalenessPenalty: 10,
        weightedScore: 71.5,
        componentsVersion: 'c1.0.0'
      }
    },
    contradiction: {
      score: 34,
      regime: 'low',
      anatomy: {
        narrativeConflict: 28,
        priceConflict: 38,
        eventConflict: 32,
        macroConflict: 35,
        timeframeConflict: 30,
        weightedScore: 34,
        regime: 'low',
        componentsVersion: 'c1.0.0'
      },
      summary: 'Conflicts exist but remain contained.'
    },
    freshness: {
      freshnessScore: 84,
      hoursSinceLastMaterialUpdate: 8,
      lastMaterialUpdateAt: '2026-01-15T06:00:00.000Z',
      decayRatePerHour: 2,
      stale: false,
      staleThresholdHours: 72,
      componentsVersion: 'c1.0.0'
    },
    invalidation: {
      primary: null,
      secondary: [],
      summary: 'No primary invalidation active.',
      riskLabel: 'guarded'
    },
    evidence: {
      ranked: [
        {
          evidenceId: 'evd-1',
          eventId: event.id,
          kind: 'macro_calendar',
          label: 'US CPI surprise',
          explanation: 'Inflation shock supports short-term USD strength but fading follow-through.',
          asset: 'XAU/USD',
          timeframe: 'H1',
          directionHint: 'mixed',
          impactScore: 80,
          recencyScore: 95,
          sourceReliabilityScore: 84,
          priceProximityScore: 60,
          confirmationScore: 75,
          contradictionContributionScore: 35,
          confidenceContributionScore: 65,
          finalRankScore: 72,
          linkedZoneIds: ['zone-h1-1'],
          linkedPriceLevels: [2368.4],
          linkedCandleTimes: ['2026-01-15T13:00:00.000Z'],
          linkedNotes: ['Reaction wick rejected supply once.'],
          stale: false,
          occurredAt: event.occurredAt,
          tags: ['inflation']
        }
      ],
      topEvidenceIds: ['evd-1'],
      evidenceCount: 1
    },
    zones: {
      primary: [],
      secondary: [],
      activeZoneIds: []
    },
    explanation: {
      concise: 'Bullish bias with manageable contradiction.',
      expanded: 'Confidence remains above neutral due to source integrity and price acceptance.',
      bulletReasons: ['Demand zone respected', 'CPI catalyst still active'],
      supportingReasons: ['H1 demand intact'],
      contradictoryReasons: ['Macro impulse can reverse'],
      whatWouldChangeState: ['H1 close below invalidation level']
    },
    supportEvents: {
      linkedEventIds: [event.id],
      catalystCount: 1,
      macroEventIds: [event.id],
      newsEventIds: [],
      geopoliticsEventIds: []
    },
    chartProjection: {
      annotationIds: ['ann-1'],
      markerLabels: ['Demand hold'],
      emphasisPriceLevels: [2368.4],
      contradictionMarkerVisible: true
    },
    audit: {
      reasoningVersion: 'c1.0.0',
      scoringVersion: 'c1.0.0',
      evaluatedBy: 'reasoning-engine-vnext',
      dataCutoffAt: '2026-01-15T14:00:00.000Z'
    }
  };
}

export function runReasoningTests(): void {
  const confidenceHigh = computeConfidenceWeightedScore({
    sourceIntegrity: 90,
    eventAlignment: 85,
    priceAcceptance: 88,
    contradictionPenalty: 10,
    stalenessPenalty: 5
  });
  assert(confidenceHigh > 75, 'confidence formula should produce high score for strong positive inputs');

  const contradiction34 = computeContradictionWeightedScore({
    narrativeConflict: 20,
    priceConflict: 40,
    eventConflict: 40,
    macroConflict: 40,
    timeframeConflict: 10
  });
  const contradiction35 = computeContradictionWeightedScore({
    narrativeConflict: 24,
    priceConflict: 42,
    eventConflict: 42,
    macroConflict: 42,
    timeframeConflict: 10
  });
  assert(contradiction34 < 35, 'fixture should stay below 35 threshold');
  assert(contradiction35 >= 35, 'fixture should reach 35 threshold');
  assert(mapContradictionRegime(contradiction34) === 'low', '34-ish contradiction must map to low');
  assert(mapContradictionRegime(35) === 'moderate', '35 contradiction must map to moderate');

  const freshnessM5 = computeFreshnessState({
    timeframe: 'M5',
    hoursSinceLastMaterialUpdate: 2,
    lastMaterialUpdateAt: '2026-01-15T12:00:00.000Z',
    componentsVersion: 'c1.0.0'
  });
  const freshnessH4 = computeFreshnessState({
    timeframe: 'H4',
    hoursSinceLastMaterialUpdate: 2,
    lastMaterialUpdateAt: '2026-01-15T12:00:00.000Z',
    componentsVersion: 'c1.0.0'
  });
  assert(freshnessH4.freshnessScore > freshnessM5.freshnessScore, 'H4 should decay slower than M5');

  const weakZone = computeZoneStrengthScore({
    touchCount: 1,
    reactionMagnitudeScore: 40,
    recencyScore: 40,
    wickBodyRespectScore: 40,
    multiTimeframeConfluenceScore: 35
  });
  const strongZone = computeZoneStrengthScore({
    touchCount: 5,
    reactionMagnitudeScore: 85,
    recencyScore: 65,
    wickBodyRespectScore: 70,
    multiTimeframeConfluenceScore: 60
  });
  assert(strongZone > weakZone, 'zone strength should rise with touch count and reaction magnitude');

  assert(mapInvalidationRiskLabel(80) === 'broken', 'invalidation severity 80 maps to broken');

  const event = fixtureEvent();
  const eventValidation = validateCanonicalEvent(event);
  assert(eventValidation.ok, 'canonical event schema should validate realistic fixture');

  const cognition = fixtureCognition(event);
  const cognitionValidation = validateCanonicalCognitionState(cognition);
  assert(cognitionValidation.ok, 'canonical cognition schema should validate realistic fixture');

  const exportChecks: {
    marketAdapterType: MarketDataAdapter | null;
    providerSuiteType: CanonicalProviderAdapterSuite | null;
    triggerRuleType: NotificationTriggerRule | null;
    notificationDecisionType: NotificationDecision | null;
  } = {
    marketAdapterType: null,
    providerSuiteType: null,
    triggerRuleType: null,
    notificationDecisionType: null
  };
  assert(Object.keys(exportChecks).length === 4, 'index exports should be visible to test imports');
}
