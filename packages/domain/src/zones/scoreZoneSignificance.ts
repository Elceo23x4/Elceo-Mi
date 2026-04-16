<<<<<<< HEAD
import { clamp } from '../shared/clamp';
import { normalizeToRange } from '../shared/normalize';
import { weightedAverage } from '../shared/weightedAverage';
import type { ZoneScoreInput } from './types';

export function scoreZoneSignificance(input: ZoneScoreInput): number {
  const touch = normalizeToRange(input.touches, 0, 8);
  const reaction = normalizeToRange(input.reactionMagnitudeAtr, 0, 3);
  const recency = 100 - normalizeToRange(input.hoursSinceLastTouch, 0, 96);
  const breakout = clamp(input.breakoutRetestBonus ?? 0, 0, 100);

  return clamp(
    weightedAverage([
      { value: touch, weight: 0.35 },
      { value: reaction, weight: 0.35 },
      { value: recency, weight: 0.2 },
      { value: breakout, weight: 0.1 }
    ]),
    0,
    100
  );
}
=======
export {};
>>>>>>> origin/main
