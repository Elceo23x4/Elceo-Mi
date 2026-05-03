import type { MarketEvidenceClass, MarketEvidenceFrequency, MarketEvidenceRegion } from './market-evidence';

export const EVIDENCE_PROVENANCE_KINDS = ['fixture','live_provider','calculated_internal','manual_research','replayed_snapshot','unknown'] as const;
export type EvidenceProvenanceKind = (typeof EVIDENCE_PROVENANCE_KINDS)[number];

export const EVIDENCE_FRESHNESS_STATUSES = ['fresh','aging','stale','expired','unknown'] as const;
export type EvidenceFreshnessStatus = (typeof EVIDENCE_FRESHNESS_STATUSES)[number];

export const EVIDENCE_CONFLICT_STATUSES = ['none','mild','material','severe','unknown'] as const;
export type EvidenceConflictStatus = (typeof EVIDENCE_CONFLICT_STATUSES)[number];

export const EVIDENCE_USABILITY_STATUSES = ['usable','degraded','warning','blocked'] as const;
export type EvidenceUsabilityStatus = (typeof EVIDENCE_USABILITY_STATUSES)[number];

export type EvidenceQualityScore = { payloadId: string; evidenceTypeId: string; evidenceClass: MarketEvidenceClass; providerId: string; asset: string | null; region: MarketEvidenceRegion | string; observedAt: string; evaluatedAt: string; provenanceKind: EvidenceProvenanceKind; sourceQualityScore: number; freshnessScore: number; completenessScore: number; conflictScore: number; finalQualityScore: number; freshnessStatus: EvidenceFreshnessStatus; conflictStatus: EvidenceConflictStatus; usabilityStatus: EvidenceUsabilityStatus; reasons: string[]; };
export type EvidenceFreshnessPolicy = { evidenceClass: MarketEvidenceClass; frequency: MarketEvidenceFrequency; freshWithinMinutes: number; staleAfterMinutes: number; expiresAfterMinutes: number; rationale: string; };
export type EvidenceConflictInput = { evidenceTypeId: string; evidenceClass: MarketEvidenceClass; asset: string | null; region: string; observedAt: string; providerId: string; valueKey: string; numericValue: number; tolerance: number; payloadId: string; };
export type EvidenceQualityReport = { generatedAt: string; scores: EvidenceQualityScore[]; pass: boolean; failures: string[]; };
