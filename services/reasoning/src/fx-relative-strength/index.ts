import { getMarketReasoningModuleReadiness } from '../readiness/index';
import type { MarketAssetCausalityAsset, MarketFxCurrencyCode, MarketFxCurrencyPressureComponent, MarketFxCurrencyPressureComponentKind, MarketFxCurrencyPressureDirection, MarketFxCurrencyPressureSnapshot, MarketFxPairAsset, MarketFxRelativePairDirection, MarketFxRelativeStrengthCoverageReport, MarketFxRelativeStrengthInput, MarketFxRelativeStrengthReasonCode, MarketFxRelativeStrengthResult, MarketFxRelativeStrengthRule, MarketFxRelativeStrengthRuleSetSnapshot, MarketFxRelativeStrengthWarning, ReasoningEvidenceInputItem, WeightedEvidenceSnapshot } from '@elceo/types';
import { MARKET_FX_CURRENCY_CODES, MARKET_FX_PAIR_ASSETS } from '@elceo/types';
import { validateMarketFxRelativeStrengthCoverageReport, validateMarketFxRelativeStrengthResult, validateMarketFxRelativeStrengthRuleSetSnapshot } from '@elceo/schemas';
import { getMarketAssetCausalityDescriptor } from '../asset-causality-map/index';
import { normalizeMacroSurprise, parseMacroReleaseInputFromMetadata } from '../macro-surprise-normalization/index';

const THRESHOLD = 15;
const ORIENTATION: Record<MarketFxPairAsset, { base: MarketFxCurrencyCode; quote: MarketFxCurrencyCode }> = {
  eur_usd: { base: 'EUR', quote: 'USD' },
  gbp_usd: { base: 'GBP', quote: 'USD' },
  usd_jpy: { base: 'USD', quote: 'JPY' },
  usd_chf: { base: 'USD', quote: 'CHF' },
  aud_usd: { base: 'AUD', quote: 'USD' },
  nzd_usd: { base: 'NZD', quote: 'USD' },
  usd_cad: { base: 'USD', quote: 'CAD' }
};
type PairLike = MarketFxPairAsset | 'dxy';
type Metadata = Record<string, unknown>;

type ComponentDraft = {
  currency: MarketFxCurrencyCode;
  kind: MarketFxCurrencyPressureComponentKind;
  direction: MarketFxCurrencyPressureDirection;
  score: number;
  confidence: number;
  source: MarketFxCurrencyPressureComponent['source'];
  evidenceIds: string[];
  reasonCodes: MarketFxRelativeStrengthReasonCode[];
  warnings: MarketFxRelativeStrengthWarning[];
  rationale: string;
};

function unique<T extends string>(values: T[]): T[] { return [...new Set(values)]; }
function clamp(n: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, Math.round(n))); }
function parse(json?: string | null): Metadata { if (!json) return {}; try { const parsed: unknown = JSON.parse(json); return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed as Metadata : {}; } catch { return {}; } }
function norm(v: unknown): string { return typeof v === 'string' ? v.trim().toLowerCase().replace(/[\s-]+/g, '_') : ''; }
function body(v: unknown): string { return JSON.stringify(v).toLowerCase(); }
function pressureDirection(score: number, componentCount: number): MarketFxCurrencyPressureDirection { if (componentCount === 0) return 'unknown'; if (score > 10) return 'strengthening'; if (score < -10) return 'weakening'; return 'neutral'; }
function confidenceTier(confidence: number): MarketFxRelativeStrengthResult['confidenceTier'] { return confidence >= 70 ? 'high' : confidence >= 40 ? 'medium' : 'low'; }
function isFxPair(v: unknown): v is MarketFxPairAsset { return typeof v === 'string' && (MARKET_FX_PAIR_ASSETS as readonly string[]).includes(v); }
function resolveWeightedSnapshotPairAsset(snapshot: WeightedEvidenceSnapshot): PairLike {
  const snapshotAsset = String(snapshot.asset);
  if (isFxPair(snapshotAsset)) return snapshotAsset;
  if (snapshotAsset === 'dxy') return 'dxy';
  throw new Error(`fx_relative_strength_unsupported_weighted_snapshot_asset:${snapshotAsset}`);
}

export function resolveFxPairOrientation(pairAsset: PairLike): { baseCurrency: MarketFxCurrencyCode; quoteCurrency: MarketFxCurrencyCode; limitedDiagnostic: boolean } {
  if (pairAsset === 'dxy') return { baseCurrency: 'USD', quoteCurrency: 'EUR', limitedDiagnostic: true };
  const found = ORIENTATION[pairAsset];
  return { baseCurrency: found.base, quoteCurrency: found.quote, limitedDiagnostic: false };
}

function issuerCurrency(metadata: Metadata): MarketFxCurrencyCode | null {
  const candidates = [metadata.affectedCurrency, metadata.currency, metadata.policyIssuerCurrency, metadata.policyCurrency, metadata.policyIssuerRegion, metadata.issuer, metadata.centralBank, metadata.region, metadata.source, metadata.provider, metadata.providerId].map(norm).join('|');
  if (/\b(usd|fed|fomc|federal_reserve|united_states|usa|us)\b/.test(candidates)) return 'USD';
  if (/\b(eur|ecb|eurozone|euro_area|euro_area|european_central_bank)\b/.test(candidates)) return 'EUR';
  if (/\b(gbp|boe|bank_of_england|united_kingdom|uk|britain)\b/.test(candidates)) return 'GBP';
  if (/\b(jpy|boj|bank_of_japan|japan)\b/.test(candidates)) return 'JPY';
  if (/\b(chf|snb|swiss|switzerland)\b/.test(candidates)) return 'CHF';
  if (/\b(aud|rba|reserve_bank_of_australia|australia)\b/.test(candidates)) return 'AUD';
  if (/\b(nzd|rbnz|reserve_bank_of_new_zealand|new_zealand)\b/.test(candidates)) return 'NZD';
  if (/\b(cad|boc|bank_of_canada|canada)\b/.test(candidates)) return 'CAD';
  return null;
}
function tone(metadata: Metadata): 'hawkish' | 'dovish' | null { const values = [metadata.direction, metadata.sentiment, metadata.bias, metadata.tone, metadata.policyTone, metadata.impact].map(norm); if (values.includes('hawkish')) return 'hawkish'; if (values.includes('dovish')) return 'dovish'; return null; }
function positive(metadata: Metadata): boolean { const values = [metadata.direction, metadata.sentiment, metadata.bias, metadata.tone, metadata.impact].map(norm); return !values.some((x) => ['negative','bearish','lower','weaker','weak','risk_off'].includes(x)); }
function add(drafts: ComponentDraft[], draft: ComponentDraft): void { drafts.push({ ...draft, score: clamp(draft.score, -100, 100), confidence: clamp(draft.confidence, 0, 100) }); }
function pressureForTone(policyTone: 'hawkish'|'dovish'): { direction: MarketFxCurrencyPressureDirection; score: number } { return policyTone === 'hawkish' ? { direction: 'strengthening', score: 42 } : { direction: 'weakening', score: -42 }; }


function macroDraft(pairAsset: PairLike, evidence: ReasoningEvidenceInputItem | null, metadata: Metadata, source: MarketFxCurrencyPressureComponent['source']): ComponentDraft | null {
  const hasMacroFields = ['actual','forecast','consensus','expected','previous','prior','revisedPrevious','indicatorKind','indicatorName'].some((k) => Object.prototype.hasOwnProperty.call(metadata, k));
  if (!hasMacroFields) return null;
  const release = normalizeMacroSurprise(parseMacroReleaseInputFromMetadata(JSON.stringify(metadata), evidence ? { releaseId: evidence.payloadId, indicatorName: evidence.evidenceClass, region: evidence.region, observedAt: evidence.observedAt, providerQualityScore: evidence.qualityScore.finalQualityScore } : undefined));
  if (release.currency === 'global' || release.currency === 'unknown') return null;
  const o = resolveFxPairOrientation(pairAsset);
  if (pairAsset !== 'dxy' && release.currency !== o.baseCurrency && release.currency !== o.quoteCurrency) return null;
  const incomplete = release.warnings.includes('missing_forecast') || release.warnings.includes('missing_actual') || release.indicatorKind === 'unknown';
  const direction: MarketFxCurrencyPressureDirection = release.policyPressure === 'hawkish' || release.growthPressure === 'stronger' ? 'strengthening' : release.policyPressure === 'dovish' || release.growthPressure === 'weaker' ? 'weakening' : 'mixed';
  const score = direction === 'strengthening' ? Math.max(18, Math.abs(release.normalizedSurpriseScore) * 0.7) : direction === 'weakening' ? -Math.max(18, Math.abs(release.normalizedSurpriseScore) * 0.7) : 0;
  const kind: MarketFxCurrencyPressureComponentKind = release.category === 'inflation' ? 'normalized_inflation_pressure' : release.category === 'labor_market' ? 'normalized_labor_pressure' : release.category === 'central_bank_policy' ? 'normalized_policy_pressure' : 'normalized_growth_pressure';
  const sideCode: MarketFxRelativeStrengthReasonCode = release.currency === o.baseCurrency ? 'base_currency_pressure' : 'quote_currency_pressure';
  return { currency: release.currency, kind, direction, score, confidence: incomplete ? Math.min(42, release.confidence) : Math.min(72, release.confidence), source, evidenceIds: evidence ? [evidence.payloadId] : [], reasonCodes: ['normalized_macro_surprise_applied', sideCode], warnings: unique([...(incomplete ? ['pending_macro_surprise_normalization' as const] : []), 'requires_price_confirmation' as const, 'provider_activation_gap' as const]), rationale: `${release.currency} ${release.indicatorKind} normalized macro surprise is mapped to its own currency side before pair netting.` };
}

function draftsFromEvidence(pairAsset: PairLike, evidence: ReasoningEvidenceInputItem | null, metadata: Metadata, source: MarketFxCurrencyPressureComponent['source']): ComponentDraft[] {
  const drafts: ComponentDraft[] = [];
  const o = resolveFxPairOrientation(pairAsset);
  const text = body(metadata);
  const evidenceIds = evidence ? [evidence.payloadId] : [];
  const quality = evidence ? evidence.qualityScore.finalQualityScore : 74;
  const macro = macroDraft(pairAsset, evidence, metadata, source); if (macro) add(drafts, macro);
  const policyTone = tone(metadata);
  const currency = issuerCurrency(metadata);
  if (policyTone && currency && (currency === o.baseCurrency || currency === o.quoteCurrency || pairAsset === 'dxy')) {
    const p = pressureForTone(policyTone);
    add(drafts, { currency, kind: 'central_bank_policy', direction: p.direction, score: p.score, confidence: Math.min(78, quality), source, evidenceIds, reasonCodes: unique(['central_bank_policy_side_mapped', currency === 'USD' ? 'usd_side_policy_pressure' : 'non_usd_issuer_side_mapped', currency === o.baseCurrency ? 'base_currency_pressure' : 'quote_currency_pressure']), warnings: ['pending_macro_surprise_normalization','requires_price_confirmation','provider_activation_gap'], rationale: `${currency} policy tone is mapped to its own currency side before pair pressure is netted.` });
  }
  if (/risk_off|liquidity_stress|credit_stress|volatility_shock/.test(text)) {
    if (pairAsset === 'aud_usd' || pairAsset === 'nzd_usd') add(drafts, { currency: o.baseCurrency, kind: 'risk_regime', direction: 'weakening', score: -38, confidence: Math.min(72, quality), source, evidenceIds, reasonCodes: ['risk_regime_asset_context','base_currency_pressure'], warnings: ['requires_price_confirmation','provider_activation_gap'], rationale: 'Risk-off pressure weakens high-beta AUD/NZD base currency context.' });
    if (pairAsset === 'usd_jpy') add(drafts, { currency: 'JPY', kind: 'safe_haven_demand', direction: 'strengthening', score: 36, confidence: Math.min(64, quality), source, evidenceIds, reasonCodes: ['safe_haven_context','quote_currency_pressure'], warnings: ['haven_conflict','requires_price_confirmation','provider_activation_gap'], rationale: 'Risk-off can strengthen JPY quote through haven demand, but USD funding can conflict.' });
    if (pairAsset === 'usd_chf') {
      add(drafts, { currency: 'CHF', kind: 'safe_haven_demand', direction: 'strengthening', score: 34, confidence: Math.min(62, quality), source, evidenceIds, reasonCodes: ['safe_haven_context','quote_currency_pressure'], warnings: ['haven_conflict','risk_regime_conflict','requires_price_confirmation','provider_activation_gap'], rationale: 'Risk-off can strengthen CHF quote through haven demand.' });
      add(drafts, { currency: 'USD', kind: 'funding_stress', direction: 'strengthening', score: 30, confidence: Math.min(58, quality), source, evidenceIds, reasonCodes: ['funding_stress_context','base_currency_pressure'], warnings: ['haven_conflict','risk_regime_conflict','requires_price_confirmation','provider_activation_gap'], rationale: 'Risk-off can also strengthen USD funding demand, creating a CHF/USD haven conflict.' });
    }
    if (pairAsset === 'dxy') add(drafts, { currency: 'USD', kind: 'funding_stress', direction: 'strengthening', score: 34, confidence: Math.min(60, quality), source, evidenceIds, reasonCodes: ['funding_stress_context','dxy_limited_diagnostic'], warnings: ['limited_dxy_diagnostic','requires_price_confirmation','provider_activation_gap'], rationale: 'DXY handling is limited to broad USD funding pressure without basket weights.' });
  }
  if (/risk_on/.test(text) && (pairAsset === 'aud_usd' || pairAsset === 'nzd_usd')) add(drafts, { currency: o.baseCurrency, kind: 'risk_regime', direction: 'strengthening', score: 30, confidence: Math.min(66, quality), source, evidenceIds, reasonCodes: ['risk_regime_asset_context','base_currency_pressure'], warnings: ['requires_price_confirmation','provider_activation_gap'], rationale: 'Risk-on pressure supports high-beta AUD/NZD base currency context.' });
  if (/safe_haven|haven/.test(text)) {
    if (pairAsset === 'usd_jpy') add(drafts, { currency: 'JPY', kind: 'safe_haven_demand', direction: 'strengthening', score: 36, confidence: Math.min(64, quality), source, evidenceIds, reasonCodes: ['safe_haven_context','quote_currency_pressure'], warnings: ['haven_conflict','requires_price_confirmation','provider_activation_gap'], rationale: 'JPY haven demand is mapped to the quote side with conflict caveats.' });
    if (pairAsset === 'usd_chf') add(drafts, { currency: 'CHF', kind: 'safe_haven_demand', direction: 'strengthening', score: 36, confidence: Math.min(64, quality), source, evidenceIds, reasonCodes: ['safe_haven_context','quote_currency_pressure'], warnings: ['haven_conflict','requires_price_confirmation','provider_activation_gap'], rationale: 'CHF haven demand is mapped to the quote side with conflict caveats.' });
  }
  if (/funding_stress|dollar_liquidity|liquidity_stress/.test(text) && (o.baseCurrency === 'USD' || o.quoteCurrency === 'USD' || pairAsset === 'dxy')) add(drafts, { currency: 'USD', kind: /dollar_liquidity/.test(text) ? 'dollar_liquidity' : 'funding_stress', direction: positive(metadata) ? 'strengthening' : 'weakening', score: positive(metadata) ? 36 : -30, confidence: Math.min(68, quality), source, evidenceIds, reasonCodes: ['funding_stress_context','usd_side_policy_pressure'], warnings: ['requires_price_confirmation','provider_activation_gap'], rationale: 'Dollar liquidity or funding stress is mapped to the USD side before pair netting.' });
  if (/intervention/.test(text) && (pairAsset === 'usd_jpy' || pairAsset === 'usd_chf')) add(drafts, { currency: o.quoteCurrency, kind: 'intervention_risk', direction: 'mixed', score: 0, confidence: 36, source, evidenceIds, reasonCodes: ['intervention_risk_caveat','quote_currency_pressure'], warnings: ['intervention_risk','requires_price_confirmation','provider_activation_gap'], rationale: 'Intervention risk is a confidence-lowering caveat rather than a forced pair direction.' });
  if (/fiscal/.test(text) && pairAsset === 'gbp_usd') add(drafts, { currency: 'GBP', kind: 'fiscal_risk', direction: 'weakening', score: -36, confidence: Math.min(66, quality), source, evidenceIds, reasonCodes: ['fiscal_risk_pressure','base_currency_pressure'], warnings: ['requires_price_confirmation','provider_activation_gap'], rationale: 'UK fiscal stress weakens GBP base-side pressure.' });
  if (/oil|energy/.test(text) && pairAsset === 'usd_cad') add(drafts, { currency: 'CAD', kind: 'oil_energy', direction: positive(metadata) ? 'strengthening' : 'weakening', score: positive(metadata) ? 38 : -34, confidence: Math.min(72, quality), source, evidenceIds, reasonCodes: ['commodity_quote_currency_pressure','quote_currency_pressure'], warnings: ['commodity_context_missing','requires_price_confirmation','provider_activation_gap'], rationale: 'Oil and energy terms are mapped to CAD quote-side pressure for USD/CAD.' });
  if (/china|global_demand/.test(text) && (pairAsset === 'aud_usd' || pairAsset === 'nzd_usd')) add(drafts, { currency: o.baseCurrency, kind: 'china_global_demand', direction: positive(metadata) ? 'strengthening' : 'weakening', score: positive(metadata) ? 36 : -34, confidence: Math.min(70, quality), source, evidenceIds, reasonCodes: ['china_demand_commodity_fx','base_currency_pressure'], warnings: ['commodity_context_missing','requires_price_confirmation','provider_activation_gap'], rationale: 'China/global-demand context is mapped to AUD/NZD base-side commodity-beta pressure.' });
  return drafts;
}

function weightedDrafts(snapshot: WeightedEvidenceSnapshot): ComponentDraft[] {
  const pairAsset = resolveWeightedSnapshotPairAsset(snapshot);
  return snapshot.items.flatMap((item) => draftsFromEvidence(pairAsset, null, { evidenceClass: item.evidenceClass, direction: item.direction, reasons: item.reasons.join('|'), contributionScore: item.contributionScore }, 'weighted_evidence').map((draft) => ({
    ...draft,
    confidence: Math.min(draft.confidence, 58),
    warnings: unique([...draft.warnings, 'weighted_snapshot_metadata_limited' as const]),
    rationale: `${draft.rationale} Weighted-snapshot reconstruction is diagnostic because original issuer/currency metadata may be reduced in weighted evidence reasons.`
  })));
}

function toComponents(drafts: ComponentDraft[]): MarketFxCurrencyPressureComponent[] {
  return drafts.map((d, i) => ({ componentId: `fxrs|${d.currency}|${d.kind}|${i + 1}`, currency: d.currency, kind: d.kind, direction: d.direction, score: clamp(d.score, -100, 100), confidence: clamp(d.confidence, 0, 100), source: d.source, evidenceIds: d.evidenceIds, reasonCodes: unique(d.reasonCodes), warnings: unique(d.warnings), rationale: d.rationale }));
}
function snapshotFor(currency: MarketFxCurrencyCode, components: MarketFxCurrencyPressureComponent[], missing: MarketFxRelativeStrengthWarning): MarketFxCurrencyPressureSnapshot {
  const mine = components.filter((c) => c.currency === currency);
  const pressureScore = mine.length ? clamp(mine.reduce((sum, c) => sum + c.score * (c.confidence / 100), 0) / Math.max(1, mine.length), -100, 100) : 0;
  const warnings = unique([...mine.flatMap((c) => c.warnings), ...(mine.length ? [] : [missing])]);
  return { currency, pressureScore, pressureDirection: pressureDirection(pressureScore, mine.length), componentCount: mine.length, representedKinds: unique(mine.map((c) => c.kind)), components: mine, warnings, rationale: mine.length ? `${currency} pressure is aggregated from ${mine.length} deterministic component(s).` : `${currency} side evidence is missing; confidence is penalized rather than inferred from the other side.` };
}
function pairDirection(net: number, components: MarketFxCurrencyPressureComponent[], missingSide: boolean): MarketFxRelativePairDirection {
  if (missingSide && components.length === 0) return 'unknown';
  const hasConflict = components.some((c) => c.warnings.includes('haven_conflict') || c.warnings.includes('relative_magnitude_missing'));
  if (Math.abs(net) < THRESHOLD) return hasConflict ? 'mixed' : 'neutral';
  if (hasConflict) return 'mixed';
  return net > 0 ? 'base_strengthening' : 'quote_strengthening';
}

export function buildFxCurrencyPressureSnapshot(input: { currency: MarketFxCurrencyCode; components: MarketFxCurrencyPressureComponent[]; missingWarning?: MarketFxRelativeStrengthWarning }): MarketFxCurrencyPressureSnapshot {
  return snapshotFor(input.currency, input.components, input.missingWarning ?? 'missing_base_pressure');
}

export function resolveFxRelativeStrength(input: MarketFxRelativeStrengthInput): MarketFxRelativeStrengthResult {
  const pairAsset = input.pairAsset;
  if (input.weightedSnapshot) {
    const weightedPairAsset = resolveWeightedSnapshotPairAsset(input.weightedSnapshot);
    if (weightedPairAsset !== pairAsset) throw new Error(`fx_relative_strength_weighted_snapshot_asset_mismatch:${weightedPairAsset}:${pairAsset}`);
  }
  const orientation = resolveFxPairOrientation(pairAsset);
  const descriptor = pairAsset === 'dxy' ? null : getMarketAssetCausalityDescriptor(pairAsset as MarketAssetCausalityAsset);
  const drafts = [
    ...draftsFromEvidence(pairAsset, null, parse(input.metadataJson), 'metadata'),
    ...(input.evidenceItems ?? []).flatMap((item) => draftsFromEvidence(pairAsset, item, parse(item.metadataJson), 'metadata')),
    ...(input.weightedSnapshot ? weightedDrafts(input.weightedSnapshot) : [])
  ];
  const components = toComponents(drafts);
  const basePressure = snapshotFor(orientation.baseCurrency, components, 'missing_base_pressure');
  const quotePressure = snapshotFor(orientation.quoteCurrency, components, 'missing_quote_pressure');
  const netPressureScore = clamp(basePressure.pressureScore - quotePressure.pressureScore, -100, 100);
  const missingSide = basePressure.componentCount === 0 || quotePressure.componentCount === 0;
  const direction = pairAsset === 'dxy' ? (basePressure.pressureScore > THRESHOLD ? 'base_strengthening' : basePressure.pressureScore < -THRESHOLD ? 'quote_strengthening' : 'neutral') : pairDirection(netPressureScore, components, missingSide);
  const requiresMacro = components.some((c) => c.warnings.includes('pending_macro_surprise_normalization')) || (descriptor?.directionResolutionRequirements.some((r) => r.requiresSurpriseNormalization) ?? false);
  const requiresPrice = components.length === 0 || components.some((c) => c.warnings.includes('requires_price_confirmation')) || (descriptor?.directionResolutionRequirements.some((r) => r.requiresPriceConfirmation) ?? false);
  const providerGap = components.length === 0 || components.some((c) => c.warnings.includes('provider_activation_gap')) || (descriptor?.providerDependencies.some((d) => d.currentStatus === 'pending_provider_activation') ?? false);
  const hasWeightedSnapshot = input.weightedSnapshot !== undefined;
  const warnings = unique([...basePressure.warnings, ...quotePressure.warnings, ...components.flatMap((c) => c.warnings), ...(missingSide ? ['relative_magnitude_missing' as const] : []), ...(pairAsset === 'dxy' ? ['limited_dxy_diagnostic' as const] : []), ...(hasWeightedSnapshot ? ['weighted_snapshot_metadata_limited' as const] : []), ...(providerGap ? ['provider_activation_gap' as const] : []), ...(requiresPrice ? ['requires_price_confirmation' as const] : []), ...(requiresMacro ? ['pending_macro_surprise_normalization' as const] : [])]);
  const reasonCodes = unique([...components.flatMap((c) => c.reasonCodes), 'fx_base_quote_orientation' as const, 'relative_strength_applied' as const, ...(missingSide ? ['missing_side_evidence_penalty' as const] : []), ...(providerGap ? ['provider_gap_visible' as const] : []), ...(requiresPrice ? ['price_confirmation_required' as const] : []), ...(requiresMacro ? ['macro_surprise_pending' as const] : [])]);
  const sideCoverage = missingSide ? 28 : 54;
  const magnitudeBoost = Math.min(22, Math.abs(netPressureScore) / 2);
  const componentBoost = Math.min(16, components.length * 4);
  const warningPenalty = Math.min(24, warnings.length * 3);
  const weightedSnapshotOnly = hasWeightedSnapshot && (!input.evidenceItems || input.evidenceItems.length === 0);
  const maxConfidence = weightedSnapshotOnly ? (missingSide ? 39 : 55) : (missingSide ? 49 : 82);
  const confidence = clamp(sideCoverage + magnitudeBoost + componentBoost - warningPenalty, 0, maxConfidence);
  const result: MarketFxRelativeStrengthResult = { pairAsset, baseCurrency: orientation.baseCurrency, quoteCurrency: orientation.quoteCurrency, basePressure, quotePressure, netPressureScore, pairDirection: direction, confidence, confidenceTier: confidenceTier(confidence), components, reasonCodes, warnings, appliedRuleIds: unique(components.map((c) => `fxrs-${c.kind}`)), requiresMacroSurpriseNormalization: requiresMacro, requiresPriceConfirmation: requiresPrice, providerCoverageStatus: pairAsset === 'dxy' ? 'diagnostic_limited' : providerGap ? 'pending_provider_activation' : 'partial', rationale: hasWeightedSnapshot ? (pairAsset === 'dxy' ? 'DXY is exposed only as a limited broad-USD diagnostic because basket-weight modeling is not implemented; weighted-snapshot reconstruction is diagnostic because original issuer/currency metadata may be reduced.' : `${pairAsset} is resolved as base pressure minus quote pressure; weighted-snapshot reconstruction is diagnostic because original issuer/currency metadata may be reduced, so evidence-item inputs remain preferred for full side attribution.`) : (pairAsset === 'dxy' ? 'DXY is exposed only as a limited broad-USD diagnostic because basket-weight modeling is not implemented.' : `${pairAsset} is resolved as base pressure minus quote pressure; missing sides lower confidence rather than being inferred.`) };
  const validation = validateMarketFxRelativeStrengthResult(result);
  if ('errors' in validation) throw new Error(`fx_relative_strength_invalid:${validation.errors.join('|')}`);
  return result;
}

export function resolveFxRelativeStrengthFromEvidenceItems(pairAsset: PairLike, evidenceItems: ReasoningEvidenceInputItem[], options?: { asOfIso?: string; metadataJson?: string | null }): MarketFxRelativeStrengthResult {
  const input: MarketFxRelativeStrengthInput = { pairAsset, evidenceItems };
  if (options?.metadataJson !== undefined) input.metadataJson = options.metadataJson;
  if (options?.asOfIso !== undefined) input.asOfIso = options.asOfIso;
  return resolveFxRelativeStrength(input);
}
export function resolveFxRelativeStrengthFromWeightedSnapshot(weightedSnapshot: WeightedEvidenceSnapshot, options?: { asOfIso?: string; metadataJson?: string | null }): MarketFxRelativeStrengthResult {
  const pairAsset = resolveWeightedSnapshotPairAsset(weightedSnapshot);
  const input: MarketFxRelativeStrengthInput = { pairAsset, weightedSnapshot };
  if (options?.metadataJson !== undefined) input.metadataJson = options.metadataJson;
  if (options?.asOfIso !== undefined) input.asOfIso = options.asOfIso;
  return resolveFxRelativeStrength(input);
}

export function listFxRelativeStrengthRules(pairAsset?: PairLike): MarketFxRelativeStrengthRule[] { const rules = getFxRelativeStrengthRuleSetSnapshot('2026-06-03T00:00:00.000Z').rules; return pairAsset ? rules.filter((r) => r.pairAssets.includes(pairAsset)) : rules; }
export function getFxRelativeStrengthCoverageReport(asOfIso = new Date().toISOString()): MarketFxRelativeStrengthCoverageReport {
  const report: MarketFxRelativeStrengthCoverageReport = { generatedAt: asOfIso, representedPairAssets: [...MARKET_FX_PAIR_ASSETS], optionalDiagnostics: ['dxy'], pairCount: MARKET_FX_PAIR_ASSETS.length, currencies: [...MARKET_FX_CURRENCY_CODES], dxyCoverage: 'limited_diagnostic', readiness:getMarketReasoningModuleReadiness('fx_relative_strength'), warnings: ['pending_macro_surprise_normalization','requires_price_confirmation','provider_activation_gap','limited_dxy_diagnostic','relative_magnitude_missing','weighted_snapshot_metadata_limited'], notes: ['C6-R3 adds deterministic FX base-vs-quote currency pressure foundation.', 'Missing base or quote evidence lowers confidence.', 'Weighted-snapshot FX relative strength is diagnostic because issuer/currency metadata may be reduced; evidence-item inputs remain preferred.', 'Macro surprise, contradiction, confidence, price reaction, and provider reliability deterministic foundations exist; readiness gaps remain live integration, empirical validation, and production calibration.'] };
  const validation = validateMarketFxRelativeStrengthCoverageReport(report); if ('errors' in validation) throw new Error(`fx_relative_strength_coverage_invalid:${validation.errors.join('|')}`); return report;
}
export function getFxRelativeStrengthRuleSetSnapshot(asOfIso = new Date().toISOString()): MarketFxRelativeStrengthRuleSetSnapshot {
  const allPairs: Array<MarketFxPairAsset | 'dxy'> = [...MARKET_FX_PAIR_ASSETS];
  const rules: MarketFxRelativeStrengthRule[] = [
    { ruleId: 'fxrs-policy-issuer-side', pairAssets: allPairs, componentKind: 'central_bank_policy', sourceCurrency: 'pair_specific', affectedSide: 'both', directionWhenPositive: 'strengthening', confidence: 72, warnings: ['pending_macro_surprise_normalization','requires_price_confirmation','provider_activation_gap'], reasonCodes: ['central_bank_policy_side_mapped','fx_base_quote_orientation'], rationale: 'Central-bank policy evidence is mapped to the issuer currency side before pair netting.' },
    { ruleId: 'fxrs-jpy-chf-haven', pairAssets: ['usd_jpy','usd_chf'], componentKind: 'safe_haven_demand', sourceCurrency: 'pair_specific', affectedSide: 'quote', directionWhenPositive: 'strengthening', confidence: 58, warnings: ['haven_conflict','requires_price_confirmation'], reasonCodes: ['safe_haven_context','quote_currency_pressure'], rationale: 'JPY/CHF haven demand supports the quote side while retaining USD funding conflict caveats.' },
    { ruleId: 'fxrs-aud-nzd-china-risk', pairAssets: ['aud_usd','nzd_usd'], componentKind: 'china_global_demand', sourceCurrency: 'pair_specific', affectedSide: 'base', directionWhenPositive: 'strengthening', confidence: 66, warnings: ['commodity_context_missing','requires_price_confirmation'], reasonCodes: ['china_demand_commodity_fx','base_currency_pressure'], rationale: 'China/global-demand pressure is mapped to AUD/NZD base commodity-beta exposure.' },
    { ruleId: 'fxrs-cad-oil', pairAssets: ['usd_cad'], componentKind: 'oil_energy', sourceCurrency: 'CAD', affectedSide: 'quote', directionWhenPositive: 'strengthening', confidence: 68, warnings: ['commodity_context_missing','requires_price_confirmation'], reasonCodes: ['commodity_quote_currency_pressure','quote_currency_pressure'], rationale: 'Oil/energy pressure is mapped to CAD quote-side pressure for USD/CAD.' },
    { ruleId: 'fxrs-dxy-limited', pairAssets: ['dxy'], componentKind: 'dollar_liquidity', sourceCurrency: 'usd_basket', affectedSide: 'diagnostic', directionWhenPositive: 'strengthening', confidence: 50, warnings: ['limited_dxy_diagnostic','provider_activation_gap'], reasonCodes: ['dxy_limited_diagnostic'], rationale: 'DXY is limited to read-only broad USD diagnostics without full basket weights.' }
  ];
  const snapshot = { generatedAt: asOfIso, threshold: THRESHOLD, rules, coverageReport: getFxRelativeStrengthCoverageReport(asOfIso) };
  const validation = validateMarketFxRelativeStrengthRuleSetSnapshot(snapshot); if ('errors' in validation) throw new Error(`fx_relative_strength_rules_invalid:${validation.errors.join('|')}`); return snapshot;
}
export function assertFxRelativeStrengthRuleSetValid(): true { getFxRelativeStrengthRuleSetSnapshot('2026-06-03T00:00:00.000Z'); return true; }
export function listFxRelativeStrengthWarnings(pairAsset?: PairLike): MarketFxRelativeStrengthWarning[] { return pairAsset === 'dxy' ? ['limited_dxy_diagnostic','provider_activation_gap','requires_price_confirmation'] : ['missing_base_pressure','missing_quote_pressure','pending_macro_surprise_normalization','requires_price_confirmation','provider_activation_gap','relative_magnitude_missing']; }
