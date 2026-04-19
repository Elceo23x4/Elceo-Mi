'use client';

import { Surface, Text } from '@elceo/ui';
import { useState } from 'react';
import { STORAGE_KEY, type ElceoUserState } from '../../lib/mock-state';

type SettingsShellProps = {
  initialState: ElceoUserState;
  billing: {
    status: string;
    provider: string;
    subscriptionEligibleForPremium: boolean;
    canAccessPremiumDepth: boolean;
  };
};

export function SettingsShell({ initialState, billing }: SettingsShellProps) {
  const [state, setState] = useState<ElceoUserState>(initialState);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [billingStatus, setBillingStatus] = useState<string | null>(null);

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

  async function runUpgradeFlow(): Promise<void> {
    setBillingStatus('Preparing premium checkout...');
    const response = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ targetPlan: 'premium' })
    });

    if (!response.ok) {
      const failure = (await response.json().catch(() => ({ error: 'Unable to prepare checkout' }))) as { error?: string };
      setBillingStatus(failure.error ?? 'Unable to prepare checkout');
      return;
    }

    const payload = (await response.json()) as { checkoutUrl: string };
    window.location.href = payload.checkoutUrl;
  }

  async function openBillingPortal(): Promise<void> {
    setBillingStatus('Opening billing workspace...');
    const response = await fetch('/api/billing/portal', { method: 'POST' });
    if (!response.ok) {
      const failure = (await response.json().catch(() => ({ error: 'Unable to open portal' }))) as { error?: string };
      setBillingStatus(failure.error ?? 'Unable to open portal');
      return;
    }

    const payload = (await response.json()) as { portalUrl: string };
    window.location.href = payload.portalUrl;
  }

  return (
    <div className="elceo-shell-rhythm elceo-settings-rhythm elceo-surface-settings">
      <Surface className="elceo-shell-hero elceo-shell-hero-settings" style={{ padding: '1rem', display: 'grid', gap: '0.7rem' }}>
        <p className="elceo-kicker">SETTINGS · VISUAL</p>
        <h2 style={{ margin: 0 }}>Theme & motion preferences</h2>
        <Text tone="muted">Theme switching remains available in top navigation; motion intensity is stored here for orchestration quality.</Text>
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

      <Surface className="elceo-shell-panel elceo-panel-settings-notifications" style={{ padding: '1rem', display: 'grid', gap: '0.6rem' }}>
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

      <Surface className="elceo-shell-panel elceo-shell-panel-contrast elceo-panel-settings-alert-classes" style={{ padding: '1rem', display: 'grid', gap: '0.6rem' }}>
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

      <Surface className="elceo-shell-panel elceo-shell-panel-deep elceo-panel-settings-billing" style={{ padding: '1rem', display: 'grid', gap: '0.6rem' }}>
        <p className="elceo-kicker">SETTINGS · BILLING & PLAN</p>
        <h2 style={{ margin: 0 }}>Subscription lifecycle</h2>
        <Text tone="muted">
          Current plan: {state.planTier.toUpperCase()} · Status: {billing.status.toUpperCase()} · Provider: {billing.provider.toUpperCase()}
        </Text>
        <Text tone="muted">
          {billing.canAccessPremiumDepth
            ? 'Premium depth is enabled. Manage your lifecycle in billing workspace.'
            : 'Free plan active. Upgrade to unlock full tracked-asset depth, coaching and premium dashboard context.'}
        </Text>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          {!billing.subscriptionEligibleForPremium ? (
            <button type="button" className="elceo-pill-button elceo-pill-button-hero" onClick={runUpgradeFlow}>
              Upgrade to Premium
            </button>
          ) : null}
          <button type="button" className="elceo-pill-button" onClick={openBillingPortal}>
            Manage Billing
          </button>
        </div>
        {billingStatus ? <Text tone="primary">{billingStatus}</Text> : null}
        {persistError ? <Text tone="primary">{persistError}</Text> : null}
      </Surface>
    </div>
  );
}
