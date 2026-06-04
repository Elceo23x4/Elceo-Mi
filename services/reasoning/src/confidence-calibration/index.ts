import type { MarketCognitionSnapshot, MarketConfidenceCalibrationAsset, MarketConfidenceCalibrationBoost, MarketConfidenceCalibrationComponent, MarketConfidenceCalibrationBuildOptions, MarketConfidenceCalibrationCoverageReport, MarketConfidenceCalibrationInput, MarketConfidenceCalibrationPenalty, MarketConfidenceCalibrationPenaltyKind, MarketConfidenceCalibrationReasonCode, MarketConfidenceCalibrationResult, MarketConfidenceCalibrationRule, MarketConfidenceCalibrationRuleSetSnapshot, MarketConfidenceCalibrationWarning, MarketContradictionMatrixResult, WeightedEvidenceSnapshot } from '@elceo/types';
import { MARKET_CONFIDENCE_CALIBRATION_BOOST_KINDS, MARKET_CONFIDENCE_CALIBRATION_COMPONENT_KINDS, MARKET_CONFIDENCE_CALIBRATION_PENALTY_KINDS, MARKET_CONFIDENCE_CALIBRATION_WARNINGS } from '@elceo/types';
import { validateMarketConfidenceCalibrationCoverageReport, validateMarketConfidenceCalibrationInput, validateMarketConfidenceCalibrationResult, validateMarketConfidenceCalibrationRuleSetSnapshot } from '@elceo/schemas';
import { evaluateContradictionsFromWeightedSnapshot } from '../contradiction-matrix/index';
import { getMarketAssetCausalityDescriptor } from '../asset-causality-map/index';
import { resolveFxRelativeStrengthFromWeightedSnapshot } from '../fx-relative-strength/index';

const pending = { priceReactionR7: true, providerReliabilityExpansion: true, goldenScenarioExpansion: true, empiricalBacktesting: true } as const;
const fxAssets = new Set<string>(['eur_usd','gbp_usd','usd_jpy','usd_chf','aud_usd','nzd_usd','usd_cad']);
const clamp = (n: number) => Math.max(0, Math.min(100, n));
function tier(score: number): MarketConfidenceCalibrationResult['confidenceTier'] { return score < 25 ? 'very_low' : score < 45 ? 'low' : score < 65 ? 'medium' : score < 80 ? 'high' : 'very_high'; }
function unique<T extends string>(items: T[]): T[] { return Array.from(new Set(items)); }
function addPenalty(penalties: MarketConfidenceCalibrationPenalty[], kind: MarketConfidenceCalibrationPenaltyKind, magnitude: number, severe: boolean, rationale: string): void { penalties.push({ kind, magnitude: clamp(magnitude), severe, rationale }); }
function hasWarning(input: MarketConfidenceCalibrationInput, warning: string): boolean { return input.warnings.includes(warning) || input.contradictionMatrix?.warnings.includes(warning as never) === true || input.weightedSnapshot?.warnings.includes(warning) === true || input.weightedSnapshot?.items.some((i) => i.reasons.includes(warning) || i.reasons.some((r) => r.includes(warning))) === true; }
function hasReason(input: MarketConfidenceCalibrationInput, reason: string): boolean { return input.reasonCodes.includes(reason) || input.contradictionMatrix?.reasonCodes.includes(reason as never) === true || input.weightedSnapshot?.items.some((i) => i.reasons.some((r) => r.includes(reason))) === true; }
function fromMatrix(input: MarketConfidenceCalibrationInput): MarketContradictionMatrixResult | undefined { return input.contradictionMatrix; }

export function calibrateMarketConfidence(input: MarketConfidenceCalibrationInput): MarketConfidenceCalibrationResult {
  const validation = validateMarketConfidenceCalibrationInput(input); if (validation.ok === false) throw new Error(`invalid_market_confidence_calibration_input:${validation.errors.join('|')}`);
  const components: MarketConfidenceCalibrationComponent[] = [
    { kind:'evidence_quality', score:input.evidenceQuality, contribution:input.evidenceQuality*0.3, rationale:'Evidence quality carries the existing quality component into market-readiness confidence.' },
    { kind:'usable_weight', score:input.usableWeight, contribution:input.usableWeight*0.25, rationale:'Usable evidence weight preserves the current evidence-weight contribution.' },
    { kind:'evidence_freshness', score:input.freshness, contribution:input.freshness*0.2, rationale:'Freshness preserves the current staleness-aware contribution.' },
    { kind:'evidence_coverage', score:input.coverage, contribution:input.coverage*0.25, rationale:'Coverage preserves the current family breadth contribution.' }
  ];
  const penalties: MarketConfidenceCalibrationPenalty[] = [];
  const boosts: MarketConfidenceCalibrationBoost[] = [];
  const reasonCodes: MarketConfidenceCalibrationReasonCode[] = ['base_confidence_from_existing_decomposition','evidence_quality_component_applied','usable_weight_component_applied','freshness_component_applied','coverage_component_applied','deterministic_foundation_only'];
  const warnings: MarketConfidenceCalibrationWarning[] = ['confidence_not_empirically_calibrated','pending_price_reaction_engine','pending_provider_reliability_weighting','pending_golden_scenario_expansion'];
  const matrix = fromMatrix(input);
  if (matrix) {
    const high = matrix.signals.filter((s) => s.severity === 'high' || s.severity === 'critical');
    const moderate = matrix.signals.filter((s) => s.severity === 'moderate');
    const low = matrix.signals.filter((s) => s.severity === 'low');
    const pendingSignals = matrix.signals.filter((s) => s.status === 'pending_confirmation');
    if (high.length > 0 || matrix.highestSeverity === 'high' || matrix.highestSeverity === 'critical') { addPenalty(penalties, 'high_contradiction_severity', high.length ? 16 + high.length * 4 : 16, true, 'High-severity contradiction context materially lowers market-readiness confidence without forcing zero.'); reasonCodes.push('contradiction_severity_penalty'); warnings.push('contradiction_penalty_applied'); }
    if (moderate.length > 0) { addPenalty(penalties, 'excessive_contradiction_count', moderate.length * 7, moderate.length >= 3, 'Moderate tensions accumulate gradually as uncertainty load.'); reasonCodes.push('contradiction_count_penalty'); warnings.push('contradiction_penalty_applied'); }
    if (low.length > 1) { addPenalty(penalties, 'excessive_contradiction_count', low.length * 3, false, 'Multiple low tensions apply a smaller cumulative contradiction penalty.'); reasonCodes.push('contradiction_count_penalty'); warnings.push('contradiction_penalty_applied'); }
    if (pendingSignals.length > 0) { addPenalty(penalties, 'missing_price_confirmation', 15, true, 'Pending confirmation lowers readiness less than a confirmed contradiction but blocks high-confidence event interpretation.'); reasonCodes.push('pending_confirmation_penalty','price_confirmation_pending'); warnings.push('price_confirmation_penalty_applied'); }
  }
  if (hasWarning(input, 'source_independence_unverified')) { addPenalty(penalties, 'source_independence_unverified', 4, false, 'Unverified source independence is a mild caveat when no duplicate burst is present.'); reasonCodes.push('source_independence_caveat'); warnings.push('source_independence_penalty_applied'); }
  if (hasWarning(input, 'duplicate_source_risk')) { addPenalty(penalties, 'duplicate_source_risk', 12, false, 'Duplicate/source-burst risk lowers confidence more than ordinary unverified source independence.'); reasonCodes.push('duplicate_source_penalty'); warnings.push('source_independence_penalty_applied'); }
  if (hasReason(input, 'source_disagreement_detected')) { addPenalty(penalties, 'source_disagreement', 14, false, 'Explicit source disagreement is stronger than a standalone source independence caveat.'); reasonCodes.push('duplicate_source_penalty'); warnings.push('source_independence_penalty_applied'); }
  const eventSensitive = input.options?.eventSensitive === true || input.options?.priceReactionAvailable === false || hasWarning(input, 'requires_price_confirmation') || hasWarning(input, 'missing_price_reaction') || hasWarning(input, 'pending_price_confirmation');
  if (eventSensitive && input.options?.priceReactionAvailable !== true) { addPenalty(penalties, 'missing_price_confirmation', 14, true, 'Event-sensitive evidence is capped until price reaction confirmation is available in R7.'); reasonCodes.push('price_confirmation_pending'); warnings.push('price_confirmation_penalty_applied'); }
  if (hasWarning(input, 'missing_forecast')) { addPenalty(penalties, 'missing_macro_forecast', 15, true, 'Macro result without forecast cannot receive high market-readiness confidence.'); reasonCodes.push('macro_completeness_penalty'); warnings.push('macro_completeness_penalty_applied'); }
  if (hasWarning(input, 'missing_actual')) { addPenalty(penalties, 'missing_macro_actual', 25, true, 'Macro release without actual value is heavily incomplete.'); reasonCodes.push('macro_completeness_penalty'); warnings.push('macro_completeness_penalty_applied'); }
  if (hasWarning(input, 'previous_used_without_forecast') || hasReason(input, 'actual_vs_previous_fallback')) { addPenalty(penalties, 'previous_only_macro_fallback', 10, false, 'Previous-only macro fallback is useful but less complete than actual-vs-forecast normalization.'); reasonCodes.push('macro_completeness_penalty'); warnings.push('macro_completeness_penalty_applied'); }
  if (hasWarning(input, 'historical_distribution_missing')) addPenalty(penalties, 'historical_distribution_missing', 6, false, 'Missing historical distribution applies a moderate normalization caveat.');
  if (hasWarning(input, 'consensus_dispersion_missing')) addPenalty(penalties, 'consensus_dispersion_missing', 5, false, 'Missing consensus dispersion applies a moderate macro context caveat.');
  if (hasWarning(input, 'pending_fx_relative_strength')) { addPenalty(penalties, 'pending_fx_relative_strength', 12, false, 'FX evidence awaits relative-strength completion.'); reasonCodes.push('fx_completeness_penalty'); warnings.push('fx_completeness_penalty_applied'); }
  if (hasWarning(input, 'missing_base_pressure') || hasWarning(input, 'missing_quote_pressure')) { addPenalty(penalties, 'one_sided_fx_evidence', 18, true, 'One-sided base/quote evidence blocks high FX pair confidence.'); reasonCodes.push('fx_completeness_penalty'); warnings.push('fx_completeness_penalty_applied'); }
  if (hasWarning(input, 'weighted_snapshot_metadata_limited')) { addPenalty(penalties, 'weighted_snapshot_metadata_limited', 9, false, 'Weighted FX diagnostic metadata is limited.'); reasonCodes.push('fx_completeness_penalty'); warnings.push('fx_completeness_penalty_applied'); }
  if (input.asset === 'dxy' || input.options?.fxDiagnosticPath === true || hasWarning(input, 'limited_dxy_diagnostic')) { addPenalty(penalties, 'diagnostic_only_dxy', 8, false, 'DXY path is diagnostic-limited and cannot reach very-high confidence.'); reasonCodes.push('diagnostic_path_limited'); warnings.push('diagnostic_path_penalty_applied'); }
  if (hasWarning(input, 'provider_activation_gap')) { addPenalty(penalties, 'provider_activation_gap', 13, true, 'Provider activation gap lowers readiness until live activation work is complete.'); reasonCodes.push('provider_readiness_gap'); warnings.push('provider_readiness_penalty_applied'); }
  if (hasWarning(input, 'missing_provider_reliability') || input.options?.providerReliabilitySupplied !== true) { addPenalty(penalties, 'missing_provider_reliability', 8, false, 'Provider reliability context was not supplied for this calibration input; system-level provider reliability weighting still remains pending.'); reasonCodes.push('provider_readiness_gap'); warnings.push('provider_readiness_penalty_applied'); }
  const staleItems = input.weightedSnapshot?.items.filter((i) => i.reasons.some((r) => r.includes('stale') || r.includes('expired'))).length ?? 0;
  if (input.freshness < 65 || staleItems > 0) { addPenalty(penalties, 'stale_evidence', input.freshness < 45 ? 12 : 7, input.freshness < 35, 'Stale evidence lowers market readiness.'); reasonCodes.push('stale_evidence_penalty'); warnings.push('freshness_penalty_applied'); }
  if (hasWarning(input, 'stale_evidence_conflict')) { addPenalty(penalties, 'stale_fresh_conflict', 12, false, 'Stale and fresh evidence conflict lowers readiness more than staleness alone.'); reasonCodes.push('stale_evidence_penalty'); warnings.push('freshness_penalty_applied'); }
  if (input.coverage < 45) { addPenalty(penalties, 'low_evidence_coverage', 8, false, 'Narrow evidence coverage lowers confidence.'); }
  if (input.usableWeight < 45) { addPenalty(penalties, 'low_usable_weight', 8, false, 'Low usable evidence weight lowers confidence.'); }
  const severe = penalties.some((p) => p.severe);
  if (!severe && input.evidenceQuality >= 80 && input.usableWeight >= 80 && input.freshness >= 80 && input.coverage >= 55 && (!matrix || matrix.highestSeverity === 'none' || matrix.highestSeverity === 'low')) { boosts.push({ kind:'high_quality_evidence', magnitude:3, rationale:'High-quality, fresh, broad evidence receives a modest deterministic boost.' }); boosts.push({ kind:'high_usable_weight', magnitude:2, rationale:'High usable weight adds a small readiness boost.' }); reasonCodes.push('boost_conditions_met'); }
  else if (severe) reasonCodes.push('boost_blocked_by_severe_context');
  let score = clamp(input.baseConfidence + boosts.reduce((n,b)=>n+b.magnitude,0) - penalties.reduce((n,p)=>n+p.magnitude,0));
  if (penalties.some((p) => ['missing_price_confirmation','high_contradiction_severity','one_sided_fx_evidence','missing_macro_forecast'].includes(p.kind))) { score = Math.min(score, 64); reasonCodes.push('confidence_cap_applied'); }
  if (penalties.some((p) => p.kind === 'provider_activation_gap' && p.severe)) { score = Math.min(score, 64); reasonCodes.push('confidence_cap_applied'); }
  if (penalties.some((p) => p.kind === 'missing_provider_reliability')) { score = Math.min(score, 79); reasonCodes.push('confidence_cap_applied'); }
  if (penalties.some((p) => p.kind === 'diagnostic_only_dxy')) { score = Math.min(score, 79); reasonCodes.push('confidence_cap_applied'); }
  const result: MarketConfidenceCalibrationResult = { asset:input.asset, horizon:input.horizon, generatedAt:input.generatedAt, baseConfidence:clamp(input.baseConfidence), finalConfidence:clamp(score), confidenceTier:tier(clamp(score)), components, penalties, boosts, warnings:unique(warnings), reasonCodes:unique(reasonCodes), rationale:'Deterministic confidence calibration adjusts evidence confidence for market-realism readiness gaps without claiming empirical backtesting.', complete:false, pending };
  const valid = validateMarketConfidenceCalibrationResult(result); if (valid.ok === false) throw new Error(`invalid_market_confidence_calibration_result:${valid.errors.join('|')}`);
  return result;
}

export function buildConfidenceCalibrationInputFromWeightedSnapshot(weightedSnapshot: WeightedEvidenceSnapshot, options?: MarketConfidenceCalibrationBuildOptions): MarketConfidenceCalibrationInput {
  const items = weightedSnapshot.items.filter((i) => i.role !== 'excluded');
  const evidenceQuality = items.length ? items.reduce((n,i)=>n+i.finalQualityScore,0)/items.length : 0;
  const usableWeight = weightedSnapshot.totalWeight > 0 ? weightedSnapshot.usableWeight / weightedSnapshot.totalWeight * 100 : 0;
  const stale = items.filter((i)=>i.reasons.some((r)=>r.includes('stale')||r.includes('expired'))).length;
  const freshness = clamp(100 - stale / Math.max(1, items.length) * 100);
  const coverage = clamp(new Set(items.map((i)=>i.evidenceClass)).size / 9 * 100);
  const baseConfidence = clamp(0.3*evidenceQuality + 0.25*usableWeight + 0.2*freshness + 0.25*coverage);
  let fxWarnings: string[] = [];
  if (fxAssets.has(weightedSnapshot.asset)) { try { const fx = resolveFxRelativeStrengthFromWeightedSnapshot(weightedSnapshot); fxWarnings = fx.warnings; } catch { fxWarnings = ['weighted_snapshot_metadata_limited']; } }
  const { contradictionMatrix: suppliedContradictionMatrix, ...calibrationOptions } = options ?? {};
  const contradictionMatrix = suppliedContradictionMatrix ?? evaluateContradictionsFromWeightedSnapshot(weightedSnapshot, calibrationOptions);
  const includeOptions = Object.keys(calibrationOptions).length > 0;
  return { asset:weightedSnapshot.asset, horizon:weightedSnapshot.horizon, generatedAt:weightedSnapshot.generatedAt, baseConfidence, evidenceQuality:clamp(evidenceQuality), usableWeight:clamp(usableWeight), freshness, coverage, weightedSnapshot, contradictionMatrix, warnings:[...weightedSnapshot.warnings, ...fxWarnings, ...contradictionMatrix.warnings], reasonCodes:[...contradictionMatrix.reasonCodes], ...(includeOptions ? { options: calibrationOptions } : {}) };
}
export function calibrateConfidenceFromWeightedSnapshot(weightedSnapshot: WeightedEvidenceSnapshot, options?: MarketConfidenceCalibrationBuildOptions): MarketConfidenceCalibrationResult { return calibrateMarketConfidence(buildConfidenceCalibrationInputFromWeightedSnapshot(weightedSnapshot, options)); }
export function calibrateConfidenceFromMarketCognition(snapshot: MarketCognitionSnapshot, options?: MarketConfidenceCalibrationInput['options']): MarketConfidenceCalibrationResult { const c=snapshot.confidence; return calibrateMarketConfidence({ asset:snapshot.asset, horizon:snapshot.horizon, generatedAt:snapshot.generatedAt, baseConfidence:c.finalConfidence, evidenceQuality:c.evidenceQualityComponent, usableWeight:c.evidenceWeightComponent, freshness:c.freshnessComponent, coverage:c.coverageComponent, marketCognitionSnapshot:snapshot, warnings:snapshot.warnings, reasonCodes:snapshot.contradictions.map((x)=>x.rationale), ...(options ? { options } : {}) }); }

const rules: MarketConfidenceCalibrationRule[] = [
  ...MARKET_CONFIDENCE_CALIBRATION_COMPONENT_KINDS.map((componentKind)=>({ ruleId:`component.${componentKind}`, componentKind, rationale:`Calibration reads ${componentKind} as deterministic confidence context.` })),
  ...MARKET_CONFIDENCE_CALIBRATION_PENALTY_KINDS.map((penaltyKind)=>({ ruleId:`penalty.${penaltyKind}`, penaltyKind, rationale:`Calibration applies bounded ${penaltyKind} penalty when detected.` })),
  ...MARKET_CONFIDENCE_CALIBRATION_BOOST_KINDS.map((boostKind)=>({ ruleId:`boost.${boostKind}`, boostKind, rationale:`Calibration permits capped ${boostKind} boost only when severe gaps are absent.` }))
];
export function getMarketConfidenceCalibrationRuleSetSnapshot(asOfIso = new Date().toISOString()): MarketConfidenceCalibrationRuleSetSnapshot { const snapshot = { generatedAt:asOfIso, rules, warnings:[...MARKET_CONFIDENCE_CALIBRATION_WARNINGS], complete:false as const, pending }; const v=validateMarketConfidenceCalibrationRuleSetSnapshot(snapshot); if(v.ok===false) throw new Error(`invalid_market_confidence_calibration_rules:${v.errors.join('|')}`); return snapshot; }
export function getMarketConfidenceCalibrationCoverageReport(asOfIso = new Date().toISOString()): MarketConfidenceCalibrationCoverageReport { const report = { generatedAt:asOfIso, componentKinds:[...MARKET_CONFIDENCE_CALIBRATION_COMPONENT_KINDS], penaltyKinds:[...MARKET_CONFIDENCE_CALIBRATION_PENALTY_KINDS], boostKinds:[...MARKET_CONFIDENCE_CALIBRATION_BOOST_KINDS], warnings:[...MARKET_CONFIDENCE_CALIBRATION_WARNINGS], notes:['C6-R6 confidence calibration is deterministic foundation-level market readiness scoring.','R7 price reaction, provider reliability weighting, golden scenario expansion, and empirical backtesting remain pending.'], complete:false as const, pending }; const v=validateMarketConfidenceCalibrationCoverageReport(report); if(v.ok===false) throw new Error(`invalid_market_confidence_calibration_coverage:${v.errors.join('|')}`); return report; }
export function assertMarketConfidenceCalibrationRuleSetValid(): MarketConfidenceCalibrationRuleSetSnapshot { return getMarketConfidenceCalibrationRuleSetSnapshot('2026-06-04T00:00:00.000Z'); }
export function listMarketConfidenceCalibrationWarnings(asset?: MarketConfidenceCalibrationAsset): MarketConfidenceCalibrationWarning[] { const extra: MarketConfidenceCalibrationWarning[] = asset === 'dxy' || (asset && fxAssets.has(asset)) ? ['fx_completeness_penalty_applied','diagnostic_path_penalty_applied'] : []; return unique([...MARKET_CONFIDENCE_CALIBRATION_WARNINGS, ...extra]); }
export function listMarketConfidenceCalibrationRules(asset?: MarketConfidenceCalibrationAsset): MarketConfidenceCalibrationRule[] { if (!asset) return [...rules]; try { getMarketAssetCausalityDescriptor(asset as never); } catch { return [...rules]; } return [...rules]; }
