import type { AssetCognitionState } from '@elceo/types';

export function prioritizeCognition(states: AssetCognitionState[]): AssetCognitionState[] {
  return [...states].sort((a, b) => b.ranking_score - a.ranking_score);
}
