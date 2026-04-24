import type { BehaviorAnalyticsPattern, ExecutionQualitySummary, ReviewInsightSummary, SetupPerformancePattern } from '@elceo/types';

export function buildReviewInsights(
  behaviorPatterns: BehaviorAnalyticsPattern[],
  setupPatterns: SetupPerformancePattern[],
  executionQuality: ExecutionQualitySummary
): ReviewInsightSummary {
  const repeatedMistakes = behaviorPatterns
    .filter((item) => item.lossAssociationScore >= 35 || item.impulsiveAssociationScore >= 35)
    .sort((a, b) => Math.max(b.lossAssociationScore, b.impulsiveAssociationScore) - Math.max(a.lossAssociationScore, a.impulsiveAssociationScore) || b.sampleCount - a.sampleCount || a.behaviorTag.localeCompare(b.behaviorTag))
    .slice(0, 5)
    .map((item) => item.behaviorTag);

  const repeatedStrengths = behaviorPatterns
    .filter((item) => item.winAssociationScore >= 35)
    .sort((a, b) => b.winAssociationScore - a.winAssociationScore || b.sampleCount - a.sampleCount || a.behaviorTag.localeCompare(b.behaviorTag))
    .slice(0, 5)
    .map((item) => item.behaviorTag);

  const cautionNotes: string[] = [];
  for (const behaviorTag of repeatedMistakes) {
    if (cautionNotes.length >= 6) break;
    cautionNotes.push(`Repeated mistake detected: ${behaviorTag}.`);
  }
  if (cautionNotes.length < 6 && executionQuality.disciplineScore < 55) cautionNotes.push('Execution discipline remains unstable.');
  for (const setup of setupPatterns) {
    if (cautionNotes.length >= 6) break;
    if (setup.sampleCount >= 3 && setup.performanceScore < 45) cautionNotes.push(`Setup underperformance detected for ${setup.setupType}.`);
  }

  const confidenceNotes: string[] = [];
  for (const behaviorTag of repeatedStrengths) {
    if (confidenceNotes.length >= 6) break;
    confidenceNotes.push(`Repeated strength detected: ${behaviorTag}.`);
  }
  if (confidenceNotes.length < 6 && executionQuality.disciplineScore >= 75) confidenceNotes.push('Execution discipline remains strong.');
  for (const setup of setupPatterns) {
    if (confidenceNotes.length >= 6) break;
    if (setup.sampleCount >= 3 && setup.performanceScore >= 65) confidenceNotes.push(`Setup strength detected for ${setup.setupType}.`);
  }

  return { repeatedMistakes, repeatedStrengths, cautionNotes: cautionNotes.slice(0, 6), confidenceNotes: confidenceNotes.slice(0, 6) };
}
