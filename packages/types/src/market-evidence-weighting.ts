import type { MarketEvidenceClass, TradingAssetCoverage } from './market-evidence';

export const EVIDENCE_WEIGHT_HORIZONS = ['intraday','short_term','swing','medium_term'] as const;
export type EvidenceWeightHorizon = (typeof EVIDENCE_WEIGHT_HORIZONS)[number];
export const EVIDENCE_WEIGHT_ROLES = ['primary_driver','secondary_driver','context','caution','excluded'] as const;
export type EvidenceWeightRole = (typeof EVIDENCE_WEIGHT_ROLES)[number];
export const WEIGHTED_EVIDENCE_DIRECTIONS = ['bullish','bearish','neutral','mixed','unknown'] as const;
export type WeightedEvidenceDirection = (typeof WEIGHTED_EVIDENCE_DIRECTIONS)[number];

export type AssetEvidenceWeightPolicy = { asset: TradingAssetCoverage; horizon: EvidenceWeightHorizon; evidenceClass: MarketEvidenceClass; baseWeight: number; role: EvidenceWeightRole; rationale: string; };
export type WeightedEvidenceItem = { payloadId: string; asset: TradingAssetCoverage; horizon: EvidenceWeightHorizon; evidenceTypeId: string; evidenceClass: MarketEvidenceClass; providerId: string; observedAt: string; finalQualityScore: number; baseWeight: number; qualityAdjustedWeight: number; role: EvidenceWeightRole; direction: WeightedEvidenceDirection; contributionScore: number; reasons: string[]; };
export type WeightedEvidenceSnapshot = { snapshotId: string; generatedAt: string; asset: TradingAssetCoverage; horizon: EvidenceWeightHorizon; totalWeight: number; usableWeight: number; excludedWeight: number; items: WeightedEvidenceItem[]; warnings: string[]; };
export type WeightedEvidencePolicySnapshot = { generatedAt: string; policies: AssetEvidenceWeightPolicy[]; };
export type WeightedEvidenceAssemblyReport = { generatedAt: string; asset: TradingAssetCoverage; horizon: EvidenceWeightHorizon; itemCount: number; totalWeight: number; usableWeight: number; warnings: string[]; pass: boolean; };
