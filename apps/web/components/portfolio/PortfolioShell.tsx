'use client';

import { Reveal } from '@elceo/motion';
import { Surface, Text } from '@elceo/ui';
import Link from 'next/link';
import { LAUNCH_ASSET_CLUSTER, STORAGE_KEY, type ElceoUserState } from '../../lib/mock-state';
import { useMemo, useState } from 'react';
import { NextActionBlock, PrivateCommandBand, SurfaceHeader, SystemChip } from '../private-workspace/SurfacePrimitives';

type PortfolioShellProps = {
  initialState: ElceoUserState;
  trackedAssetLimit: number;
  subscriptionEligibleForPremium: boolean;
};

const groupMap: Record<string, 'Continuation' | 'Reversal Watch' | 'Neutral / Waiting' | 'Macro-Sensitive' | 'Contradiction Build'> = {
  'XAU/USD': 'Macro-Sensitive',
  'Nasdaq 100': 'Continuation',
  'S&P 500': 'Neutral / Waiting',
  DE30: 'Reversal Watch',
  'BTC/USD': 'Contradiction Build',
  'EUR/USD': 'Continuation',
  'GBP/USD': 'Reversal Watch',
  'USD/JPY': 'Macro-Sensitive',
  'USD/CHF': 'Neutral / Waiting',
  'AUD/USD': 'Continuation',
  'NZD/USD': 'Contradiction Build',
  'USD/CAD': 'Macro-Sensitive'
};

function calcPressure(asset: string): number {
  const base = Array.from(asset).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return 42 + (base % 49);
}

export function PortfolioShell({ initialState, trackedAssetLimit, subscriptionEligibleForPremium }: PortfolioShellProps) {
  const [state, setState] = useState<ElceoUserState>(initialState);
  const [persistError, setPersistError] = useState<string | null>(null);

  const limit = useMemo(() => trackedAssetLimit, [trackedAssetLimit]);

  const grouped = useMemo(() => {
    const buckets = new Map<string, string[]>();
    state.selectedAssets.forEach((asset) => {
      const key = groupMap[asset] ?? 'Neutral / Waiting';
      buckets.set(key, [...(buckets.get(key) ?? []), asset]);
    });
    return Array.from(buckets.entries());
  }, [state.selectedAssets]);

  const focusAsset = state.selectedAssets[0] ?? 'XAU/USD';

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
    <div className="elceo-private-page elceo-private-page-portfolio">
      <Reveal>
        <PrivateCommandBand
          kicker="PORTFOLIO · COMMAND BOARD"
          title="Launch asset focus orchestration"
          meta={`Tracking ${state.selectedAssets.length}/${limit} assets · ${state.planTier.toUpperCase()} depth state`}
          chips={[
            { label: 'Grouping mode: strategic clusters', tone: 'neutral' },
            { label: `Focus mode: ${focusAsset}`, tone: 'signal' },
            { label: subscriptionEligibleForPremium ? 'Premium depth active' : 'Depth cue available', tone: 'accent' }
          ]}
          actions={
            <>
              <button type="button" className="elceo-pill-button" onClick={() => toggleAsset(LAUNCH_ASSET_CLUSTER[0])}>
                Rebalance focus
              </button>
              <button type="button" className="elceo-pill-button elceo-pill-button-hero" onClick={() => toggleAsset('USD/CAD')}>
                Add asset
              </button>
            </>
          }
        />
      </Reveal>

      <div className="elceo-private-grid elceo-private-grid-portfolio">
        <Reveal delayMs={80}>
          <Surface className="elceo-private-panel elceo-portfolio-grouped-board" style={{ padding: '1rem' }}>
            <SurfaceHeader kicker="GROUPED WATCHLIST" title="Signal-aware asset board" body="Grouped for continuation, reversal, neutral and contradiction pressure." />
            <div className="elceo-group-board-columns">
              {grouped.map(([group, assets], index) => (
                <section key={group} className={`elceo-group-strip elceo-group-strip-${(index % 3) + 1}`}>
                  <header>
                    <strong>{group}</strong>
                    <span>{assets.length} assets</span>
                  </header>
                  {assets.map((asset) => {
                    const selected = state.selectedAssets.includes(asset);
                    const pressure = calcPressure(asset);
                    return (
                      <button key={asset} type="button" className="elceo-asset-row" aria-pressed={selected} onClick={() => toggleAsset(asset)}>
                        <span>{asset}</span>
                        <small>{pressure}% pressure</small>
                      </button>
                    );
                  })}
                </section>
              ))}
            </div>
            {persistError ? <Text tone="primary">{persistError}</Text> : null}
          </Surface>
        </Reveal>

        <Reveal delayMs={140}>
          <Surface className="elceo-private-panel elceo-portfolio-cluster-zone" style={{ padding: '1rem' }}>
            <SurfaceHeader kicker="CLUSTER INTELLIGENCE" title="Similarity and divergence map" body="Use this to detect shared macro drivers and contradiction build-up." />
            <div className="elceo-cluster-stack">
              <article>
                <strong>Rates-sensitive cluster</strong>
                <p className="elceo-muted-text">XAU/USD, USD/JPY, USD/CAD react sharply to Fed repricing cues this week.</p>
              </article>
              <article>
                <strong>Risk beta cluster</strong>
                <p className="elceo-muted-text">Nasdaq 100 and BTC/USD show synchronized volatility pulses; monitor divergence spikes.</p>
              </article>
              <article>
                <strong>Contradiction warning</strong>
                <p className="elceo-muted-text">NZD/USD confidence softened while continuation tags remained active — priority review.</p>
              </article>
            </div>
          </Surface>
        </Reveal>
      </div>

      <Reveal delayMs={180}>
        <div className="elceo-private-grid elceo-private-grid-bottom">
          <Surface className="elceo-private-panel" style={{ padding: '1rem' }}>
            <NextActionBlock
              title={`${focusAsset}: maintain conditional long bias into session overlap`}
              whyNow="Momentum persistence remains constructive, but contradiction pressure is no longer negligible."
              elevation="Needs one additional macro alignment trigger and cleaner pullback structure."
              invalidation="Bias weakens if impulse leg closes beneath prior defended zone with rising contradiction."
            />
            <Link href="/dashboard" className="elceo-pill-button" style={{ width: 'fit-content', marginTop: '0.85rem', display: 'inline-flex' }}>
              Open in dashboard workspace
            </Link>
          </Surface>

          <Surface className="elceo-private-panel elceo-private-depth-cue" style={{ padding: '1rem' }}>
            <p className="elceo-kicker">PLAN DEPTH</p>
            <h3>Portfolio intelligence depth</h3>
            <p className="elceo-muted-text">
              {subscriptionEligibleForPremium
                ? 'Premium depth enabled: full launch-asset coverage and expanded contradiction clustering.'
                : 'Free depth active: unlock full launch-asset coverage and deeper cluster diagnostics in Premium.'}
            </p>
            <SystemChip label={subscriptionEligibleForPremium ? 'Depth unlocked' : 'Depth constrained'} tone={subscriptionEligibleForPremium ? 'accent' : 'risk'} />
          </Surface>
        </div>
      </Reveal>

      <Surface className="elceo-private-panel" style={{ padding: '1rem' }}>
        <SurfaceHeader kicker="ASSET UNIVERSE MANAGEMENT" title="Launch-asset coverage" body="Selectively include assets while preserving concentration discipline." />
        <div className="elceo-asset-toggle-cloud">
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
      </Surface>
    </div>
  );
}
