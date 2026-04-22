import type { AssetCognitionState, CanonicalCognitionState } from './cognition';
import type { CanonicalEvent, SourceCategory, EvidenceKind } from './events';

/**
 * @deprecated Legacy compatibility input. New code should emit CanonicalEvent directly.
 */
export type LegacyInternalNormalizedEvent = {
  eventId: string;
  eventType: string;
  sourceProvider: string;
  occurredAtUtc: string;
  dedupeKey: string;
  payload: unknown;
};

export type LegacyCognitionBridgeOptions = {
  evaluatedAt: string;
  reasoningVersion: string;
  scoringVersion: string;
  evaluatedBy: string;
  dataCutoffAt: string;
  normalizationVersion: string;
};

function localMapContradictionRegime(score: number): 'none' | 'low' | 'moderate' | 'high' | 'critical' {
  if (score < 15) return 'none';
  if (score < 35) return 'low';
  if (score < 60) return 'moderate';
  if (score < 80) return 'high';
  return 'critical';
}

function localMapInvalidationRiskLabel(primarySeverity: number | null): 'guarded' | 'warning' | 'fragile' | 'broken' {
  if (primarySeverity === null || primarySeverity < 25) return 'guarded';
  if (primarySeverity < 50) return 'warning';
  if (primarySeverity < 75) return 'fragile';
  return 'broken';
}

function requireIso(value: string, fieldName: string): void {
  if (Number.isNaN(Date.parse(value))) throw new Error(`${fieldName} must be a valid ISO date string`);
}

/**
 * Deterministic bridge from legacy cognition to canonical cognition.
 * Lossy mapping notes:
 * - Legacy structure does not carry rich evidence/zone details, so canonical nested sections are populated with explicit empty arrays and conservative defaults.
 * - Invalidation data is absent in legacy model and is represented as guarded/no-primary state.
 */
export function mapLegacyAssetCognitionStateToCanonical(
  legacy: AssetCognitionState,
  options: LegacyCognitionBridgeOptions
): CanonicalCognitionState {
  requireIso(options.evaluatedAt, 'evaluatedAt');
  requireIso(options.dataCutoffAt, 'dataCutoffAt');

  const contradictionRegime = localMapContradictionRegime(legacy.contradiction_score);
  const confidenceScore = Math.max(0, Math.min(100, legacy.confidence_total));

  return {
    cognitionId: `${legacy.asset_code}:${legacy.time_horizon}:${options.evaluatedAt}`,
    asset: legacy.asset_code,
    timeframe: legacy.time_horizon === 'intraday' ? 'H1' : 'H4',
    evaluatedAt: options.evaluatedAt,
    evaluationWindowStart: null,
    evaluationWindowEnd: null,
    bias: legacy.directional_bias,
    biasLabel: `${legacy.directional_bias.toUpperCase()} legacy bridge`,
    thesis: legacy.short_explanation ?? 'Migrated from legacy cognition state.',
    narrativeSummary: legacy.deep_explanation ?? legacy.short_explanation ?? 'Legacy cognition narrative not provided.',
    confidence: {
      score: confidenceScore,
      anatomy: {
        sourceIntegrity: legacy.confidence_anatomy.sourceConfidence,
        eventAlignment: legacy.confidence_anatomy.eventStrength,
        priceAcceptance: legacy.confidence_anatomy.priceConfirmation,
        contradictionPenalty: legacy.confidence_anatomy.contradictionPenalty,
        stalenessPenalty: 0,
        weightedScore: confidenceScore,
        componentsVersion: options.scoringVersion
      }
    },
    contradiction: {
      score: Math.max(0, Math.min(100, legacy.contradiction_score)),
      regime: contradictionRegime,
      anatomy: {
        narrativeConflict: Math.max(0, Math.min(100, legacy.contradiction_score)),
        priceConflict: Math.max(0, Math.min(100, legacy.contradiction_score)),
        eventConflict: 0,
        macroConflict: 0,
        timeframeConflict: 0,
        weightedScore: Math.max(0, Math.min(100, legacy.contradiction_score)),
        regime: contradictionRegime,
        componentsVersion: options.scoringVersion
      },
      summary: `Legacy contradiction state: ${legacy.contradiction_state}`
    },
    freshness: {
      freshnessScore: 100,
      hoursSinceLastMaterialUpdate: 0,
      lastMaterialUpdateAt: options.evaluatedAt,
      decayRatePerHour: 0,
      stale: false,
      staleThresholdHours: 168,
      componentsVersion: options.scoringVersion
    },
    invalidation: {
      primary: null,
      secondary: [],
      summary: 'Legacy cognition does not include structured invalidation.',
      riskLabel: localMapInvalidationRiskLabel(null)
    },
    evidence: {
      ranked: [],
      topEvidenceIds: legacy.supporting_event_ids,
      evidenceCount: legacy.supporting_event_ids.length
    },
    zones: {
      primary: [],
      secondary: [],
      activeZoneIds: []
    },
    explanation: {
      concise: legacy.short_explanation ?? 'Legacy bridge output.',
      expanded: legacy.deep_explanation ?? legacy.short_explanation ?? 'Legacy explanation unavailable.',
      bulletReasons: [],
      supportingReasons: [],
      contradictoryReasons: [],
      whatWouldChangeState: []
    },
    supportEvents: {
      linkedEventIds: [...legacy.supporting_event_ids, ...legacy.invalidating_event_ids],
      catalystCount: legacy.supporting_event_ids.length,
      macroEventIds: legacy.supporting_event_ids,
      newsEventIds: [],
      geopoliticsEventIds: []
    },
    chartProjection: {
      annotationIds: [],
      markerLabels: [],
      emphasisPriceLevels: [],
      contradictionMarkerVisible: legacy.contradiction_score >= 35
    },
    audit: {
      reasoningVersion: options.reasoningVersion,
      scoringVersion: options.scoringVersion,
      evaluatedBy: options.evaluatedBy,
      dataCutoffAt: options.dataCutoffAt
    }
  };
}

export type LegacyEventBridgeOptions = {
  sourceCategory: SourceCategory;
  eventKind: EvidenceKind;
  title: string;
  summary: string;
  normalizedNarrative: string;
  detectedAt: string;
  relatedAssets: string[];
  relatedTimeframes: Array<'M5' | 'M15' | 'H1' | 'H4' | 'D1'>;
  relevanceScore: number;
  sourceReliabilityScore: number;
  recencyScore: number;
  impact?: CanonicalEvent['impact'];
  status?: CanonicalEvent['status'];
};

/**
 * Deterministic bridge from legacy internal normalized event to CanonicalEvent.
 * The caller must provide canonical semantic fields that never existed in the legacy envelope.
 */
export function mapInternalNormalizedEventToCanonicalEvent(
  legacy: LegacyInternalNormalizedEvent,
  options: LegacyEventBridgeOptions
): CanonicalEvent {
  requireIso(legacy.occurredAtUtc, 'legacy.occurredAtUtc');
  requireIso(options.detectedAt, 'options.detectedAt');

  return {
    id: legacy.eventId,
    sourceId: legacy.eventId,
    sourceName: legacy.sourceProvider,
    sourceCategory: options.sourceCategory,
    eventKind: options.eventKind,
    status: options.status ?? 'published',
    impact: options.impact ?? 'medium',
    title: options.title,
    summary: options.summary,
    normalizedNarrative: options.normalizedNarrative,
    occurredAt: legacy.occurredAtUtc,
    detectedAt: options.detectedAt,
    effectiveUntil: null,
    region: null,
    country: null,
    currency: null,
    relatedAssets: options.relatedAssets,
    relatedTimeframes: options.relatedTimeframes,
    relevanceScore: options.relevanceScore,
    sourceReliabilityScore: options.sourceReliabilityScore,
    recencyScore: options.recencyScore,
    confirmationCount: 1,
    tags: [legacy.eventType],
    rawPayload: legacy.payload,
    rawUrl: null,
    revisionOfEventId: null,
    dedupeKey: legacy.dedupeKey,
    stale: false,
    freshnessHours: 0,
    attribution: {
      provider: legacy.sourceProvider,
      publisher: null,
      author: null
    },
    audit: {
      normalizedBy: 'legacy-bridge',
      normalizationVersion: 'c1r.0.0',
      ingestedVia: 'legacy-internal-event'
    }
  };
}
