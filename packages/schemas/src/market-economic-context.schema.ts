import type { MarketEconomicContextResolution, MarketEconomicDriverContext, MarketIssuerCurrency, MarketIssuerInstitution, MarketIssuerRegion } from '@elceo/types';
import { MARKET_AFFECTED_CURRENCIES, MARKET_ECONOMIC_CONTEXT_RESOLUTION_SOURCES, MARKET_ECONOMIC_CONTEXT_WARNINGS, MARKET_ECONOMIC_DRIVER_DIRECTIONS, MARKET_ECONOMIC_DRIVER_KINDS, MARKET_ECONOMIC_RESOLUTION_CONFIDENCES, MARKET_ISSUER_CURRENCIES, MARKET_ISSUER_INSTITUTIONS, MARKET_ISSUER_REGIONS } from '@elceo/types';
import { isEnumValue, isObjectRecord, type SchemaValidationResult } from './validation-utils';
const allowedResolutionKeys = ['issuerInstitution','issuerRegion','issuerCurrency','eventRegion','affectedCurrencies','resolutionSource','resolutionConfidence','warnings','conflictFields','ignoredIdentityFields'] as const;
const forbiddenAuthorityKeys = ['providerId','provider','source','sourceId','sourceFamily','title','note','summary','scenarioId','targetAsset','pairAsset'] as const;
const institutionMap: Partial<Record<MarketIssuerInstitution, { region: MarketIssuerRegion; currency: MarketIssuerCurrency }>> = { fed:{region:'US',currency:'USD'}, ecb:{region:'eurozone',currency:'EUR'}, boe:{region:'UK',currency:'GBP'}, boj:{region:'Japan',currency:'JPY'}, snb:{region:'Switzerland',currency:'CHF'}, rba:{region:'Australia',currency:'AUD'}, rbnz:{region:'New_Zealand',currency:'NZD'}, boc:{region:'Canada',currency:'CAD'}, pboc:{region:'China',currency:'CNY'} };
const regionCurrency: Partial<Record<MarketIssuerRegion, MarketIssuerCurrency>> = { US:'USD', eurozone:'EUR', UK:'GBP', Japan:'JPY', Switzerland:'CHF', Australia:'AUD', New_Zealand:'NZD', Canada:'CAD', China:'CNY', global:'global', other:'other', unknown:'unknown' };
const known = (v: unknown): boolean => typeof v === 'string' && v !== 'unknown' && v !== 'other' && v !== 'global';
const arr = <T extends string>(v: unknown, allowed: readonly T[]): v is T[] => Array.isArray(v) && v.every((x) => isEnumValue(x, allowed));
const strArr = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string' && x.length > 0);
export function validateMarketEconomicContextResolution(input: unknown, path = ''): SchemaValidationResult<MarketEconomicContextResolution> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${path}economic context resolution object required`] };
  for (const key of Object.keys(input)) if (!(allowedResolutionKeys as readonly string[]).includes(key)) errors.push(`${path}${key} unknown field`);
  for (const key of forbiddenAuthorityKeys) if (key in input) errors.push(`${path}${key} forbidden on canonical resolution`);
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
  const warnings = Array.isArray(input.warnings) ? input.warnings.map(String) : [];
  const conflictFields = Array.isArray(input.conflictFields) ? input.conflictFields.map(String) : [];
  const computedConflictFields: string[] = [];
  if (known(input.issuerCurrency) && known(input.issuerRegion) && regionCurrency[input.issuerRegion as MarketIssuerRegion] !== input.issuerCurrency) computedConflictFields.push('issuerCurrency','issuerRegion');
  const mapped = institutionMap[input.issuerInstitution as MarketIssuerInstitution];
  if (mapped && known(input.issuerCurrency) && mapped.currency !== input.issuerCurrency) computedConflictFields.push('issuerCurrency','issuerInstitution');
  if (mapped && known(input.issuerRegion) && mapped.region !== input.issuerRegion) computedConflictFields.push('issuerRegion','issuerInstitution');
  const computedUnique = [...new Set(computedConflictFields)];
  if (computedUnique.length > 0) {
    if (!warnings.includes('issuer_context_conflict') && !warnings.includes('issuer_region_currency_conflict')) errors.push(`${path}computed conflict warning required`);
    for (const field of computedUnique) if (!conflictFields.includes(field)) errors.push(`${path}conflictFields missing ${field}`);
  }
  if (conflictFields.length > 0 && !warnings.includes('issuer_context_conflict') && !warnings.includes('issuer_region_currency_conflict')) errors.push(`${path}conflict warning required`);
  if (Array.isArray(input.affectedCurrencies) && input.affectedCurrencies.length > 0 && input.resolutionSource === 'unresolved' && !warnings.includes('affected_currency_not_issuer')) errors.push(`${path}affected currency not issuer warning required`);
  if (input.resolutionSource === 'explicit_issuer_currency' && input.issuerCurrency === 'unknown') errors.push(`${path}explicit issuer currency cannot be unknown`);
  if (input.resolutionSource === 'explicit_issuer_institution' && input.issuerInstitution === 'unknown') errors.push(`${path}explicit issuer institution cannot be unknown`);
  if (input.resolutionSource === 'explicit_issuer_region' && input.issuerRegion === 'unknown') errors.push(`${path}explicit issuer region cannot be unknown`);
  if (input.resolutionSource === 'unresolved' && (known(input.issuerCurrency) || known(input.issuerRegion))) errors.push(`${path}unresolved cannot carry known issuer`);
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
