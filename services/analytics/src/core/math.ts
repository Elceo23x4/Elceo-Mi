export function roundMetric(value: number, digits = 4): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function safeAverage(numbers: number[]): number | null {
  if (!numbers.length) return null;
  const finite = numbers.filter((value) => Number.isFinite(value));
  if (!finite.length) return null;
  return roundMetric(finite.reduce((sum, value) => sum + value, 0) / finite.length);
}

export function sortedMedian(sorted: number[]): number | null {
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return roundMetric(sorted[mid]!);
  return roundMetric((sorted[mid - 1]! + sorted[mid]!) / 2);
}

export function safeMedian(numbers: number[]): number | null {
  const finite = numbers.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  return sortedMedian(finite);
}

export function safeRate(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  return roundMetric(numerator / denominator);
}

export function clampTo100(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return roundMetric(Math.max(0, Math.min(100, value)), 4);
}
