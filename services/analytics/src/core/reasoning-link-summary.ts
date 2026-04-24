import type { CanonicalJournalCase, ReasoningLinkSummary } from '@elceo/types';
import { safeAverage, safeRate } from './math';

export function buildReasoningLinkSummary(cases: CanonicalJournalCase[]): ReasoningLinkSummary {
  const linkedCases = cases.filter((item) => item.plan.createdFromReasoningRunId !== null);
  const linkedCaseCount = linkedCases.length;
  return {
    linkedCaseCount,
    linkedWinRate: safeRate(linkedCases.filter((item) => item.closure.outcome === 'win').length, linkedCaseCount),
    linkedAvgRMultiple: safeAverage(linkedCases.map((item) => item.closure.rMultiple).filter((value): value is number => value !== null)),
    linkedAvgPnlPercent: safeAverage(linkedCases.map((item) => item.closure.pnlPercent).filter((value): value is number => value !== null))
  };
}
