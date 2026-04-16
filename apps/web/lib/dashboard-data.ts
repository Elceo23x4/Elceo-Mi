import { getDashboardData } from '@elceo/ingestion';
import type { DashboardChartWorkspaceViewModel } from '@elceo/types';

export async function buildDashboardViewModelFromAppData(assetCode = 'XAU/USD'): Promise<DashboardChartWorkspaceViewModel | null> {
  return getDashboardData(assetCode);
}
