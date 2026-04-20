import Link from 'next/link';
import { GsapOrchestrator } from '../../../components/motion/GsapOrchestrator';
import { PublicTopNav } from '../../../components/shell/PublicTopNav';
import { CinematicAtmosphere } from '../../../components/visual/CinematicAtmosphere';

export default function PricingPage() {
  return (
    <main id="main-content" className="elceo-public-page elceo-public-cinematic">
      <GsapOrchestrator mode="landing" />
      <div className="elceo-atmosphere elceo-atmosphere-a" aria-hidden="true" />
      <div className="elceo-atmosphere elceo-atmosphere-b" aria-hidden="true" />
      <CinematicAtmosphere className="elceo-cinematic-atmosphere-landing" variant="landing" />
      <PublicTopNav />

      <section className="elceo-section elceo-section-pricing elceo-pricing-route" aria-label="Pricing comparison">
        <div className="elceo-section-head">
          <p className="elceo-kicker">Pricing</p>
          <h1>Execution depth for serious market operators.</h1>
          <p>
            Free keeps essential cognition access. Premium unlocks full launch-asset monitoring, deeper contradiction diagnostics, and coaching intelligence.
          </p>
        </div>
        <div className="elceo-pricing-surface">
          <article>
            <p className="elceo-kicker">Free</p>
            <h3>Essential cognition access</h3>
            <ul>
              <li>4 tracked assets</li>
              <li>Core directional state + event spine</li>
              <li>Baseline journal tracking</li>
            </ul>
          </article>
          <article className="elceo-pricing-premium">
            <p className="elceo-kicker">Premium</p>
            <h3>Full launch stack unlock</h3>
            <ul>
              <li>12 tracked assets + full watchlist depth</li>
              <li>Confidence anatomy and contradiction diagnostics</li>
              <li>Coaching diagnostics + complete research surfaces</li>
            </ul>
            <Link href="/login?callbackUrl=/settings" className="elceo-pill-button elceo-pill-button-hero">
              Continue to upgrade flow
            </Link>
          </article>
        </div>
      </section>
    </main>
  );
}
