import assert from 'node:assert/strict';
import { validateMarketMacroReleaseInput, validateMarketMacroSurpriseCoverageReport, validateMarketMacroSurpriseNormalizationResult, validateMarketMacroSurpriseRuleSetSnapshot } from '@elceo/schemas';
import { CanonicalMarketIntelligenceBoundaryService } from '../runtime/canonical-market-intelligence-boundary';
import { assertMacroSurpriseRuleSetValid, getMacroSurpriseCoverageReport, getMacroSurpriseRuleSetSnapshot, normalizeMacroSurprise } from '../macro-surprise-normalization/index';
import { resolveAssetContextualEvidenceDirection } from '../asset-direction-resolution/index';
import { resolveFxRelativeStrength } from '../fx-relative-strength/index';
import { buildWeightedEvidenceItem } from '../evidence-weighting/index';
import type { MarketMacroReleaseInput, ReasoningEvidenceInputItem } from '@elceo/types';

const m = (x: Record<string, unknown>) => JSON.stringify(x);
const cpi = (overrides: Partial<MarketMacroReleaseInput> = {}) => normalizeMacroSurprise({ releaseId: 'cpi', indicatorKind: 'cpi_headline', currency: 'USD', region: 'US', actual: 3.2, forecast: 3, previous: 3.1, unit: 'percent', ...overrides });
function evidence(payloadId: string, metadata: Record<string, unknown>, evidenceClass = 'macro_calendar'): ReasoningEvidenceInputItem { return { payloadId, evidenceTypeId: 'macro', evidenceClass: evidenceClass as ReasoningEvidenceInputItem['evidenceClass'], providerId: 'fixture', asset: null, region: String(metadata.region ?? 'US'), observedAt: '2026-06-03T00:00:00.000Z', normalizedAt: '2026-06-03T00:00:00.000Z', qualityScore: { payloadId, evidenceTypeId: 'macro', providerId: 'fixture', evidenceClass: 'macro_calendar', asset: null, region: String(metadata.region ?? 'US'), observedAt: '2026-06-03T00:00:00.000Z', evaluatedAt: '2026-06-03T00:00:00.000Z', provenanceKind: 'fixture', sourceQualityScore: 80, freshnessScore: 80, completenessScore: 80, conflictScore: 80, finalQualityScore: 80, freshnessStatus: 'fresh', conflictStatus: 'none', usabilityStatus: 'usable', reasons: [] }, usabilityStatus: 'usable', freshnessStatus: 'fresh', conflictStatus: 'none', dataQuality: 'high', valuesJson: '{}', metadataJson: m({ releaseId: payloadId, ...metadata }), reasons: [] }; }
function resolver(asset: Parameters<typeof resolveAssetContextualEvidenceDirection>[0]['asset'], metadata: Record<string, unknown>) { return resolveAssetContextualEvidenceDirection({ asset, evidenceClass: 'macro_calendar', metadataJson: m(metadata), observedAt: '2026-06-03T00:00:00.000Z' }); }

export function runMacroSurpriseNormalizationTests(): void {
  const valid = cpi();
  assert(validateMarketMacroReleaseInput({ releaseId: 'x', actual: 1, forecast: 2 }).ok, 'release input schema validates numeric fields');
  assert(validateMarketMacroSurpriseNormalizationResult(valid).ok, 'normalization result validates');
  assert(validateMarketMacroSurpriseRuleSetSnapshot(getMacroSurpriseRuleSetSnapshot()).ok && assertMacroSurpriseRuleSetValid(), 'rule set validates');
  const coverage = getMacroSurpriseCoverageReport();
  assert(validateMarketMacroSurpriseCoverageReport(coverage).ok && coverage.pendingPhases.includes('R5') && coverage.pendingPhases.includes('R6') && coverage.pendingPhases.includes('R7') && coverage.pendingPhases.includes('provider_reliability'), 'coverage keeps R5/R6/R7/provider reliability pending');
  const boundary = CanonicalMarketIntelligenceBoundaryService.prototype;
  assert(boundary.normalizeMacroSurprise({ releaseId: 'b', indicatorKind: 'gdp', actual: 2, forecast: 1, unit: 'pct' }).economicMeaning === 'stronger_growth', 'canonical boundary exposes normalizeMacroSurprise');
  assert(!/\b(buy|sell|hold|guaranteed profit|risk-free)\b/i.test(valid.rationale), 'no advice language');

  assert(valid.surpriseDirection === 'upside_surprise' && valid.economicMeaning === 'hotter_inflation' && valid.policyPressure === 'hawkish' && valid.inflationPressure === 'hotter', 'CPI upside is hotter/hawkish');
  assert(cpi({ forecast: 3.5 }).surpriseDirection === 'downside_surprise' && cpi({ forecast: 3.5 }).economicMeaning === 'cooler_inflation', 'CPI downside is cooler');
  assert(cpi({ actual: 3.2, forecast: 3 }).surpriseDirection !== cpi({ actual: 3.2, forecast: 3.5 }).surpriseDirection, 'same CPI actual changes direction under different forecasts');
  assert(normalizeMacroSurprise({ releaseId: 'nfp', indicatorKind: 'nonfarm_payrolls', actual: 250, forecast: 180, unit: 'k' }).economicMeaning === 'tighter_labor', 'payroll upside stronger labor');
  assert(normalizeMacroSurprise({ releaseId: 'u', indicatorKind: 'unemployment_rate', actual: 4.2, forecast: 4, unit: 'percent' }).economicMeaning === 'weaker_labor', 'unemployment upside is weaker labor');
  assert(normalizeMacroSurprise({ releaseId: 'jc', indicatorKind: 'jobless_claims', actual: 260, forecast: 220, unit: 'k' }).economicMeaning === 'weaker_labor', 'claims upside is weaker labor');
  assert(normalizeMacroSurprise({ releaseId: 'gdp', indicatorKind: 'gdp', actual: 3, forecast: 2, unit: 'percent' }).economicMeaning === 'stronger_growth', 'GDP upside stronger growth');
  assert(normalizeMacroSurprise({ releaseId: 'pmi', indicatorKind: 'pmi_services', actual: 49, forecast: 52, unit: 'index' }).economicMeaning === 'weaker_growth', 'PMI downside weaker growth');
  assert(normalizeMacroSurprise({ releaseId: 'rate-up', indicatorKind: 'policy_rate_decision', actual: 5.5, forecast: 5.25, unit: 'percent' }).economicMeaning === 'hawkish_policy_surprise', 'rate upside hawkish');
  assert(normalizeMacroSurprise({ releaseId: 'rate-down', indicatorKind: 'policy_rate_decision', actual: 5, forecast: 5.25, unit: 'percent' }).economicMeaning === 'dovish_policy_surprise', 'rate downside dovish');
  const fallback = cpi({ forecast: null, previous: 3.1 });
  assert(fallback.warnings.includes('previous_used_without_forecast') && fallback.confidence <= 55, 'forecast missing previous fallback lowers confidence');
  assert(cpi({ actual: null }).warnings.includes('missing_actual') && cpi({ actual: null }).surpriseDirection === 'unknown', 'actual missing returns warning and unknown');
  assert(cpi({ revisedPrevious: 2.9 }).warnings.includes('revision_present') && cpi({ revisedPrevious: 2.9 }).reasonCodes.includes('revision_adjusted'), 'revision context present');
  assert(valid.warnings.includes('historical_distribution_missing'), 'historical distribution missing warning');
  assert(cpi({ actual: 3.0001, forecast: 3 }).surpriseDirection === 'inline' || cpi({ actual: 3.0001, forecast: 3 }).warnings.includes('low_magnitude_surprise'), 'tiny surprise is inline/low magnitude');
  assert(cpi({ actual: 9, forecast: 3 }).warnings.includes('outlier_surprise'), 'extreme surprise flagged');

  const dxy = resolver('dxy', { indicatorKind: 'cpi_headline', actual: 3.2, forecast: 3, previous: 3.1, currency: 'USD', region: 'US', unit: 'percent' });
  assert(dxy.reasonCodes.includes('normalized_macro_surprise_applied') && !dxy.warnings.includes('pending_macro_surprise_normalization'), 'DXY CPI normalized without pending macro warning');
  assert(resolver('eur_usd', { indicatorKind: 'cpi_headline', actual: 3.2, forecast: 3, currency: 'USD', region: 'US', unit: 'percent' }).pressureTarget === 'quote_currency', 'EUR/USD US CPI maps USD quote side');
  assert(resolver('eur_usd', { indicatorKind: 'cpi_headline', actual: 2.8, forecast: 3, currency: 'USD', region: 'US', unit: 'percent' }).resolvedDirection === 'bullish', 'EUR/USD downside US CPI weakens quote/supports base direction');
  assert(resolver('dxy', { indicatorKind: 'unemployment_rate', actual: 4.2, forecast: 4, currency: 'USD', region: 'US', unit: 'percent' }).resolvedDirection !== 'bullish', 'higher unemployment not treated as bullish');
  assert(resolver('dxy', { indicatorKind: 'jobless_claims', actual: 260, forecast: 220, currency: 'USD', region: 'US', unit: 'k' }).resolvedDirection !== 'bullish', 'higher claims not treated as bullish');
  assert(resolver('dxy', { indicatorKind: 'cpi_headline', actual: 3.2, previous: 3.1, currency: 'USD', region: 'US', unit: 'percent' }).confidence <= 35, 'actual-only CPI does not create high-confidence direction');

  assert(resolveFxRelativeStrength({ pairAsset: 'eur_usd', metadataJson: m({ indicatorKind: 'cpi_headline', actual: 3.2, forecast: 3, currency: 'USD', region: 'US', unit: 'percent' }) }).quotePressure.componentCount > 0, 'US CPI maps USD side for EUR/USD');
  assert(resolveFxRelativeStrength({ pairAsset: 'eur_usd', metadataJson: m({ indicatorKind: 'cpi_headline', actual: 3.2, forecast: 3, currency: 'EUR', region: 'eurozone', unit: 'percent' }) }).basePressure.componentCount > 0, 'Eurozone CPI maps EUR side');
  assert(resolveFxRelativeStrength({ pairAsset: 'gbp_usd', metadataJson: m({ indicatorKind: 'cpi_headline', actual: 3.2, forecast: 3, currency: 'GBP', region: 'UK', unit: 'percent' }) }).basePressure.componentCount > 0, 'UK CPI maps GBP side');
  assert(resolveFxRelativeStrength({ pairAsset: 'usd_jpy', metadataJson: m({ indicatorKind: 'policy_rate_decision', actual: 0.75, forecast: 0.5, currency: 'JPY', region: 'Japan', unit: 'percent' }) }).quotePressure.componentCount > 0, 'Japan rate maps JPY side');
  assert(resolveFxRelativeStrength({ pairAsset: 'usd_cad', metadataJson: m({ indicatorKind: 'policy_rate_decision', actual: 4.75, forecast: 4.5, currency: 'CAD', region: 'Canada', unit: 'percent' }) }).quotePressure.componentCount > 0, 'Canada rate maps CAD side');
  const missingFx = resolveFxRelativeStrength({ pairAsset: 'eur_usd', metadataJson: m({ indicatorKind: 'cpi_headline', actual: 3.2, previous: 3.1, currency: 'USD', region: 'US', unit: 'percent' }) });
  assert(missingFx.confidence < 50 && missingFx.warnings.includes('pending_macro_surprise_normalization') && missingFx.warnings.includes('relative_magnitude_missing'), 'missing forecast lowers FX confidence and one-sided penalty remains');

  const weightedCpi = buildWeightedEvidenceItem(evidence('weighted-cpi', { indicatorKind: 'cpi_headline', actual: 3.2, forecast: 3, currency: 'USD', region: 'US', unit: 'percent' }), 'dxy', 'intraday');
  assert(weightedCpi.reasons.some((r) => r.includes('normalized_macro_surprise_applied')), 'weighted CPI carries normalized reason');
  const weightedActualOnly = buildWeightedEvidenceItem(evidence('weighted-actual', { indicatorKind: 'cpi_headline', actual: 3.2, currency: 'USD', region: 'US', unit: 'percent' }), 'dxy', 'intraday');
  assert(weightedActualOnly.direction === 'unknown' && weightedActualOnly.contributionScore === 0, 'actual-only CPI does not create high-confidence false contribution');
  const weightedUnemployment = buildWeightedEvidenceItem(evidence('weighted-u', { indicatorKind: 'unemployment_rate', actual: 4.2, forecast: 4, currency: 'USD', region: 'US', unit: 'percent' }), 'dxy', 'intraday');
  assert(weightedUnemployment.reasons.some((r) => r.includes('macro_labor_pressure_context')), 'unemployment inversion appears in reasons');
}
