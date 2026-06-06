import assert from 'node:assert/strict';
import { validateMarketGoldenScenarioAcceptanceReport, validateMarketGoldenScenarioAcceptanceResult, validateMarketGoldenScenarioCandleFixture, validateMarketGoldenScenarioCoverageReport, validateMarketGoldenScenarioEvidenceFixture, validateMarketGoldenScenarioFixture, validateMarketGoldenScenarioRule, validateMarketGoldenScenarioRuleSetSnapshot } from '@elceo/schemas';
import { MARKET_GOLDEN_SCENARIO_ASSETS } from '@elceo/types';
import { CanonicalMarketIntelligenceBoundaryService } from '../runtime/canonical-market-intelligence-boundary.js';
import { MemoryMarketEvidenceRegistrySnapshotRepository, MemorySeoContentArchitectureSnapshotRepository } from '../persistence/registry-snapshot-repository.js';
import { assertMarketGoldenScenarioRuleSetValid, getMarketGoldenScenarioCoverageReport, getMarketGoldenScenarioRuleSetSnapshot, listMarketGoldenScenarios, runMarketGoldenScenario, runMarketGoldenScenarioById, runMarketGoldenScenarioSuite } from '../golden-scenarios/index.js';

const forbiddenAdvice = /\b(buy|sell|hold|guaranteed profit|risk-free)\b/i;
function result(id: string) { return runMarketGoldenScenarioById(id); }
function fixture(id: string) { const found = listMarketGoldenScenarios().find((x) => x.scenarioId === id); assert(found, `missing fixture ${id}`); return found; }
function hasReason(id: string, needle: string): boolean { return result(id).reasonCodes.some((x) => x.includes(needle)); }

export function runMarketGoldenScenarioAcceptanceTests(): void {
  const scenarios = listMarketGoldenScenarios();
  const suite = runMarketGoldenScenarioSuite({ asOfIso:'2026-06-06T00:00:00.000Z' });
  const coverage = getMarketGoldenScenarioCoverageReport('2026-06-06T00:00:00.000Z');
  const rules = getMarketGoldenScenarioRuleSetSnapshot('2026-06-06T00:00:00.000Z');

  assert(scenarios.length >= 28, 'at least 28 golden scenarios exist');
  assert.equal(suite.failedCount, 0, 'all golden scenarios pass deterministic acceptance');
  assert(validateMarketGoldenScenarioFixture(scenarios[0]).ok, 'scenario fixture schema validates');
  assert(validateMarketGoldenScenarioEvidenceFixture(scenarios[0]!.evidence[0]).ok, 'evidence fixture schema validates');
  assert(validateMarketGoldenScenarioCandleFixture({ timestamp:'2026-06-06T00:01:00.000Z', open:100, high:101, low:99, close:100.5 }).ok, 'candle fixture schema validates');
  assert(validateMarketGoldenScenarioAcceptanceResult(suite.results[0]).ok, 'acceptance result schema validates');
  assert(validateMarketGoldenScenarioAcceptanceReport(suite).ok, 'acceptance report schema validates');
  assert(validateMarketGoldenScenarioRule(rules.rules[0]).ok, 'rule schema validates');
  assert(validateMarketGoldenScenarioRuleSetSnapshot(rules).ok, 'rule set validates');
  assert(validateMarketGoldenScenarioCoverageReport(coverage).ok, 'coverage report validates');
  assertMarketGoldenScenarioRuleSetValid();

  const boundary = new CanonicalMarketIntelligenceBoundaryService(new MemoryMarketEvidenceRegistrySnapshotRepository(), new MemorySeoContentArchitectureSnapshotRepository());
  assert.equal(boundary.listMarketGoldenScenarios().length, scenarios.length, 'canonical boundary lists golden scenarios');
  assert(boundary.getMarketGoldenScenario('c6r9_us_cpi_upside_dxy_support'), 'canonical boundary reads a golden scenario');
  assert.equal(boundary.runMarketGoldenScenarioById('c6r9_macro_bullish_confirmed_price_reaction').priceReactionStatus, 'confirmed', 'canonical boundary runs by id');
  assert.equal(boundary.runMarketGoldenScenarioSuite().failedCount, 0, 'canonical boundary runs suite');
  assert(boundary.getMarketGoldenScenarioCoverageReport().totalScenarios >= 28, 'canonical boundary exposes coverage');
  assert(boundary.getMarketGoldenScenarioRuleSetSnapshot().rules.length > 0, 'canonical boundary exposes rules');
  assert(boundary.assertMarketGoldenScenarioRuleSetValid().scenarioCount >= 28, 'canonical boundary validates rules');
  assert(boundary.listMarketGoldenScenarioRules().length > 0, 'canonical boundary lists rules');
  assert(boundary.listMarketGoldenScenarioWarnings('xau_usd').length > 0, 'canonical boundary lists warnings');

  assert(!forbiddenAdvice.test(JSON.stringify({ scenarios, suite, coverage, rules }).toLowerCase()), 'no direct advice language appears in outputs');
  for (const asset of MARKET_GOLDEN_SCENARIO_ASSETS) assert(coverage.assetsCovered.includes(asset), `asset covered: ${asset}`);
  for (const group of ['A','B','C','D','E','F']) assert(coverage.groupsCovered.includes(group), `required scenario group covered: ${group}`);
  for (const engine of ['asset direction','FX relative strength','macro surprise','contradiction matrix','confidence calibration','price reaction','provider reliability']) assert(coverage.enginesCovered.includes(engine), `engine covered: ${engine}`);
  assert.equal(suite.complete, false, 'suite complete remains false');
  assert(suite.pending.liveProviderActivation && suite.pending.empiricalBacktesting && suite.pending.productionDataCalibration, 'pending flags remain active');

  assert.equal(result('c6r9_us_cpi_upside_dxy_support').observedDirection, 'bullish', 'CPI upside supports DXY context');
  assert(['bearish','mixed'].includes(result('c6r9_us_cpi_upside_xau_pressure').observedDirection), 'CPI upside pressures or tensions XAU/USD context');
  assert(['bearish','mixed'].includes(result('c6r9_us_cpi_upside_nasdaq_pressure').observedDirection), 'CPI upside pressures or tensions Nasdaq context');
  assert(result('c6r9_us_cpi_upside_nasdaq_pressure').providerReliabilityWarnings.length > 0, 'missing price/provider context remains caveated for risk-asset CPI confidence');
  assert(['bullish','mixed'].includes(result('c6r9_us_cpi_downside_eurusd_quote_relief').observedDirection), 'CPI downside weakens or tensions USD quote context');
  assert(hasReason('c6r9_us_cpi_same_actual_higher_forecast_gbpusd', 'actual_vs_forecast'), 'same actual with different forecast changes outcome');
  assert(hasReason('c6r9_us_unemployment_above_forecast_labor_weakness', 'indicator_direction_inverted'), 'unemployment inversion preserved');
  assert(hasReason('c6r9_jobless_claims_above_forecast_labor_weakness', 'indicator_direction_inverted'), 'jobless claims inversion preserved');
  assert(result('c6r9_gbpusd_boe_hawkish_us_growth_strong').contradictionFamilies.includes('fx_base_quote_conflict'), 'FX base/quote conflict detected');
  assert(result('c6r9_usdchf_riskoff_safe_haven_conflict').contradictionFamilies.includes('safe_haven_conflict'), 'safe-haven conflict detected');
  assert(result('c6r9_nasdaq_bullish_vix_rising_tension').contradictionFamilies.includes('risk_vs_volatility'), 'risk vs VIX contradiction detected');
  assert(result('c6r9_sp500_bullish_credit_stress_tension').contradictionFamilies.includes('risk_vs_credit'), 'risk vs credit contradiction detected');
  assert(result('c6r9_equities_bullish_breadth_deteriorates').contradictionFamilies.includes('equities_vs_breadth'), 'equities vs breadth contradiction detected');
  assert(result('c6r9_btc_bullish_funding_overheated').contradictionFamilies.includes('crypto_vs_derivatives'), 'BTC funding tension detected');
  assert(result('c6r9_btc_bullish_liquidity_deteriorates').reasonCodes.some((x) => x.includes('liquidity')), 'BTC liquidity tension detected');
  assert(['bearish','mixed'].includes(result('c6r9_usdcad_oil_shock_positive_for_cad_quote').observedDirection), 'oil shock supports or tensions CAD quote in USD/CAD');
  assert(['bearish','mixed'].includes(result('c6r9_de30_energy_shock_margin_pressure').observedDirection), 'energy shock pressures or tensions DE30 margin context');
  assert.equal(result('c6r9_macro_bullish_confirmed_price_reaction').priceReactionStatus, 'confirmed', 'confirmed reaction status covered');
  assert(result('c6r9_macro_bullish_confirmed_price_reaction').confidence > result('c6r9_macro_bullish_absorbed_price_reaction').confidence, 'confirmed reaction improves confidence versus absorbed');
  assert.equal(result('c6r9_macro_bullish_rejected_price_reaction').priceReactionStatus, 'rejected', 'rejected reaction status covered');
  assert.equal(result('c6r9_macro_bullish_absorbed_price_reaction').priceReactionStatus, 'absorbed', 'absorbed reaction status covered');
  assert.equal(result('c6r9_macro_bullish_reversed_price_reaction').priceReactionStatus, 'reversed', 'reversed reaction status covered');
  assert(result('c6r9_macro_bullish_reversed_price_reaction').confidence < result('c6r9_macro_bullish_absorbed_price_reaction').confidence, 'reversed reaction lowers confidence versus absorbed');
  assert(fixture('c6r9_official_macro_vs_unknown_scraped_source').providerExpectation.officialWeightHigherThanScraped, 'official source weighted higher than scraped');
  assert(result('c6r9_official_macro_vs_unknown_scraped_source').providerReliabilityWarnings.includes('scraped_source_risk'), 'scraped source warning present');
  assert(fixture('c6r9_duplicate_same_headline_news_burst').providerExpectation.duplicateIndependencePenalty, 'duplicate burst not independent');
  assert(result('c6r9_duplicate_same_headline_news_burst').providerReliabilityWarnings.includes('duplicate_source_risk'), 'duplicate source warning present');
  assert(fixture('c6r9_fixture_only_provider_high_extraction_capped').providerExpectation.fixtureOnlyConfidenceCap, 'fixture-only provider capped');
  assert.notEqual(result('c6r9_fixture_only_provider_high_extraction_capped').confidenceTier, 'very_high', 'fixture-only provider cannot support very high confidence alone');
  assert(fixture('c6r9_xau_missing_critical_dependency_gap').providerExpectation.missingCriticalDependency, 'missing critical dependency represented');
  assert(result('c6r9_xau_missing_critical_dependency_gap').providerReliabilityWarnings.includes('missing_critical_asset_dependency'), 'missing dependency warning lowers coverage');
  assert.notEqual(result('c6r9_dxy_diagnostic_limited_basket_context').confidenceTier, 'very_high', 'DXY diagnostic limit preserved');
  assert.notEqual(result('c6r9_vix_diagnostic_risk_context_limited').confidenceTier, 'very_high', 'VIX diagnostic limit preserved');

  const dxyFixture = fixture('c6r9_us_cpi_upside_dxy_support');
  const impossibleDirection = runMarketGoldenScenario({ ...dxyFixture, expectedOutcome:{ ...dxyFixture.expectedOutcome, expectedDirection:'bearish', acceptableDirections:['bearish'] } });
  assert.equal(impossibleDirection.pass, false, 'mutated impossible expected direction fails against actual engine output');
  assert.notEqual(impossibleDirection.observedDirection, impossibleDirection.expectedDirection, 'observed direction is not copied from mutated expected direction');

  const impossibleRequiredWarning = runMarketGoldenScenario({ ...dxyFixture, expectedOutcome:{ ...dxyFixture.expectedOutcome, expectedWarnings:['nonexistent_engine_warning'] } });
  assert.equal(impossibleRequiredWarning.pass, false, 'missing required warning fails acceptance');
  assert.equal(impossibleRequiredWarning.requiredWarningsPresent, false, 'required warning comparison uses actual engine warnings');

  const forbiddenProducedWarning = runMarketGoldenScenario({ ...dxyFixture, expectedOutcome:{ ...dxyFixture.expectedOutcome, forbiddenWarnings:['requires_price_confirmation'] } });
  assert.equal(forbiddenProducedWarning.pass, false, 'forbidden produced warning fails acceptance');
  assert.equal(forbiddenProducedWarning.forbiddenWarningsAbsent, false, 'forbidden warning comparison uses actual engine warnings');

  const familyFixture = fixture('c6r9_nasdaq_bullish_vix_rising_tension');
  const impossibleFamily = runMarketGoldenScenario({ ...familyFixture, expectedOutcome:{ ...familyFixture.expectedOutcome, expectedContradictionFamilies:['unknown'] } });
  assert.equal(impossibleFamily.pass, false, 'nonexistent expected contradiction family fails acceptance');

  const confirmedFixture = fixture('c6r9_macro_bullish_confirmed_price_reaction');
  const rejectedCandles = fixture('c6r9_macro_bullish_rejected_price_reaction').candles;
  const priceMutated = runMarketGoldenScenario({ ...confirmedFixture, candles:rejectedCandles });
  assert.notEqual(priceMutated.priceReactionStatus, result('c6r9_macro_bullish_confirmed_price_reaction').priceReactionStatus, 'mutating candles changes actual price reaction status');

  const officialFixture = fixture('c6r9_official_macro_vs_unknown_scraped_source');
  const providerMutated = runMarketGoldenScenario({ ...officialFixture, evidence:officialFixture.evidence.map((evidence) => ({ ...evidence, sourceKind:'scraped', providerId:`scraped_${evidence.providerId}`, independent:false })) });
  assert(providerMutated.providerReliabilityWarnings.includes('scraped_source_risk') || providerMutated.confidence < result('c6r9_official_macro_vs_unknown_scraped_source').confidence, 'mutating provider metadata changes warnings or confidence');

}
