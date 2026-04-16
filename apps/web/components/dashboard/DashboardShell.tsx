'use client';

import { Reveal } from '@elceo/motion';
import { Surface, Text } from '@elceo/ui';
import type { DashboardCognitionViewModel } from '@elceo/types';

type DashboardShellProps = {
  viewModel: DashboardCognitionViewModel;
};

export function DashboardShell({ viewModel }: DashboardShellProps) {
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <Reveal>
        <Surface style={{ padding: '1.2rem' }}>
          <p className="elceo-kicker">DASHBOARD COGNITION WORKSPACE</p>
          <h1 style={{ margin: '0.4rem 0 0.6rem' }}>{viewModel.asset_code} · {viewModel.directional_bias.toUpperCase()} bias</h1>
          <Text tone="muted">Confidence {viewModel.confidence_total.toFixed(1)} · Contradiction {viewModel.contradiction.state}</Text>
        </Surface>
      </Reveal>

      <div className="elceo-dashboard-grid">
        <Surface style={{ padding: '1rem', minHeight: '240px' }}>
          <p className="elceo-kicker">CHART INTELLIGENCE · ZONES</p>
          <h3>H4 key-level zones</h3>
          {viewModel.zones.slice(0, 4).map((zone) => (
            <p key={zone.zone_id} className="elceo-muted-text">
              Zone {zone.lower.toFixed(2)} - {zone.upper.toFixed(2)} · significance {zone.significance_score.toFixed(1)}
            </p>
          ))}
        </Surface>

        <Surface style={{ padding: '1rem', minHeight: '240px' }}>
          <p className="elceo-kicker">COGNITION MODULE ORDER</p>
          <h3>Ranking-aware module stack</h3>
          {viewModel.modules.map((module) => (
            <p key={module.module_id} className="elceo-muted-text">
              {module.title} ({module.rank_score.toFixed(1)})
            </p>
          ))}
        </Surface>

        <Surface style={{ padding: '1rem', minHeight: '220px' }}>
          <p className="elceo-kicker">CONFIDENCE ANATOMY</p>
          {Object.entries(viewModel.confidence_anatomy).map(([key, value]) => (
            <p key={key} className="elceo-muted-text">
              {key}: {value.toFixed(1)}
            </p>
          ))}
        </Surface>

        <Surface style={{ padding: '1rem', minHeight: '220px' }}>
          <p className="elceo-kicker">CONTRADICTION / TENSION</p>
          <h3>{viewModel.contradiction.state}</h3>
          <p className="elceo-muted-text">Score: {viewModel.contradiction.score.toFixed(1)}</p>
        </Surface>

        <Surface style={{ padding: '1rem', minHeight: '220px' }}>
          <p className="elceo-kicker">EVIDENCE-LINKED NOTES</p>
          {viewModel.evidence_notes.slice(0, 4).map((note) =>
            note.kind === 'evidence_note' ? (
              <p key={note.annotation_id} className="elceo-muted-text">
                {note.title}: {note.body}
              </p>
            ) : null
          )}
        </Surface>

        <Surface style={{ padding: '1rem', minHeight: '220px' }}>
          <p className="elceo-kicker">ANNOTATION FILTER SNAPSHOT</p>
          <p className="elceo-muted-text">{viewModel.annotations.length} annotations prepared with source/evidence linkage.</p>
        </Surface>
      </div>
    </div>
  );
}
