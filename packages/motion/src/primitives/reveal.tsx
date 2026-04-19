'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useReducedMotionPreference } from '../reducedMotion';
import { revealTransition } from '../variants';

type RevealProps = {
  children: ReactNode;
  delayMs?: number;
  style?: CSSProperties;
};

export function Reveal({ children, delayMs = 0, style }: RevealProps) {
  const reduced = useReducedMotionPreference();
  const [active, setActive] = useState(reduced);

  useEffect(() => {
    if (reduced) {
      setActive(true);
      return;
    }

    const timer = window.setTimeout(() => setActive(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, reduced]);

  const startStyle: CSSProperties = reduced
    ? {}
    : {
        transform: 'translateY(14px)',
        opacity: 0
      };

  return (
    <div style={{ ...(active ? revealTransition(reduced) : startStyle), ...style }}>
      {children}
    </div>
  );
}
