/* eslint-disable no-unused-vars */
type ScrollTriggerConfig = {
  trigger: HTMLElement;
  start?: string;
  end?: string;
  scrub?: boolean | number;
  onUpdate?: (state: { progress: number }) => void;
};

export const ScrollTrigger = {
  create(config: ScrollTriggerConfig): { kill(): void } {
    const { trigger, onUpdate } = config;
    const handler = () => {
      const rect = trigger.getBoundingClientRect();
      const viewHeight = window.innerHeight || 1;
      const progress = Math.min(1, Math.max(0, (viewHeight - rect.top) / (viewHeight + rect.height)));
      onUpdate?.({ progress });
    };

    handler();
    window.addEventListener('scroll', handler, { passive: true });
    window.addEventListener('resize', handler);

    return {
      kill() {
        window.removeEventListener('scroll', handler);
        window.removeEventListener('resize', handler);
      }
    };
  }
};
