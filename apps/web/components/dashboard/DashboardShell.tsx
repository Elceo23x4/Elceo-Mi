'use client';

import { useMemo, useState } from 'react';
import { Surface } from '@elceo/ui';
import type { DashboardChartWorkspaceViewModel, ChartAnnotationFilters, DashboardCognitionModule } from '@elceo/types';
import { CognitionChart } from './CognitionChart';
import { applyAnnotationFilters, buildEvidenceSideNotes } from '../../lib/chart-shaping';

type DashboardShellProps = {
  workspace: DashboardChartWorkspaceViewModel;
  dashboardModuleLimit: number;
  canAccessPremiumDepth: boolean;
};

const FILTER_LABELS: Array<{ key: keyof ChartAnnotationFilters; label: string }> = [
  { key: 'keyLevelZones', label: 'Key-level zones' },
  { key: 'macroEvents', label: 'Macro events' },
  { key: 'contradiction', label: 'Contradiction' },
  { key: 'evidenceNotes', label: 'Evidence notes' },
  { key: 'impulseOrigins', label: 'Impulse anchors' }
];

const HORIZON = 'Intraday · H4 Framing';

function classifyModule(module: DashboardCognitionModule): 'macro' | 'evidence' | 'invalidation' | 'confidence' | 'default' {
  const label = `${module.title} ${module.body}`.toLowerCase();
  if (label.includes('macro') || label.includes('event')) return 'macro';
  if (label.includes('invalid') || label.includes('risk') || label.includes('break')) return 'invalidation';
  if (label.includes('confidence') || label.includes('stability')) return 'confidence';
  if (label.includes('evidence') || label.includes('support')) return 'evidence';
  return 'default';
}

function getFreshnessLabel(lastCandle: string | undefined): string {
  if (!lastCandle) return 'Unavailable';
  const elapsed = Date.now() - new Date(lastCandle).getTime();
  const mins = Math.max(0, Math.round(elapsed / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs}h ago`;
}

export function DashboardShell({ workspace, dashboardModuleLimit, canAccessPremiumDepth }: DashboardShellProps) {
  const [filters, setFilters] = useState<ChartAnnotationFilters>(workspace.chart.default_filters);

  const filteredAnnotations = useMemo(
    () => applyAnnotationFilters(workspace.chart.annotations, filters, workspace.chart.annotation_density_target),
    [workspace.chart.annotation_density_target, workspace.chart.annotations, filters]
  );

  const evidenceNotes = useMemo(() => buildEvidenceSideNotes(filteredAnnotations).slice(0, 6), [filteredAnnotations]);

  const contradictionMarkers = useMemo(
    () => filteredAnnotations.filter((annotation) => annotation.kind === 'contradiction_marker').length,
    [filteredAnnotations]
  );

  const macroMarkers = useMemo(() => filteredAnnotations.filter((annotation) => annotation.kind === 'macro_event_marker').length, [filteredAnnotations]);

  const freshness = useMemo(() => getFreshnessLabel(workspace.chart.candles.at(-1)?.timestamp_utc), [workspace.chart.candles]);

  return (
    <div className="elceo-dashboard-v2 elceo-surface-dashboard">
      <Surface className="elceo-cognition-hero elceo-shell-hero elceo-dashboard-zone-a" style={{ padding: '1rem' }}>
        <div className="elceo-zone-a-main">
          <p className="elceo-kicker">COGNITION COMMAND STRIP</p>
          <h1 className="elceo-cognition-title">
            {workspace.dashboard.asset_code} · {workspace.dashboard.directional_bias.toUpperCase()} bias
          </h1>
          <p className="elceo-muted-text">{workspace.dashboard.modules[0]?.body ?? 'Deterministic state assembled from normalized evidence and contradiction-aware ranking.'}</p>
        </div>

        <div className="elceo-zone-a-chips">
          <span className="elceo-system-chip">{HORIZON}</span>
          <span className="elceo-system-chip is-bias">Bias {workspace.dashboard.directional_bias}</span>
          <span className="elceo-system-chip is-confidence">Confidence {workspace.dashboard.confidence_total.toFixed(1)}</span>
          <span className="elceo-system-chip is-contradiction">Contradiction {workspace.dashboard.contradiction.state}</span>
          <span className="elceo-system-chip">Freshness {freshness}</span>
        </div>

        <div className="elceo-zone-a-actions">
          <button type="button" className="elceo-pill-button elceo-pill-button-hero">
            Pin cognition
          </button>
          <button type="button" className="elceo-pill-button">
            Export notes
          </button>
        </div>
      </Surface>

      <section className="elceo-dashboard-zone-b" aria-label="Primary chart workspace">
        <Surface className="elceo-cognition-chart-surface elceo-panel-chart elceo-zone-b-chart" style={{ padding: '1rem' }}>
          <div className="elceo-cognition-headline-row">
            <div>
              <p className="elceo-kicker">PRIMARY CHART INTELLIGENCE</p>
              <h2>Zone-framed execution surface</h2>
            </div>
            <p className="elceo-muted-text">Density target: MODERATE · H4 zones</p>
          </div>

          <div className="elceo-chip-ribbon">
            {FILTER_LABELS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                aria-pressed={filters[filter.key]}
                aria-label={`Toggle ${filter.label}`}
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
              <span>{workspace.dashboard.contradiction.state} tension</span>
            </div>
            <CognitionChart candles={workspace.chart.candles} zones={workspace.chart.zones} annotations={filteredAnnotations} />
          </div>
        </Surface>

        <div className="elceo-zone-b-intel-strip">
          <Surface className="elceo-context-panel elceo-panel-evidence elceo-strip-module" style={{ padding: '0.85rem' }}>
            <p className="elceo-kicker">EVIDENCE NOTES</p>
            {evidenceNotes.length ? (
              evidenceNotes.map((note) => (
                <article key={note.id} className="elceo-evidence-note">
                  <strong>{note.title}</strong>
                  <p>{note.body}</p>
                </article>
              ))
            ) : (
              <p className="elceo-muted-text">No evidence notes under current filters.</p>
            )}
          </Surface>

          <Surface className="elceo-context-panel elceo-panel-contradiction elceo-strip-module" style={{ padding: '0.85rem' }}>
            <p className="elceo-kicker">ACTIVE TENSION</p>
            <h3>{workspace.dashboard.contradiction.state}</h3>
            <p className="elceo-muted-text">Score {workspace.dashboard.contradiction.score.toFixed(1)} · {contradictionMarkers} contradiction markers visible.</p>
          </Surface>

          <Surface className="elceo-context-panel elceo-panel-zones elceo-strip-module" style={{ padding: '0.85rem' }}>
            <p className="elceo-kicker">ZONE SNAPSHOT</p>
            {workspace.chart.zones.slice(0, 4).map((zone) => (
              <p key={zone.zone_id} className="elceo-muted-text">
                {zone.lower.toFixed(2)} - {zone.upper.toFixed(2)} · significance {zone.significance_score.toFixed(1)}
              </p>
            ))}
          </Surface>
        </div>
      </section>

      <section className="elceo-dashboard-zone-c" aria-label="Context rail">
        <Surface className="elceo-dashboard-panel elceo-panel-confidence elceo-context-module-confidence" style={{ padding: '0.95rem' }}>
          <p className="elceo-kicker">CONFIDENCE ANATOMY</p>
          {Object.entries(workspace.dashboard.confidence_anatomy).map(([key, value]) => (
            <p key={key} className="elceo-muted-text">
              {key}: {value.toFixed(1)}
            </p>
          ))}
        </Surface>

        <Surface className="elceo-dashboard-panel elceo-context-module-macro" style={{ padding: '0.95rem' }}>
          <p className="elceo-kicker">MACRO PULSE</p>
          <p className="elceo-muted-text">{macroMarkers} macro-aligned markers active. Alignment remains monitored versus zone reactions and post-event drift.</p>
        </Surface>

        <Surface className="elceo-dashboard-panel elceo-context-module-invalidation" style={{ padding: '0.95rem' }}>
          <p className="elceo-kicker">SUPPORT / INVALIDATION</p>
          <p className="elceo-muted-text">State invalidates if contradiction rises while support evidence decays across the active horizon.</p>
        </Surface>
      </section>

      <section className="elceo-dashboard-zone-d" aria-label="Explanation and evidence band">
        <Surface className="elceo-dashboard-panel elceo-dashboard-panel-primary elceo-panel-intelligence" style={{ padding: '1rem' }}>
          <p className="elceo-kicker">WHY THIS STATE EXISTS</p>
          <h3>Layered reasoning stack</h3>
          {workspace.dashboard.modules.slice(0, dashboardModuleLimit).map((module) => (
            <article key={module.module_id} className={`elceo-module-note is-${classifyModule(module)}`}>
              <header>
                <strong>{module.title}</strong>
                <span>rank {module.rank_score.toFixed(1)}</span>
              </header>
              <p>{module.body}</p>
            </article>
          ))}
          {!canAccessPremiumDepth ? <p className="elceo-muted-text">Premium unlock extends module depth, contradiction context, and higher annotation visibility.</p> : null}
        </Surface>

        <Surface className="elceo-dashboard-panel elceo-dashboard-panel-alert elceo-panel-alerts" style={{ padding: '1rem' }}>
          <p className="elceo-kicker">CONTRADICTION EXPLANATION STRIP</p>
          <p className="elceo-muted-text">{filteredAnnotations.length} / {workspace.chart.annotations.length} annotations visible under current controls.</p>
          <p className="elceo-muted-text">Use filter chips to isolate contradiction pressure, impulse anchors, and macro alignment.</p>
        </Surface>
      </section>

      <section className="elceo-dashboard-zone-e" aria-label="Support and monitoring modules">
        <Surface className="elceo-dashboard-panel" style={{ padding: '0.95rem' }}>
          <p className="elceo-kicker">RELATED MONITORING</p>
          <p className="elceo-muted-text">Watchlist relevance and alert conditions remain synchronized with this cognition state.</p>
        </Surface>
        <Surface className="elceo-dashboard-panel" style={{ padding: '0.95rem' }}>
          <p className="elceo-kicker">NEXT ACTION</p>
          <p className="elceo-muted-text">Journal the next execution hypothesis if contradiction rises into warning territory.</p>
        </Surface>
      </section>
    </div>
  );
}
