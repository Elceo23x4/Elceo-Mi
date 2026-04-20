import Link from 'next/link';
import { GsapOrchestrator } from '../../../components/motion/GsapOrchestrator';
import { PublicTopNav } from '../../../components/shell/PublicTopNav';
import { CinematicAtmosphere } from '../../../components/visual/CinematicAtmosphere';

export default function DemoPage() {
  return (
    <main id="main-content" className="elceo-public-page elceo-public-cinematic">
      <GsapOrchestrator mode="landing" />
      <div className="elceo-atmosphere elceo-atmosphere-a" aria-hidden="true" />
      <div className="elceo-atmosphere elceo-atmosphere-b" aria-hidden="true" />
      <CinematicAtmosphere className="elceo-cinematic-atmosphere-landing" variant="landing" />
      <PublicTopNav />

      <section className="elceo-section elceo-demo-route" aria-label="Public ELCEO demo preview">
        <div className="elceo-section-head">
          <p className="elceo-kicker">Public demo</p>
          <h1>ELCEO dashboard preview</h1>
          <p>Believable mock workspace showing chart intelligence, confidence anatomy, contradiction tension, evidence rail, macro pulse, and watchlist state.</p>
        </div>

        <div className="elceo-chart-frame">
          <div className="elceo-chart-canvas" aria-hidden="true" />
          <aside>
            <p className="elceo-kicker">Macro pulse</p>
            <ul>
              <li>US10Y real-yield drift easing</li>
              <li>Fed language shift: neutral-to-soft</li>
              <li>Dollar breadth cooling across majors</li>
            </ul>
          </aside>
        </div>

        <div className="elceo-preview-strip">
          <article className="elceo-preview-module">
            <p>Confidence anatomy</p>
            <strong>78 / 100</strong>
            <span>Source 82 · Event 76 · Price 71 · Contradiction -9</span>
          </article>
          <article className="elceo-preview-module">
            <p>Contradiction tension</p>
            <strong>34 / 100</strong>
            <span>Price probing resistance while macro pressure remains supportive</span>
          </article>
          <article className="elceo-preview-module">
            <p>Evidence panel</p>
            <strong>11 notes</strong>
            <span>4 macro · 5 chart-linked · 2 geopolitical</span>
          </article>
        </div>

        <div className="elceo-dev-grid">
          <article>
            <p>Watchlist focus</p>
            <strong>XAU/USD · Nasdaq 100 · BTC/USD</strong>
          </article>
          <article>
            <p>Journal teaser</p>
            <strong>Expectancy +0.42R · London/NY overlap edge</strong>
          </article>
          <article>
            <p>Next action</p>
            <strong>Monitor 2358.4 zone reaction and event follow-through</strong>
          </article>
          <article>
            <p>Platform access</p>
            <strong>Sign in to open private execution surfaces</strong>
          </article>
        </div>

        <div className="elceo-hero-cta-row">
          <Link className="elceo-pill-button elceo-pill-button-hero" href="/login?callbackUrl=/onboarding">
            Open Platform
          </Link>
          <Link className="elceo-pill-button elceo-pill-button-secondary" href="/#pricing">
            Compare Plans
          </Link>
        </div>
      </section>
    </main>
  );
}
