import Link from 'next/link';
import { ThemeToggle } from '../theme/ThemeToggle';

export function PublicTopNav() {
  return (
    <header className="elceo-topnav">
      <Link href="/" className="elceo-brand">
        ELCEO
      </Link>
      <nav className="elceo-nav-links" aria-label="Primary">
        <a href="#how-it-works">How it works</a>
        <a href="#market-cognition">Cognition</a>
        <a href="#pricing">Pricing</a>
        <Link href="/dashboard">Open Platform</Link>
      </nav>
      <ThemeToggle />
    </header>
  );
}
