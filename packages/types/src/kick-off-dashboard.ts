import type { CanonicalAssetSymbol } from './events';
import type { EvidenceWeightHorizon } from './market-evidence-weighting';

export type InternalKickOffMacroHeadline = {
  payload_id: string;
  evidence_class: 'market_news' | 'geopolitical_risk';
  title: string;
  source_name: string | null;
  source_url: string | null;
  published_at: string;
  freshness: 'fresh' | 'aging';
  source_evidence_artifact_identity: string;
};
export type KickOffDashboardContextPayloadV1 = {
  evidence_score: { value: number; basis: 'weighted_evidence_usable_weight' };
  macro_headlines: { items: InternalKickOffMacroHeadline[] };
};
export type KickOffDashboardContextArtifact = {
  schemaVersion: 'canonical_materialization_v1'; kind: 'kick_off_dashboard_context';
  identity: string; scopeHash: string; integrityHash: string;
  asset: CanonicalAssetSymbol; horizon: EvidenceWeightHorizon; timeframe: 'H4';
  evaluatedAt: string; generatedAt: string; freshUntil: string;
  parentDashboardProjectionIdentity: string; parentDashboardProjectionIntegrityHash: string;
  parentCognitionArtifactIdentity: string; parentCognitionIntegrityHash: string;
  parentReasoningInputIdentity: string; weightedEvidenceSnapshotId: string;
  weightedEvidenceContentHash: string; parentEvidenceArtifactIdentities: readonly string[];
  contextVersion: 'kick-off-dashboard-context-v1';
  evidenceScorePolicyVersion: 'kick-off-evidence-score-v1';
  macroHeadlinePolicyVersion: 'kick-off-macro-headlines-v1';
  evidenceFreshnessPolicyHash: string;
  payload: KickOffDashboardContextPayloadV1;
};
