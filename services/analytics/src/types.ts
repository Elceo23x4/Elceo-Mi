import type { MistakeCategory, TradeJournalEntry } from '@elceo/types';

export type MonthlyPerformance = {
  month: string;
  tradeCount: number;
  netPnl: number;
  winRate: number;
};

export type AssetPerformance = {
  asset: string;
  tradeCount: number;
  netPnl: number;
  winRate: number;
};

export type EffectiveTimeWindow = {
  session: TradeJournalEntry['sessionTraded'];
  tradeCount: number;
  netPnl: number;
  expectancy: number;
};

export type PerformanceSnapshot = {
  totalTrades: number;
  winRate: number;
  expectancy: number;
  averageGain: number;
  averageLoss: number;
  averageRiskReward: number;
  bestMonth: MonthlyPerformance | null;
  worstMonth: MonthlyPerformance | null;
  bestTradedAssets: AssetPerformance[];
  worstTradedAssets: AssetPerformance[];
  highestGains: TradeJournalEntry[];
  highestLosses: TradeJournalEntry[];
  effectiveTradingTimeWindows: EffectiveTimeWindow[];
};

export type BehaviorPatternSignals = {
  overtradingSignals: string[];
  poorTimeWindowPatterns: EffectiveTimeWindow[];
  repeatedMistakeCategories: Array<{ category: MistakeCategory; count: number }>;
  biasViolationRate: number;
  confidenceMismatchPatterns: string[];
};

export type DataScientistCoachingReport = {
  summary: {
    diagnosis: string;
    confidenceLevel: 'high' | 'medium' | 'low';
  };
  evidence: Array<{ metric: string; value: string; interpretation: string }>;
  interventions: Array<{ action: string; targetMetric: string; successCriteria: string }>;
  monitoringPlan: string[];
};

export type JournalAnalyticsResult = {
  performance: PerformanceSnapshot;
  behavior: BehaviorPatternSignals;
  coaching: DataScientistCoachingReport;
};
