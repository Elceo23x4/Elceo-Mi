'use client';

import { useEffect, useMemo, useState } from 'react';
import type { InAppAlert } from '@elceo/types';

export function InAppAlertsTray() {
  const [alerts, setAlerts] = useState<InAppAlert[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    void fetch('/api/app-state/alerts')
      .then((response) => response.json())
      .then((payload: { alerts?: InAppAlert[] }) => setAlerts(payload.alerts ?? []))
      .catch(() => setAlerts([]));
  }, []);

  const unread = useMemo(() => alerts.filter((alert) => !alert.read_at_utc), [alerts]);

  const markRead = async (alertId: string) => {
    const response = await fetch('/api/app-state/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId })
    });
    if (!response.ok) return;
    const payload = (await response.json()) as { alerts: InAppAlert[] };
    setAlerts(payload.alerts);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button type="button" className="elceo-chip" onClick={() => setExpanded((prev) => !prev)}>
        Alerts {unread.length ? `(${unread.length})` : ''}
      </button>
      {expanded ? (
        <div
          style={{
            position: 'absolute',
            right: 0,
            marginTop: '0.5rem',
            width: '320px',
            maxHeight: '420px',
            overflow: 'auto',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '12px',
            background: 'rgba(20,18,19,0.96)',
            padding: '0.6rem',
            zIndex: 50
          }}
        >
          <p className="elceo-kicker">IN-APP ALERTS</p>
          {alerts.length === 0 ? <p className="elceo-muted-text">No alerts yet.</p> : null}
          {alerts.map((alert) => (
            <div key={alert.alert_id} style={{ padding: '0.55rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <strong style={{ fontSize: '0.92rem' }}>{alert.title}</strong>
              <p className="elceo-muted-text" style={{ margin: '0.2rem 0' }}>
                {alert.body}
              </p>
              {!alert.read_at_utc ? (
                <button type="button" className="elceo-chip" onClick={() => markRead(alert.alert_id)}>
                  Mark read
                </button>
              ) : (
                <span className="elceo-muted-text">Read</span>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
