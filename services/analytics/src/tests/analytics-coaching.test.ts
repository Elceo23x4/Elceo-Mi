import type { TradeJournalEntry } from '@elceo/types';
import { AnalyticsService } from '../analytics-service';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function buildEntry(index: number, overrides: Partial<TradeJournalEntry> = {}): TradeJournalEntry {
  return {
    entryId: `entry-${index}`,
    userId: 'user-1',
    asset: index % 2 === 0 ? 'XAU/USD' : 'Nasdaq 100',
    direction: index % 2 === 0 ? 'long' : 'short',
    entryPrice: 100,
    stopPrice: 98,
    takeProfitPrice: 104,
    exitPrice: index % 3 === 0 ? 97 : 103,
    outcome: index % 3 === 0 ? 'loss' : 'win',
    resultRMultiple: index % 3 === 0 ? -1.5 : 1.4,
    setupType: 'trend-continuation',
    reason: 'H4 zone + event alignment',
    emotion: index % 4 === 0 ? 'revenge' : 'calm',
    sessionTraded: index % 2 === 0 ? 'london' : 'new-york',
    majorNewsNearby: index % 2 === 0,
    followedElceoBias: index % 5 !== 0,
    confidenceBeforeTrade: index % 3 === 0 ? 78 : 56,
    confidenceAfterTrade: index % 3 === 0 ? 40 : 65,
    mistakeCategory: index % 4 === 0 ? 'overtrading' : 'none',
    lessonCategory: 'discipline',
    pnlAmount: index % 3 === 0 ? -180 : 240,
    tradedAtUtc: `2026-01-${String((index % 9) + 1).padStart(2, '0')}T09:00:00.000Z`,
    closedAtUtc: `2026-01-${String((index % 9) + 1).padStart(2, '0')}T11:00:00.000Z`,
    createdAtUtc: `2026-01-${String((index % 9) + 1).padStart(2, '0')}T11:05:00.000Z`,
    updatedAtUtc: `2026-01-${String((index % 9) + 1).padStart(2, '0')}T11:05:00.000Z`,
    media: [],
    ...overrides
  };
}

export function runAnalyticsCoachingTests(): void {
  const entries = Array.from({ length: 14 }, (_, index) => buildEntry(index + 1));
  const service = new AnalyticsService();
  const result = service.computeFromJournal(entries);

  assert(result.performance.totalTrades === 14, 'total trades');
  assert(result.performance.winRate > 0, 'win rate populated');
  assert(result.performance.bestMonth?.month === '2026-01', 'best month computed');
  assert(result.behavior.overtradingSignals.length > 0, 'overtrading signal present');
  assert(result.behavior.biasViolationRate > 0, 'bias violation rate computed');
  assert(result.coaching.evidence.length >= 3, 'coaching evidence present');
  assert(result.coaching.interventions.length >= 3, 'coaching interventions present');
}
