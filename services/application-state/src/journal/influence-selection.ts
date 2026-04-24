import type { CanonicalAssetSymbol, CanonicalJournalCase, Timeframe } from '@elceo/types';
import type { JournalCaseRepository } from '../persistence/contracts';
import { deserializeCanonicalJournalCase } from './serialization';

export type JournalInfluenceSelectionParams = {
  subjectKind: 'user' | 'workspace' | 'ops';
  subjectId: string;
  assetScope: CanonicalAssetSymbol | '*';
  timeframeScope: Timeframe | '*';
  asOfIso: string;
  maxCases?: number;
  lookbackDays?: number;
};

type ScopeFallback = {
  asset: CanonicalAssetSymbol | '*';
  timeframe: Timeframe | '*';
};

export type SelectedJournalInfluenceCase = {
  caseData: CanonicalJournalCase;
  recencyWeight: number;
};

function sortCases(left: CanonicalJournalCase, right: CanonicalJournalCase): number {
  const leftPrimary = Date.parse(left.review.reviewedAt ?? left.closure.closedAt ?? left.createdAt);
  const rightPrimary = Date.parse(right.review.reviewedAt ?? right.closure.closedAt ?? right.createdAt);
  return rightPrimary - leftPrimary || Date.parse(right.createdAt) - Date.parse(left.createdAt) || left.identity.caseId.localeCompare(right.identity.caseId);
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function computeJournalInfluenceRecencyWeight(caseData: CanonicalJournalCase, asOfIso: string): number {
  const anchorIso = caseData.review.reviewedAt ?? caseData.closure.closedAt;
  if (!anchorIso) return 0;
  const ageMs = Math.max(0, Date.parse(asOfIso) - Date.parse(anchorIso));
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return round4(1 / (1 + ageDays / 30));
}

function isEligible(caseData: CanonicalJournalCase, asOfIso: string, lookbackDays: number): boolean {
  if (!(caseData.status === 'closed' || caseData.status === 'reviewed')) return false;
  const anchorIso = caseData.review.reviewedAt ?? caseData.closure.closedAt;
  if (!anchorIso) return false;
  const ageMs = Math.max(0, Date.parse(asOfIso) - Date.parse(anchorIso));
  return ageMs <= lookbackDays * 24 * 60 * 60 * 1000;
}

function scopeMatches(caseData: CanonicalJournalCase, scope: ScopeFallback): boolean {
  const assetMatch = scope.asset === '*' || caseData.identity.asset === scope.asset;
  const timeframeMatch = scope.timeframe === '*' || caseData.identity.timeframe === scope.timeframe;
  return assetMatch && timeframeMatch;
}

function uniqueByCaseId(cases: CanonicalJournalCase[]): CanonicalJournalCase[] {
  const out: CanonicalJournalCase[] = [];
  const seen = new Set<string>();
  for (const item of cases) {
    if (seen.has(item.identity.caseId)) continue;
    seen.add(item.identity.caseId);
    out.push(item);
  }
  return out;
}

export async function selectJournalInfluenceCases(
  repository: JournalCaseRepository,
  params: JournalInfluenceSelectionParams
): Promise<SelectedJournalInfluenceCase[]> {
  const maxCases = Math.max(1, params.maxCases ?? 30);
  const lookbackDays = Math.max(1, params.lookbackDays ?? 180);

  const allRecords = await repository.listCases({
    subjectKind: params.subjectKind,
    subjectId: params.subjectId,
    limit: 500
  });
  const allCases = allRecords
    .map((row) => deserializeCanonicalJournalCase(row.caseJson))
    .filter((item) => isEligible(item, params.asOfIso, lookbackDays))
    .sort(sortCases);

  const scopeOrder: ScopeFallback[] = [
    { asset: params.assetScope, timeframe: params.timeframeScope },
    { asset: params.assetScope, timeframe: '*' },
    { asset: '*', timeframe: params.timeframeScope },
    { asset: '*', timeframe: '*' }
  ];

  const selected: CanonicalJournalCase[] = [];
  for (const scope of scopeOrder) {
    if (selected.length >= maxCases) break;
    const bucket = allCases.filter((item) => scopeMatches(item, scope));
    selected.push(...bucket);
    const deduped = uniqueByCaseId(selected).sort(sortCases).slice(0, maxCases);
    selected.length = 0;
    selected.push(...deduped);
  }

  return selected.map((caseData) => ({
    caseData,
    recencyWeight: computeJournalInfluenceRecencyWeight(caseData, params.asOfIso)
  }));
}
