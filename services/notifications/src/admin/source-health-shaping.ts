import type { AdminExplainabilityRow, AssetCognitionState, AuditLogEntry, ProviderFreshnessRow, ProviderHealthRecord } from '@elceo/types';

export type AdminOperationalSnapshot = {
  sourceHealth: ProviderHealthRecord[];
  freshness: ProviderFreshnessRow[];
  explainability: AdminExplainabilityRow[];
  auditLogs: AuditLogEntry[];
};

export function buildFreshnessRows(cognitionByAsset: Record<string, AssetCognitionState>): ProviderFreshnessRow[] {
  return Object.values(cognitionByAsset).map((state) => {
    const minutesRemaining = Math.round((new Date(state.freshness_expires_at).getTime() - Date.now()) / 60_000);
    const status: ProviderFreshnessRow['status'] = minutesRemaining <= 0 ? 'stale' : minutesRemaining <= 30 ? 'expiring' : 'fresh';

    return {
      asset_code: state.asset_code,
      freshness_expires_at: state.freshness_expires_at,
      minutes_remaining: minutesRemaining,
      status
    };
  });
}

export function buildExplainabilityRows(cognitionByAsset: Record<string, AssetCognitionState>): AdminExplainabilityRow[] {
  return Object.values(cognitionByAsset).map((state) => ({
    asset_code: state.asset_code,
    directional_bias: state.directional_bias,
    confidence_total: state.confidence_total,
    confidence_anatomy: state.confidence_anatomy,
    contradiction: {
      score: state.contradiction_score,
      state: state.contradiction_state
    },
    freshness_expires_at: state.freshness_expires_at,
    supporting_event_ids: state.supporting_event_ids,
    invalidating_event_ids: state.invalidating_event_ids,
    ...(state.short_explanation ? { short_explanation: state.short_explanation } : {}),
    ...(state.deep_explanation ? { deep_explanation: state.deep_explanation } : {})
  }));
}

export function buildAdminOperationalSnapshot(input: {
  sourceHealth: ProviderHealthRecord[];
  cognitionByAsset: Record<string, AssetCognitionState>;
  auditLogs: AuditLogEntry[];
}): AdminOperationalSnapshot {
  return {
    sourceHealth: input.sourceHealth,
    freshness: buildFreshnessRows(input.cognitionByAsset),
    explainability: buildExplainabilityRows(input.cognitionByAsset),
    auditLogs: input.auditLogs
  };
}
