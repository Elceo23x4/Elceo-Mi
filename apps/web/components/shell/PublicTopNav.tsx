import Link from 'next/link';
import { ThemeToggle } from '../theme/ThemeToggle';

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
        <a href="#how-it-works">How it works</a>
        <a href="#market-cognition">Cognition</a>
        <a href="#chart-intelligence">Chart intelligence</a>
        <Link href="/pricing">Pricing</Link>
        <Link href="/dashboard">Open Platform</Link>
      </nav>
      <div className="elceo-topnav-actions">
        <span className="elceo-topnav-status">Secure Feed Live</span>
        <ThemeToggle />
      </div>
    </header>
  );
}
