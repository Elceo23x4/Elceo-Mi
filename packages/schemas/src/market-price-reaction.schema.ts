import type { MarketPriceCandle, MarketPriceReactionCoverageReport, MarketPriceReactionInput, MarketPriceReactionResult, MarketPriceReactionRule, MarketPriceReactionRuleSetSnapshot, MarketPriceReactionWindow } from '@elceo/types';
import { EVIDENCE_WEIGHT_HORIZONS, MARKET_ASSET_CAUSALITY_ASSETS, MARKET_PRICE_REACTION_DIRECTIONS, MARKET_PRICE_REACTION_EVENT_KINDS, MARKET_PRICE_REACTION_IMPULSE_CLASSES, MARKET_PRICE_REACTION_REASON_CODES, MARKET_PRICE_REACTION_STATUSES, MARKET_PRICE_REACTION_VOLATILITY_BASES, MARKET_PRICE_REACTION_WARNINGS, MARKET_PRICE_REACTION_WINDOW_KINDS } from '@elceo/types';
import { isEnumValue, isFiniteNumber, isIsoDateString, isNonEmptyString, isObjectRecord, isScore0to100, type SchemaValidationResult } from './validation-utils';

const forbidden = /\b(buy|sell|hold|guaranteed profit|risk-free)\b/i;
const arr = <T extends string>(v: unknown, allowed: readonly T[]): v is T[] => Array.isArray(v) && v.every((x) => isEnumValue(x, allowed));
function advice(v: unknown, errors: string[], p: string): void { if (typeof v === 'string' && forbidden.test(v)) errors.push(`${p} contains forbidden advice language`); }
function pending(input: Record<string, unknown>, errors: string[], p: string): void {
  if (input.complete !== false) errors.push(`${p}complete must remain false`);
  if (!isObjectRecord(input.pending)) errors.push(`${p}pending required`);
  else for (const k of ['providerReliabilityExpansion','goldenScenarioExpansion','empiricalBacktesting'] as const) if (input.pending[k] !== true) errors.push(`${p}pending.${k} must remain true`);
}
function numeric(input: Record<string, unknown>, keys: readonly string[], errors: string[], p: string): void { for (const k of keys) if (!isFiniteNumber(input[k])) errors.push(`${p}${k} must be finite number`); }

export function validateMarketPriceCandle(input: unknown, p = ''): SchemaValidationResult<MarketPriceCandle> {
  const e: string[] = []; if (!isObjectRecord(input)) return { ok:false, errors:[`${p}MarketPriceCandle must be object`] };
  if (!isIsoDateString(input.timestamp)) e.push(`${p}timestamp must be ISO-like string`);
  numeric(input, ['open','high','low','close'], e, p);
  if (isFiniteNumber(input.high) && isFiniteNumber(input.open) && isFiniteNumber(input.close) && input.high < Math.max(input.open, input.close)) e.push(`${p}high must be >= max(open, close)`);
  if (isFiniteNumber(input.low) && isFiniteNumber(input.open) && isFiniteNumber(input.close) && input.low > Math.min(input.open, input.close)) e.push(`${p}low must be <= min(open, close)`);
  if (isFiniteNumber(input.high) && isFiniteNumber(input.low) && input.high < input.low) e.push(`${p}high must be >= low`);
  if (input.volume !== undefined && input.volume !== null && !isFiniteNumber(input.volume)) e.push(`${p}volume must be number|null`);
  return e.length ? { ok:false, errors:e } : { ok:true, value:input as MarketPriceCandle };
}

export function validateMarketPriceReactionInput(input: unknown, p = ''): SchemaValidationResult<MarketPriceReactionInput> {
  const e: string[] = []; if (!isObjectRecord(input)) return { ok:false, errors:[`${p}MarketPriceReactionInput must be object`] };
  if (!isEnumValue(input.asset, MARKET_ASSET_CAUSALITY_ASSETS)) e.push(`${p}asset invalid`);
  if (!isEnumValue(input.horizon, EVIDENCE_WEIGHT_HORIZONS)) e.push(`${p}horizon invalid`);
  if (!isEnumValue(input.eventKind, MARKET_PRICE_REACTION_EVENT_KINDS)) e.push(`${p}eventKind invalid`);
  if (input.eventTime !== undefined && input.eventTime !== null && !isIsoDateString(input.eventTime)) e.push(`${p}eventTime invalid`);
  if (input.expectedDirection !== undefined && input.expectedDirection !== null && !isEnumValue(input.expectedDirection, MARKET_PRICE_REACTION_DIRECTIONS)) e.push(`${p}expectedDirection invalid`);
  if (!Array.isArray(input.candles)) e.push(`${p}candles must be array`); else input.candles.forEach((x, i) => { const r = validateMarketPriceCandle(x, `${p}candles[${i}].`); if (r.ok === false) e.push(...r.errors); });
  if (input.volatilityBasisPct !== undefined && input.volatilityBasisPct !== null && (!isFiniteNumber(input.volatilityBasisPct) || input.volatilityBasisPct <= 0 || input.volatilityBasisPct > 100)) e.push(`${p}volatilityBasisPct must be bounded positive number`);
  if (input.volatilityBasis !== undefined && input.volatilityBasis !== null && !isEnumValue(input.volatilityBasis, MARKET_PRICE_REACTION_VOLATILITY_BASES)) e.push(`${p}volatilityBasis invalid`);
  return e.length ? { ok:false, errors:e } : { ok:true, value:input as MarketPriceReactionInput };
}

export function validateMarketPriceReactionWindow(input: unknown, p = ''): SchemaValidationResult<MarketPriceReactionWindow> {
  const e: string[] = []; if (!isObjectRecord(input)) return { ok:false, errors:[`${p}MarketPriceReactionWindow must be object`] };
  if (!isEnumValue(input.kind, MARKET_PRICE_REACTION_WINDOW_KINDS)) e.push(`${p}kind invalid`);
  if (input.startTime !== null && !isIsoDateString(input.startTime)) e.push(`${p}startTime invalid`);
  if (input.endTime !== null && !isIsoDateString(input.endTime)) e.push(`${p}endTime invalid`);
  if (!Number.isInteger(input.candleCount) || Number(input.candleCount) < 0) e.push(`${p}candleCount invalid`);
  for (const k of ['open','high','low','close','movePct','rangePct'] as const) if (input[k] !== null && !isFiniteNumber(input[k])) e.push(`${p}${k} must be number|null`);
  return e.length ? { ok:false, errors:e } : { ok:true, value:input as MarketPriceReactionWindow };
}

export function validateMarketPriceReactionResult(input: unknown, p = ''): SchemaValidationResult<MarketPriceReactionResult> {
  const e: string[] = []; if (!isObjectRecord(input)) return { ok:false, errors:[`${p}MarketPriceReactionResult must be object`] };
  if (!isNonEmptyString(input.reactionId)) e.push(`${p}reactionId required`);
  if (!isEnumValue(input.asset, MARKET_ASSET_CAUSALITY_ASSETS)) e.push(`${p}asset invalid`);
  if (!isEnumValue(input.horizon, EVIDENCE_WEIGHT_HORIZONS)) e.push(`${p}horizon invalid`);
  if (!isEnumValue(input.eventKind, MARKET_PRICE_REACTION_EVENT_KINDS)) e.push(`${p}eventKind invalid`);
  if (input.eventTime !== null && !isIsoDateString(input.eventTime)) e.push(`${p}eventTime invalid`);
  if (!isEnumValue(input.expectedDirection, MARKET_PRICE_REACTION_DIRECTIONS)) e.push(`${p}expectedDirection invalid`);
  if (!isEnumValue(input.observedDirection, MARKET_PRICE_REACTION_DIRECTIONS)) e.push(`${p}observedDirection invalid`);
  if (!isEnumValue(input.status, MARKET_PRICE_REACTION_STATUSES)) e.push(`${p}status invalid`);
  if (!isEnumValue(input.impulseClass, MARKET_PRICE_REACTION_IMPULSE_CLASSES)) e.push(`${p}impulseClass invalid`);
  if (!isScore0to100(input.confidence)) e.push(`${p}confidence must be 0..100`);
  numeric(input, ['immediateMovePct','followThroughMovePct','volatilityAdjustedMove','wickRejectionScore','absorptionScore','reversalScore'], e, p);
  for (const k of ['volatilityAdjustedMove','wickRejectionScore','absorptionScore','reversalScore'] as const) if (isFiniteNumber(input[k]) && (input[k] < 0 || input[k] > 100)) e.push(`${p}${k} must be 0..100`);
  if (!Array.isArray(input.windows)) e.push(`${p}windows must be array`); else input.windows.forEach((x, i) => { const r = validateMarketPriceReactionWindow(x, `${p}windows[${i}].`); if (r.ok === false) e.push(...r.errors); });
  if (!arr(input.warnings, MARKET_PRICE_REACTION_WARNINGS)) e.push(`${p}warnings invalid`);
  if (!arr(input.reasonCodes, MARKET_PRICE_REACTION_REASON_CODES)) e.push(`${p}reasonCodes invalid`);
  if (!isNonEmptyString(input.rationale)) e.push(`${p}rationale required`); else advice(input.rationale, e, `${p}rationale`);
  if (input.eventTime === null && Array.isArray(input.warnings) && !input.warnings.includes('missing_event_time')) e.push(`${p}missing eventTime requires missing_event_time warning`);
  if (input.expectedDirection === 'unknown' && Array.isArray(input.warnings) && !input.warnings.includes('missing_expected_direction')) e.push(`${p}unknown expectedDirection requires missing_expected_direction warning`);
  if (input.status === 'insufficient_data' && Array.isArray(input.warnings) && !input.warnings.includes('insufficient_candles')) e.push(`${p}insufficient_data requires insufficient_candles warning`);
  pending(input, e, p);
  return e.length ? { ok:false, errors:e } : { ok:true, value:input as MarketPriceReactionResult };
}

export function validateMarketPriceReactionRule(input: unknown, p = ''): SchemaValidationResult<MarketPriceReactionRule> {
  const e: string[] = []; if (!isObjectRecord(input)) return { ok:false, errors:[`${p}MarketPriceReactionRule must be object`] };
  if (!isNonEmptyString(input.ruleId)) e.push(`${p}ruleId required`);
  if (input.asset !== undefined && !isEnumValue(input.asset, MARKET_ASSET_CAUSALITY_ASSETS)) e.push(`${p}asset invalid`);
  if (input.status !== undefined && !isEnumValue(input.status, MARKET_PRICE_REACTION_STATUSES)) e.push(`${p}status invalid`);
  if (input.warning !== undefined && !isEnumValue(input.warning, MARKET_PRICE_REACTION_WARNINGS)) e.push(`${p}warning invalid`);
  if (!arr(input.reasonCodes, MARKET_PRICE_REACTION_REASON_CODES)) e.push(`${p}reasonCodes invalid`);
  if (!isNonEmptyString(input.rationale)) e.push(`${p}rationale required`); else advice(input.rationale, e, `${p}rationale`);
  return e.length ? { ok:false, errors:e } : { ok:true, value:input as MarketPriceReactionRule };
}

export function validateMarketPriceReactionRuleSetSnapshot(input: unknown, p = ''): SchemaValidationResult<MarketPriceReactionRuleSetSnapshot> {
  const e: string[] = []; if (!isObjectRecord(input)) return { ok:false, errors:[`${p}MarketPriceReactionRuleSetSnapshot must be object`] };
  if (!isIsoDateString(input.generatedAt)) e.push(`${p}generatedAt invalid`);
  if (!Array.isArray(input.rules)) e.push(`${p}rules must be array`); else input.rules.forEach((x, i) => { const r = validateMarketPriceReactionRule(x, `${p}rules[${i}].`); if (r.ok === false) e.push(...r.errors); });
  if (!arr(input.warnings, MARKET_PRICE_REACTION_WARNINGS)) e.push(`${p}warnings invalid`);
  pending(input, e, p);
  return e.length ? { ok:false, errors:e } : { ok:true, value:input as MarketPriceReactionRuleSetSnapshot };
}

export function validateMarketPriceReactionCoverageReport(input: unknown, p = ''): SchemaValidationResult<MarketPriceReactionCoverageReport> {
  const e: string[] = []; if (!isObjectRecord(input)) return { ok:false, errors:[`${p}MarketPriceReactionCoverageReport must be object`] };
  if (!isIsoDateString(input.generatedAt)) e.push(`${p}generatedAt invalid`);
  if (!Number.isInteger(input.assetCount) || Number(input.assetCount) < 0) e.push(`${p}assetCount invalid`);
  if (!arr(input.statusCoverage, MARKET_PRICE_REACTION_STATUSES)) e.push(`${p}statusCoverage invalid`);
  if (!arr(input.windowKinds, MARKET_PRICE_REACTION_WINDOW_KINDS)) e.push(`${p}windowKinds invalid`);
  if (!arr(input.warnings, MARKET_PRICE_REACTION_WARNINGS)) e.push(`${p}warnings invalid`);
  if (!Array.isArray(input.notes) || input.notes.some((x) => typeof x !== 'string')) e.push(`${p}notes invalid`); else input.notes.forEach((x, i) => advice(x, e, `${p}notes[${i}]`));
  pending(input, e, p);
  return e.length ? { ok:false, errors:e } : { ok:true, value:input as MarketPriceReactionCoverageReport };
}
