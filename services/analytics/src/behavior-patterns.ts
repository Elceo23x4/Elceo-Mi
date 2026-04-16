import type { MistakeCategory, TradeJournalEntry } from '@elceo/types';
import type { BehaviorPatternSignals, EffectiveTimeWindow, PerformanceSnapshot } from './types';

function countByMistake(entries: TradeJournalEntry[]): Array<{ category: MistakeCategory; count: number }> {
  const counts = new Map<MistakeCategory, number>();
  for (const entry of entries) {
    if (entry.mistakeCategory === 'none') continue;
    counts.set(entry.mistakeCategory, (counts.get(entry.mistakeCategory) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

function overtradingSignals(entries: TradeJournalEntry[]): string[] {
  const byDay = new Map<string, number>();
  for (const entry of entries) {
    const day = entry.tradedAtUtc.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }

  const heavyDays = Array.from(byDay.entries()).filter(([, count]) => count >= 4);
  const signals: string[] = [];

  if (heavyDays.length >= 3) {
    signals.push(`High-frequency clustering detected on ${heavyDays.length} days with 4+ trades.`);
  }

  const revengeLinked = entries.filter((entry) => entry.emotion === 'revenge' || entry.mistakeCategory === 'overtrading').length;
  if (entries.length > 0 && revengeLinked / entries.length >= 0.2) {
    signals.push('Revenge/overtrading context appears in at least 20% of logged trades.');
  }

  return signals;
}

function confidenceMismatchPatterns(entries: TradeJournalEntry[]): string[] {
  const mismatch = entries.filter((entry) => {
    const confident = entry.confidenceBeforeTrade >= 70;
    return (confident && entry.outcome === 'loss') || (!confident && entry.outcome === 'win');
  });

  const drasticDrops = entries.filter((entry) => entry.confidenceBeforeTrade - entry.confidenceAfterTrade >= 25);
  const patterns: string[] = [];

  if (entries.length > 0 && mismatch.length / entries.length >= 0.35) {
    patterns.push('Confidence calibration mismatch: outcomes diverge from pre-trade confidence in >35% of entries.');
  }

  if (drasticDrops.length >= 3) {
    patterns.push('Post-trade confidence drops >25 points appear repeatedly, suggesting process instability.');
  }

  return patterns;
}

export function detectBehaviorPatterns(entries: TradeJournalEntry[], performance: PerformanceSnapshot): BehaviorPatternSignals {
  const poorTimeWindows: EffectiveTimeWindow[] = performance.effectiveTradingTimeWindows.filter((window) => window.tradeCount >= 3 && window.expectancy < 0);
  const biasViolations = entries.filter((entry) => !entry.followedElceoBias).length;

  return {
    overtradingSignals: overtradingSignals(entries),
    poorTimeWindowPatterns: poorTimeWindows,
    repeatedMistakeCategories: countByMistake(entries).filter((item) => item.count >= 2),
    biasViolationRate: entries.length ? (biasViolations / entries.length) * 100 : 0,
    confidenceMismatchPatterns: confidenceMismatchPatterns(entries)
  };
}
