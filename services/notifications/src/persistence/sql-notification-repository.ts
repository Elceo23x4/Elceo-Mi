import type { CanonicalAssetSymbol, Timeframe } from '@elceo/types';
import type { NotificationDecisionRepository, PersistedNotificationDecisionRecord } from './contracts';

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
