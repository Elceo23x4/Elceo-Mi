export type SecurityActorKind = 'user' | 'internal' | 'admin' | 'system';
export type SecurityActionKind =
  | 'account_read' | 'account_write' | 'admin_read' | 'admin_write' | 'internal_mutation'
  | 'billing_reconcile' | 'billing_policy_evaluate' | 'billing_orchestration_retry'
  | 'notification_dispatch' | 'refresh_run' | 'workspace_refresh' | 'analytics_generate'
  | 'coaching_generate' | 'portfolio_snapshot_generate'
  | 'journal_case_write' | 'journal_case_lifecycle' | 'journal_influence_generate'
  | 'portfolio_watchlist_write' | 'portfolio_position_write' | 'portfolio_action_write'
  | 'notification_target_write' | 'notification_subscription_write'
  | 'notification_verification_issue' | 'notification_verification_consume';
export type SecurityDecisionStatus = 'allowed' | 'blocked' | 'replayed' | 'skipped';
export type SecurityBlockReason = 'rate_limit_exceeded' | 'idempotency_conflict' | 'invalid_idempotency_key' | 'missing_actor' | 'internal_token_required' | 'admin_access_required' | 'suspicious_replay' | 'unknown';
export type SecurityRateLimitWindow = 'minute' | 'hour' | 'day';
export type SecurityRateLimitPolicy = { policyKey: string; actionKind: SecurityActionKind; window: SecurityRateLimitWindow; maxCount: number; subjectScoped: boolean; actorScoped: boolean };
export type SecurityIdempotencyRecord = { idempotencyKey: string; actionKind: SecurityActionKind; actorKind: SecurityActorKind; actorId: string; requestHash: string; responseHash: string | null; status: 'started' | 'completed' | 'failed'; firstSeenAt: string; lastSeenAt: string; expiresAt: string; metadataJson: string };
export type SecurityRateLimitCounter = { counterId: string; policyKey: string; actionKind: SecurityActionKind; actorKind: SecurityActorKind; actorId: string; subjectId: string | null; window: SecurityRateLimitWindow; windowStart: string; windowEnd: string; count: number; updatedAt: string };
export type SecurityDecision = { decisionId: string; actionKind: SecurityActionKind; actorKind: SecurityActorKind; actorId: string; subjectId: string | null; status: SecurityDecisionStatus; blockReason: SecurityBlockReason | null; idempotencyKey: string | null; rateLimitPolicyKey: string | null; currentCount: number | null; maxCount: number | null; decidedAt: string; metadataJson: string };
export type SecurityAuditEvent = { auditEventId: string; actorKind: SecurityActorKind; actorId: string; subjectId: string | null; actionKind: SecurityActionKind; decisionStatus: SecurityDecisionStatus; blockReason: SecurityBlockReason | null; routePath: string | null; method: string | null; ipHash: string | null; userAgentHash: string | null; idempotencyKey: string | null; metadataJson: string; occurredAt: string; createdAt: string };
export type SecurityRuntimeSummary = { generatedAt: string; totalAuditEvents: number; blockedDecisionCount: number; replayedDecisionCount: number; rateLimitedCount: number; idempotencyConflictCount: number; latestBlockedAt: string | null };
