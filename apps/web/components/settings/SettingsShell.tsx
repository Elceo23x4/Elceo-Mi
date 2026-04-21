'use client';

import { Surface, Text } from '@elceo/ui';
import { useState } from 'react';
import { STORAGE_KEY, type ElceoUserState } from '../../lib/mock-state';
import { PrivateCommandBand, SurfaceHeader, SystemChip } from '../private-workspace/SurfacePrimitives';

type SettingsShellProps = {
  initialState: ElceoUserState;
  billing: {
    status: string;
    provider: string;
    subscriptionEligibleForPremium: boolean;
    canAccessPremiumDepth: boolean;
  };
};

const alertClassLabels = [
  ['biasChanges', 'Bias changes'],
  ['contradictionSpikes', 'Contradiction spikes'],
  ['keyLevelInteractions', 'Key-level interactions'],
  ['macroEventWarnings', 'Major macro events'],
  ['postEventRegimeShift', 'Post-event regime shifts'],
  ['journalCoaching', 'Journal coaching reminders']
] as const;

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
    <div className="elceo-private-page elceo-private-page-settings">
      <PrivateCommandBand
        kicker="SETTINGS · CONTROL ROOM"
        title="Environment and plan orchestration"
        meta={`Plan ${state.planTier.toUpperCase()} · Billing ${billing.status.toUpperCase()} · Provider ${billing.provider.toUpperCase()}`}
        chips={[
          { label: `Motion profile: ${state.motionIntensity.toUpperCase()}`, tone: 'neutral' },
          { label: state.notifications.inApp ? 'In-app alerts active' : 'In-app alerts muted', tone: 'signal' },
          { label: billing.canAccessPremiumDepth ? 'Premium depth active' : 'Premium depth available', tone: billing.canAccessPremiumDepth ? 'accent' : 'risk' }
        ]}
      />

      <div className="elceo-private-grid elceo-private-grid-settings">
        <Surface className="elceo-private-panel elceo-settings-visual-panel" style={{ padding: '1rem' }}>
          <SurfaceHeader kicker="VISUAL / MOTION" title="Interface tempo and atmosphere" body="Calm personalization controls for display behavior." />
          <div className="elceo-settings-segmented">
            {(['low', 'medium', 'high'] as const).map((intensity) => (
              <button
                key={intensity}
                type="button"
                className={state.motionIntensity === intensity ? 'elceo-settings-segment active' : 'elceo-settings-segment'}
                onClick={() => save({ ...state, motionIntensity: intensity })}
              >
                <strong>{intensity.toUpperCase()}</strong>
                <span>{intensity === 'low' ? 'minimal motion' : intensity === 'medium' ? 'balanced motion' : 'cinematic motion'}</span>
              </button>
            ))}
          </div>
        </Surface>

        <Surface className="elceo-private-panel elceo-settings-notify-panel" style={{ padding: '1rem' }}>
          <SurfaceHeader kicker="NOTIFICATIONS" title="Operational alert channels" />
          <div className="elceo-settings-toggle-grid">
            <label className="elceo-check-row"><input type="checkbox" checked={state.notifications.inApp} onChange={(event) => save({ ...state, notifications: { ...state.notifications, inApp: event.target.checked } })} /><span>In-app alerts</span></label>
            <label className="elceo-check-row"><input type="checkbox" checked={state.notifications.email} onChange={(event) => save({ ...state, notifications: { ...state.notifications, email: event.target.checked } })} /><span>Email alerts</span></label>
            <label className="elceo-check-row"><input type="checkbox" checked={state.notifications.browserPush} onChange={(event) => save({ ...state, notifications: { ...state.notifications, browserPush: event.target.checked } })} /><span>Browser push alerts</span></label>
          </div>

          <div className="elceo-settings-class-grid">
            {alertClassLabels.map(([key, label]) => (
              <label key={key} className="elceo-check-row">
                <input
                  type="checkbox"
                  checked={state.notificationClasses[key]}
                  onChange={(event) => save({ ...state, notificationClasses: { ...state.notificationClasses, [key]: event.target.checked } })}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </Surface>

        <Surface className="elceo-private-panel elceo-settings-billing-panel" style={{ padding: '1rem' }}>
          <SurfaceHeader kicker="BILLING / PLAN" title="Premium lifecycle console" body="High-status plan controls and entitlement depth visibility." />
          <Text tone="muted">Current depth: {billing.canAccessPremiumDepth ? 'Unlocked premium cognition surfaces.' : 'Free depth with constrained intelligence modules.'}</Text>
          <div className="elceo-private-chip-row">
            <SystemChip label={`Status ${billing.status}`} tone="neutral" />
            <SystemChip label={billing.canAccessPremiumDepth ? 'Premium active' : 'Premium available'} tone={billing.canAccessPremiumDepth ? 'accent' : 'risk'} />
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            {!billing.subscriptionEligibleForPremium ? <button type="button" className="elceo-pill-button elceo-pill-button-hero" onClick={runUpgradeFlow}>Upgrade to Premium</button> : null}
            <button type="button" className="elceo-pill-button" onClick={openBillingPortal}>Manage Billing</button>
          </div>
          {billingStatus ? <Text tone="primary">{billingStatus}</Text> : null}
        </Surface>

        <Surface className="elceo-private-panel elceo-settings-system-panel" style={{ padding: '1rem' }}>
          <SurfaceHeader kicker="SYSTEM BEHAVIOR" title="Environment notes" body="Low-energy technical cues for persistent config behavior." />
          <p className="elceo-muted-text">Settings persist to profile-level state and remain bounded to existing auth and app-state routes.</p>
          <p className="elceo-muted-text">Reduced-motion support remains enforced by shell orchestration and motion-intensity profile.</p>
          {persistError ? <Text tone="primary">{persistError}</Text> : null}
        </Surface>
      </div>
    </div>
  );
}
