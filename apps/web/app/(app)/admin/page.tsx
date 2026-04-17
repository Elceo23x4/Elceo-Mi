'use client';

import { useEffect, useState } from 'react';
import { Reveal } from '@elceo/motion';
import { Surface, Text } from '@elceo/ui';
import type { AdminExplainabilityRow, AuditLogEntry, ProviderFreshnessRow, ProviderHealthRecord } from '@elceo/types';

type AdminOpsSnapshot = {
  sourceHealth: ProviderHealthRecord[];
  freshness: ProviderFreshnessRow[];
  explainability: AdminExplainabilityRow[];
  auditLogs: AuditLogEntry[];
};

export default function AdminPage() {
  const [data, setData] = useState<AdminOpsSnapshot | null>(null);

  useEffect(() => {
    void fetch('/api/admin/ops')
      .then((response) => response.json())
      .then((payload: AdminOpsSnapshot) => setData(payload))
      .catch(() => setData(null));
  }, []);

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <Reveal>
        <Surface style={{ padding: '1.2rem', minHeight: '20vh' }}>
          <p className="elceo-kicker">ADMIN · OPERATIONS VISIBILITY</p>
          <h1 style={{ marginTop: '0.4rem' }}>Source health, explainability, freshness, and audit trace</h1>
          <Text tone="muted">Structured operational view for governance and support decisions.</Text>
        </Surface>
      </Reveal>

      <div className="elceo-dashboard-grid">
        <Surface style={{ padding: '1rem', minHeight: '230px' }}>
          <p className="elceo-kicker">SOURCE HEALTH</p>
          {(data?.sourceHealth ?? []).map((row) => (
            <p key={`${row.provider}-${row.domain}`} className="elceo-muted-text">
              {row.provider}/{row.domain}: {row.status} · success {row.successRatePct.toFixed(0)}%
            </p>
          ))}
        </Surface>

        <Surface style={{ padding: '1rem', minHeight: '230px' }}>
          <p className="elceo-kicker">FRESHNESS STATUS</p>
          {(data?.freshness ?? []).map((row) => (
            <p key={row.asset_code} className="elceo-muted-text">
              {row.asset_code}: {row.status} ({row.minutes_remaining}m)
            </p>
          ))}
        </Surface>

        <Surface style={{ padding: '1rem', minHeight: '260px' }}>
          <p className="elceo-kicker">EXPLAINABILITY TRACE</p>
          {(data?.explainability ?? []).slice(0, 3).map((row) => (
            <div key={row.asset_code} style={{ marginBottom: '0.6rem' }}>
              <strong>{row.asset_code}</strong>
              <p className="elceo-muted-text">Bias {row.directional_bias} · confidence {row.confidence_total.toFixed(1)} · contradiction {row.contradiction.state}</p>
              <p className="elceo-muted-text">Evidence support: {row.supporting_event_ids.length} · invalidating: {row.invalidating_event_ids.length}</p>
            </div>
          ))}
        </Surface>

        <Surface style={{ padding: '1rem', minHeight: '260px' }}>
          <p className="elceo-kicker">AUDIT LOG</p>
          {(data?.auditLogs ?? []).slice(0, 6).map((log) => (
            <p key={log.log_id} className="elceo-muted-text">
              {log.scope} · {log.action} · {new Date(log.created_at_utc).toLocaleString()}
            </p>
          ))}
        </Surface>
      </div>
    </div>
  );
}
