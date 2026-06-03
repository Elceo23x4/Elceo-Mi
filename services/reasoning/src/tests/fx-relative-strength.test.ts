import { validateMarketFxRelativeStrengthCoverageReport, validateMarketFxRelativeStrengthResult, validateMarketFxRelativeStrengthRuleSetSnapshot } from '@elceo/schemas';
import type { MarketFxPairAsset, ReasoningEvidenceInputItem, TradingAssetCoverage, WeightedEvidenceItem, WeightedEvidenceSnapshot } from '@elceo/types';
import { MARKET_FX_PAIR_ASSETS } from '@elceo/types';
import { buildWeightedEvidenceItem } from '../evidence-weighting/index.js';
import { assertFxRelativeStrengthRuleSetValid, getFxRelativeStrengthCoverageReport, getFxRelativeStrengthRuleSetSnapshot, resolveFxPairOrientation, resolveFxRelativeStrength, resolveFxRelativeStrengthFromEvidenceItems, resolveFxRelativeStrengthFromWeightedSnapshot } from '../fx-relative-strength/index.js';
import { resolveAssetContextualEvidenceDirection } from '../asset-direction-resolution/index.js';
import { CanonicalMarketIntelligenceBoundaryService } from '../runtime/canonical-market-intelligence-boundary.js';
import { MemoryMarketEvidenceRegistrySnapshotRepository, MemorySeoContentArchitectureSnapshotRepository } from '../persistence/registry-snapshot-repository.js';

function assert(condition: boolean, message: string): void { if (!condition) throw new Error(`Assertion failed: ${message}`); }
function metadata(value: Record<string, unknown>): string { return JSON.stringify(value); }
function evidence(payloadId: string, value: Record<string, unknown>, evidenceClass: ReasoningEvidenceInputItem['evidenceClass'] = 'central_bank_policy'): ReasoningEvidenceInputItem {
  return { payloadId, evidenceTypeId: evidenceClass, evidenceClass, providerId: 'fixture', asset: null, region: 'global', observedAt: '2026-06-03T00:00:00.000Z', normalizedAt: '2026-06-03T00:00:00.000Z', qualityScore: { payloadId: `${payloadId}-q`, evidenceTypeId: evidenceClass, evidenceClass, providerId: 'fixture', asset: null, region: 'global', observedAt: '2026-06-03T00:00:00.000Z', evaluatedAt: '2026-06-03T00:00:00.000Z', provenanceKind: 'fixture', sourceQualityScore: 90, freshnessScore: 90, completenessScore: 90, conflictScore: 90, finalQualityScore: 90, freshnessStatus: 'fresh', conflictStatus: 'none', usabilityStatus: 'usable', reasons: [] }, usabilityStatus: 'usable', freshnessStatus: 'fresh', conflictStatus: 'none', dataQuality: 'high', valuesJson: '{}', metadataJson: metadata(value), reasons: ['fixture'] };
}
function one(pairAsset: MarketFxPairAsset, value: Record<string, unknown>, evidenceClass: ReasoningEvidenceInputItem['evidenceClass'] = 'central_bank_policy') { return resolveFxRelativeStrengthFromEvidenceItems(pairAsset, [evidence(`e-${pairAsset}-${JSON.stringify(value).length}`, value, evidenceClass)]); }
function resolver(asset: MarketFxPairAsset, value: Record<string, unknown>, evidenceClass = 'central_bank_policy') { return resolveAssetContextualEvidenceDirection({ asset, evidenceClass, metadataJson: metadata(value), policyIssuerRegion: typeof value.policyIssuerRegion === 'string' ? value.policyIssuerRegion : null }); }
function weightedSnapshot(asset: TradingAssetCoverage, items: WeightedEvidenceItem[]): WeightedEvidenceSnapshot {
  return { snapshotId: `weighted-test|${asset}`, generatedAt: '2026-06-03T00:00:00.000Z', asset, horizon: 'intraday', totalWeight: 100, usableWeight: 100, excludedWeight: 0, items, warnings: [] };
}
function diagnosticWeightedSnapshot(asset: string, items: WeightedEvidenceItem[]): WeightedEvidenceSnapshot {
  return { snapshotId: `weighted-test|${asset}`, generatedAt: '2026-06-03T00:00:00.000Z', asset, horizon: 'intraday', totalWeight: 100, usableWeight: 100, excludedWeight: 0, items, warnings: [] } as unknown as WeightedEvidenceSnapshot;
}
function assertUnsupportedWeightedSnapshot(asset: TradingAssetCoverage, item: WeightedEvidenceItem): void {
  try {
    resolveFxRelativeStrengthFromWeightedSnapshot(weightedSnapshot(asset, [item]));
    throw new Error(`unsupported asset ${asset} did not throw`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert(message.includes(`fx_relative_strength_unsupported_weighted_snapshot_asset:${asset}`), `${asset} unsupported weighted snapshot error carries original asset`);
    assert(!message.includes('eur_usd'), `${asset} unsupported weighted snapshot error does not claim EUR/USD`);
  }
}

export function runFxRelativeStrengthTests(): void {
  assert(assertFxRelativeStrengthRuleSetValid(), 'FX relative rule set valid assertion passes');
  for (const pair of MARKET_FX_PAIR_ASSETS) {
    const orientation = resolveFxPairOrientation(pair);
    assert(orientation.baseCurrency !== orientation.quoteCurrency, `${pair} base and quote differ`);
    const empty = resolveFxRelativeStrength({ pairAsset: pair, metadataJson: null });
    assert(validateMarketFxRelativeStrengthResult(empty).ok, `${pair} empty result validates`);
    assert(empty.warnings.includes('missing_base_pressure') && empty.warnings.includes('missing_quote_pressure') && empty.confidence < 50, `${pair} missing sides are explicit and low confidence`);
  }
  assert(validateMarketFxRelativeStrengthCoverageReport(getFxRelativeStrengthCoverageReport('2026-06-03T00:00:00.000Z')).ok, 'coverage report validates');
  assert(validateMarketFxRelativeStrengthRuleSetSnapshot(getFxRelativeStrengthRuleSetSnapshot('2026-06-03T00:00:00.000Z')).ok, 'rule set validates');
  const boundary = new CanonicalMarketIntelligenceBoundaryService(new MemoryMarketEvidenceRegistrySnapshotRepository(), new MemorySeoContentArchitectureSnapshotRepository());
  assert(boundary.assertFxRelativeStrengthRuleSetValid(), 'canonical boundary exposes FX assertion');
  assert(boundary.resolveFxRelativeStrength({ pairAsset: 'eur_usd', metadataJson: metadata({ direction: 'hawkish', issuer: 'ECB' }) }).pairAsset === 'eur_usd', 'canonical boundary resolves FX relative strength');

  assert(one('eur_usd', { direction: 'hawkish', issuer: 'Fed', region: 'united_states' }).pairDirection === 'quote_strengthening', 'EUR/USD Fed hawkish strengthens quote USD');
  assert(one('eur_usd', { direction: 'hawkish', issuer: 'ECB', region: 'eurozone' }).pairDirection === 'base_strengthening', 'EUR/USD ECB hawkish strengthens base EUR');
  const eurBoth = resolveFxRelativeStrengthFromEvidenceItems('eur_usd', [evidence('fed', { direction: 'hawkish', issuer: 'Fed' }), evidence('ecb', { direction: 'hawkish', issuer: 'ECB' })]);
  assert((eurBoth.pairDirection === 'neutral' || eurBoth.pairDirection === 'mixed') && eurBoth.confidence < 70, 'EUR/USD both hawkish without magnitude is not high-confidence one-sided');
  assert(one('eur_usd', { direction: 'dovish', issuer: 'Fed' }).pairDirection === 'base_strengthening', 'EUR/USD Fed dovish supports base-vs-quote pressure');
  assert(one('eur_usd', { direction: 'dovish', issuer: 'ECB' }).pairDirection === 'quote_strengthening', 'EUR/USD ECB dovish weakens base and supports quote side');

  assert(one('gbp_usd', { direction: 'hawkish', issuer: 'BoE', region: 'united_kingdom' }).pairDirection === 'base_strengthening', 'GBP/USD BoE hawkish supports GBP base');
  assert(one('gbp_usd', { direction: 'negative', driverKind: 'fiscal_risk', issuer: 'UK treasury' }, 'market_news').pairDirection === 'quote_strengthening', 'GBP/USD UK fiscal stress weakens base GBP');
  const gbpBoth = resolveFxRelativeStrengthFromEvidenceItems('gbp_usd', [evidence('fed-gbp', { direction: 'hawkish', issuer: 'Fed' }), evidence('boe-gbp', { direction: 'hawkish', issuer: 'BoE' })]);
  assert((gbpBoth.pairDirection === 'neutral' || gbpBoth.pairDirection === 'mixed') && gbpBoth.confidence < 70, 'GBP/USD Fed and BoE hawkish lacks relative magnitude');

  assert(resolveFxRelativeStrengthFromEvidenceItems('usd_jpy', [evidence('fed-jpy', { direction: 'hawkish', issuer: 'Fed' }), evidence('boj-dovish', { direction: 'dovish', issuer: 'BoJ' })]).pairDirection === 'base_strengthening', 'USD/JPY Fed hawkish plus BoJ dovish supports base USD');
  assert(resolveFxRelativeStrengthFromEvidenceItems('usd_jpy', [evidence('fed-dovish', { direction: 'dovish', issuer: 'Fed' }), evidence('boj-hawkish', { direction: 'hawkish', issuer: 'BoJ' })]).pairDirection === 'quote_strengthening', 'USD/JPY Fed dovish plus BoJ hawkish supports quote JPY');
  const jpyRisk = one('usd_jpy', { direction: 'risk_off', riskRegime: 'risk_off', driverKind: 'risk_sentiment' }, 'risk_sentiment');
  assert((jpyRisk.pairDirection === 'quote_strengthening' || jpyRisk.pairDirection === 'mixed') && jpyRisk.warnings.includes('haven_conflict'), 'USD/JPY risk-off JPY haven is caveated');

  const chfRisk = one('usd_chf', { direction: 'risk_off', riskRegime: 'risk_off', driverKind: 'risk_sentiment', funding_stress: true }, 'risk_sentiment');
  assert((chfRisk.pairDirection === 'mixed' || chfRisk.confidence < 55) && chfRisk.warnings.includes('haven_conflict'), 'USD/CHF CHF haven and USD funding conflict is lower-confidence');
  assert(one('aud_usd', { direction: 'positive', driverKind: 'china_demand', region: 'china' }, 'growth_activity').pairDirection === 'base_strengthening', 'AUD/USD China demand positive strengthens base AUD');
  assert(one('aud_usd', { direction: 'risk_off', riskRegime: 'risk_off', driverKind: 'risk_sentiment' }, 'risk_sentiment').pairDirection === 'quote_strengthening', 'AUD/USD risk-off weakens AUD base');
  assert(one('nzd_usd', { direction: 'positive', driverKind: 'china_demand', region: 'china' }, 'growth_activity').pairDirection === 'base_strengthening', 'NZD/USD China demand positive strengthens base NZD');
  assert(one('usd_cad', { direction: 'positive', driverKind: 'oil_energy' }, 'energy_commodities').pairDirection === 'quote_strengthening', 'USD/CAD oil positive strengthens CAD quote');
  const cadConflict = resolveFxRelativeStrengthFromEvidenceItems('usd_cad', [evidence('fed-cad', { direction: 'hawkish', issuer: 'Fed' }), evidence('oil-cad', { direction: 'positive', driverKind: 'oil_energy' }, 'energy_commodities')]);
  assert((cadConflict.pairDirection === 'neutral' || cadConflict.pairDirection === 'mixed') && cadConflict.confidence < 70, 'USD/CAD oil and Fed conflict is not high-confidence one-sided');

  const ecbResolver = resolver('eur_usd', { direction: 'hawkish', issuer: 'ECB', region: 'eurozone', driverKind: 'central_bank_policy' });
  assert(ecbResolver.pressureTarget === 'base_currency' && ecbResolver.resolvedDirection === 'bullish', 'resolver maps ECB hawkish EUR/USD to EUR base pressure');
  assert(resolver('gbp_usd', { direction: 'hawkish', issuer: 'BoE', driverKind: 'central_bank_policy' }).pressureTarget === 'base_currency', 'resolver maps BoE hawkish GBP/USD to base side');
  assert(resolver('usd_jpy', { direction: 'hawkish', issuer: 'BoJ', driverKind: 'central_bank_policy' }).pressureTarget === 'quote_currency', 'resolver maps BoJ hawkish USD/JPY to quote side');
  assert(resolver('usd_cad', { direction: 'hawkish', issuer: 'BoC', driverKind: 'central_bank_policy' }).pressureTarget === 'quote_currency', 'resolver maps BoC hawkish USD/CAD to quote side');
  const missingIssuer = resolver('eur_usd', { direction: 'hawkish', driverKind: 'central_bank_policy' });
  assert(missingIssuer.warnings.includes('ambiguous_policy_issuer') && missingIssuer.confidence < 50, 'missing issuer remains ambiguous');
  assert(resolver('eur_usd', { direction: 'hawkish', policyIssuerRegion: 'united_states', driverKind: 'central_bank_policy' }).resolvedDirection === 'bearish', 'explicit Fed issuer behavior preserved');

  const weightedEcb = buildWeightedEvidenceItem(evidence('weighted-ecb', { direction: 'hawkish', issuer: 'ECB', driverKind: 'central_bank_policy' }), 'eur_usd', 'intraday');
  assert(weightedEcb.direction === 'bullish' && weightedEcb.contributionScore > 0, 'weighted EUR/USD ECB hawkish is not treated as USD quote pressure');
  const weightedOil = buildWeightedEvidenceItem(evidence('weighted-oil', { direction: 'positive', driverKind: 'oil_energy' }, 'energy_commodities'), 'usd_cad', 'intraday');
  assert(weightedOil.direction === 'bearish' && weightedOil.contributionScore < 0, 'weighted USD/CAD oil positive is quote-strengthening pressure');
  const weightedMissing = buildWeightedEvidenceItem(evidence('weighted-missing', { direction: 'hawkish', driverKind: 'central_bank_policy' }), 'eur_usd', 'intraday');
  assert(weightedMissing.contributionScore === 0 && weightedMissing.reasons.some((x) => x.includes('direction_warning:ambiguous_policy_issuer')), 'weighted missing issuer does not create high-confidence contribution');
  assert(weightedEcb.reasons.some((x) => x.includes('direction_reason:fx_base_quote_orientation')) && weightedEcb.reasons.some((x) => x.includes('direction_warning:pending_fx_relative_strength')), 'weighted FX reasons carry relative-strength markers');

  const weightedEurSnapshot = weightedSnapshot('eur_usd', [weightedEcb]);
  const weightedEurResult = resolveFxRelativeStrengthFromWeightedSnapshot(weightedEurSnapshot);
  assert(weightedEurResult.pairAsset === 'eur_usd' && validateMarketFxRelativeStrengthResult(weightedEurResult).ok, 'supported EUR/USD weighted snapshot resolves and validates');
  assert(weightedEurResult.warnings.includes('weighted_snapshot_metadata_limited') && weightedEurResult.rationale.includes('evidence-item inputs remain preferred'), 'supported FX weighted snapshot carries diagnostic metadata limitation');
  assert(weightedEurResult.confidence <= 55, 'weighted-snapshot-only FX result is not high confidence');

  const weightedCadSnapshot = weightedSnapshot('usd_cad', [weightedOil]);
  const weightedCadResult = resolveFxRelativeStrengthFromWeightedSnapshot(weightedCadSnapshot);
  assert(weightedCadResult.pairAsset === 'usd_cad' && validateMarketFxRelativeStrengthResult(weightedCadResult).ok, 'supported USD/CAD weighted snapshot resolves and validates');
  assert(weightedCadResult.warnings.includes('weighted_snapshot_metadata_limited'), 'USD/CAD weighted snapshot carries diagnostic metadata limitation');

  const weightedDxyItem = buildWeightedEvidenceItem(evidence('weighted-dxy-fed', { direction: 'hawkish', issuer: 'Fed', driverKind: 'central_bank_policy' }), 'dxy', 'intraday');
  const weightedDxy = resolveFxRelativeStrengthFromWeightedSnapshot(diagnosticWeightedSnapshot('dxy', [weightedDxyItem]));
  assert(weightedDxy.providerCoverageStatus === 'diagnostic_limited' && weightedDxy.warnings.includes('limited_dxy_diagnostic'), 'DXY weighted snapshot remains limited diagnostic');
  assert(weightedDxy.warnings.includes('weighted_snapshot_metadata_limited'), 'DXY weighted snapshot carries metadata limitation warning');

  assertUnsupportedWeightedSnapshot('xau_usd', buildWeightedEvidenceItem(evidence('weighted-xau', { direction: 'positive', driverKind: 'real_yield_pressure' }), 'xau_usd', 'intraday'));
  assertUnsupportedWeightedSnapshot('sp500', buildWeightedEvidenceItem(evidence('weighted-sp500', { direction: 'positive', driverKind: 'risk_sentiment' }), 'sp500', 'intraday'));
  assertUnsupportedWeightedSnapshot('btc_usd', buildWeightedEvidenceItem(evidence('weighted-btc', { direction: 'positive', driverKind: 'liquidity' }), 'btc_usd', 'intraday'));
  try {
    boundary.resolveFxRelativeStrengthFromWeightedSnapshot(weightedSnapshot('sp500', [buildWeightedEvidenceItem(evidence('boundary-sp500', { direction: 'positive', driverKind: 'risk_sentiment' }), 'sp500', 'intraday')]));
    throw new Error('canonical boundary unsupported weighted snapshot did not throw');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert(message.includes('fx_relative_strength_unsupported_weighted_snapshot_asset:sp500'), 'canonical boundary preserves unsupported weighted snapshot error');
    assert(!message.includes('eur_usd'), 'canonical boundary unsupported error does not claim EUR/USD');
  }

  const dxy = resolveFxRelativeStrength({ pairAsset: 'dxy', metadataJson: metadata({ direction: 'hawkish', issuer: 'Fed' }) });
  assert(dxy.warnings.includes('limited_dxy_diagnostic') && dxy.providerCoverageStatus === 'diagnostic_limited', 'DXY is limited diagnostic only');
  assert(!/\b(buy|sell|hold|guaranteed profit|risk-free)\b/i.test(JSON.stringify(dxy)), 'FX output does not include direct advice language');
}
