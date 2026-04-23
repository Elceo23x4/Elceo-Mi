import type { CanonicalAssetSymbol, Timeframe } from '@elceo/types';
import type {
  NotificationDecisionRepository,
  NotificationOutboxAttemptRepository,
  NotificationOutboxRepository,
  PersistedNotificationDecisionRecord
} from './contracts';
import type { NotificationOutboxAttemptRecord, NotificationOutboxRecord } from '../delivery/outbox-contracts';

function runtimeEnv(): Record<string, string | undefined> {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
}

type QueryRow = Record<string, unknown>;
type PoolLike = { query: (sql: string, params?: unknown[]) => Promise<{ rows: QueryRow[] }> };
let poolPromise: Promise<PoolLike> | null = null;

async function getPool(): Promise<PoolLike> {
  if (!poolPromise) {
    poolPromise = (async () => {
      const module = await import('pg');
      return new module.Pool({ connectionString: runtimeEnv().DATABASE_URL }) as unknown as PoolLike;
    })();
  }
  return poolPromise;
}

async function queryDb<T extends QueryRow = QueryRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  const pool = await getPool();
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

type DecisionRow = {
  decision_id: string;
  decision_key: string;
  asset: string;
  timeframe: string;
  rule_key: string;
  trigger_kind: string;
  reasoning_run_id: string | null;
  snapshot_id: string | null;
  drift_id: string | null;
  materiality_score: number;
  should_notify: boolean;
  suppression_reason: string | null;
  channels_json: string;
  cooldown_until: string | null;
  headline: string;
  body: string;
  created_at: string;
  decision_json: string;
};

type OutboxRow = {
  outbox_id: string;
  outbox_key: string;
  decision_id: string;
  decision_key: string;
  asset: string;
  timeframe: string;
  rule_key: string;
  channel: string;
  status: NotificationOutboxRecord['status'];
  available_at: string;
  last_attempt_at: string | null;
  delivered_at: string | null;
  dead_at: string | null;
  attempt_count: number;
  last_error_code: string | null;
  last_error_message: string | null;
  payload_json: string;
  created_at: string;
  updated_at: string;
};

type OutboxAttemptRow = {
  attempt_id: string;
  outbox_id: string;
  channel: string;
  attempted_at: string;
  status: NotificationOutboxAttemptRecord['status'];
  error_code: string | null;
  error_message: string | null;
  response_meta_json: string | null;
};

function mapDecisionRow(row: DecisionRow): PersistedNotificationDecisionRecord {
  return {
    decisionId: row.decision_id,
    decisionKey: row.decision_key,
    asset: row.asset,
    timeframe: row.timeframe as Timeframe,
    ruleKey: row.rule_key,
    triggerKind: row.trigger_kind,
    reasoningRunId: row.reasoning_run_id,
    snapshotId: row.snapshot_id,
    driftId: row.drift_id,
    materialityScore: row.materiality_score,
    shouldNotify: row.should_notify,
    suppressionReason: row.suppression_reason,
    channelsJson: row.channels_json,
    cooldownUntil: row.cooldown_until,
    headline: row.headline,
    body: row.body,
    createdAt: row.created_at,
    decisionJson: row.decision_json
  };
}

function mapOutboxRow(row: OutboxRow): NotificationOutboxRecord {
  return {
    outboxId: row.outbox_id,
    outboxKey: row.outbox_key,
    decisionId: row.decision_id,
    decisionKey: row.decision_key,
    asset: row.asset,
    timeframe: row.timeframe as Timeframe,
    ruleKey: row.rule_key,
    channel: row.channel as NotificationOutboxRecord['channel'],
    status: row.status,
    availableAt: row.available_at,
    lastAttemptAt: row.last_attempt_at,
    deliveredAt: row.delivered_at,
    deadAt: row.dead_at,
    attemptCount: row.attempt_count,
    lastErrorCode: row.last_error_code,
    lastErrorMessage: row.last_error_message,
    payloadJson: row.payload_json,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapOutboxAttemptRow(row: OutboxAttemptRow): NotificationOutboxAttemptRecord {
  return {
    attemptId: row.attempt_id,
    outboxId: row.outbox_id,
    channel: row.channel as NotificationOutboxAttemptRecord['channel'],
    attemptedAt: row.attempted_at,
    status: row.status,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    responseMetaJson: row.response_meta_json
  };
}

export class SqlNotificationDecisionRepository implements NotificationDecisionRepository {
  async saveDecision(record: PersistedNotificationDecisionRecord): Promise<void> {
    await queryDb(
      `INSERT INTO app_notification_decisions (
        decision_id, decision_key, asset, timeframe, rule_key, trigger_kind,
        reasoning_run_id, snapshot_id, drift_id, materiality_score, should_notify,
        suppression_reason, channels_json, cooldown_until, headline, body, created_at, decision_json
      ) VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,$10,$11,
        $12,$13,$14,$15,$16,$17,$18
      )
      ON CONFLICT (decision_key) DO UPDATE SET
        decision_id=EXCLUDED.decision_id,
        asset=EXCLUDED.asset,
        timeframe=EXCLUDED.timeframe,
        rule_key=EXCLUDED.rule_key,
        trigger_kind=EXCLUDED.trigger_kind,
        reasoning_run_id=EXCLUDED.reasoning_run_id,
        snapshot_id=EXCLUDED.snapshot_id,
        drift_id=EXCLUDED.drift_id,
        materiality_score=EXCLUDED.materiality_score,
        should_notify=EXCLUDED.should_notify,
        suppression_reason=EXCLUDED.suppression_reason,
        channels_json=EXCLUDED.channels_json,
        cooldown_until=EXCLUDED.cooldown_until,
        headline=EXCLUDED.headline,
        body=EXCLUDED.body,
        created_at=EXCLUDED.created_at,
        decision_json=EXCLUDED.decision_json`,
      [
        record.decisionId, record.decisionKey, record.asset, record.timeframe, record.ruleKey, record.triggerKind,
        record.reasoningRunId, record.snapshotId, record.driftId, record.materialityScore, record.shouldNotify,
        record.suppressionReason, record.channelsJson, record.cooldownUntil, record.headline, record.body, record.createdAt, record.decisionJson
      ]
    );
  }

  async getDecisionById(decisionId: string): Promise<PersistedNotificationDecisionRecord | null> {
    const rows = await queryDb<DecisionRow>(
      `SELECT decision_id, decision_key, asset, timeframe, rule_key, trigger_kind,
        reasoning_run_id, snapshot_id, drift_id, materiality_score, should_notify,
        suppression_reason, channels_json::text as channels_json, cooldown_until, headline, body, created_at, decision_json::text as decision_json
       FROM app_notification_decisions WHERE decision_id = $1`,
      [decisionId]
    );
    return rows[0] ? mapDecisionRow(rows[0]) : null;
  }

  async getDecisionByKey(decisionKey: string): Promise<PersistedNotificationDecisionRecord | null> {
    const rows = await queryDb<DecisionRow>(
      `SELECT decision_id, decision_key, asset, timeframe, rule_key, trigger_kind,
        reasoning_run_id, snapshot_id, drift_id, materiality_score, should_notify,
        suppression_reason, channels_json::text as channels_json, cooldown_until, headline, body, created_at, decision_json::text as decision_json
       FROM app_notification_decisions WHERE decision_key = $1`,
      [decisionKey]
    );
    return rows[0] ? mapDecisionRow(rows[0]) : null;
  }

  async getLatestDecisionForRule(asset: CanonicalAssetSymbol, timeframe: Timeframe, ruleKey: string): Promise<PersistedNotificationDecisionRecord | null> {
    const rows = await queryDb<DecisionRow>(
      `SELECT decision_id, decision_key, asset, timeframe, rule_key, trigger_kind,
        reasoning_run_id, snapshot_id, drift_id, materiality_score, should_notify,
        suppression_reason, channels_json::text as channels_json, cooldown_until, headline, body, created_at, decision_json::text as decision_json
       FROM app_notification_decisions
       WHERE asset = $1 AND timeframe = $2 AND rule_key = $3
       ORDER BY created_at DESC, decision_id ASC LIMIT 1`,
      [asset, timeframe, ruleKey]
    );
    return rows[0] ? mapDecisionRow(rows[0]) : null;
  }

  async listRecentDecisions(params: { limit: number; asset?: CanonicalAssetSymbol; timeframe?: Timeframe; shouldNotify?: boolean; ruleKey?: string }): Promise<PersistedNotificationDecisionRecord[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    if (params.asset) {
      values.push(params.asset);
      clauses.push(`asset = $${values.length}`);
    }
    if (params.timeframe) {
      values.push(params.timeframe);
      clauses.push(`timeframe = $${values.length}`);
    }
    if (params.shouldNotify !== undefined) {
      values.push(params.shouldNotify);
      clauses.push(`should_notify = $${values.length}`);
    }
    if (params.ruleKey) {
      values.push(params.ruleKey);
      clauses.push(`rule_key = $${values.length}`);
    }
    values.push(params.limit);
    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

    const rows = await queryDb<DecisionRow>(
      `SELECT decision_id, decision_key, asset, timeframe, rule_key, trigger_kind,
        reasoning_run_id, snapshot_id, drift_id, materiality_score, should_notify,
        suppression_reason, channels_json::text as channels_json, cooldown_until, headline, body, created_at, decision_json::text as decision_json
       FROM app_notification_decisions ${whereSql}
       ORDER BY created_at DESC, decision_id ASC LIMIT $${values.length}`,
      values
    );
    return rows.map(mapDecisionRow);
  }

  async listDecisionsForReasoningRun(reasoningRunId: string): Promise<PersistedNotificationDecisionRecord[]> {
    const rows = await queryDb<DecisionRow>(
      `SELECT decision_id, decision_key, asset, timeframe, rule_key, trigger_kind,
        reasoning_run_id, snapshot_id, drift_id, materiality_score, should_notify,
        suppression_reason, channels_json::text as channels_json, cooldown_until, headline, body, created_at, decision_json::text as decision_json
       FROM app_notification_decisions
       WHERE reasoning_run_id = $1
       ORDER BY created_at DESC, decision_id ASC`,
      [reasoningRunId]
    );
    return rows.map(mapDecisionRow);
  }
}

export class SqlNotificationOutboxRepository implements NotificationOutboxRepository {
  async stageOutbox(record: NotificationOutboxRecord): Promise<void> {
    await queryDb(
      `INSERT INTO app_notification_outbox (
        outbox_id, outbox_key, decision_id, decision_key, asset, timeframe, rule_key, channel,
        status, available_at, last_attempt_at, delivered_at, dead_at, attempt_count,
        last_error_code, last_error_message, payload_json, created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,
        $9,$10,$11,$12,$13,$14,
        $15,$16,$17,$18,$19
      )
      ON CONFLICT (outbox_key) DO NOTHING`,
      [
        record.outboxId, record.outboxKey, record.decisionId, record.decisionKey, record.asset, record.timeframe, record.ruleKey, record.channel,
        record.status, record.availableAt, record.lastAttemptAt, record.deliveredAt, record.deadAt, record.attemptCount,
        record.lastErrorCode, record.lastErrorMessage, record.payloadJson, record.createdAt, record.updatedAt
      ]
    );
  }

  async getOutboxById(outboxId: string): Promise<NotificationOutboxRecord | null> {
    const rows = await queryDb<OutboxRow>(
      `SELECT outbox_id, outbox_key, decision_id, decision_key, asset, timeframe, rule_key, channel,
        status, available_at, last_attempt_at, delivered_at, dead_at, attempt_count,
        last_error_code, last_error_message, payload_json::text as payload_json, created_at, updated_at
       FROM app_notification_outbox
       WHERE outbox_id = $1`,
      [outboxId]
    );
    return rows[0] ? mapOutboxRow(rows[0]) : null;
  }

  async getOutboxByKey(outboxKey: string): Promise<NotificationOutboxRecord | null> {
    const rows = await queryDb<OutboxRow>(
      `SELECT outbox_id, outbox_key, decision_id, decision_key, asset, timeframe, rule_key, channel,
        status, available_at, last_attempt_at, delivered_at, dead_at, attempt_count,
        last_error_code, last_error_message, payload_json::text as payload_json, created_at, updated_at
       FROM app_notification_outbox
       WHERE outbox_key = $1`,
      [outboxKey]
    );
    return rows[0] ? mapOutboxRow(rows[0]) : null;
  }

  async listDueOutboxItems(asOfIso: string, limit: number): Promise<NotificationOutboxRecord[]> {
    const rows = await queryDb<OutboxRow>(
      `SELECT outbox_id, outbox_key, decision_id, decision_key, asset, timeframe, rule_key, channel,
        status, available_at, last_attempt_at, delivered_at, dead_at, attempt_count,
        last_error_code, last_error_message, payload_json::text as payload_json, created_at, updated_at
       FROM app_notification_outbox
       WHERE status IN ('staged', 'failed') AND available_at <= $1
       ORDER BY available_at ASC, created_at ASC, outbox_id ASC
       LIMIT $2`,
      [asOfIso, limit]
    );
    return rows.map(mapOutboxRow);
  }

  async markDispatching(outboxId: string, attemptedAt: string): Promise<void> {
    await queryDb(
      `UPDATE app_notification_outbox
       SET status='dispatching', last_attempt_at=$2, updated_at=$2
       WHERE outbox_id = $1`,
      [outboxId, attemptedAt]
    );
  }

  async markDelivered(outboxId: string, deliveredAt: string): Promise<void> {
    await queryDb(
      `UPDATE app_notification_outbox
       SET status='delivered', delivered_at=$2, last_attempt_at=$2, attempt_count=attempt_count+1,
           last_error_code=NULL, last_error_message=NULL, updated_at=$2
       WHERE outbox_id = $1`,
      [outboxId, deliveredAt]
    );
  }

  async markFailed(outboxId: string, failedAt: string, nextAvailableAt: string, errorCode: string | null, errorMessage: string | null): Promise<void> {
    await queryDb(
      `UPDATE app_notification_outbox
       SET status='failed', last_attempt_at=$2, available_at=$3, attempt_count=attempt_count+1,
           last_error_code=$4, last_error_message=$5, updated_at=$2
       WHERE outbox_id = $1`,
      [outboxId, failedAt, nextAvailableAt, errorCode, errorMessage]
    );
  }

  async markDead(outboxId: string, deadAt: string, errorCode: string | null, errorMessage: string | null): Promise<void> {
    await queryDb(
      `UPDATE app_notification_outbox
       SET status='dead', dead_at=$2, last_attempt_at=$2, attempt_count=attempt_count+1,
           last_error_code=$3, last_error_message=$4, updated_at=$2
       WHERE outbox_id = $1`,
      [outboxId, deadAt, errorCode, errorMessage]
    );
  }

  async listOutboxForDecision(decisionId: string): Promise<NotificationOutboxRecord[]> {
    const rows = await queryDb<OutboxRow>(
      `SELECT outbox_id, outbox_key, decision_id, decision_key, asset, timeframe, rule_key, channel,
        status, available_at, last_attempt_at, delivered_at, dead_at, attempt_count,
        last_error_code, last_error_message, payload_json::text as payload_json, created_at, updated_at
       FROM app_notification_outbox
       WHERE decision_id = $1
       ORDER BY created_at ASC, outbox_id ASC`,
      [decisionId]
    );
    return rows.map(mapOutboxRow);
  }
}

export class SqlNotificationOutboxAttemptRepository implements NotificationOutboxAttemptRepository {
  async saveAttempt(record: NotificationOutboxAttemptRecord): Promise<void> {
    await queryDb(
      `INSERT INTO app_notification_outbox_attempts (
        attempt_id, outbox_id, channel, attempted_at, status, error_code, error_message, response_meta_json
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8
      )
      ON CONFLICT (attempt_id) DO UPDATE SET
        outbox_id=EXCLUDED.outbox_id,
        channel=EXCLUDED.channel,
        attempted_at=EXCLUDED.attempted_at,
        status=EXCLUDED.status,
        error_code=EXCLUDED.error_code,
        error_message=EXCLUDED.error_message,
        response_meta_json=EXCLUDED.response_meta_json`,
      [
        record.attemptId, record.outboxId, record.channel, record.attemptedAt, record.status, record.errorCode, record.errorMessage, record.responseMetaJson
      ]
    );
  }

  async listAttemptsForOutbox(outboxId: string): Promise<NotificationOutboxAttemptRecord[]> {
    const rows = await queryDb<OutboxAttemptRow>(
      `SELECT attempt_id, outbox_id, channel, attempted_at, status,
        error_code, error_message, response_meta_json::text as response_meta_json
       FROM app_notification_outbox_attempts
       WHERE outbox_id = $1
       ORDER BY attempted_at DESC, attempt_id ASC`,
      [outboxId]
    );
    return rows.map(mapOutboxAttemptRow);
  }
}
