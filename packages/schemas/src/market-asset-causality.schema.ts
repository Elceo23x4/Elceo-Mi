import type { MarketAssetCausalityCoverageReport, MarketAssetCausalityDescriptor, MarketAssetCausalityDriver, MarketAssetCausalityMatrixSnapshot, MarketAssetContradictionTrigger, MarketAssetDirectionResolutionRequirement, MarketAssetProviderDependency, MarketAssetRegimeModifier } from '@elceo/types';
import { MARKET_ASSET_CAUSALITY_ASSETS, MARKET_ASSET_CONTRADICTION_TRIGGER_KINDS, MARKET_ASSET_COVERAGE_STATUSES, MARKET_ASSET_DRIVER_DIRECTION_SENSITIVITIES, MARKET_ASSET_DRIVER_IMPORTANCE, MARKET_ASSET_DRIVER_KINDS, MARKET_ASSET_FAMILIES, MARKET_ASSET_FRESHNESS_SENSITIVITIES, MARKET_ASSET_MACRO_EVENT_SENSITIVITIES, MARKET_ASSET_PRICE_CONFIRMATION_NEEDS, MARKET_ASSET_PROVIDER_DEPENDENCY_TIERS, MARKET_ASSET_REGIME_MODIFIER_KINDS, MARKET_REASONING_DIAGNOSTIC_ASSETS, PROVIDER_SOURCE_IDS, TRADING_ASSET_COVERAGE } from '@elceo/types';
import { isEnumValue, isIsoDateString, isNonEmptyString, isObjectRecord, isStringArray, type SchemaValidationResult } from './validation-utils';
import { validateExpectedMarketReasoningModuleReadiness } from './market-reasoning-readiness.schema';

const FORBIDDEN = /\b(buy|sell|hold|guaranteed profit|risk-free)\b/i;
const FX = new Set(['eur_usd','gbp_usd','usd_jpy','usd_chf','aud_usd','nzd_usd','usd_cad']);
const required = MARKET_ASSET_CAUSALITY_ASSETS;

type PathErrors = string[];
function arrayOfObjects(value: unknown): value is Record<string, unknown>[] { return Array.isArray(value) && value.every(isObjectRecord); }
function noBad(text: unknown, path: string, errors: PathErrors): void { if (!isNonEmptyString(text)) errors.push(`${path} required`); else if (FORBIDDEN.test(text)) errors.push(`${path} contains forbidden recommendation language`); }
function validateTextArray(value: unknown, path: string, errors: PathErrors): void { if (!isStringArray(value) || value.length === 0 || value.some((x) => !x.trim() || FORBIDDEN.test(x))) errors.push(`${path} invalid`); }

export function validateMarketAssetCausalityDriver(input: unknown, path = ''): SchemaValidationResult<MarketAssetCausalityDriver> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${path}driver object required`] };
  if (!isNonEmptyString(input.driverId)) errors.push(`${path}driverId required`);
  if (!isEnumValue(input.kind, MARKET_ASSET_DRIVER_KINDS)) errors.push(`${path}kind invalid`);
  if (!isEnumValue(input.importance, MARKET_ASSET_DRIVER_IMPORTANCE)) errors.push(`${path}importance invalid`);
  validateTextArray(input.evidenceClasses, `${path}evidenceClasses`, errors);
  if (!Array.isArray(input.directionSensitivity) || input.directionSensitivity.length === 0 || !input.directionSensitivity.every((x) => isEnumValue(x, MARKET_ASSET_DRIVER_DIRECTION_SENSITIVITIES))) errors.push(`${path}directionSensitivity invalid`);
  noBad(input.interpretation, `${path}interpretation`, errors);
  noBad(input.rationale, `${path}rationale`, errors);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as MarketAssetCausalityDriver };
}

function validateModifier(input: unknown, path: string): SchemaValidationResult<MarketAssetRegimeModifier> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${path}modifier object required`] };
  if (!isNonEmptyString(input.modifierId)) errors.push(`${path}modifierId required`);
  if (!isEnumValue(input.kind, MARKET_ASSET_REGIME_MODIFIER_KINDS)) errors.push(`${path}kind invalid`);
  noBad(input.interpretation, `${path}interpretation`, errors); noBad(input.rationale, `${path}rationale`, errors);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as MarketAssetRegimeModifier };
}
function validateTrigger(input: unknown, path: string): SchemaValidationResult<MarketAssetContradictionTrigger> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${path}trigger object required`] };
  if (!isNonEmptyString(input.triggerId)) errors.push(`${path}triggerId required`);
  if (!isEnumValue(input.kind, MARKET_ASSET_CONTRADICTION_TRIGGER_KINDS)) errors.push(`${path}kind invalid`);
  noBad(input.detectionIntent, `${path}detectionIntent`, errors); noBad(input.rationale, `${path}rationale`, errors);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as MarketAssetContradictionTrigger };
}
function validateDependency(input: unknown, path: string): SchemaValidationResult<MarketAssetProviderDependency> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${path}dependency object required`] };
  if (!isNonEmptyString(input.dependencyId)) errors.push(`${path}dependencyId required`);
  if (!isEnumValue(input.tier, MARKET_ASSET_PROVIDER_DEPENDENCY_TIERS)) errors.push(`${path}tier invalid`);
  if (!Array.isArray(input.sourceIds) || input.sourceIds.length === 0 || !input.sourceIds.every((x) => isEnumValue(x, PROVIDER_SOURCE_IDS))) errors.push(`${path}sourceIds invalid`);
  validateTextArray(input.evidenceClasses, `${path}evidenceClasses`, errors);
  if (!isEnumValue(input.currentStatus, MARKET_ASSET_COVERAGE_STATUSES)) errors.push(`${path}currentStatus invalid`);
  noBad(input.rationale, `${path}rationale`, errors);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as MarketAssetProviderDependency };
}
function validateRequirement(input: unknown, path: string): SchemaValidationResult<MarketAssetDirectionResolutionRequirement> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${path}requirement object required`] };
  if (!isNonEmptyString(input.requirementId)) errors.push(`${path}requirementId required`);
  if (!isEnumValue(input.asset, MARKET_ASSET_CAUSALITY_ASSETS)) errors.push(`${path}asset invalid`);
  for (const k of ['requiresBasePressure','requiresQuotePressure','requiresRelativeStrength','requiresSurpriseNormalization','requiresPriceConfirmation'] as const) if (typeof input[k] !== 'boolean') errors.push(`${path}${k} invalid`);
  noBad(input.rationale, `${path}rationale`, errors);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as MarketAssetDirectionResolutionRequirement };
}

export function validateMarketAssetCausalityDescriptor(input: unknown, path = ''): SchemaValidationResult<MarketAssetCausalityDescriptor> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${path}descriptor object required`] };
  if (!isEnumValue(input.asset, MARKET_ASSET_CAUSALITY_ASSETS)) errors.push(`${path}asset invalid`);
  if (!isNonEmptyString(input.displayName)) errors.push(`${path}displayName required`);
  if (!isEnumValue(input.family, MARKET_ASSET_FAMILIES)) errors.push(`${path}family invalid`);
  const driverArrays = ['primaryDrivers','secondaryDrivers','contextualDrivers'] as const;
  const ids: string[] = [];
  for (const key of driverArrays) {
    if (!arrayOfObjects(input[key])) errors.push(`${path}${key} invalid`); else input[key].forEach((d, i) => { const r = validateMarketAssetCausalityDriver(d, `${path}${key}[${i}].`); if ('errors' in r) errors.push(...r.errors); else ids.push(r.value.driverId); });
  }
  if (new Set(ids).size !== ids.length) errors.push(`${path}duplicate driver IDs`);
  const primarySecondaryCount = (Array.isArray(input.primaryDrivers) ? input.primaryDrivers.length : 0) + (Array.isArray(input.secondaryDrivers) ? input.secondaryDrivers.length : 0);
  if (primarySecondaryCount < 4) errors.push(`${path}at least four primary/secondary drivers required`);
  if (!arrayOfObjects(input.regimeModifiers) || input.regimeModifiers.length === 0) errors.push(`${path}regimeModifiers required`); else input.regimeModifiers.forEach((m, i) => { const r = validateModifier(m, `${path}regimeModifiers[${i}].`); if ('errors' in r) errors.push(...r.errors); });
  if (!arrayOfObjects(input.contradictionTriggers) || input.contradictionTriggers.length === 0) errors.push(`${path}contradictionTriggers required`); else input.contradictionTriggers.forEach((t, i) => { const r = validateTrigger(t, `${path}contradictionTriggers[${i}].`); if ('errors' in r) errors.push(...r.errors); });
  if (!isEnumValue(input.freshnessSensitivity, MARKET_ASSET_FRESHNESS_SENSITIVITIES)) errors.push(`${path}freshnessSensitivity invalid`);
  if (!isEnumValue(input.priceConfirmationNeeds, MARKET_ASSET_PRICE_CONFIRMATION_NEEDS)) errors.push(`${path}priceConfirmationNeeds invalid`);
  if (!isEnumValue(input.macroEventSensitivity, MARKET_ASSET_MACRO_EVENT_SENSITIVITIES)) errors.push(`${path}macroEventSensitivity invalid`);
  if (!arrayOfObjects(input.providerDependencies) || input.providerDependencies.length === 0) errors.push(`${path}providerDependencies required`); else input.providerDependencies.forEach((d, i) => { const r = validateDependency(d, `${path}providerDependencies[${i}].`); if ('errors' in r) errors.push(...r.errors); });
  if (!arrayOfObjects(input.directionResolutionRequirements) || input.directionResolutionRequirements.length === 0) errors.push(`${path}directionResolutionRequirements required`); else input.directionResolutionRequirements.forEach((r0, i) => { const r = validateRequirement(r0, `${path}directionResolutionRequirements[${i}].`); if ('errors' in r) errors.push(...r.errors); });
  validateTextArray(input.currentCodeCoverage, `${path}currentCodeCoverage`, errors); validateTextArray(input.deterministicModuleDependencies, `${path}deterministicModuleDependencies`, errors); noBad(input.rationale, `${path}rationale`, errors);
  if (!Array.isArray(input.knownGaps) || input.knownGaps.length === 0) errors.push(`${path}knownGaps required`);
  const asset = typeof input.asset === 'string' ? input.asset : '';
  const kinds = ids.join('|'); const deps = JSON.stringify(input.providerDependencies ?? []); const all = JSON.stringify(input);
  if (FX.has(asset)) {
    const reqs = Array.isArray(input.directionResolutionRequirements) ? input.directionResolutionRequirements as Record<string, unknown>[] : [];
    if (!reqs.some((r) => r.requiresBasePressure === true) || !reqs.some((r) => r.requiresQuotePressure === true)) errors.push(`${path}FX requires base and quote pressure`);
    if (/usd-only/i.test(all)) errors.push(`${path}FX pair must not be USD-only`);
  }
  if (asset === 'xau_usd' && (!kinds.includes('real_yields') || !/dollar_liquidity|liquidity_conditions/.test(kinds) || !/safe_haven_demand|geopolitical_risk/.test(kinds) || !/etf_flows|fund_flows|central_bank_demand/.test(kinds))) errors.push(`${path}XAU causality incomplete`);
  if (asset === 'btc_usd' && (!/liquidity_conditions|dollar_liquidity/.test(kinds) || !/crypto_derivatives/.test(kinds) || !/crypto_onchain/.test(kinds) || !/risk_sentiment/.test(kinds) || !/crypto_etf_flows|regulatory_risk/.test(kinds))) errors.push(`${path}BTC causality incomplete`);
  if ((asset === 'nasdaq_100' || asset === 'sp500') && (!/real_yields|nominal_yields|cross_market_rates/.test(kinds) || !kinds.includes('earnings_macro') || !kinds.includes('equity_breadth') || !kinds.includes('volatility_surface') || !/liquidity_conditions|financial_conditions/.test(kinds))) errors.push(`${path}equity index causality incomplete`);
  if (asset === 'de30' && !/(ecb_official|destatis_official|ifo_shell|zew_shell|energy_commodities|credit_stress)/i.test(all)) errors.push(`${path}DE30 eurozone context incomplete`);
  if (asset === 'dxy' && (!/(federal_reserve_official|Fed)/i.test(all) || !/yield_differentials/.test(kinds) || !/liquidity|risk/i.test(all))) errors.push(`${path}DXY causality incomplete`);
  if (asset === 'vix' && (!/volatility_surface/.test(kinds) || !/equity|credit|risk/i.test(all))) errors.push(`${path}VIX causality incomplete`);
  if (deps.includes('complete')) errors.push(`${path}coverage status must not claim complete`);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as MarketAssetCausalityDescriptor };
}

export function validateMarketAssetCausalityCoverageReport(input: unknown, path = ''): SchemaValidationResult<MarketAssetCausalityCoverageReport> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${path}coverage report object required`] };
  if (!isIsoDateString(input.generatedAt)) errors.push(`${path}generatedAt invalid`);
  if (input.launchTradableAssetCount !== TRADING_ASSET_COVERAGE.length) errors.push(`${path}launchTradableAssetCount invalid`);
  if (input.diagnosticAssetCount !== MARKET_REASONING_DIAGNOSTIC_ASSETS.length) errors.push(`${path}diagnosticAssetCount invalid`);
  if (input.representedReasoningAssetCount !== required.length) errors.push(`${path}representedReasoningAssetCount invalid`);
  if (!isObjectRecord(input.assetSupportRoles)) errors.push(`${path}assetSupportRoles invalid`); else { for (const a of TRADING_ASSET_COVERAGE) if (input.assetSupportRoles[a] !== 'launch_tradable') errors.push(`${path}${a} role invalid`); for (const a of MARKET_REASONING_DIAGNOSTIC_ASSETS) if (input.assetSupportRoles[a] !== 'reasoning_diagnostic') errors.push(`${path}${a} role invalid`); }
  { const rr=validateExpectedMarketReasoningModuleReadiness(input.readiness,'asset_causality',`${path}readiness.`); if(rr.ok===false) errors.push(...rr.errors); }
  if (!Array.isArray(input.representedAssets) || input.representedAssets.length !== required.length) errors.push(`${path}representedAssets invalid`);
  if (!Array.isArray(input.missingAssets) || input.missingAssets.length !== 0) errors.push(`${path}missingAssets must be empty`);
  if (!Array.isArray(input.duplicateAssets) || input.duplicateAssets.length !== 0) errors.push(`${path}duplicateAssets must be empty`);
  validateTextArray(input.notes, `${path}notes`, errors);
  if (!Array.isArray(input.gaps) || input.gaps.length === 0) errors.push(`${path}gaps required`);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as MarketAssetCausalityCoverageReport };
}

export function validateMarketAssetCausalityMatrixSnapshot(input: unknown, path = ''): SchemaValidationResult<MarketAssetCausalityMatrixSnapshot> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${path}matrix snapshot object required`] };
  if (!isIsoDateString(input.generatedAt)) errors.push(`${path}generatedAt invalid`);
  if (!arrayOfObjects(input.descriptors)) errors.push(`${path}descriptors invalid`); else {
    const seen = new Map<string, number>();
    input.descriptors.forEach((d, i) => { const r = validateMarketAssetCausalityDescriptor(d, `${path}descriptors[${i}].`); if ('errors' in r) errors.push(...r.errors); if (typeof d.asset === 'string') seen.set(d.asset, (seen.get(d.asset) ?? 0) + 1); });
    for (const asset of required) if ((seen.get(asset) ?? 0) !== 1) errors.push(`${path}${asset} must exist exactly once`);
  }
  const report = validateMarketAssetCausalityCoverageReport(input.coverageReport, `${path}coverageReport.`); if ('errors' in report) errors.push(...report.errors);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as MarketAssetCausalityMatrixSnapshot };
}
