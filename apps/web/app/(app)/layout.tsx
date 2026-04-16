import type { ReactNode } from 'react';
import { AppShellFrame } from '../../components/shell/AppShellFrame';

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return <AppShellFrame>{children}</AppShellFrame>;
}
