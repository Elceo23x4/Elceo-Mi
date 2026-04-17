import { Reveal } from '@elceo/motion';
import { EditorialHeroFrame, Surface, Text, typographyTokens } from '@elceo/ui';

const sectionBlocks = [
  { id: 'how-it-works', title: 'How it works', copy: 'Event-native ingestion, deterministic scoring, then layered interpretation.' },
  { id: 'market-cognition', title: 'Market cognition', copy: 'Confidence-weighted directional states with explicit contradiction handling.' },
  { id: 'chart-intelligence', title: 'Chart intelligence', copy: 'Zone-based key levels, contextual annotations, and structured visual evidence.' },
  { id: 'portfolio-intelligence', title: 'Portfolio intelligence', copy: 'Asset-state framing designed to support selective focus, not noise-chasing.' },
  { id: 'trader-development', title: 'Trader development', copy: 'Journal and behavioral analytics surfaces reserved for measured improvement loops.' },
  { id: 'pricing', title: 'Pricing', copy: 'Free and premium pathways with entitlement depth, not gimmick gating.' },
  { id: 'editorial-research', title: 'Editorial research', copy: 'Cinematic research layer for macro briefs, policy shifts, and weekend intelligence.' }
];

export function LandingSections() {
  return (
    <div className="elceo-editorial-stack elceo-landing-rhythm">
      <Reveal>
        <EditorialHeroFrame>
          <div className="elceo-hero-shell">
            <p className="elceo-kicker">ELCEO · MARKET COGNITION PLATFORM</p>
            <h1 className="elceo-hero-title" style={{ fontSize: typographyTokens.displayXL, margin: 0, fontFamily: 'var(--elceo-font-display)' }}>
              Precision intelligence,
              <br />
              cinematic execution.
            </h1>
            <Text tone="muted" style={{ maxWidth: '67ch', fontSize: typographyTokens.bodyL }}>
              ELCEO transforms signal noise into layered cognition with deterministic scoring, contradiction visibility, and narrative clarity built for serious traders.
            </Text>
            <div className="elceo-hero-stat-row" aria-label="Platform highlights">
              <span>12 Launch Assets</span>
              <span>Deterministic Scoring</span>
              <span>Event-Native</span>
            </div>
          </div>
        </EditorialHeroFrame>
      </Reveal>

      <div className="elceo-landing-grid">
        {sectionBlocks.map((section, index) => (
          <div key={section.id}>
            <Reveal delayMs={index * 70}>
              <Surface id={section.id} className={index % 3 === 0 ? 'elceo-landing-panel elceo-landing-panel-wide' : 'elceo-landing-panel'} style={{ padding: '1.35rem', display: 'grid', gap: '0.7rem' }}>
              <p className="elceo-kicker">{section.title.toUpperCase()}</p>
              <h2 className="elceo-landing-heading" style={{ margin: 0, fontFamily: 'var(--elceo-font-heading)' }}>
                {section.title}
              </h2>
              <Text tone="muted">{section.copy}</Text>
              </Surface>
            </Reveal>
          </div>
        ))}
      </div>
    </div>
  );
}
