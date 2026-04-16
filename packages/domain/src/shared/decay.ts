import { clamp } from './clamp';

export function linearDecayScore(elapsedMinutes: number, decayWindowMinutes: number): number {
  if (decayWindowMinutes <= 0) return 0;
  const remaining = 1 - elapsedMinutes / decayWindowMinutes;
  return clamp(remaining * 100, 0, 100);
}
