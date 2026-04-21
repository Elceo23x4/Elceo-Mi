'use client';

import { useEffect } from 'react';

type GsapOrchestratorProps = {
  mode: 'landing' | 'auth' | 'shell' | 'demo';
};

type MotionTarget = {
  selector: string;
  personality: 'stable' | 'tense' | 'urgent' | 'calm' | 'default';
};

const QUERY_BY_MODE: Record<GsapOrchestratorProps['mode'], MotionTarget[]> = {
  landing: [
    { selector: '.elceo-topnav', personality: 'stable' },
    { selector: '.elceo-hero-main .elceo-kicker', personality: 'calm' },
    { selector: '.elceo-hero-title', personality: 'stable' },
    { selector: '.elceo-hero-support, .elceo-hero-cta-row, .elceo-hero-stat-row', personality: 'calm' },
    { selector: '.elceo-side-surface-calm', personality: 'calm' },
    { selector: '.elceo-side-surface-tense', personality: 'tense' },
    { selector: '.elceo-hero-carousel-wrap', personality: 'default' },
    { selector: '.elceo-section', personality: 'default' },
    { selector: '.elceo-workflow-step', personality: 'stable' },
    { selector: '.elceo-signature-footer', personality: 'calm' },
    { selector: '.elceo-atmosphere', personality: 'calm' }
  ],
  auth: [
    { selector: '.elceo-auth-shell', personality: 'stable' },
    { selector: '.elceo-auth-intel > *', personality: 'calm' },
    { selector: '.elceo-auth-trust-list li', personality: 'calm' },
    { selector: '.elceo-auth-actions > *', personality: 'stable' }
  ],
  demo: [
    { selector: '.elceo-demo-shell-chrome', personality: 'stable' },
    { selector: '.elceo-demo-workspace .elceo-dashboard-zone-a', personality: 'stable' },
    { selector: '.elceo-demo-workspace .elceo-zone-b-chart', personality: 'stable' },
    { selector: '.elceo-demo-workspace .elceo-zone-b-intel-strip .elceo-strip-module', personality: 'calm' },
    { selector: '.elceo-demo-workspace .elceo-context-module-invalidation, .elceo-demo-workspace .elceo-panel-contradiction', personality: 'tense' },
    { selector: '.elceo-demo-workspace .elceo-panel-alerts', personality: 'urgent' },
    { selector: '.elceo-demo-workspace .elceo-dashboard-panel, .elceo-demo-conversion-strip', personality: 'default' }
  ],
  shell: [
    { selector: '.elceo-app-sidebar, .elceo-app-topbar', personality: 'stable' },
    { selector: '.elceo-dashboard-zone-a', personality: 'stable' },
    { selector: '.elceo-zone-b-chart', personality: 'stable' },
    { selector: '.elceo-zone-b-intel-strip .elceo-strip-module, .elceo-dashboard-zone-c .elceo-dashboard-panel', personality: 'calm' },
    { selector: '.elceo-panel-confidence', personality: 'stable' },
    { selector: '.elceo-panel-contradiction, .elceo-context-module-invalidation', personality: 'tense' },
    { selector: '.elceo-panel-alerts', personality: 'urgent' },
    { selector: '.elceo-panel-admin-health, .elceo-panel-admin-freshness, .elceo-panel-admin-explain, .elceo-panel-admin-audit', personality: 'calm' },
    { selector: '.elceo-panel-settings-billing, .elceo-panel-settings-notifications, .elceo-panel-settings-alert-classes', personality: 'calm' },
    { selector: '.elceo-shell-panel, .elceo-dashboard-panel, .elceo-analytics-card, .elceo-entry-item', personality: 'default' }
  ]
};

const PERSONALITY_TUNING: Record<MotionTarget['personality'], { y: number; duration: number; ease: string }> = {
  stable: { y: 14, duration: 0.72, ease: 'power2.out' },
  calm: { y: 12, duration: 0.78, ease: 'sine.out' },
  tense: { y: 20, duration: 0.62, ease: 'power4.out' },
  urgent: { y: 18, duration: 0.56, ease: 'power3.out' },
  default: { y: 16, duration: 0.68, ease: 'power3.out' }
};

export function GsapOrchestrator({ mode }: GsapOrchestratorProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let cleanup = () => {};

    async function mount(): Promise<void> {
      const gsapModule = await import('../../lib/vendor/gsap');
      const scrollTriggerModule = await import('../../lib/vendor/scrollTrigger');

      const gsap = gsapModule.gsap;
      const ScrollTrigger = scrollTriggerModule.ScrollTrigger;

      gsap.registerPlugin(ScrollTrigger);

      const selectors = QUERY_BY_MODE[mode];
      const root = document;
      const trackedTriggers: Array<{ kill: () => void }> = [];
      const hoverOffFns: Array<() => void> = [];
      const touchedElements = new Set<HTMLElement>();

      selectors.forEach((target, index) => {
        const elements = Array.from(root.querySelectorAll<HTMLElement>(target.selector));
        const tuning = PERSONALITY_TUNING[target.personality];

        if (!elements.length) return;

        gsap.fromTo(
          elements,
          { autoAlpha: 0, y: mode === 'landing' ? 28 : tuning.y, filter: 'blur(8px)' },
          {
            autoAlpha: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: tuning.duration,
            delay: index * 0.04,
            stagger: 0.08,
            ease: tuning.ease
          }
        );

        elements.forEach((element) => {
          touchedElements.add(element);

          const trigger = ScrollTrigger.create({
            trigger: element,
            start: 'top 88%',
            end: 'bottom 40%',
            scrub: mode === 'landing' ? 0.38 : false,
            onUpdate: ({ progress }: { progress: number }) => {
              if (mode === 'landing') {
                const parallaxIntensity = target.selector.includes('elceo-atmosphere') ? 26 : 10;
                const depthScale = 1 - progress * (target.personality === 'calm' ? 0.04 : 0.07);
                const lift = -progress * parallaxIntensity;
                const tensionLift = target.personality === 'tense' ? Math.sin(progress * Math.PI * 2) * 1.2 : 0;

                gsap.to(element, {
                  y: lift + tensionLift,
                  scale: depthScale,
                  duration: 0.2,
                  overwrite: true
                });
                return;
              }

              const tensionLift = target.personality === 'tense' ? Math.sin(progress * Math.PI * 2) * 1.4 : 0;
              gsap.to(element, {
                y: tensionLift,
                scale: 1,
                duration: 0.2,
                overwrite: true
              });
            }
          });
          trackedTriggers.push(trigger);

          if (mode !== 'landing' && (target.personality === 'urgent' || target.personality === 'tense')) {
            const enter = () =>
              gsap.to(element, {
                boxShadow:
                  target.personality === 'urgent'
                    ? '0 0 24px rgba(255, 118, 128, 0.35)'
                    : '0 0 20px rgba(255, 118, 128, 0.22)',
                duration: 0.18
              });
            const leave = () => gsap.to(element, { boxShadow: '', duration: 0.22 });
            element.addEventListener('mouseenter', enter);
            element.addEventListener('mouseleave', leave);
            hoverOffFns.push(() => {
              element.removeEventListener('mouseenter', enter);
              element.removeEventListener('mouseleave', leave);
            });
          }
        });
      });

      cleanup = () => {
        hoverOffFns.forEach((off) => off());
        if (touchedElements.size) {
          gsap.to(Array.from(touchedElements), { clearProps: 'transform,opacity,filter', duration: 0.1 });
        }
        trackedTriggers.forEach((trigger) => trigger.kill());
      };
    }

    void mount();

    return () => {
      cleanup();
    };
  }, [mode]);

  return null;
}
