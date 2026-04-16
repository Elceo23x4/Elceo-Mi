<<<<<<< HEAD
import type { CSSProperties, ReactNode } from 'react';

type SurfaceProps = {
  children: ReactNode;
  style?: CSSProperties;
};

export function Surface({ children, style }: SurfaceProps) {
  return (
    <section
      style={{
        background: 'var(--elceo-surface)',
        border: '1px solid var(--elceo-border)',
        borderRadius: '20px',
        backdropFilter: 'blur(14px)',
        boxShadow: '0 16px 50px rgba(0, 0, 0, 0.2)',
        ...style
      }}
    >
      {children}
    </section>
  );
}
=======
export {};
>>>>>>> origin/main
