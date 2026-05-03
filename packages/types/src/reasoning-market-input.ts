import type { TradingAssetCoverage, MarketEvidenceClass } from './market-evidence';
import type { EvidenceConflictStatus, EvidenceFreshnessStatus, EvidenceQualityScore, EvidenceUsabilityStatus } from './market-evidence-quality';
import type { MarketEvidenceDataQuality } from './market-evidence-payloads';

export type ReasoningEvidenceFilterPolicy = { minFinalQualityScore: number; includeFixtureEvidence: boolean; includeExpiredEvidence: boolean; includeBlockedEvidence: boolean; maxEvidenceItems: number; rationale: string; };
export type ReasoningEvidenceInputItem = { payloadId: string; evidenceTypeId: string; evidenceClass: MarketEvidenceClass; providerId: string; asset: TradingAssetCoverage | null; region: string; observedAt: string; normalizedAt: string; qualityScore: EvidenceQualityScore; usabilityStatus: EvidenceUsabilityStatus; freshnessStatus: EvidenceFreshnessStatus; conflictStatus: EvidenceConflictStatus; dataQuality: MarketEvidenceDataQuality; valuesJson: string; metadataJson: string; reasons: string[]; };
export type ReasoningEvidenceInputExclusion = { payloadId: string; reasonCode: string; reason: string; };
export type ReasoningEvidenceInputSnapshot = { snapshotId: string; generatedAt: string; asset: TradingAssetCoverage | null; evidenceClass: MarketEvidenceClass | null; filterPolicy: ReasoningEvidenceFilterPolicy; items: ReasoningEvidenceInputItem[]; excludedItems: ReasoningEvidenceInputExclusion[]; warnings: string[]; };
export type ReasoningEvidenceInputAssemblyReport = { generatedAt: string; asset: TradingAssetCoverage | null; evidenceClass: MarketEvidenceClass | null; inputItemCount: number; excludedItemCount: number; warnings: string[]; pass: boolean; };
