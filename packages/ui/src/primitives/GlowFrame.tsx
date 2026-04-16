<<<<<<< HEAD
import type { ReactNode } from 'react';

type GlowFrameProps = {
  children: ReactNode;
};

export function GlowFrame({ children }: GlowFrameProps) {
  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '24px',
        border: '1px solid var(--elceo-border)',
        boxShadow: '0 0 50px var(--elceo-glow)'
      }}
    >
      {children}
    </div>
  );
}
=======
export {};
>>>>>>> origin/main
