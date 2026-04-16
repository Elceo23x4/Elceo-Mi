export function revealTransition(reducedMotion: boolean) {
  return reducedMotion
    ? { transition: 'none', transform: 'none', opacity: 1 }
    : {
        transition: 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1), opacity 600ms cubic-bezier(0.22, 1, 0.36, 1)',
        transform: 'translateY(0px)',
        opacity: 1
      };
}
