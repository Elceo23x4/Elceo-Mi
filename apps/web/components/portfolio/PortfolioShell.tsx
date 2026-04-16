'use client';

import { Reveal } from '@elceo/motion';
import { Surface, Text } from '@elceo/ui';
import { LAUNCH_ASSET_CLUSTER, STORAGE_KEY, type ElceoUserState } from '../../lib/mock-state';
import { useMemo, useState } from 'react';

type PortfolioShellProps = {
  initialState: ElceoUserState;
  trackedAssetLimit: number;
  subscriptionEligibleForPremium: boolean;
};

export function PortfolioShell({ initialState, trackedAssetLimit, subscriptionEligibleForPremium }: PortfolioShellProps) {
  const [state, setState] = useState<ElceoUserState>(initialState);
  const [persistError, setPersistError] = useState<string | null>(null);

  const limit = useMemo(() => trackedAssetLimit, [trackedAssetLimit]);

  const toggleAsset = async (asset: string) => {
    const exists = state.selectedAssets.includes(asset);
    const proposed = exists ? state.selectedAssets.filter((item) => item !== asset) : [...state.selectedAssets, asset];

    setPersistError(null);

    const response = await fetch('/api/app-state/watchlist', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assets: proposed })
    });

    if (!response.ok) {
      const failure = (await response.json().catch(() => ({ error: 'Failed to persist watchlist' }))) as { error?: string };
      setPersistError(failure.error ?? 'Failed to persist watchlist');
      return;
    }

    const data = (await response.json()) as { watchlist: { assets: string[] }; entitlement: { trackedAssetLimit: number } };

    const next = { ...state, selectedAssets: data.watchlist.assets };
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const atLimit = state.selectedAssets.length >= limit;

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <Reveal>
        <Surface style={{ padding: '1rem', display: 'grid', gap: '0.6rem' }}>
          <p className="elceo-kicker">PORTFOLIO MANAGER</p>
          <h1 style={{ margin: 0 }}>Manual tracked-asset control</h1>
          <Text tone="muted">
            Plan: {state.planTier.toUpperCase()} · Tracking {state.selectedAssets.length} / {limit} assets.
          </Text>
          {!subscriptionEligibleForPremium ? <Text tone="primary">Upgrade to PREMIUM to unlock full launch-asset coverage and deeper cognition surfaces.</Text> : null}
        </Surface>
      </Reveal>

      <Surface style={{ padding: '1rem', display: 'grid', gap: '0.8rem' }}>
        <p className="elceo-kicker">LAUNCH ASSETS</p>
        <div className="elceo-chip-grid">
          {LAUNCH_ASSET_CLUSTER.map((asset) => {
            const selected = state.selectedAssets.includes(asset);
            const disableNew = !selected && atLimit;
            return (
              <button key={asset} type="button" aria-pressed={selected} aria-label={`Toggle ${asset}`} disabled={disableNew} className={selected ? 'elceo-chip active' : 'elceo-chip'} onClick={() => toggleAsset(asset)}>
                {asset}
              </button>
            );
          })}
        </div>
        <Text tone="muted">When free-plan limit is reached, choose replacements or upgrade for full set access.</Text>
        {persistError ? <Text tone="primary">{persistError}</Text> : null}
      </Surface>

      <Surface style={{ padding: '1rem' }}>
        <p className="elceo-kicker">TRACKED ASSET STATE</p>
        <p className="elceo-muted-text">{state.selectedAssets.join(' · ') || 'No assets currently tracked.'}</p>
      </Surface>
    </div>
  );
}
