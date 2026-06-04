import type { MarketAssetDirectionResolutionCoverageReport, MarketAssetDirectionResolutionInput, MarketAssetDirectionResolutionResult, MarketAssetDirectionResolutionRule, MarketAssetDirectionResolutionRuleSetSnapshot } from '@elceo/types';
import { MARKET_ASSET_CAUSALITY_ASSETS, MARKET_ASSET_DIRECTION_RESOLUTION_REASON_CODES, MARKET_ASSET_DIRECTION_RESOLUTION_WARNINGS, MARKET_ASSET_DRIVER_IMPACT_POLARITIES, MARKET_ASSET_POLICY_TONES, MARKET_ASSET_RAW_DIRECTION_HINTS, MARKET_ASSET_RESOLVED_PRESSURE_TARGETS, MARKET_ASSET_RISK_REGIME_HINTS, WEIGHTED_EVIDENCE_DIRECTIONS } from '@elceo/types';
import { isEnumValue, isIsoDateString, isNonEmptyString, isObjectRecord, isScore0to100, type SchemaValidationResult } from './validation-utils';

const forbidden = /\b(buy|sell|hold|guaranteed profit|risk-free)\b/i;
const fx = new Set(['eur_usd','gbp_usd','usd_jpy','usd_chf','aud_usd','nzd_usd','usd_cad']);
const macroSurprise = /surprise|inflation|labor|growth|economic_indicator|macro_calendar|central_bank_policy|rates/i;
const priceSensitive = /real_yields|volatility_surface|market_price|event_reaction|risk_sentiment|crypto_market_structure|energy_commodities/i;
const arr = <T extends string>(v: unknown, allowed: readonly T[]): v is T[] => Array.isArray(v) && v.every((x) => isEnumValue(x, allowed));
const strArr = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => isNonEmptyString(x));
function text(v: unknown): string { return typeof v === 'string' ? v : ''; }
function noAdvice(v: unknown, path: string, errors: string[]): void { if (!isNonEmptyString(v)) errors.push(`${path} required`); else if (forbidden.test(v)) errors.push(`${path} contains forbidden recommendation language`); }
function hasContextualRule(input: Record<string, unknown>): boolean { return typeof input.pressureTarget === 'string' && input.pressureTarget !== 'unknown' && Array.isArray(input.reasonCodes) && input.reasonCodes.length > 0; }

export function validateMarketAssetDirectionResolutionInput(input: unknown, path = ''): SchemaValidationResult<MarketAssetDirectionResolutionInput> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${path}input object required`] };
  if (!isEnumValue(input.asset, MARKET_ASSET_CAUSALITY_ASSETS)) errors.push(`${path}asset must be one of the 14 causality assets`);
  if (!isNonEmptyString(input.evidenceClass)) errors.push(`${path}evidenceClass required`);
  if (input.rawHint !== undefined && !isEnumValue(input.rawHint, MARKET_ASSET_RAW_DIRECTION_HINTS)) errors.push(`${path}rawHint invalid`);
  if (input.policyTone !== undefined && !isEnumValue(input.policyTone, MARKET_ASSET_POLICY_TONES)) errors.push(`${path}policyTone invalid`);
  if (input.riskRegime !== undefined && !isEnumValue(input.riskRegime, MARKET_ASSET_RISK_REGIME_HINTS)) errors.push(`${path}riskRegime invalid`);
  if (fx.has(text(input.asset)) && /usd-only/i.test(JSON.stringify(input))) errors.push(`${path}FX input must preserve pair orientation and not collapse to USD-only`);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as MarketAssetDirectionResolutionInput };
}

export function validateMarketAssetDirectionResolutionResult(input: unknown, path = ''): SchemaValidationResult<MarketAssetDirectionResolutionResult> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${path}result object required`] };
  if (!isEnumValue(input.asset, MARKET_ASSET_CAUSALITY_ASSETS)) errors.push(`${path}asset invalid`);
  if (!isNonEmptyString(input.evidenceClass)) errors.push(`${path}evidenceClass required`);
  if (!isEnumValue(input.rawHint, MARKET_ASSET_RAW_DIRECTION_HINTS)) errors.push(`${path}rawHint invalid`);
  if (!isEnumValue(input.resolvedDirection, WEIGHTED_EVIDENCE_DIRECTIONS)) errors.push(`${path}resolvedDirection invalid`);
  if (!isEnumValue(input.pressureTarget, MARKET_ASSET_RESOLVED_PRESSURE_TARGETS)) errors.push(`${path}pressureTarget invalid`);
  if (!isScore0to100(input.confidence)) errors.push(`${path}confidence must be 0-100`);
  if (!arr(input.reasonCodes, MARKET_ASSET_DIRECTION_RESOLUTION_REASON_CODES)) errors.push(`${path}reasonCodes invalid`);
  if (!arr(input.warnings, MARKET_ASSET_DIRECTION_RESOLUTION_WARNINGS)) errors.push(`${path}warnings invalid`);
  ['requiresSurpriseNormalization','requiresRelativeStrength','requiresPriceConfirmation'].forEach((k) => { if (typeof input[k] !== 'boolean') errors.push(`${path}${k} required`); });
  if (!strArr(input.appliedRuleIds)) errors.push(`${path}appliedRuleIds invalid`);
  noAdvice(input.rationale, `${path}rationale`, errors);
  if (fx.has(text(input.asset)) && input.requiresRelativeStrength !== true) errors.push(`${path}FX result must preserve base/quote relative-strength caveat`);
  if ((input.rawHint === 'hawkish' || input.rawHint === 'dovish') && !hasContextualRule(input)) errors.push(`${path}policy tone cannot map directly without issuer/asset-family rule`);
  if ((input.rawHint === 'risk_on' || input.rawHint === 'risk_off') && !hasContextualRule(input)) errors.push(`${path}risk regime cannot map directly without asset-family/regime rule`);
  if (macroSurprise.test(text(input.evidenceClass)) && input.requiresSurpriseNormalization !== true && !(Array.isArray(input.reasonCodes) && input.reasonCodes.includes('normalized_macro_surprise_applied'))) errors.push(`${path}macro surprise-like event must retain pending surprise-normalization flag`);
  if (priceSensitive.test(text(input.evidenceClass)) && input.requiresPriceConfirmation !== true) errors.push(`${path}price-sensitive event must retain price-confirmation flag`);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as MarketAssetDirectionResolutionResult };
}

export function validateMarketAssetDirectionResolutionRule(input: unknown, path = ''): SchemaValidationResult<MarketAssetDirectionResolutionRule> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${path}rule object required`] };
  ['ruleId','assetFamily','pressureTarget'].forEach((k) => { if (!isNonEmptyString(input[k])) errors.push(`${path}${k} required`); });
  if (!strArr(input.evidenceClasses)) errors.push(`${path}evidenceClasses required`);
  if (!arr(input.rawHints, MARKET_ASSET_RAW_DIRECTION_HINTS)) errors.push(`${path}rawHints invalid`);
  if (!strArr(input.driverKinds)) errors.push(`${path}driverKinds required`);
  if (!isEnumValue(input.output, WEIGHTED_EVIDENCE_DIRECTIONS)) errors.push(`${path}output invalid`);
  if (!isScore0to100(input.confidence)) errors.push(`${path}confidence invalid`);
  noAdvice(input.rationale, `${path}rationale`, errors);
  if ((input.rawHints as unknown[] | undefined)?.some((x) => x === 'hawkish' || x === 'dovish') && input.requiresIssuerOrAffectedSide !== true) errors.push(`${path}policy rule must reference issuer or affected side`);
  if ((input.rawHints as unknown[] | undefined)?.some((x) => x === 'risk_on' || x === 'risk_off') && input.assetFamily === 'all') errors.push(`${path}risk rule must be asset-family specific`);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as MarketAssetDirectionResolutionRule };
}

export function validateMarketAssetDirectionResolutionCoverageReport(input: unknown, path = ''): SchemaValidationResult<MarketAssetDirectionResolutionCoverageReport> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${path}coverage object required`] };
  if (!isIsoDateString(input.generatedAt)) errors.push(`${path}generatedAt invalid`);
  if (input.launchAssetCount !== MARKET_ASSET_CAUSALITY_ASSETS.length) errors.push(`${path}launchAssetCount invalid`);
  if (!Array.isArray(input.representedAssets) || input.representedAssets.length !== MARKET_ASSET_CAUSALITY_ASSETS.length) errors.push(`${path}representedAssets invalid`);
  if (input.genericDirectionPrimaryPathDisabled !== true) errors.push(`${path}generic path must be disabled`);
  const pendingPhases = Array.isArray(input.pendingPhases) ? input.pendingPhases : [];
  if (!Array.isArray(input.pendingPhases) || !['R3','R4','R7'].every((p) => pendingPhases.includes(p))) errors.push(`${path}R3/R4/R7 must remain pending`);
  if (!arr(input.warnings, MARKET_ASSET_DIRECTION_RESOLUTION_WARNINGS)) errors.push(`${path}warnings invalid`);
  if (!strArr(input.notes)) errors.push(`${path}notes required`);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as MarketAssetDirectionResolutionCoverageReport };
}

export function validateMarketAssetDirectionResolutionRuleSetSnapshot(input: unknown, path = ''): SchemaValidationResult<MarketAssetDirectionResolutionRuleSetSnapshot> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${path}snapshot object required`] };
  if (!isIsoDateString(input.generatedAt)) errors.push(`${path}generatedAt invalid`);
  if (!Array.isArray(input.rules) || input.rules.length === 0) errors.push(`${path}rules required`); else input.rules.forEach((r, i) => { const vr = validateMarketAssetDirectionResolutionRule(r, `${path}rules[${i}].`); if ('errors' in vr) errors.push(...vr.errors); });
  const cr = validateMarketAssetDirectionResolutionCoverageReport(input.coverageReport, `${path}coverageReport.`); if ('errors' in cr) errors.push(...cr.errors);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as MarketAssetDirectionResolutionRuleSetSnapshot };
}
