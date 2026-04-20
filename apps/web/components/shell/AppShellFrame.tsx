'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { GsapOrchestrator } from '../motion/GsapOrchestrator';
import { ThemeToggle } from '../theme/ThemeToggle';
import { CinematicAtmosphere } from '../visual/CinematicAtmosphere';
import { InAppAlertsTray } from './InAppAlertsTray';

const appLinks = [
  { href: '/dashboard', label: 'Dashboard', short: 'DB' },
  { href: '/portfolio', label: 'Portfolio', short: 'PF' },
  { href: '/journal', label: 'Journal', short: 'JR' },
  { href: '/analytics', label: 'Analytics', short: 'AN' },
  { href: '/settings', label: 'Settings', short: 'ST' },
  { href: '/admin', label: 'Admin', short: 'AD' }
];

const ASSET_PRESETS = ['XAU/USD', 'NAS100', 'SPX500', 'DE30', 'BTC/USD'];

export function AppShellFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const activeLink = useMemo(() => appLinks.find((link) => pathname.startsWith(link.href)) ?? appLinks[0], [pathname]);
  const activeAsset = activeLink.href === '/dashboard' ? ASSET_PRESETS[0] : 'Workspace';

  return (
    <div className="elceo-app-shell">
      <GsapOrchestrator mode="shell" />
      <CinematicAtmosphere className="elceo-cinematic-atmosphere-shell" variant="shell" />

      <aside className="elceo-app-sidebar">
        <div className="elceo-sidebar-brand-wrap">
          <div className="elceo-kicker">ELCEO / PRIVATE</div>
          <div className="elceo-sidebar-brand">ELCEO Terminal</div>
          <p className="elceo-sidebar-subtitle">Market Cognition System</p>
        </div>

        <nav className="elceo-sidebar-nav" aria-label="Application">
          {appLinks.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link key={link.href} href={link.href} className={active ? 'elceo-sidebar-link is-active' : 'elceo-sidebar-link'} aria-current={active ? 'page' : undefined}>
                <span className="elceo-sidebar-link-mark" aria-hidden="true">
                  {link.short}
                </span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="elceo-app-main">
        <header className="elceo-app-topbar">
          <div className="elceo-topbar-context">
            <p className="elceo-kicker">{activeLink.label.toUpperCase()} SURFACE</p>
            <strong>{activeLink.label} Workspace</strong>
          </div>

          <div className="elceo-topbar-asset-strip" role="group" aria-label="Active asset context">
            <span className="elceo-topbar-chip-label">Watch</span>
            <button type="button" className="elceo-topbar-asset-button">
              {activeAsset}
            </button>
          </div>

          <div className="elceo-topbar-actions">
            <button type="button" className="elceo-chip elceo-topbar-action">
              Snapshot
            </button>
            <button type="button" className="elceo-chip elceo-topbar-action">
              New Alert
            </button>
            <InAppAlertsTray />
            <ThemeToggle />
          </div>
        </header>

        <section id="main-content" className="elceo-cognition-workspace" aria-live="polite">
          {children}
        </section>
      </div>
    </div>
  );
}
