import type { CanonicalAssetSymbol } from '@elceo/types';
import type { EventAssessmentStage, SourceProvenance } from '../expectation-reality/contracts';

export type MarketCleanlinessPolicyVersion = 'market-cleanliness-v1';
export type MarketState = 'open'|'closed'|'continuous'|'unknown';
export type SessionState = 'active'|'overlap'|'off_hours'|'closed'|'continuous'|'unknown';
export type LiquidityState = 'normal'|'thin'|'stressed'|'unknown';
export type SpreadState = 'normal'|'wide'|'unknown';
export type ActivityState = 'normal'|'elevated'|'depressed'|'unknown';
export type CleanlinessComponentName = 'release_clarity'|'primary_reaction_coherence'|'path_continuity'|'related_market_coherence'|'volatility_interpretability'|'session_liquidity_quality'|'analog_consistency'|'provenance_quality';
export type ComponentAvailability = 'available'|'unavailable'|'structurally_unavailable'|'provenance_limited';
export type ComponentStatus = 'supportive'|'neutral'|'conflicting'|'severely_conflicting'|'insufficient';
export type CleanlinessState = 'clean'|'mixed'|'conflicted'|'insufficient_data';
export type HardConflictFlag = 'release_primary_direction_conflict'|'confirmation_follow_through_reversal'|'initial_confirmation_lost'|'two_sided_expansion'|'related_market_final_conflict'|'resolved_release_with_ambiguous_primary'|'provenance_conflict';
export type CleanlinessEvidenceReference = { sourceType:string; sourceId:string; contentHash:string; observedAt:string; availableAt:string; reliability:'verified'|'replay'|'fixture'|'unverified' };

export type MarketSessionLiquidityContextRecord = Readonly<{
  contextId:string; policyVersion:MarketCleanlinessPolicyVersion; eventEvaluationId:string; asset:CanonicalAssetSymbol;
  observedAt:string; availableAt:string; evidenceCutoffAt:string; marketState:MarketState; sessionState:SessionState;
  liquidityState:LiquidityState; spreadState:SpreadState; activityState:ActivityState; sourceEvidenceIds:readonly string[];
  provenance:readonly SourceProvenance[]; warnings:readonly string[]; limitations:readonly string[]; canonicalPayloadHash:string; createdAt:string;
}>;
export type MarketSessionLiquidityContextDraft = Omit<MarketSessionLiquidityContextRecord,'contextId'|'canonicalPayloadHash'|'createdAt'> & { createdAt?:never; contextId?:never; canonicalPayloadHash?:never };

export type MarketCleanlinessComponent = Readonly<{ component:CleanlinessComponentName; availability:ComponentAvailability; status:ComponentStatus; score:number|null; weight:number; effectiveWeight:number; sourceReferences:readonly CleanlinessEvidenceReference[]; reasonCodes:readonly string[]; warnings:readonly string[]; limitations:readonly string[]; rationale:string }>;
export type MarketCleanlinessEvaluation = Readonly<{
  cleanlinessEvaluationId:string; policyVersion:MarketCleanlinessPolicyVersion; sourceEventEvaluationId:string; sourceExpectationId:string;
  sourceAnalogRetrievalId:string|null; sourceSessionLiquidityContextId:string|null; eventInstanceKey:string; asset:CanonicalAssetSymbol; eventKind:string;
  assessmentStage:EventAssessmentStage; evidenceCutoffAt:string; rawAgreementScore:number; evidenceCoverageRatio:number; evidenceQualifiedScore:number;
  cleanlinessState:CleanlinessState; components:readonly MarketCleanlinessComponent[]; hardConflictFlags:readonly HardConflictFlag[]; ambiguityFlags:readonly string[];
  warnings:readonly string[]; limitations:readonly string[]; deterministicRationale:string; sourceEvidenceReferences:readonly CleanlinessEvidenceReference[]; canonicalPayloadHash:string; createdAt:string;
}>;
export type MarketCleanlinessServiceInput = Readonly<{ eventEvaluationId:string; analogRetrievalId?:string; sessionLiquidityContextId?:string; evidenceCutoffAt:string }>;

export type CleanlinessReportGroupBy = 'asset'|'event_kind'|'assessment_stage'|'policy_version';
export type DistributionBucket = { minimum:number; maximum:number; count:number };
export type MarketCleanlinessDistributionReport = Readonly<{ generatedAt:string; groupBy:CleanlinessReportGroupBy; groups:readonly { key:string; sampleSize:number; cleanCount:number; mixedCount:number; conflictedCount:number; insufficientCount:number; scoreDistribution:readonly DistributionBucket[]; coverageDistribution:readonly DistributionBucket[]; componentAvailability:Record<string,Record<ComponentAvailability,number>>; componentAverageScores:Record<string,number|null>; hardConflictCounts:Record<string,number>; ambiguityCounts:Record<string,number>; provenanceLimitations:Record<string,number>; periodStart:string|null; periodEnd:string|null; warnings:readonly string[]; limitations:readonly string[] }[]; warnings:readonly string[]; limitations:readonly string[] }>;
