'use client';

import { useEffect, useState } from 'react';
import { Reveal } from '@elceo/motion';
import { Surface } from '@elceo/ui';
import type { AdminExplainabilityRow, AuditLogEntry, ProviderFreshnessRow, ProviderHealthRecord } from '@elceo/types';
import { PrivateCommandBand, SurfaceHeader, SystemChip } from '../private-workspace/SurfacePrimitives';

type AdminOpsSnapshot = {
  sourceHealth: ProviderHealthRecord[];
  freshness: ProviderFreshnessRow[];
  explainability: AdminExplainabilityRow[];
  auditLogs: AuditLogEntry[];
};

export function AdminOpsConsole() {
  const [data, setData] = useState<AdminOpsSnapshot | null>(null);

  useEffect(() => {
    void fetch('/api/admin/ops')
      .then((response) => response.json())
      .then((payload: AdminOpsSnapshot) => setData(payload))
      .catch(() => setData(null));
  }, []);

  return (
    <div className="elceo-private-page elceo-private-page-admin">
      <Reveal>
        <PrivateCommandBand
          kicker="ADMIN · OPS CONSOLE"
          title="Source health and explainability station"
          meta="Operational intelligence for governance and support teams"
          chips={[
            { label: `Sources ${data?.sourceHealth.length ?? 0}`, tone: 'neutral' },
            { label: `Freshness rows ${data?.freshness.length ?? 0}`, tone: 'signal' },
            { label: 'Audit trace active', tone: 'accent' }
          ]}
        />
      </Reveal>

      <div className="elceo-private-grid elceo-private-grid-admin">
        <Reveal delayMs={60}>
          <Surface className="elceo-private-panel" style={{ padding: '1rem' }}>
            <SurfaceHeader kicker="SOURCE HEALTH COMMAND" title="Provider status matrix" />
            <div className="elceo-admin-list">
              {(data?.sourceHealth ?? []).map((row) => (
                <article key={`${row.provider}-${row.domain}`}>
                  <strong>{row.provider}/{row.domain}</strong>
                  <p className="elceo-muted-text">{row.status} · success {row.successRatePct.toFixed(0)}%</p>
                  <SystemChip label={row.status} tone={row.status === 'healthy' ? 'accent' : 'risk'} />
                </article>
              ))}
            </div>
          </Surface>
        </Reveal>

        <Reveal delayMs={110}>
          <Surface className="elceo-private-panel" style={{ padding: '1rem' }}>
            <SurfaceHeader kicker="FRESHNESS + EXPLAINABILITY" title="Data recency and evidence trace" />
            <div className="elceo-admin-split">
              <div>
                <h4>Freshness</h4>
                {(data?.freshness ?? []).map((row) => (
                  <p key={row.asset_code} className="elceo-muted-text">{row.asset_code}: {row.status} ({row.minutes_remaining}m)</p>
                ))}
              </div>
              <div>
                <h4>Explainability</h4>
                {(data?.explainability ?? []).slice(0, 4).map((row) => (
                  <p key={row.asset_code} className="elceo-muted-text">{row.asset_code}: {row.directional_bias} · conf {row.confidence_total.toFixed(1)} · contra {row.contradiction.state}</p>
                ))}
              </div>
            </div>
          </Surface>
        </Reveal>
      </div>

      <Reveal delayMs={150}>
        <div className="elceo-private-grid elceo-private-grid-bottom">
          <Surface className="elceo-private-panel" style={{ padding: '1rem' }}>
            <SurfaceHeader kicker="AUDIT VISIBILITY" title="Recent governance actions" />
            <div className="elceo-admin-list">
              {(data?.auditLogs ?? []).slice(0, 8).map((log) => (
                <article key={log.log_id}>
                  <strong>{log.scope} · {log.action}</strong>
                  <p className="elceo-muted-text">{new Date(log.created_at_utc).toLocaleString()} · actor {log.actor_user_id ?? "system"}</p>
                </article>
              ))}
            </div>
          </Surface>

          <Surface className="elceo-private-panel elceo-admin-notes" style={{ padding: '1rem' }}>
            <SurfaceHeader kicker="OPS NOTES" title="Governance reminders" />
            <p className="elceo-muted-text">Use explainability and freshness modules together before communicating system-level narratives to users.</p>
            <p className="elceo-muted-text">Escalate source instability when multiple critical domains degrade simultaneously.</p>
          </Surface>
        </div>
      </Reveal>
    </div>
  );
}
