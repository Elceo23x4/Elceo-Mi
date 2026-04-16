import type { NormalizedCandle } from '@elceo/schemas';
import type { AssetCognitionState, EvidenceAssembly } from '@elceo/types';
import { detectH4Zones } from '../zones/detect-h4-zones';
import { buildChartAnnotations } from '../annotations/build-annotations';
import { buildDashboardViewModel } from '../dashboard/build-dashboard-view-model';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

const candles: NormalizedCandle[] = Array.from({ length: 20 }).map((_, i) => ({
  type: 'market_candle',
  provider: 'finnhub',
  assetCode: 'XAU/USD',
  timeframe: 'H4',
  open: 2300 + i,
  high: 2305 + i,
  low: 2296 + i,
  close: 2301 + i,
  timestampUtc: new Date(Date.now() - (20 - i) * 4 * 60 * 60 * 1000).toISOString()
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
}
