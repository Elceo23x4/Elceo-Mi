'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ThemeToggle } from '../theme/ThemeToggle';

type NavChild = { href: string; label: string; blurb: string };
type NavGroup = {
  href: string;
  label: string;
  blurb?: string;
  children?: NavChild[];
};

const navGroups: NavGroup[] = [
  {
    href: '/#mechanism',
    label: 'How it works',
    blurb: 'Review ingestion, signal scoring, contradiction checks, and explanation pathways.',
    children: [
      { href: '/#mechanism', label: 'Signal Mechanism', blurb: 'How market evidence is ingested and normalized.' },
      { href: '/#workflow', label: 'Decision Workflow', blurb: 'Operational flow from signal read to plan execution.' },
      { href: '/#final-cta', label: 'Launch Path', blurb: 'Direct route to pilot, onboarding, and market rollout.' }
    ]
  },
  {
    href: '/#market-cognition',
    label: 'Cognition',
    blurb: 'See confidence anatomy, invalidation logic, and evidence-weighted market states.',
    children: [
      { href: '/#market-cognition', label: 'State Anatomy', blurb: 'Bias, confidence, contradiction tension, and event support.' },
      { href: '/#chart-intelligence', label: 'Chart Intelligence', blurb: 'Structure zones tied to context and rationale.' },
      { href: '/#workflow', label: 'Operator Layer', blurb: 'How traders interpret machine confidence in motion.' }
    ]
  },
  { href: '/#chart-intelligence', label: 'Chart Intelligence' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/demo', label: 'Demo' }
];

export function PublicTopNav() {
  const pathname = usePathname();
  const [openDesktopMenu, setOpenDesktopMenu] = useState<string | null>(null);
  const [openMobileMenu, setOpenMobileMenu] = useState<string | null>(null);

  const activeSegment = useMemo(() => pathname ?? '/', [pathname]);

  const isItemActive = (href: string) => {
    if (href.startsWith('/#')) return activeSegment === '/';
    return activeSegment === href;
  };

  return (
    <header className="elceo-topnav elceo-premium-topnav" onMouseLeave={() => setOpenDesktopMenu(null)}>
      <div className="elceo-topnav-brand-stack">
        <Link href="/" className="elceo-brand" aria-label="ELCEO home">
          <span>ELCEO</span>
          <small>Market Cognition OS</small>
        </Link>
        <p className="elceo-topnav-tag">H1R-LIVE</p>
      </div>

      <nav className="elceo-nav-links" aria-label="Primary">
        {navGroups.map((item) => {
          const hasChildren = Boolean(item.children?.length);
          const isOpen = hasChildren && openDesktopMenu === item.label;

          return (
            <div
              key={item.label}
              className={`elceo-nav-item ${isOpen ? 'is-open' : ''}`}
              onMouseEnter={() => hasChildren && setOpenDesktopMenu(item.label)}
            >
              <Link href={item.href} className={`elceo-nav-link ${isItemActive(item.href) ? 'is-active' : ''}`}>
                {item.label}
              </Link>
              {hasChildren ? <span className="elceo-nav-caret">▾</span> : null}

              {hasChildren ? (
                <div className="elceo-nav-dropdown" role="group" aria-label={`${item.label} destinations`}>
                  <p className="elceo-nav-dropdown-kicker">{item.blurb}</p>
                  {item.children?.map((child) => (
                    <Link key={child.label} href={child.href} className="elceo-nav-dropdown-row">
                      <strong>{child.label}</strong>
                      <span>{child.blurb}</span>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="elceo-topnav-actions">
        <ThemeToggle />
        <Link href="/login?callbackUrl=/onboarding" className="elceo-pill-button elceo-pill-button-hero">
          Open Platform
        </Link>
      </div>

      <nav className="elceo-nav-mobile" aria-label="Mobile primary">
        {navGroups.map((item) => {
          const hasChildren = Boolean(item.children?.length);
          const isOpen = hasChildren && openMobileMenu === item.label;

          if (!hasChildren) {
            return (
              <Link key={`mobile-${item.href}`} href={item.href} className="elceo-nav-mobile-link">
                {item.label}
              </Link>
            );
          }

          return (
            <div key={`mobile-${item.label}`} className={`elceo-nav-mobile-group ${isOpen ? 'is-open' : ''}`}>
              <button
                type="button"
                className="elceo-nav-mobile-trigger"
                onClick={() => setOpenMobileMenu(isOpen ? null : item.label)}
              >
                {item.label}
                <span aria-hidden="true">▾</span>
              </button>
              <div className="elceo-nav-mobile-dropdown">
                {item.children?.map((child) => (
                  <Link key={`mobile-${child.label}`} href={child.href} className="elceo-nav-mobile-sublink">
                    <strong>{child.label}</strong>
                    <span>{child.blurb}</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </header>
  );
}
