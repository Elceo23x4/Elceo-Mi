'use client';

import { Reveal } from '@elceo/motion';
import { Surface, Text } from '@elceo/ui';
import { safeParseState, STORAGE_KEY } from '../../lib/mock-state';
import { useMemo } from 'react';

export function DashboardShell() {
  const state = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return safeParseState(localStorage.getItem(STORAGE_KEY));
  }, []);

  const trackedAssets = state?.selectedAssets ?? [];

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <Reveal>
        <Surface style={{ padding: '1.2rem' }}>
          <p className="elceo-kicker">DASHBOARD SHELL · COGNITION WORKSPACE</p>
          <h1 style={{ margin: '0.4rem 0 0.6rem' }}>Market cognition command surface</h1>
          <Text tone="muted">Tracked assets: {trackedAssets.join(', ') || 'None selected yet'}</Text>
        </Surface>
      </Reveal>

      <div className="elceo-dashboard-grid">
        <Surface style={{ padding: '1rem', minHeight: '220px' }}>
          <p className="elceo-kicker">CHART AREA</p>
          <h3>Chart placeholder</h3>
          <p className="elceo-muted-text">Reserved for real-time chart intelligence integration.</p>
        </Surface>
        <Surface style={{ padding: '1rem', minHeight: '220px' }}>
          <p className="elceo-kicker">COGNITION SUMMARY</p>
          <h3>Directional cognition summary</h3>
          <p className="elceo-muted-text">Mock bias alignment narrative and state transitions.</p>
        </Surface>
        <Surface style={{ padding: '1rem', minHeight: '220px' }}>
          <p className="elceo-kicker">DIRECTIONAL BIAS</p>
          <h3>Bias panel</h3>
          <p className="elceo-muted-text">Intraday / swing bias placeholders with horizon labels.</p>
        </Surface>
        <Surface style={{ padding: '1rem', minHeight: '220px' }}>
          <p className="elceo-kicker">CONFIDENCE ANATOMY</p>
          <h3>Confidence anatomy placeholder</h3>
          <p className="elceo-muted-text">Source confidence, event strength, model agreement, and penalties.</p>
        </Surface>
        <Surface style={{ padding: '1rem', minHeight: '220px' }}>
          <p className="elceo-kicker">CONTRADICTION / TENSION</p>
          <h3>Contradiction meter placeholder</h3>
          <p className="elceo-muted-text">Divergence and instability surfaces reserved for deterministic scoring.</p>
        </Surface>
        <Surface style={{ padding: '1rem', minHeight: '220px' }}>
          <p className="elceo-kicker">RISK CALCULATOR ENTRY</p>
          <h3>Risk module entry point</h3>
          <p className="elceo-muted-text">Position sizing interaction to be wired in the next logic slice.</p>
        </Surface>
        <Surface style={{ padding: '1rem', minHeight: '220px' }}>
          <p className="elceo-kicker">EVIDENCE / ANNOTATIONS</p>
          <h3>Linked evidence surface</h3>
          <p className="elceo-muted-text">Annotation and evidence cards placeholder linked to future chart states.</p>
        </Surface>
      </div>
    </div>
  );
}
