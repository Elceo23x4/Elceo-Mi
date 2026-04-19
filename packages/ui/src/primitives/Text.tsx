import type { CSSProperties, ReactNode } from 'react';

type TextProps = {
  as?: 'p' | 'span' | 'h1' | 'h2' | 'h3';
  children: ReactNode;
  tone?: 'primary' | 'muted';
  style?: CSSProperties;
};

export function Text({ as = 'p', children, tone = 'primary', style }: TextProps) {
  const Comp = as;
  return (
    <Comp
      style={{
        color: tone === 'primary' ? 'var(--elceo-text-primary)' : 'var(--elceo-text-muted)',
        margin: 0,
        ...style
      }}
    >
      {children}
    </Comp>
  );
}
