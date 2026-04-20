'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Surface } from '@elceo/ui';
import type { ChartAnnotation, ChartAnnotationFilters, ChartCandlePoint, H4Zone } from '@elceo/types';
import { CognitionChart } from '../dashboard/CognitionChart';
import { applyAnnotationFilters, buildEvidenceSideNotes } from '../../lib/chart-shaping';

const FILTER_LABELS: Array<{ key: keyof ChartAnnotationFilters; label: string }> = [
  { key: 'keyLevelZones', label: 'Key-level zones' },
  { key: 'macroEvents', label: 'Macro events' },
  { key: 'contradiction', label: 'Contradiction' },
  { key: 'evidenceNotes', label: 'Evidence notes' },
  { key: 'impulseOrigins', label: 'Impulse anchors' }
];

const DEMO_FILTERS: ChartAnnotationFilters = {
  keyLevelZones: true,
  macroEvents: true,
  contradiction: true,
  evidenceNotes: true,
  impulseOrigins: true
};

const ZONES: H4Zone[] = [
  {
    zone_id: 'z1',
    asset_code: 'XAU/USD',
    timeframe: 'H4',
    lower: 2360.4,
    upper: 2366.8,
    center: 2363.6,
    touches: 4,
    reaction_magnitude_atr: 1.8,
    hours_since_last_touch: 12,
    significance_score: 84
  },
  {
    zone_id: 'z2',
    asset_code: 'XAU/USD',
    timeframe: 'H4',
    lower: 2348.3,
    upper: 2353.2,
    center: 2350.8,
    touches: 3,
    reaction_magnitude_atr: 1.4,
    hours_since_last_touch: 28,
    significance_score: 76
  }
];

const ANNOTATIONS: ChartAnnotation[] = [
  { kind: 'macro_event_marker', annotation_id: 'm1', asset_code: 'XAU/USD', event_id: 'fed-tone', timestamp_utc: '2026-04-20T09:00:00.000Z', evidence_ids: ['e1'] },
  {
    kind: 'contradiction_marker',
    annotation_id: 'c1',
    asset_code: 'XAU/USD',
    contradiction_score: 34,
    contradiction_state: 'contained tension',
    evidence_ids: ['e3', 'e5']
  },
  {
    kind: 'evidence_note',
    annotation_id: 'n1',
    asset_code: 'XAU/USD',
    title: 'Yield drift supporting bid stability',
    body: 'US real-yield drift cooled while gold retained zone support, preserving bullish pressure.',
    timestamp_utc: '2026-04-20T10:15:00.000Z',
    evidence_ids: ['e2']
  },
  {
    kind: 'evidence_note',
    annotation_id: 'n2',
    asset_code: 'XAU/USD',
    title: 'Contradiction near upper zone edge',
    body: 'Late-session momentum faded before resistance retest, increasing invalidation sensitivity.',
    timestamp_utc: '2026-04-20T12:15:00.000Z',
    evidence_ids: ['e5']
  },
  { kind: 'impulse_origin_placeholder', annotation_id: 'i1', asset_code: 'XAU/USD', timestamp_utc: '2026-04-20T06:00:00.000Z', note: 'Impulse origin', evidence_ids: ['e4'] }
];

function buildCandles(): ChartCandlePoint[] {
  const start = Date.parse('2026-04-18T00:00:00.000Z');
  let previous = 2344;
  return Array.from({ length: 64 }).map((_, index) => {
    const timestamp = new Date(start + index * 60 * 60 * 1000).toISOString();
    const drift = Math.sin(index / 4) * 2.2 + index * 0.35;
    const open = previous;
    const close = 2346 + drift;
    const high = Math.max(open, close) + 1.6;
    const low = Math.min(open, close) - 1.3;
    previous = close;
    return { timestamp_utc: timestamp, open, high, low, close };
  });
}

const CANDLES = buildCandles();

export function DemoDashboardTwin() {
  const [filters, setFilters] = useState<ChartAnnotationFilters>(DEMO_FILTERS);

  const filteredAnnotations = useMemo(() => applyAnnotationFilters(ANNOTATIONS, filters, 'moderate'), [filters]);
  const notes = useMemo(() => buildEvidenceSideNotes(filteredAnnotations).slice(0, 5), [filteredAnnotations]);

  const contradictionVisible = useMemo(() => filteredAnnotations.filter((item) => item.kind === 'contradiction_marker').length, [filteredAnnotations]);
  const macroVisible = useMemo(() => filteredAnnotations.filter((item) => item.kind === 'macro_event_marker').length, [filteredAnnotations]);

  return (
    <div className="elceo-demo-workspace">
      <header className="elceo-demo-shell-chrome">
        <div>
          <p className="elceo-kicker">ELCEO TERMINAL</p>
          <strong>Public Demo Workspace</strong>
        </div>
        <div className="elceo-demo-chips">
          <span className="elceo-system-chip">Asset XAU/USD</span>
          <span className="elceo-system-chip">Live pulse</span>
        </div>
        <div className="elceo-demo-chrome-actions">
          <button type="button" className="elceo-chip">
            Toggle notes
          </button>
          <Link href="/login?callbackUrl=/dashboard" className="elceo-pill-button elceo-pill-button-hero">
            Open Platform
          </Link>
        </div>
      </header>

      <Surface className="elceo-cognition-hero elceo-shell-hero elceo-dashboard-zone-a" style={{ padding: '1rem' }}>
        <div className="elceo-zone-a-main">
          <p className="elceo-kicker">COMMAND STRIP</p>
          <h1 className="elceo-cognition-title">XAU/USD · Bullish continuation bias</h1>
          <p className="elceo-muted-text">ELCEO thesis: support-holding structure remains valid while contradiction stays below structural warning threshold.</p>
        </div>
        <div className="elceo-zone-a-chips">
          <span className="elceo-system-chip">Horizon intraday · H4</span>
          <span className="elceo-system-chip is-bias">Bias bullish</span>
          <span className="elceo-system-chip is-confidence">Confidence 78.4</span>
          <span className="elceo-system-chip is-contradiction">Contradiction 34</span>
          <span className="elceo-system-chip">Freshness 14m</span>
        </div>
      </Surface>

      <section className="elceo-dashboard-zone-b" aria-label="Demo chart intelligence workspace">
        <Surface className="elceo-cognition-chart-surface elceo-panel-chart elceo-zone-b-chart" style={{ padding: '1rem' }}>
          <div className="elceo-cognition-headline-row">
            <div>
              <p className="elceo-kicker">PRIMARY CHART INTELLIGENCE</p>
              <h2>Zone overlays, contradiction marker, and evidence-linked notes</h2>
            </div>
            <p className="elceo-muted-text">Public twin surface · moderate annotation density</p>
          </div>

          <div className="elceo-chip-ribbon">
            {FILTER_LABELS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                aria-pressed={filters[filter.key]}
                className={filters[filter.key] ? 'elceo-chip active' : 'elceo-chip'}
                onClick={() => setFilters((prev) => ({ ...prev, [filter.key]: !prev[filter.key] }))}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="elceo-chart-frame">
            <div className="elceo-chart-frame-header">
              <span>Current cognition pinned</span>
              <span>Contained tension · 34</span>
            </div>
            <CognitionChart candles={CANDLES} zones={ZONES} annotations={filteredAnnotations} />
          </div>
        </Surface>

        <div className="elceo-zone-b-intel-strip">
          <Surface className="elceo-context-panel elceo-panel-evidence elceo-strip-module" style={{ padding: '0.85rem' }}>
            <p className="elceo-kicker">EVIDENCE FRAGMENTS</p>
            {notes.map((note) => (
              <article key={note.id} className="elceo-evidence-note">
                <strong>{note.title}</strong>
                <p>{note.body}</p>
              </article>
            ))}
          </Surface>

          <Surface className="elceo-context-panel elceo-panel-contradiction elceo-strip-module" style={{ padding: '0.85rem' }}>
            <p className="elceo-kicker">ACTIVE CONTRADICTION</p>
            <h3>Contained tension</h3>
            <p className="elceo-muted-text">{contradictionVisible} contradiction marker visible. Upside remains valid while zone support remains defended.</p>
          </Surface>

          <Surface className="elceo-context-panel elceo-panel-zones elceo-strip-module" style={{ padding: '0.85rem' }}>
            <p className="elceo-kicker">EVENT SPINE</p>
            <p className="elceo-muted-text">{macroVisible} macro marker linked to Fed tone shift and real-yield cooling.</p>
            <p className="elceo-muted-text">Invalidation trigger: decisive loss of 2360.4 zone under expanding contradiction.</p>
          </Surface>
        </div>
      </section>

      <section className="elceo-dashboard-zone-c" aria-label="Demo context rail">
        <Surface className="elceo-dashboard-panel elceo-panel-confidence elceo-context-module-confidence" style={{ padding: '0.95rem' }}>
          <p className="elceo-kicker">CONFIDENCE ANATOMY</p>
          <p className="elceo-muted-text">Source integrity 82.0</p>
          <p className="elceo-muted-text">Event alignment 76.0</p>
          <p className="elceo-muted-text">Price acceptance 71.0</p>
          <p className="elceo-muted-text">Contradiction penalty -9.0</p>
        </Surface>

        <Surface className="elceo-dashboard-panel elceo-context-module-macro" style={{ padding: '0.95rem' }}>
          <p className="elceo-kicker">MACRO PULSE</p>
          <p className="elceo-muted-text">Dollar breadth cooling and treasury drift easing continue to support current state coherence.</p>
        </Surface>

        <Surface className="elceo-dashboard-panel elceo-context-module-invalidation" style={{ padding: '0.95rem' }}>
          <p className="elceo-kicker">INVALIDATION LOGIC</p>
          <p className="elceo-muted-text">Bias degrades if zone break coincides with contradiction acceleration and macro support decay.</p>
        </Surface>
      </section>

      <section className="elceo-dashboard-zone-d" aria-label="Demo layered reasoning band">
        <Surface className="elceo-dashboard-panel elceo-dashboard-panel-primary elceo-panel-intelligence" style={{ padding: '1rem' }}>
          <p className="elceo-kicker">WHY THIS STATE EXISTS</p>
          <h3>Layered reasoning sequence</h3>
          {[
            ['Event structure', 'Fed tone softening plus cooling real-yield drift supports defensive gold bid.'],
            ['Zone behavior', 'Repeated defense of 2360.4-2366.8 zone keeps directional bias constructive.'],
            ['Contradiction read', 'Momentum fade near upper edge introduces contained tension but not full regime break.'],
            ['State condition', 'Continuation remains preferred while contradiction fails to transition into warning state.']
          ].map(([title, body]) => (
            <article key={title} className="elceo-module-note is-evidence">
              <header>
                <strong>{title}</strong>
                <span>linked</span>
              </header>
              <p>{body}</p>
            </article>
          ))}
        </Surface>

        <Surface className="elceo-dashboard-panel elceo-dashboard-panel-alert elceo-panel-alerts" style={{ padding: '1rem' }}>
          <p className="elceo-kicker">CONTRADICTION INTERPRETATION</p>
          <p className="elceo-muted-text">Contradiction is present but bounded. Current reading prefers continuation with explicit invalidation guardrails.</p>
          <p className="elceo-muted-text">Visible annotations: {filteredAnnotations.length} / {ANNOTATIONS.length}</p>
        </Surface>
      </section>

      <section className="elceo-dashboard-zone-e" aria-label="Demo support modules">
        <Surface className="elceo-dashboard-panel" style={{ padding: '0.95rem' }}>
          <p className="elceo-kicker">WATCHLIST STRIP</p>
          <p className="elceo-muted-text">XAU/USD · Nasdaq 100 · BTC/USD · EUR/USD</p>
          <p className="elceo-muted-text">Signal-aware grouping: 2 continuation · 1 divergence · 1 neutral</p>
        </Surface>
        <Surface className="elceo-dashboard-panel" style={{ padding: '0.95rem' }}>
          <p className="elceo-kicker">JOURNAL + NEXT ACTION</p>
          <p className="elceo-muted-text">Log reaction at zone retest and compare execution quality against contradiction state.</p>
        </Surface>
      </section>

      <footer className="elceo-demo-conversion-strip">
        <p className="elceo-kicker">PRIVATE DEPTH</p>
        <p>Demo shows cognition workspace language. Private platform unlocks deeper module depth, live alerts, and full governance surfaces.</p>
        <Link href="/login?callbackUrl=/dashboard" className="elceo-pill-button elceo-pill-button-hero">
          Enter ELCEO Platform
        </Link>
      </footer>
    </div>
  );
}
