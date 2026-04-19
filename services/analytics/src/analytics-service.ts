import type { TradeJournalEntry } from '@elceo/types';
import { detectBehaviorPatterns } from './behavior-patterns';
import { computePerformanceMetrics } from './performance-metrics';
import { shapeCoachingOutput } from './coaching-shaping';
import type { JournalAnalyticsResult } from './types';

export class AnalyticsService {
  computeFromJournal(entries: TradeJournalEntry[]): JournalAnalyticsResult {
    const performance = computePerformanceMetrics(entries);
    const behavior = detectBehaviorPatterns(entries, performance);
    const coaching = shapeCoachingOutput(performance, behavior);

    return { performance, behavior, coaching };
  }
}
