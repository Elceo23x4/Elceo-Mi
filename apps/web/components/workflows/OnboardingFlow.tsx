'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Reveal } from '@elceo/motion';
import { EditorialHeroFrame, Surface, Text } from '@elceo/ui';
import { getTrackedAssetLimit, LAUNCH_ASSET_CLUSTER, STORAGE_KEY, type ElceoUserState, type PlanTier } from '../../lib/mock-state';
import { SectionTitle } from '../shared/SectionTitle';

const steps = ['welcome', 'compliance', 'assets', 'plan', 'complete'] as const;

type OnboardingFlowProps = {
  initialState: ElceoUserState;
  subscriptionEligibleForPremium: boolean;
};

export function OnboardingFlow({ initialState, subscriptionEligibleForPremium }: OnboardingFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<(typeof steps)[number]>('welcome');
  const [state, setState] = useState<ElceoUserState>(initialState);
  const [persistError, setPersistError] = useState<string | null>(null);

  const stepIndex = steps.indexOf(step) + 1;
  const stepTotal = steps.length;

  const limit = getTrackedAssetLimit(state.planTier);
  const overLimit = state.selectedAssets.length > limit;

  const canContinue = useMemo(() => {
    switch (step) {
      case 'welcome':
        return true;
      case 'compliance':
        return state.termsAccepted && state.disclaimerAccepted;
      case 'assets':
        return state.selectedAssets.length > 0 && !overLimit;
      case 'plan':
        return state.planTier === 'free' || (state.planTier === 'premium' && subscriptionEligibleForPremium);
      case 'complete':
        return true;
      default:
        return false;
    }
  }, [
    overLimit,
    state.disclaimerAccepted,
    state.planTier,
    state.selectedAssets.length,
    state.termsAccepted,
    step,
    subscriptionEligibleForPremium
  ]);

  const gotoNext = () => {
    const currentIndex = steps.indexOf(step);
    const next = steps[currentIndex + 1];
    if (next) setStep(next);
  };

  const saveAndFinish = async () => {
    setPersistError(null);

    const response = await fetch('/api/app-state/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        termsAccepted: state.termsAccepted,
        disclaimerAccepted: state.disclaimerAccepted,
        planTier: state.planTier,
        selectedAssets: state.selectedAssets
      })
    });

    if (!response.ok) {
      const failure = (await response.json().catch(() => ({ error: 'Failed to persist onboarding state' }))) as { error?: string };
      setPersistError(failure.error ?? 'Failed to persist onboarding state');
      return;
    }

    const persisted = (await response.json()) as {
      profile: { onboardingCompletedAt: string | null };
      watchlist: { assets: string[] };
    };

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        selectedAssets: persisted.watchlist.assets,
        onboardingCompletedAt: persisted.profile.onboardingCompletedAt ?? undefined
      })
    );

    router.push('/dashboard');
  };

  const toggleAsset = (asset: string) => {
    setState((prev) => {
      const exists = prev.selectedAssets.includes(asset);
      const next = exists ? prev.selectedAssets.filter((item) => item !== asset) : [...prev.selectedAssets, asset];
      return { ...prev, selectedAssets: next };
    });
  };

  return (
    <div style={{ display: 'grid', gap: '1rem', maxWidth: '1100px', margin: '0 auto', padding: '1.2rem' }}>
      <Reveal>
        <EditorialHeroFrame>
          <p className="elceo-kicker">ONBOARDING · STEP {stepIndex}/{stepTotal}</p>
          <h1 style={{ margin: 0 }}>Build your ELCEO intelligence workspace.</h1>
          <Text tone="muted">
            ELCEO is market intelligence and decision support. It does not provide financial advice or guaranteed outcomes.
          </Text>
        </EditorialHeroFrame>
      </Reveal>

      {step === 'welcome' ? (
        <Surface style={{ padding: '1.25rem', display: 'grid', gap: '0.75rem' }}>
          <SectionTitle
            kicker="WELCOME FRAMING"
            title="Decision support before execution"
            body="You will configure plan context, compliance acknowledgements, and launch-asset focus before entering the platform shell."
          />
        </Surface>
      ) : null}

      {step === 'compliance' ? (
        <Surface style={{ padding: '1.25rem', display: 'grid', gap: '0.9rem' }}>
          <SectionTitle kicker="COMPLIANCE" title="Explicit acceptance required" />
          <label className="elceo-check-row">
            <input
              type="checkbox"
              checked={state.disclaimerAccepted}
              onChange={(event) => setState((prev) => ({ ...prev, disclaimerAccepted: event.target.checked }))}
            />
            <span>I understand ELCEO provides market intelligence and decision-support only, not financial advice.</span>
          </label>
          <label className="elceo-check-row">
            <input
              type="checkbox"
              checked={state.termsAccepted}
              onChange={(event) => setState((prev) => ({ ...prev, termsAccepted: event.target.checked }))}
            />
            <span>I accept the ELCEO terms and agree to responsible use of platform outputs.</span>
          </label>
        </Surface>
      ) : null}

      {step === 'assets' ? (
        <Surface style={{ padding: '1.25rem', display: 'grid', gap: '0.8rem' }}>
          <SectionTitle
            kicker="ASSET SELECTION"
            title="Select your launch-asset focus"
            body={`Manual selection is required. ${state.planTier.toUpperCase()} plan limit: ${limit} tracked assets.`}
          />
          <div className="elceo-chip-grid">
            {LAUNCH_ASSET_CLUSTER.map((asset) => {
              const selected = state.selectedAssets.includes(asset);
              return (
                <button key={asset} className={selected ? 'elceo-chip active' : 'elceo-chip'} onClick={() => toggleAsset(asset)} type="button">
                  {asset}
                </button>
              );
            })}
          </div>
          <Text tone={overLimit ? 'primary' : 'muted'}>
            Selected: {state.selectedAssets.length} / {limit}
            {overLimit ? ' — reduce selection or upgrade to premium.' : ''}
          </Text>
        </Surface>
      ) : null}

      {step === 'plan' ? (
        <Surface style={{ padding: '1.25rem', display: 'grid', gap: '0.8rem' }}>
          <SectionTitle kicker="PLAN" title="Free or premium workspace depth" />
          <div className="elceo-plan-grid">
            {(['free', 'premium'] as PlanTier[]).map((plan) => {
              const selected = state.planTier === plan;
              const disabled = plan === 'premium' && !subscriptionEligibleForPremium;
              return (
                <button
                  key={plan}
                  type="button"
                  disabled={disabled}
                  className={selected ? 'elceo-plan-card active' : 'elceo-plan-card'}
                  onClick={() => setState((prev) => ({ ...prev, planTier: plan }))}
                >
                  <strong>{plan.toUpperCase()}</strong>
                  <span>
                    Track up to {getTrackedAssetLimit(plan)} assets {plan === 'premium' ? 'with full shell depth.' : 'for essential access.'}
                    {plan === 'premium' && !subscriptionEligibleForPremium ? ' Upgrade in Settings to unlock.' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </Surface>
      ) : null}

      {step === 'complete' ? (
        <Surface style={{ padding: '1.25rem', display: 'grid', gap: '0.8rem' }}>
          <SectionTitle
            kicker="READY"
            title="Onboarding complete"
            body={`Plan: ${state.planTier.toUpperCase()} · Tracked assets: ${state.selectedAssets.join(', ')}`}
          />
          <Text tone="muted">Your shell will now load with entitlement-aware placeholders and selected asset context.</Text>
          <button className="elceo-pill-button" type="button" onClick={saveAndFinish}>
            Enter ELCEO Dashboard
          </button>
          {persistError ? <Text tone="primary">{persistError}</Text> : null}
        </Surface>
      ) : null}

      {step !== 'complete' ? (
        <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'space-between' }}>
          <button
            type="button"
            className="elceo-pill-button"
            disabled={step === 'welcome'}
            onClick={() => setStep(steps[Math.max(0, steps.indexOf(step) - 1)])}
          >
            Back
          </button>
          <button type="button" className="elceo-pill-button" disabled={!canContinue} onClick={gotoNext}>
            Continue
          </button>
        </div>
      ) : null}
    </div>
  );
          }
