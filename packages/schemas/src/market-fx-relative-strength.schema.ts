import type { MarketFxCurrencyPressureComponent, MarketFxCurrencyPressureSnapshot, MarketFxRelativeStrengthCoverageReport, MarketFxRelativeStrengthInput, MarketFxRelativeStrengthResult, MarketFxRelativeStrengthRule, MarketFxRelativeStrengthRuleSetSnapshot } from '@elceo/types';
import { MARKET_FX_CURRENCY_CODES, MARKET_FX_CURRENCY_PRESSURE_COMPONENT_KINDS, MARKET_FX_CURRENCY_PRESSURE_DIRECTIONS, MARKET_FX_CURRENCY_PRESSURE_SOURCES, MARKET_FX_PAIR_ASSETS, MARKET_FX_RELATIVE_PAIR_DIRECTIONS, MARKET_FX_RELATIVE_STRENGTH_CONFIDENCE_TIERS, MARKET_FX_RELATIVE_STRENGTH_REASON_CODES, MARKET_FX_RELATIVE_STRENGTH_WARNINGS } from '@elceo/types';
import { isEnumValue, isIsoDateString, isNonEmptyString, isObjectRecord, isScore0to100, type SchemaValidationResult } from './validation-utils';

const forbidden = /\b(buy|sell|hold|guaranteed profit|risk-free)\b/i;
const orientation = {
  eur_usd: { base: 'EUR', quote: 'USD' },
  gbp_usd: { base: 'GBP', quote: 'USD' },
  usd_jpy: { base: 'USD', quote: 'JPY' },
  usd_chf: { base: 'USD', quote: 'CHF' },
  aud_usd: { base: 'AUD', quote: 'USD' },
  nzd_usd: { base: 'NZD', quote: 'USD' },
  usd_cad: { base: 'USD', quote: 'CAD' },
  dxy: { base: 'USD', quote: 'EUR' }
} as const;
const arr = <T extends string>(v: unknown, allowed: readonly T[]): v is T[] => Array.isArray(v) && v.every((x) => isEnumValue(x, allowed));
const strArr = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => isNonEmptyString(x));
const num = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
function noAdvice(v: unknown, path: string, errors: string[]): void { if (!isNonEmptyString(v)) errors.push(`${path} required`); else if (forbidden.test(v)) errors.push(`${path} contains forbidden recommendation language`); }
function tierFor(c: number): 'low'|'medium'|'high' { return c >= 70 ? 'high' : c >= 40 ? 'medium' : 'low'; }
function isPair(v: unknown): v is keyof typeof orientation { return typeof v === 'string' && (v === 'dxy' || (MARKET_FX_PAIR_ASSETS as readonly string[]).includes(v)); }

export function validateMarketFxCurrencyPressureComponent(input: unknown, path = ''): SchemaValidationResult<MarketFxCurrencyPressureComponent> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${path}component object required`] };
  if (!isNonEmptyString(input.componentId)) errors.push(`${path}componentId required`);
  if (!isEnumValue(input.currency, MARKET_FX_CURRENCY_CODES)) errors.push(`${path}currency invalid`);
  if (!isEnumValue(input.kind, MARKET_FX_CURRENCY_PRESSURE_COMPONENT_KINDS)) errors.push(`${path}kind invalid`);
  if (!isEnumValue(input.direction, MARKET_FX_CURRENCY_PRESSURE_DIRECTIONS)) errors.push(`${path}direction invalid`);
  if (!num(input.score, -100, 100)) errors.push(`${path}score must be -100 to 100`);
  if (!isScore0to100(input.confidence)) errors.push(`${path}confidence must be 0-100`);
  if (!isEnumValue(input.source, MARKET_FX_CURRENCY_PRESSURE_SOURCES)) errors.push(`${path}source invalid`);
  if (!strArr(input.evidenceIds)) errors.push(`${path}evidenceIds invalid`);
  if (!arr(input.reasonCodes, MARKET_FX_RELATIVE_STRENGTH_REASON_CODES)) errors.push(`${path}reasonCodes invalid`);
  if (!arr(input.warnings, MARKET_FX_RELATIVE_STRENGTH_WARNINGS)) errors.push(`${path}warnings invalid`);
  noAdvice(input.rationale, `${path}rationale`, errors);
  if ((input.kind === 'inflation_surprise_pending' || input.kind === 'growth_surprise_pending' || input.kind === 'labor_market_surprise_pending') && !Array.isArray(input.warnings)) errors.push(`${path}macro surprise pending warning required`);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as MarketFxCurrencyPressureComponent };
}

export function validateMarketFxCurrencyPressureSnapshot(input: unknown, path = ''): SchemaValidationResult<MarketFxCurrencyPressureSnapshot> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${path}snapshot object required`] };
  if (!isEnumValue(input.currency, MARKET_FX_CURRENCY_CODES)) errors.push(`${path}currency invalid`);
  if (!num(input.pressureScore, -100, 100)) errors.push(`${path}pressureScore must be -100 to 100`);
  if (!isEnumValue(input.pressureDirection, MARKET_FX_CURRENCY_PRESSURE_DIRECTIONS)) errors.push(`${path}pressureDirection invalid`);
  if (typeof input.componentCount !== 'number' || input.componentCount < 0) errors.push(`${path}componentCount invalid`);
  if (!arr(input.representedKinds, MARKET_FX_CURRENCY_PRESSURE_COMPONENT_KINDS)) errors.push(`${path}representedKinds invalid`);
  if (!Array.isArray(input.components)) errors.push(`${path}components required`); else input.components.forEach((c, i) => { const vc = validateMarketFxCurrencyPressureComponent(c, `${path}components[${i}].`); if ('errors' in vc) errors.push(...vc.errors); });
  if (!arr(input.warnings, MARKET_FX_RELATIVE_STRENGTH_WARNINGS)) errors.push(`${path}warnings invalid`);
  noAdvice(input.rationale, `${path}rationale`, errors);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as MarketFxCurrencyPressureSnapshot };
}

export function validateMarketFxRelativeStrengthInput(input: unknown, path = ''): SchemaValidationResult<MarketFxRelativeStrengthInput> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${path}input object required`] };
  if (!isPair(input.pairAsset)) errors.push(`${path}pairAsset invalid`);
  if (input.asOfIso !== undefined && !isIsoDateString(input.asOfIso)) errors.push(`${path}asOfIso invalid`);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as MarketFxRelativeStrengthInput };
}

export function validateMarketFxRelativeStrengthResult(input: unknown, path = ''): SchemaValidationResult<MarketFxRelativeStrengthResult> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${path}result object required`] };
  if (!isPair(input.pairAsset)) errors.push(`${path}pairAsset invalid`);
  if (!isEnumValue(input.baseCurrency, MARKET_FX_CURRENCY_CODES)) errors.push(`${path}baseCurrency invalid`);
  if (!isEnumValue(input.quoteCurrency, MARKET_FX_CURRENCY_CODES)) errors.push(`${path}quoteCurrency invalid`);
  if (input.baseCurrency === input.quoteCurrency) errors.push(`${path}baseCurrency and quoteCurrency must differ`);
  if (isPair(input.pairAsset)) {
    const expected = orientation[input.pairAsset];
    if (input.baseCurrency !== expected.base || input.quoteCurrency !== expected.quote) errors.push(`${path}base/quote orientation mismatch`);
  }
  const bp = validateMarketFxCurrencyPressureSnapshot(input.basePressure, `${path}basePressure.`); if ('errors' in bp) errors.push(...bp.errors);
  const qp = validateMarketFxCurrencyPressureSnapshot(input.quotePressure, `${path}quotePressure.`); if ('errors' in qp) errors.push(...qp.errors);
  if (!num(input.netPressureScore, -100, 100)) errors.push(`${path}netPressureScore must be -100 to 100`);
  if (!isEnumValue(input.pairDirection, MARKET_FX_RELATIVE_PAIR_DIRECTIONS)) errors.push(`${path}pairDirection invalid`);
  if (!isScore0to100(input.confidence)) errors.push(`${path}confidence must be 0-100`);
  if (!isEnumValue(input.confidenceTier, MARKET_FX_RELATIVE_STRENGTH_CONFIDENCE_TIERS)) errors.push(`${path}confidenceTier invalid`);
  if (typeof input.confidence === 'number' && input.confidenceTier !== tierFor(input.confidence)) errors.push(`${path}confidenceTier range mismatch`);
  if (!Array.isArray(input.components)) errors.push(`${path}components required`); else input.components.forEach((c, i) => { const vc = validateMarketFxCurrencyPressureComponent(c, `${path}components[${i}].`); if ('errors' in vc) errors.push(...vc.errors); });
  if (!arr(input.reasonCodes, MARKET_FX_RELATIVE_STRENGTH_REASON_CODES)) errors.push(`${path}reasonCodes invalid`);
  if (!arr(input.warnings, MARKET_FX_RELATIVE_STRENGTH_WARNINGS)) errors.push(`${path}warnings invalid`);
  if (!strArr(input.appliedRuleIds)) errors.push(`${path}appliedRuleIds invalid`);
  if (typeof input.requiresMacroSurpriseNormalization !== 'boolean') errors.push(`${path}requiresMacroSurpriseNormalization required`);
  if (typeof input.requiresPriceConfirmation !== 'boolean') errors.push(`${path}requiresPriceConfirmation required`);
  if (!['fixture_only','partial','pending_provider_activation','diagnostic_limited'].includes(String(input.providerCoverageStatus))) errors.push(`${path}providerCoverageStatus invalid`);
  noAdvice(input.rationale, `${path}rationale`, errors);
  if (isObjectRecord(input.basePressure) && input.basePressure.componentCount === 0 && !Array.isArray(input.warnings)) errors.push(`${path}missing base pressure warning required`);
  if (isObjectRecord(input.quotePressure) && input.quotePressure.componentCount === 0 && !Array.isArray(input.warnings)) errors.push(`${path}missing quote pressure warning required`);
  if ((input.requiresMacroSurpriseNormalization !== true) && JSON.stringify(input).includes('surprise_pending')) errors.push(`${path}macro surprise fields must remain pending unless R4 exists`);
  if (input.pairAsset === 'dxy' && input.providerCoverageStatus !== 'diagnostic_limited') errors.push(`${path}DXY must be limited diagnostic without basket weights`);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as MarketFxRelativeStrengthResult };
}

export function validateMarketFxRelativeStrengthCoverageReport(input: unknown, path = ''): SchemaValidationResult<MarketFxRelativeStrengthCoverageReport> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${path}coverage object required`] };
  if (!isIsoDateString(input.generatedAt)) errors.push(`${path}generatedAt invalid`);
  if (!arr(input.representedPairAssets, MARKET_FX_PAIR_ASSETS) || input.representedPairAssets.length !== MARKET_FX_PAIR_ASSETS.length) errors.push(`${path}representedPairAssets invalid`);
  if (!Array.isArray(input.optionalDiagnostics) || !input.optionalDiagnostics.every((x) => x === 'dxy')) errors.push(`${path}optionalDiagnostics invalid`);
  if (input.pairCount !== MARKET_FX_PAIR_ASSETS.length) errors.push(`${path}pairCount invalid`);
  if (!arr(input.currencies, MARKET_FX_CURRENCY_CODES)) errors.push(`${path}currencies invalid`);
  if (input.dxyCoverage !== 'limited_diagnostic' && input.dxyCoverage !== 'not_enabled') errors.push(`${path}dxyCoverage invalid`);
  const pendingPhases = Array.isArray(input.pendingPhases) ? input.pendingPhases : [];
  if (!Array.isArray(input.pendingPhases) || !['R4','R5','R6','R7','provider_reliability'].every((p) => pendingPhases.includes(p))) errors.push(`${path}pending phases invalid`);
  if (!arr(input.warnings, MARKET_FX_RELATIVE_STRENGTH_WARNINGS)) errors.push(`${path}warnings invalid`);
  if (!strArr(input.notes)) errors.push(`${path}notes required`);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as MarketFxRelativeStrengthCoverageReport };
}

export function validateMarketFxRelativeStrengthRule(input: unknown, path = ''): SchemaValidationResult<MarketFxRelativeStrengthRule> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${path}rule object required`] };
  if (!isNonEmptyString(input.ruleId)) errors.push(`${path}ruleId required`);
  if (!Array.isArray(input.pairAssets) || !input.pairAssets.every(isPair)) errors.push(`${path}pairAssets invalid`);
  if (!isEnumValue(input.componentKind, MARKET_FX_CURRENCY_PRESSURE_COMPONENT_KINDS)) errors.push(`${path}componentKind invalid`);
  if (!(isEnumValue(input.sourceCurrency, MARKET_FX_CURRENCY_CODES) || input.sourceCurrency === 'pair_specific' || input.sourceCurrency === 'usd_basket')) errors.push(`${path}sourceCurrency invalid`);
  if (!['base','quote','both','diagnostic'].includes(String(input.affectedSide))) errors.push(`${path}affectedSide invalid`);
  if (!isEnumValue(input.directionWhenPositive, MARKET_FX_CURRENCY_PRESSURE_DIRECTIONS)) errors.push(`${path}directionWhenPositive invalid`);
  if (!isScore0to100(input.confidence)) errors.push(`${path}confidence invalid`);
  if (!arr(input.warnings, MARKET_FX_RELATIVE_STRENGTH_WARNINGS)) errors.push(`${path}warnings invalid`);
  if (!arr(input.reasonCodes, MARKET_FX_RELATIVE_STRENGTH_REASON_CODES)) errors.push(`${path}reasonCodes invalid`);
  noAdvice(input.rationale, `${path}rationale`, errors);
  if (Array.isArray(input.pairAssets) && input.pairAssets.includes('dxy') && input.affectedSide !== 'diagnostic') errors.push(`${path}DXY rules must be diagnostic`);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as MarketFxRelativeStrengthRule };
}

export function validateMarketFxRelativeStrengthRuleSetSnapshot(input: unknown, path = ''): SchemaValidationResult<MarketFxRelativeStrengthRuleSetSnapshot> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${path}snapshot object required`] };
  if (!isIsoDateString(input.generatedAt)) errors.push(`${path}generatedAt invalid`);
  if (!num(input.threshold, 1, 50)) errors.push(`${path}threshold invalid`);
  if (!Array.isArray(input.rules) || input.rules.length === 0) errors.push(`${path}rules required`); else input.rules.forEach((r, i) => { const vr = validateMarketFxRelativeStrengthRule(r, `${path}rules[${i}].`); if ('errors' in vr) errors.push(...vr.errors); });
  const cr = validateMarketFxRelativeStrengthCoverageReport(input.coverageReport, `${path}coverageReport.`); if ('errors' in cr) errors.push(...cr.errors);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as MarketFxRelativeStrengthRuleSetSnapshot };
}
