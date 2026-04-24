import type { BehaviorAnalyticsPattern, CanonicalJournalCase } from '@elceo/types';
import { clampTo100 } from './math';
import { daysSinceCaseClose } from './window-selection';

function caseWeight(caseData: CanonicalJournalCase, asOfIso: string): number {
  const ageDays = Number.isFinite(daysSinceCaseClose(caseData, asOfIso)) ? daysSinceCaseClose(caseData, asOfIso) : 0;
  return 1 / (1 + ageDays / 45);
}

export function buildBehaviorAnalyticsPatterns(cases: CanonicalJournalCase[], asOfIso: string): BehaviorAnalyticsPattern[] {
  const map = new Map<string, { sampleCount: number; sumWin: number; sumLoss: number; sumImpulsive: number }>();

  for (const caseData of cases) {
    for (const behaviorTag of caseData.review.behaviorTags) {
      const state = map.get(behaviorTag) ?? { sampleCount: 0, sumWin: 0, sumLoss: 0, sumImpulsive: 0 };
      const weight = caseWeight(caseData, asOfIso);
      state.sampleCount += 1;
      if (caseData.closure.outcome === 'win') state.sumWin += 18 * weight;
      if (caseData.closure.outcome === 'loss') state.sumLoss += 24 * weight;
      if (caseData.closure.outcome === 'mixed') state.sumLoss += 10 * weight;
      if (caseData.execution.executionQuality === 'impulsive') state.sumImpulsive += 22 * weight;
      if (caseData.execution.executionQuality === 'weak') state.sumImpulsive += 10 * weight;
      if (caseData.execution.executionQuality === 'disciplined') state.sumWin += 10 * weight;
      map.set(behaviorTag, state);
    }
  }

  return [...map.entries()]
    .map(([behaviorTag, value]) => {
      const denominator = Math.max(1, value.sampleCount);
      const winAssociationScore = clampTo100(value.sumWin / denominator);
      const lossAssociationScore = clampTo100(value.sumLoss / denominator);
      const impulsiveAssociationScore = clampTo100(value.sumImpulsive / denominator);
      return {
        behaviorTag,
        sampleCount: value.sampleCount,
        winAssociationScore,
        lossAssociationScore,
        impulsiveAssociationScore,
        importanceScore: clampTo100(Math.max(winAssociationScore, lossAssociationScore, impulsiveAssociationScore) + Math.min(10, value.sampleCount * 1.3))
      };
    })
    .sort((a, b) => b.importanceScore - a.importanceScore || b.sampleCount - a.sampleCount || a.behaviorTag.localeCompare(b.behaviorTag));
}
