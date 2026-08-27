import { createHash } from 'node:crypto';
import { validateCanonicalMarketCandleObservation, validateMarketCognitionSnapshot, type NormalizedCandle } from '@elceo/schemas';
import { LAUNCH_ASSET_SYMBOLS, type ChartAnnotation, type DashboardCognitionModule, type DashboardContradictionEvidence, type MarketCognitionPressureDirection, type TradingAssetCoverage } from '@elceo/types';
import { detectH4ZonesWithLineageDeterministic } from '../zones/detect-h4-zones';
import {
  CANONICAL_DASHBOARD_DISPLAY_VERSION,
  CANONICAL_DASHBOARD_POLICY_VERSION,
  CANONICAL_DASHBOARD_PROJECTION_VERSION,
  CANONICAL_DASHBOARD_ZONE_RULE_VERSION,
  type CanonicalDashboardProjection,
  type CanonicalDashboardProjectionInput
} from '../contracts/chart-contract';

const COGNITION_TO_CANONICAL_ASSET: Record<TradingAssetCoverage, (typeof LAUNCH_ASSET_SYMBOLS)[number]> = {
  xau_usd: 'XAU/USD', btc_usd: 'BTC/USD', nasdaq_100: 'Nasdaq 100', sp500: 'S&P 500', de30: 'DE30',
  eur_usd: 'EUR/USD', gbp_usd: 'GBP/USD', usd_jpy: 'USD/JPY', usd_chf: 'USD/CHF', aud_usd: 'AUD/USD', nzd_usd: 'NZD/USD', usd_cad: 'USD/CAD'
};

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonicalize(item)]));
  return value;
}

function requireCanonicalTimestamp(value: string, field: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) throw new Error(`${field} must be a canonical UTC ISO timestamp`);
  return parsed;
}

function projectionIdentity(material: unknown): string {
  const hash = createHash('sha256').update(JSON.stringify(canonicalize(material))).digest('hex');
  return `${CANONICAL_DASHBOARD_PROJECTION_VERSION}:sha256:${hash}`;
}

function normalizeCognitionIdentity(input: CanonicalDashboardProjectionInput['cognition']): unknown {
  return {
    ...input,
    signals: [...input.signals].map((signal) => ({ ...signal, evidenceItemIds: [...signal.evidenceItemIds].sort(), warnings: [...signal.warnings].sort() })).sort((a, b) => a.signalId.localeCompare(b.signalId)),
    contradictions: [...input.contradictions].map((flag) => ({ ...flag, conflictingSignalKinds: [...flag.conflictingSignalKinds].sort(), evidenceItemIds: [...flag.evidenceItemIds].sort() })).sort((a, b) => a.flagId.localeCompare(b.flagId)),
    narrative: { ...input.narrative, evidenceItemIds: [...input.narrative.evidenceItemIds].sort() },
    warnings: [...input.warnings].sort()
  };
}

function resolveDirection(directions: MarketCognitionPressureDirection[]): string {
  const qualified = new Set(directions.filter((direction) => direction === 'bullish' || direction === 'bearish'));
  if (directions.includes('mixed') || qualified.size > 1) return 'mixed';
  if (qualified.has('bullish')) return 'bullish';
  if (qualified.has('bearish')) return 'bearish';
  return directions.includes('neutral') ? 'neutral' : 'unknown';
}

export function buildCanonicalDashboardProjection(input: CanonicalDashboardProjectionInput): CanonicalDashboardProjection {
  if (!LAUNCH_ASSET_SYMBOLS.includes(input.asset as (typeof LAUNCH_ASSET_SYMBOLS)[number])) throw new Error('asset must be a canonical launch asset');
  if (input.timeframe !== 'H4') throw new Error('canonical H4 projector requires H4 candles');
  if (input.projectionVersion !== CANONICAL_DASHBOARD_PROJECTION_VERSION || input.dashboardDisplayContractVersion !== CANONICAL_DASHBOARD_DISPLAY_VERSION || input.chartZoneRuleVersion !== CANONICAL_DASHBOARD_ZONE_RULE_VERSION || input.productPolicyVersion !== CANONICAL_DASHBOARD_POLICY_VERSION) throw new Error('canonical projection semantic version mismatch');
  const evaluatedAtMs = requireCanonicalTimestamp(input.evaluatedAt, 'evaluatedAt');
  const cognitionValidation = validateMarketCognitionSnapshot(input.cognition);
  if (cognitionValidation.ok === false) throw new Error(`invalid canonical cognition: ${cognitionValidation.errors.join('; ')}`);
  if (COGNITION_TO_CANONICAL_ASSET[input.cognition.asset] !== input.asset || input.cognition.horizon !== input.horizon) throw new Error('canonical cognition scope mismatch');
  const cognitionChildren = [...input.cognition.signals, ...input.cognition.contradictions, input.cognition.confidence, input.cognition.narrative];
  if (cognitionChildren.some((item) => item.asset !== input.cognition.asset || item.horizon !== input.horizon)) throw new Error('canonical cognition child scope mismatch');
  const futureCognition = [{ kind: 'snapshot', generatedAt: input.cognition.generatedAt }, ...input.cognition.signals.map((item) => ({ kind: 'signal', generatedAt: item.generatedAt })), { kind: 'confidence', generatedAt: input.cognition.confidence.generatedAt }, ...input.cognition.contradictions.map((item) => ({ kind: 'contradiction', generatedAt: item.generatedAt })), { kind: 'narrative', generatedAt: input.cognition.narrative.generatedAt }].find((item) => requireCanonicalTimestamp(item.generatedAt, `${item.kind} generatedAt`) > evaluatedAtMs);
  if (futureCognition) throw new Error(`future canonical cognition is not eligible: ${futureCognition.kind}`);
  if (input.cognitionArtifact.provenance.length === 0 || ![input.cognitionArtifact.identity, input.cognitionArtifact.contentHash, input.cognitionArtifact.contractVersion, ...input.cognitionArtifact.provenance].every((value) => value.trim().length > 0)) throw new Error('cognition artifact identity/provenance is required');

  const seen = new Set<string>();
  const semanticSlots = new Set<string>();
  const candles = input.candles.map((candidate) => {
    const validation = validateCanonicalMarketCandleObservation(candidate);
    if (validation.ok === false) throw new Error(`invalid canonical candle: ${validation.errors.join('; ')}`);
    if (validation.value.asset !== input.asset || validation.value.timeframe !== input.timeframe) throw new Error('canonical candle scope mismatch');
    if (seen.has(validation.value.observationId)) throw new Error(`duplicate canonical candle slot: ${validation.value.observationId}`);
    const semanticSlot = JSON.stringify([validation.value.asset, validation.value.timeframe, validation.value.observedAt]);
    if (semanticSlots.has(semanticSlot)) throw new Error(`ambiguous canonical candle semantic slot: ${semanticSlot}`);
    seen.add(validation.value.observationId);
    semanticSlots.add(semanticSlot);
    return validation.value;
  }).filter((candle) => requireCanonicalTimestamp(candle.observedAt, 'candle observedAt') <= evaluatedAtMs)
    .sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt) || a.observationId.localeCompare(b.observationId));
  const orderedIds = candles.map((candle) => candle.observationId);
  const orderedHashes = candles.map((candle) => candle.contentHash);
  if (JSON.stringify(input.orderedCandleObservationIds) !== JSON.stringify(orderedIds) || JSON.stringify(input.orderedCandleContentHashes) !== JSON.stringify(orderedHashes)) throw new Error('ordered canonical candle identity manifest mismatch');

  const normalized: NormalizedCandle[] = candles.map((candle) => ({
    type: 'market_candle', provider: candle.provider as NormalizedCandle['provider'], assetCode: candle.asset, timeframe: candle.timeframe,
    open: candle.open, high: candle.high, low: candle.low, close: candle.close, ...(candle.volume === null ? {} : { volume: candle.volume }), timestampUtc: candle.observedAt
  }));
  const zonesWithLineage = detectH4ZonesWithLineageDeterministic(input.asset, normalized, input.evaluatedAt);
  const zones = zonesWithLineage.map(({ zone }) => zone);
  const contradictionLineage: DashboardContradictionEvidence[] = [...input.cognition.contradictions].sort((a, b) => a.flagId.localeCompare(b.flagId)).map((flag) => ({ severity: flag.severity, source_id: flag.flagId, evidence_ids: [...flag.evidenceItemIds].sort(), rationale: flag.rationale }));
  const zoneAnnotations: ChartAnnotation[] = zonesWithLineage.map(({ zone, sourceCandleIndexes }) => ({ kind: 'key_level_zone', annotation_id: `ann-zone-${zone.zone_id}`, asset_code: input.asset, zone_id: zone.zone_id, significance_score: zone.significance_score, evidence_ids: sourceCandleIndexes.map((index) => orderedIds[index]!).filter(Boolean) }));
  const contradictionAnnotations: ChartAnnotation[] = contradictionLineage.length ? [{ kind: 'contradiction_marker', annotation_id: `ann-contradiction-${input.cognition.snapshotId}`, asset_code: input.asset, contradiction_score: null, contradiction_score_availability: 'unavailable', contradiction_state: 'evidence-present-no-aggregate', evidence_ids: [...new Set(contradictionLineage.flatMap((item) => item.evidence_ids))].sort(), evidence_lineage: contradictionLineage }] : [];
  const evidenceNotes: ChartAnnotation[] = [...input.cognition.signals].sort((a, b) => a.signalId.localeCompare(b.signalId)).map((signal) => ({ kind: 'evidence_note', annotation_id: `ann-note-${signal.signalId}`, asset_code: input.asset, title: signal.kind.replaceAll('_', ' ').toUpperCase(), body: signal.rationale, timestamp_utc: signal.generatedAt, evidence_ids: [...signal.evidenceItemIds].sort() }));
  const annotations = [...zoneAnnotations, ...contradictionAnnotations, ...evidenceNotes];
  const modules: DashboardCognitionModule[] = [
    { module_id: 'confidence-anatomy', title: 'Confidence Anatomy', body: input.cognition.confidence.rationale, rank_score: input.cognition.confidence.finalConfidence, rank_availability: 'available' },
    { module_id: 'contradiction', title: 'Contradiction / Tension', body: contradictionLineage.length ? `${contradictionLineage.length} canonical contradiction flags; no aggregate score is authoritative.` : 'No canonical contradiction flags are present.', rank_score: null, rank_availability: 'unavailable' },
    { module_id: 'directional-bias', title: 'Directional Bias', body: input.cognition.narrative.summary, rank_score: null, rank_availability: 'unavailable' },
    { module_id: 'evidence-surface', title: 'Evidence Surface', body: `${evidenceNotes.length} canonical cognition signals retain evidence lineage.`, rank_score: null, rank_availability: 'unavailable' }
  ];
  const dashboard = {
    contract_version: CANONICAL_DASHBOARD_DISPLAY_VERSION,
    asset_code: input.asset,
    directional_bias: resolveDirection(input.cognition.signals.map((signal) => signal.direction)),
    confidence_total: input.cognition.confidence.finalConfidence,
    confidence_anatomy: { evidence_quality: input.cognition.confidence.evidenceQualityComponent, evidence_weight: input.cognition.confidence.evidenceWeightComponent, freshness: input.cognition.confidence.freshnessComponent, conflict_penalty: input.cognition.confidence.conflictPenalty, coverage: input.cognition.confidence.coverageComponent },
    contradiction: contradictionLineage.length ? { score: null, score_availability: 'unavailable' as const, state: 'evidence-present-no-aggregate', evidence_lineage: contradictionLineage } : { score: null, score_availability: 'unknown' as const, state: 'none-observed' },
    zones, annotations, evidence_notes: evidenceNotes,
    modules
  };
  const identityMaterial = { asset: input.asset, timeframe: input.timeframe, horizon: input.horizon, cognition: normalizeCognitionIdentity(input.cognition), cognitionArtifact: { ...input.cognitionArtifact, provenance: [...input.cognitionArtifact.provenance].sort() }, candles, orderedCandleObservationIds: orderedIds, orderedCandleContentHashes: orderedHashes, evaluatedAt: input.evaluatedAt, chartZoneRuleVersion: input.chartZoneRuleVersion, dashboardDisplayContractVersion: input.dashboardDisplayContractVersion, projectionVersion: input.projectionVersion, productPolicyVersion: input.productPolicyVersion };
  return { projection_version: CANONICAL_DASHBOARD_PROJECTION_VERSION, projection_identity: projectionIdentity(identityMaterial), evaluated_at: input.evaluatedAt, ordered_candle_observation_ids: orderedIds, ordered_candle_content_hashes: orderedHashes, workspace: { dashboard, chart: { candles: candles.map((candle) => ({ timestamp_utc: candle.observedAt, open: candle.open, high: candle.high, low: candle.low, close: candle.close, ...(candle.volume === null ? {} : { volume: candle.volume }) })), zones, annotations, default_filters: { keyLevelZones: true, macroEvents: true, contradiction: true, evidenceNotes: true, impulseOrigins: false }, annotation_density_target: 'moderate' } } };
}
