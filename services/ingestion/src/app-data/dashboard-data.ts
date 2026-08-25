import type { DashboardChartWorkspaceViewModel } from '@elceo/types';
import { readPersistedState } from '../store/persistence-store';

function defaultChartFilters() {
  return {
    keyLevelZones: true,
    macroEvents: true,
    contradiction: true,
    evidenceNotes: true,
    impulseOrigins: false
  } as const;
}

export async function getDashboardData(assetCode: string, readState: typeof readPersistedState = readPersistedState): Promise<DashboardChartWorkspaceViewModel | null> {
  // This function is a user-facing read boundary. Missing state is truthful
  // unavailability; ingestion is owned exclusively by the worker/scheduler.
  const snapshot = await readState();

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
