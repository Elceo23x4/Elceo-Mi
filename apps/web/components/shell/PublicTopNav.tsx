'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ThemeToggle } from '../theme/ThemeToggle';

type NavGroup = {
  href: string;
  label: string;
  blurb?: string;
  children?: Array<{ href: string; label: string; blurb: string }>;
};

const navGroups: NavGroup[] = [
  {
    href: '/#mechanism',
    label: 'How it works',
    blurb: 'See ingestion, scoring, contradiction, and explanation architecture.',
    children: [
      { href: '/#mechanism', label: 'Mechanism', blurb: 'Canonical ingestion pipeline + deterministic scoring model.' },
      { href: '/#workflow', label: 'Workflow', blurb: 'How a trader operates with contradiction-first reading.' }
    ]
  },
  {
    href: '/#market-cognition',
    label: 'Cognition',
    blurb: 'Bias, confidence anatomy, and invalidation logic.',
    children: [
      { href: '/#market-cognition', label: 'State Anatomy', blurb: 'Bias, contradiction tension, event support, invalidation.' },
      { href: '/#chart-intelligence', label: 'Chart Intelligence', blurb: 'Key-level zones with evidence-linked reasoning.' }
    ]
  },
  { href: '/#chart-intelligence', label: 'Chart Intelligence' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/demo', label: 'Demo' }
];

export function PublicTopNav() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  return (
    <header className="elceo-topnav elceo-premium-topnav" onMouseLeave={() => setOpenMenu(null)}>
      <div className="elceo-topnav-brand-stack">
        <Link href="/" className="elceo-brand">
          ELCEO
        </Link>
        <p className="elceo-topnav-tag">Market Cognition System</p>
      </div>

      <nav className="elceo-nav-links" aria-label="Primary">
        {navGroups.map((item) => {
          const hasChildren = !!item.children?.length;
          const isOpen = hasChildren && openMenu === item.label;

          return (
            <div
              key={item.label}
              className={`elceo-nav-item ${isOpen ? 'is-open' : ''}`}
              onMouseEnter={() => hasChildren && setOpenMenu(item.label)}
            >
              <Link href={item.href} className="elceo-nav-link">
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
        <span className="elceo-topnav-status">Signal feed stable</span>
        <ThemeToggle />
        <Link href="/demo" className="elceo-pill-button elceo-pill-button-secondary">
          Enter Demo
        </Link>
        <Link href="/login?callbackUrl=/onboarding" className="elceo-pill-button elceo-pill-button-hero">
          Open Platform
        </Link>
      </div>

      <nav className="elceo-nav-mobile" aria-label="Mobile primary">
        {navGroups.map((item) => (
          <Link key={`mobile-${item.href}`} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
