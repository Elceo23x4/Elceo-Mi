export const ProviderActivationReadinessStageValues = ['fixture_foundation','dry_run_ready','staging_candidate','production_candidate','activated','rolled_back'] as const;
export type ProviderActivationReadinessStage = typeof ProviderActivationReadinessStageValues[number];

export const ProviderActivationReadinessModeValues = ['fixture','dry_run','staging_live','production_live'] as const;
export type ProviderActivationReadinessMode = typeof ProviderActivationReadinessModeValues[number];

export const ProviderActivationReadinessApprovalStatusValues = ['not_requested','pending','approved','rejected'] as const;
export type ProviderActivationReadinessApprovalStatus = typeof ProviderActivationReadinessApprovalStatusValues[number];

export const ProviderActivationReadinessRiskLevelValues = ['low','medium','high','critical'] as const;
export type ProviderActivationReadinessRiskLevel = typeof ProviderActivationReadinessRiskLevelValues[number];

export const ProviderActivationReadinessCheckStatusValues = ['pending','pass','fail','blocked'] as const;
export type ProviderActivationReadinessCheckStatus = typeof ProviderActivationReadinessCheckStatusValues[number];

export const ProviderActivationReadinessProviderFamilyValues = ['market_data','news','macro','filings','payment','notification','internal_runtime'] as const;
export type ProviderActivationReadinessProviderFamily = typeof ProviderActivationReadinessProviderFamilyValues[number];

export const ProviderActivationReadinessRollbackStatusValues = ['not_required','ready','executed','verified'] as const;
export type ProviderActivationReadinessRollbackStatus = typeof ProviderActivationReadinessRollbackStatusValues[number];

export const ProviderActivationReadinessSmokeTestStatusValues = ['not_planned','planned','ready_to_run','blocked'] as const;
export type ProviderActivationReadinessSmokeTestStatus = typeof ProviderActivationReadinessSmokeTestStatusValues[number];

export type ProviderActivationChecklistItem = { id: string; providerId: string; family: ProviderActivationReadinessProviderFamily; stage: ProviderActivationReadinessStage; mode: ProviderActivationReadinessMode; status: ProviderActivationReadinessCheckStatus; description: string; required: boolean; ownerRole: string; evidenceNote: string };
export type ProviderActivationEnvironmentRequirement = { providerId: string; envVar: string; placeholderExample: string; requiredForModes: ProviderActivationReadinessMode[]; notes: string[] };
export type ProviderActivationSmokeTestPlan = { providerId: string; status: ProviderActivationReadinessSmokeTestStatus; scenarios: string[]; safetyRules: string[] };
export type ProviderActivationRollbackPlan = { providerId: string; status: ProviderActivationReadinessRollbackStatus; steps: string[]; escalation: string[] };
export type ProviderActivationApprovalGate = { providerId: string; status: ProviderActivationReadinessApprovalStatus; requiredApprovers: string[]; controls: string[] };
export type ProviderActivationProviderReadiness = { providerId: string; family: ProviderActivationReadinessProviderFamily; stage: ProviderActivationReadinessStage; mode: ProviderActivationReadinessMode; riskLevel: ProviderActivationReadinessRiskLevel; liveBlockedByDefault: boolean; checklist: ProviderActivationChecklistItem[]; environmentRequirements: ProviderActivationEnvironmentRequirement[]; smokePlan: ProviderActivationSmokeTestPlan; rollbackPlan: ProviderActivationRollbackPlan; approvalGate: ProviderActivationApprovalGate };
export type ProviderActivationReadinessReport = { generatedAt: string; mode: ProviderActivationReadinessMode; liveActivationAllowed: boolean; providers: ProviderActivationProviderReadiness[]; warnings: string[] };
export type ProviderActivationCoverageReport = { generatedAt: string; totalProviders: number; providersByFamily: Record<ProviderActivationReadinessProviderFamily, number>; blockedByDefaultCount: number; smokePlanCoverage: number; rollbackPlanCoverage: number; approvalGateCoverage: number };
