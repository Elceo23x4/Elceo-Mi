import type { CanonicalAssetSymbol, Timeframe } from '@elceo/types';
import type { IngestionScheduleFrequency } from './frequency';

export type IngestionSchedulePlanItem = {
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  frequency: IngestionScheduleFrequency;
  lookbackHours: number;
  enabled: boolean;
  priority: number;
};

const timeframeDefaults: Record<Timeframe, { frequency: IngestionScheduleFrequency; lookbackHours: number }> = {
  M5: { frequency: 'five_minutes', lookbackHours: 6 },
  M15: { frequency: 'fifteen_minutes', lookbackHours: 12 },
  H1: { frequency: 'hourly', lookbackHours: 24 },
  H4: { frequency: 'four_hourly', lookbackHours: 72 },
  D1: { frequency: 'daily', lookbackHours: 168 }
};

const assetPriorities: Record<CanonicalAssetSymbol, number> = {
  'XAU/USD': 100,
  'BTC/USD': 100,
  'Nasdaq 100': 95,
  'S&P 500': 95,
  DE30: 90,
  'EUR/USD': 90,
  'GBP/USD': 88,
  'USD/JPY': 88,
  'USD/CHF': 85,
  'AUD/USD': 85,
  'NZD/USD': 82,
  'USD/CAD': 85
};

const planTimeframes: Timeframe[] = ['M5', 'M15', 'H1', 'H4', 'D1'];

export function buildDefaultSchedulePlan(): IngestionSchedulePlanItem[] {
  const items: IngestionSchedulePlanItem[] = [];

  for (const [asset, priority] of Object.entries(assetPriorities) as Array<[CanonicalAssetSymbol, number]>) {
    for (const timeframe of planTimeframes) {
      const defaults = timeframeDefaults[timeframe];
      items.push({
        asset,
        timeframe,
        frequency: defaults.frequency,
        lookbackHours: defaults.lookbackHours,
        enabled: true,
        priority
      });
    }
  }

  return items;
}

export function getSchedulePlanForAssetTimeframe(plan: IngestionSchedulePlanItem[], asset: CanonicalAssetSymbol, timeframe: Timeframe): IngestionSchedulePlanItem | null {
  return plan.find((item) => item.asset === asset && item.timeframe === timeframe) ?? null;
}

export function getEnabledSchedulePlan(plan: IngestionSchedulePlanItem[]): IngestionSchedulePlanItem[] {
  return plan.filter((item) => item.enabled);
}
