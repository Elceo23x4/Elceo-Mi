import { MasterHeroSectionSvg } from './svg/MasterHeroSectionSvg';

const NAV_LINKS = ['Home', 'Pricing', 'About', 'FAQ', 'Login'];

export function ElceoLandingPage() {
  return (
    <main className="elceo-f2a-root">
      <section className="elceo-hero-section" aria-label="ELCEO hero and navigation section">
        <nav className="elceo-hero-topnav" aria-label="Primary">
          {NAV_LINKS.map((item) => (
            <a key={item} href="#" className="elceo-hero-topnav-link">{item}</a>
          ))}
        </nav>
        <MasterHeroSectionSvg />
      </section>
    </main>
  );
}
