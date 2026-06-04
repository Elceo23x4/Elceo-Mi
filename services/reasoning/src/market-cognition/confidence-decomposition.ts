import type { ConfidenceDecomposition, MarketCognitionSignal, MarketConfidenceCalibrationBuildOptions, MarketContradictionFlag, WeightedEvidenceSnapshot } from '@elceo/types';
import { buildConfidenceCalibrationInputFromWeightedSnapshot, calibrateMarketConfidence } from '../confidence-calibration/index';
const clamp=(n:number)=>Math.max(0,Math.min(100,n));

const conservativeCalibrationContext = { providerReliabilitySupplied:false, sourceIndependenceVerified:false } as const;

export function buildConfidenceDecomposition(snapshot: WeightedEvidenceSnapshot, signals: MarketCognitionSignal[], contradictions: MarketContradictionFlag[], options?: MarketConfidenceCalibrationBuildOptions): ConfidenceDecomposition {
  const items=snapshot.items.filter((i)=>i.role!=='excluded');
  const q=items.length?items.reduce((n,i)=>n+i.finalQualityScore,0)/items.length:0;
  const w=snapshot.totalWeight>0?(snapshot.usableWeight/snapshot.totalWeight)*100:0;
  const stale=items.filter((i)=>i.reasons.some((r)=>r.includes('stale')||r.includes('expired'))).length;
  const freshness=clamp(100-(stale/Math.max(1,items.length))*100);
  const conflict=clamp(contradictions.length*20 + contradictions.filter((c)=>c.severity==='critical').length*20);
  const covered=new Set(signals.filter((s)=>s.kind.endsWith('_pressure')).map((s)=>s.kind)).size;
  const coverage=clamp((covered/9)*100);
  const legacyFinal=clamp(0.3*q+0.25*w+0.2*freshness+0.25*coverage-conflict*0.35);
  const calibrationContext: MarketConfidenceCalibrationBuildOptions = { ...conservativeCalibrationContext, ...options };
  const input=buildConfidenceCalibrationInputFromWeightedSnapshot(snapshot, calibrationContext);
  const calibrated=calibrateMarketConfidence({ ...input, baseConfidence:legacyFinal, evidenceQuality:clamp(q), usableWeight:clamp(w), freshness, coverage, warnings:[...input.warnings, ...snapshot.warnings], reasonCodes:[...input.reasonCodes, ...contradictions.map((c)=>c.rationale)] });
  return {generatedAt:snapshot.generatedAt,asset:snapshot.asset,horizon:snapshot.horizon,evidenceQualityComponent:clamp(q),evidenceWeightComponent:clamp(w),freshnessComponent:freshness,conflictPenalty:conflict,coverageComponent:coverage,finalConfidence:calibrated.finalConfidence,rationale:`Confidence decomposed from quality, weight, freshness, contradiction penalty, family coverage, and C6-R6 deterministic calibration (${calibrated.confidenceTier}). Conservative provider/source context is used unless calibration context is supplied.`};
}
