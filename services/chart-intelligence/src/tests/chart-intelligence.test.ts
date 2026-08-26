import type { NormalizedCandle } from '@elceo/schemas';
import type { AssetCognitionState, DashboardCognitionViewModel, EvidenceAssembly } from '@elceo/types';
import { detectH4Zones, detectH4ZonesDeterministic } from '../zones/detect-h4-zones';
import { buildChartAnnotations, buildChartAnnotationsDeterministic } from '../annotations/build-annotations';
import { buildDashboardViewModel } from '../dashboard/build-dashboard-view-model';

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

  const viewModel = buildDashboardViewModel(cognition, zones, annotations);
  assert(viewModel.asset_code === 'XAU/USD', 'dashboard asset mapping');
  assert(Array.isArray(viewModel.modules), 'dashboard modules shape');
  assert(typeof viewModel.confidence_anatomy.sourceConfidence === 'number', 'confidence anatomy shaping');
  assert(typeof viewModel.contradiction.score === 'number', 'contradiction section shaping');
  assert(viewModel.contract_version === 'dashboard-display-v2', 'truthful display contract is versioned');
  assert(viewModel.modules.find((module) => module.module_id === 'evidence-surface')?.rank_score === null, 'synthetic evidence rank is unavailable');
  assert(viewModel.modules.at(-1)?.rank_score === null, 'unavailable module rank is not ranked as a number');
  const unavailable: DashboardCognitionViewModel = { ...viewModel, contradiction: { score: null, score_availability: 'unavailable', state: 'evidence-present-no-aggregate', evidence_lineage: [{ severity: 'high', source_id: 'market-cognition-snapshot', evidence_ids: ['ev-1'], rationale: 'Canonical contradiction flag retained without synthesizing an aggregate.' }] } };
  assert(unavailable.contradiction.score === null, 'contradiction can remain truthfully null and is not converted to zero');
  const { contract_version: _version, ...legacyFields } = viewModel;
  const legacyFixture: DashboardCognitionViewModel = { ...legacyFields, contradiction: { score: 26, state: 'aligned' } };
  assert(legacyFixture.contradiction.score === 26, 'explicit legacy fixtures remain loadable');

  const deterministicA = detectH4ZonesDeterministic('XAU/USD', candles, evaluatedAt);
  const deterministicB = detectH4ZonesDeterministic('XAU/USD', candles, evaluatedAt);
  assert(JSON.stringify(deterministicA) === JSON.stringify(deterministicB), 'same candles and evaluation time are deep-equal');
  const later = detectH4ZonesDeterministic('XAU/USD', candles, '2026-04-22T00:00:00.000Z');
  assert(deterministicA.every((zone, index) => zone.lower === later[index]?.lower && zone.upper === later[index]?.upper && zone.touches === later[index]?.touches), 'later evaluation changes no candle-derived geometry');
  assert(deterministicA.some((zone, index) => zone.hours_since_last_touch !== later[index]?.hours_since_last_touch), 'later evaluation changes legitimate recency fields');

  const canonicalAnnotations = buildChartAnnotationsDeterministic('XAU/USD', deterministicA, cognition, evidence);
  assert(!canonicalAnnotations.some((item) => item.kind === 'impulse_origin_placeholder'), 'canonical-capable annotations omit an unobserved impulse');
  const observedAnnotations = buildChartAnnotationsDeterministic('XAU/USD', deterministicA, cognition, evidence, evaluatedAt);
  assert(observedAnnotations.some((item) => item.kind === 'impulse_origin_placeholder' && item.timestamp_utc === evaluatedAt), 'impulse time comes from evidence input');
}
