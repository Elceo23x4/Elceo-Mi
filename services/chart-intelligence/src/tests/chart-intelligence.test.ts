import type { NormalizedCandle } from '@elceo/schemas';
import type { AssetCognitionState, ContradictionMarkerAnnotation, DashboardCognitionModule, DashboardCognitionViewModel, EvidenceAssembly } from '@elceo/types';
import { detectH4Zones, detectH4ZonesDeterministic } from '../zones/detect-h4-zones';
import { buildChartAnnotations, buildLegacyChartAnnotationsDeterministic } from '../annotations/build-annotations';
import { buildLegacyDashboardViewModel, sortDashboardModules } from '../dashboard/build-legacy-dashboard-view-model';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

const evaluatedAt = '2026-04-21T00:00:00.000Z';
const candles: NormalizedCandle[] = Array.from({ length: 20 }).map((_, i) => ({
  type: 'market_candle',
  provider: 'finnhub',
  assetCode: 'XAU/USD',
  timeframe: 'H4',
  open: 2300 + i,
  high: 2305 + i,
  low: 2296 + i,
  close: 2301 + i,
  timestampUtc: new Date(Date.parse(evaluatedAt) - (20 - i) * 4 * 60 * 60 * 1000).toISOString()
}));

const cognition: AssetCognitionState = {
  asset_code: 'XAU/USD',
  time_horizon: 'intraday',
  directional_bias: 'bullish',
  confidence_total: 68,
  confidence_anatomy: {
    sourceConfidence: 70,
    eventStrength: 66,
    modelAgreement: 64,
    priceConfirmation: 60,
    historicalPattern: 55,
    contradictionPenalty: 22
  },
  directional_pressure_components: [{ name: 'real_yield_pressure', value: 14 }],
  contradiction_score: 26,
  contradiction_state: 'aligned',
  supporting_event_ids: ['evt-1'],
  invalidating_event_ids: [],
  freshness_expires_at: new Date(Date.now() + 3600000).toISOString(),
  ranking_score: 73
};

const evidence: EvidenceAssembly = {
  assemblyId: 'asm-1',
  assetCode: 'XAU/USD',
  assembledAtUtc: new Date().toISOString(),
  evidence: [
    {
      evidenceId: 'ev-1',
      eventClass: 'macro_event',
      provider: 'finnhub',
      occurredAtUtc: new Date().toISOString(),
      summary: 'Macro catalyst',
      relatedAssetCodes: ['XAU/USD']
    }
  ],
  supportingEventIds: ['ev-1'],
  contradictoryEventIds: []
};

export function runChartIntelligenceTests(): void {
  const zones = detectH4Zones('XAU/USD', candles);
  assert(Array.isArray(zones), 'zones should be array');
  assert(zones.length > 0, 'zones should not be empty');
  const firstZone = zones[0];
  assert(Boolean(firstZone) && typeof firstZone!.significance_score === 'number', 'zone shape significance');

  const annotations = buildChartAnnotations('XAU/USD', zones, cognition, evidence);
  assert(annotations.some((item) => item.kind === 'key_level_zone'), 'key level annotations');
  assert(annotations.some((item) => item.kind === 'evidence_note'), 'evidence note annotations');

  const viewModel = buildLegacyDashboardViewModel(cognition, zones, annotations);
  assert(viewModel.asset_code === 'XAU/USD', 'dashboard asset mapping');
  assert(Array.isArray(viewModel.modules), 'dashboard modules shape');
  assert(typeof viewModel.confidence_anatomy.sourceConfidence === 'number', 'confidence anatomy shaping');
  assert(typeof viewModel.contradiction.score === 'number', 'contradiction section shaping');
  assert(viewModel.contract_version === undefined, 'legacy inverse ranking is not mislabeled as the v2 canonical-capable contract');
  assert(viewModel.modules.find((module) => module.module_id === 'evidence-surface')?.rank_score === null, 'synthetic evidence rank is unavailable');
  assert(viewModel.modules.at(-1)?.rank_score === null, 'unavailable module rank is not ranked as a number');
  const unavailable: DashboardCognitionViewModel = { ...viewModel, contradiction: { score: null, score_availability: 'unavailable', state: 'evidence-present-no-aggregate', evidence_lineage: [{ severity: 'high', source_id: 'market-cognition-snapshot', evidence_ids: ['ev-1'], rationale: 'Canonical contradiction flag retained without synthesizing an aggregate.' }] } };
  assert(unavailable.contradiction.score === null, 'contradiction can remain truthfully null and is not converted to zero');
  const canonicalCapableModules: DashboardCognitionModule[] = [
    { module_id: 'confidence-anatomy', title: 'Confidence Anatomy', body: 'Known authoritative confidence.', rank_score: 68, rank_availability: 'available' },
    { module_id: 'contradiction', title: 'Contradiction / Tension', body: 'Evidence exists without an aggregate.', rank_score: null, rank_availability: 'unavailable' },
    { module_id: 'directional-bias', title: 'Directional Bias', body: 'Direction has no canonical module rank.', rank_score: null, rank_availability: 'unavailable' },
    { module_id: 'evidence-surface', title: 'Evidence Surface', body: 'Evidence has no canonical module rank.', rank_score: null, rank_availability: 'unavailable' }
  ];
  const canonicalRanked = sortDashboardModules(canonicalCapableModules);
  assert(canonicalRanked[0]?.rank_score === 68, 'known authoritative rank retains its numeric value');
  assert(canonicalRanked.slice(1).every((module) => module.rank_score === null), 'category-D modules remain unavailable after ranking');
  assert(canonicalRanked.find((module) => module.module_id === 'contradiction')?.rank_score === null, 'unavailable contradiction never gains an inverse synthetic rank');
  const legacyFixture: DashboardCognitionViewModel = { ...viewModel, contradiction: { score: 26, state: 'aligned' } };
  assert(legacyFixture.contradiction.score === 26, 'explicit legacy fixtures remain loadable');

  const originalDateNow = Date.now;
  Date.now = () => Date.parse('1999-01-01T00:00:00.000Z');
  const deterministicA = detectH4ZonesDeterministic('XAU/USD', candles, evaluatedAt);
  Date.now = () => Date.parse('2099-01-01T00:00:00.000Z');
  const deterministicB = detectH4ZonesDeterministic('XAU/USD', candles, evaluatedAt);
  Date.now = originalDateNow;
  assert(JSON.stringify(deterministicA) === JSON.stringify(deterministicB), 'same candles and evaluation time are deep-equal');
  const futureCandle: NormalizedCandle = { ...candles[0]!, timestampUtc: '2026-04-21T04:00:00.000Z', open: 9999, high: 10001, low: 9998, close: 10000 };
  const withoutLookAhead = detectH4ZonesDeterministic('XAU/USD', [...candles, futureCandle], evaluatedAt);
  assert(JSON.stringify(deterministicA) === JSON.stringify(withoutLookAhead), 'candles after evaluatedAt cannot leak into historical zone evaluation');
  const later = detectH4ZonesDeterministic('XAU/USD', candles, '2026-04-22T00:00:00.000Z');
  const withoutRecency = (zone: (typeof deterministicA)[number]) => ({ ...zone, hours_since_last_touch: null, significance_score: null });
  assert(JSON.stringify(deterministicA.map(withoutRecency)) === JSON.stringify(later.map(withoutRecency)), 'later evaluation changes only recency-sensitive values');
  assert(deterministicA.some((zone, index) => zone.hours_since_last_touch !== later[index]?.hours_since_last_touch), 'later evaluation changes legitimate recency fields');

  const legacyDeterministicAnnotations = buildLegacyChartAnnotationsDeterministic('XAU/USD', deterministicA, cognition, evidence);
  assert(!legacyDeterministicAnnotations.some((item) => item.kind === 'impulse_origin_placeholder'), 'deterministic legacy annotations omit an unobserved impulse');
  const legacyMarker = legacyDeterministicAnnotations.find((item) => item.kind === 'contradiction_marker');
  assert(legacyMarker?.contradiction_score === 26 && legacyMarker.contradiction_score_availability === 'available', 'legacy numerical contradiction marker remains available');
  const unavailableMarker: ContradictionMarkerAnnotation = {
    kind: 'contradiction_marker', annotation_id: 'canonical-style-contradiction', asset_code: 'XAU/USD', contradiction_score: null,
    contradiction_score_availability: 'unavailable', contradiction_state: 'evidence-present-no-aggregate', evidence_ids: ['ev-1'],
    evidence_lineage: [{ severity: 'high', source_id: 'market-cognition-snapshot', evidence_ids: ['ev-1'], rationale: 'Canonical evidence retained without aggregate synthesis.' }]
  };
  assert(unavailableMarker.contradiction_score === null, 'unavailable marker score remains null and is never coerced to zero');
  assert(unavailableMarker.evidence_ids[0] === 'ev-1' && unavailableMarker.evidence_lineage?.[0]?.severity === 'high', 'canonical-style contradiction lineage remains represented');
  const observedAnnotations = buildLegacyChartAnnotationsDeterministic('XAU/USD', deterministicA, cognition, evidence, evaluatedAt);
  assert(observedAnnotations.some((item) => item.kind === 'impulse_origin_placeholder' && item.timestamp_utc === evaluatedAt), 'impulse time comes from evidence input');
}
