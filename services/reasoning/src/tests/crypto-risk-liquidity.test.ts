import { strict as assert } from 'node:assert';
import { validateCryptoRiskLiquidityCoverageReport, validateCryptoRiskLiquidityNormalizedEvidence } from '@elceo/schemas';
import { PROVIDER_SOURCE_IDS } from '@elceo/types';
import { CanonicalMarketIntelligenceBoundaryService } from '../runtime/canonical-market-intelligence-boundary';

export function runCryptoRiskLiquidityTests(): void {
  const svc = new CanonicalMarketIntelligenceBoundaryService({} as never, {} as never);
  const registry = svc.getCryptoRiskLiquiditySourceRegistry();
  assert.ok(registry.length >= 10);
  registry.forEach((s) => assert.ok(PROVIDER_SOURCE_IDS.includes(s.sourceId)));

  const fixtures = svc.listCryptoRiskLiquidityFixturePayloads();
  assert.ok(fixtures.length >= 42);
  fixtures.forEach((f) => { assert.ok(f.fixtureId.length>0); assert.ok(f.title.length>0); assert.ok(f.affectedAssets.length > 0); });
  assert.deepEqual(fixtures.map((x) => x.fixtureId), [...fixtures.map((x) => x.fixtureId)].sort());

  const required = ['btc-spot-volume-expansion','btc-spot-volume-contraction','exchange-reserve-proxy-change','stablecoin-liquidity-expansion','stablecoin-liquidity-contraction','funding-rate-overheating','negative-funding-capitulation','open-interest-expansion','liquidation-pressure-event','basis-premium-compression','active-address-expansion','transaction-value-expansion','fee-congestion-event','exchange-inflow-risk','lth-supply-constraint','vix-compression-regime','vix-spike-equity-stress','options-skew-steepening','vol-term-structure-inversion','macro-event-vol-premium','high-yield-spread-widening','investment-grade-spread-widening','bank-funding-stress','credit-spillover-equities','credit-stress-easing','usd-liquidity-tightening','usd-liquidity-easing','real-yield-pressure','dxy-liquidity-pressure','financial-conditions-tightening','financial-conditions-easing','strong-breadth-risk-on','weak-breadth-rising-index','sector-concentration-risk','defensive-sector-leadership','equity-internals-deterioration','risk-on-confirmation','risk-off-confirmation','safe-haven-demand-regime','liquidity-tightening-regime','contradiction-regime-strong-price-weak-internals','volatility-expansion-regime'];
  required.forEach((id) => assert.ok(fixtures.some((x) => x.fixtureId === id)));

  assert.ok(svc.listCryptoDerivativesFixturePayloads().length > 0);
  assert.ok(svc.listVolatilityFixturePayloads().length > 0);
  assert.ok(svc.listCreditStressFixturePayloads().length > 0);
  assert.ok(svc.listLiquidityFixturePayloads().length > 0);
  assert.ok(svc.listMarketBreadthFixturePayloads().length > 0);
  assert.ok(svc.listRiskRegimeFixturePayloads().length > 0);

  const n = svc.normalizeCryptoRiskLiquidityFixturePayload(fixtures[0]!);
  assert.equal(validateCryptoRiskLiquidityNormalizedEvidence(n).ok, true);
  const assets = new Set(fixtures.flatMap((x) => x.affectedAssets));
  ['xau_usd','eur_usd','gbp_usd','usd_jpy','aud_usd','usd_chf','nzd_usd','usd_cad','btc_usd','nasdaq_100','sp500','de30','dxy','vix'].forEach((a) => assert.ok(assets.has(a as never)));
  const blob = JSON.stringify({ registry, fixtures }).toLowerCase();
  assert.equal(/\b(buy|sell|hold)\b/.test(blob), false); assert.equal(/(guaranteed profit|profit certainty)/.test(blob), false); assert.equal(/(api[_-]?key|secret|token|password)/.test(blob), false);
  assert.equal(validateCryptoRiskLiquidityCoverageReport(svc.getCryptoRiskLiquidityCoverageReport()).ok, true);
}
