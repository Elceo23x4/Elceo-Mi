import assert from 'node:assert/strict';
import { validateMarketGoldenScenarioAcceptanceReport, validateMarketGoldenScenarioAcceptanceResult, validateMarketGoldenScenarioCandleFixture, validateMarketGoldenScenarioCoverageReport, validateMarketGoldenScenarioEvidenceFixture, validateMarketGoldenScenarioFixture, validateMarketGoldenScenarioRule, validateMarketGoldenScenarioRuleSetSnapshot } from '@elceo/schemas';
import { MARKET_CONFIDENCE_CALIBRATION_TIERS, MARKET_GOLDEN_SCENARIO_ASSETS } from '@elceo/types';
import { CanonicalMarketIntelligenceBoundaryService } from '../runtime/canonical-market-intelligence-boundary.js';
import { MemoryMarketEvidenceRegistrySnapshotRepository, MemorySeoContentArchitectureSnapshotRepository } from '../persistence/registry-snapshot-repository.js';
import { assertMarketGoldenScenarioRuleSetValid, buildReasoningEvidenceItemsFromScenario, buildWeightedSnapshotFromScenario, getMarketGoldenScenarioCoverageReport, getMarketGoldenScenarioRuleSetSnapshot, listMarketGoldenScenarios, runMarketGoldenScenario, runMarketGoldenScenarioById, runMarketGoldenScenarioSuite, runScenarioConfidenceCalibration, runScenarioContradictionMatrix, runScenarioPriceReaction, runScenarioProviderReliability } from '../golden-scenarios/index.js';

const forbiddenAdvice = /\b(buy|sell|hold|guaranteed profit|risk-free)\b/i;
function result(id: string) { return runMarketGoldenScenarioById(id); }
function fixture(id: string) { const found = listMarketGoldenScenarios().find((x) => x.scenarioId === id); assert(found, `missing fixture ${id}`); return found; }
function hasReason(id: string, needle: string): boolean { return result(id).reasonCodes.some((x) => x.includes(needle)); }
function engineConfidenceFor(id: string) { const scenario = fixture(id); const evidenceItems = buildReasoningEvidenceItemsFromScenario(scenario); const weightedSnapshot = buildWeightedSnapshotFromScenario(scenario); const priceReaction = runScenarioPriceReaction(scenario, weightedSnapshot); const providerReliability = runScenarioProviderReliability(scenario, evidenceItems); const contradictionMatrix = runScenarioContradictionMatrix(scenario, weightedSnapshot, evidenceItems, priceReaction, providerReliability); return runScenarioConfidenceCalibration(scenario, weightedSnapshot, contradictionMatrix, priceReaction, providerReliability); }
function providerOutputSignature(id: string, scenario = fixture(id)): string { const evidenceItems = buildReasoningEvidenceItemsFromScenario(scenario); return JSON.stringify(runScenarioProviderReliability(scenario, evidenceItems)); }

export function runMarketGoldenScenarioAcceptanceTests(): void {
  const scenarios = listMarketGoldenScenarios();
  const suite = runMarketGoldenScenarioSuite({ asOfIso:'2026-06-06T00:00:00.000Z' });
  const coverage = getMarketGoldenScenarioCoverageReport('2026-06-06T00:00:00.000Z');
  const rules = getMarketGoldenScenarioRuleSetSnapshot('2026-06-06T00:00:00.000Z');

  assert(scenarios.length >= 28, 'at least 28 golden scenarios exist');
  assert.equal(suite.failedCount, 0, 'all golden scenarios pass deterministic acceptance');
  const broadConfidenceDefaults = scenarios.filter((scenario) => scenario.confidenceExpectation.minConfidence === 0 && scenario.confidenceExpectation.maxConfidence === 100);
  assert.equal(broadConfidenceDefaults.length, 0, 'no scenario silently defaults to a universal confidence range');
  const normalConfidenceScenario = fixture('c6r9_us_unemployment_above_forecast_labor_weakness');
  assert(normalConfidenceScenario.confidenceExpectation.maxConfidence - normalConfidenceScenario.confidenceExpectation.minConfidence <= 30, 'default confidence band is not wider than ±15');
  assert.deepEqual(normalConfidenceScenario.confidenceExpectation.allowedTiers, [normalConfidenceScenario.confidenceExpectation.expectedTier], 'default confidence acceptance pins the expected tier');
  assert(validateMarketGoldenScenarioFixture(scenarios[0]).ok, 'scenario fixture schema validates');
  for (const scenario of scenarios) assert(validateMarketGoldenScenarioFixture(scenario).ok, `scenario fixture schema validates: ${scenario.scenarioId}`);
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
  assert(result('c6r9_macro_bullish_confirmed_price_reaction').confidence > result('c6r9_macro_bullish_rejected_price_reaction').confidence, 'confirmed reaction remains higher confidence than rejected');
  assert(result('c6r9_macro_bullish_confirmed_price_reaction').confidence > result('c6r9_macro_bullish_reversed_price_reaction').confidence, 'confirmed reaction remains higher confidence than reversed');
  assert(result('c6r9_macro_bullish_reversed_price_reaction').confidence <= result('c6r9_macro_bullish_absorbed_price_reaction').confidence, 'reversed reaction does not exceed absorbed confidence');
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

  const fixtureOnlyWarning = runMarketGoldenScenario({ ...dxyFixture, expectedOutcome:{ ...dxyFixture.expectedOutcome, expectedWarnings:['diagnostic_only_dxy'] } });
  assert.equal(fixtureOnlyWarning.pass, false, 'fixture-only diagnostic warning metadata cannot satisfy required warning acceptance');
  assert.equal(fixtureOnlyWarning.requiredWarningsPresent, false, 'required warning purity uses actual engine outputs only');

  const creditFixture = fixture('c6r9_sp500_bullish_credit_stress_tension');
  const creditRemoved = runMarketGoldenScenario({ ...creditFixture, evidence:creditFixture.evidence.filter((evidence) => evidence.evidenceClass !== 'credit_stress') });
  assert.equal(creditRemoved.pass, false, 'category metadata alone cannot satisfy expected risk-credit family');
  assert.equal(creditRemoved.contradictionFamilies.includes('risk_vs_credit'), false, 'risk-credit family must come from actual contradiction signals');

  const duplicateFixture = fixture('c6r9_duplicate_same_headline_news_burst');
  const sourceIndependentEvidence = duplicateFixture.evidence.map(({ duplicateGroupId: _duplicateGroupId, ...evidence }, index) => ({ ...evidence, sourceKind:'official' as const, evidenceId:`official_unique_payload_${index}`, providerId:`official_unique_${index}`, independent:true }));
  const sourcePurified = runMarketGoldenScenario({ ...duplicateFixture, evidence:sourceIndependentEvidence });
  assert.equal(sourcePurified.pass, false, 'source disagreement category/source metadata alone cannot create source disagreement');
  assert.equal(sourcePurified.contradictionFamilies.includes('source_disagreement'), false, 'source disagreement must come from duplicate or source-conflict engine output');

  const confidenceFixture = fixture('c6r9_macro_bullish_confirmed_price_reaction');
  const actualConfidence = result('c6r9_macro_bullish_confirmed_price_reaction').confidence;
  const confidenceTooHighRequired = runMarketGoldenScenario({ ...confidenceFixture, confidenceExpectation:{ ...confidenceFixture.confidenceExpectation, minConfidence:Math.min(100, actualConfidence + 1), maxConfidence:Math.min(100, actualConfidence + 5) } });
  assert.equal(confidenceTooHighRequired.pass, false, 'scenario fails when actual confidence is materially too low for the expected band');
  const confidenceTooLowRequired = runMarketGoldenScenario({ ...confidenceFixture, confidenceExpectation:{ ...confidenceFixture.confidenceExpectation, minConfidence:Math.max(0, actualConfidence - 5), maxConfidence:Math.max(0, actualConfidence - 1) } });
  assert.equal(confidenceTooLowRequired.pass, false, 'scenario fails when actual confidence is materially too high for the expected band');
  const excludedTiers = MARKET_CONFIDENCE_CALIBRATION_TIERS.filter((tier) => tier !== result('c6r9_macro_bullish_confirmed_price_reaction').confidenceTier);
  const impossibleConfidenceTier = runMarketGoldenScenario({ ...confidenceFixture, confidenceExpectation:{ ...confidenceFixture.confidenceExpectation, allowedTiers:excludedTiers } });
  assert.equal(impossibleConfidenceTier.pass, false, 'scenario fails when actual confidence tier is excluded from allowed tiers');

  const diagnosticAsVeryHigh = runMarketGoldenScenario({ ...fixture('c6r9_dxy_diagnostic_limited_basket_context'), confidenceExpectation:{ ...fixture('c6r9_dxy_diagnostic_limited_basket_context').confidenceExpectation, minConfidence:0, maxConfidence:100, allowedTiers:['very_high'], cannotReachTier:'very_high' } });
  assert.equal(diagnosticAsVeryHigh.pass, false, 'diagnostic cap prevents very-high acceptance');
  const fixtureOnlyAsVeryHigh = runMarketGoldenScenario({ ...fixture('c6r9_fixture_only_provider_high_extraction_capped'), confidenceExpectation:{ ...fixture('c6r9_fixture_only_provider_high_extraction_capped').confidenceExpectation, minConfidence:0, maxConfidence:100, allowedTiers:['very_high'], cannotReachTier:'very_high' } });
  assert.equal(fixtureOnlyAsVeryHigh.pass, false, 'fixture-only cap prevents very-high acceptance');

  const confirmedFixture = fixture('c6r9_macro_bullish_confirmed_price_reaction');
  const rejectedCandles = fixture('c6r9_macro_bullish_rejected_price_reaction').candles;
  const priceMutated = runMarketGoldenScenario({ ...confirmedFixture, candles:rejectedCandles });
  assert.notEqual(priceMutated.priceReactionStatus, result('c6r9_macro_bullish_confirmed_price_reaction').priceReactionStatus, 'mutating candles changes actual price reaction status');

  const officialFixture = fixture('c6r9_official_macro_vs_unknown_scraped_source');
  const providerMutated = runMarketGoldenScenario({ ...officialFixture, evidence:officialFixture.evidence.map((evidence) => ({ ...evidence, sourceKind:'scraped', providerId:`scraped_${evidence.providerId}`, independent:false })) });
  assert(providerMutated.providerReliabilityWarnings.includes('scraped_source_risk') || providerMutated.confidence < result('c6r9_official_macro_vs_unknown_scraped_source').confidence, 'mutating provider metadata changes warnings or confidence');

  const missingReason = runMarketGoldenScenario({ ...dxyFixture, expectedOutcome:{ ...dxyFixture.expectedOutcome, expectedReasonCodes:['missing_engine_reason_code'] } });
  assert.equal(missingReason.pass, false, 'missing expected reason code fails acceptance');
  assert.equal(missingReason.requiredReasonCodesPresent, false, 'expected reason codes are binding');
  assert.deepEqual(missingReason.missingReasonCodes, ['missing_engine_reason_code'], 'missing reason code diagnostics are reported');

  const impossibleSeverity = runMarketGoldenScenario({ ...fixture('c6r9_dxy_diagnostic_limited_basket_context'), severityExpectation:{ allowedSeverities:['high'], rationale:'Runtime mutation requires impossible diagnostic severity.' } });
  assert.equal(impossibleSeverity.pass, false, 'no-contradiction scenario cannot pass a high-severity expectation');
  assert.equal(impossibleSeverity.severityExpectationMet, false, 'severity expectation participates in pass/fail');

  const xauRatesFixture = fixture('c6r9_us_cpi_upside_xau_pressure');
  const xauWithoutRealYield = runMarketGoldenScenario({ ...xauRatesFixture, evidence:xauRatesFixture.evidence.filter((evidence) => evidence.evidenceClass !== 'real_yields') });
  assert.equal(xauWithoutRealYield.pass, false, 'removing real-yield evidence breaks rates-vs-gold acceptance');
  assert.equal(xauWithoutRealYield.expectedFamiliesPresent, false, 'rates-vs-gold family must come from actual contradiction output');

  const gbpConflictFixture = fixture('c6r9_gbpusd_boe_hawkish_us_growth_strong');
  const gbpOneSided = runMarketGoldenScenario({ ...gbpConflictFixture, evidence:gbpConflictFixture.evidence.filter((evidence) => evidence.evidenceId !== 'usd-growth-dollar') });
  assert.equal(gbpOneSided.pass, false, 'FX two-sided conflict does not pass from category metadata alone');
  assert(gbpOneSided.missingReasonCodes.length > 0 || !gbpOneSided.expectedFamiliesPresent || gbpOneSided.confidence !== result('c6r9_gbpusd_boe_hawkish_us_growth_strong').confidence, 'removing one FX side changes reasons, families, or confidence');

  const confirmedWrongStatus = runMarketGoldenScenario({ ...confirmedFixture, priceReactionExpectation:{ ...confirmedFixture.priceReactionExpectation, expectedStatus:'rejected' } });
  assert.equal(confirmedWrongStatus.pass, false, 'changing expected price status while retaining candles fails');
  assert.equal(confirmedWrongStatus.priceReactionExpectationMet, false, 'price status expectation participates in pass/fail');
  const confirmedMissingPriceWarning = runMarketGoldenScenario({ ...confirmedFixture, priceReactionExpectation:{ ...confirmedFixture.priceReactionExpectation, expectedWarnings:['missing_event_time'] } });
  assert.equal(confirmedMissingPriceWarning.pass, false, 'missing price-reaction warning fails acceptance');
  assert.equal(confirmedMissingPriceWarning.priceReactionWarningsPresent, false, 'price warnings are checked against price engine output');
  const dxyGlobalWarningCannotSatisfyPrice = runMarketGoldenScenario({ ...dxyFixture, priceReactionExpectation:{ ...dxyFixture.priceReactionExpectation, expectedWarnings:['provider_activation_gap'] } });
  assert.equal(dxyGlobalWarningCannotSatisfyPrice.pass, false, 'global warning cannot satisfy price-reaction warning expectation');
  assert(dxyGlobalWarningCannotSatisfyPrice.missingPriceReactionWarnings.includes('provider_activation_gap'), 'missing price warning diagnostic is engine-specific');

  const providerExpectedMissing = runMarketGoldenScenario({ ...dxyFixture, providerExpectation:{ ...dxyFixture.providerExpectation, expectedWarnings:['missing_provider_reliability'] } });
  assert.equal(providerExpectedMissing.pass, false, 'missing provider warning fails provider-specific acceptance');
  assert.equal(providerExpectedMissing.providerWarningsPresent, false, 'provider expected warnings are checked against provider engine output only');

  const officialDowngraded = runMarketGoldenScenario({ ...officialFixture, evidence:officialFixture.evidence.map((evidence) => ({ ...evidence, sourceKind:'scraped' as const, providerId:`scraped_${evidence.providerId}`, independent:false })) });
  assert.equal(officialDowngraded.pass, false, 'official-higher-than-scraped expectation is binding');
  assert.equal(officialDowngraded.providerFlagsMet, false, 'provider binding flag reports failure when official source is removed');
  assert(officialDowngraded.failedProviderExpectationFlags.includes('official_weight_higher_than_scraped'), 'official-weight flag diagnostic is named');
  const duplicatePurified = runMarketGoldenScenario({ ...duplicateFixture, evidence:sourceIndependentEvidence });
  assert.equal(duplicatePurified.providerFlagsMet, false, 'duplicate independence penalty flag is binding');
  assert(duplicatePurified.failedProviderExpectationFlags.includes('duplicate_independence_penalty'), 'duplicate flag diagnostic is named');
  const fixtureOnlyFixture = fixture('c6r9_fixture_only_provider_high_extraction_capped');
  const fixtureOnlyPromoted = runMarketGoldenScenario({ ...fixtureOnlyFixture, evidence:fixtureOnlyFixture.evidence.map((evidence) => ({ ...evidence, sourceKind:'official' as const, providerId:'official_macro_promoted' })) });
  assert.equal(fixtureOnlyPromoted.providerFlagsMet, false, 'fixture-only confidence cap flag is binding');
  assert(fixtureOnlyPromoted.failedProviderExpectationFlags.includes('fixture_only_confidence_cap'), 'fixture-only flag diagnostic is named');
  const missingDependencyFixture = fixture('c6r9_xau_missing_critical_dependency_gap');
  const missingDependencyRemoved = runMarketGoldenScenario({ ...missingDependencyFixture, providerInput:{} });
  assert.equal(missingDependencyRemoved.providerFlagsMet, false, 'missing critical dependency flag is binding');
  assert(missingDependencyRemoved.failedProviderExpectationFlags.includes('missing_critical_dependency'), 'missing dependency flag diagnostic is named');


  const supportedConfidence = engineConfidenceFor('c6r9_macro_bullish_confirmed_price_reaction');
  assert(supportedConfidence, 'supported scenario produces confidence calibration output');
  assert.equal(result('c6r9_macro_bullish_confirmed_price_reaction').confidence, supportedConfidence!.finalConfidence, 'supported scenario confidence comes from confidence calibration finalConfidence');
  assert.equal(result('c6r9_macro_bullish_confirmed_price_reaction').confidenceTier, supportedConfidence!.confidenceTier, 'supported scenario tier comes from confidence calibration confidenceTier');
  assert.equal(result('c6r9_macro_bullish_confirmed_price_reaction').confidenceSource, 'confidence_calibration_engine', 'supported scenario confidence source is engine');
  const confidenceInputMutated = runMarketGoldenScenario({ ...confirmedFixture, evidence:confirmedFixture.evidence.map((evidence) => ({ ...evidence, reliabilityScore:10, sourceKind:'unknown' as const, providerId:'unknown_confidence_input', independent:false })) });
  assert.notEqual(confidenceInputMutated.confidence, result('c6r9_macro_bullish_confirmed_price_reaction').confidence, 'mutating confidence-engine inputs changes scenario confidence');
  assert.equal(result('c6r9_vix_diagnostic_risk_context_limited').confidenceSource, 'diagnostic_fallback', 'VIX diagnostic fallback is explicit');

  const missingDependencyOutputBefore = providerOutputSignature('c6r9_xau_missing_critical_dependency_gap');
  const missingDependencyExpectationOnly = { ...missingDependencyFixture, providerExpectation:{ ...missingDependencyFixture.providerExpectation, missingCriticalDependency:false } };
  assert.equal(providerOutputSignature('c6r9_xau_missing_critical_dependency_gap', missingDependencyExpectationOnly), missingDependencyOutputBefore, 'mutating only provider expectation does not change provider-engine output');
  const missingDependencyInputRemoved = { ...missingDependencyFixture, providerInput:{} };
  assert.notEqual(providerOutputSignature('c6r9_xau_missing_critical_dependency_gap', missingDependencyInputRemoved), missingDependencyOutputBefore, 'mutating provider input changes provider-engine output');
  assert.equal(runMarketGoldenScenario(missingDependencyInputRemoved).pass, false, 'removing dependency input while retaining expectation fails');
  const missingDependencyInformationalRemoved = runMarketGoldenScenario({ ...missingDependencyFixture, providerExpectation:{ ...missingDependencyFixture.providerExpectation, missingCriticalDependency:false, expectedWarnings:[] } });
  assert.equal(missingDependencyInformationalRemoved.providerFlagsMet, true, 'dependency input can affect output without an absent expectation flag manufacturing failure');
  assert.equal(result('c6r9_macro_bullish_confirmed_price_reaction').priceReactionConfidenceEffectMet, true, 'price confidence effect is binding for confirmed reaction');
  const impossibleEffect = runMarketGoldenScenario({ ...confirmedFixture, priceReactionExpectation:{ ...confirmedFixture.priceReactionExpectation, expectedConfidenceEffect:'contradiction' } });
  assert.equal(impossibleEffect.pass, false, 'incorrect price confidence effect fails acceptance');
  assert.equal(impossibleEffect.priceReactionConfidenceEffectMet, false, 'price confidence effect diagnostic reports failure');
  const invalidPass = { ...result('c6r9_macro_bullish_confirmed_price_reaction'), pass:true, providerFlagsMet:false };
  assert.equal(validateMarketGoldenScenarioAcceptanceResult(invalidPass).ok, false, 'schema rejects pass true with failed binding diagnostic');

  const rejectedWithConfirmedCandles = runMarketGoldenScenario({ ...fixture('c6r9_macro_bullish_rejected_price_reaction'), candles:confirmedFixture.candles });
  assert.equal(rejectedWithConfirmedCandles.pass, false, 'contradiction plus price reaction plus confidence changes when rejected reaction is replaced by confirmed candles');
  assert.equal(rejectedWithConfirmedCandles.priceReactionExpectationMet, false, 'price status mismatch is surfaced in multi-engine regression');

}
