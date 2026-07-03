import type { MarketMacroReleaseInput, MarketMacroSurpriseCoverageReport, MarketMacroSurpriseNormalizationResult, MarketMacroSurpriseRule, MarketMacroSurpriseRuleSetSnapshot } from '@elceo/types';
import { MARKET_MACRO_CURRENCIES, MARKET_MACRO_ECONOMIC_MEANINGS, MARKET_MACRO_GROWTH_PRESSURES, MARKET_MACRO_INDICATOR_CATEGORIES, MARKET_MACRO_INDICATOR_KINDS, MARKET_MACRO_INFLATION_PRESSURES, MARKET_MACRO_POLICY_PRESSURES, MARKET_MACRO_REGIONS, MARKET_MACRO_RELEASE_IMPORTANCES, MARKET_MACRO_RISK_PRESSURES, MARKET_MACRO_SURPRISE_CONFIDENCE_TIERS, MARKET_MACRO_SURPRISE_DIRECTIONS, MARKET_MACRO_SURPRISE_REASON_CODES, MARKET_MACRO_SURPRISE_SEVERITIES, MARKET_MACRO_SURPRISE_WARNINGS } from '@elceo/types';
import { isEnumValue, isFiniteNumber, isIsoDateString, isNonEmptyString, isObjectRecord, isScore0to100, type SchemaValidationResult } from './validation-utils';
import { validateExpectedMarketReasoningModuleReadiness } from './market-reasoning-readiness.schema';

const forbidden = /\b(buy|sell|hold|guaranteed profit|risk-free)\b/i;
const arr = <T extends string>(v: unknown, allowed: readonly T[]): v is T[] => Array.isArray(v) && v.every((x) => isEnumValue(x, allowed));
const numOpt = (v: unknown): boolean => v === undefined || v === null || isFiniteNumber(v);
function noAdvice(v: unknown, path: string, errors: string[]): void { if (!isNonEmptyString(v)) errors.push(`${path} must be non-empty`); else if (forbidden.test(v)) errors.push(`${path} contains forbidden advice language`); }
function tier(c: number): 'low'|'medium'|'high' { return c >= 70 ? 'high' : c >= 40 ? 'medium' : 'low'; }
function text(input: Record<string, unknown>): string { return JSON.stringify(input).toLowerCase(); }

export function validateMarketMacroReleaseInput(input: unknown, path = ''): SchemaValidationResult<MarketMacroReleaseInput> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${path}release input object required`] };
  if (!isNonEmptyString(input.releaseId)) errors.push(`${path}releaseId required`);
  if (input.indicatorKind !== undefined && input.indicatorKind !== '' && !isNonEmptyString(String(input.indicatorKind))) errors.push(`${path}indicatorKind invalid`);
  if (input.category !== undefined && input.category !== '' && !isNonEmptyString(String(input.category))) errors.push(`${path}category invalid`);
  if (input.importance !== undefined && !isEnumValue(input.importance, MARKET_MACRO_RELEASE_IMPORTANCES)) errors.push(`${path}importance invalid`);
  for (const field of ['actual','forecast','previous','revisedPrevious','historicalStandardDeviation','consensusDispersion','providerQualityScore'] as const) if (!numOpt(input[field])) errors.push(`${path}${field} must be numeric when present`);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as MarketMacroReleaseInput };
}

export function validateMarketMacroSurpriseNormalizationResult(input: unknown, path = ''): SchemaValidationResult<MarketMacroSurpriseNormalizationResult> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${path}normalization result object required`] };
  if (!isNonEmptyString(input.releaseId)) errors.push(`${path}releaseId required`);
  if (!isEnumValue(input.indicatorKind, MARKET_MACRO_INDICATOR_KINDS)) errors.push(`${path}indicatorKind invalid`);
  if (!isEnumValue(input.category, MARKET_MACRO_INDICATOR_CATEGORIES)) errors.push(`${path}category invalid`);
  if (!isEnumValue(input.region, MARKET_MACRO_REGIONS)) errors.push(`${path}region invalid`);
  if (!isEnumValue(input.currency, MARKET_MACRO_CURRENCIES)) errors.push(`${path}currency invalid`);
  for (const field of ['actual','forecast','previous','revisedPrevious','rawDelta','percentDelta'] as const) if (input[field] !== null && !isFiniteNumber(input[field])) errors.push(`${path}${field} must be number|null`);
  if (!isFiniteNumber(input.normalizedSurpriseScore) || input.normalizedSurpriseScore < -100 || input.normalizedSurpriseScore > 100) errors.push(`${path}normalizedSurpriseScore must be -100..100`);
  if (!isEnumValue(input.surpriseDirection, MARKET_MACRO_SURPRISE_DIRECTIONS)) errors.push(`${path}surpriseDirection invalid`);
  if (!isEnumValue(input.severity, MARKET_MACRO_SURPRISE_SEVERITIES)) errors.push(`${path}severity invalid`);
  if (!isEnumValue(input.economicMeaning, MARKET_MACRO_ECONOMIC_MEANINGS)) errors.push(`${path}economicMeaning invalid`);
  if (!isEnumValue(input.policyPressure, MARKET_MACRO_POLICY_PRESSURES)) errors.push(`${path}policyPressure invalid`);
  if (!isEnumValue(input.growthPressure, MARKET_MACRO_GROWTH_PRESSURES)) errors.push(`${path}growthPressure invalid`);
  if (!isEnumValue(input.inflationPressure, MARKET_MACRO_INFLATION_PRESSURES)) errors.push(`${path}inflationPressure invalid`);
  if (!isEnumValue(input.riskPressure, MARKET_MACRO_RISK_PRESSURES)) errors.push(`${path}riskPressure invalid`);
  if (!isScore0to100(input.confidence)) errors.push(`${path}confidence invalid`);
  if (!isEnumValue(input.confidenceTier, MARKET_MACRO_SURPRISE_CONFIDENCE_TIERS)) errors.push(`${path}confidenceTier invalid`);
  if (isFiniteNumber(input.confidence) && input.confidenceTier !== tier(input.confidence)) errors.push(`${path}confidenceTier must match confidence`);
  if (!arr(input.reasonCodes, MARKET_MACRO_SURPRISE_REASON_CODES)) errors.push(`${path}reasonCodes invalid`);
  if (!arr(input.warnings, MARKET_MACRO_SURPRISE_WARNINGS)) errors.push(`${path}warnings invalid`);
  if (input.actual === null && Array.isArray(input.warnings) && !input.warnings.includes('missing_actual')) errors.push(`${path}missing_actual warning required`);
  if (input.forecast === null && Array.isArray(input.warnings) && !input.warnings.includes('missing_forecast')) errors.push(`${path}missing_forecast warning required`);
  if (input.comparisonBasis === 'actual_vs_previous_fallback' && Array.isArray(input.warnings) && !input.warnings.includes('previous_used_without_forecast')) errors.push(`${path}previous fallback warning required`);
  if (input.forecast === null && isFiniteNumber(input.confidence) && input.confidence > 55) errors.push(`${path}missing forecast confidence cap exceeded`);
  const rawDelta = isFiniteNumber(input.rawDelta) ? input.rawDelta : null;
  if ((input.indicatorKind === 'unemployment_rate' || input.indicatorKind === 'jobless_claims') && rawDelta !== null && rawDelta > 0 && input.economicMeaning !== 'weaker_labor') errors.push(`${path}labor inverse interpretation required`);
  if (input.indicatorKind === 'policy_rate_decision' && rawDelta !== null && rawDelta > 0 && input.economicMeaning !== 'hawkish_policy_surprise') errors.push(`${path}rate upside must be hawkish`);
  if (input.indicatorKind === 'policy_rate_decision' && rawDelta !== null && rawDelta < 0 && input.economicMeaning !== 'dovish_policy_surprise') errors.push(`${path}rate downside must be dovish`);
  if (!Array.isArray(input.warnings) || !input.warnings.includes('historical_distribution_missing')) errors.push(`${path}must not claim historical z-score without distribution`);
  noAdvice(input.rationale, `${path}rationale`, errors);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as MarketMacroSurpriseNormalizationResult };
}

export function validateMarketMacroSurpriseRule(input: unknown, path = ''): SchemaValidationResult<MarketMacroSurpriseRule> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${path}rule object required`] };
  if (!isNonEmptyString(input.ruleId)) errors.push(`${path}ruleId required`);
  if (!arr(input.indicatorKinds, MARKET_MACRO_INDICATOR_KINDS)) errors.push(`${path}indicatorKinds invalid`);
  if (!isEnumValue(input.category, MARKET_MACRO_INDICATOR_CATEGORIES)) errors.push(`${path}category invalid`);
  if (typeof input.inverted !== 'boolean') errors.push(`${path}inverted required`);
  if (!arr(input.economicMeanings, MARKET_MACRO_ECONOMIC_MEANINGS)) errors.push(`${path}economicMeanings invalid`);
  if (!arr(input.reasonCodes, MARKET_MACRO_SURPRISE_REASON_CODES)) errors.push(`${path}reasonCodes invalid`);
  if (!arr(input.warnings, MARKET_MACRO_SURPRISE_WARNINGS)) errors.push(`${path}warnings invalid`);
  noAdvice(input.rationale, `${path}rationale`, errors);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as MarketMacroSurpriseRule };
}

export function validateMarketMacroSurpriseCoverageReport(input: unknown, path = ''): SchemaValidationResult<MarketMacroSurpriseCoverageReport> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${path}coverage report object required`] };
  if (!isIsoDateString(input.generatedAt)) errors.push(`${path}generatedAt invalid`);
  if (!arr(input.representedIndicatorKinds, MARKET_MACRO_INDICATOR_KINDS)) errors.push(`${path}representedIndicatorKinds invalid`);
  if (!arr(input.representedCategories, MARKET_MACRO_INDICATOR_CATEGORIES)) errors.push(`${path}representedCategories invalid`);
  if (!arr(input.warnings, MARKET_MACRO_SURPRISE_WARNINGS)) errors.push(`${path}warnings invalid`);
  if (!Array.isArray(input.notes) || input.notes.some((n) => !isNonEmptyString(n) || forbidden.test(n))) errors.push(`${path}notes invalid`); const rr=validateExpectedMarketReasoningModuleReadiness(input.readiness,'macro_surprise',`${path}readiness.`); if(rr.ok===false) errors.push(...rr.errors);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as MarketMacroSurpriseCoverageReport };
}

export function validateMarketMacroSurpriseRuleSetSnapshot(input: unknown, path = ''): SchemaValidationResult<MarketMacroSurpriseRuleSetSnapshot> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${path}snapshot object required`] };
  if (!isIsoDateString(input.generatedAt)) errors.push(`${path}generatedAt invalid`);
  if (!Array.isArray(input.rules) || input.rules.length === 0) errors.push(`${path}rules required`); else input.rules.forEach((rule, i) => { const vr = validateMarketMacroSurpriseRule(rule, `${path}rules[${i}].`); if ('errors' in vr) errors.push(...vr.errors); });
  const cr = validateMarketMacroSurpriseCoverageReport(input.coverageReport, `${path}coverageReport.`); if ('errors' in cr) errors.push(...cr.errors);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as MarketMacroSurpriseRuleSetSnapshot };
}