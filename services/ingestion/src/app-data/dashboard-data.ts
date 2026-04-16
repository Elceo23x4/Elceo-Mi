import type { DashboardCognitionViewModel } from '@elceo/types';
import { readPersistedState } from '../store/persistence-store';
import { runIngestionTick } from '../worker';

export async function getDashboardData(assetCode: string): Promise<DashboardCognitionViewModel | null> {
  let snapshot = readPersistedState();

  if (!snapshot.chartViewModelByAsset[assetCode]) {
    await runIngestionTick();
    snapshot = readPersistedState();
  }

  return snapshot.chartViewModelByAsset[assetCode] ?? null;
}
