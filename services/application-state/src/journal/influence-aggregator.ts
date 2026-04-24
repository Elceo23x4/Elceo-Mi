import type {
  JournalBehaviorPattern,
  JournalDirectionPattern,
  JournalInfluenceCaseEvidence,
  JournalInfluenceSummary,
  JournalSetupPattern,
  TradeDirection
} from '@elceo/types';

function clampTo100(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return round2(values.reduce((sum, item) => sum + item, 0) / values.length);
}

function outcomeCount(cases: JournalInfluenceCaseEvidence[], outcome: JournalInfluenceCaseEvidence['outcome']): number {
  return cases.filter((item) => item.outcome === outcome).length;
}

function toExecutionBreakdown(cases: JournalInfluenceCaseEvidence[]): Record<string, number> {
  const map = new Map<string, number>();
  for (const item of cases) {
    const key = item.executionQuality ?? 'unknown';
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...map.entries()].sort((left, right) => left[0].localeCompare(right[0])));
}

export function aggregateJournalSetupPatterns(evidence: JournalInfluenceCaseEvidence[]): JournalSetupPattern[] {
  const groups = new Map<string, JournalInfluenceCaseEvidence[]>();
  for (const item of evidence) {
    if (!groups.has(item.setupType)) groups.set(item.setupType, []);
    groups.get(item.setupType)!.push(item);
  }

  const patterns: JournalSetupPattern[] = [];
  for (const [setupType, cases] of groups.entries()) {
    const sampleCount = cases.length;
    const winCount = outcomeCount(cases, 'win');
    const lossCount = outcomeCount(cases, 'loss');
    const breakevenCount = outcomeCount(cases, 'breakeven');
    const mixedCount = outcomeCount(cases, 'mixed');
    const avgRMultiple = average(cases.filter((item) => item.rMultiple !== null).map((item) => item.rMultiple as number)) ?? 0;
    const avgPnlPercent = average(cases.filter((item) => item.pnlPercent !== null).map((item) => item.pnlPercent as number)) ?? 0;
    const winRate = sampleCount ? winCount / sampleCount : 0;
    const lossRate = sampleCount ? lossCount / sampleCount : 0;
    const weakCount = cases.filter((item) => item.executionQuality === 'weak').length;
    const impulsiveCount = cases.filter((item) => item.executionQuality === 'impulsive').length;
    const qualityPenalty = weakCount * 6 + impulsiveCount * 10;
    const base = winRate * 60 + Math.max(0, avgRMultiple ?? 0) * 10 - lossRate * 35;
    const influenceScore = round2(clampTo100(base - qualityPenalty + Math.min(15, sampleCount * 1.5)));

    patterns.push({
      setupType,
      sampleCount,
      winCount,
      lossCount,
      breakevenCount,
      mixedCount,
      avgRMultiple,
      avgPnlPercent,
      executionQualityBreakdown: toExecutionBreakdown(cases),
      influenceScore
    });
  }

  return patterns.sort((left, right) => right.influenceScore - left.influenceScore || right.sampleCount - left.sampleCount || left.setupType.localeCompare(right.setupType));
}

function winRate(cases: JournalInfluenceCaseEvidence[]): number | null {
  if (!cases.length) return null;
  return round2(outcomeCount(cases, 'win') / cases.length);
}

export function aggregateJournalDirectionPatterns(evidence: JournalInfluenceCaseEvidence[]): JournalDirectionPattern[] {
  const groups = new Map<TradeDirection, JournalInfluenceCaseEvidence[]>();
  for (const item of evidence) {
    if (!groups.has(item.direction)) groups.set(item.direction, []);
    groups.get(item.direction)!.push(item);
  }

  const out: JournalDirectionPattern[] = [];
  for (const [direction, cases] of groups.entries()) {
    const sampleCount = cases.length;
    const avgRMultiple = average(cases.filter((item) => item.rMultiple !== null).map((item) => item.rMultiple as number)) ?? 0;
    const avgPnlPercent = average(cases.filter((item) => item.pnlPercent !== null).map((item) => item.pnlPercent as number)) ?? 0;
    const currentWinRate = winRate(cases);
    const base = (currentWinRate ?? 0) * 70 + Math.max(0, avgRMultiple ?? 0) * 12;
    const influenceScore = round2(clampTo100(base + Math.min(10, sampleCount * 1.2)));
    out.push({ direction, sampleCount, avgRMultiple, avgPnlPercent, winRate: currentWinRate, influenceScore });
  }

  return out.sort((left, right) => right.influenceScore - left.influenceScore || right.sampleCount - left.sampleCount || left.direction.localeCompare(right.direction));
}

export function aggregateJournalBehaviorPatterns(evidence: JournalInfluenceCaseEvidence[]): JournalBehaviorPattern[] {
  const tags = new Map<string, JournalInfluenceCaseEvidence[]>();
  for (const item of evidence) {
    for (const tag of item.behaviorTags) {
      if (!tags.has(tag)) tags.set(tag, []);
      tags.get(tag)!.push(item);
    }
  }

  const patterns: JournalBehaviorPattern[] = [];
  for (const [behaviorTag, cases] of tags.entries()) {
    const sampleCount = cases.length;
    let sumNegative = 0;
    let sumPositive = 0;
    for (const item of cases) {
      if (item.outcome === 'loss') sumNegative += 22 * item.recencyWeight;
      if (item.outcome === 'mixed') sumNegative += 10 * item.recencyWeight;
      if (item.executionQuality === 'impulsive') sumNegative += 20 * item.recencyWeight;
      if (item.executionQuality === 'weak') sumNegative += 10 * item.recencyWeight;
      if (item.outcome === 'win') sumPositive += 16 * item.recencyWeight;
      if (item.executionQuality === 'disciplined') sumPositive += 14 * item.recencyWeight;
    }

    const sampleCountAdjusted = Math.max(1, sampleCount);
    const negativeAssociationScore = round2(clampTo100(sumNegative / sampleCountAdjusted));
    const positiveAssociationScore = round2(clampTo100(sumPositive / sampleCountAdjusted));
    patterns.push({
      behaviorTag,
      sampleCount,
      negativeAssociationScore,
      positiveAssociationScore,
      influenceScore: round2(clampTo100(Math.max(negativeAssociationScore, positiveAssociationScore)))
    });
  }

  return patterns.sort((left, right) => right.influenceScore - left.influenceScore || right.sampleCount - left.sampleCount || left.behaviorTag.localeCompare(right.behaviorTag));
}

export function deriveRepeatedMistakes(patterns: JournalBehaviorPattern[]): string[] {
  return patterns
    .filter((item) => item.negativeAssociationScore >= 35)
    .sort((left, right) => right.negativeAssociationScore - left.negativeAssociationScore || right.sampleCount - left.sampleCount || left.behaviorTag.localeCompare(right.behaviorTag))
    .slice(0, 5)
    .map((item) => item.behaviorTag);
}

export function deriveRepeatedStrengths(patterns: JournalBehaviorPattern[]): string[] {
  return patterns
    .filter((item) => item.positiveAssociationScore >= 35)
    .sort((left, right) => right.positiveAssociationScore - left.positiveAssociationScore || right.sampleCount - left.sampleCount || left.behaviorTag.localeCompare(right.behaviorTag))
    .slice(0, 5)
    .map((item) => item.behaviorTag);
}

export function deriveCautionNotes(setups: JournalSetupPattern[], repeatedMistakes: string[]): string[] {
  const notes: string[] = [];
  repeatedMistakes.forEach((tag) => notes.push(`Repeated mistake detected: ${tag}.`));
  setups
    .filter((item) => item.influenceScore < 40 && item.lossCount > item.winCount)
    .slice(0, 3)
    .forEach((item) => notes.push(`Setup underperformance detected for ${item.setupType}.`));

  const weakImpulsive = setups.some((item) => (item.executionQualityBreakdown.weak ?? 0) + (item.executionQualityBreakdown.impulsive ?? 0) >= Math.max(2, Math.ceil(item.sampleCount * 0.4)));
  if (weakImpulsive) notes.push('Execution quality weakness detected in recent history.');
  return notes;
}

export function deriveConfidenceBoostNotes(setups: JournalSetupPattern[], repeatedStrengths: string[]): string[] {
  const notes: string[] = [];
  repeatedStrengths.forEach((tag) => notes.push(`Repeated strength detected: ${tag}.`));
  setups
    .filter((item) => item.influenceScore >= 65 && item.winCount >= item.lossCount)
    .slice(0, 3)
    .forEach((item) => notes.push(`Setup strength detected for ${item.setupType}.`));

  const disciplined = setups.some((item) => (item.executionQualityBreakdown.disciplined ?? 0) >= Math.max(2, Math.ceil(item.sampleCount * 0.4)));
  if (disciplined) notes.push('Disciplined execution strength detected in recent history.');
  return notes;
}

export function buildSupportingCaseIds(evidence: JournalInfluenceCaseEvidence[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of evidence) {
    if (seen.has(item.caseId)) continue;
    seen.add(item.caseId);
    out.push(item.caseId);
    if (out.length >= 20) break;
  }
  return out;
}

export function buildInfluenceSummaryParts(evidence: JournalInfluenceCaseEvidence[]): Pick<
  JournalInfluenceSummary,
  | 'setupPatterns'
  | 'behaviorPatterns'
  | 'directionPatterns'
  | 'repeatedMistakes'
  | 'repeatedStrengths'
  | 'cautionNotes'
  | 'confidenceBoostNotes'
  | 'supportingCaseIds'
> {
  const setupPatterns = aggregateJournalSetupPatterns(evidence);
  const behaviorPatterns = aggregateJournalBehaviorPatterns(evidence);
  const directionPatterns = aggregateJournalDirectionPatterns(evidence);
  const repeatedMistakes = deriveRepeatedMistakes(behaviorPatterns);
  const repeatedStrengths = deriveRepeatedStrengths(behaviorPatterns);
  return {
    setupPatterns,
    behaviorPatterns,
    directionPatterns,
    repeatedMistakes,
    repeatedStrengths,
    cautionNotes: deriveCautionNotes(setupPatterns, repeatedMistakes),
    confidenceBoostNotes: deriveConfidenceBoostNotes(setupPatterns, repeatedStrengths),
    supportingCaseIds: buildSupportingCaseIds(evidence)
  };
}
