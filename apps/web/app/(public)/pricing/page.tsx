import { Reveal } from '@elceo/motion';
import { Surface } from '@elceo/ui';
import Link from 'next/link';

export default function PricingPage() {
  return (
    <main id="main-content" className="elceo-public-page">
      <Reveal>
        <Surface style={{ padding: '1.2rem', display: 'grid', gap: '1rem' }}>
          <p className="elceo-kicker">PRICING · PLAN LIFECYCLE</p>
          <h1 style={{ margin: 0 }}>Choose your ELCEO execution depth</h1>
          <p className="elceo-muted-text">Free keeps essential cognition coverage. Premium unlocks full launch-asset depth, coaching diagnostics, and expanded dashboard module stack.</p>
          <div className="elceo-plan-grid">
            <article className="elceo-plan-card active" style={{ cursor: 'default' }}>
              <strong>FREE</strong>
              <span>4 tracked assets</span>
              <span>Core dashboard + journal capture</span>
            </article>
            <article className="elceo-plan-card active" style={{ cursor: 'default' }}>
              <strong>PREMIUM</strong>
              <span>12 tracked assets</span>
              <span>Full coaching + premium-depth modules</span>
            </article>
          </div>
          <Link href="/login?callbackUrl=/settings" className="elceo-pill-button" style={{ width: 'fit-content' }}>
            Continue to upgrade flow
          </Link>
        </Surface>
      </Reveal>
    </main>
  );
}
