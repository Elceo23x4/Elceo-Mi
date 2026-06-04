import type { MarketAssetCausalityAsset, MarketAssetDirectionResolutionCoverageReport, MarketAssetDirectionResolutionInput, MarketAssetDirectionResolutionReasonCode, MarketAssetDirectionResolutionResult, MarketAssetDirectionResolutionRule, MarketAssetDirectionResolutionRuleSetSnapshot, MarketAssetDirectionResolutionWarning, MarketAssetDriverKind, MarketAssetPolicyTone, MarketAssetRawDirectionHint, MarketAssetResolvedPressureTarget, MarketAssetRiskRegimeHint, WeightedEvidenceDirection } from '@elceo/types';
import { MARKET_ASSET_CAUSALITY_ASSETS, MARKET_ASSET_DRIVER_KINDS, MARKET_ASSET_RAW_DIRECTION_HINTS } from '@elceo/types';
import { validateMarketAssetDirectionResolutionCoverageReport, validateMarketAssetDirectionResolutionResult, validateMarketAssetDirectionResolutionRuleSetSnapshot } from '@elceo/schemas';
import { getMarketAssetCausalityDescriptor } from '../asset-causality-map/index';
import { resolveFxRelativeStrength } from '../fx-relative-strength/index';
import { normalizeMacroSurprise, parseMacroReleaseInputFromMetadata } from '../macro-surprise-normalization/index';

type Metadata = Record<string, unknown>;
type FxOrientation = { base: string; quote: string } | null;
const FX: MarketAssetCausalityAsset[] = ['eur_usd','gbp_usd','usd_jpy','usd_chf','aud_usd','nzd_usd','usd_cad'];
const US_EQUITIES: MarketAssetCausalityAsset[] = ['nasdaq_100','sp500'];
const ALL_WARNINGS: MarketAssetDirectionResolutionWarning[] = ['ambiguous_policy_issuer','missing_base_quote_context','pending_fx_relative_strength','pending_macro_surprise_normalization','requires_price_confirmation','provider_activation_gap','generic_sentiment_low_confidence','risk_regime_conflict','haven_conflict','commodity_terms_context_required'];

function parseMetadata(json?: string | null): Metadata { if (!json) return {}; try { const parsed: unknown = JSON.parse(json); return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed as Metadata : {}; } catch { return {}; } }
function norm(v: unknown): string { return typeof v === 'string' ? v.trim().toLowerCase().replace(/[\s-]+/g, '_') : ''; }
function unique<T extends string>(values: T[]): T[] { return [...new Set(values)]; }
function includesMeta(m: Metadata, words: string[]): boolean { const body = JSON.stringify(m).toLowerCase(); return words.some((w) => body.includes(w)); }
function isAsset(asset: unknown): asset is MarketAssetCausalityAsset { return typeof asset === 'string' && (MARKET_ASSET_CAUSALITY_ASSETS as readonly string[]).includes(asset); }
function result(input: MarketAssetDirectionResolutionInput, metadata: Metadata, rawHint: MarketAssetRawDirectionHint, direction: WeightedEvidenceDirection, target: MarketAssetResolvedPressureTarget, confidence: number, reasonCodes: MarketAssetDirectionResolutionReasonCode[], warnings: MarketAssetDirectionResolutionWarning[], appliedRuleIds: string[], rationale: string, unresolvedReason?: string): MarketAssetDirectionResolutionResult {
  const asset = isAsset(input.asset) ? input.asset : 'xau_usd';
  const descriptor = getMarketAssetCausalityDescriptor(asset);
  const evidenceClass = String(input.evidenceClass);
  const requiresRelativeStrength = FX.includes(asset) || descriptor.directionResolutionRequirements.some((r) => r.requiresRelativeStrength);
  const surpriseLike = /surprise|inflation|labor|growth|economic_indicator|macro_calendar|central_bank_policy|rates/i.test(evidenceClass);
  const priceLike = /real_yields|volatility_surface|market_price|event_reaction|risk_sentiment|crypto_market_structure|energy_commodities|central_bank_policy/i.test(evidenceClass);
  const needsPrice = priceLike || descriptor.directionResolutionRequirements.some((r) => r.requiresPriceConfirmation) || warnings.includes('requires_price_confirmation');
  const macroNormalized = reasonCodes.includes('normalized_macro_surprise_applied');
  const needsSurprise = !macroNormalized && (surpriseLike || descriptor.directionResolutionRequirements.some((r) => r.requiresSurpriseNormalization) || warnings.includes('pending_macro_surprise_normalization'));
  const allWarnings = unique([...warnings, ...(requiresRelativeStrength ? ['pending_fx_relative_strength' as const] : []), ...(needsPrice ? ['requires_price_confirmation' as const] : []), ...(needsSurprise ? ['pending_macro_surprise_normalization' as const] : []), ...(descriptor.providerDependencies.some((d) => d.currentStatus === 'pending_provider_activation') ? ['provider_activation_gap' as const] : [])]);
  const out = { asset, evidenceClass, rawHint, resolvedDirection: direction, pressureTarget: target, confidence: Math.max(0, Math.min(100, Math.round(confidence))), reasonCodes: unique(reasonCodes), warnings: allWarnings, requiresSurpriseNormalization: needsSurprise, requiresRelativeStrength, requiresPriceConfirmation: needsPrice, appliedRuleIds, rationale, ...(unresolvedReason ? { unresolvedReason } : {}) };
  const validation = validateMarketAssetDirectionResolutionResult(out);
  if ('errors' in validation) throw new Error(`asset_direction_resolution_invalid:${validation.errors.join('|')}`);
  return out;
}

export function parseRawDirectionHintFromMetadata(metadataJson?: string | null): MarketAssetRawDirectionHint {
  const m = parseMetadata(metadataJson);
  const values = [m.direction, m.sentiment, m.bias, m.tone, m.policyTone, m.riskRegime, m.regime, m.impact].map(norm).filter(Boolean);
  const found = values.find((v) => (MARKET_ASSET_RAW_DIRECTION_HINTS as readonly string[]).includes(v));
  return (found as MarketAssetRawDirectionHint | undefined) ?? 'unknown';
}
export function inferDriverKindFromEvidenceClassOrMetadata(input: MarketAssetDirectionResolutionInput): MarketAssetDriverKind | 'unknown' {
  const m = parseMetadata(input.metadataJson);
  const candidates = [input.driverKind, m.driverKind, m.driver, input.evidenceClass].map(norm);
  const found = candidates.find((v) => (MARKET_ASSET_DRIVER_KINDS as readonly string[]).includes(v));
  if (found) return found as MarketAssetDriverKind;
  if (/policy|central_bank|hawkish|dovish/.test(candidates.join('|'))) return 'central_bank_policy';
  if (/risk/.test(candidates.join('|'))) return 'risk_sentiment';
  if (/oil|energy/.test(candidates.join('|'))) return 'oil_energy';
  if (/china|global_demand/.test(candidates.join('|'))) return 'china_demand';
  if (/crypto.*etf|onchain/.test(candidates.join('|'))) return 'crypto_etf_flows';
  return 'unknown';
}
function resolveFxPairOrientation(asset: MarketAssetCausalityAsset): FxOrientation { if (!FX.includes(asset)) return null; const parts = asset.split('_'); const base = parts[0] ?? ''; const quote = parts[1] ?? ''; return { base: base.toUpperCase(), quote: quote.toUpperCase() }; }
function resolveTone(input: MarketAssetDirectionResolutionInput, raw: MarketAssetRawDirectionHint, m: Metadata): MarketAssetPolicyTone { if (input.policyTone) return input.policyTone; const v = norm(m.policyTone ?? m.tone ?? raw); return v === 'hawkish' || v === 'dovish' || v === 'neutral' || v === 'mixed' ? v : 'unknown'; }
function riskHint(input: MarketAssetDirectionResolutionInput, raw: MarketAssetRawDirectionHint, m: Metadata): MarketAssetRiskRegimeHint { if (input.riskRegime) return input.riskRegime; const v = norm(m.riskRegime ?? m.regime ?? raw); return v === 'risk_on' || v === 'risk_off' || v === 'liquidity_stress' || v === 'credit_stress' || v === 'volatility_shock' || v === 'event_window' ? v : 'unknown'; }
function metadataStrings(values: unknown[]): string[] { return values.filter((v): v is string => typeof v === 'string' && v.trim().length > 0); }
function tokenizeIssuerValue(value: string): string[] { return value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean); }
function valueIdentifiesFedOrUsd(value: string): boolean {
  const normalized = norm(value);
  const tokens = tokenizeIssuerValue(value);
  const exactFedOrUsd = new Set(['fed','fomc','federal_reserve','united_states','u_s','us','usa','usd']);
  if (exactFedOrUsd.has(normalized)) return true;
  if (tokens.includes('fed') || tokens.includes('fomc') || tokens.includes('usd')) return true;
  if (tokens.includes('federal') && tokens.includes('reserve')) return true;
  if ((tokens.includes('united') && tokens.includes('states')) || tokens.includes('usa')) return true;
  if (tokens.includes('u') && tokens.includes('s')) return true;
  return tokens.includes('us') && tokens.length === 1;
}
function policyIssuerIsFed(input: MarketAssetDirectionResolutionInput, m: Metadata): boolean {
  const issuerValues = metadataStrings([input.policyIssuerRegion, input.affectedCurrency, m.policyIssuerRegion, m.issuer, m.region, m.source, m.affectedCurrency, m.currency, m.centralBank, m.provider, m.providerId]);
  return issuerValues.some(valueIdentifiesFedOrUsd);
}

function fxDirectionFromPairDirection(direction: 'base_strengthening' | 'quote_strengthening' | 'neutral' | 'mixed' | 'unknown'): WeightedEvidenceDirection {
  if (direction === 'base_strengthening') return 'bullish';
  if (direction === 'quote_strengthening') return 'bearish';
  if (direction === 'neutral') return 'neutral';
  if (direction === 'mixed') return 'mixed';
  return 'unknown';
}
function fxTargetFromCurrency(asset: MarketAssetCausalityAsset, currency: string | null): MarketAssetResolvedPressureTarget {
  const o = resolveFxPairOrientation(asset);
  if (!o || !currency) return 'unknown';
  if (o.base === currency) return 'base_currency';
  if (o.quote === currency) return 'quote_currency';
  if (currency === 'USD') return 'usd_side';
  return 'non_usd_side';
}
function policyIssuerCurrency(input: MarketAssetDirectionResolutionInput, m: Metadata): string | null {
  const values = metadataStrings([input.policyIssuerRegion, input.affectedCurrency, m.policyIssuerRegion, m.issuer, m.region, m.source, m.affectedCurrency, m.currency, m.centralBank, m.provider, m.providerId]).map(norm).join('|');
  if (/\b(usd|fed|fomc|federal_reserve|united_states|usa|us)\b/.test(values)) return 'USD';
  if (/\b(eur|ecb|eurozone|euro_area|european_central_bank)\b/.test(values)) return 'EUR';
  if (/\b(gbp|boe|bank_of_england|united_kingdom|uk|britain)\b/.test(values)) return 'GBP';
  if (/\b(jpy|boj|bank_of_japan|japan)\b/.test(values)) return 'JPY';
  if (/\b(chf|snb|swiss|switzerland)\b/.test(values)) return 'CHF';
  if (/\b(aud|rba|reserve_bank_of_australia|australia)\b/.test(values)) return 'AUD';
  if (/\b(nzd|rbnz|reserve_bank_of_new_zealand|new_zealand)\b/.test(values)) return 'NZD';
  if (/\b(cad|boc|bank_of_canada|canada)\b/.test(values)) return 'CAD';
  return null;
}
function resolveFxPolicyWithRelativeEngine(input: MarketAssetDirectionResolutionInput, m: Metadata, raw: MarketAssetRawDirectionHint, asset: MarketAssetCausalityAsset, currency: string | null): MarketAssetDirectionResolutionResult | null {
  if (!FX.includes(asset)) return null;
  const fxInput: Parameters<typeof resolveFxRelativeStrength>[0] = { pairAsset: asset as Parameters<typeof resolveFxRelativeStrength>[0]['pairAsset'] };
  if (input.metadataJson !== undefined) fxInput.metadataJson = input.metadataJson;
  const fx = resolveFxRelativeStrength(fxInput);
  if (fx.components.length === 0) return null;
  const target = fxTargetFromCurrency(asset, currency);
  const direction = fxDirectionFromPairDirection(fx.pairDirection);
  return result(input, m, raw, direction, target, fx.confidence, ['policy_tone_asset_context','causality_map_requirement','fx_base_quote_orientation', currency === 'USD' ? 'usd_side_policy_pressure' : 'non_usd_side_pressure'], ['pending_fx_relative_strength', ...(fx.warnings.includes('requires_price_confirmation') ? ['requires_price_confirmation' as const] : []), ...(fx.warnings.includes('pending_macro_surprise_normalization') ? ['pending_macro_surprise_normalization' as const] : []), ...(fx.warnings.includes('provider_activation_gap') ? ['provider_activation_gap' as const] : []), ...(fx.warnings.includes('haven_conflict') ? ['haven_conflict' as const] : []), ...(asset === 'usd_jpy' || asset === 'usd_chf' ? ['haven_conflict' as const] : [])], fx.appliedRuleIds.length ? fx.appliedRuleIds : [`policy-fx-relative-${asset}`], `FX relative-strength engine mapped ${currency ?? 'issuer'} pressure to ${fx.baseCurrency}/${fx.quoteCurrency} sides before resolving pair pressure. ${fx.rationale}`, fx.warnings.includes('relative_magnitude_missing') ? 'relative_counterparty_side_incomplete' : undefined);
}

function policyPressureTargetForAmbiguousIssuer(asset: MarketAssetCausalityAsset): MarketAssetResolvedPressureTarget {
  if (asset === 'dxy') return 'usd_side';
  if (FX.includes(asset)) return resolveFxPairOrientation(asset)?.base === 'USD' ? 'base_currency' : 'quote_currency';
  if (asset === 'xau_usd') return 'rates_complex';
  if (US_EQUITIES.includes(asset) || asset === 'btc_usd') return 'liquidity_complex';
  if (asset === 'vix') return 'volatility_complex';
  return 'asset_direct';
}
function fxUsdPolicy(asset: MarketAssetCausalityAsset, tone: MarketAssetPolicyTone): WeightedEvidenceDirection { const o = resolveFxPairOrientation(asset); if (!o) return 'unknown'; const usdStrong = tone === 'hawkish'; if (o.base === 'USD') return usdStrong ? 'bullish' : 'bearish'; if (o.quote === 'USD') return usdStrong ? 'bearish' : 'bullish'; return 'mixed'; }

export function resolvePolicyToneImpact(input: MarketAssetDirectionResolutionInput): MarketAssetDirectionResolutionResult {
  const m = parseMetadata(input.metadataJson); const raw = input.rawHint ?? parseRawDirectionHintFromMetadata(input.metadataJson); const tone = resolveTone(input, raw, m); const asset = isAsset(input.asset) ? input.asset : 'xau_usd';
  if (tone !== 'hawkish' && tone !== 'dovish') return result(input, m, raw, 'unknown', 'unknown', 20, ['ambiguous_context'], ['ambiguous_policy_issuer'], [], 'Policy tone was not specific enough to resolve asset pressure.', 'policy_tone_unknown');
  const fed = policyIssuerIsFed(input, m); const issuerCurrency = policyIssuerCurrency(input, m); const codes: MarketAssetDirectionResolutionReasonCode[] = ['policy_tone_asset_context','causality_map_requirement']; const warnings: MarketAssetDirectionResolutionWarning[] = fed ? [] : ['ambiguous_policy_issuer'];
  if (FX.includes(asset) && issuerCurrency) {
    const fxResolved = resolveFxPolicyWithRelativeEngine(input, m, raw, asset, issuerCurrency);
    if (fxResolved) return fxResolved;
  }
  if (!fed) return result(input, m, raw, 'mixed', policyPressureTargetForAmbiguousIssuer(asset), 34, [...codes,'ambiguous_context'], warnings, ['policy-issuer-ambiguous'], 'Policy tone needs explicit issuer or affected-side context before applying Fed/USD-specific asset pressure.', 'policy_issuer_missing_or_unresolved');
  if (asset === 'dxy') return result(input, m, raw, tone === 'hawkish' ? 'bullish' : 'bearish', 'usd_side', 76, codes, warnings, ['policy-fed-dxy'], 'Fed policy tone is resolved through broad USD-side causality rather than generic sentiment.');
  if (FX.includes(asset)) return result(input, m, raw, fxUsdPolicy(asset, tone), resolveFxPairOrientation(asset)?.base === 'USD' ? 'base_currency' : 'quote_currency', asset === 'usd_jpy' || asset === 'usd_chf' ? 68 : 72, [...codes,'fx_base_quote_orientation','usd_side_policy_pressure'], [...warnings, ...(asset === 'usd_jpy' ? ['haven_conflict' as const] : []), ...(asset === 'usd_chf' ? ['haven_conflict' as const] : [])], [`policy-fed-fx-${asset}`], 'Fed policy tone is translated through the pair base/quote orientation and retains R3 relative-strength caveats.');
  if (asset === 'xau_usd') return result(input, m, raw, tone === 'hawkish' ? 'bearish' : 'bullish', 'rates_complex', 58, [...codes,'rates_liquidity_pressure'], [...warnings,'requires_price_confirmation','pending_macro_surprise_normalization'], ['policy-fed-gold-rates'], 'Gold pressure is resolved through real-yield and dollar-liquidity context, not the tone label alone.');
  if (US_EQUITIES.includes(asset) || asset === 'btc_usd') return result(input, m, raw, tone === 'hawkish' ? 'bearish' : 'bullish', asset === 'btc_usd' ? 'liquidity_complex' : 'rates_complex', 60, [...codes,'rates_liquidity_pressure'], [...warnings,'requires_price_confirmation','pending_macro_surprise_normalization'], [`policy-fed-beta-${asset}`], 'Policy tone is routed through rates and liquidity pressure for beta-sensitive assets and requires price confirmation.');
  if (asset === 'vix') return result(input, m, raw, tone === 'hawkish' ? 'bullish' : 'bearish', 'volatility_complex', 52, [...codes,'rates_liquidity_pressure'], [...warnings,'requires_price_confirmation'], ['policy-fed-vix'], 'Volatility pressure only rises from policy tone when repricing or event-risk context is present.');
  return result(input, m, raw, 'mixed', 'unknown', 35, codes, [...warnings,'requires_price_confirmation'], ['policy-contextual'], 'Policy tone has contextual asset impact and remains mixed without issuer-side detail.', 'policy_context_incomplete');
}

export function resolveRiskRegimeImpact(input: MarketAssetDirectionResolutionInput): MarketAssetDirectionResolutionResult {
  const m = parseMetadata(input.metadataJson); const raw = input.rawHint ?? parseRawDirectionHintFromMetadata(input.metadataJson); const regime = riskHint(input, raw, m); const asset = isAsset(input.asset) ? input.asset : 'xau_usd';
  const off = regime === 'risk_off' || regime === 'liquidity_stress' || regime === 'credit_stress' || regime === 'volatility_shock'; const codes: MarketAssetDirectionResolutionReasonCode[] = ['risk_regime_asset_context','causality_map_requirement'];
  if (!off && regime !== 'risk_on') return result(input, m, raw, 'unknown', 'unknown', 20, ['ambiguous_context'], ['risk_regime_conflict'], [], 'Risk regime was not specific enough to resolve asset pressure.', 'risk_regime_unknown');
  if (asset === 'vix') return result(input, m, raw, off ? 'bullish' : 'bearish', 'volatility_complex', 78, codes, ['requires_price_confirmation'], ['risk-vix'], 'Risk regime maps through volatility demand and confirmation requirements.');
  if (US_EQUITIES.includes(asset) || asset === 'de30') return result(input, m, raw, off ? 'bearish' : 'bullish', 'risk_complex', 70, codes, ['requires_price_confirmation'], [`risk-equity-${asset}`], 'Equity index pressure is resolved through asset-family risk-beta context.');
  if (asset === 'btc_usd') return result(input, m, raw, off ? 'bearish' : 'bullish', 'crypto_native', 58, [...codes,'crypto_native_driver'], ['requires_price_confirmation','risk_regime_conflict'], ['risk-btc'], 'Crypto pressure follows risk/liquidity context but remains caveated for native-flow conflicts.');
  if (asset === 'aud_usd' || asset === 'nzd_usd') return result(input, m, raw, off ? 'bearish' : 'bullish', 'base_currency', 68, [...codes,'fx_base_quote_orientation'], ['pending_fx_relative_strength'], [`risk-commodity-fx-${asset}`], 'High-beta commodity FX pressure is resolved through base-currency risk sensitivity.');
  if (asset === 'usd_jpy' || asset === 'usd_chf') return result(input, m, raw, off ? 'mixed' : 'bullish', 'quote_currency', 45, [...codes,'safe_haven_context','fx_base_quote_orientation'], ['haven_conflict','pending_fx_relative_strength','risk_regime_conflict'], [`risk-haven-fx-${asset}`], 'Risk-off creates haven/funding tension, so USD crosses cannot be treated one-sided.', off ? 'haven_and_usd_funding_conflict' : undefined);
  if (asset === 'xau_usd') return result(input, m, raw, off ? 'bullish' : 'mixed', 'asset_direct', 56, [...codes,'safe_haven_context'], ['haven_conflict','requires_price_confirmation','risk_regime_conflict'], ['risk-gold-haven'], 'Gold can benefit from haven demand but USD liquidity stress can conflict.');
  if (asset === 'dxy') return result(input, m, raw, off ? 'bullish' : 'bearish', 'usd_side', 62, [...codes,'usd_side_policy_pressure'], ['risk_regime_conflict'], ['risk-dxy'], 'Dollar index pressure is resolved through funding and broad haven demand.');
  return result(input, m, raw, off ? 'bearish' : 'bullish', 'risk_complex', 50, codes, ['requires_price_confirmation'], ['risk-context'], 'Risk pressure is resolved through asset-family context.');
}


function macroDirection(input: MarketAssetDirectionResolutionInput, m: Metadata, raw: MarketAssetRawDirectionHint, asset: MarketAssetCausalityAsset): MarketAssetDirectionResolutionResult | null {
  const hasMacroFields = ['actual','forecast','consensus','expected','previous','prior','revisedPrevious','indicatorKind','indicatorName'].some((k) => Object.prototype.hasOwnProperty.call(m, k));
  if (!hasMacroFields) return null;
  const fallback = { releaseId: `${String(input.evidenceClass)}|${input.observedAt ?? 'unobserved'}`, indicatorName: String(input.evidenceClass) };
  const normalized = normalizeMacroSurprise(parseMacroReleaseInputFromMetadata(input.metadataJson, input.policyIssuerRegion || input.affectedCurrency ? { ...fallback, ...(input.policyIssuerRegion ? { region: input.policyIssuerRegion } : {}), ...(input.affectedCurrency ? { currency: input.affectedCurrency } : {}) } : fallback));
  const incomplete = normalized.warnings.includes('missing_actual') || normalized.warnings.includes('missing_forecast') || normalized.indicatorKind === 'unknown';
  const warnings: MarketAssetDirectionResolutionWarning[] = ['requires_price_confirmation','provider_activation_gap', ...(incomplete ? ['pending_macro_surprise_normalization' as const] : []), ...(FX.includes(asset) ? ['pending_fx_relative_strength' as const] : [])];
  const codes: MarketAssetDirectionResolutionReasonCode[] = ['normalized_macro_surprise_applied','causality_map_requirement'];
  if (incomplete) codes.push('macro_surprise_incomplete');
  if (normalized.category === 'inflation') codes.push('macro_inflation_pressure_context');
  if (normalized.category === 'labor_market') codes.push('macro_labor_pressure_context');
  if (['growth_activity','business_activity','consumption'].includes(normalized.category)) codes.push('macro_growth_pressure_context');
  let direction: WeightedEvidenceDirection = incomplete ? 'unknown' : 'mixed';
  let target: MarketAssetResolvedPressureTarget = 'risk_complex';
  if (!incomplete && asset === 'dxy') { direction = normalized.policyPressure === 'hawkish' ? 'bullish' : normalized.policyPressure === 'dovish' ? 'bearish' : 'mixed'; target = 'usd_side'; } else if (asset === 'dxy') { target = 'usd_side'; }
  else if (!incomplete && FX.includes(asset)) { const fxInput: Parameters<typeof resolveFxRelativeStrength>[0] = { pairAsset: asset as Parameters<typeof resolveFxRelativeStrength>[0]['pairAsset'] }; if (input.metadataJson !== undefined) fxInput.metadataJson = input.metadataJson; const fx = resolveFxRelativeStrength(fxInput); direction = fxDirectionFromPairDirection(fx.pairDirection); target = fxTargetFromCurrency(asset, normalized.currency === 'global' || normalized.currency === 'unknown' ? null : normalized.currency); }
  else if (!incomplete && asset === 'xau_usd') { direction = normalized.policyPressure === 'hawkish' ? 'bearish' : normalized.policyPressure === 'dovish' ? 'bullish' : 'mixed'; target = 'rates_complex'; }
  else if (!incomplete && (US_EQUITIES.includes(asset) || asset === 'btc_usd')) { direction = normalized.policyPressure === 'hawkish' ? 'mixed' : normalized.policyPressure === 'dovish' ? 'bullish' : normalized.growthPressure === 'weaker' ? 'bearish' : 'mixed'; target = asset === 'btc_usd' ? 'liquidity_complex' : 'risk_complex'; }
  const confidence = incomplete ? Math.min(35, normalized.confidence) : Math.min(68, normalized.confidence);
  return result(input, m, raw, direction, target, confidence, codes, warnings, ['c6-r4-macro-surprise-normalized'], `C6-R4 normalized ${normalized.indicatorKind} as ${normalized.surpriseDirection}/${normalized.economicMeaning}; downstream asset direction remains context-aware and price confirmation is pending.`);
}

function commodityOrDemand(input: MarketAssetDirectionResolutionInput, driver: string): MarketAssetDirectionResolutionResult | null {
  const m = parseMetadata(input.metadataJson); const raw = input.rawHint ?? parseRawDirectionHintFromMetadata(input.metadataJson); const asset = isAsset(input.asset) ? input.asset : 'xau_usd'; const pos = raw !== 'negative' && raw !== 'bearish' && raw !== 'lower' && raw !== 'weaker';
  if (driver === 'oil_energy' || /oil|energy/.test(JSON.stringify(m).toLowerCase())) {
    if (asset === 'usd_cad') return result(input, m, raw, pos ? 'bearish' : 'bullish', 'quote_currency', 70, ['commodity_quote_currency_pressure','fx_base_quote_orientation'], ['pending_fx_relative_strength','commodity_terms_context_required'], ['oil-cad-quote'], 'Oil strength is resolved as CAD quote-side pressure for USD/CAD.');
    if (asset === 'de30') return result(input, m, raw, pos ? 'bearish' : 'mixed', 'commodity_complex', 52, ['commodity_quote_currency_pressure'], ['commodity_terms_context_required','requires_price_confirmation'], ['oil-de30-margins'], 'Energy pressure is contextual for German industrial margins.');
    if (asset === 'xau_usd') return result(input, m, raw, 'mixed', 'commodity_complex', 35, ['ambiguous_context'], ['commodity_terms_context_required','requires_price_confirmation'], ['oil-gold-context'], 'Oil evidence needs geopolitical or inflation linkage before gold direction is resolved.', 'commodity_linkage_missing');
  }
  if (driver === 'china_demand' || includesMeta(m, ['china','global demand'])) {
    if (asset === 'aud_usd' || asset === 'nzd_usd') return result(input, m, raw, pos ? 'bullish' : 'bearish', 'base_currency', 72, ['china_demand_commodity_fx','fx_base_quote_orientation'], ['pending_fx_relative_strength','commodity_terms_context_required'], [`china-demand-${asset}`], 'China/global-demand pressure is resolved through AUD/NZD commodity-beta base currency context.');
    if (asset === 'de30') return result(input, m, raw, pos ? 'bullish' : 'bearish', 'risk_complex', 54, ['china_demand_commodity_fx'], ['requires_price_confirmation'], ['china-demand-de30'], 'China/global-demand evidence can support European industrial/export context.');
  }
  return null;
}

export function resolveAssetContextualEvidenceDirection(input: MarketAssetDirectionResolutionInput): MarketAssetDirectionResolutionResult {
  const m = parseMetadata(input.metadataJson); const raw = input.rawHint ?? parseRawDirectionHintFromMetadata(input.metadataJson); const driver = inferDriverKindFromEvidenceClassOrMetadata(input); const asset = isAsset(input.asset) ? input.asset : 'xau_usd';
  const macro = macroDirection(input, m, raw, asset); if (macro) return macro;
  if (raw === 'hawkish' || raw === 'dovish' || driver === 'central_bank_policy') return resolvePolicyToneImpact({ ...input, rawHint: raw });
  const regime = riskHint(input, raw, m);
  if (/risk_sentiment/i.test(String(input.evidenceClass)) && (raw === 'bullish' || raw === 'bearish')) return resolveRiskRegimeImpact({ ...input, rawHint: raw === 'bullish' ? 'risk_on' : 'risk_off', riskRegime: raw === 'bullish' ? 'risk_on' : 'risk_off' });
  if (raw === 'risk_on' || raw === 'risk_off' || regime !== 'unknown') return resolveRiskRegimeImpact({ ...input, rawHint: raw });
  const cd = commodityOrDemand({ ...input, rawHint: raw }, driver); if (cd) return cd;
  if ((driver === 'crypto_etf_flows' || driver === 'crypto_onchain' || includesMeta(m, ['crypto etf','on-chain','onchain'])) && asset === 'btc_usd') return result(input, m, raw, raw === 'negative' || raw === 'bearish' ? 'bearish' : 'bullish', 'crypto_native', 74, ['crypto_native_driver'], ['requires_price_confirmation'], ['crypto-native-btc'], 'Crypto ETF/on-chain evidence is resolved only for BTC native context.');
  if (driver === 'safe_haven_demand' || includesMeta(m, ['safe haven','haven'])) {
    if (asset === 'xau_usd') return result(input, m, raw, 'bullish', 'asset_direct', 68, ['safe_haven_context'], ['requires_price_confirmation'], ['haven-gold'], 'Safe-haven demand can support gold while retaining confirmation requirements.');
    if (asset === 'usd_jpy' || asset === 'usd_chf') return result(input, m, raw, 'bearish', 'quote_currency', 52, ['safe_haven_context','fx_base_quote_orientation'], ['haven_conflict','pending_fx_relative_strength'], [`haven-${asset}`], 'JPY/CHF haven pressure supports the quote side and pressures the USD cross lower, subject to conflict.');
    if (asset === 'dxy') return result(input, m, raw, 'bullish', 'usd_side', 54, ['safe_haven_context'], ['risk_regime_conflict'], ['haven-dxy'], 'Broad USD haven or funding demand can support the dollar basket.');
  }
  if (raw === 'positive' || raw === 'negative' || raw === 'bullish' || raw === 'bearish') return result(input, m, raw, 'unknown', 'unknown', 18, ['generic_sentiment_not_directional','ambiguous_context'], ['generic_sentiment_low_confidence'], ['generic-sentiment-blocked'], 'Generic news or sentiment labels are not converted into asset direction without mapped driver context.', 'driver_context_missing');
  if (raw === 'neutral') return result(input, m, raw, 'neutral', 'unknown', 45, ['ambiguous_context'], [], ['neutral-explicit'], 'Explicit neutral evidence remains neutral.');
  return result(input, m, raw, 'unknown', 'unknown', 15, ['ambiguous_context'], ['generic_sentiment_low_confidence'], ['unknown-context'], 'Evidence lacks enough asset-causality context to resolve direction.', 'context_missing');
}
export function resolveAssetContextualDirectionForEvidenceItem(input: MarketAssetDirectionResolutionInput): MarketAssetDirectionResolutionResult { return resolveAssetContextualEvidenceDirection(input); }

export function getAssetDirectionResolutionCoverageReport(asOfIso = new Date().toISOString()): MarketAssetDirectionResolutionCoverageReport { const report = { generatedAt: asOfIso, launchAssetCount: MARKET_ASSET_CAUSALITY_ASSETS.length, representedAssets: [...MARKET_ASSET_CAUSALITY_ASSETS], genericDirectionPrimaryPathDisabled: true, ruleCount: 12, pendingPhases: ['R3','R4','R5','R6','R7','R8','R9'] as Array<'R3'|'R4'|'R5'|'R6'|'R7'|'R8'|'R9'>, warnings: ALL_WARNINGS, notes: ['C6-R2 adds deterministic asset-contextual direction resolution foundation.', 'C6-R4 adds macro surprise normalization; incomplete macro evidence still carries pending normalization warnings.', 'Price reaction/impulse remains R7 and provider reliability expansion remains pending.'] }; const validation = validateMarketAssetDirectionResolutionCoverageReport(report); if ('errors' in validation) throw new Error(`asset_direction_coverage_invalid:${validation.errors.join('|')}`); return report; }
export function getAssetDirectionResolutionRuleSetSnapshot(asOfIso = new Date().toISOString()): MarketAssetDirectionResolutionRuleSetSnapshot { const rules: MarketAssetDirectionResolutionRule[] = ['precious_metals','fx_major','fx_safe_haven','fx_commodity','crypto','equity_index_us','equity_index_europe','dollar_index','volatility_index'].map((family) => ({ ruleId: `c6-r2-${family}`, assetFamily: family as MarketAssetDirectionResolutionRule['assetFamily'], evidenceClasses: ['central_bank_policy','risk_sentiment','energy_commodities','market_news'], rawHints: family === 'all' ? ['unknown'] : ['hawkish','dovish','risk_on','risk_off','positive','negative'], driverKinds: ['central_bank_policy','risk_sentiment','oil_energy','china_demand','crypto_etf_flows','safe_haven_demand'], pressureTarget: family === 'volatility_index' ? 'volatility_complex' : family.toString().startsWith('fx') ? 'base_currency' : 'asset_direct', requiresIssuerOrAffectedSide: true, output: 'mixed', confidence: 50, reasonCodes: ['causality_map_requirement'], warnings: ['pending_macro_surprise_normalization','requires_price_confirmation'], rationale: `C6-R2 ${family} rule documents deterministic asset-contextual interpretation; final calibration remains pending.` })); const snapshot = { generatedAt: asOfIso, rules, coverageReport: getAssetDirectionResolutionCoverageReport(asOfIso) }; const validation = validateMarketAssetDirectionResolutionRuleSetSnapshot(snapshot); if ('errors' in validation) throw new Error(`asset_direction_rules_invalid:${validation.errors.join('|')}`); return snapshot; }
export function listAssetDirectionResolutionWarnings(asset?: MarketAssetCausalityAsset): MarketAssetDirectionResolutionWarning[] { return asset && FX.includes(asset) ? unique([...ALL_WARNINGS, 'pending_fx_relative_strength']) : [...ALL_WARNINGS]; }
export function assertAssetDirectionResolutionRuleSetValid(): true { getAssetDirectionResolutionRuleSetSnapshot('2026-06-03T00:00:00.000Z'); return true; }
