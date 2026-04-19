import Link from 'next/link';
import { ThemeToggle } from '../theme/ThemeToggle';

const navItems = [
  { href: '/#mechanism', label: 'How it works' },
  { href: '/#market-cognition', label: 'Cognition' },
  { href: '/#chart-intelligence', label: 'Chart Intelligence' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/demo', label: 'Demo' }
] as const;

export function PublicTopNav() {
  return (
    <header className="elceo-topnav elceo-premium-topnav">
      <div className="elceo-topnav-brand-stack">
        <Link href="/" className="elceo-brand">
          ELCEO
        </Link>
        <p className="elceo-topnav-tag">Market Cognition System</p>
      </div>
      <nav className="elceo-nav-links" aria-label="Primary">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="elceo-topnav-actions">
        <span className="elceo-topnav-status">Secure Feed Live</span>
        <ThemeToggle />
        <Link href="/login?callbackUrl=/onboarding" className="elceo-pill-button elceo-pill-button-secondary">
          Open Platform
        </Link>
      </div>
      <nav className="elceo-nav-mobile" aria-label="Mobile primary">
        {navItems.map((item) => (
          <Link key={`mobile-${item.href}`} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
