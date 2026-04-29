import type { NotificationChannel, SnapshotRefreshRunReport, SnapshotRefreshTriggerKind } from '@elceo/types';
export type SnapshotRefreshJobAdapter = { run(subjectKind:'user'|'workspace'|'ops', subjectId:string, triggerKind:SnapshotRefreshTriggerKind, generatedAt?:string): Promise<SnapshotRefreshRunReport> };
export type NotificationDispatchJobAdapter = { run(): Promise<{dispatchedCount:number;failedCount:number;deadCount:number}> };
export type NotificationVerificationExpiryJobAdapter = { run(): Promise<{expiredCount:number}> };
export type NotificationFeedbackJobAdapter = { run(providerKind:string, channel:NotificationChannel, rawEvent:unknown): Promise<{correlated:boolean;receiptCount:number;degradedTargetCount:number;uncorrelatedPersisted:boolean}> };
export type IngestionTickJobAdapter = { run(triggerKind:'manual'|'scheduled'|'internal_api'|'maintenance', generatedAt?:string): Promise<unknown> };
export type WorkspaceMaintenanceJobAdapter = { run(subjectKind:'user'|'workspace'|'ops',subjectId:string,generatedAt?:string): Promise<{refreshedWorkspace:boolean;workspaceSnapshotId:string|null}> };
