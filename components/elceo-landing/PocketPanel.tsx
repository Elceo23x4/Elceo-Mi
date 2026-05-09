import type { ReactNode } from 'react';

export function PocketPanel({ children, title }: { children: ReactNode; title: string }) {
  return <section className="pocket"><h3>{title}</h3>{children}</section>;
}
