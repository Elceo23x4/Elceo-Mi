import type { SecurityActionKind, SecurityRateLimitPolicy } from '@elceo/types';

const policy = (actionKind: SecurityActionKind, window: SecurityRateLimitPolicy['window'], maxCount: number, key: string): SecurityRateLimitPolicy => ({
  policyKey: key,
  actionKind,
  window,
  maxCount,
  subjectScoped: actionKind === 'workspace_refresh' || actionKind === 'analytics_generate' || actionKind === 'coaching_generate' || actionKind === 'portfolio_snapshot_generate',
  actorScoped: true
});

export const SECURITY_RATE_LIMIT_POLICIES: readonly SecurityRateLimitPolicy[] = [
  policy('billing_orchestration_retry', 'hour', 10, 'billing_orchestration_retry.hour.10'),
  policy('billing_reconcile', 'hour', 20, 'billing_reconcile.hour.20'),
  policy('billing_policy_evaluate', 'hour', 30, 'billing_policy_evaluate.hour.30'),
  policy('notification_dispatch', 'minute', 20, 'notification_dispatch.minute.20'),
  policy('refresh_run', 'hour', 60, 'refresh_run.hour.60'),
  policy('workspace_refresh', 'hour', 60, 'workspace_refresh.hour.60'),
  policy('analytics_generate', 'hour', 60, 'analytics_generate.hour.60'),
  policy('coaching_generate', 'hour', 60, 'coaching_generate.hour.60'),
  policy('portfolio_snapshot_generate', 'hour', 60, 'portfolio_snapshot_generate.hour.60'),
  policy('admin_write', 'hour', 100, 'admin_write.hour.100'),
  policy('internal_mutation', 'minute', 120, 'internal_mutation.minute.120')
];
