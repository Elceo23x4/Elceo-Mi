-- SEC-G durable ownership and high-cardinality access paths.
ALTER TABLE app_ingestion_outbox ADD COLUMN IF NOT EXISTS claim_token TEXT;
ALTER TABLE app_ingestion_outbox ADD COLUMN IF NOT EXISTS claim_generation BIGINT NOT NULL DEFAULT 0;
ALTER TABLE app_ingestion_outbox ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
ALTER TABLE app_ingestion_outbox ADD COLUMN IF NOT EXISTS claim_expires_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_ingestion_outbox_due_claim ON app_ingestion_outbox (available_at, created_at, outbox_id) WHERE status IN ('pending','failed','publishing');

ALTER TABLE app_ingestion_runtime_leases ADD COLUMN IF NOT EXISTS owner_token TEXT;
ALTER TABLE app_ingestion_runtime_leases ADD COLUMN IF NOT EXISTS generation BIGINT NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ingestion_runtime_lease_request ON app_ingestion_runtime_leases(request_key);

ALTER TABLE app_ops_job_leases ADD COLUMN IF NOT EXISTS owner_token TEXT;
ALTER TABLE app_ops_job_leases ADD COLUMN IF NOT EXISTS generation BIGINT NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ops_active_scope ON app_ops_job_leases(job_kind, scope_kind, scope_key) WHERE lease_state='acquired';

ALTER TABLE app_notification_outbox ADD COLUMN IF NOT EXISTS claim_token TEXT;
ALTER TABLE app_notification_outbox ADD COLUMN IF NOT EXISTS claim_generation BIGINT NOT NULL DEFAULT 0;
ALTER TABLE app_notification_outbox ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
ALTER TABLE app_notification_outbox ADD COLUMN IF NOT EXISTS claim_expires_at TIMESTAMPTZ;
ALTER TABLE app_notification_outbox ADD COLUMN IF NOT EXISTS ambiguous_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_notification_outbox_due_claim ON app_notification_outbox (available_at, created_at, outbox_id) WHERE status IN ('staged','failed','dispatching');
CREATE INDEX IF NOT EXISTS idx_notification_inbox_target_order ON app_notification_inbox(target_id, created_at DESC, inbox_id DESC) INCLUDE (read_at, archived_at);
