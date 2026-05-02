import type { BillingAdminSubjectSnapshot, BillingRetryCandidate, BillingRetryCandidateReason } from './billing-admin';
import type { BillingLifecycleProviderKind, BillingLifecycleSnapshot } from './billing-lifecycle';
import type { BillingPolicySnapshot } from './billing-policy';

export type BillingOrchestrationRunStatus='success'|'partial_success'|'failed'|'skipped';
export type BillingOrchestrationStepKind='candidate_selection'|'reconciliation_retry'|'policy_re_evaluation'|'completion';
export type BillingOrchestrationDecisionCode='retry_candidate_accepted'|'retry_candidate_rejected_no_context'|'retry_candidate_rejected_duplicate_recent_run'|'retry_candidate_rejected_not_retryable'|'reconciliation_retry_succeeded'|'reconciliation_retry_failed'|'policy_re_evaluation_succeeded'|'policy_re_evaluation_failed'|'subject_completed_no_change'|'subject_completed_changed';

export type BillingRetryPlan={planId:string;subjectKind:'user';subjectId:string;providerKind:BillingLifecycleProviderKind;reason:BillingRetryCandidateReason;sourceReconciliationRunId:string|null;sourcePolicyTransitionId:string|null;sourceEventId:string|null;retryable:boolean;requiresPolicyReEvaluation:boolean;rationale:string;createdAt:string;};
export type BillingOrchestrationStepResult={stepId:string;stepKind:BillingOrchestrationStepKind;status:BillingOrchestrationRunStatus;decisionCode:BillingOrchestrationDecisionCode;summary:string;startedAt:string;endedAt:string;metadataJson:string;};
export type BillingOrchestrationRun={runId:string;subjectKind:'user';subjectId:string;providerKind:BillingLifecycleProviderKind;retryPlan:BillingRetryPlan;status:BillingOrchestrationRunStatus;changedLifecycle:boolean;changedPolicy:boolean;changedEntitlement:boolean;latestReconciliationRunId:string|null;latestPolicyTransitionId:string|null;startedAt:string;endedAt:string;steps:BillingOrchestrationStepResult[];createdAt:string;};
export type BillingOrchestrationSubjectSnapshot={generatedAt:string;subjectKind:'user';subjectId:string;latestRetryCandidate:BillingRetryCandidate|null;latestOrchestrationRun:BillingOrchestrationRun|null;latestLifecycleSnapshot:BillingLifecycleSnapshot;latestPolicySnapshot:BillingPolicySnapshot;adminSnapshot:BillingAdminSubjectSnapshot;};
