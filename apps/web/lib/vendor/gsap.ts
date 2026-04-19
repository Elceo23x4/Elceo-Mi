/* eslint-disable no-unused-vars */
type GsapVars = Record<string, unknown>;

function applyVars(target: HTMLElement, vars: GsapVars): void {
  if ('autoAlpha' in vars) {
    const alpha = Number(vars.autoAlpha);
    target.style.opacity = String(alpha);
    target.style.visibility = alpha <= 0 ? 'hidden' : 'visible';
  }

  if ('y' in vars) {
    target.style.transform = `translate3d(0, ${Number(vars.y)}px, 0)`;
  }

  if ('scale' in vars) {
    target.style.transform = `${target.style.transform || ''} scale(${Number(vars.scale)})`.trim();
  }

  if ('filter' in vars) {
    target.style.filter = String(vars.filter);
  }

  if ('boxShadow' in vars) {
    target.style.boxShadow = String(vars.boxShadow ?? '');
  }

  if ('clearProps' in vars) {
    target.style.removeProperty('transform');
    target.style.removeProperty('opacity');
    target.style.removeProperty('filter');
  }
}

function getElements(targets: unknown): HTMLElement[] {
  if (!targets) return [];
  if (targets instanceof HTMLElement) return [targets];
  if (Array.isArray(targets)) return targets.filter((item): item is HTMLElement => item instanceof HTMLElement);
  return [];
}

export const gsap = {
  registerPlugin: (..._plugins: unknown[]) => {},
  fromTo(targets: unknown, fromVars: GsapVars, toVars: GsapVars) {
    const elements = getElements(targets);
    elements.forEach((element, index) => {
      applyVars(element, fromVars);
      const delay = Number(toVars.delay ?? 0) + Number(toVars.stagger ?? 0) * index;
      const duration = Number(toVars.duration ?? 0.4);
      window.setTimeout(() => {
        element.style.transition = `all ${duration}s ease`;
        applyVars(element, toVars);
      }, delay * 1000);
    });
  },
  to(targets: unknown, vars: GsapVars) {
    const elements = getElements(targets);
    const duration = Number(vars.duration ?? 0.2);
    elements.forEach((element) => {
      element.style.transition = `all ${duration}s ease`;
      applyVars(element, vars);
    });
  }
};
