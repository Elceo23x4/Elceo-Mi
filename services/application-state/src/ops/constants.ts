import type { OpsJobKind } from '@elceo/types';

export const GLOBAL_SCOPE_KEY = 'global';
export const OPS_HEALTH_LOOKBACK_HOURS_DEFAULT = 24;
export const OPS_LEASE_DURATION_MINUTES: Record<OpsJobKind, number> = {
  snapshot_refresh: 20,
  notification_dispatch: 10,
  notification_verification_expiry: 20,
  notification_feedback_ingest: 5,
  ingestion_tick: 30,
  workspace_maintenance: 20
};
