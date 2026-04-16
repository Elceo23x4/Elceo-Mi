import type { TradeJournalEntry } from '@elceo/types';
import type { AssetPerformance, EffectiveTimeWindow, MonthlyPerformance, PerformanceSnapshot } from './types';

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, item) => sum + item, 0) / values.length;
}

function toMonthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

function rankAssets(entries: TradeJournalEntry[]): AssetPerformance[] {
  const map = new Map<string, TradeJournalEntry[]>();
  for (const entry of entries) {
    const bucket = map.get(entry.asset) ?? [];
    bucket.push(entry);
    map.set(entry.asset, bucket);
  }

  return Array.from(map.entries()).map(([asset, bucket]) => {
    const wins = bucket.filter((entry) => entry.outcome === 'win').length;
    return {
      asset,
      tradeCount: bucket.length,
      netPnl: bucket.reduce((sum, entry) => sum + entry.pnlAmount, 0),
      winRate: bucket.length ? (wins / bucket.length) * 100 : 0
    };
  });
}

function rankMonths(entries: TradeJournalEntry[]): MonthlyPerformance[] {
  const map = new Map<string, TradeJournalEntry[]>();
  for (const entry of entries) {
    const key = toMonthKey(entry.closedAtUtc);
    const bucket = map.get(key) ?? [];
    bucket.push(entry);
    map.set(key, bucket);
  }

  return Array.from(map.entries()).map(([month, bucket]) => {
    const wins = bucket.filter((entry) => entry.outcome === 'win').length;
    return {
      month,
      tradeCount: bucket.length,
      netPnl: bucket.reduce((sum, entry) => sum + entry.pnlAmount, 0),
      winRate: bucket.length ? (wins / bucket.length) * 100 : 0
    };
  });
}

function rankSessions(entries: TradeJournalEntry[]): EffectiveTimeWindow[] {
  const map = new Map<TradeJournalEntry['sessionTraded'], TradeJournalEntry[]>();
  for (const entry of entries) {
    const bucket = map.get(entry.sessionTraded) ?? [];
    bucket.push(entry);
    map.set(entry.sessionTraded, bucket);
  }

  return Array.from(map.entries())
    .map(([session, bucket]) => ({
      session,
      tradeCount: bucket.length,
      netPnl: bucket.reduce((sum, entry) => sum + entry.pnlAmount, 0),
      expectancy: avg(bucket.map((entry) => entry.resultRMultiple))
    }))
    .sort((a, b) => b.expectancy - a.expectancy);
}

export function computePerformanceMetrics(entries: TradeJournalEntry[]): PerformanceSnapshot {
  const wins = entries.filter((entry) => entry.outcome === 'win');
  const losses = entries.filter((entry) => entry.outcome === 'loss');

  const months = rankMonths(entries).sort((a, b) => b.netPnl - a.netPnl);
  const assets = rankAssets(entries).sort((a, b) => b.netPnl - a.netPnl);
  const sessions = rankSessions(entries);

  const gains = [...entries].sort((a, b) => b.pnlAmount - a.pnlAmount).slice(0, 5);
  const lossesByPnl = [...entries].sort((a, b) => a.pnlAmount - b.pnlAmount).slice(0, 5);

  return {
    totalTrades: entries.length,
    winRate: entries.length ? (wins.length / entries.length) * 100 : 0,
    expectancy: avg(entries.map((entry) => entry.resultRMultiple)),
    averageGain: avg(wins.map((entry) => entry.pnlAmount)),
    averageLoss: avg(losses.map((entry) => entry.pnlAmount)),
    averageRiskReward: avg(entries.map((entry) => Math.abs(entry.resultRMultiple))),
    bestMonth: months[0] ?? null,
    worstMonth: months.at(-1) ?? null,
    bestTradedAssets: assets.slice(0, 3),
    worstTradedAssets: [...assets].reverse().slice(0, 3),
    highestGains: gains,
    highestLosses: lossesByPnl,
    effectiveTradingTimeWindows: sessions
  };
}
