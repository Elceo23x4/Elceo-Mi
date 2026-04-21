import type { ReactNode } from 'react';
import { Surface, Text } from '@elceo/ui';

type SystemChipTone = 'neutral' | 'signal' | 'risk' | 'accent';

export function SystemChip({ label, tone = 'neutral' }: { label: string; tone?: SystemChipTone }) {
  return <span className={`elceo-system-chip elceo-system-chip-${tone}`}>{label}</span>;
}

export function PrivateCommandBand({
  kicker,
  title,
  meta,
  chips,
  actions,
  children,
  className
}: {
  kicker: string;
  title: string;
  meta: string;
  chips?: Array<{ label: string; tone?: SystemChipTone }>;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Surface className={`elceo-private-command-band ${className ?? ''}`} style={{ padding: '1.1rem' }}>
      <div className="elceo-private-command-head">
        <div>
          <p className="elceo-kicker">{kicker}</p>
          <h1 className="elceo-private-command-title">{title}</h1>
          <Text tone="muted">{meta}</Text>
        </div>
        {actions ? <div className="elceo-private-command-actions">{actions}</div> : null}
      </div>
      {chips?.length ? (
        <div className="elceo-private-chip-row">
          {chips.map((chip) => (
            <SystemChip key={chip.label} label={chip.label} tone={chip.tone} />
          ))}
        </div>
      ) : null}
      {children ? <div className="elceo-private-command-body">{children}</div> : null}
    </Surface>
  );
}

export function SurfaceHeader({ kicker, title, body }: { kicker: string; title: string; body?: string }) {
  return (
    <header className="elceo-private-surface-header">
      <p className="elceo-kicker">{kicker}</p>
      <h3>{title}</h3>
      {body ? <p className="elceo-muted-text">{body}</p> : null}
    </header>
  );
}

export function NextActionBlock({ title, whyNow, elevation, invalidation }: { title: string; whyNow: string; elevation: string; invalidation: string }) {
  return (
    <article className="elceo-next-action-block">
      <p className="elceo-kicker">NEXT ACTION</p>
      <h3>{title}</h3>
      <p className="elceo-muted-text">{whyNow}</p>
      <div className="elceo-next-action-grid">
        <div>
          <strong>Elevate setup</strong>
          <p className="elceo-muted-text">{elevation}</p>
        </div>
        <div>
          <strong>Invalidation cue</strong>
          <p className="elceo-muted-text">{invalidation}</p>
        </div>
      </div>
    </article>
  );
}
