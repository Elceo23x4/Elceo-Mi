import type {
  CanonicalCognitionState,
  CanonicalEvent,
  InvalidationState,
  NotificationDecision,
  NotificationTriggerRule,
  RankedEvidenceItem,
  ReasoningInputFrame,
  ZoneSignificance
} from '@elceo/types';

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

function merge<T>(base: T, overrides?: DeepPartial<T>): T {
  if (!overrides) return base;
  const output = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(overrides)) {
    const current = output[key];
    if (Array.isArray(value)) {
      output[key] = value as unknown;
    } else if (value && typeof value === 'object' && current && typeof current === 'object' && !Array.isArray(current)) {
      output[key] = merge(current as Record<string, unknown>, value as DeepPartial<Record<string, unknown>>);
    } else {
      output[key] = value as unknown;
    }
  }
  return output as T;
}

export function buildCanonicalEventFixture(overrides?: DeepPartial<CanonicalEvent>): CanonicalEvent {
  return merge(
    {
      id: 'evt-cpi-2026-01-15',
      sourceId: 'src-evt-1',
      sourceName: 'MacroWire',
      sourceCategory: 'macro_calendar',
      eventKind: 'macro_calendar',
      status: 'published',
      impact: 'high',
      title: 'US CPI beat expectations',
      summary: 'US CPI came in above forecast.',
      normalizedNarrative: 'Inflation surprise keeps policy uncertainty elevated.',
      occurredAt: '2026-01-15T13:30:00.000Z',
      detectedAt: '2026-01-15T13:31:00.000Z',
      effectiveUntil: null,
      region: 'US',
      country: 'US',
      currency: 'USD',
      relatedAssets: ['XAU/USD', 'EUR/USD'],
      relatedTimeframes: ['M15', 'H1', 'H4'],
      relevanceScore: 89,
      sourceReliabilityScore: 85,
      recencyScore: 95,
      confirmationCount: 2,
      tags: ['inflation', 'cpi'],
      rawPayload: { upstream: 'macro-wire' },
      rawUrl: 'https://example.com/events/cpi',
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
        normalizedBy: 'macro-normalizer',
        normalizationVersion: 'c1r.0.0',
        ingestedVia: 'macro_pipeline'
      }
    },
    overrides
  );
}

export function buildRankedEvidenceItemFixture(overrides?: DeepPartial<RankedEvidenceItem>): RankedEvidenceItem {
  return merge(
    {
      evidenceId: 'evidence-1',
      eventId: 'evt-cpi-2026-01-15',
      kind: 'macro_calendar',
      label: 'US CPI surprise',
      explanation: 'Macro catalyst with high relevance to USD-sensitive pairs.',
      asset: 'XAU/USD',
      timeframe: 'H1',
      directionHint: 'mixed',
      impactScore: 82,
      recencyScore: 94,
      sourceReliabilityScore: 85,
      priceProximityScore: 61,
      confirmationScore: 76,
      contradictionContributionScore: 33,
      confidenceContributionScore: 68,
      finalRankScore: 73,
      linkedZoneIds: ['zone-h1-1'],
      linkedPriceLevels: [2367.2],
      linkedCandleTimes: ['2026-01-15T13:00:00.000Z'],
      linkedNotes: ['Rejection wick from supply'],
      stale: false,
      occurredAt: '2026-01-15T13:30:00.000Z',
      tags: ['macro', 'inflation']
    },
    overrides
  );
}

export function buildZoneSignificanceFixture(overrides?: DeepPartial<ZoneSignificance>): ZoneSignificance {
  return merge(
    {
      zoneId: 'zone-h1-1',
      asset: 'XAU/USD',
      timeframe: 'H1',
      side: 'demand',
      lowerBound: 2358.2,
      upperBound: 2362.5,
      midpoint: 2360.35,
      touchCount: 3,
      reactionMagnitudeScore: 78,
      recencyScore: 70,
      wickBodyRespectScore: 66,
      multiTimeframeConfluenceScore: 62,
      finalStrengthScore: 70,
      lastInteractionAt: '2026-01-15T12:00:00.000Z',
      derivedFromCandleCount: 55,
      notes: ['Demand held during CPI volatility'],
      componentsVersion: 'c1r.0.0'
    },
    overrides
  );
}

export function buildInvalidationStateFixture(overrides?: DeepPartial<InvalidationState>): InvalidationState {
  return merge(
    {
      primary: {
        invalidationId: 'inv-1',
        asset: 'XAU/USD',
        timeframe: 'H1',
        price: 2354.8,
        side: 'bullish_invalidation',
        severityScore: 48,
        reason: 'Demand zone breakdown on close.',
        linkedEvidenceIds: ['evidence-1'],
        linkedZoneIds: ['zone-h1-1'],
        triggeredBy: ['h1_close_break'],
        confirmed: false,
        confirmedAt: null
      },
      secondary: [],
      summary: 'Primary invalidation not yet confirmed.',
      riskLabel: 'warning'
    },
    overrides
  );
}

export function buildCanonicalCognitionStateFixture(overrides?: DeepPartial<CanonicalCognitionState>): CanonicalCognitionState {
  const event = buildCanonicalEventFixture();
  const evidence = buildRankedEvidenceItemFixture();
  const zone = buildZoneSignificanceFixture();

  return merge(
    {
      cognitionId: 'cog-xau-h1-2026-01-15',
      asset: 'XAU/USD',
      timeframe: 'H1',
      evaluatedAt: '2026-01-15T14:00:00.000Z',
      evaluationWindowStart: '2026-01-15T00:00:00.000Z',
      evaluationWindowEnd: '2026-01-15T14:00:00.000Z',
      bias: 'bullish',
      biasLabel: 'Constructive with caution',
      thesis: 'Demand support remains respected in spite of macro volatility.',
      narrativeSummary: 'Confidence remains positive while contradiction stays low.',
      confidence: {
        score: 72.9,
        anatomy: {
          sourceIntegrity: 85,
          eventAlignment: 78,
          priceAcceptance: 82,
          contradictionPenalty: 20,
          stalenessPenalty: 8,
          weightedScore: 72.9,
          componentsVersion: 'c1r.0.0'
        }
      },
      contradiction: {
        score: 34,
        regime: 'low',
        anatomy: {
          narrativeConflict: 28,
          priceConflict: 38,
          eventConflict: 30,
          macroConflict: 35,
          timeframeConflict: 26,
          weightedScore: 34,
          regime: 'low',
          componentsVersion: 'c1r.0.0'
        },
        summary: 'Conflicts remain below moderate threshold.'
      },
      freshness: {
        freshnessScore: 84,
        hoursSinceLastMaterialUpdate: 8,
        lastMaterialUpdateAt: '2026-01-15T06:00:00.000Z',
        decayRatePerHour: 2,
        stale: false,
        staleThresholdHours: 72,
        componentsVersion: 'c1r.0.0'
      },
      invalidation: buildInvalidationStateFixture(),
      evidence: {
        ranked: [evidence],
        topEvidenceIds: [evidence.evidenceId],
        evidenceCount: 1
      },
      zones: {
        primary: [zone],
        secondary: [],
        activeZoneIds: [zone.zoneId]
      },
      explanation: {
        concise: 'Bullish bias with low contradiction.',
        expanded: 'Source quality and price acceptance remain robust on H1.',
        bulletReasons: ['Demand zone held', 'Macro event absorbed'],
        supportingReasons: ['Higher low formed after catalyst'],
        contradictoryReasons: ['USD strength could reaccelerate'],
        whatWouldChangeState: ['H1 close below 2354.8']
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
        markerLabels: ['Demand held'],
        emphasisPriceLevels: [2360.35, 2354.8],
        contradictionMarkerVisible: true
      },
      audit: {
        reasoningVersion: 'c1r.0.0',
        scoringVersion: 'c1r.0.0',
        evaluatedBy: 'reasoning-engine',
        dataCutoffAt: '2026-01-15T14:00:00.000Z'
      }
    },
    overrides
  );
}

export function buildReasoningInputFrameFixture(overrides?: DeepPartial<ReasoningInputFrame>): ReasoningInputFrame {
  const event = buildCanonicalEventFixture();
  return merge(
    {
      asset: 'XAU/USD',
      timeframe: 'H1',
      asOf: '2026-01-15T14:05:00.000Z',
      events: [event],
      evidenceCandidates: [buildRankedEvidenceItemFixture({ eventId: event.id })],
      zones: [buildZoneSignificanceFixture()],
      latestPrice: 2361.4,
      recentPriceRange: {
        high: 2368.2,
        low: 2357.9,
        close: 2361.4
      },
      priorCognition: null,
      userJournalInfluence: {
        enabled: true,
        influenceFlag: 'weak',
        linkedEntryIds: ['journal-1'],
        summary: null
      },
      config: {
        scoringVersion: 'c1r.0.0',
        reasoningVersion: 'c1r.0.0'
      }
    },
    overrides
  );
}

export function buildNotificationRuleFixture(overrides?: DeepPartial<NotificationTriggerRule>): NotificationTriggerRule {
  return merge(
    {
      triggerKind: 'contradiction_spike',
      asset: 'XAU/USD',
      timeframe: 'H1',
      enabled: true,
      threshold: 60,
      cooldownMinutes: 30,
      suppressionWindowMinutes: 10,
      entitlementRequired: 'premium',
      channels: ['in_app', 'email'],
      version: 'c1r.0.0'
    },
    overrides
  );
}

export function buildNotificationDecisionFixture(overrides?: DeepPartial<NotificationDecision>): NotificationDecision {
  return merge(
    {
      shouldFire: true,
      reason: 'Contradiction regime changed to high.',
      triggerKind: 'contradiction_spike',
      channels: ['in_app', 'email'],
      cooldownApplied: false,
      suppressionApplied: false,
      evidenceIds: ['evidence-1'],
      createdAt: '2026-01-15T14:05:00.000Z'
    },
    overrides
  );
}
