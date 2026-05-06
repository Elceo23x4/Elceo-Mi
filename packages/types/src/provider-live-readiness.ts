export const ProviderLiveActivationEnvironmentValues = ['local', 'staging', 'production'] as const;
export type ProviderLiveActivationEnvironment = typeof ProviderLiveActivationEnvironmentValues[number];

export const ProviderLiveActivationStatusValues = ['disabled', 'fixture_only', 'staging_ready', 'production_blocked', 'production_ready', 'invalid_config'] as const;
export type ProviderLiveActivationStatus = typeof ProviderLiveActivationStatusValues[number];

export const ProviderQuotaUnitValues = ['requests_per_minute', 'requests_per_hour', 'requests_per_day', 'requests_per_month', 'unknown'] as const;
export type ProviderQuotaUnit = typeof ProviderQuotaUnitValues[number];

export const ProviderLiveRiskLevelValues = ['low', 'medium', 'high', 'critical'] as const;
export type ProviderLiveRiskLevel = typeof ProviderLiveRiskLevelValues[number];

export type ProviderQuotaPolicy = { providerId: string; unit: ProviderQuotaUnit; limit: number | null; burstLimit: number | null; rationale: string };
export type ProviderLiveActivationPolicy = { providerId: string; environment: ProviderLiveActivationEnvironment; liveEnabled: boolean; allowLiveFetch: boolean; requireExplicitEnv: boolean; requireApiKey: boolean; requireStagingFirst: boolean; productionBlockedByDefault: boolean; rationale: string };
export type ProviderLiveReadinessStatus = { providerId: string; environment: ProviderLiveActivationEnvironment; activationStatus: ProviderLiveActivationStatus; liveEnabled: boolean; hasRequiredSecrets: boolean; allowLiveFetch: boolean; quotaPolicies: ProviderQuotaPolicy[]; riskLevel: ProviderLiveRiskLevel; reasons: string[]; checkedAt: string };
export type ProviderLiveReadinessSnapshot = { generatedAt: string; environment: ProviderLiveActivationEnvironment; providers: ProviderLiveReadinessStatus[]; pass: boolean; failures: string[] };
export type ProviderLiveSmokePlan = { generatedAt: string; environment: ProviderLiveActivationEnvironment; providerId: string; allowed: boolean; checks: string[]; warnings: string[] };
