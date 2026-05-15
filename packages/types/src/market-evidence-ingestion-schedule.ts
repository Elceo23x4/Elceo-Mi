import type { ProviderCapabilityKind } from './market-data-providers';

export const ScheduledIngestionJobStatusValues = ['pending', 'running', 'succeeded', 'failed', 'skipped', 'blocked'] as const;
export type ScheduledIngestionJobStatus = typeof ScheduledIngestionJobStatusValues[number];

export const ScheduledIngestionRunModeValues = ['dry_run_fixture', 'staging_live', 'production_live'] as const;
export type ScheduledIngestionRunMode = typeof ScheduledIngestionRunModeValues[number];

export const ScheduledIngestionCadenceValues = ['hourly', 'daily', 'weekly', 'manual'] as const;
export type ScheduledIngestionCadence = typeof ScheduledIngestionCadenceValues[number];

export const ScheduledIngestionRetryStatusValues = ['not_needed', 'retry_scheduled', 'exhausted', 'blocked'] as const;
export type ScheduledIngestionRetryStatus = typeof ScheduledIngestionRetryStatusValues[number];

export const ScheduledIngestionStalenessStatusValues = ['fresh', 'stale', 'expired', 'unknown'] as const;
export type ScheduledIngestionStalenessStatus = typeof ScheduledIngestionStalenessStatusValues[number];

export type ScheduledIngestionJobPolicy = { jobId: string; providerId: string; capability: ProviderCapabilityKind; asset: string | null; region: string | null; cadence: ScheduledIngestionCadence; runMode: ScheduledIngestionRunMode; enabled: boolean; maxRetries: number; retryBackoffSeconds: number; staleAfterMinutes: number; expiresAfterMinutes: number; rationale: string };
export type ScheduledIngestionRunRecord = { runId: string; jobId: string; providerId: string; capability: ProviderCapabilityKind; asset: string | null; region: string | null; runMode: ScheduledIngestionRunMode; status: ScheduledIngestionJobStatus; startedAt: string; completedAt: string | null; requestId: string | null; responseStatus: string | null; payloadCount: number; persistedPayloadIds: string[]; errorCode: string | null; errorMessage: string | null; retryStatus: ScheduledIngestionRetryStatus; retryCount: number; nextRetryAt: string | null; stalenessStatus: ScheduledIngestionStalenessStatus; warnings: string[]; replayOfRunId?: string; originalJobId?: string | null; originalExecutionMode?: ScheduledIngestionRunMode | null; replayMode?: ScheduledIngestionRunMode | null; replayedAt?: string | null; duplicateDecision?: 'created' | 'skipped' | 'blocked'; originalSourceRef?: string | null; operatorNote?: string | null };
export type ScheduledIngestionRunReport = { generatedAt: string; run: ScheduledIngestionRunRecord; pass: boolean; warnings: string[] };
export type ScheduledIngestionPolicySnapshot = { generatedAt: string; policies: ScheduledIngestionJobPolicy[] };
export type ScheduledIngestionStalenessReport = { generatedAt: string; providerId: string; capability: ProviderCapabilityKind; asset: string | null; region: string | null; latestObservedAt: string | null; stalenessStatus: ScheduledIngestionStalenessStatus; reasons: string[] };
