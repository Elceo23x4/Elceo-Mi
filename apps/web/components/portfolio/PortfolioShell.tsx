'use client';

import { Reveal } from '@elceo/motion';
import { Surface, Text } from '@elceo/ui';
import {
  getTrackedAssetLimit,
  LAUNCH_ASSET_CLUSTER,
  safeParseState,
  STORAGE_KEY,
  type ElceoUserState
} from '../../lib/mock-state';
import { useEffect, useMemo, useState } from 'react';

export function PortfolioShell() {
  const [state, setState] = useState<ElceoUserState | null>(null);

  useEffect(() => {
    setState(safeParseState(localStorage.getItem(STORAGE_KEY)));
  }, []);

  const limit = useMemo(() => (state ? getTrackedAssetLimit(state.planTier) : 0), [state]);

  const toggleAsset = (asset: string) => {
    if (!state) return;

    const exists = state.selectedAssets.includes(asset);
    let nextAssets = exists ? state.selectedAssets.filter((item) => item !== asset) : [...state.selectedAssets, asset];

    if (!exists && nextAssets.length > limit) {
      nextAssets = nextAssets.slice(0, limit);
    }

    const next = { ...state, selectedAssets: nextAssets };
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  if (!state) {
    return (
      <Surface style={{ padding: '1rem' }}>
        <p className="elceo-kicker">PORTFOLIO</p>
        <p>Loading portfolio context…</p>
      </Surface>
    );
  }

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
          {state.planTier === 'free' ? (
            <Text tone="primary">Upgrade to PREMIUM to unlock full launch-asset coverage and deeper cognition surfaces.</Text>
          ) : null}
        </Surface>
      </Reveal>

      <Surface style={{ padding: '1rem', display: 'grid', gap: '0.8rem' }}>
        <p className="elceo-kicker">LAUNCH ASSETS</p>
        <div className="elceo-chip-grid">
          {LAUNCH_ASSET_CLUSTER.map((asset) => {
            const selected = state.selectedAssets.includes(asset);
            const disableNew = !selected && atLimit;
            return (
              <button
                key={asset}
                type="button"
                disabled={disableNew}
                className={selected ? 'elceo-chip active' : 'elceo-chip'}
                onClick={() => toggleAsset(asset)}
              >
                {asset}
              </button>
            );
          })}
        </div>
        <Text tone="muted">When free-plan limit is reached, choose replacements or upgrade for full set access.</Text>
      </Surface>

      <Surface style={{ padding: '1rem' }}>
        <p className="elceo-kicker">TRACKED ASSET STATE</p>
        <p className="elceo-muted-text">{state.selectedAssets.join(' · ') || 'No assets currently tracked.'}</p>
      </Surface>
    </div>
  );
}
