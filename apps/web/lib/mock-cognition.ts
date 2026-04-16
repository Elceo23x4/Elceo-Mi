import type { DashboardCognitionViewModel } from '@elceo/types';

/**
 * Dev-only helper for isolated UI iteration.
 * The default dashboard path must use `dashboard-data.ts`.
 */
export async function buildMockDashboardViewModel(): Promise<DashboardCognitionViewModel | null> {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('buildMockDashboardViewModel is development-only');
  }

  return null;
}
