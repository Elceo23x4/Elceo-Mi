import Link from 'next/link';

import { InlineAssetSvg } from './svg/InlineAssetSvg';

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

          <button type="button" aria-label="Open ELCEO explainer video" className="elceo-f2a-retro-button">
            <InlineAssetSvg assetFile="retro_computer_logo.svg" className="elceo-f2a-retro-logo" />
          </button>

          <InlineAssetSvg assetFile="vertical_logo.svg" className="elceo-f2a-vertical-logo" />
          <InlineAssetSvg assetFile="hero_wheel.svg" className="elceo-f2a-wheel" />
          <InlineAssetSvg assetFile="hero_side_copy.svg" className="elceo-f2a-side-copy" />

          <Link className="elceo-f2a-cta-hitbox" href="/demo" aria-label="Explore ELCEO" />

          <div className="elceo-f2a-proof" aria-hidden="true">F2A-PROOF-MARKER</div>
        </div>
      </section>
    </main>
  );
}
