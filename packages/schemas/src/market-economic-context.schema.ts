import type { MarketEconomicContextResolution, MarketEconomicDriverContext } from '@elceo/types';
import { MARKET_AFFECTED_CURRENCIES, MARKET_ECONOMIC_CONTEXT_RESOLUTION_SOURCES, MARKET_ECONOMIC_CONTEXT_WARNINGS, MARKET_ECONOMIC_DRIVER_DIRECTIONS, MARKET_ECONOMIC_DRIVER_KINDS, MARKET_ECONOMIC_RESOLUTION_CONFIDENCES, MARKET_ISSUER_CURRENCIES, MARKET_ISSUER_INSTITUTIONS, MARKET_ISSUER_REGIONS } from '@elceo/types';
import { isEnumValue, isObjectRecord, type SchemaValidationResult } from './validation-utils';
const arr = <T extends string>(v: unknown, allowed: readonly T[]): v is T[] => Array.isArray(v) && v.every((x) => isEnumValue(x, allowed));
const strArr = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string' && x.length > 0);
export function validateMarketEconomicContextResolution(input: unknown, path = ''): SchemaValidationResult<MarketEconomicContextResolution> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${path}economic context resolution object required`] };
  if (!isEnumValue(input.issuerInstitution, MARKET_ISSUER_INSTITUTIONS)) errors.push(`${path}issuerInstitution invalid`);
  if (!isEnumValue(input.issuerRegion, MARKET_ISSUER_REGIONS)) errors.push(`${path}issuerRegion invalid`);
  if (!isEnumValue(input.issuerCurrency, MARKET_ISSUER_CURRENCIES)) errors.push(`${path}issuerCurrency invalid`);
  if (!isEnumValue(input.eventRegion, MARKET_ISSUER_REGIONS)) errors.push(`${path}eventRegion invalid`);
  if (!arr(input.affectedCurrencies, MARKET_AFFECTED_CURRENCIES)) errors.push(`${path}affectedCurrencies invalid`);
  if (!isEnumValue(input.resolutionSource, MARKET_ECONOMIC_CONTEXT_RESOLUTION_SOURCES)) errors.push(`${path}resolutionSource invalid`);
  if (!isEnumValue(input.resolutionConfidence, MARKET_ECONOMIC_RESOLUTION_CONFIDENCES)) errors.push(`${path}resolutionConfidence invalid`);
  if (!arr(input.warnings, MARKET_ECONOMIC_CONTEXT_WARNINGS)) errors.push(`${path}warnings invalid`);
  if (!strArr(input.conflictFields)) errors.push(`${path}conflictFields invalid`);
  if (!strArr(input.ignoredIdentityFields)) errors.push(`${path}ignoredIdentityFields invalid`);
  if (Array.isArray(input.conflictFields) && input.conflictFields.length > 0 && Array.isArray(input.warnings) && !input.warnings.includes('issuer_context_conflict') && !input.warnings.includes('issuer_region_currency_conflict')) errors.push(`${path}conflict warning required`);
  if (input.resolutionSource === 'unresolved' && input.resolutionConfidence !== 'unresolved') errors.push(`${path}unresolved confidence mismatch`);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as MarketEconomicContextResolution };
}
export function validateMarketEconomicDriverContext(input: unknown, path = ''): SchemaValidationResult<MarketEconomicDriverContext> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${path}driver context object required`] };
  if (!isEnumValue(input.driverKind, MARKET_ECONOMIC_DRIVER_KINDS)) errors.push(`${path}driverKind invalid`);
  if (!isEnumValue(input.driverDirection, MARKET_ECONOMIC_DRIVER_DIRECTIONS)) errors.push(`${path}driverDirection invalid`);
  if (!arr(input.warnings, MARKET_ECONOMIC_CONTEXT_WARNINGS)) errors.push(`${path}warnings invalid`);
  if (input.driverKind !== 'unknown' && input.driverDirection === 'unknown' && Array.isArray(input.warnings) && !input.warnings.includes('driver_direction_missing')) errors.push(`${path}driver direction missing warning required`);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as MarketEconomicDriverContext };
}
