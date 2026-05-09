import Link from 'next/link';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
  { href: '/login', label: 'Login' }
] as const;

export function ElceoLandingPage() {
  return (
    <main id="main-content" className="elceo-f2a-page">
      <section className="elceo-hero-section" aria-label="ELCEO F2A hero and navigation">
        <div className="elceo-hero-stage">
          <nav className="elceo-f2a-nav" aria-label="Primary">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="elceo-f2a-nav-link">
                {link.label}
              </Link>
            ))}
          </nav>

          <img src="/elceo/assets/source/vertical_logo.svg" alt="ELCEO vertical logo" className="elceo-f2a-vertical-logo" />
          <img src="/elceo/assets/source/hero_wheel.svg" alt="ELCEO hero wheel" className="elceo-f2a-wheel" />
          <img src="/elceo/assets/source/retro_computer_logo.svg" alt="ELCEO retro computer mark" className="elceo-f2a-retro-logo" />
          <img src="/elceo/assets/source/hero_side_copy.svg" alt="ELCEO hero side copy" className="elceo-f2a-side-copy" />

          <div className="elceo-f2a-core" aria-hidden="true">
            <img src="/elceo/assets/source/orange_world_globe.svg" alt="" className="elceo-f2a-globe" />
            <span className="elceo-f2a-core-label">MARKET CORE</span>
          </div>

          <Link className="elceo-f2a-cta" href="/demo">
            Explore ELCEO
          </Link>

          <div className="elceo-f2a-proof" aria-hidden="true">F2A-PROOF-MARKER</div>
        </div>
      </section>
    </main>
  );
}
