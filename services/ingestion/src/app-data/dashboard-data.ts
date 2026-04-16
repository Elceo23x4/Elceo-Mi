import type { DashboardCognitionViewModel } from '@elceo/types';
import { readPersistedState } from '../store/persistence-store';
import { runIngestionTick } from '../worker';

export async function getDashboardData(assetCode: string): Promise<DashboardCognitionViewModel | null> {
  let snapshot = await readPersistedState();

  if (!snapshot.chartViewModelByAsset[assetCode]) {
    await runIngestionTick();
    snapshot = await readPersistedState();
  }

  return snapshot.chartViewModelByAsset[assetCode] ?? null;
}
