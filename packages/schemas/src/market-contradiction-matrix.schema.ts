import type { MarketContradictionCoverageReport, MarketContradictionEvidencePoint, MarketContradictionInput, MarketContradictionMatrixResult, MarketContradictionRule, MarketContradictionRuleSetSnapshot, MarketContradictionSignal } from '@elceo/types';
import { EVIDENCE_WEIGHT_HORIZONS, MARKET_ASSET_CAUSALITY_ASSETS, MARKET_CONTRADICTION_CONFIDENCE_TIERS, MARKET_CONTRADICTION_EVIDENCE_SIDES, MARKET_CONTRADICTION_FAMILIES, MARKET_CONTRADICTION_REASON_CODES, MARKET_CONTRADICTION_SEVERITIES, MARKET_CONTRADICTION_STATUSES, MARKET_CONTRADICTION_WARNINGS, MARKET_EVIDENCE_CLASSES } from '@elceo/types';
import { isBoolean, isEnumValue, isIsoDateString, isNonEmptyString, isObjectRecord, isScore0to100, isStringArray, type SchemaValidationResult } from './validation-utils';

const FORBIDDEN_ADVICE = /\b(buy|sell|hold|guaranteed profit|risk-free)\b/i;
const DRIVER_KINDS = ['real_yields','nominal_yields','central_bank_policy','policy_rate_expectations','inflation_surprise','growth_surprise','labor_market_surprise','dollar_liquidity','financial_conditions','credit_stress','risk_sentiment','volatility_surface','equity_breadth','earnings_macro','positioning_cot','futures_positioning','etf_flows','fund_flows','central_bank_demand','safe_haven_demand','geopolitical_risk','energy_commodities','oil_energy','crypto_onchain','crypto_derivatives','crypto_etf_flows','regulatory_risk','cross_market_rates','yield_differentials','intervention_risk','fiscal_risk','industrial_cycle','china_demand','commodity_terms_of_trade','liquidity_conditions','market_price_structure','event_reaction','macro_surprise','price_confirmation','provider_freshness','source_independence','dollar_strength','real_yield_pressure','breadth','funding','unknown'] as const;
const DIRECTIONS = ['bullish','bearish','neutral','mixed','unknown'] as const;
function pushAdviceError(text: unknown, errors: string[], path: string): void { if (typeof text === 'string' && FORBIDDEN_ADVICE.test(text)) errors.push(`${path} contains forbidden advice language`); }
function validateWarnings(value: unknown, errors: string[], path: string): void { if (!Array.isArray(value)) { errors.push(`${path} must contain valid contradiction warnings`); return; } const invalid = value.filter((x) => !isEnumValue(x, MARKET_CONTRADICTION_WARNINGS)); if (invalid.length > 0) errors.push(`${path} must contain valid contradiction warnings:${invalid.join(',')}`); }
function validateReasons(value: unknown, errors: string[], path: string): void { if (!Array.isArray(value) || value.some((x) => !isEnumValue(x, MARKET_CONTRADICTION_REASON_CODES))) errors.push(`${path} must contain valid contradiction reason codes`); }
function validatePending(input: Record<string, unknown>, errors: string[], path: string): void {
  if (input.complete !== false) errors.push(`${path}complete must remain false while R6/R7/provider reliability remain pending`);
  if (!isObjectRecord(input.pending)) { errors.push(`${path}pending must be object`); return; }
  if (input.pending.confidenceCalibrationR6 !== true) errors.push(`${path}pending.confidenceCalibrationR6 must remain true`);
  if (input.pending.priceReactionR7 !== true) errors.push(`${path}pending.priceReactionR7 must remain true`);
  if (input.pending.providerReliabilityExpansion !== true) errors.push(`${path}pending.providerReliabilityExpansion must remain true`);
}

export function validateMarketContradictionEvidencePoint(input: unknown, p = ''): SchemaValidationResult<MarketContradictionEvidencePoint> {
  const e: string[] = []; if (!isObjectRecord(input)) return { ok: false, errors: [`${p}MarketContradictionEvidencePoint must be object`] };
  if (!isNonEmptyString(input.evidencePointId)) e.push(`${p}evidencePointId must be non-empty string`);
  if (!isEnumValue(input.asset, MARKET_ASSET_CAUSALITY_ASSETS)) e.push(`${p}asset is invalid`);
  if (!isEnumValue(input.horizon, EVIDENCE_WEIGHT_HORIZONS)) e.push(`${p}horizon is invalid`);
  if (!isIsoDateString(input.observedAt)) e.push(`${p}observedAt invalid`);
  if (!(isEnumValue(input.evidenceClass, MARKET_EVIDENCE_CLASSES) || input.evidenceClass === 'diagnostic')) e.push(`${p}evidenceClass is invalid`);
  if (!isEnumValue(input.driverKind, DRIVER_KINDS)) e.push(`${p}driverKind is invalid`);
  if (!isEnumValue(input.side, MARKET_CONTRADICTION_EVIDENCE_SIDES)) e.push(`${p}side is invalid`);
  if (!isEnumValue(input.direction, DIRECTIONS)) e.push(`${p}direction is invalid`);
  if (!isScore0to100(input.strength)) e.push(`${p}strength must be 0..100`);
  if (!isScore0to100(input.quality)) e.push(`${p}quality must be 0..100`);
  if (!(typeof input.providerId === 'string' || input.providerId === null)) e.push(`${p}providerId must be string|null`);
  if (!(typeof input.sourceId === 'string' || input.sourceId === null)) e.push(`${p}sourceId must be string|null`);
  if (!isNonEmptyString(input.rationale)) e.push(`${p}rationale must be non-empty string`); pushAdviceError(input.rationale, e, `${p}rationale`);
  validateReasons(input.reasonCodes, e, `${p}reasonCodes`); validateWarnings(input.warnings, e, `${p}warnings`);
  return e.length ? { ok: false, errors: e } : { ok: true, value: input as MarketContradictionEvidencePoint };
}

export function validateMarketContradictionInput(input: unknown, p = ''): SchemaValidationResult<MarketContradictionInput> {
  const e: string[] = []; if (!isObjectRecord(input)) return { ok: false, errors: [`${p}MarketContradictionInput must be object`] };
  if (!isEnumValue(input.asset, MARKET_ASSET_CAUSALITY_ASSETS)) e.push(`${p}asset is invalid`);
  if (!isEnumValue(input.horizon, EVIDENCE_WEIGHT_HORIZONS)) e.push(`${p}horizon is invalid`);
  if (!isIsoDateString(input.generatedAt)) e.push(`${p}generatedAt invalid`);
  if (!Array.isArray(input.evidencePoints)) e.push(`${p}evidencePoints must be array`); else input.evidencePoints.forEach((x, i) => { const r = validateMarketContradictionEvidencePoint(x, `${p}evidencePoints[${i}].`); if (r.ok === false) e.push(...r.errors); });
  if (!isBoolean(input.priceReactionAvailable)) e.push(`${p}priceReactionAvailable must be boolean`);
  if (!isBoolean(input.providerReliabilitySupplied)) e.push(`${p}providerReliabilitySupplied must be boolean`);
  if (!isBoolean(input.sourceIndependenceVerified)) e.push(`${p}sourceIndependenceVerified must be boolean`);
  validateWarnings(input.warnings, e, `${p}warnings`);
  return e.length ? { ok: false, errors: e } : { ok: true, value: input as MarketContradictionInput };
}

export function validateMarketContradictionSignal(input: unknown, p = ''): SchemaValidationResult<MarketContradictionSignal> {
  const e: string[] = []; if (!isObjectRecord(input)) return { ok: false, errors: [`${p}MarketContradictionSignal must be object`] };
  for (const k of ['signalId','ruleId','rationale'] as const) if (!isNonEmptyString(input[k])) e.push(`${p}${k} must be non-empty string`);
  if (!isEnumValue(input.family, MARKET_CONTRADICTION_FAMILIES)) e.push(`${p}family is invalid`);
  if (!isEnumValue(input.asset, MARKET_ASSET_CAUSALITY_ASSETS)) e.push(`${p}asset is invalid`);
  if (!isEnumValue(input.horizon, EVIDENCE_WEIGHT_HORIZONS)) e.push(`${p}horizon is invalid`);
  if (!isIsoDateString(input.generatedAt)) e.push(`${p}generatedAt invalid`);
  if (!isEnumValue(input.status, MARKET_CONTRADICTION_STATUSES)) e.push(`${p}status is invalid`);
  if (!isEnumValue(input.severity, MARKET_CONTRADICTION_SEVERITIES)) e.push(`${p}severity is invalid`);
  if (!isEnumValue(input.confidenceTier, MARKET_CONTRADICTION_CONFIDENCE_TIERS)) e.push(`${p}confidenceTier is invalid`);
  if (!isStringArray(input.evidencePointIds)) e.push(`${p}evidencePointIds must be string[]`);
  validateWarnings(input.warnings, e, `${p}warnings`); validateReasons(input.reasonCodes, e, `${p}reasonCodes`); pushAdviceError(input.rationale, e, `${p}rationale`);
  const severe = input.status === 'contradiction' || input.severity === 'high' || input.severity === 'critical';
  if (severe && Array.isArray(input.evidencePointIds) && input.evidencePointIds.length < 2) e.push(`${p}high/critical contradiction requires at least two evidence points`);
  if ((input.status === 'pending_confirmation' || Array.isArray(input.reasonCodes) && input.reasonCodes.includes('price_confirmation_pending')) && Array.isArray(input.warnings) && !(input.warnings.includes('pending_price_confirmation') || input.warnings.includes('missing_price_reaction'))) e.push(`${p}pending price reaction requires pending/missing price warning`);
  return e.length ? { ok: false, errors: e } : { ok: true, value: input as MarketContradictionSignal };
}

export function validateMarketContradictionMatrixResult(input: unknown, p = ''): SchemaValidationResult<MarketContradictionMatrixResult> {
  const e: string[] = []; if (!isObjectRecord(input)) return { ok: false, errors: [`${p}MarketContradictionMatrixResult must be object`] };
  for (const k of ['resultId','rationale'] as const) if (!isNonEmptyString(input[k])) e.push(`${p}${k} must be non-empty string`);
  if (!isEnumValue(input.asset, MARKET_ASSET_CAUSALITY_ASSETS)) e.push(`${p}asset is invalid`);
  if (!isEnumValue(input.horizon, EVIDENCE_WEIGHT_HORIZONS)) e.push(`${p}horizon is invalid`);
  if (!isIsoDateString(input.generatedAt)) e.push(`${p}generatedAt invalid`);
  if (!isEnumValue(input.status, MARKET_CONTRADICTION_STATUSES)) e.push(`${p}status is invalid`);
  if (!isEnumValue(input.highestSeverity, MARKET_CONTRADICTION_SEVERITIES)) e.push(`${p}highestSeverity is invalid`);
  if (!Array.isArray(input.signals)) e.push(`${p}signals must be array`); else input.signals.forEach((x, i) => { const r = validateMarketContradictionSignal(x, `${p}signals[${i}].`); if (r.ok === false) e.push(...r.errors); });
  if (!Array.isArray(input.evidencePoints)) e.push(`${p}evidencePoints must be array`); else input.evidencePoints.forEach((x, i) => { const r = validateMarketContradictionEvidencePoint(x, `${p}evidencePoints[${i}].`); if (r.ok === false) e.push(...r.errors); });
  validateWarnings(input.warnings, e, `${p}warnings`); validateReasons(input.reasonCodes, e, `${p}reasonCodes`); validatePending(input, e, p); pushAdviceError(input.rationale, e, `${p}rationale`);
  if (input.status === 'pending_confirmation' && Array.isArray(input.warnings) && !(input.warnings.includes('pending_price_confirmation') || input.warnings.includes('missing_price_reaction'))) e.push(`${p}pending result requires pending/missing price warning`);
  return e.length ? { ok: false, errors: e } : { ok: true, value: input as MarketContradictionMatrixResult };
}

export function validateMarketContradictionRule(input: unknown, p = ''): SchemaValidationResult<MarketContradictionRule> {
  const e: string[] = []; if (!isObjectRecord(input)) return { ok: false, errors: [`${p}MarketContradictionRule must be object`] };
  if (!isNonEmptyString(input.ruleId)) e.push(`${p}ruleId must be non-empty string`);
  if (!isEnumValue(input.family, MARKET_CONTRADICTION_FAMILIES)) e.push(`${p}family is invalid`);
  if (!Array.isArray(input.assets) || input.assets.some((x) => !isEnumValue(x, MARKET_ASSET_CAUSALITY_ASSETS))) e.push(`${p}assets invalid`);
  if (!Array.isArray(input.requiredDrivers) || input.requiredDrivers.some((x) => !isEnumValue(x, DRIVER_KINDS))) e.push(`${p}requiredDrivers invalid`);
  if (!isEnumValue(input.severity, MARKET_CONTRADICTION_SEVERITIES)) e.push(`${p}severity is invalid`);
  if (!isEnumValue(input.status, MARKET_CONTRADICTION_STATUSES)) e.push(`${p}status is invalid`);
  validateWarnings(input.warnings, e, `${p}warnings`); validateReasons(input.reasonCodes, e, `${p}reasonCodes`);
  if (!isNonEmptyString(input.rationale)) e.push(`${p}rationale must be non-empty string`); pushAdviceError(input.rationale, e, `${p}rationale`);
  return e.length ? { ok: false, errors: e } : { ok: true, value: input as MarketContradictionRule };
}

export function validateMarketContradictionRuleSetSnapshot(input: unknown, p = ''): SchemaValidationResult<MarketContradictionRuleSetSnapshot> {
  const e: string[] = []; if (!isObjectRecord(input)) return { ok: false, errors: [`${p}MarketContradictionRuleSetSnapshot must be object`] };
  if (!isIsoDateString(input.generatedAt)) e.push(`${p}generatedAt invalid`);
  if (!Array.isArray(input.rules)) e.push(`${p}rules must be array`); else input.rules.forEach((x, i) => { const r = validateMarketContradictionRule(x, `${p}rules[${i}].`); if (r.ok === false) e.push(...r.errors); });
  validateWarnings(input.warnings, e, `${p}warnings`); validatePending(input, e, p);
  return e.length ? { ok: false, errors: e } : { ok: true, value: input as MarketContradictionRuleSetSnapshot };
}

export function validateMarketContradictionCoverageReport(input: unknown, p = ''): SchemaValidationResult<MarketContradictionCoverageReport> {
  const e: string[] = []; if (!isObjectRecord(input)) return { ok: false, errors: [`${p}MarketContradictionCoverageReport must be object`] };
  if (!isIsoDateString(input.generatedAt)) e.push(`${p}generatedAt invalid`);
  if (!Number.isInteger(input.familyCount) || Number(input.familyCount) < 0) e.push(`${p}familyCount must be integer >= 0`);
  if (!Number.isInteger(input.ruleCount) || Number(input.ruleCount) < 0) e.push(`${p}ruleCount must be integer >= 0`);
  if (!Array.isArray(input.coveredFamilies) || input.coveredFamilies.some((x) => !isEnumValue(x, MARKET_CONTRADICTION_FAMILIES))) e.push(`${p}coveredFamilies invalid`);
  if (!Array.isArray(input.missingFamilies) || input.missingFamilies.some((x) => !isEnumValue(x, MARKET_CONTRADICTION_FAMILIES))) e.push(`${p}missingFamilies invalid`);
  if (!isStringArray(input.notes)) e.push(`${p}notes must be string[]`); else input.notes.forEach((n, i) => pushAdviceError(n, e, `${p}notes[${i}]`));
  validateWarnings(input.warnings, e, `${p}warnings`); validatePending(input, e, p);
  return e.length ? { ok: false, errors: e } : { ok: true, value: input as MarketContradictionCoverageReport };
}
