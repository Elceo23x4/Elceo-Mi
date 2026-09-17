import { getMarketReasoningModuleReadiness } from '../readiness/index';
import { validateMarketConfidenceCalibrationCoverageReport, validateMarketConfidenceCalibrationInput, validateMarketConfidenceCalibrationResult, validateMarketConfidenceCalibrationRuleSetSnapshot } from '@elceo/schemas';
import type { EvidenceWeightHorizon, MarketConfidenceCalibrationInput, MarketContradictionMatrixResult, WeightedEvidenceItem, WeightedEvidenceSnapshot } from '@elceo/types';
import { buildMarketCognitionSnapshot } from '../market-cognition/index.js';
import { buildConfidenceCalibrationInputFromWeightedSnapshot, calibrateConfidenceFromWeightedSnapshot, calibrateMarketConfidence, getMarketConfidenceCalibrationCoverageReport, getMarketConfidenceCalibrationRuleSetSnapshot } from '../confidence-calibration/index.js';
import { evaluatePriceReaction } from '../price-reaction/index.js';
import { CanonicalMarketIntelligenceBoundaryService } from '../runtime/canonical-market-intelligence-boundary.js';
import { MemoryMarketEvidenceRegistrySnapshotRepository, MemorySeoContentArchitectureSnapshotRepository } from '../persistence/registry-snapshot-repository.js';
function assert(condition: boolean, message: string): void { if (!condition) throw new Error(`Assertion failed: ${message}`); }
const at = '2026-06-04T00:00:00.000Z';
const item = (id: string, evidenceClass: WeightedEvidenceItem['evidenceClass'], direction: WeightedEvidenceItem['direction'], reasons: string[] = [], quality = 90): WeightedEvidenceItem => ({ payloadId:id, asset:'sp500', horizon:'intraday', evidenceTypeId:evidenceClass, evidenceClass, providerId:'fixture', observedAt:at, finalQualityScore:quality, baseWeight:50, qualityAdjustedWeight:45, role:'primary_driver', direction, contributionScore:45, reasons });
const assetItem=(asset:WeightedEvidenceItem['asset'],id:string,evidenceClass:WeightedEvidenceItem['evidenceClass'],reasons:string[]=[]):WeightedEvidenceItem=>({...item(id,evidenceClass,'bullish',reasons),asset});
const snapshot = (items: WeightedEvidenceItem[], warnings: string[] = []): WeightedEvidenceSnapshot => ({ snapshotId:`w-${items.map((i)=>i.payloadId).join('-')}`, generatedAt:at, asset:items[0]?.asset ?? 'sp500', horizon:'intraday' as EvidenceWeightHorizon, totalWeight:100, usableWeight:90, excludedWeight:0, items, warnings });
const matrix = (highestSeverity: MarketContradictionMatrixResult['highestSeverity'], signalCount = 0): MarketContradictionMatrixResult => ({ resultId:`matrix-${highestSeverity}-${signalCount}`, asset:'sp500', horizon:'intraday', generatedAt:at, status:highestSeverity === 'none' ? 'aligned' : highestSeverity === 'high' || highestSeverity === 'critical' ? 'contradiction' : 'tension', highestSeverity, signals:Array.from({length:signalCount},(_,i)=>({ signalId:`supplied-${highestSeverity}-${i}`, ruleId:'supplied_context', family:'risk_vs_credit' as const, asset:'sp500' as const, horizon:'intraday' as const, generatedAt:at, status:'contradiction' as const, severity:highestSeverity === 'none' ? 'low' as const : highestSeverity === 'critical' ? 'critical' as const : highestSeverity === 'high' ? 'high' as const : highestSeverity === 'moderate' ? 'moderate' as const : 'low' as const, confidenceTier:'high' as const, evidencePointIds:['supplied-a','supplied-b'], warnings:[], reasonCodes:['contradiction_matrix_rule_applied' as const], rationale:'Supplied contradiction context for calibration drift test' })), evidencePoints:[], warnings:[], reasonCodes:[], rationale:'supplied matrix context', readiness:getMarketReasoningModuleReadiness('contradiction_matrix') });
const input = (partial: Partial<MarketConfidenceCalibrationInput>): MarketConfidenceCalibrationInput => ({ asset:'sp500', horizon:'intraday', generatedAt:at, baseConfidence:75, evidenceQuality:90, usableWeight:90, freshness:90, coverage:70, warnings:[], reasonCodes:[], options:{ providerReliabilitySupplied:true, sourceIndependenceVerified:true, priceReactionAvailable:true }, ...partial });
export function runConfidenceCalibrationTests(): void {
  const cleanInput = input({ options:{ sourceIndependenceVerified:true, priceReactionAvailable:true } });
  assert(validateMarketConfidenceCalibrationInput(cleanInput).ok, 'schema validator accepts calibration input');
  const clean = calibrateMarketConfidence(cleanInput);
  assert(validateMarketConfidenceCalibrationResult(clean).ok, 'schema validator accepts calibration result');
  assert(clean.confidenceTier === 'high' && clean.finalConfidence < 80, 'clean strong evidence can reach high but provider reliability pending blocks very high by default when omitted only in result pending');
  const ruleSet = getMarketConfidenceCalibrationRuleSetSnapshot(at); const coverage = getMarketConfidenceCalibrationCoverageReport(at);
  assert(validateMarketConfidenceCalibrationRuleSetSnapshot(ruleSet).ok, 'rule set validates');
  assert(validateMarketConfidenceCalibrationCoverageReport(coverage).ok && coverage.readiness.moduleId === 'confidence_calibration' && coverage.readiness.deterministicFoundationStatus === 'implemented', 'coverage report keeps pending expansions');
  assert(!JSON.stringify(clean).match(/\b(buy|sell|hold|guaranteed profit|risk-free)\b/i), 'no direct advice language');
  const providerSupplied = calibrateMarketConfidence(input({ options:{ providerReliabilitySupplied:true, sourceIndependenceVerified:true, priceReactionAvailable:true } }));
  const providerMissing = calibrateMarketConfidence(input({ options:{ sourceIndependenceVerified:true, priceReactionAvailable:true } }));
  assert(providerSupplied.readiness.moduleId === 'confidence_calibration' && providerSupplied.warnings.includes('pending_provider_reliability_weighting'), 'provider context supplied keeps global provider reliability expansion pending warning');
  assert(!providerSupplied.penalties.some((p)=>p.kind==='missing_provider_reliability') && providerMissing.penalties.some((p)=>p.kind==='missing_provider_reliability'), 'input-level provider reliability context controls only the missing provider reliability penalty');
  assert(providerMissing.finalConfidence < providerSupplied.finalConfidence && providerMissing.finalConfidence <= 79, 'missing provider reliability lowers confidence and applies cap');
  const severe = calibrateMarketConfidence(input({ contradictionMatrix:{ resultId:'m', asset:'sp500', horizon:'intraday', generatedAt:at, status:'contradiction', highestSeverity:'high', signals:[{ signalId:'s', ruleId:'r', family:'risk_vs_credit', asset:'sp500', horizon:'intraday', generatedAt:at, status:'contradiction', severity:'high', confidenceTier:'high', evidencePointIds:['a','b'], warnings:[], reasonCodes:['contradiction_matrix_rule_applied'], rationale:'High severity contradiction context' }], evidencePoints:[], warnings:[], reasonCodes:['contradiction_matrix_rule_applied'], rationale:'matrix', readiness:getMarketReasoningModuleReadiness('contradiction_matrix') } }));
  assert(severe.finalConfidence <= clean.finalConfidence - 15 && severe.confidenceTier !== 'high' && severe.confidenceTier !== 'very_high', 'severe contradiction lowers confidence materially and blocks high tiers');
  const moderateSignals = (count: number) => calibrateMarketConfidence(input({ contradictionMatrix:{ resultId:`mod${count}`, asset:'sp500', horizon:'intraday', generatedAt:at, status:'tension', highestSeverity:'moderate', signals:Array.from({length:count},(_,i)=>({ signalId:`s${i}`, ruleId:'r', family:'risk_vs_credit', asset:'sp500' as const, horizon:'intraday' as const, generatedAt:at, status:'tension' as const, severity:'moderate' as const, confidenceTier:'medium' as const, evidencePointIds:['a'], warnings:[], reasonCodes:['contradiction_matrix_rule_applied' as const], rationale:'Moderate tension context' })), evidencePoints:[], warnings:[], reasonCodes:['contradiction_matrix_rule_applied'], rationale:'matrix', readiness:getMarketReasoningModuleReadiness('contradiction_matrix') } }));
  assert(moderateSignals(3).finalConfidence < moderateSignals(1).finalConfidence, 'multiple moderate tensions lower confidence more than one low/moderate tension');
  assert(calibrateMarketConfidence(input({ options:{ eventSensitive:true, priceReactionAvailable:false, providerReliabilitySupplied:true, sourceIndependenceVerified:true } })).confidenceTier === 'medium', 'pending price confirmation caps below high');
  assert(calibrateMarketConfidence(input({ warnings:['missing_forecast'], options:{ macroDriven:true, providerReliabilitySupplied:true, sourceIndependenceVerified:true, priceReactionAvailable:true } })).confidenceTier === 'medium', 'missing macro forecast lowers and caps confidence');
  assert(calibrateMarketConfidence(input({ warnings:['previous_used_without_forecast'] })).finalConfidence < clean.finalConfidence, 'previous-only macro fallback lowers confidence');
  assert(calibrateMarketConfidence(input({ warnings:['missing_actual'] })).finalConfidence <= clean.finalConfidence - 20, 'missing macro actual heavily lowers confidence');
  assert(calibrateMarketConfidence(input({ asset:'eur_usd', warnings:['missing_base_pressure'] })).confidenceTier !== 'high', 'one-sided FX evidence lowers and caps confidence');
  assert(calibrateMarketConfidence(input({ asset:'eur_usd', warnings:['pending_fx_relative_strength'] })).finalConfidence < clean.finalConfidence, 'pending FX relative strength lowers confidence');
  assert(calibrateMarketConfidence(input({ asset:'eur_usd', warnings:['weighted_snapshot_metadata_limited'] })).finalConfidence < clean.finalConfidence, 'weighted snapshot metadata limitation lowers confidence');
  assert(calibrateMarketConfidence(input({ asset:'dxy', options:{ fxDiagnosticPath:true, providerReliabilitySupplied:true, sourceIndependenceVerified:true, priceReactionAvailable:true } })).confidenceTier !== 'very_high', 'DXY diagnostic-limited path cannot reach very high');
  const unverified = calibrateMarketConfidence(input({ warnings:['source_independence_unverified'] })); const duplicate = calibrateMarketConfidence(input({ warnings:['source_independence_unverified','duplicate_source_risk'], reasonCodes:['source_disagreement_detected'] }));
  assert(duplicate.finalConfidence < unverified.finalConfidence - 8 && clean.finalConfidence - unverified.finalConfidence <= 5, 'duplicate/source disagreement is stronger than mild source independence caveat');
  assert(calibrateMarketConfidence(input({ freshness:40 })).finalConfidence < clean.finalConfidence, 'stale evidence lowers confidence');
  assert(calibrateMarketConfidence(input({ warnings:['stale_evidence_conflict'] })).finalConfidence < clean.finalConfidence, 'stale/fresh conflict lowers confidence');
  assert(calibrateMarketConfidence(input({ warnings:['provider_activation_gap'] })).confidenceTier === 'medium', 'provider activation gap lowers and caps confidence');
  assert(clean.boosts.length > 0, 'high quality/fresh/broad evidence can modestly improve when severe penalties are absent');
  assert(severe.finalConfidence >= 0 && clean.finalConfidence <= 100, 'confidence never goes below 0 or above 100');
  const cleanWeighted = snapshot([item('risk','risk_sentiment','bullish'), item('liq','liquidity_conditions','bullish'), item('macro','economic_indicator','bullish')]);
  const cognition = buildMarketCognitionSnapshot(cleanWeighted);
  assert(cognition.confidence.rationale.includes('C6-R6 deterministic calibration'), 'market cognition uses calibrated final confidence');
  const confirmedReaction = evaluatePriceReaction({ asset:'sp500', horizon:'intraday', eventKind:'macro_release', eventTime:at, expectedDirection:'bullish', candles:[{ timestamp:'2026-06-03T23:58:00.000Z', open:100, high:100.2, low:99.8, close:100 }, { timestamp:at, open:100, high:101.2, low:99.9, close:101 }, { timestamp:'2026-06-04T00:01:00.000Z', open:101, high:101.5, low:100.8, close:101.3 }, { timestamp:'2026-06-04T00:03:00.000Z', open:101.3, high:102, low:101.1, close:101.8 }] });
  assert(cognition.confidence.finalConfidence < calibrateConfidenceFromWeightedSnapshot(cleanWeighted, { providerReliabilitySupplied:true, sourceIndependenceVerified:true, priceReaction:confirmedReaction }).finalConfidence, 'market cognition keeps conservative provider/source defaults unless confirmed price reaction context is supplied');
  assert(cognition.confidence.rationale.includes('Conservative provider/source context'), 'market cognition rationale states conservative calibration context');

  const broadNonPrimaryNasdaq=snapshot([
    assetItem('nasdaq_100','broad-policy','central_bank_policy'),assetItem('nasdaq_100','broad-real','real_yields'),assetItem('nasdaq_100','broad-financial','financial_conditions'),assetItem('nasdaq_100','broad-breadth','equity_index_breadth'),assetItem('nasdaq_100','broad-vol','volatility_surface')
  ]);
  const broadNonPrimaryResult=calibrateMarketConfidence(input({asset:'nasdaq_100',baseConfidence:95,evidenceQuality:95,usableWeight:95,freshness:95,coverage:95,weightedSnapshot:broadNonPrimaryNasdaq,options:{providerReliabilitySupplied:true,sourceIndependenceVerified:true,priceReactionAvailable:true}}));
  const broadCriticalComponent=broadNonPrimaryResult.components.find((c)=>c.kind==='asset_causality_coverage');
  assert(broadCriticalComponent?.score===0,'broad high-quality evidence does not count as Nasdaq primary-driver coverage when risk, rates, and earnings primary classes are absent');
  assert(broadNonPrimaryResult.finalConfidence<=64&&!broadNonPrimaryResult.boosts.some((b)=>b.kind==='high_quality_evidence'),'zero asset-primary coverage blocks high confidence and prevents breadth/quality boost');
  assert(broadNonPrimaryResult.penalties.some((p)=>p.kind==='low_evidence_coverage'&&p.severe),'zero primary coverage is a severe asset-causality coverage gap');

  const stalePrimaryNasdaq=snapshot([
    assetItem('nasdaq_100','risk-primary','risk_sentiment'),assetItem('nasdaq_100','rates-stale','interest_rates',['stale_evidence']),assetItem('nasdaq_100','earnings-primary','earnings_macro')
  ]);
  const stalePrimaryResult=calibrateMarketConfidence(input({asset:'nasdaq_100',baseConfidence:95,evidenceQuality:95,usableWeight:95,freshness:90,coverage:95,weightedSnapshot:stalePrimaryNasdaq,options:{providerReliabilitySupplied:true,sourceIndependenceVerified:true,priceReactionAvailable:true}}));
  const staleCriticalComponent=stalePrimaryResult.components.find((c)=>c.kind==='asset_causality_coverage');
  assert(staleCriticalComponent!==undefined&&staleCriticalComponent.score>60&&staleCriticalComponent.score<70,'stale primary driver is excluded from fresh asset-primary coverage');
  assert(stalePrimaryResult.finalConfidence<=79,'partial asset-primary coverage cannot reach very-high confidence');

  const completePrimaryNasdaq=snapshot([
    assetItem('nasdaq_100','risk-fresh','risk_sentiment'),assetItem('nasdaq_100','rates-fresh','interest_rates'),assetItem('nasdaq_100','earnings-fresh','earnings_macro')
  ]);
  const completePrimaryResult=calibrateMarketConfidence(input({asset:'nasdaq_100',baseConfidence:95,evidenceQuality:95,usableWeight:95,freshness:95,coverage:95,weightedSnapshot:completePrimaryNasdaq,options:{providerReliabilitySupplied:true,sourceIndependenceVerified:true,priceReactionAvailable:true}}));
  assert(completePrimaryResult.components.find((c)=>c.kind==='asset_causality_coverage')?.score===100,'all fresh Nasdaq primary-driver classes satisfy the asset-critical blueprint');
  assert(!completePrimaryResult.penalties.some((p)=>p.kind==='low_evidence_coverage')&&completePrimaryResult.finalConfidence>stalePrimaryResult.finalConfidence,'complete fresh primary coverage removes the asset-critical penalty and outranks stale partial coverage');

  const contradictory = snapshot([item('risk','risk_sentiment','bullish'), item('credit','credit_stress','bullish')]);
  assert(buildMarketCognitionSnapshot(contradictory).confidence.conflictPenalty > 0 && buildMarketCognitionSnapshot(contradictory).confidence.finalConfidence < 80, 'expanded contradiction matrix severity affects final confidence');
  const unverifiedOnly = snapshot([item('risk','risk_sentiment','bullish'), item('liq','liquidity_conditions','bullish')]);
  const duplicateBurst = snapshot([item('dup1','market_news','bullish',['duplicate headline']), item('dup2','market_news','bullish',['scraped duplicate']), item('dup3','market_news','bullish',['same headline burst'])]);
  assert(buildMarketCognitionSnapshot(duplicateBurst).confidence.finalConfidence < buildMarketCognitionSnapshot(unverifiedOnly).confidence.finalConfidence, 'duplicate burst/source disagreement stronger than unverified warning alone');
  const recomputableContradiction = snapshot([item('risk-recompute','risk_sentiment','bullish'), item('credit-recompute','credit_stress','bullish')]);
  const suppliedClearInput = buildConfidenceCalibrationInputFromWeightedSnapshot(recomputableContradiction, { providerReliabilitySupplied:true, sourceIndependenceVerified:true, priceReaction:confirmedReaction, contradictionMatrix:matrix('none',0) });
  const recomputedInput = buildConfidenceCalibrationInputFromWeightedSnapshot(recomputableContradiction, { providerReliabilitySupplied:true, sourceIndependenceVerified:true, priceReaction:confirmedReaction });
  const suppliedHighInput = buildConfidenceCalibrationInputFromWeightedSnapshot(cleanWeighted, { providerReliabilitySupplied:true, sourceIndependenceVerified:true, priceReaction:confirmedReaction, contradictionMatrix:matrix('high',1) });
  assert(suppliedClearInput.contradictionMatrix?.highestSeverity === 'none' && recomputedInput.contradictionMatrix?.highestSeverity !== 'none', 'supplied contradiction matrix is reused instead of silently recomputing divergent context');
  assert(calibrateMarketConfidence(suppliedHighInput).finalConfidence < calibrateMarketConfidence(buildConfidenceCalibrationInputFromWeightedSnapshot(cleanWeighted, { providerReliabilitySupplied:true, sourceIndependenceVerified:true, priceReaction:confirmedReaction })).finalConfidence, 'supplied contradiction matrix affects confidence');
  assert(calibrateMarketConfidence(recomputedInput).finalConfidence < calibrateMarketConfidence(suppliedClearInput).finalConfidence, 'default recompute path still detects contradiction when no matrix is supplied');
  assert(validateMarketConfidenceCalibrationResult(calibrateConfidenceFromWeightedSnapshot(cleanWeighted)).ok, 'existing cognition confidence calibration result schema validates');
  const boundary = new CanonicalMarketIntelligenceBoundaryService(new MemoryMarketEvidenceRegistrySnapshotRepository(), new MemorySeoContentArchitectureSnapshotRepository());
  assert(boundary.getMarketConfidenceCalibrationCoverageReport(at).readiness.empiricalValidationStatus === 'pending', 'canonical boundary exposes calibration methods');
}