import { Reveal } from '@elceo/motion';
import { EditorialHeroFrame, Surface, Text, typographyTokens } from '@elceo/ui';

const sectionBlocks = [
  {
    id: 'how-it-works',
    title: 'How it works',
    copy: 'Event-native ingestion, deterministic scoring, then layered interpretation.',
    tone: 'system'
  },
  {
    id: 'market-cognition',
    title: 'Market cognition',
    copy: 'Confidence-weighted directional states with explicit contradiction handling.',
    tone: 'feature'
  },
  {
    id: 'chart-intelligence',
    title: 'Chart intelligence',
    copy: 'Zone-based key levels, contextual annotations, and structured visual evidence.',
    tone: 'editorial'
  },
  {
    id: 'portfolio-intelligence',
    title: 'Portfolio intelligence',
    copy: 'Asset-state framing designed to support selective focus, not noise-chasing.',
    tone: 'feature'
  },
  {
    id: 'trader-development',
    title: 'Trader development',
    copy: 'Journal and behavioral analytics surfaces reserved for measured improvement loops.',
    tone: 'system'
  },
  {
    id: 'pricing',
    title: 'Pricing',
    copy: 'Free and premium pathways with entitlement depth, not gimmick gating.',
    tone: 'editorial'
  },
  {
    id: 'editorial-research',
    title: 'Editorial research',
    copy: 'Cinematic research layer for macro briefs, policy shifts, and weekend intelligence.',
    tone: 'feature'
  }
] as const;

export function LandingSections() {
  return (
    <div className="elceo-editorial-stack elceo-landing-rhythm">
      <Reveal>
        <EditorialHeroFrame>
          <section className="elceo-hero-shell" aria-label="ELCEO hero section">
            <div className="elceo-hero-lead">
              <p className="elceo-kicker">ELCEO · MARKET COGNITION PLATFORM</p>
              <h1 className="elceo-hero-title" style={{ fontSize: typographyTokens.displayXL, margin: 0, fontFamily: 'var(--elceo-font-display)' }}>
                Intelligence with gravity.
                <br />
                Execution with intent.
              </h1>
              <Text tone="muted" style={{ maxWidth: '64ch', fontSize: typographyTokens.bodyL }}>
                ELCEO turns event turbulence into decisive market cognition through deterministic scoring, contradiction visibility, and an explainable narrative layer.
              </Text>
              <div className="elceo-hero-stat-row" aria-label="Platform highlights">
                <span>12 Launch Assets</span>
                <span>Deterministic Scoring</span>
                <span>Confidence + Contradiction</span>
              </div>
            </div>

            <aside className="elceo-hero-rail" aria-label="Cognition pulse">
              <p className="elceo-kicker">Cognition pulse</p>
              <h2>Live macro context, price pressure, and contradiction at a glance.</h2>
              <ul>
                <li>
                  <strong>Event-native spine</strong>
                  <span>Macro, market, news, and geopolitics reconciled into one explainable frame.</span>
                </li>
                <li>
                  <strong>Zone-first charting</strong>
                  <span>Key levels modeled as zones with significance weighting, not shallow line spam.</span>
                </li>
                <li>
                  <strong>Trader development loop</strong>
                  <span>Journal and analytics surfaces designed for behavioral improvement cycles.</span>
                </li>
              </ul>
            </aside>
          </section>
        </EditorialHeroFrame>
      </Reveal>

      <section className="elceo-landing-grid" aria-label="ELCEO capabilities">
        {sectionBlocks.map((section, index) => (
          <div key={section.id} className={`elceo-landing-cell elceo-landing-cell-${section.tone}`}>
            <Reveal delayMs={index * 80}>
              <Surface id={section.id} className={`elceo-landing-panel elceo-landing-panel-${section.tone}`} style={{ padding: '1.4rem', display: 'grid', gap: '0.8rem' }}>
                <p className="elceo-kicker">{section.title.toUpperCase()}</p>
                <h2 className="elceo-landing-heading" style={{ margin: 0, fontFamily: 'var(--elceo-font-heading)' }}>
                  {section.title}
                </h2>
                <Text tone="muted">{section.copy}</Text>
              </Surface>
            </Reveal>
          </div>
        ))}
      </section>
    </div>
  );
}
