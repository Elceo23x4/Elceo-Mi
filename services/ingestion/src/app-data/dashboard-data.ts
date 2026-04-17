import type { DashboardChartWorkspaceViewModel } from '@elceo/types';
import { readPersistedState } from '../store/persistence-store';
import { runIngestionTick } from '../worker';

function defaultChartFilters() {
  return {
    keyLevelZones: true,
    macroEvents: true,
    contradiction: true,
    evidenceNotes: true,
    impulseOrigins: false
  } as const;
}

export async function getDashboardData(assetCode: string): Promise<DashboardChartWorkspaceViewModel | null> {
  let snapshot = await readPersistedState();

  if (!snapshot.chartViewModelByAsset[assetCode]) {
    await runIngestionTick();
    snapshot = await readPersistedState();
  }

  const dashboard = snapshot.chartViewModelByAsset[assetCode];
  if (!dashboard) return null;

  const candles = snapshot.normalizedEvents
    .filter((event) => event.eventType === 'market_candle')
    .map((event) => event.payload)
    .filter((payload): payload is Extract<typeof payload, { type: 'market_candle' }> => payload.type === 'market_candle' && payload.assetCode === assetCode)
    .sort((a, b) => a.timestampUtc.localeCompare(b.timestampUtc))
    .slice(-180)
    .map((candle) => ({
      timestamp_utc: candle.timestampUtc,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      ...(candle.volume !== undefined ? { volume: candle.volume } : {})
    }));

  return {
    dashboard,
    chart: {
      candles,
      zones: dashboard.zones,
      annotations: dashboard.annotations,
      default_filters: defaultChartFilters(),
      annotation_density_target: 'moderate'
    }
  };
}
