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
    <div className="elceo-editorial-stack">
      <Reveal>
        <EditorialHeroFrame>
          <p className="elceo-kicker">ELCEO · MARKET COGNITION PLATFORM</p>
          <h1 style={{ fontSize: typographyTokens.displayXL, margin: 0, fontFamily: 'var(--elceo-font-display)' }}>
            Apple-level polish, futuristic trading-lab clarity.
          </h1>
          <Text tone="muted" style={{ maxWidth: '70ch', fontSize: typographyTokens.bodyL }}>
            ELCEO is a market intelligence and decision-support platform — never financial advice, never signal spam.
          </Text>
        </EditorialHeroFrame>
      </Reveal>

      {sectionBlocks.map((section, index) => (
        <Reveal key={section.id} delayMs={index * 70}>
          <Surface id={section.id} style={{ padding: '1.4rem', display: 'grid', gap: '0.6rem' }}>
            <p className="elceo-kicker">{section.title.toUpperCase()}</p>
            <h2 style={{ margin: 0, fontFamily: 'var(--elceo-font-heading)' }}>{section.title}</h2>
            <Text tone="muted">{section.copy}</Text>
          </Surface>
        </Reveal>
      ))}
    </div>
  );
}
