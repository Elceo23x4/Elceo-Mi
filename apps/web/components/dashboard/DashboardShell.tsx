'use client';

import { useMemo, useState } from 'react';
import { Reveal } from '@elceo/motion';
import { Surface, Text } from '@elceo/ui';
import type { DashboardChartWorkspaceViewModel, ChartAnnotationFilters } from '@elceo/types';
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
  { key: 'impulseOrigins', label: 'Impulse placeholders' }
];

export function DashboardShell({ workspace, dashboardModuleLimit, canAccessPremiumDepth }: DashboardShellProps) {
  const [filters, setFilters] = useState<ChartAnnotationFilters>(workspace.chart.default_filters);

  const filteredAnnotations = useMemo(
    () => applyAnnotationFilters(workspace.chart.annotations, filters, workspace.chart.annotation_density_target),
    [workspace.chart.annotation_density_target, workspace.chart.annotations, filters]
  );

  const evidenceNotes = useMemo(() => buildEvidenceSideNotes(filteredAnnotations).slice(0, 5), [filteredAnnotations]);

  return (
    <div className="elceo-cognition-layout elceo-surface-dashboard">
      <Reveal>
        <Surface className="elceo-cognition-hero" style={{ padding: '1.3rem' }}>
          <p className="elceo-kicker">DASHBOARD COGNITION WORKSPACE</p>
          <h1 className="elceo-cognition-title" style={{ margin: '0.35rem 0 0.65rem' }}>
            {workspace.dashboard.asset_code} · {workspace.dashboard.directional_bias.toUpperCase()} bias
          </h1>
          <Text tone="muted">Confidence {workspace.dashboard.confidence_total.toFixed(1)} · Contradiction {workspace.dashboard.contradiction.state}</Text>
        </Surface>
      </Reveal>

      <Surface className="elceo-cognition-chart-surface elceo-panel-chart" style={{ padding: '1rem', display: 'grid', gap: '0.95rem' }}>
        <div className="elceo-cognition-headline-row">
          <div>
            <p className="elceo-kicker">CHART INTELLIGENCE</p>
            <h2 style={{ margin: 0 }}>H4 zones, markers, and evidence-linked side notes</h2>
          </div>
          <p className="elceo-muted-text">Annotation density: MODERATE</p>
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

        <div className="elceo-cognition-chart-grid">
          <CognitionChart candles={workspace.chart.candles} zones={workspace.chart.zones} annotations={filteredAnnotations} />
          <div style={{ display: 'grid', gap: '0.8rem' }}>
            <Surface className="elceo-context-panel elceo-panel-evidence" style={{ padding: '0.85rem', minHeight: '190px' }}>
              <p className="elceo-kicker">EVIDENCE SIDE NOTES</p>
              {evidenceNotes.length ? (
                evidenceNotes.map((note) => (
                  <p key={note.id} className="elceo-muted-text" style={{ marginBottom: '0.55rem' }}>
                    <strong>{note.title}</strong> — {note.body}
                  </p>
                ))
              ) : (
                <p className="elceo-muted-text">No evidence notes under current filters.</p>
              )}
            </Surface>

            <Surface className="elceo-context-panel elceo-panel-zones" style={{ padding: '0.85rem', minHeight: '130px' }}>
              <p className="elceo-kicker">ZONE SNAPSHOT</p>
              {workspace.chart.zones.slice(0, 4).map((zone) => (
                <p key={zone.zone_id} className="elceo-muted-text">
                  {zone.lower.toFixed(2)} - {zone.upper.toFixed(2)} · sig {zone.significance_score.toFixed(1)}
                </p>
              ))}
            </Surface>
          </div>
        </div>
      </Surface>

      <div className="elceo-dashboard-grid elceo-dashboard-grid-upgraded">
        <Surface className="elceo-dashboard-panel elceo-dashboard-panel-primary elceo-panel-intelligence" style={{ padding: '1rem', minHeight: '240px' }}>
          <p className="elceo-kicker">COGNITION MODULE ORDER</p>
          <h3>Ranking-aware module stack</h3>
          {workspace.dashboard.modules.slice(0, dashboardModuleLimit).map((module) => (
            <p key={module.module_id} className="elceo-muted-text">
              {module.title} ({module.rank_score.toFixed(1)})
            </p>
          ))}
          {!canAccessPremiumDepth ? <p className="elceo-muted-text">Premium unlock extends module depth and contradiction context layers.</p> : null}
        </Surface>

        <Surface className="elceo-dashboard-panel elceo-panel-confidence" style={{ padding: '1rem', minHeight: '220px' }}>
          <p className="elceo-kicker">CONFIDENCE ANATOMY</p>
          {Object.entries(workspace.dashboard.confidence_anatomy).map(([key, value]) => (
            <p key={key} className="elceo-muted-text">
              {key}: {value.toFixed(1)}
            </p>
          ))}
        </Surface>

        <Surface className="elceo-dashboard-panel elceo-dashboard-panel-alert elceo-panel-contradiction" style={{ padding: '1rem', minHeight: '220px' }}>
          <p className="elceo-kicker">CONTRADICTION / TENSION</p>
          <h3>{workspace.dashboard.contradiction.state}</h3>
          <p className="elceo-muted-text">Score: {workspace.dashboard.contradiction.score.toFixed(1)}</p>
        </Surface>

        <Surface className="elceo-dashboard-panel elceo-panel-alerts" style={{ padding: '1rem', minHeight: '220px' }}>
          <p className="elceo-kicker">ANNOTATION FILTER SNAPSHOT</p>
          <p className="elceo-muted-text">
            {filteredAnnotations.length} / {workspace.chart.annotations.length} annotations visible after filters.
          </p>
        </Surface>
      </div>
    </div>
  );
}
