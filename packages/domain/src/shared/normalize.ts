<<<<<<< HEAD
import { clamp } from './clamp';

export function normalizeToRange(value: number, sourceMin: number, sourceMax: number, targetMin = 0, targetMax = 100): number {
  if (sourceMax === sourceMin) return targetMin;
  const ratio = (value - sourceMin) / (sourceMax - sourceMin);
  return clamp(targetMin + ratio * (targetMax - targetMin), targetMin, targetMax);
}
=======
export {};
>>>>>>> origin/main
