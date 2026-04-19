import { clamp } from '../shared/clamp';
import { weightedAverage } from '../shared/weightedAverage';

export type RankingInput = {
  portfolioRelevance: number;
  recency: number;
  significance: number;
  confidence: number;
  volatility: number;
  contradiction: number;
  urgency: number;
};

export function computeRankingScore(input: RankingInput): number {
  return clamp(
    weightedAverage([
      { value: input.portfolioRelevance, weight: 0.22 },
      { value: input.recency, weight: 0.16 },
      { value: input.significance, weight: 0.18 },
      { value: input.confidence, weight: 0.16 },
      { value: input.volatility, weight: 0.08 },
      { value: input.urgency, weight: 0.1 },
      { value: input.contradiction, weight: 0.1 }
    ]),
    0,
    100
  );
}
