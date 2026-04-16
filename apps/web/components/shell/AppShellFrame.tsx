import Link from 'next/link';
import type { ReactNode } from 'react';
import { ThemeToggle } from '../theme/ThemeToggle';

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
      <aside className="elceo-app-sidebar">
        <div className="elceo-sidebar-brand">ELCEO Terminal</div>
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
          <ThemeToggle />
        </header>
        <section className="elceo-cognition-workspace">{children}</section>
      </div>
    </div>
  );
}
