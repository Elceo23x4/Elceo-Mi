import { getDashboardData } from '@elceo/ingestion';
import type { DashboardCognitionViewModel } from '@elceo/types';

export async function buildDashboardViewModelFromInternalData(assetCode = 'XAU/USD'): Promise<DashboardCognitionViewModel | null> {
  return getDashboardData(assetCode);
}
