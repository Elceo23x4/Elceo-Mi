'use client';

import { Surface, Text } from '@elceo/ui';
import { useState } from 'react';
import { STORAGE_KEY, type ElceoUserState } from '../../lib/mock-state';

type SettingsShellProps = {
  initialState: ElceoUserState;
};

export function SettingsShell({ initialState }: SettingsShellProps) {
  const [state, setState] = useState<ElceoUserState>(initialState);
  const [persistError, setPersistError] = useState<string | null>(null);

  const save = async (next: ElceoUserState) => {
    setPersistError(null);

    const response = await fetch('/api/app-state/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        motionIntensity: next.motionIntensity,
        notifications: next.notifications,
        notificationClasses: next.notificationClasses
      })
    });

    if (!response.ok) {
      const failure = (await response.json().catch(() => ({ error: 'Failed to persist settings' }))) as { error?: string };
      setPersistError(failure.error ?? 'Failed to persist settings');
      return;
    }

    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <Surface style={{ padding: '1rem', display: 'grid', gap: '0.6rem' }}>
        <p className="elceo-kicker">SETTINGS · VISUAL</p>
        <h2 style={{ margin: 0 }}>Theme & motion preferences</h2>
        <Text tone="muted">Theme switching remains available in top navigation; motion intensity is stored here for future orchestration.</Text>
        <div className="elceo-plan-grid">
          {(['low', 'medium', 'high'] as const).map((intensity) => (
            <button
              key={intensity}
              type="button"
              className={state.motionIntensity === intensity ? 'elceo-plan-card active' : 'elceo-plan-card'}
              onClick={() => save({ ...state, motionIntensity: intensity })}
            >
              <strong>{intensity.toUpperCase()}</strong>
              <span>Motion intensity profile</span>
            </button>
          ))}
        </div>
      </Surface>

      <Surface style={{ padding: '1rem', display: 'grid', gap: '0.6rem' }}>
        <p className="elceo-kicker">SETTINGS · NOTIFICATIONS</p>
        <h2 style={{ margin: 0 }}>Notification channels</h2>
        <label className="elceo-check-row">
          <input
            type="checkbox"
            checked={state.notifications.inApp}
            onChange={(event) => save({ ...state, notifications: { ...state.notifications, inApp: event.target.checked } })}
          />
          <span>In-app alerts</span>
        </label>
        <label className="elceo-check-row">
          <input
            type="checkbox"
            checked={state.notifications.email}
            onChange={(event) => save({ ...state, notifications: { ...state.notifications, email: event.target.checked } })}
          />
          <span>Email alerts</span>
        </label>
        <label className="elceo-check-row">
          <input
            type="checkbox"
            checked={state.notifications.browserPush}
            onChange={(event) => save({ ...state, notifications: { ...state.notifications, browserPush: event.target.checked } })}
          />
          <span>Browser push alerts</span>
        </label>
      </Surface>

      <Surface style={{ padding: '1rem', display: 'grid', gap: '0.6rem' }}>
        <p className="elceo-kicker">SETTINGS · ALERT CLASSES</p>
        <h2 style={{ margin: 0 }}>Preference classes</h2>
        {(
          [
            ['biasChanges', 'Bias changes'],
            ['contradictionSpikes', 'Contradiction spikes'],
            ['keyLevelInteractions', 'Key-level interactions'],
            ['macroEventWarnings', 'Major macro event incoming'],
            ['postEventRegimeShift', 'Post-event regime shift'],
            ['journalCoaching', 'Journal coaching reminders']
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="elceo-check-row">
            <input
              type="checkbox"
              checked={state.notificationClasses[key]}
              onChange={(event) =>
                save({
                  ...state,
                  notificationClasses: { ...state.notificationClasses, [key]: event.target.checked }
                })
              }
            />
            <span>{label}</span>
          </label>
        ))}
      </Surface>

      <Surface style={{ padding: '1rem', display: 'grid', gap: '0.6rem' }}>
        <p className="elceo-kicker">SETTINGS · PLAN</p>
        <h2 style={{ margin: 0 }}>Plan visibility</h2>
        <Text tone="muted">Current plan: {state.planTier.toUpperCase()}</Text>
        {persistError ? <Text tone="primary">{persistError}</Text> : null}
      </Surface>
    </div>
  );
}
