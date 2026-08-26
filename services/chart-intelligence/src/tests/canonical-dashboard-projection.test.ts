import assert from 'node:assert/strict';
import { buildCanonicalCandleContentHash, buildCanonicalCandleObservationId } from '@elceo/schemas';
import { LAUNCH_ASSET_SYMBOLS, type CanonicalMarketCandleObservation, type MarketCognitionSnapshot, type TradingAssetCoverage } from '@elceo/types';
import { buildCanonicalDashboardProjection } from '../dashboard/build-canonical-dashboard-projection';
import { CANONICAL_DASHBOARD_DISPLAY_VERSION, CANONICAL_DASHBOARD_POLICY_VERSION, CANONICAL_DASHBOARD_PROJECTION_VERSION, CANONICAL_DASHBOARD_ZONE_RULE_VERSION, type CanonicalDashboardProjectionInput } from '../contracts/chart-contract';

const AT = '2026-01-05T00:00:00.000Z';
const ASSETS: Array<[(typeof LAUNCH_ASSET_SYMBOLS)[number], TradingAssetCoverage]> = [
  ['XAU/USD', 'xau_usd'], ['Nasdaq 100', 'nasdaq_100'], ['S&P 500', 'sp500'], ['DE30', 'de30'], ['BTC/USD', 'btc_usd'], ['EUR/USD', 'eur_usd'],
  ['GBP/USD', 'gbp_usd'], ['USD/JPY', 'usd_jpy'], ['USD/CHF', 'usd_chf'], ['AUD/USD', 'aud_usd'], ['NZD/USD', 'nzd_usd'], ['USD/CAD', 'usd_cad']
];

function cognition(asset: TradingAssetCoverage): MarketCognitionSnapshot {
  const common = { asset, horizon: 'intraday' as const, generatedAt: '2026-01-04T20:00:00.000Z' };
  return {
    ...common, snapshotId: `snapshot-${asset}`, weightedEvidenceSnapshotId: `weighted-${asset}`,
    signals: [{ ...common, signalId: `signal-${asset}`, kind: 'macro_pressure', direction: 'bullish', strength: 65, severity: 'medium', confidence: 73, evidenceItemIds: ['evidence-1'], rationale: 'Canonical pressure evidence.', warnings: [] }],
    confidence: { ...common, evidenceQualityComponent: 70, evidenceWeightComponent: 69, freshnessComponent: 68, conflictPenalty: 12, coverageComponent: 67, finalConfidence: 66, rationale: 'Canonical confidence decomposition.' },
    contradictions: [{ ...common, flagId: `contradiction-${asset}`, severity: 'high', conflictingSignalKinds: ['macro_pressure', 'risk_sentiment_pressure'], evidenceItemIds: ['evidence-1', 'evidence-2'], rationale: 'Canonical signals conflict.' }],
    narrative: { ...common, summaryId: `narrative-${asset}`, title: 'Canonical narrative', summary: 'Canonical cognition narrative.', keyDrivers: ['driver'], cautions: ['conflict'], evidenceItemIds: ['evidence-1'] }, warnings: []
  };
}

function candle(asset: string, hour: number, close = 101 + hour): CanonicalMarketCandleObservation {
  const base = { kind: 'market_candle' as const, provider: 'fixture', asset, timeframe: 'H4' as const, observedAt: `2026-01-0${1 + Math.floor(hour / 6)}T${String((hour % 6) * 4).padStart(2, '0')}:00:00.000Z`, open: 100 + hour, high: 103 + hour, low: 99 + hour, close, volume: 10 };
  return { ...base, observationId: buildCanonicalCandleObservationId(base), contentHash: buildCanonicalCandleContentHash(base) };
}

function input(asset = ASSETS[0]![0], coverage = ASSETS[0]![1], source = Array.from({ length: 12 }, (_, index) => candle(asset, index))): CanonicalDashboardProjectionInput {
  const included = [...source].filter((item) => item.observedAt <= AT).sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  return { asset, timeframe: 'H4', horizon: 'intraday', cognition: cognition(coverage), cognitionArtifact: { identity: `cognition:${coverage}:1`, contentHash: `sha256:${coverage}:1`, contractVersion: 'market-cognition-v1', provenance: ['weighted-evidence-v1'] }, candles: source, orderedCandleObservationIds: included.map((item) => item.observationId), orderedCandleContentHashes: included.map((item) => item.contentHash), evaluatedAt: AT, chartZoneRuleVersion: CANONICAL_DASHBOARD_ZONE_RULE_VERSION, dashboardDisplayContractVersion: CANONICAL_DASHBOARD_DISPLAY_VERSION, projectionVersion: CANONICAL_DASHBOARD_PROJECTION_VERSION, productPolicyVersion: CANONICAL_DASHBOARD_POLICY_VERSION };
}

function rejects(fn: () => unknown, pattern: RegExp) { assert.throws(fn, pattern); }

export function runCanonicalDashboardProjectionTests(): void {
  const canonicalInput = input();
  const first = buildCanonicalDashboardProjection(canonicalInput);
  const repeated = buildCanonicalDashboardProjection(canonicalInput);
  assert.deepEqual(first, repeated, 'same semantic inputs must produce deep-equal output and identity');
  assert.equal(first.workspace.dashboard.contract_version, 'dashboard-display-v2');
  assert.equal(first.workspace.dashboard.contradiction.score, null);
  assert.equal(first.workspace.dashboard.contradiction.score_availability, 'unavailable');
  assert.deepEqual(first.workspace.dashboard.contradiction.evidence_lineage?.[0]?.evidence_ids, ['evidence-1', 'evidence-2']);
  assert.equal(first.workspace.dashboard.modules.find((module) => module.module_id === 'contradiction')?.rank_score, null);
  assert.equal(first.workspace.dashboard.modules.find((module) => module.module_id === 'evidence-surface')?.rank_score, null);
  assert.equal(first.workspace.dashboard.modules.find((module) => module.module_id === 'directional-bias')?.rank_score, null);
  assert(!first.workspace.chart.annotations.some((annotation) => annotation.kind === 'impulse_origin_placeholder'));
  assert(!first.workspace.chart.annotations.some((annotation) => annotation.kind === 'macro_event_marker'), 'signal generation time is not fabricated into an event timestamp');
  assert(!JSON.stringify(first).includes('"score":0') && !JSON.stringify(first).includes('"rank_score":72'));

  const runtimeMetadata = { ...canonicalInput, requestId: 'request-b', userId: 'user-b', workerId: 'worker-b' } as CanonicalDashboardProjectionInput;
  assert.deepEqual(buildCanonicalDashboardProjection(runtimeMetadata), first, 'runtime metadata must not affect projection');
  assert.notEqual(buildCanonicalDashboardProjection({ ...canonicalInput, cognitionArtifact: { ...canonicalInput.cognitionArtifact, identity: 'cognition:changed' } }).projection_identity, first.projection_identity);
  assert.notEqual(buildCanonicalDashboardProjection({ ...canonicalInput, cognitionArtifact: { ...canonicalInput.cognitionArtifact, contentHash: 'sha256:changed' } }).projection_identity, first.projection_identity);

  const changed = candle(canonicalInput.asset, 0, 102);
  const changedCandles = canonicalInput.candles.map((item, index) => index === 0 ? changed : item);
  assert.notEqual(buildCanonicalDashboardProjection(input(canonicalInput.asset as (typeof LAUNCH_ASSET_SYMBOLS)[number], 'xau_usd', changedCandles)).projection_identity, first.projection_identity);
  assert.deepEqual(buildCanonicalDashboardProjection({ ...canonicalInput, candles: [...canonicalInput.candles].reverse() }), first, 'input order must be canonicalized');

  const future = candle(canonicalInput.asset, 30);
  assert.deepEqual(buildCanonicalDashboardProjection({ ...canonicalInput, candles: [...canonicalInput.candles, future] }), first, 'future candles must not leak into projection or identity');
  rejects(() => buildCanonicalDashboardProjection({ ...canonicalInput, candles: [{ ...canonicalInput.candles[0]!, contentHash: 'raw-only-invalid' }, ...canonicalInput.candles.slice(1)] }), /invalid canonical candle/);
  rejects(() => buildCanonicalDashboardProjection({ ...canonicalInput, candles: [canonicalInput.candles[0]!, canonicalInput.candles[0]!, ...canonicalInput.candles.slice(1)] }), /duplicate canonical candle slot/);
  rejects(() => buildCanonicalDashboardProjection({ ...canonicalInput, evaluatedAt: '2026-01-05' }), /canonical UTC ISO timestamp/);

  const sameZones = buildCanonicalDashboardProjection(canonicalInput).workspace.chart.zones;
  assert.deepEqual(sameZones, buildCanonicalDashboardProjection(canonicalInput).workspace.chart.zones);
  const laterInput = { ...canonicalInput, evaluatedAt: '2026-01-06T00:00:00.000Z' };
  assert.deepEqual(buildCanonicalDashboardProjection(laterInput).workspace.chart.zones.map(({ hours_since_last_touch: _hours, significance_score: _score, ...zone }) => zone), sameZones.map(({ hours_since_last_touch: _hours, significance_score: _score, ...zone }) => zone), 'later evaluation may alter only accepted recency-sensitive zone fields');

  for (const [asset, coverage] of ASSETS) {
    const fixture = input(asset, coverage);
    const a = buildCanonicalDashboardProjection(fixture);
    const b = buildCanonicalDashboardProjection(fixture);
    assert.equal(a.workspace.dashboard.asset_code, asset);
    assert.equal(a.projection_identity, b.projection_identity);
    assert.deepEqual(a, b);
  }
  assert.deepEqual(ASSETS.map(([asset]) => asset).sort(), [...LAUNCH_ASSET_SYMBOLS].sort(), 'tests use every canonical launch asset exactly once');
}
