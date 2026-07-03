import { validateMarketAssetCausalityCoverageReport, validateMarketAssetCausalityDescriptor, validateMarketAssetCausalityMatrixSnapshot } from '@elceo/schemas';
import { MARKET_ASSET_CAUSALITY_ASSETS, type MarketAssetCausalityAsset, type MarketAssetCausalityDescriptor } from '@elceo/types';
import { assertMarketAssetCausalityDescriptorCoverageComplete, buildMarketAssetCausalityMatrixSnapshot, getMarketAssetCausalityCoverageReport, getMarketAssetCausalityDescriptor, listContradictionTriggersForAsset, listDirectionResolutionRequirements, listMarketAssetCausalityGaps, listProviderDependenciesForAsset, listRegimeModifiersForAsset } from '../asset-causality-map/index.js';
import { CanonicalMarketIntelligenceBoundaryService } from '../runtime/canonical-market-intelligence-boundary.js';
import { MemoryMarketEvidenceRegistrySnapshotRepository, MemorySeoContentArchitectureSnapshotRepository } from '../persistence/registry-snapshot-repository.js';

function assert(condition: boolean, message: string): void { if (!condition) throw new Error(`Assertion failed: ${message}`); }
function text(d: MarketAssetCausalityDescriptor): string { return JSON.stringify(d).toLowerCase(); }
function hasKinds(d: MarketAssetCausalityDescriptor, kinds: string[]): boolean { const found = new Set([...d.primaryDrivers, ...d.secondaryDrivers, ...d.contextualDrivers].map((x) => x.kind)); return kinds.every((k) => found.has(k as typeof d.primaryDrivers[number]['kind'])); }
function assertContains(d: MarketAssetCausalityDescriptor, words: string[], label: string): void { const body = text(d); for (const word of words) assert(body.includes(word.toLowerCase()), `${d.asset} missing ${label}:${word}`); }

export function runAssetCausalityMapTests(): void {
  const snapshot = buildMarketAssetCausalityMatrixSnapshot('2026-06-03T00:00:00.000Z');
  assert(snapshot.descriptors.length === MARKET_ASSET_CAUSALITY_ASSETS.length, 'all 14 launch assets represented');
  assert(JSON.stringify(snapshot.descriptors.map((x) => x.asset)) === JSON.stringify(MARKET_ASSET_CAUSALITY_ASSETS), 'deterministic ordering');
  assert(new Set(snapshot.descriptors.map((x) => x.asset)).size === MARKET_ASSET_CAUSALITY_ASSETS.length, 'assets represented exactly once');
  for (const descriptor of snapshot.descriptors) {
    const validation = validateMarketAssetCausalityDescriptor(descriptor);
    assert(validation.ok, `${descriptor.asset} descriptor validates ${validation.ok ? '' : validation.errors.join(';')}`);
    assert(descriptor.primaryDrivers.length > 0, `${descriptor.asset} has primary drivers`);
    assert(descriptor.providerDependencies.length > 0, `${descriptor.asset} has provider dependencies`);
    assert(descriptor.contradictionTriggers.length > 0, `${descriptor.asset} has contradiction triggers`);
    assert(descriptor.directionResolutionRequirements.length > 0, `${descriptor.asset} has direction requirements`);
    assert(!/\b(buy|sell|hold|guaranteed profit|risk-free)\b/i.test(descriptor.rationale), `${descriptor.asset} avoids advice language in rationale`);
  }
  const matrixValidation = validateMarketAssetCausalityMatrixSnapshot(snapshot);
  assert(matrixValidation.ok, `matrix validates ${matrixValidation.ok ? '' : matrixValidation.errors.join(';')}`);
  const report = getMarketAssetCausalityCoverageReport('2026-06-03T00:00:00.000Z');
  const reportValidation = validateMarketAssetCausalityCoverageReport(report);
  assert(reportValidation.ok, `coverage report validates ${reportValidation.ok ? '' : reportValidation.errors.join(';')}`);
  assert(listMarketAssetCausalityGaps().every((g) => g.readinessCategory === 'live_provider_integration' || g.readinessCategory === 'empirical_validation' || g.readinessCategory === 'production_calibration'), 'known gaps use readiness categories');

  const fxAssets: MarketAssetCausalityAsset[] = ['eur_usd','gbp_usd','usd_jpy','usd_chf','aud_usd','nzd_usd','usd_cad'];
  for (const asset of fxAssets) {
    const requirements = listDirectionResolutionRequirements(asset);
    assert(requirements.some((r) => r.requiresBasePressure) && requirements.some((r) => r.requiresQuotePressure), `${asset} includes base and quote pressure`);
  }
  assert(!text(getMarketAssetCausalityDescriptor('eur_usd')).includes('usd-only'), 'EUR/USD is not USD-only');
  assert(!text(getMarketAssetCausalityDescriptor('gbp_usd')).includes('usd-only'), 'GBP/USD is not USD-only');
  assertContains(getMarketAssetCausalityDescriptor('usd_jpy'), ['boj','japan','fed','u.s.'], 'Japan and U.S. side');
  assertContains(getMarketAssetCausalityDescriptor('usd_chf'), ['snb','swiss','fed','u.s.','safe-haven'], 'Swiss and haven side');
  assertContains(getMarketAssetCausalityDescriptor('aud_usd'), ['china','global demand','risk'], 'AUD demand and risk');
  assertContains(getMarketAssetCausalityDescriptor('nzd_usd'), ['china','global demand','risk'], 'NZD demand and risk');
  assertContains(getMarketAssetCausalityDescriptor('usd_cad'), ['oil','energy','boc','canada'], 'CAD energy and BoC');
  assert(hasKinds(getMarketAssetCausalityDescriptor('xau_usd'), ['real_yields','dollar_liquidity','safe_haven_demand','etf_flows']), 'XAU includes required drivers');
  assert(hasKinds(getMarketAssetCausalityDescriptor('btc_usd'), ['liquidity_conditions','crypto_derivatives','crypto_onchain','crypto_etf_flows','regulatory_risk','risk_sentiment']), 'BTC includes required drivers');
  for (const asset of ['nasdaq_100','sp500'] as const) assert(hasKinds(getMarketAssetCausalityDescriptor(asset), ['real_yields','earnings_macro','equity_breadth','volatility_surface','liquidity_conditions']), `${asset} includes equity driver set`);
  assertContains(getMarketAssetCausalityDescriptor('de30'), ['ecb','german','energy','credit'], 'DE30 eurozone context');
  assert(hasKinds(getMarketAssetCausalityDescriptor('dxy'), ['central_bank_policy','growth_surprise','yield_differentials','dollar_liquidity','risk_sentiment']), 'DXY includes required drivers');
  assert(hasKinds(getMarketAssetCausalityDescriptor('vix'), ['volatility_surface','risk_sentiment','credit_stress','equity_breadth']), 'VIX includes required drivers');
  assertMarketAssetCausalityDescriptorCoverageComplete();

  const boundary = new CanonicalMarketIntelligenceBoundaryService(new MemoryMarketEvidenceRegistrySnapshotRepository(), new MemorySeoContentArchitectureSnapshotRepository());
  assert(boundary.getMarketAssetCausalityMatrixSnapshot('2026-06-03T00:00:00.000Z').descriptors.length === 14, 'boundary exposes matrix');
  assert(boundary.getMarketAssetCausalityDescriptor('xau_usd').asset === 'xau_usd', 'boundary exposes descriptor');
  assert(boundary.listMarketAssetCausalityGaps().length > 0, 'boundary exposes gaps');
  assert(boundary.getMarketAssetCausalityCoverageReport().readiness.moduleId === 'asset_causality', 'boundary exposes report');
  assert(boundary.listDirectionResolutionRequirements('eur_usd').length > 0, 'boundary exposes direction requirements');
  assert(boundary.listProviderDependenciesForAsset('btc_usd').length === listProviderDependenciesForAsset('btc_usd').length, 'boundary exposes dependencies');
  assert(boundary.listContradictionTriggersForAsset('vix').length === listContradictionTriggersForAsset('vix').length, 'boundary exposes triggers');
  assert(boundary.listRegimeModifiersForAsset('dxy').length === listRegimeModifiersForAsset('dxy').length, 'boundary exposes regimes');
}
