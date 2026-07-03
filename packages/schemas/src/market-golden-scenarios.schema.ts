import type { MarketGoldenScenarioAcceptanceReport, MarketGoldenScenarioAcceptanceResult, MarketGoldenScenarioCandleFixture, MarketGoldenScenarioCoverageReport, MarketGoldenScenarioEvidenceFixture, MarketGoldenScenarioFixture, MarketGoldenScenarioRule, MarketGoldenScenarioRuleSetSnapshot } from '@elceo/types';
import { EVIDENCE_WEIGHT_HORIZONS, MARKET_CONFIDENCE_CALIBRATION_TIERS, MARKET_CONTRADICTION_FAMILIES, MARKET_CONTRADICTION_SEVERITIES, MARKET_EVIDENCE_CLASSES, MARKET_GOLDEN_SCENARIO_ASSETS, MARKET_GOLDEN_SCENARIO_CATEGORIES, MARKET_GOLDEN_SCENARIO_REGIMES, MARKET_PRICE_REACTION_EVENT_KINDS, MARKET_PRICE_REACTION_STATUSES, MARKET_PRICE_REACTION_WARNINGS, MARKET_PROVIDER_RELIABILITY_WARNINGS, WEIGHTED_EVIDENCE_DIRECTIONS, marketConfidenceTierForScore, TRADING_ASSET_COVERAGE, MARKET_REASONING_DIAGNOSTIC_ASSETS } from '@elceo/types';
import { isBoolean, isEnumValue, isFiniteNumber, isIsoDateString, isNonEmptyString, isObjectRecord, isScore0to100, type SchemaValidationResult } from './validation-utils';
import { validateExpectedMarketReasoningModuleReadiness } from './market-reasoning-readiness.schema';

const forbidden = /\b(buy|sell|hold|guaranteed profit|risk-free)\b/i;
const engines = ['asset direction','FX relative strength','macro surprise','contradiction matrix','confidence calibration','price reaction','provider reliability'];
const confidenceEffects = ['improves','reduces','cautious','contradiction','not_applicable'] as const;
const confidenceSources = ['confidence_calibration_engine','diagnostic_fallback'] as const;
const providerFlags = ['official_weight_higher_than_scraped','duplicate_independence_penalty','fixture_only_confidence_cap','missing_critical_dependency'] as const;
function fail<T>(errors: string[]): SchemaValidationResult<T> { return { ok: false, errors }; }
function pass<T>(value: T): SchemaValidationResult<T> { return { ok: true, value }; }
function strings(value: unknown): value is string[] { return Array.isArray(value) && value.every((x) => typeof x === 'string'); }
function noAdvice(value: unknown): boolean { return typeof value !== 'string' || !forbidden.test(value); }
function overlap(left: readonly string[], right: readonly string[]): string[] { return left.filter((x) => right.includes(x)); }
function enumArray<T extends string>(value: unknown, allowed: readonly T[]): value is T[] { return Array.isArray(value) && value.every((x) => isEnumValue(x, allowed)); }
function duplicateValues(values: readonly string[]): string[] { return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))]; }
function nonNegativeInteger(value: unknown): value is number { return typeof value === 'number' && Number.isInteger(value) && value >= 0; }
function completeCoverageRecord(value: unknown, keys: readonly string[], label: string, errors: string[]): number { if (!isObjectRecord(value)) { errors.push(label); return 0; } let sum = 0; for (const key of keys) { if (!nonNegativeInteger(value[key])) errors.push(`${label}.${key}`); else sum += Number(value[key]); } return sum; }

export function validateMarketGoldenScenarioCandleFixture(input: unknown, path = ''): SchemaValidationResult<MarketGoldenScenarioCandleFixture> { if (!isObjectRecord(input)) return fail([`${path}must be object`]); const e: string[] = []; if (!isIsoDateString(input.timestamp)) e.push(`${path}timestamp`); for (const key of ['open','high','low','close']) if (!isFiniteNumber(input[key])) e.push(`${path}${key}`); if (isFiniteNumber(input.high) && isFiniteNumber(input.low) && input.high < input.low) e.push(`${path}high_low_coherence`); if (isFiniteNumber(input.open) && isFiniteNumber(input.high) && isFiniteNumber(input.low) && (input.open > input.high || input.open < input.low)) e.push(`${path}open_ohlc_coherence`); if (isFiniteNumber(input.close) && isFiniteNumber(input.high) && isFiniteNumber(input.low) && (input.close > input.high || input.close < input.low)) e.push(`${path}close_ohlc_coherence`); return e.length ? fail(e) : pass(input as MarketGoldenScenarioCandleFixture); }
export function validateMarketGoldenScenarioEvidenceFixture(input: unknown, path = ''): SchemaValidationResult<MarketGoldenScenarioEvidenceFixture> { if (!isObjectRecord(input)) return fail([`${path}must be object`]); const e: string[] = []; if (!isNonEmptyString(input.evidenceId)) e.push(`${path}evidenceId`); if (!isNonEmptyString(input.providerId)) e.push(`${path}providerId`); if (!isEnumValue(input.sourceKind, ['official','central_bank','market_data','news','scraped','fixture_only','unknown'] as const)) e.push(`${path}sourceKind`); if (!isEnumValue(input.evidenceClass, MARKET_EVIDENCE_CLASSES)) e.push(`${path}evidenceClass`); if (!isIsoDateString(input.observedAt)) e.push(`${path}observedAt`); if (!isEnumValue(input.directionHint, WEIGHTED_EVIDENCE_DIRECTIONS)) e.push(`${path}directionHint`); if (!isScore0to100(input.weight)) e.push(`${path}weight`); if (!isScore0to100(input.reliabilityScore)) e.push(`${path}reliabilityScore`); if (!isBoolean(input.independent)) e.push(`${path}independent`); if (!isObjectRecord(input.metadata)) e.push(`${path}metadata`); if (!isNonEmptyString(input.rationale) || !noAdvice(input.rationale)) e.push(`${path}rationale`); return e.length ? fail(e) : pass(input as MarketGoldenScenarioEvidenceFixture); }

export function validateMarketGoldenScenarioFixture(input: unknown): SchemaValidationResult<MarketGoldenScenarioFixture> {
  if (!isObjectRecord(input)) return fail(['must be object']);
  const e: string[] = [];
  if (!isNonEmptyString(input.scenarioId)) e.push('scenarioId');
  if (!isNonEmptyString(input.title) || !noAdvice(input.title)) e.push('title');
  if (!isEnumValue(input.asset, MARKET_GOLDEN_SCENARIO_ASSETS)) e.push('asset');
  if (!isEnumValue(input.category, MARKET_GOLDEN_SCENARIO_CATEGORIES)) e.push('category');
  if (!isEnumValue(input.regime, MARKET_GOLDEN_SCENARIO_REGIMES)) e.push('regime');
  if (!isEnumValue(input.horizon, EVIDENCE_WEIGHT_HORIZONS)) e.push('horizon');
  if (!isNonEmptyString(input.rationale) || !noAdvice(input.rationale)) e.push('rationale');
  if (!isScore0to100(input.expectedConfidenceAnchor)) e.push('expectedConfidenceAnchor');

  const expected = input.expectedOutcome;
  if (!isObjectRecord(expected)) e.push('expectedOutcome');
  else {
    if (!isEnumValue(expected.expectedDirection, WEIGHTED_EVIDENCE_DIRECTIONS)) e.push('expectedOutcome.expectedDirection');
    if (!enumArray(expected.acceptableDirections, WEIGHTED_EVIDENCE_DIRECTIONS) || expected.acceptableDirections.length === 0) e.push('expectedOutcome.acceptableDirections');
    else if (isEnumValue(expected.expectedDirection, WEIGHTED_EVIDENCE_DIRECTIONS) && !expected.acceptableDirections.includes(expected.expectedDirection)) e.push('expectedOutcome.expectedDirection_not_acceptable');
    if (!strings(expected.expectedReasonCodes)) e.push('expectedOutcome.expectedReasonCodes');
    if (!strings(expected.expectedWarnings)) e.push('expectedOutcome.expectedWarnings');
    if (!strings(expected.forbiddenWarnings)) e.push('expectedOutcome.forbiddenWarnings');
    if (strings(expected.expectedWarnings) && strings(expected.forbiddenWarnings) && overlap(expected.expectedWarnings, expected.forbiddenWarnings).length > 0) e.push('expectedOutcome.warning_overlap');
    if (!enumArray(expected.expectedContradictionFamilies, MARKET_CONTRADICTION_FAMILIES)) e.push('expectedOutcome.expectedContradictionFamilies');
    if (!isNonEmptyString(expected.rationale) || !noAdvice(expected.rationale)) e.push('expectedOutcome.rationale');
  }

  const severity = input.severityExpectation;
  if (!isObjectRecord(severity)) e.push('severityExpectation');
  else {
    if (!enumArray(severity.allowedSeverities, MARKET_CONTRADICTION_SEVERITIES) || severity.allowedSeverities.length === 0) e.push('severityExpectation.allowedSeverities');
    if (Array.isArray(severity.allowedSeverities) && severity.allowedSeverities.length === MARKET_CONTRADICTION_SEVERITIES.length) e.push('severityExpectation.no_universal_range');
    if (!isNonEmptyString(severity.rationale) || !noAdvice(severity.rationale)) e.push('severityExpectation.rationale');
  }

  const confidence = input.confidenceExpectation;
  if (!isObjectRecord(confidence)) e.push('confidenceExpectation');
  else {
    if (!isScore0to100(confidence.minConfidence) || !isScore0to100(confidence.maxConfidence) || Number(confidence.minConfidence) > Number(confidence.maxConfidence)) e.push('confidenceExpectation.bounds');
    if (Number(confidence.minConfidence) === 0 && Number(confidence.maxConfidence) === 100) e.push('confidenceExpectation.no_universal_range');
    if (!isEnumValue(confidence.expectedTier, MARKET_CONFIDENCE_CALIBRATION_TIERS)) e.push('confidenceExpectation.expectedTier');
    if (confidence.allowedTiers !== undefined && (!enumArray(confidence.allowedTiers, MARKET_CONFIDENCE_CALIBRATION_TIERS) || confidence.allowedTiers.length === 0)) e.push('confidenceExpectation.allowedTiers');
    if (enumArray(confidence.allowedTiers, MARKET_CONFIDENCE_CALIBRATION_TIERS) && isEnumValue(confidence.expectedTier, MARKET_CONFIDENCE_CALIBRATION_TIERS) && !confidence.allowedTiers.includes(confidence.expectedTier)) e.push('confidenceExpectation.expectedTier_not_allowed');
    if (confidence.cannotReachTier !== undefined && !isEnumValue(confidence.cannotReachTier, MARKET_CONFIDENCE_CALIBRATION_TIERS)) e.push('confidenceExpectation.cannotReachTier');
    if (isEnumValue(confidence.cannotReachTier, MARKET_CONFIDENCE_CALIBRATION_TIERS) && confidence.cannotReachTier === confidence.expectedTier) e.push('confidenceExpectation.cannotReach_expectedTier_conflict');
    if (enumArray(confidence.allowedTiers, MARKET_CONFIDENCE_CALIBRATION_TIERS) && isEnumValue(confidence.cannotReachTier, MARKET_CONFIDENCE_CALIBRATION_TIERS) && confidence.allowedTiers.includes(confidence.cannotReachTier)) e.push('confidenceExpectation.cannotReach_allowedTier_conflict');
    if (!isNonEmptyString(confidence.rationale) || !noAdvice(confidence.rationale)) e.push('confidenceExpectation.rationale');
  }

  const provider = input.providerExpectation;
  if (!isObjectRecord(provider)) e.push('providerExpectation');
  else {
    if (!enumArray(provider.expectedWarnings, MARKET_PROVIDER_RELIABILITY_WARNINGS)) e.push('providerExpectation.expectedWarnings');
    for (const key of ['officialWeightHigherThanScraped','duplicateIndependencePenalty','fixtureOnlyConfidenceCap','missingCriticalDependency']) if (provider[key] !== undefined && !isBoolean(provider[key])) e.push(`providerExpectation.${key}`);
    if (!isNonEmptyString(provider.rationale) || !noAdvice(provider.rationale)) e.push('providerExpectation.rationale');
  }

  const providerInput = input.providerInput;
  if (!isObjectRecord(providerInput)) e.push('providerInput');
  else if (providerInput.assetDependencies !== undefined) {
    if (!Array.isArray(providerInput.assetDependencies)) e.push('providerInput.assetDependencies');
    else providerInput.assetDependencies.forEach((dependency, index) => {
      if (!isObjectRecord(dependency)) e.push(`providerInput.assetDependencies[${index}]`);
      else {
        if (!isNonEmptyString(dependency.dependencyId)) e.push(`providerInput.assetDependencies[${index}].dependencyId`);
        if (!enumArray(dependency.evidenceClasses, MARKET_EVIDENCE_CLASSES) || dependency.evidenceClasses.length === 0) e.push(`providerInput.assetDependencies[${index}].evidenceClasses`);
        if (!isBoolean(dependency.critical)) e.push(`providerInput.assetDependencies[${index}].critical`);
        if (!isBoolean(dependency.covered)) e.push(`providerInput.assetDependencies[${index}].covered`);
        if (!strings(dependency.sourceIds)) e.push(`providerInput.assetDependencies[${index}].sourceIds`);
        if (!isNonEmptyString(dependency.rationale) || !noAdvice(dependency.rationale)) e.push(`providerInput.assetDependencies[${index}].rationale`);
      }
    });
  }

  const priceInput = input.priceReactionInput;
  if (!isObjectRecord(priceInput)) e.push('priceReactionInput');
  else if (!isEnumValue(priceInput.eventKind, MARKET_PRICE_REACTION_EVENT_KINDS)) e.push('priceReactionInput.eventKind');

  const price = input.priceReactionExpectation;
  if (!isObjectRecord(price)) e.push('priceReactionExpectation');
  else {
    if (!isEnumValue(price.expectedStatus, MARKET_PRICE_REACTION_STATUSES)) e.push('priceReactionExpectation.expectedStatus');
    if (!isEnumValue(price.expectedConfidenceEffect, confidenceEffects)) e.push('priceReactionExpectation.expectedConfidenceEffect');
    if (!enumArray(price.expectedWarnings, MARKET_PRICE_REACTION_WARNINGS)) e.push('priceReactionExpectation.expectedWarnings');
    if (price.expectedStatus !== 'unknown' && (!Array.isArray(input.candles) || input.candles.length === 0)) e.push('priceReactionExpectation.candles_required'); if (price.expectedStatus === 'unknown' && Array.isArray(input.candles) && input.candles.length > 0) e.push('priceReactionExpectation.unexpected_candles');
    if (!isNonEmptyString(price.rationale) || !noAdvice(price.rationale)) e.push('priceReactionExpectation.rationale');
  }

  const macroInput = input.macroInput;
  if (macroInput !== undefined) {
    if (!isObjectRecord(macroInput)) e.push('macroInput');
    else {
      for (const key of ['indicatorKind','category','region','currency','affectedCurrency','unit']) if (!isNonEmptyString(macroInput[key])) e.push(`macroInput.${key}`);
      for (const key of ['actual','forecast','previous','consensusDispersion']) if (!isFiniteNumber(macroInput[key])) e.push(`macroInput.${key}`);
    }
  }

  if (!Array.isArray(input.evidence) || input.evidence.length === 0) e.push('evidence');
  else {
    const evidenceIds = input.evidence.map((x) => isObjectRecord(x) && typeof x.evidenceId === 'string' ? x.evidenceId : '');
    if (duplicateValues(evidenceIds.filter(Boolean)).length > 0) e.push('evidence.duplicateEvidenceId');
    input.evidence.forEach((x, i) => { const r = validateMarketGoldenScenarioEvidenceFixture(x, `evidence[${i}].`); if (r.ok === false) e.push(...r.errors); });
  }
  if (!Array.isArray(input.candles)) e.push('candles');
  else input.candles.forEach((x, i) => { const r = validateMarketGoldenScenarioCandleFixture(x, `candles[${i}].`); if (r.ok === false) e.push(...r.errors); });
  if (!strings(input.enginesCovered) || input.enginesCovered.length === 0 || input.enginesCovered.some((x) => !engines.includes(x))) e.push('enginesCovered');
  if (!strings(input.groups) || input.groups.length === 0) e.push('groups');
  if (!Array.isArray(input.notes) || input.notes.some((x) => typeof x !== 'string' || !noAdvice(x))) e.push('notes');
  return e.length ? fail(e) : pass(input as MarketGoldenScenarioFixture);
}

export function validateMarketGoldenScenarioAcceptanceResult(input: unknown): SchemaValidationResult<MarketGoldenScenarioAcceptanceResult> { if (!isObjectRecord(input)) return fail(['must be object']); const e: string[] = []; if (!isNonEmptyString(input.scenarioId)) e.push('scenarioId'); if (!isEnumValue(input.asset, MARKET_GOLDEN_SCENARIO_ASSETS)) e.push('asset'); if (!isEnumValue(input.category, MARKET_GOLDEN_SCENARIO_CATEGORIES)) e.push('category'); if (!isBoolean(input.pass)) e.push('pass'); if (!isEnumValue(input.observedDirection, WEIGHTED_EVIDENCE_DIRECTIONS)) e.push('observedDirection'); if (!isEnumValue(input.expectedDirection, WEIGHTED_EVIDENCE_DIRECTIONS)) e.push('expectedDirection'); if (!isScore0to100(input.confidence)) e.push('confidence'); if (!isEnumValue(input.confidenceTier, MARKET_CONFIDENCE_CALIBRATION_TIERS)) e.push('confidenceTier'); if (!isEnumValue(input.confidenceSource, confidenceSources)) e.push('confidenceSource'); if (!enumArray(input.contradictionFamilies, MARKET_CONTRADICTION_FAMILIES)) e.push('contradictionFamilies'); if (!isEnumValue(input.priceReactionStatus, MARKET_PRICE_REACTION_STATUSES)) e.push('priceReactionStatus'); if (!enumArray(input.providerReliabilityWarnings, MARKET_PROVIDER_RELIABILITY_WARNINGS)) e.push('providerReliabilityWarnings'); for (const key of ['requiredReasonCodesPresent','requiredWarningsPresent','forbiddenWarningsAbsent','expectedFamiliesPresent','confidenceExpectationMet','severityExpectationMet','priceReactionExpectationMet','priceReactionWarningsPresent','providerWarningsPresent','providerFlagsMet','priceReactionConfidenceEffectMet']) if (!isBoolean(input[key])) e.push(key); if (!strings(input.missingReasonCodes)) e.push('missingReasonCodes'); if (!isEnumValue(input.observedSeverity, MARKET_CONTRADICTION_SEVERITIES)) e.push('observedSeverity'); if (!enumArray(input.missingPriceReactionWarnings, MARKET_PRICE_REACTION_WARNINGS)) e.push('missingPriceReactionWarnings'); if (!enumArray(input.missingProviderWarnings, MARKET_PROVIDER_RELIABILITY_WARNINGS)) e.push('missingProviderWarnings'); if (!enumArray(input.failedProviderExpectationFlags, providerFlags)) e.push('failedProviderExpectationFlags'); if (!strings(input.reasonCodes)) e.push('reasonCodes'); if (input.requiredReasonCodesPresent === true && Array.isArray(input.missingReasonCodes) && input.missingReasonCodes.length > 0) e.push('missingReasonCodes_cross_field'); if (input.priceReactionWarningsPresent === true && Array.isArray(input.missingPriceReactionWarnings) && input.missingPriceReactionWarnings.length > 0) e.push('missingPriceReactionWarnings_cross_field'); if (input.providerWarningsPresent === true && Array.isArray(input.missingProviderWarnings) && input.missingProviderWarnings.length > 0) e.push('missingProviderWarnings_cross_field'); if (input.providerFlagsMet === true && Array.isArray(input.failedProviderExpectationFlags) && input.failedProviderExpectationFlags.length > 0) e.push('failedProviderExpectationFlags_cross_field'); if (input.pass === true && ['requiredReasonCodesPresent','requiredWarningsPresent','forbiddenWarningsAbsent','expectedFamiliesPresent','confidenceExpectationMet','severityExpectationMet','priceReactionExpectationMet','priceReactionWarningsPresent','providerWarningsPresent','providerFlagsMet','priceReactionConfidenceEffectMet'].some((key) => input[key] !== true)) e.push('pass_binding_diagnostic_mismatch'); if (input.pass === true && ((Array.isArray(input.missingReasonCodes) && input.missingReasonCodes.length > 0) || (Array.isArray(input.missingPriceReactionWarnings) && input.missingPriceReactionWarnings.length > 0) || (Array.isArray(input.missingProviderWarnings) && input.missingProviderWarnings.length > 0) || (Array.isArray(input.failedProviderExpectationFlags) && input.failedProviderExpectationFlags.length > 0))) e.push('pass_missing_arrays_not_empty'); if (isScore0to100(input.confidence) && isEnumValue(input.confidenceSource, confidenceSources) && input.confidenceTier !== marketConfidenceTierForScore(Number(input.confidence))) e.push('confidence_tier_mismatch'); if (!isNonEmptyString(input.rationale) || !noAdvice(input.rationale)) e.push('rationale'); { const rr=validateExpectedMarketReasoningModuleReadiness(input.readiness,'golden_scenarios','readiness.'); if(rr.ok===false)e.push(...rr.errors); } return e.length ? fail(e) : pass(input as MarketGoldenScenarioAcceptanceResult); }
export function validateMarketGoldenScenarioAcceptanceReport(input: unknown): SchemaValidationResult<MarketGoldenScenarioAcceptanceReport> { if (!isObjectRecord(input)) return fail(['must be object']); const e: string[] = []; if (!isIsoDateString(input.generatedAt)) e.push('generatedAt'); if (!nonNegativeInteger(input.totalScenarios)) e.push('totalScenarios'); if (!nonNegativeInteger(input.passedCount)) e.push('passedCount'); if (!nonNegativeInteger(input.failedCount)) e.push('failedCount'); if (!strings(input.missingCoverage)) e.push('missingCoverage'); if (!strings(input.warnings)) e.push('warnings'); const assetTotal = completeCoverageRecord(input.perAssetCoverage, MARKET_GOLDEN_SCENARIO_ASSETS, 'perAssetCoverage', e); const categoryTotal = completeCoverageRecord(input.perCategoryCoverage, MARKET_GOLDEN_SCENARIO_CATEGORIES, 'perCategoryCoverage', e); const total = nonNegativeInteger(input.totalScenarios) ? Number(input.totalScenarios) : -1; if (total >= 0 && assetTotal !== total) e.push('perAssetCoverage.total'); if (total >= 0 && categoryTotal !== total) e.push('perCategoryCoverage.total'); if (!Array.isArray(input.results) || input.results.length !== input.totalScenarios) e.push('results'); else { input.results.forEach((x) => { const r = validateMarketGoldenScenarioAcceptanceResult(x); if (r.ok === false) e.push(...r.errors); }); const passed = input.results.filter((x) => isObjectRecord(x) && x.pass === true).length; const failed = input.results.filter((x) => isObjectRecord(x) && x.pass === false).length; if (nonNegativeInteger(input.passedCount) && input.passedCount !== passed) e.push('passedCount_mismatch'); if (nonNegativeInteger(input.failedCount) && input.failedCount !== failed) e.push('failedCount_mismatch'); if (total >= 0 && passed + failed !== total) e.push('pass_fail_total_mismatch'); } if (nonNegativeInteger(input.passedCount) && nonNegativeInteger(input.failedCount) && total >= 0 && input.passedCount + input.failedCount !== total) e.push('count_total_mismatch'); { const rr=validateExpectedMarketReasoningModuleReadiness(input.readiness,'golden_scenarios','readiness.'); if(rr.ok===false)e.push(...rr.errors); } return e.length ? fail(e) : pass(input as MarketGoldenScenarioAcceptanceReport); }
export function validateMarketGoldenScenarioRule(input: unknown): SchemaValidationResult<MarketGoldenScenarioRule> { if (!isObjectRecord(input)) return fail(['must be object']); const e: string[] = []; if (!isNonEmptyString(input.ruleId)) e.push('ruleId'); if (!isNonEmptyString(input.engine)) e.push('engine'); if (!isNonEmptyString(input.rationale) || !noAdvice(input.rationale)) e.push('rationale'); if (!Array.isArray(input.requiredScenarioIds) || input.requiredScenarioIds.length === 0) e.push('requiredScenarioIds'); return e.length ? fail(e) : pass(input as MarketGoldenScenarioRule); }
export function exactMembers(items: unknown, expected: readonly string[]): boolean { return Array.isArray(items)&&items.length===expected.length&&new Set(items).size===items.length&&expected.every((x)=>items.includes(x)); }
export function validateMarketGoldenScenarioRuleSetSnapshot(input: unknown): SchemaValidationResult<MarketGoldenScenarioRuleSetSnapshot> { if (!isObjectRecord(input)) return fail(['must be object']); const e: string[] = []; if (!Array.isArray(input.rules) || input.rules.length === 0) e.push('rules'); else input.rules.forEach((x) => { const r = validateMarketGoldenScenarioRule(x); if (r.ok === false) e.push(...r.errors); }); if (!exactMembers(input.launchTradableAssets, TRADING_ASSET_COVERAGE)) e.push('launchTradableAssets'); if (!exactMembers(input.diagnosticAssets, MARKET_REASONING_DIAGNOSTIC_ASSETS)) e.push('diagnosticAssets'); if (!exactMembers(input.reasoningAssets, MARKET_GOLDEN_SCENARIO_ASSETS)) e.push('reasoningAssets'); { const rr=validateExpectedMarketReasoningModuleReadiness(input.readiness,'golden_scenarios','readiness.'); if(rr.ok===false)e.push(...rr.errors); } return e.length ? fail(e) : pass(input as MarketGoldenScenarioRuleSetSnapshot); }
export function validateMarketGoldenScenarioCoverageReport(input: unknown): SchemaValidationResult<MarketGoldenScenarioCoverageReport> { if (!isObjectRecord(input)) return fail(['must be object']); const e: string[] = []; const assetsCovered = Array.isArray(input.assetsCovered) ? input.assetsCovered : []; if (MARKET_GOLDEN_SCENARIO_ASSETS.some((x) => !assetsCovered.includes(x))) e.push('all 14 reasoning assets must be covered'); const enginesCovered = strings(input.enginesCovered) ? input.enginesCovered : []; if (engines.some((x) => !enginesCovered.includes(x))) e.push('major engine coverage missing'); if (strings(input.notes) && input.notes.some((x) => /exhaustive production coverage/i.test(x))) e.push('must not claim exhaustive production coverage'); { const rr=validateExpectedMarketReasoningModuleReadiness(input.readiness,'golden_scenarios','readiness.'); if(rr.ok===false)e.push(...rr.errors); } return e.length ? fail(e) : pass(input as MarketGoldenScenarioCoverageReport); }
