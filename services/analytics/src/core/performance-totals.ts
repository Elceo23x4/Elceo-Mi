import type { CanonicalJournalCase, PerformanceTotals } from '@elceo/types';
import { roundMetric, safeAverage, safeMedian, safeRate } from './math';

export function buildPerformanceTotals(cases: CanonicalJournalCase[]): PerformanceTotals {
  const winCount = cases.filter((item) => item.closure.outcome === 'win').length;
  const lossCount = cases.filter((item) => item.closure.outcome === 'loss').length;
  const breakevenCount = cases.filter((item) => item.closure.outcome === 'breakeven').length;
  const mixedCount = cases.filter((item) => item.closure.outcome === 'mixed').length;
  const reviewedCaseCount = cases.filter((item) => item.review.reviewedAt !== null || item.status === 'reviewed').length;

  const rSamples = cases.map((item) => item.closure.rMultiple).filter((value): value is number => value !== null);
  const pnlSamples = cases.map((item) => item.closure.pnlPercent).filter((value): value is number => value !== null);

  return {
    closedCaseCount: cases.length,
    reviewedCaseCount,
    winCount,
    lossCount,
    breakevenCount,
    mixedCount,
    openCount: 0,
    linkedReasoningCount: cases.filter((item) => item.plan.createdFromReasoningRunId !== null).length,
    linkedDriftCount: cases.filter((item) => item.plan.createdFromDriftId !== null).length,
    avgRMultiple: safeAverage(rSamples),
    avgPnlPercent: safeAverage(pnlSamples),
    medianRMultiple: safeMedian(rSamples),
    medianPnlPercent: safeMedian(pnlSamples),
    winRate: safeRate(winCount, cases.length),
    lossRate: safeRate(lossCount, cases.length),
    expectancyR: rSamples.length ? roundMetric(safeAverage(rSamples) ?? 0) : null
  };
}
