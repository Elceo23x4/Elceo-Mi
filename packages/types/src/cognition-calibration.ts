import type { GoldenScenarioId } from './golden-scenario-reasoning';
import type { TradingAssetCoverage } from './market-evidence';

export const TRADING_CALIBRATION_ASSETS_CORE = ['xau_usd','eur_usd','gbp_usd','usd_jpy','btc_usd','nasdaq_100','sp500','de30'] as const;
export const TRADING_CALIBRATION_ASSETS_FX = ['aud_usd','usd_chf','nzd_usd','usd_cad'] as const;
export const COGNITION_CALIBRATION_ASSETS = [...TRADING_CALIBRATION_ASSETS_CORE, ...TRADING_CALIBRATION_ASSETS_FX, 'dxy', 'vix'] as const;

export const COGNITION_CALIBRATION_QUALITY_BANDS=['low','medium','high'] as const;
export const COGNITION_CALIBRATION_FRESHNESS_BANDS=['stale','aging','fresh'] as const;
export const COGNITION_CALIBRATION_CREDIBILITY_BANDS=['weak','trusted','official'] as const;
export const COGNITION_CALIBRATION_WEIGHTING_HORIZONS=['intraday','swing','position'] as const;
export const COGNITION_CALIBRATION_PRESSURE_DIRECTIONS=['bullish','bearish','mixed'] as const;
export const COGNITION_CALIBRATION_PRESSURE_STRENGTHS=['low','medium','high'] as const;
export const COGNITION_CALIBRATION_CONTRADICTION_KINDS=['policy_growth_divergence','flow_liquidity_divergence','yields_safe_haven_divergence','earnings_yield_divergence','breadth_price_divergence','intervention_yield_divergence','risk_regime_divergence','stale_vs_fresh_divergence'] as const;
export const COGNITION_CALIBRATION_CONFIDENCE_COMPONENT_KINDS=['source_quality','evidence_freshness','evidence_agreement','evidence_completeness','asset_relevance','contradiction_penalty','extraction_confidence','regime_clarity'] as const;
export const COGNITION_CALIBRATION_UNCERTAINTY_FLAGS=['freshness_warning','contradiction_detected','incomplete_evidence','weak_source_mix'] as const;
export const COGNITION_CALIBRATION_STATUSES=['pass','warning','fail'] as const;
export const COGNITION_CALIBRATION_GUARDRAIL_STATUSES=['pass','fail'] as const;

export type CognitionCalibrationAsset = TradingAssetCoverage|'dxy'|'vix';
export type CognitionCalibrationQualityBand=typeof COGNITION_CALIBRATION_QUALITY_BANDS[number];
export type CognitionCalibrationFreshnessBand=typeof COGNITION_CALIBRATION_FRESHNESS_BANDS[number];
export type CognitionCalibrationCredibilityBand=typeof COGNITION_CALIBRATION_CREDIBILITY_BANDS[number];
export type CognitionCalibrationWeightingHorizon=typeof COGNITION_CALIBRATION_WEIGHTING_HORIZONS[number];
export type CognitionCalibrationPressureDirection=typeof COGNITION_CALIBRATION_PRESSURE_DIRECTIONS[number];
export type CognitionCalibrationPressureStrength=typeof COGNITION_CALIBRATION_PRESSURE_STRENGTHS[number];
export type CognitionCalibrationContradictionKind=typeof COGNITION_CALIBRATION_CONTRADICTION_KINDS[number];
export type CognitionCalibrationConfidenceComponentKind=typeof COGNITION_CALIBRATION_CONFIDENCE_COMPONENT_KINDS[number];
export type CognitionCalibrationUncertaintyFlag=typeof COGNITION_CALIBRATION_UNCERTAINTY_FLAGS[number];
export type CognitionCalibrationStatus=typeof COGNITION_CALIBRATION_STATUSES[number];
export type CognitionCalibrationGuardrailStatus=typeof COGNITION_CALIBRATION_GUARDRAIL_STATUSES[number];

export type CognitionCalibrationEvidenceQualityScore={evidenceId:string;score:number;band:CognitionCalibrationQualityBand;reasons:string[];};
export type CognitionCalibrationEvidenceFreshnessScore={evidenceId:string;observedAt:string;evaluatedAt:string;ageHours:number;score:number;band:CognitionCalibrationFreshnessBand;};
export type CognitionCalibrationEvidenceCredibilityScore={sourceId:string;score:number;band:CognitionCalibrationCredibilityBand;};
export type CognitionCalibrationAssetEvidenceWeight={asset:CognitionCalibrationAsset;theme:string;weight:number;horizon:CognitionCalibrationWeightingHorizon;};
export type CognitionCalibrationWeightedEvidenceItem={evidenceId:string;asset:CognitionCalibrationAsset;sourceId:string;theme:string;baseWeight:number;qualityScore:number;weightedScore:number;pressureDirection:CognitionCalibrationPressureDirection;observedAt:string;};
export type CognitionCalibrationContradictionDetectionResult={contradictionDetected:boolean;contradictionKinds:CognitionCalibrationContradictionKind[];involvedEvidenceIds:string[];explanation:string;severity:number;confidencePenalty:number;};
export type CognitionCalibrationPressureScoreResult={asset:CognitionCalibrationAsset;direction:CognitionCalibrationPressureDirection;strength:CognitionCalibrationPressureStrength;score:number;drivers:string[];};
export type CognitionCalibrationConfidenceDecomposition={confidenceBand:'low'|'medium'|'high';score:number;components:{kind:CognitionCalibrationConfidenceComponentKind;score:number;note:string;}[];majorReasons:string[];uncertaintyFlags:CognitionCalibrationUncertaintyFlag[];};
export type CognitionCalibrationInput={scenarioId:GoldenScenarioId;asset:CognitionCalibrationAsset;evaluatedAt:string;evidence:CognitionCalibrationWeightedEvidenceItem[];};
export type CognitionCalibrationGuardrailCheck={passed:boolean;forbiddenTermsFound:string[];checkedFields:string[];guardrailStatus:CognitionCalibrationGuardrailStatus;};
export type CognitionCalibrationResult={scenarioId:GoldenScenarioId;asset:CognitionCalibrationAsset;status:CognitionCalibrationStatus;pressure:CognitionCalibrationPressureScoreResult;contradictions:CognitionCalibrationContradictionDetectionResult;confidence:CognitionCalibrationConfidenceDecomposition;guardrails:CognitionCalibrationGuardrailCheck;summary:string;};
export type CognitionCalibrationCoverageReport={generatedAt:string;scenarioCount:number;assetCoverage:CognitionCalibrationAsset[];statusBreakdown:Record<CognitionCalibrationStatus,number>;};
