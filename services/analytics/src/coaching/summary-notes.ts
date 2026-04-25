import type { CoachingFocusArea, CoachingStrengthItem } from '@elceo/types';

export function generateCoachingSummaryNotes(focusAreas: CoachingFocusArea[], strengths: CoachingStrengthItem[]): string[] {
  const notes: string[] = [];
  if (focusAreas.length > 0) {
    const topFocus = [...focusAreas].sort((a, b) => b.score - a.score || a.theme.localeCompare(b.theme))[0];
    if (topFocus) notes.push(`Primary coaching priority: ${topFocus.headline}`);
  } else {
    notes.push('No high-priority coaching issue detected in this window.');
  }

  if (strengths.length > 0) {
    const topStrength = [...strengths].sort((a, b) => b.score - a.score || a.theme.localeCompare(b.theme))[0];
    if (topStrength) notes.push(`Strongest current advantage: ${topStrength.headline}`);
  } else {
    notes.push('No coaching strength signal detected in this window.');
  }

  return notes.slice(0, 3);
}
