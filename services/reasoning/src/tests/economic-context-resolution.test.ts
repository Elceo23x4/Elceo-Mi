import { validateMarketEconomicContextResolution, validateMarketEconomicDriverContext } from '@elceo/schemas';
import { resolveMarketEconomicContext, resolveMarketEconomicDriverContext } from '../economic-context/index.js';
import { resolveFxRelativeStrength } from '../fx-relative-strength/index.js';
import { normalizeMacroSurprise, parseMacroReleaseInputFromMetadata } from '../macro-surprise-normalization/index.js';
import { resolveAssetContextualEvidenceDirection } from '../asset-direction-resolution/index.js';
function assert(condition: boolean, message: string): void { if (!condition) throw new Error(`Assertion failed: ${message}`); }

function validResolution(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { issuerInstitution:'unknown', issuerRegion:'unknown', issuerCurrency:'unknown', eventRegion:'unknown', affectedCurrencies:[], resolutionSource:'unresolved', resolutionConfidence:'unresolved', warnings:['issuer_context_missing'], conflictFields:[], ignoredIdentityFields:[], ...overrides };
}
function assertInvalidResolution(value: Record<string, unknown>, message: string): void { assert(!validateMarketEconomicContextResolution(value).ok, message); }
function macroFromMetadata(value: Record<string, unknown>) { return normalizeMacroSurprise(parseMacroReleaseInputFromMetadata(JSON.stringify({ indicatorKind:'gdp', actual:1, forecast:2, previous:1, ...value }))); }
export function runEconomicContextResolutionTests(): void {
  const eur = resolveMarketEconomicContext({ issuerCurrency:'EUR', providerId:'fed_usd_archive' });
  assert(eur.issuerCurrency === 'EUR' && eur.warnings.includes('provider_identity_ignored'), 'explicit EUR wins while provider identity is ignored');
  const ecb = resolveMarketEconomicContext({ issuerInstitution:'ECB', source:'Federal Reserve archive' });
  assert(ecb.issuerInstitution === 'ecb' && ecb.issuerCurrency === 'EUR' && ecb.warnings.includes('provider_identity_ignored'), 'ECB institution wins while source is ignored');
  assert(resolveMarketEconomicContext({ issuerCurrency:'EUR', issuerInstitution:'fed' }).resolutionSource === 'unresolved', 'currency/institution conflict unresolved');
  assert(resolveMarketEconomicContext({ issuerCurrency:'EUR', issuerRegion:'US' }).warnings.includes('issuer_region_currency_conflict'), 'region/currency conflict warning');
  const chinaAud = resolveMarketEconomicContext({ eventRegion:'China', affectedCurrency:'AUD' });
  assert(chinaAud.issuerCurrency === 'unknown' && chinaAud.eventRegion === 'China' && chinaAud.warnings.includes('affected_currency_not_issuer'), 'affected AUD not issuer currency');
  const a = resolveMarketEconomicContext({ issuerCurrency:'JPY', providerId:'fed' });
  const b = resolveMarketEconomicContext({ issuerCurrency:'JPY', providerId:'ecb' });
  assert(a.issuerCurrency === b.issuerCurrency && a.resolutionSource === b.resolutionSource, 'provider ID changes do not change economic result');
  assert(resolveMarketEconomicContext({ issuerCurrency:'GBP', targetAsset:'usd_jpy' }).issuerCurrency === 'GBP', 'target asset does not alter issuer identity');
  assert(resolveMarketEconomicDriverContext({ metadata:{ note:'not a China demand event' } }).driverKind === 'unknown', 'note does not create China demand');
  assert(resolveMarketEconomicDriverContext({ metadata:{ oilInventoryRelevant:false } }).driverKind === 'unknown', 'false oil key does not create oil component');
  const noDirection = resolveMarketEconomicDriverContext({ driverKind:'oil_energy' });
  assert(noDirection.driverDirection === 'unknown' && noDirection.warnings.includes('driver_direction_missing'), 'driver kind without direction is unknown warned');
  assert(resolveMarketEconomicContext({ providerId:'official_fixture' }).issuerCurrency === 'unknown', 'official fixture does not default USD');
  const weighted = resolveFxRelativeStrength({ pairAsset:'eur_usd', weightedSnapshot:{ snapshotId:'w', generatedAt:'2026-06-03T00:00:00.000Z', asset:'eur_usd', horizon:'intraday', totalWeight:1, usableWeight:1, excludedWeight:0, warnings:[], items:[{ payloadId:'e', asset:'eur_usd', horizon:'intraday', evidenceTypeId:'central_bank_policy', evidenceClass:'central_bank_policy', providerId:'fixture', observedAt:'2026-06-03T00:00:00.000Z', finalQualityScore:80, baseWeight:1, qualityAdjustedWeight:1, role:'primary_driver', direction:'bullish', contributionScore:1, reasons:['ECB hawkish in free text'] }] } });
  assert(weighted.components.length === 0 && weighted.warnings.includes('weighted_snapshot_metadata_limited'), 'weighted reason text does not create EUR pressure');
  assert(resolveMarketEconomicContext({ issuerCurrency:'XYZ' }).warnings.includes('unsupported_region_or_currency_alias'), 'unsupported alias warned');
  assert(resolveMarketEconomicContext({}).issuerCurrency === 'unknown', 'absent region/currency unresolved without USD default');
  assert(resolveMarketEconomicContext({ metadata:{ note:'industrial use case' } }).issuerRegion === 'unknown', 'us inside unrelated word not matched');
  assert(resolveMarketEconomicContext({ issuerCurrency:'EUR', issuerRegion:'US', issuerInstitution:'ecb' }).resolutionSource === 'unresolved', 'duplicate conflicting aliases do not first-regex win');
  assert(validateMarketEconomicContextResolution(eur).ok && validateMarketEconomicDriverContext(noDirection).ok, 'economic schemas validate canonical outputs');
  const asset = resolveAssetContextualEvidenceDirection({ asset:'eur_usd', evidenceClass:'central_bank_policy', metadataJson:JSON.stringify({ policyTone:'hawkish', issuerCurrency:'EUR', providerId:'fed_usd' }) });
  assert(asset.pressureTarget === 'base_currency', 'asset direction consumes canonical resolver');
  const fx = resolveFxRelativeStrength({ pairAsset:'eur_usd', metadataJson:JSON.stringify({ direction:'hawkish', issuerCurrency:'EUR', providerId:'fed_usd' }) });
  assert(fx.basePressure.componentCount === 1, 'FX consumes canonical resolver');
  const macro = normalizeMacroSurprise(parseMacroReleaseInputFromMetadata(JSON.stringify({ indicatorKind:'gdp', actual:1, forecast:2, previous:1, affectedCurrency:'AUD', eventRegion:'China', driverKind:'china_demand', driverDirection:'weaker' })));
  assert(macro.currency === 'unknown' && String(macro.region) === 'China', 'macro keeps affected currency separate from issuer currency');

  for (const forbidden of [{ providerId:'fed_archive' }, { source:'ECB archive' }, { title:'Federal Reserve GDP nowcast' }, { note:'industrial use case' }]) {
    const release = macroFromMetadata(forbidden);
    assert(release.currency === 'unknown' && release.region === 'unknown', `${Object.keys(forbidden)[0]} alone does not infer macro issuer`);
  }
  const affectedMacro = macroFromMetadata({ affectedCurrency:'AUD', eventRegion:'China' });
  assert(affectedMacro.currency === 'unknown' && String(affectedMacro.region) === 'China' && affectedMacro.affectedCurrencies?.includes('AUD') === true && affectedMacro.warnings.includes('affected_currency_not_issuer') && affectedMacro.warnings.includes('issuer_context_missing'), 'macro affected currency is preserved without issuer authority');
  assertInvalidResolution(validResolution({ providerId:'fed' }), 'canonical resolution rejects providerId extra field');
  assertInvalidResolution(validResolution({ source:'ECB archive' }), 'canonical resolution rejects source extra field');
  assertInvalidResolution(validResolution({ title:'Federal Reserve' }), 'canonical resolution rejects title extra field');
  assertInvalidResolution(validResolution({ note:'industrial use case' }), 'canonical resolution rejects note extra field');
  assertInvalidResolution(validResolution({ issuerCurrency:'EUR', issuerRegion:'US', resolutionSource:'explicit_issuer_currency', resolutionConfidence:'high', warnings:[], conflictFields:[] }), 'schema computes issuer currency/region mismatch');
  assertInvalidResolution(validResolution({ issuerCurrency:'EUR', issuerInstitution:'fed', issuerRegion:'eurozone', resolutionSource:'explicit_issuer_currency', resolutionConfidence:'high', warnings:[], conflictFields:[] }), 'schema computes issuer currency/institution mismatch');
  assertInvalidResolution(validResolution({ issuerInstitution:'ecb', issuerRegion:'US', issuerCurrency:'EUR', resolutionSource:'explicit_issuer_institution', resolutionConfidence:'high', warnings:[], conflictFields:[] }), 'schema computes issuer region/institution mismatch');
  assertInvalidResolution(validResolution({ issuerCurrency:'EUR', issuerRegion:'US', resolutionSource:'explicit_issuer_currency', resolutionConfidence:'high', warnings:['issuer_region_currency_conflict'], conflictFields:[] }), 'schema rejects empty conflictFields on contradiction');
  assertInvalidResolution(validResolution({ warnings:[], conflictFields:['issuerCurrency'] }), 'schema rejects conflictFields without conflict warning');
  assertInvalidResolution(validResolution({ affectedCurrencies:['AUD'], warnings:['issuer_context_missing'] }), 'schema rejects affectedCurrencies unresolved without affected_currency_not_issuer');
  assertInvalidResolution(validResolution({ issuerCurrency:'unknown', resolutionSource:'explicit_issuer_currency', resolutionConfidence:'high' }), 'schema rejects explicit issuer currency unknown');
  assertInvalidResolution(validResolution({ issuerInstitution:'unknown', resolutionSource:'explicit_issuer_institution', resolutionConfidence:'high' }), 'schema rejects explicit issuer institution unknown');
  assertInvalidResolution(validResolution({ issuerRegion:'unknown', resolutionSource:'explicit_issuer_region', resolutionConfidence:'high' }), 'schema rejects explicit issuer region unknown');
  assertInvalidResolution(validResolution({ issuerCurrency:'EUR', issuerRegion:'eurozone', resolutionSource:'unresolved' }), 'schema rejects unresolved with known issuer');
  assert(!validateMarketEconomicDriverContext({ driverKind:'oil_energy', driverDirection:'unknown', warnings:[] }).ok, 'driver schema rejects missing direction without warning');
}
