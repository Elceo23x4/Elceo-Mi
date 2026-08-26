/** Presentation only: unavailable cognition is never coerced to a number. */
export function formatAvailableScore(score: number | null): string {
  return score === null ? '—' : score.toFixed(1);
}
