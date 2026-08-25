import type { ReasoningEvidenceFilterPolicy } from '@elceo/types';
export const REASONING_EVIDENCE_FILTER_POLICY_VERSION='reasoning-evidence-filter-v1' as const;
export const getDefaultReasoningEvidenceFilterPolicy=():ReasoningEvidenceFilterPolicy=>({minFinalQualityScore:50,includeFixtureEvidence:false,includeExpiredEvidence:false,includeBlockedEvidence:false,maxEvidenceItems:200,rationale:'Exclude blocked/expired/fixture and low-quality evidence by default for deterministic pre-weighting input safety.'});
