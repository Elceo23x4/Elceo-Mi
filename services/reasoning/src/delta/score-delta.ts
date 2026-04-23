import { roundScore } from '@elceo/domain';
import type { NumericDelta } from './contracts';

export function computeDeltaMagnitude(previous: number, current: number): number {
  return roundScore(Math.abs(current - previous));
}

export function buildNumericDelta(previous: number, current: number): NumericDelta {
  const direction: NumericDelta['direction'] = current > previous ? 'up' : current < previous ? 'down' : 'flat';
  return {
    previous,
    current,
    absoluteDelta: computeDeltaMagnitude(previous, current),
    direction
  };
}
