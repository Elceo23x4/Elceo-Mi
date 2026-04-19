'use client';

import { useEffect } from 'react';

type GsapOrchestratorProps = {
  mode: 'landing' | 'auth' | 'shell';
};

type MotionTarget = {
  selector: string;
  personality: 'stable' | 'tense' | 'urgent' | 'calm' | 'default';
};

const QUERY_BY_MODE: Record<GsapOrchestratorProps['mode'], MotionTarget[]> = {
  landing: [
    { selector: '.elceo-topnav', personality: 'stable' },
    { selector: '.elceo-hero-lead > *', personality: 'stable' },
    { selector: '.elceo-hero-rail', personality: 'calm' },
    { selector: '.elceo-landing-panel', personality: 'default' }
  ],
  auth: [
    { selector: '.elceo-auth-shell', personality: 'stable' },
    { selector: '.elceo-auth-intel > *', personality: 'calm' },
    { selector: '.elceo-auth-actions > *', personality: 'stable' }
  ],
  shell: [
    { selector: '.elceo-shell-hero', personality: 'stable' },
    { selector: '.elceo-panel-confidence', personality: 'stable' },
    { selector: '.elceo-panel-contradiction', personality: 'tense' },
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
            end: 'bottom 42%',
            scrub: mode === 'landing' ? 0.35 : false,
            onUpdate: ({ progress }: { progress: number }) => {
              const depth = mode === 'landing' ? 1 - progress * 0.08 : 1;
              const tensionLift = target.personality === 'tense' ? Math.sin(progress * Math.PI * 2) * 1.4 : 0;
              gsap.to(element, {
                y: mode === 'landing' ? -progress * 8 : tensionLift,
                scale: depth,
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
