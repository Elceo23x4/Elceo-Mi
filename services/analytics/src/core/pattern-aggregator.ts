import type {
  CanonicalJournalCase,
  DirectionPerformancePattern,
  ExecutionQualitySummary,
  PlanAdherenceSummary,
  SetupPerformancePattern
} from '@elceo/types';
import { clampTo100, roundMetric, safeAverage, safeRate } from './math';

const qualityPoints: Record<'disciplined' | 'acceptable' | 'weak' | 'impulsive' | 'missing', number> = {
  disciplined: 100,
  acceptable: 75,
  weak: 40,
  impulsive: 10,
  missing: 50
};

function qualityToPoints(quality: CanonicalJournalCase['execution']['executionQuality']): number {
  if (quality === null) return qualityPoints.missing;
  return qualityPoints[quality];
}

function bySetupOrder(left: SetupPerformancePattern, right: SetupPerformancePattern): number {
  return right.performanceScore - left.performanceScore || right.sampleCount - left.sampleCount || left.setupType.localeCompare(right.setupType);
}

function byDirectionOrder(left: DirectionPerformancePattern, right: DirectionPerformancePattern): number {
  return right.performanceScore - left.performanceScore || right.sampleCount - left.sampleCount || left.direction.localeCompare(right.direction);
}

export function buildSetupPatterns(cases: CanonicalJournalCase[]): SetupPerformancePattern[] {
  const groups = new Map<string, CanonicalJournalCase[]>();
  for (const caseData of cases) {
    const bucket = groups.get(caseData.plan.setupType) ?? [];
    bucket.push(caseData);
    groups.set(caseData.plan.setupType, bucket);
  }

  return [...groups.entries()].map(([setupType, bucket]) => {
    const sampleCount = bucket.length;
    const winCount = bucket.filter((item) => item.closure.outcome === 'win').length;
    const lossCount = bucket.filter((item) => item.closure.outcome === 'loss').length;
    const breakevenCount = bucket.filter((item) => item.closure.outcome === 'breakeven').length;
    const mixedCount = bucket.filter((item) => item.closure.outcome === 'mixed').length;
    const r = bucket.map((item) => item.closure.rMultiple).filter((value): value is number => value !== null);
    const pnl = bucket.map((item) => item.closure.pnlPercent).filter((value): value is number => value !== null);
    const winRate = safeRate(winCount, sampleCount);
    const expectancyR = safeAverage(r);
    const disciplineScore = roundMetric(safeAverage(bucket.map((item) => qualityToPoints(item.execution.executionQuality))) ?? 0);
    const base = (winRate ?? 0) * 60 + Math.max(0, expectancyR ?? 0) * 20 + Math.min(10, sampleCount * 1.5);
    const penalty = Math.max(0, -(expectancyR ?? 0)) * 12;

    return {
      setupType,
      sampleCount,
      winCount,
      lossCount,
      breakevenCount,
      mixedCount,
      avgRMultiple: safeAverage(r),
      avgPnlPercent: safeAverage(pnl),
      winRate,
      expectancyR,
      disciplineScore,
      performanceScore: clampTo100(base - penalty + disciplineScore * 0.1)
    };
  }).sort(bySetupOrder);
}

export function buildDirectionPatterns(cases: CanonicalJournalCase[]): DirectionPerformancePattern[] {
  const groups = new Map<CanonicalJournalCase['plan']['direction'], CanonicalJournalCase[]>();
  for (const caseData of cases) {
    const bucket = groups.get(caseData.plan.direction) ?? [];
    bucket.push(caseData);
    groups.set(caseData.plan.direction, bucket);
  }

  return [...groups.entries()].map(([direction, bucket]) => {
    const sampleCount = bucket.length;
    const winCount = bucket.filter((item) => item.closure.outcome === 'win').length;
    const r = bucket.map((item) => item.closure.rMultiple).filter((value): value is number => value !== null);
    const avgRMultiple = safeAverage(r);
    const winRate = safeRate(winCount, sampleCount);
    return {
      direction,
      sampleCount,
      avgRMultiple,
      avgPnlPercent: safeAverage(bucket.map((item) => item.closure.pnlPercent).filter((value): value is number => value !== null)),
      winRate,
      performanceScore: clampTo100(((winRate ?? 0) * 65) + (Math.max(0, avgRMultiple ?? 0) * 18) + Math.min(10, sampleCount * 1.2))
    };
  }).sort(byDirectionOrder);
}

export function buildExecutionQualitySummary(cases: CanonicalJournalCase[]): ExecutionQualitySummary {
  const disciplinedCount = cases.filter((item) => item.execution.executionQuality === 'disciplined').length;
  const acceptableCount = cases.filter((item) => item.execution.executionQuality === 'acceptable').length;
  const weakCount = cases.filter((item) => item.execution.executionQuality === 'weak').length;
  const impulsiveCount = cases.filter((item) => item.execution.executionQuality === 'impulsive').length;
  const missingQualityCount = cases.filter((item) => item.execution.executionQuality === null).length;

  return {
    disciplinedCount,
    acceptableCount,
    weakCount,
    impulsiveCount,
    missingQualityCount,
    disciplineScore: roundMetric(safeAverage(cases.map((item) => qualityToPoints(item.execution.executionQuality))) ?? 0)
  };
}

export function buildPlanAdherenceSummary(cases: CanonicalJournalCase[]): PlanAdherenceSummary {
  const deviations = cases
    .filter((item) => item.plan.entryPricePlanned !== null && item.execution.entryPriceExecuted !== null && item.plan.entryPricePlanned !== 0)
    .map((item) => Math.abs((item.execution.entryPriceExecuted! - item.plan.entryPricePlanned!) / Math.abs(item.plan.entryPricePlanned!)) * 100);

  const avgEntryDeviationPercent = safeAverage(deviations);
  const maxEntryDeviationPercent = deviations.length ? roundMetric(Math.max(...deviations)) : null;

  return {
    comparableEntryCount: deviations.length,
    avgEntryDeviationPercent,
    maxEntryDeviationPercent,
    adherenceScore: deviations.length ? clampTo100(100 - (avgEntryDeviationPercent ?? 0) * 8) : null
  };
}
