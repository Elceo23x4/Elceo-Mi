import Link from 'next/link';

const heroClaims = ['Deterministic cognition', 'Contradiction preserved', 'Evidence-linked notes', 'Confidence anatomy'];

const heroCarousel = [
  { title: 'XAU/USD · Intraday stack', note: 'Bullish continuation · Contradiction 34 · Event support 6' },
  { title: 'Nasdaq 100 · Swing pulse', note: 'Reversal watch · Liquidity stress near weekly zone' },
  { title: 'S&P 500 · Structural lens', note: 'Continuation bias with macro-drift divergence marker' },
  { title: 'BTC/USD · Fragility map', note: 'Contradiction rising vs momentum expansion narrative' },
  { title: 'EUR/USD · Event relay', note: 'Policy spread and dollar breadth weights in conflict' }
] as const;

const mechanismCards = [
  { id: '01', title: 'Ingestion', copy: 'Market, macro, geopolitics, and news streams normalize into a single canonical evidence graph.' },
  { id: '02', title: 'Scoring', copy: 'Deterministic math computes directional pressure, confidence anatomy, and key-level significance.' },
  { id: '03', title: 'Contradiction', copy: 'Divergent signals are preserved and tension-weighted instead of collapsed into fake consensus.' },
  { id: '04', title: 'Explanation', copy: 'State output is layered from concise bias read to source-linked why-this-state drilldown.' }
] as const;

const workflowSteps = [
  'Curate launch-asset watchlist and horizon lens.',
  'Read contradiction-first state before directional commitment.',
  'Validate zones and event notes directly on chart intelligence.',
  'Journal execution and track behavior improvements over time.'
] as const;

export function LandingSections() {
  return (
    <div className="elceo-public-story" id="how-it-works">
      <section className="elceo-hero-shell" aria-label="ELCEO hero section">
        <div className="elceo-hero-main">
          <p className="elceo-kicker">ELCEO · MARKET COGNITION OPERATING SYSTEM</p>
          <h1 className="elceo-hero-title">
            Read market
            <br />
            contradiction
            <br />
            before repricing.
          </h1>
          <p className="elceo-hero-support">
            A cinematic intelligence layer for serious traders. ELCEO merges deterministic scoring with evidence-linked explanation across chart, event, and macro structure.
          </p>
          <div className="elceo-hero-cta-row">
            <Link className="elceo-pill-button elceo-pill-button-hero" href="/demo">
              Enter Demo
            </Link>
            <Link className="elceo-pill-button elceo-pill-button-secondary" href="/login?callbackUrl=/onboarding">
              Open Platform
            </Link>
          </div>
          <div className="elceo-hero-stat-row" aria-label="Platform highlights">
            {heroClaims.map((pill) => (
              <span key={pill}>{pill}</span>
            ))}
          </div>
        </div>

        <div className="elceo-hero-side">
          <article className="elceo-side-surface elceo-side-surface-calm">
            <p className="elceo-kicker">Confidence state</p>
            <strong>78 / 100</strong>
            <span>Source 82 · Price 71 · Event 69 · Contradiction penalty -9</span>
          </article>
          <article className="elceo-side-surface elceo-side-surface-tense">
            <p className="elceo-kicker">Contradiction cue</p>
            <strong>Moderate tension at 34</strong>
            <span>Macro support diverges from short-horizon order-flow acceleration.</span>
          </article>
        </div>

        <div className="elceo-hero-carousel-wrap" aria-label="Horizontal product carousel">
          <div className="elceo-hero-carousel-track">
            {[...heroCarousel, ...heroCarousel].map((slide, index) => (
              <article className="elceo-carousel-card" key={`${slide.title}-${index}`}>
                <p>{slide.title}</p>
                <strong>{slide.note}</strong>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="mechanism" className="elceo-section elceo-section-mechanism" aria-label="How ELCEO works">
        <div className="elceo-section-head">
          <p className="elceo-kicker">Mechanism</p>
          <h2>System design: ingestion, scoring, contradiction, explanation.</h2>
        </div>
        <div className="elceo-mechanism-grid">
          <article className="elceo-mechanism-lead">
            <p>
              ELCEO is event-native. It does not flood signal cards; it composes interpretable state with deterministic rules and visible evidence lineage.
            </p>
          </article>
          {mechanismCards.map((card) => (
            <article key={card.id} className="elceo-step-card">
              <p className="elceo-step-id">{card.id}</p>
              <h3>{card.title}</h3>
              <p>{card.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="chart-intelligence" className="elceo-section elceo-section-chart" aria-label="Chart intelligence showcase">
        <div className="elceo-chart-frame">
          <div className="elceo-chart-canvas" aria-hidden="true">
            <span className="elceo-zone-zone-a">Demand zone · 2358.4 - 2362.8</span>
            <span className="elceo-zone-zone-b">Supply zone · 2378.2 - 2383.1</span>
            <span className="elceo-zone-note">Contradiction marker: momentum up while event support softens.</span>
          </div>
          <aside>
            <p className="elceo-kicker">Chart intelligence</p>
            <ul>
              <li>Key-level zones with significance weighting.</li>
              <li>Evidence callouts tied to event + price nodes.</li>
              <li>State chips for bias, contradiction, and invalidation.</li>
            </ul>
            <div className="elceo-chart-chip-row">
              <span>Bias · Bullish</span>
              <span>Contradiction · 34</span>
              <span>Invalidation · Lose 2358.4</span>
            </div>
          </aside>
        </div>
      </section>

      <section id="market-cognition" className="elceo-section elceo-section-split" aria-label="Market cognition anatomy">
        <div className="elceo-section-copy">
          <p className="elceo-kicker">Market cognition</p>
          <h2>Confidence anatomy with visible bias, event support, and invalidation.</h2>
        </div>
        <div className="elceo-cognition-panel">
          <div>
            <span>Bias</span>
            <strong>Intraday continuation</strong>
          </div>
          <div>
            <span>Contradiction</span>
            <strong>34 · controlled tension</strong>
          </div>
          <div>
            <span>Event support</span>
            <strong>6 linked catalysts</strong>
          </div>
          <div>
            <span>Invalidation logic</span>
            <strong>Break zone 2358.4 and event spread loses support.</strong>
          </div>
        </div>
      </section>

      <section id="workflow" className="elceo-section elceo-section-workflow" aria-label="ELCEO workflow">
        <div className="elceo-section-head">
          <p className="elceo-kicker">Workflow strip</p>
          <h2>How serious operators run ELCEO daily.</h2>
        </div>
        <div className="elceo-workflow-band">
          {workflowSteps.map((step, index) => (
            <article key={step} className="elceo-workflow-step">
              <span>{`0${index + 1}`}</span>
              <p>{step}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="elceo-section elceo-final-cta" aria-label="Conversion section">
        <p className="elceo-kicker">Preview depth</p>
        <h2>See the ELCEO world. Enter when ready.</h2>
        <p>Review chart intelligence, contradiction context, and confidence anatomy before opening the full platform workflow.</p>
        <div className="elceo-hero-cta-row">
          <Link className="elceo-pill-button elceo-pill-button-hero" href="/demo">
            Enter Demo
          </Link>
          <Link className="elceo-pill-button elceo-pill-button-secondary" href="/login?callbackUrl=/onboarding">
            Open Platform
          </Link>
        </div>
      </section>

      <footer className="elceo-signature-footer" aria-label="ELCEO signature footer">
        <span>ELCEO</span>
      </footer>
    </div>
  );
}
