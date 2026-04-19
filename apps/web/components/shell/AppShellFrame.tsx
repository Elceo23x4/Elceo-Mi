import Link from 'next/link';
import type { ReactNode } from 'react';
import { GsapOrchestrator } from '../motion/GsapOrchestrator';
import { ThemeToggle } from '../theme/ThemeToggle';
import { CinematicAtmosphere } from '../visual/CinematicAtmosphere';
import { InAppAlertsTray } from './InAppAlertsTray';

const appLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/journal', label: 'Journal' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/settings', label: 'Settings' },
  { href: '/admin', label: 'Admin' }
];

export function AppShellFrame({ children }: { children: ReactNode }) {
  return (
    <div className="elceo-app-shell">
      <GsapOrchestrator mode="shell" />
      <CinematicAtmosphere className="elceo-cinematic-atmosphere-shell" variant="shell" />
      <aside className="elceo-app-sidebar">
        <div className="elceo-sidebar-brand-wrap">
          <div className="elceo-kicker">MARKET COGNITION OS</div>
          <div className="elceo-sidebar-brand">ELCEO Terminal</div>
        </div>
        <nav className="elceo-sidebar-nav" aria-label="Application">
          {appLinks.map((link) => (
            <Link key={link.href} href={link.href} className="elceo-sidebar-link">
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="elceo-app-main">
        <header className="elceo-app-topbar">
          <div>
            <div className="elceo-kicker">Market Intelligence · Decision Support</div>
            <strong>Authenticated Shell</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><InAppAlertsTray /><ThemeToggle /></div>
        </header>
        <section id="main-content" className="elceo-cognition-workspace" aria-live="polite">{children}</section>
      </div>
    </div>
  );
}
