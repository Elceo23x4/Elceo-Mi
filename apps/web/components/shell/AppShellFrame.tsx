'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { GsapOrchestrator } from '../motion/GsapOrchestrator';
import { ThemeToggle } from '../theme/ThemeToggle';
import { CinematicAtmosphere } from '../visual/CinematicAtmosphere';
import { InAppAlertsTray } from './InAppAlertsTray';
import { privateRouteGroups, privateRouteOrder, resolvePrivateRoute } from './privateRouteConfig';

export function AppShellFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const activeRoute = useMemo(() => resolvePrivateRoute(pathname), [pathname]);

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
          {privateRouteGroups.map((group) => (
            <div key={group.id} className="elceo-sidebar-group">
              <p className="elceo-sidebar-group-label">{group.label}</p>
              <div className="elceo-sidebar-group-links">
                {privateRouteOrder
                  .filter((route) => route.group === group.id)
                  .map((route) => {
                    const active = pathname.startsWith(route.href);
                    return (
                      <Link key={route.href} href={route.href} className={active ? 'elceo-sidebar-link is-active' : 'elceo-sidebar-link'} aria-current={active ? 'page' : undefined}>
                        <span className="elceo-sidebar-link-mark" aria-hidden="true">
                          {route.short}
                        </span>
                        <span>{route.label}</span>
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="elceo-app-main">
        <header className="elceo-app-topbar">
          <div className="elceo-topbar-context">
            <p className="elceo-kicker">{activeRoute.shellKicker}</p>
            <strong>{activeRoute.workspaceLabel}</strong>
            <div className="elceo-topbar-cues" aria-label="Route status cues">
              {activeRoute.statusCues.map((cue) => (
                <span key={cue} className="elceo-topbar-cue-chip">
                  {cue}
                </span>
              ))}
            </div>
          </div>

          <div className="elceo-topbar-asset-strip" role="group" aria-label="Active route context">
            <span className="elceo-topbar-chip-label">{activeRoute.contextPillLabel}</span>
            <button type="button" className="elceo-topbar-asset-button">
              {activeRoute.contextPillValue}
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
