import { getMarketReasoningModuleReadiness } from '../readiness/index';
import type { MarketMacroCurrency, MarketMacroEconomicMeaning, MarketMacroGrowthPressure, MarketMacroIndicatorCategory, MarketMacroIndicatorKind, MarketMacroInflationPressure, MarketMacroPolicyPressure, MarketMacroRegion, MarketMacroReleaseInput, MarketMacroRiskPressure, MarketMacroSurpriseCoverageReport, MarketMacroSurpriseNormalizationResult, MarketMacroSurpriseReasonCode, MarketMacroSurpriseRule, MarketMacroSurpriseRuleSetSnapshot, MarketMacroSurpriseSeverity, MarketMacroSurpriseWarning, ReasoningEvidenceInputItem } from '@elceo/types';
import { MARKET_MACRO_CURRENCIES, MARKET_MACRO_INDICATOR_CATEGORIES, MARKET_MACRO_INDICATOR_KINDS, MARKET_MACRO_REGIONS } from '@elceo/types';
import { validateMarketMacroReleaseInput, validateMarketMacroSurpriseCoverageReport, validateMarketMacroSurpriseNormalizationResult, validateMarketMacroSurpriseRuleSetSnapshot } from '@elceo/schemas';
import { resolveMarketEconomicContext } from '../economic-context/index';

type Metadata = Record<string, unknown>;
type Pressure = { economicMeaning: MarketMacroEconomicMeaning; policyPressure: MarketMacroPolicyPressure; growthPressure: MarketMacroGrowthPressure; inflationPressure: MarketMacroInflationPressure; riskPressure: MarketMacroRiskPressure };
const invertedKinds = new Set<MarketMacroIndicatorKind>(['unemployment_rate','jobless_claims','oil_inventory']);
const inflationKinds = new Set<MarketMacroIndicatorKind>(['cpi_headline','cpi_core','pce_headline','pce_core','average_hourly_earnings']);
const growthKinds = new Set<MarketMacroIndicatorKind>(['gdp','retail_sales','pmi_manufacturing','pmi_services','ism_manufacturing','ism_services','consumer_confidence']);
const laborStrengthKinds = new Set<MarketMacroIndicatorKind>(['nonfarm_payrolls','jolt_openings']);
const laborWeakInverseKinds = new Set<MarketMacroIndicatorKind>(['unemployment_rate','jobless_claims']);
const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, Math.round(n)));
const unique = <T extends string>(values: T[]): T[] => [...new Set(values)];
function parse(json?: string | null): Metadata { if (!json) return {}; try { const parsed: unknown = JSON.parse(json); return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed as Metadata : {}; } catch { return {}; } }
function finite(v: unknown): number | null { return typeof v === 'number' && Number.isFinite(v) ? v : null; }
function numFromMetadata(m: Metadata, keys: string[]): number | null { for (const key of keys) { const v = m[key]; if (typeof v === 'number' && Number.isFinite(v)) return v; if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v); } return null; }
function enumOrUnknown<T extends string>(v: unknown, allowed: readonly T[], unknown: T): T { return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? v as T : unknown; }

export function inferMacroIndicatorKind(input: Partial<MarketMacroReleaseInput> | Metadata): MarketMacroIndicatorKind {
  const explicit = enumOrUnknown(input.indicatorKind, MARKET_MACRO_INDICATOR_KINDS, 'unknown');
  if (explicit !== 'unknown') return explicit;
  const text = [input.indicatorName, input.category, input.metadata ? JSON.stringify(input.metadata) : undefined].map((x) => String(x ?? '')).join('|').toLowerCase();
  if (/core.*cpi|cpi.*core/.test(text)) return 'cpi_core';
  if (/\bcpi\b|consumer_price/.test(text)) return 'cpi_headline';
  if (/core.*pce|pce.*core/.test(text)) return 'pce_core';
  if (/\bpce\b|personal_consumption/.test(text)) return 'pce_headline';
  if (/average_hourly|wage|earnings/.test(text)) return 'average_hourly_earnings';
  if (/nonfarm|payroll|\bnfp\b/.test(text)) return 'nonfarm_payrolls';
  if (/unemployment/.test(text)) return 'unemployment_rate';
  if (/jobless|claims/.test(text)) return 'jobless_claims';
  if (/jolt|opening/.test(text)) return 'jolt_openings';
  if (/\bgdp\b/.test(text)) return 'gdp';
  if (/retail/.test(text)) return 'retail_sales';
  if (/pmi.*manufacturing|manufacturing.*pmi/.test(text)) return 'pmi_manufacturing';
  if (/pmi.*services|services.*pmi/.test(text)) return 'pmi_services';
  if (/ism.*manufacturing|manufacturing.*ism/.test(text)) return 'ism_manufacturing';
  if (/ism.*services|services.*ism/.test(text)) return 'ism_services';
  if (/consumer_confidence|confidence/.test(text)) return 'consumer_confidence';
  if (/rate_decision|policy_rate|central_bank.*rate|rate decision/.test(text)) return 'policy_rate_decision';
  if (/statement.*tone|central_bank_statement/.test(text)) return 'central_bank_statement_tone';
  if (/oil.*inventor|crude.*inventor/.test(text)) return 'oil_inventory';
  return 'unknown';
}
export function inferMacroIndicatorCategory(input: Partial<MarketMacroReleaseInput> | Metadata): MarketMacroIndicatorCategory {
  const explicit = enumOrUnknown(input.category, MARKET_MACRO_INDICATOR_CATEGORIES, 'unknown');
  if (explicit !== 'unknown') return explicit;
  const kind = inferMacroIndicatorKind(input);
  if (inflationKinds.has(kind)) return 'inflation';
  if (laborStrengthKinds.has(kind) || laborWeakInverseKinds.has(kind)) return 'labor_market';
  if (kind === 'gdp') return 'growth_activity';
  if (kind === 'retail_sales') return 'consumption';
  if (['pmi_manufacturing','pmi_services','ism_manufacturing','ism_services'].includes(kind)) return 'business_activity';
  if (kind === 'consumer_confidence') return 'confidence_sentiment';
  if (kind === 'policy_rate_decision' || kind === 'central_bank_statement_tone') return 'central_bank_policy';
  if (kind === 'oil_inventory') return 'commodity_inventory';
  return 'unknown';
}
function macroCurrency(v: string): MarketMacroCurrency { return (MARKET_MACRO_CURRENCIES as readonly string[]).includes(v) ? v as MarketMacroCurrency : 'unknown'; }
function macroRegion(v: string): MarketMacroRegion { return (MARKET_MACRO_REGIONS as readonly string[]).includes(v) ? v as MarketMacroRegion : 'unknown'; }
export function inferMacroCurrencyRegion(input: Partial<MarketMacroReleaseInput> | Metadata): { currency: MarketMacroCurrency; region: MarketMacroRegion } {
  const record = input as Metadata;
  const source = record.metadata && typeof record.metadata === 'object' && !Array.isArray(record.metadata) ? record.metadata as Metadata : record;
  const context = resolveMarketEconomicContext({
    issuerCurrency: source.issuerCurrency ?? source.releaseCurrency ?? source.currency ?? record.currency,
    issuerRegion: source.issuerRegion ?? source.releaseRegion ?? source.region ?? (!source.eventRegion ? record.region : undefined),
    eventRegion: source.eventRegion ?? source.releaseRegion ?? source.region ?? record.region,
    affectedCurrencies: source.affectedCurrencies ?? record.affectedCurrencies,
    affectedCurrency: source.affectedCurrency ?? record.affectedCurrency,
    metadata: {}
  });
  return { currency: macroCurrency(context.issuerCurrency), region: macroRegion(context.eventRegion !== 'unknown' ? context.eventRegion : context.issuerRegion) };
}
function pressure(kind: MarketMacroIndicatorKind, signed: number): Pressure {
  if (signed === 0) return { economicMeaning: 'mixed', policyPressure: 'neutral', growthPressure: 'neutral', inflationPressure: 'neutral', riskPressure: 'neutral' };
  const up = signed > 0;
  if (inflationKinds.has(kind)) return { economicMeaning: up ? 'hotter_inflation' : 'cooler_inflation', policyPressure: up ? 'hawkish' : 'dovish', growthPressure: 'unknown', inflationPressure: up ? 'hotter' : 'cooler', riskPressure: up ? 'risk_negative' : 'risk_supportive' };
  if (kind === 'policy_rate_decision') return { economicMeaning: up ? 'hawkish_policy_surprise' : 'dovish_policy_surprise', policyPressure: up ? 'hawkish' : 'dovish', growthPressure: 'unknown', inflationPressure: 'unknown', riskPressure: up ? 'risk_negative' : 'risk_supportive' };
  if (laborStrengthKinds.has(kind) || laborWeakInverseKinds.has(kind)) return { economicMeaning: up ? 'tighter_labor' : 'weaker_labor', policyPressure: up ? 'hawkish' : 'dovish', growthPressure: up ? 'stronger' : 'weaker', inflationPressure: 'unknown', riskPressure: 'mixed' };
  if (growthKinds.has(kind)) return { economicMeaning: up ? 'stronger_growth' : 'weaker_growth', policyPressure: up ? 'hawkish' : 'dovish', growthPressure: up ? 'stronger' : 'weaker', inflationPressure: 'unknown', riskPressure: up ? 'risk_supportive' : 'risk_negative' };
  if (kind === 'oil_inventory') return { economicMeaning: 'mixed', policyPressure: 'unknown', growthPressure: 'unknown', inflationPressure: 'unknown', riskPressure: 'mixed' };
  return { economicMeaning: 'unknown', policyPressure: 'unknown', growthPressure: 'unknown', inflationPressure: 'unknown', riskPressure: 'unknown' };
}
function severity(score: number): MarketMacroSurpriseSeverity { const a = Math.abs(score); if (a === 0) return 'inline'; if (a < 8) return 'inline'; if (a < 25) return 'mild'; if (a < 50) return 'moderate'; if (a < 80) return 'large'; return 'extreme'; }
function scoreDelta(delta: number, basis: number, std: number | null): number { const denom = std && std > 0 ? std : Math.max(Math.abs(basis) * 0.02, 0.1); return clamp((delta / denom) * 20, -100, 100); }
function confidenceTier(confidence: number): MarketMacroSurpriseNormalizationResult['confidenceTier'] { return confidence >= 70 ? 'high' : confidence >= 40 ? 'medium' : 'low'; }

export function normalizeMacroSurprise(input: MarketMacroReleaseInput): MarketMacroSurpriseNormalizationResult {
  const valid = validateMarketMacroReleaseInput(input); if ('errors' in valid) throw new Error(`macro_release_input_invalid:${valid.errors.join('|')}`);
  const kind = inferMacroIndicatorKind(input); const category = inferMacroIndicatorCategory(input); const cr = inferMacroCurrencyRegion(input);
  const actual = finite(input.actual); const forecast = finite(input.forecast); const previous = finite(input.previous); const revisedPrevious = finite(input.revisedPrevious);
  const warnings: MarketMacroSurpriseWarning[] = ['consensus_dispersion_missing','historical_distribution_missing','pending_asset_direction_resolution','requires_price_confirmation','provider_activation_gap'];
  const reasonCodes: MarketMacroSurpriseReasonCode[] = ['consensus_dispersion_missing_penalty','historical_distribution_missing_penalty','asset_direction_pending','magnitude_bucket_applied','normalized_surprise_score'];
  if (input.consensusDispersion !== undefined && input.consensusDispersion !== null) warnings.splice(warnings.indexOf('consensus_dispersion_missing'), 1);
  if (input.historicalStandardDeviation !== undefined && input.historicalStandardDeviation !== null) warnings.splice(warnings.indexOf('historical_distribution_missing'), 1);
  if (actual === null) warnings.push('missing_actual');
  if (forecast === null) warnings.push('missing_forecast');
  if (previous === null) warnings.push('missing_previous');
  if (revisedPrevious !== null) { warnings.push('revision_present'); reasonCodes.push('revision_adjusted'); } else warnings.push('revision_missing');
  if (!input.unit) warnings.push('unit_ambiguous');
  if (kind === 'unknown') warnings.push('indicator_direction_ambiguous');
  let rawDelta: number | null = null; let comparisonBasis: MarketMacroSurpriseNormalizationResult['comparisonBasis'] = 'insufficient_data';
  if (actual !== null && forecast !== null) { rawDelta = actual - forecast; comparisonBasis = 'actual_vs_forecast'; reasonCodes.push('actual_vs_forecast'); }
  else if (actual !== null && previous !== null) { rawDelta = actual - previous; comparisonBasis = 'actual_vs_previous_fallback'; warnings.push('previous_used_without_forecast'); reasonCodes.push('actual_vs_previous_fallback','forecast_missing_penalty'); }
  else if (actual === null) comparisonBasis = 'missing_actual';
  const interpretedDelta = rawDelta === null ? 0 : invertedKinds.has(kind) ? -rawDelta : rawDelta;
  if (invertedKinds.has(kind)) reasonCodes.push('indicator_direction_inverted');
  const basisValue = forecast ?? previous ?? actual ?? 1;
  const normalizedSurpriseScore = rawDelta === null ? 0 : scoreDelta(interpretedDelta, basisValue, finite(input.historicalStandardDeviation));
  const pct = rawDelta === null ? null : basisValue === 0 ? null : (rawDelta / Math.abs(basisValue)) * 100;
  const sev = severity(normalizedSurpriseScore);
  if (sev === 'inline') warnings.push('low_magnitude_surprise');
  if (sev === 'extreme') warnings.push('outlier_surprise');
  const p = pressure(kind, normalizedSurpriseScore);
  if (category === 'inflation') reasonCodes.push('inflation_policy_pressure');
  if (category === 'labor_market') reasonCodes.push('labor_policy_pressure');
  if (category === 'growth_activity' || category === 'consumption' || category === 'business_activity') reasonCodes.push('growth_policy_pressure');
  if (category === 'central_bank_policy') reasonCodes.push('central_bank_policy_surprise');
  if (cr.currency !== 'unknown' && cr.currency !== 'global') { warnings.push('pending_fx_relative_strength'); reasonCodes.push('fx_relative_strength_pending'); } else if (typeof input.metadata?.affectedCurrency === 'string' || Array.isArray(input.metadata?.affectedCurrencies)) warnings.push('affected_currency_not_issuer','issuer_context_missing');
  let confidence = 76;
  if (actual === null) confidence = 10;
  if (forecast === null) confidence = Math.min(confidence, previous !== null ? 52 : 24);
  if (kind === 'unknown') confidence = Math.min(confidence, 38);
  if (!input.unit) confidence -= 8;
  if (sev === 'inline') confidence -= 12;
  if (warnings.includes('consensus_dispersion_missing')) confidence -= 5;
  if (warnings.includes('historical_distribution_missing')) confidence -= 7;
  if (input.providerQualityScore !== undefined && input.providerQualityScore !== null) confidence = Math.min(confidence, Math.max(0, input.providerQualityScore));
  confidence = clamp(confidence, 0, 100);
  const surpriseDirection = rawDelta === null ? 'unknown' : sev === 'inline' ? 'inline' : rawDelta > 0 ? 'upside_surprise' : rawDelta < 0 ? 'downside_surprise' : 'inline';
  const result: MarketMacroSurpriseNormalizationResult = { releaseId: input.releaseId, affectedCurrencies: Array.isArray(input.metadata?.affectedCurrencies) ? input.metadata.affectedCurrencies.map(String) : (typeof input.metadata?.affectedCurrency === 'string' ? [input.metadata.affectedCurrency] : []), transmissionDriver: typeof input.metadata?.driverKind === 'string' ? input.metadata.driverKind : 'unknown', indicatorKind: kind, category, region: cr.region, currency: cr.currency, actual, forecast, previous, revisedPrevious, rawDelta, percentDelta: pct, normalizedSurpriseScore, surpriseDirection, severity: sev, ...p, confidence, confidenceTier: confidenceTier(confidence), comparisonBasis, reasonCodes: unique(reasonCodes), warnings: unique(warnings), requiresAssetDirectionResolution: true, requiresFxRelativeStrength: cr.currency !== 'unknown' && cr.currency !== 'global', requiresPriceConfirmation: true, rationale: `Macro release ${input.releaseId} normalized with ${comparisonBasis}; actual-vs-forecast is primary when available and asset implication remains context dependent.` };
  const validation = validateMarketMacroSurpriseNormalizationResult(result); if ('errors' in validation) throw new Error(`macro_surprise_result_invalid:${validation.errors.join('|')}`);
  return result;
}

export function parseMacroReleaseInputFromMetadata(metadataJson?: string | null, fallback?: Partial<MarketMacroReleaseInput>): MarketMacroReleaseInput {
  const m = parse(metadataJson);
  const input: MarketMacroReleaseInput = { releaseId: String(m.releaseId ?? m.eventId ?? fallback?.releaseId ?? 'macro-release'), indicatorKind: String(m.indicatorKind ?? m.indicator ?? fallback?.indicatorKind ?? ''), indicatorName: String(m.indicatorName ?? m.name ?? m.title ?? fallback?.indicatorName ?? ''), category: String(m.category ?? fallback?.category ?? ''), region: String(m.eventRegion ?? m.releaseRegion ?? m.region ?? m.country ?? fallback?.region ?? ''), currency: String(m.issuerCurrency ?? m.releaseCurrency ?? m.currency ?? fallback?.currency ?? ''), actual: numFromMetadata(m, ['actual','actualValue','releaseActual']) ?? fallback?.actual ?? null, forecast: numFromMetadata(m, ['forecast','consensus','expected','estimate','releaseForecast']) ?? fallback?.forecast ?? null, previous: numFromMetadata(m, ['previous','prior','previousValue']) ?? fallback?.previous ?? null, revisedPrevious: numFromMetadata(m, ['revisedPrevious','revised','revision','priorRevised']) ?? fallback?.revisedPrevious ?? null, unit: typeof m.unit === 'string' ? m.unit : fallback?.unit ?? null, observedAt: typeof m.observedAt === 'string' ? m.observedAt : fallback?.observedAt ?? null, historicalStandardDeviation: numFromMetadata(m, ['historicalStandardDeviation','historicalSigma']) ?? fallback?.historicalStandardDeviation ?? null, consensusDispersion: numFromMetadata(m, ['consensusDispersion']) ?? fallback?.consensusDispersion ?? null, providerQualityScore: numFromMetadata(m, ['providerQualityScore']) ?? fallback?.providerQualityScore ?? null, metadata: m };
  return input;
}
export function normalizeMacroSurpriseFromEvidenceItem(evidenceItem: ReasoningEvidenceInputItem): MarketMacroSurpriseNormalizationResult { return normalizeMacroSurprise(parseMacroReleaseInputFromMetadata(evidenceItem.metadataJson, { releaseId: evidenceItem.payloadId, indicatorName: evidenceItem.evidenceClass, region: evidenceItem.region, observedAt: evidenceItem.observedAt, providerQualityScore: evidenceItem.qualityScore.finalQualityScore })); }
export function normalizeMacroSurprisesFromEvidenceItems(evidenceItems: ReasoningEvidenceInputItem[]): MarketMacroSurpriseNormalizationResult[] { return evidenceItems.map((item) => normalizeMacroSurpriseFromEvidenceItem(item)); }
export function getMacroSurpriseCoverageReport(asOfIso = new Date().toISOString()): MarketMacroSurpriseCoverageReport { const report: MarketMacroSurpriseCoverageReport = { generatedAt: asOfIso, representedIndicatorKinds: [...MARKET_MACRO_INDICATOR_KINDS], representedCategories: [...MARKET_MACRO_INDICATOR_CATEGORIES], readiness:getMarketReasoningModuleReadiness('macro_surprise'), warnings: ['consensus_dispersion_missing','historical_distribution_missing','pending_asset_direction_resolution','pending_fx_relative_strength','requires_price_confirmation','provider_activation_gap'], notes: ['C6-R4 normalizes actual vs forecast before downstream direction; contradiction readiness remains tracked separately.', 'confidence calibration, price reaction, and provider reliability deterministic foundations exist; provider activation remains blocked.'] }; const validation = validateMarketMacroSurpriseCoverageReport(report); if ('errors' in validation) throw new Error(`macro_surprise_coverage_invalid:${validation.errors.join('|')}`); return report; }
export function getMacroSurpriseRuleSetSnapshot(asOfIso = new Date().toISOString()): MarketMacroSurpriseRuleSetSnapshot { const rules: MarketMacroSurpriseRule[] = [
  { ruleId: 'macro-inflation', indicatorKinds: ['cpi_headline','cpi_core','pce_headline','pce_core','average_hourly_earnings'], category: 'inflation', inverted: false, economicMeanings: ['hotter_inflation','cooler_inflation'], reasonCodes: ['actual_vs_forecast','inflation_policy_pressure'], warnings: ['historical_distribution_missing','requires_price_confirmation'], rationale: 'Inflation and wage releases map higher-than-forecast to hotter inflation and hawkish policy pressure.' },
  { ruleId: 'macro-labor-inverted', indicatorKinds: ['unemployment_rate','jobless_claims'], category: 'labor_market', inverted: true, economicMeanings: ['tighter_labor','weaker_labor'], reasonCodes: ['actual_vs_forecast','indicator_direction_inverted','labor_policy_pressure'], warnings: ['historical_distribution_missing','requires_price_confirmation'], rationale: 'Unemployment and claims are inverted: higher-than-forecast indicates weaker labor.' },
  { ruleId: 'macro-growth', indicatorKinds: ['nonfarm_payrolls','jolt_openings','gdp','retail_sales','pmi_manufacturing','pmi_services','ism_manufacturing','ism_services','consumer_confidence'], category: 'growth_activity', inverted: false, economicMeanings: ['stronger_growth','weaker_growth','tighter_labor','weaker_labor'], reasonCodes: ['actual_vs_forecast','growth_policy_pressure'], warnings: ['historical_distribution_missing','requires_price_confirmation'], rationale: 'Growth and activity releases use actual versus forecast while downstream assets still resolve policy and risk context.' },
  { ruleId: 'macro-policy-rate', indicatorKinds: ['policy_rate_decision'], category: 'central_bank_policy', inverted: false, economicMeanings: ['hawkish_policy_surprise','dovish_policy_surprise'], reasonCodes: ['actual_vs_forecast','central_bank_policy_surprise'], warnings: ['historical_distribution_missing','requires_price_confirmation'], rationale: 'Policy rate decisions map actual above expected to hawkish surprise and below expected to dovish surprise.' }
]; const snapshot = { generatedAt: asOfIso, rules, coverageReport: getMacroSurpriseCoverageReport(asOfIso) }; const validation = validateMarketMacroSurpriseRuleSetSnapshot(snapshot); if ('errors' in validation) throw new Error(`macro_surprise_rules_invalid:${validation.errors.join('|')}`); return snapshot; }
export function assertMacroSurpriseRuleSetValid(): true { getMacroSurpriseRuleSetSnapshot('2026-06-03T00:00:00.000Z'); return true; }
export function listMacroSurpriseWarnings(indicatorKind?: MarketMacroIndicatorKind): MarketMacroSurpriseWarning[] { return indicatorKind === 'unknown' ? ['indicator_direction_ambiguous','missing_forecast','historical_distribution_missing','requires_price_confirmation','provider_activation_gap'] : ['missing_actual','missing_forecast','previous_used_without_forecast','historical_distribution_missing','pending_asset_direction_resolution','pending_fx_relative_strength','requires_price_confirmation','provider_activation_gap']; }
