import { validateMarketContradictionCoverageReport, validateMarketContradictionEvidencePoint, validateMarketContradictionMatrixResult, validateMarketContradictionRuleSetSnapshot, validateMarketContradictionSignal } from '@elceo/schemas';
import type { EvidenceWeightHorizon, MarketContradictionAsset, MarketContradictionDriverKind, MarketContradictionEvidencePoint } from '@elceo/types';
import { buildMarketCognitionSnapshot } from '../market-cognition/index.js';
import { assertMarketContradictionRuleSetValid, evaluateMarketContradictionMatrix, evaluateContradictionsFromWeightedSnapshot, getMarketContradictionCoverageReport, getMarketContradictionRuleSetSnapshot } from '../contradiction-matrix/index.js';
import { CanonicalMarketIntelligenceBoundaryService } from '../runtime/canonical-market-intelligence-boundary.js';
import { MemoryMarketEvidenceRegistrySnapshotRepository, MemorySeoContentArchitectureSnapshotRepository } from '../persistence/registry-snapshot-repository.js';

function assert(condition: boolean, message: string): void { if (!condition) throw new Error(`Assertion failed: ${message}`); }
const at = '2026-06-04T00:00:00.000Z';
function ep(asset: MarketContradictionAsset, id: string, driverKind: MarketContradictionDriverKind, direction: MarketContradictionEvidencePoint['direction'], warnings: MarketContradictionEvidencePoint['warnings'] = []): MarketContradictionEvidencePoint {
  return { evidencePointId: id, asset, horizon: 'intraday', observedAt: at, evidenceClass: 'diagnostic', driverKind, side: 'supporting', direction, strength: 80, quality: 85, providerId: 'fixture_provider', sourceId: 'fixture_source', rationale: `${driverKind} deterministic diagnostic context`, reasonCodes: ['contradiction_matrix_rule_applied'], warnings };
}
function result(asset: MarketContradictionAsset, evidencePoints: MarketContradictionEvidencePoint[], options?: { priceReactionAvailable?: boolean; sourceIndependenceVerified?: boolean }) {
  return evaluateMarketContradictionMatrix({ asset, horizon: 'intraday', generatedAt: at, evidencePoints, priceReactionAvailable: options?.priceReactionAvailable ?? false, providerReliabilitySupplied: false, sourceIndependenceVerified: options?.sourceIndependenceVerified ?? true, warnings: ['pending_confidence_calibration','pending_price_confirmation','pending_provider_reliability'] });
}
function hasFamily(output: ReturnType<typeof result>, family: string): boolean { return output.signals.some((s) => s.family === family); }
function hasWarning(output: ReturnType<typeof result>, warning: string): boolean { return JSON.stringify(output.warnings).includes(warning) || output.signals.some((s) => s.warnings.includes(warning as never)); }

export function runContradictionMatrixTests(): void {
  const validPoint = ep('sp500','valid','risk_sentiment','bullish');
  assert(validateMarketContradictionEvidencePoint(validPoint).ok, 'valid evidence point passes schema');
  const sample = result('sp500', [validPoint, ep('sp500','macro','macro_surprise','bullish')]);
  assert(validateMarketContradictionMatrixResult(sample).ok, 'valid result passes schema');
  assert(sample.signals.every((s) => validateMarketContradictionSignal(s).ok), 'valid signals pass schema');
  const ruleSet = getMarketContradictionRuleSetSnapshot(at);
  assert(validateMarketContradictionRuleSetSnapshot(ruleSet).ok, 'rule set validates');
  assertMarketContradictionRuleSetValid();
  const coverage = getMarketContradictionCoverageReport(at);
  assert(validateMarketContradictionCoverageReport(coverage).ok, 'coverage report validates');
  assert(coverage.complete === false && coverage.pending.confidenceCalibrationR6 && coverage.pending.priceReactionR7 && coverage.pending.providerReliabilityExpansion, 'coverage keeps R6/R7/provider reliability pending');
  assert(!/\b(buy|sell|hold|guaranteed profit|risk-free)\b/i.test(JSON.stringify(sample)), 'matrix output avoids direct advice language');

  const boundary = new CanonicalMarketIntelligenceBoundaryService(new MemoryMarketEvidenceRegistrySnapshotRepository(), new MemorySeoContentArchitectureSnapshotRepository());
  assert(boundary.getMarketContradictionRuleSetSnapshot(at).rules.length === ruleSet.rules.length, 'canonical boundary exposes rule set');
  assert(boundary.getMarketContradictionCoverageReport(at).pending.priceReactionR7, 'canonical boundary exposes coverage');
  assert(boundary.listMarketContradictionWarnings('eur_usd').includes('fx_relative_strength_context_required'), 'canonical boundary exposes warning list');
  assert(boundary.listMarketContradictionRules('btc_usd').some((r) => r.family === 'crypto_vs_derivatives'), 'canonical boundary exposes rules by asset');
  assert(boundary.assertMarketContradictionRuleSetValid().rules.length > 0, 'canonical boundary validates rules');
  assert(boundary.evaluateMarketContradictionMatrix({ asset: 'sp500', horizon: 'intraday', generatedAt: at, evidencePoints: [validPoint], priceReactionAvailable: false, providerReliabilitySupplied: false, sourceIndependenceVerified: true, warnings: [] }).asset === 'sp500', 'canonical boundary evaluates direct input');

  assert(hasFamily(result('nasdaq_100', [ep('nasdaq_100','policy','central_bank_policy','bullish'), ep('nasdaq_100','risk','risk_sentiment','bullish')]), 'policy_vs_risk'), 'hawkish policy with Nasdaq strength creates policy/risk tension');
  const gold = result('xau_usd', [ep('xau_usd','haven','geopolitical_risk','bullish'), ep('xau_usd','rates','real_yields','bullish'), ep('xau_usd','usd','dollar_liquidity','bullish')]);
  assert(hasFamily(gold, 'rates_vs_gold') && ['contradiction','tension'].includes(gold.status), 'gold strength with rates/USD strength creates rates/gold tension');
  assert(hasFamily(result('eur_usd', [ep('eur_usd','eur','central_bank_policy','bullish'), ep('eur_usd','usd','dollar_liquidity','bullish')]), 'fx_base_quote_conflict'), 'EUR/USD strong base and quote creates FX side conflict');
  assert(hasFamily(result('sp500', [ep('sp500','risk','risk_sentiment','bullish'), ep('sp500','vix','volatility_surface','bullish')]), 'risk_vs_volatility'), 'risk-on equities with rising VIX creates vol tension');
  assert(hasFamily(result('sp500', [ep('sp500','risk','risk_sentiment','bullish'), ep('sp500','credit','credit_stress','bullish')]), 'risk_vs_credit'), 'equity strength with credit stress creates credit tension');
  assert(hasFamily(result('nasdaq_100', [ep('nasdaq_100','risk','risk_sentiment','bullish'), ep('nasdaq_100','breadth','equity_breadth','bearish')]), 'equities_vs_breadth'), 'index strength with deteriorating breadth creates breadth tension');
  assert(hasFamily(result('btc_usd', [ep('btc_usd','btc','risk_sentiment','bullish'), ep('btc_usd','funding','crypto_derivatives','bearish')]), 'crypto_vs_derivatives'), 'BTC strength with overheated derivatives creates crypto tension');
  assert(hasFamily(result('btc_usd', [ep('btc_usd','btc','risk_sentiment','bullish'), ep('btc_usd','liq','liquidity_conditions','bearish')]), 'crypto_vs_derivatives'), 'BTC strength with liquidity deterioration creates crypto/liquidity tension');
  assert(hasFamily(result('usd_cad', [ep('usd_cad','oil','oil_energy','bullish')]), 'commodity_cross_asset'), 'oil positive flags USD/CAD CAD quote support context');
  assert(hasFamily(result('de30', [ep('de30','oil','oil_energy','bullish')]), 'commodity_cross_asset'), 'oil positive flags DE30 margin tension');
  assert(hasFamily(result('usd_jpy', [ep('usd_jpy','haven','safe_haven_demand','bullish')]), 'safe_haven_conflict'), 'USD/JPY risk-off flags haven conflict');
  assert(hasFamily(result('xau_usd', [ep('xau_usd','haven','safe_haven_demand','bullish'), ep('xau_usd','funding','dollar_liquidity','bullish')]), 'safe_haven_conflict'), 'gold haven strength with USD funding stress flags haven conflict');
  const macro = result('sp500', [ep('sp500','macro','macro_surprise','bullish')], { priceReactionAvailable: false });
  assert(hasFamily(macro, 'macro_vs_price_reaction') && macro.status === 'pending_confirmation' && hasWarning(macro, 'pending_price_confirmation'), 'macro surprise without price reaction is pending confirmation');
  const staleFresh = result('sp500', [ep('sp500','old','risk_sentiment','bearish',['stale_evidence_conflict']), ep('sp500','fresh','risk_sentiment','bullish')]);
  assert(hasFamily(staleFresh, 'provider_staleness_conflict') && hasWarning(staleFresh, 'stale_evidence_conflict'), 'fresh evidence contradicting stale evidence flags staleness conflict');
  const duplicate = result('sp500', [ep('sp500','dup1','source_independence','bullish',['duplicate_source_risk']), ep('sp500','dup2','source_independence','bullish',['duplicate_source_risk'])], { sourceIndependenceVerified: false });
  assert(hasFamily(duplicate, 'source_disagreement') && hasWarning(duplicate, 'source_independence_unverified'), 'duplicate news burst lacks source independence');

  const weighted = { snapshotId:'w-c6-r5', generatedAt: at, asset:'sp500' as const, horizon:'intraday' as EvidenceWeightHorizon, totalWeight:100, usableWeight:90, excludedWeight:0, warnings:[], items:[{ payloadId:'risk', asset:'sp500' as const, horizon:'intraday' as const, evidenceTypeId:'risk_sentiment', evidenceClass:'risk_sentiment' as const, providerId:'fixture', observedAt:at, finalQualityScore:90, baseWeight:50, qualityAdjustedWeight:45, role:'primary_driver' as const, direction:'bullish' as const, contributionScore:45, reasons:['risk_on'] }, { payloadId:'credit', asset:'sp500' as const, horizon:'intraday' as const, evidenceTypeId:'credit_stress', evidenceClass:'credit_stress' as const, providerId:'fixture', observedAt:at, finalQualityScore:90, baseWeight:50, qualityAdjustedWeight:45, role:'primary_driver' as const, direction:'bullish' as const, contributionScore:45, reasons:['credit stress rising'] }] };
  const weightedResult = evaluateContradictionsFromWeightedSnapshot(weighted, { sourceIndependenceVerified: true });
  assert(hasFamily(weightedResult, 'risk_vs_credit'), 'weighted snapshot evaluation detects expanded matrix signal');
  assert(boundary.evaluateContradictionsFromWeightedSnapshot(weighted, { sourceIndependenceVerified: true }).signals.length > 0, 'canonical boundary evaluates weighted snapshot');
  const cognition = buildMarketCognitionSnapshot(weighted);
  assert(cognition.contradictions.some((c) => c.flagId.startsWith('expanded|')), 'market cognition contradiction bridge includes expanded matrix flags');
}
