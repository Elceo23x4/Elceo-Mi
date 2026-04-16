<<<<<<< HEAD
import type { ReactNode } from 'react';
import { GlowFrame } from '../primitives/GlowFrame';
import { Surface } from '../primitives/Surface';

type EditorialHeroFrameProps = {
  children: ReactNode;
};

export function EditorialHeroFrame({ children }: EditorialHeroFrameProps) {
  return (
    <GlowFrame>
      <Surface
        style={{
          padding: 'clamp(1.5rem, 5vw, 3rem)',
          display: 'grid',
          gap: '1.2rem',
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--elceo-brand-main) 16%, transparent), transparent 42%), var(--elceo-surface)'
        }}
      >
        {children}
      </Surface>
    </GlowFrame>
  );
}
=======
export {};
>>>>>>> origin/main
