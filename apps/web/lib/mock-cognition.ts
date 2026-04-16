import type { DashboardCognitionViewModel } from '@elceo/types';

/**
 * Dev-only helper for isolated UI iteration.
 * The default dashboard path must use `dashboard-data.ts`.
 */
export async function buildMockDashboardViewModel(): Promise<DashboardCognitionViewModel | null> {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
  if (env.NODE_ENV !== 'development') {
    throw new Error('buildMockDashboardViewModel is development-only');
  }

  return null;
}
