import Link from 'next/link';

const proofPills = ['12 Launch Assets', 'Deterministic Scoring', 'Contradiction + Confidence', 'Chart Intelligence'];

const previewModules = [
  { label: 'Confidence State', value: '78 / 100', note: 'Source 82 · Price 71 · Contradiction penalty -9' },
  { label: 'Contradiction Tension', value: '34 / 100', note: 'Mild divergence near H4 resistance cluster' },
  { label: 'Event Spine', value: '6 linked events', note: 'CPI revision, Fed remarks, treasury auction pulse' },
  { label: 'Evidence Notes', value: '11 active notes', note: 'Macro + chart markers mapped to directional bias' }
] as const;

const howSteps = [
  { id: '01', title: 'Ingestion', copy: 'Market, macro, news, and geopolitical sources normalize into one canonical evidence stream.' },
  { id: '02', title: 'Scoring', copy: 'Deterministic weighting computes pressure, confidence anatomy, freshness decay, and zone significance.' },
  { id: '03', title: 'Contradiction', copy: 'Tension is preserved when narrative and price diverge instead of forcing false consensus.' },
  { id: '04', title: 'Explanation', copy: 'Layered output renders concise state first with expandable why-this-state reasoning.' }
] as const;

const watchlistRows = [
  { asset: 'XAU/USD', state: 'Bullish', delta: '+0.82%', tone: 'positive' },
  { asset: 'Nasdaq 100', state: 'Reversal watch', delta: '-0.34%', tone: 'negative' },
  { asset: 'S&P 500', state: 'Continuation', delta: '+0.28%', tone: 'positive' },
  { asset: 'BTC/USD', state: 'Divergence', delta: '-1.22%', tone: 'negative' },
  { asset: 'EUR/USD', state: 'Neutral', delta: '+0.09%', tone: 'neutral' }
] as const;

const researchTiles = [
  { title: 'Weekend Intelligence // Liquidity Regime Drift', meta: 'Apr 17, 2026 · Weekend Intelligence', summary: 'Treasury volatility compression is masking contradiction build in index breadth.' },
  { title: 'Policy Shift Monitor', meta: 'Apr 15, 2026 · Macro Brief', summary: 'Rate-path probability cluster pivots toward delayed easing.' },
  { title: 'Contradiction Field Notes', meta: 'Apr 12, 2026 · ELCEO Research', summary: 'Three assets remain detached from event-weighted directional pressure.' }
] as const;

export function LandingSections() {
  return (
    <div className="elceo-public-story" id="how-it-works">
      <section className="elceo-hero-shell" aria-label="ELCEO hero section">
        <div className="elceo-hero-lead">
          <p className="elceo-kicker">ELCEO · MARKET COGNITION OPERATING SYSTEM</p>
          <h1 className="elceo-hero-title">
            Decode contradiction
            <br />
            before the market
            <br />
            reprices.
          </h1>
          <p className="elceo-hero-support">
            ELCEO fuses chart structure, macro flow, and evidence-linked events into deterministic scoring with layered explanation.
          </p>
          <div className="elceo-hero-stat-row" aria-label="Platform highlights">
            {proofPills.map((pill) => (
              <span key={pill}>{pill}</span>
            ))}
          </div>
          <div className="elceo-hero-cta-row">
            <Link className="elceo-pill-button elceo-pill-button-hero" href="/demo">
              Preview ELCEO
            </Link>
            <a className="elceo-pill-button elceo-pill-button-secondary" href="#mechanism">
              See How It Works
            </a>
          </div>
        </div>

        <aside className="elceo-hero-preview" aria-label="Cognition workspace preview">
          <header>
            <p className="elceo-kicker">Live workspace preview</p>
            <strong>XAU/USD · Intraday cognition</strong>
          </header>
          <div className="elceo-preview-chart" aria-hidden="true" />
          <div className="elceo-preview-grid">
            <article>
              <p>Bias</p>
              <strong>Bullish continuation</strong>
            </article>
            <article>
              <p>Contradiction</p>
              <strong>34 · mild tension</strong>
            </article>
            <article>
              <p>Confidence anatomy</p>
              <strong>82 / 74 / 69 / -9</strong>
            </article>
            <article>
              <p>Event spine</p>
              <strong>06 linked catalysts</strong>
            </article>
          </div>
        </aside>
      </section>

      <section className="elceo-preview-strip" aria-label="Cognition proof strip">
        {previewModules.map((item, index) => (
          <article key={item.label} className={`elceo-preview-module elceo-preview-module-${index + 1}`}>
            <p>{item.label}</p>
            <strong>{item.value}</strong>
            <span>{item.note}</span>
          </article>
        ))}
      </section>

      <section id="mechanism" className="elceo-section elceo-section-mechanism" aria-label="How ELCEO works">
        <div className="elceo-section-head">
          <p className="elceo-kicker">Mechanism</p>
          <h2>How ELCEO turns noise into operating context.</h2>
        </div>
        <div className="elceo-mechanism-grid">
          {howSteps.map((step) => (
            <article key={step.id} className="elceo-step-card">
              <p className="elceo-step-id">{step.id}</p>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="market-cognition" className="elceo-section elceo-section-split" aria-label="Market cognition">
        <div className="elceo-section-copy">
          <p className="elceo-kicker">Market cognition</p>
          <h2>Confidence-weighted state with visible invalidation logic.</h2>
          <p>
            Every directional read is decomposed. You see what supports bias, where contradiction is rising, and what conditions invalidate the current stance.
          </p>
        </div>
        <div className="elceo-cognition-panel">
          <div>
            <span>Current bias</span>
            <strong>Bullish · Intraday</strong>
          </div>
          <div>
            <span>Contradiction</span>
            <strong>Moderate · 34</strong>
          </div>
          <div>
            <span>Support events</span>
            <strong>6 events</strong>
          </div>
          <div>
            <span>Invalidation</span>
            <strong>Lose 2358.4 zone + CPI surprise fade</strong>
          </div>
        </div>
      </section>

      <section id="chart-intelligence" className="elceo-section elceo-section-chart" aria-label="Chart intelligence">
        <div className="elceo-chart-frame">
          <div className="elceo-chart-canvas" aria-hidden="true" />
          <aside>
            <p className="elceo-kicker">Chart intelligence</p>
            <ul>
              <li>H4 zone clusters with significance scoring</li>
              <li>Contradiction marker pinned to impulse origin</li>
              <li>Evidence-linked annotation rail with filters</li>
            </ul>
          </aside>
        </div>
      </section>

      <section id="portfolio-intelligence" className="elceo-section elceo-section-portfolio" aria-label="Portfolio intelligence">
        <div className="elceo-section-head">
          <p className="elceo-kicker">Portfolio intelligence</p>
          <h2>Watch launch assets with signal-aware grouping.</h2>
        </div>
        <div className="elceo-watchlist-grid">
          {watchlistRows.map((row) => (
            <article key={row.asset} className={`elceo-watchlist-row elceo-watchlist-row-${row.tone}`}>
              <strong>{row.asset}</strong>
              <span>{row.state}</span>
              <em>{row.delta}</em>
            </article>
          ))}
        </div>
      </section>

      <section id="trader-development" className="elceo-section elceo-section-development" aria-label="Trader development">
        <div>
          <p className="elceo-kicker">Trader development</p>
          <h2>Journal evidence plus measurable behavior diagnostics.</h2>
        </div>
        <div className="elceo-dev-grid">
          <article>
            <p>Best asset</p>
            <strong>XAU/USD · +4.8R</strong>
          </article>
          <article>
            <p>Worst asset</p>
            <strong>BTC/USD · -2.1R</strong>
          </article>
          <article>
            <p>Expectancy</p>
            <strong>+0.42R / trade</strong>
          </article>
          <article>
            <p>Effective session</p>
            <strong>London open + NY overlap</strong>
          </article>
        </div>
      </section>

      <section id="pricing" className="elceo-section elceo-section-pricing" aria-label="Pricing conversion">
        <div className="elceo-section-head">
          <p className="elceo-kicker">Pricing</p>
          <h2>Choose cognition depth, not signal volume.</h2>
        </div>
        <div className="elceo-pricing-surface">
          <article>
            <p className="elceo-kicker">Free</p>
            <h3>Essential cognition access</h3>
            <ul>
              <li>4 tracked assets</li>
              <li>Core directional state + event spine</li>
              <li>Journal capture with baseline analytics</li>
            </ul>
          </article>
          <article className="elceo-pricing-premium">
            <p className="elceo-kicker">Premium</p>
            <h3>Full launch-asset intelligence depth</h3>
            <ul>
              <li>12 tracked assets + full watchlist monitoring</li>
              <li>Deep confidence anatomy + contradiction diagnostics</li>
              <li>Coaching intelligence + full research module depth</li>
            </ul>
            <Link href="/login?callbackUrl=/settings" className="elceo-pill-button elceo-pill-button-hero">
              Unlock Premium Depth
            </Link>
          </article>
        </div>
      </section>

      <section id="editorial-research" className="elceo-section elceo-section-editorial" aria-label="Editorial research">
        <article className="elceo-featured-research">
          <p className="elceo-kicker">Featured research</p>
          <h3>{researchTiles[0].title}</h3>
          <p>{researchTiles[0].meta}</p>
          <span>{researchTiles[0].summary}</span>
        </article>
        <div className="elceo-editorial-grid">
          {researchTiles.slice(1).map((tile) => (
            <article key={tile.title}>
              <p>{tile.meta}</p>
              <h4>{tile.title}</h4>
              <span>{tile.summary}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="elceo-section elceo-final-cta" aria-label="Final call to action">
        <p className="elceo-kicker">ELCEO</p>
        <h2>Operate with structured conviction.</h2>
        <p>Preview the cognition stack, inspect contradiction in context, and enter the private system when ready.</p>
        <div className="elceo-hero-cta-row">
          <Link className="elceo-pill-button elceo-pill-button-hero" href="/demo">
            Enter Demo
          </Link>
          <Link className="elceo-pill-button elceo-pill-button-secondary" href="/login?callbackUrl=/onboarding">
            Open Platform
          </Link>
        </div>
      </section>
    </div>
  );
}
