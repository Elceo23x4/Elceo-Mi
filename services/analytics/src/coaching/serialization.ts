import { validateCoachingSnapshot } from '@elceo/schemas';
import { validateJournalInfluenceSummary } from '@elceo/schemas';
import type { CoachingSnapshot, JournalInfluenceSummary } from '@elceo/types';

function parseJson(json: string): unknown {
  try {
    return JSON.parse(json) as unknown;
  } catch {
    throw new Error('malformed_json');
  }
}

export function serializeCoachingSnapshot(snapshot: CoachingSnapshot): string {
  return JSON.stringify(snapshot);
}

export function deserializeCoachingSnapshot(json: string): CoachingSnapshot {
  const parsed = parseJson(json);
  const validated = validateCoachingSnapshot(parsed);
  if (validated.ok === false) throw new Error(`invalid_coaching_snapshot:${validated.errors.join('; ')}`);
  return validated.value;
}

export function deserializeJournalInfluenceSummary(json: string): JournalInfluenceSummary {
  const parsed = parseJson(json);
  const validated = validateJournalInfluenceSummary(parsed);
  if (validated.ok === false) throw new Error(`invalid_journal_influence_summary:${validated.errors.join('; ')}`);
  return validated.value;
}
