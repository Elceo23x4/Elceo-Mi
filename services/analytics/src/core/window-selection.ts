import type { AnalyticsAssetScope, AnalyticsTimeframeScope, AnalyticsWindow, CanonicalJournalCase } from '@elceo/types';

export type WindowSelectionParams = {
  subjectKind: AnalyticsWindow['subjectKind'];
  subjectId: string;
  assetScope: AnalyticsAssetScope;
  timeframeScope: AnalyticsTimeframeScope;
  lookbackDays?: number;
  generatedAt: string;
  maxCases?: number;
};

export function daysSinceCaseClose(caseData: CanonicalJournalCase, asOfIso: string): number {
  if (!caseData.closure.closedAt) return Number.POSITIVE_INFINITY;
  const ms = Math.max(0, Date.parse(asOfIso) - Date.parse(caseData.closure.closedAt));
  return ms / (1000 * 60 * 60 * 24);
}

function sortForSelection(left: CanonicalJournalCase, right: CanonicalJournalCase): number {
  const leftPrimary = Date.parse(left.review.reviewedAt ?? left.closure.closedAt ?? left.createdAt);
  const rightPrimary = Date.parse(right.review.reviewedAt ?? right.closure.closedAt ?? right.createdAt);
  return rightPrimary - leftPrimary || Date.parse(right.createdAt) - Date.parse(left.createdAt) || left.identity.caseId.localeCompare(right.identity.caseId);
}

function isSelectable(caseData: CanonicalJournalCase): boolean {
  if (!(caseData.status === 'closed' || caseData.status === 'reviewed')) return false;
  return caseData.closure.closedAt !== null;
}

export function selectAnalyticsWindowCases(allCases: CanonicalJournalCase[], params: WindowSelectionParams): CanonicalJournalCase[] {
  const lookbackDays = Math.max(1, params.lookbackDays ?? 180);
  const maxCases = Math.max(1, params.maxCases ?? 200);

  const filtered = allCases
    .filter((item) => item.identity.subjectKind === params.subjectKind && item.identity.subjectId === params.subjectId)
    .filter((item) => isSelectable(item))
    .filter((item) => (params.assetScope === '*' ? true : item.identity.asset === params.assetScope))
    .filter((item) => (params.timeframeScope === '*' ? true : item.identity.timeframe === params.timeframeScope))
    .filter((item) => daysSinceCaseClose(item, params.generatedAt) <= lookbackDays)
    .sort(sortForSelection)
    .slice(0, maxCases);

  return filtered;
}
