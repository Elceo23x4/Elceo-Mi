import { queryDb } from '../db/client';
import type { AuditLogEntry, InAppAlert } from '@elceo/types';

export interface AlertRepository {
  listInAppAlerts(userId: string, limit?: number): Promise<InAppAlert[]>;
  hasRecentAlert(userId: string, fingerprint: string, cooldownMinutes: number): Promise<boolean>;
  createInAppAlerts(alerts: InAppAlert[]): Promise<void>;
  markAlertRead(userId: string, alertId: string): Promise<void>;
  appendAuditLog(entry: AuditLogEntry): Promise<void>;
  listAuditLogs(limit?: number): Promise<AuditLogEntry[]>;
}

type AlertRow = {
  alert_id: string;
  user_id: string;
  asset_code: string;
  alert_class: InAppAlert['alert_class'];
  title: string;
  body: string;
  fingerprint: string;
  created_at_utc: string;
  read_at_utc: string | null;
  metadata: string;
};

type AuditRow = {
  log_id: string;
  actor_user_id: string | null;
  scope: AuditLogEntry['scope'];
  action: string;
  details: string;
  created_at_utc: string;
};

function mapAlert(row: AlertRow): InAppAlert {
  return {
    alert_id: row.alert_id,
    user_id: row.user_id,
    asset_code: row.asset_code,
    alert_class: row.alert_class,
    title: row.title,
    body: row.body,
    fingerprint: row.fingerprint,
    created_at_utc: row.created_at_utc,
    ...(row.read_at_utc ? { read_at_utc: row.read_at_utc } : {}),
    metadata: JSON.parse(row.metadata) as Record<string, unknown>
  };
}

function mapAudit(row: AuditRow): AuditLogEntry {
  return {
    log_id: row.log_id,
    ...(row.actor_user_id ? { actor_user_id: row.actor_user_id } : {}),
    scope: row.scope,
    action: row.action,
    details: JSON.parse(row.details) as Record<string, unknown>,
    created_at_utc: row.created_at_utc
  };
}

const ALERT_RETENTION_DAYS = 90;
const ALERT_PER_USER_CAP = 500;
const AUDIT_RETENTION_DAYS = 180;
const AUDIT_CAP = 5000;

export class PostgresAlertRepository implements AlertRepository {
  async listInAppAlerts(userId: string, limit = 30): Promise<InAppAlert[]> {
    const rows = await queryDb<AlertRow>(
      `SELECT alert_id, user_id, asset_code, alert_class, title, body, fingerprint,
              created_at_utc, read_at_utc, metadata::text AS metadata
       FROM app_in_app_alerts
       WHERE user_id = $1
       ORDER BY created_at_utc DESC
       LIMIT $2`,
      [userId, limit]
    );

    return rows.map(mapAlert);
  }

  async hasRecentAlert(userId: string, fingerprint: string, cooldownMinutes: number): Promise<boolean> {
    const rows = await queryDb<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1
         FROM app_in_app_alerts
         WHERE user_id = $1
           AND fingerprint = $2
           AND created_at_utc >= (now() - ($3 || ' minutes')::interval)
      ) AS exists`,
      [userId, fingerprint, String(cooldownMinutes)]
    );

    return Boolean(rows[0]?.exists);
  }

  async createInAppAlerts(alerts: InAppAlert[]): Promise<void> {
    const touchedUsers = new Set<string>();

    for (const alert of alerts) {
      touchedUsers.add(alert.user_id);
      await queryDb(
        `INSERT INTO app_in_app_alerts (alert_id, user_id, asset_code, alert_class, title, body, fingerprint, created_at_utc, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (alert_id) DO NOTHING`,
        [
          alert.alert_id,
          alert.user_id,
          alert.asset_code,
          alert.alert_class,
          alert.title,
          alert.body,
          alert.fingerprint,
          alert.created_at_utc,
          JSON.stringify(alert.metadata)
        ]
      );
    }

    for (const userId of touchedUsers) {
      await queryDb(
        `DELETE FROM app_in_app_alerts
         WHERE user_id = $1
           AND (created_at_utc < now() - ($2 || ' days')::interval
                OR alert_id IN (
                  SELECT alert_id FROM app_in_app_alerts
                  WHERE user_id = $1
                  ORDER BY created_at_utc DESC
                  OFFSET $3
                ))`,
        [userId, String(ALERT_RETENTION_DAYS), ALERT_PER_USER_CAP]
      );
    }
  }

  async markAlertRead(userId: string, alertId: string): Promise<void> {
    await queryDb(
      `UPDATE app_in_app_alerts
       SET read_at_utc = now()
       WHERE user_id = $1 AND alert_id = $2`,
      [userId, alertId]
    );
  }

  async appendAuditLog(entry: AuditLogEntry): Promise<void> {
    await queryDb(
      `INSERT INTO app_audit_logs (log_id, actor_user_id, scope, action, details, created_at_utc)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (log_id) DO NOTHING`,
      [entry.log_id, entry.actor_user_id ?? null, entry.scope, entry.action, JSON.stringify(entry.details), entry.created_at_utc]
    );

    await queryDb(
      `DELETE FROM app_audit_logs
       WHERE created_at_utc < now() - ($1 || ' days')::interval
          OR log_id IN (
            SELECT log_id FROM app_audit_logs
            ORDER BY created_at_utc DESC
            OFFSET $2
          )`,
      [String(AUDIT_RETENTION_DAYS), AUDIT_CAP]
    );
  }

  async listAuditLogs(limit = 60): Promise<AuditLogEntry[]> {
    const rows = await queryDb<AuditRow>(
      `SELECT log_id, actor_user_id, scope, action, details::text AS details, created_at_utc
       FROM app_audit_logs
       ORDER BY created_at_utc DESC
       LIMIT $1`,
      [limit]
    );

    return rows.map(mapAudit);
  }
}

const memoryAlerts = new Map<string, InAppAlert[]>();
const memoryAudits: AuditLogEntry[] = [];

export class InMemoryAlertRepository implements AlertRepository {
  async listInAppAlerts(userId: string, limit = 30): Promise<InAppAlert[]> {
    return (memoryAlerts.get(userId) ?? []).slice(0, limit);
  }

  async hasRecentAlert(userId: string, fingerprint: string, cooldownMinutes: number): Promise<boolean> {
    const alerts = memoryAlerts.get(userId) ?? [];
    const threshold = Date.now() - cooldownMinutes * 60_000;
    return alerts.some((alert) => alert.fingerprint === fingerprint && new Date(alert.created_at_utc).getTime() >= threshold);
  }

  async createInAppAlerts(alerts: InAppAlert[]): Promise<void> {
    const cutoff = Date.now() - ALERT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    for (const alert of alerts) {
      const existing = memoryAlerts.get(alert.user_id) ?? [];
      const next = [alert, ...existing].filter((item) => new Date(item.created_at_utc).getTime() >= cutoff).slice(0, ALERT_PER_USER_CAP);
      memoryAlerts.set(alert.user_id, next);
    }
  }

  async markAlertRead(userId: string, alertId: string): Promise<void> {
    const alerts = memoryAlerts.get(userId) ?? [];
    memoryAlerts.set(
      userId,
      alerts.map((alert) => (alert.alert_id === alertId ? { ...alert, read_at_utc: new Date().toISOString() } : alert))
    );
  }

  async appendAuditLog(entry: AuditLogEntry): Promise<void> {
    memoryAudits.unshift(entry);
    const cutoff = Date.now() - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    while (memoryAudits.length > AUDIT_CAP || (memoryAudits.at(-1) && new Date(memoryAudits.at(-1)!.created_at_utc).getTime() < cutoff)) {
      memoryAudits.pop();
    }
  }

  async listAuditLogs(limit = 60): Promise<AuditLogEntry[]> {
    return memoryAudits.slice(0, limit);
  }
}
